import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { bookStripeIncomeToEconomic } from "../_shared/bisonEconomicVoucher.ts"

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  
  if (!signature) {
    return new Response('Ingen signatur', { status: 400 });
  }

  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    return new Response('Mangler Stripe Webhook Secret', { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const bodyText = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      bodyText,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    console.log("Modtog Stripe Webhook event:", event.type, event.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Idempotens: Stripe retry'er events. Hvis vi allerede har behandlet dette event_id,
    // returnerer vi 200 og dropper. Kræver tabellen 'stripe_events' (id text primary key).
    const { error: dupErr } = await supabaseClient
        .from('stripe_events')
        .insert({ id: event.id, type: event.type })
    if (dupErr) {
        // Postgres unique violation = vi har set eventet før → drop stille
        if (dupErr.code === '23505') {
            console.log(`Event ${event.id} allerede behandlet, springer over.`);
            return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 })
        }
        // Anden fejl (fx tabel mangler): log men fortsæt så vi ikke blokerer Stripe
        console.warn('Kunne ikke registrere event_id (tjek at stripe_events tabellen findes):', dupErr.message)
    }

    let customerId = '';

    // Udtræk customer ID fra event data
    if (event.data.object.customer) {
        customerId = typeof event.data.object.customer === 'string' 
            ? event.data.object.customer 
            : event.data.object.customer.id;
    }

    if (!customerId) {
        return new Response('Ignoreret - ingen kunde tilknyttet', { status: 200 });
    }

    // Find tømreren via customer id
    const { data: carpenter, error: findError } = await supabaseClient
        .from('carpenters')
        .select('id, tier, subscription_status, raw_data')
        .eq('payment_customer_id', customerId)
        .single();

    if (findError || !carpenter) {
        console.log("Kunne ikke finde tømrer for customer:", customerId);
        return new Response('Ok (ukendt kunde)', { status: 200 });
    }

    // Hjælper: gem opsigelses-status i raw_data.billing så Frame altid kan vise
    // OPSAGT/AKTIV korrekt — automatisk, uden at appen selv skal spørge Stripe.
    const billingFrom = (sub: any) => ({
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        periodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
        status: sub.status,
    });

    // Håndter events
    switch (event.type) {
        case 'checkout.session.completed':
            // Selve session-objektet har IKKE abonnementsdetaljer (og vi ved ikke om det
            // er en prøve eller en rigtig trækning). Vi rører derfor hverken status eller
            // trial_ends_at her — den efterfølgende subscription.created/updated spejler
            // Stripe korrekt. (Før nulstillede vi prøven her og trak folk for tidligt.)
            console.log(`checkout.session.completed for ${carpenter.id} — venter på subscription-event`);
            break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const sub = event.data.object as any;
            if (sub.status === 'active' || sub.status === 'trialing') {
                const targetTier = sub.metadata?.target_tier;
                const updateData: any = {
                    raw_data: { ...(carpenter.raw_data || {}), billing: billingFrom(sub) },
                };
                if (targetTier) updateData.tier = targetTier;
                if (sub.status === 'trialing') {
                    // Kort tilknyttet, men stadig i prøve → behold 'trialing' og spejl
                    // Stripes trial_end, så prøve-uret er præcist. Der trækkes IKKE endnu.
                    updateData.subscription_status = 'trialing';
                    if (sub.trial_end) updateData.trial_ends_at = new Date(sub.trial_end * 1000).toISOString();
                } else {
                    // Stripe trækker nu rigtigt → aktivt abonnement, prøven er brugt.
                    updateData.subscription_status = 'active';
                    updateData.trial_ends_at = null;
                }
                await supabaseClient.from('carpenters').update(updateData).eq('id', carpenter.id);
                console.log(`Opdaterede firma ${carpenter.id} til ${updateData.subscription_status} (cancel_at_period_end=${sub.cancel_at_period_end})`);
            }
            break;
        }

        case 'customer.subscription.deleted':
        case 'customer.subscription.canceled':
            await supabaseClient.from('carpenters').update({
                subscription_status: 'canceled',
                raw_data: { ...(carpenter.raw_data || {}), billing: { cancelAtPeriodEnd: false, periodEnd: null, status: 'canceled' } },
            }).eq('id', carpenter.id);
            console.log(`Opdaterede firma ${carpenter.id} til canceled`);
            break;
            
        case 'invoice.payment_failed':
            await supabaseClient.from('carpenters').update({
                subscription_status: 'past_due'
            }).eq('id', carpenter.id);
            console.log(`Opdaterede firma ${carpenter.id} til past_due`);
            break;

        case 'invoice.paid': {
            // AUTOMATISK BOGFØRING i Bisons EGET e-conomic. Kører helt isoleret:
            // en fejl her må ALDRIG vælte webhooken eller påvirke abonnements-status.
            // Derfor try/catch der aldrig kaster videre.
            try {
                const invObj = event.data.object as any;
                if ((invObj.amount_paid ?? 0) <= 0) {
                    console.log(`invoice.paid ${invObj.id}: beløb 0 (prøve/rabat) — intet at bogføre`);
                    break;
                }

                // Dobbelt-spærre: reservér fakturaen i stripe_bookings FØR vi bogfører.
                // Findes den allerede (23505) → allerede bogført, drop stille.
                const { error: bookDup } = await supabaseClient
                    .from('stripe_bookings')
                    .insert({
                        stripe_invoice_id: invObj.id,
                        stripe_number: invObj.number ?? null,
                        customer_id: customerId,
                        carpenter_id: carpenter.id,
                        currency: invObj.currency,
                        status: 'pending',
                    });
                if (bookDup) {
                    if (bookDup.code === '23505') {
                        console.log(`Faktura ${invObj.id} allerede bogført, springer over.`);
                        break;
                    }
                    // Kan ikke reservere (fx tabel mangler) → bogfør ikke (undgå dubletter).
                    console.warn('Kunne ikke reservere stripe_bookings-række (tjek tabellen findes):', bookDup.message);
                    break;
                }

                // Hent fakturaen igen med gebyret (balance_transaction) foldet ud.
                const full: any = await stripe.invoices.retrieve(invObj.id, {
                    expand: ['charge.balance_transaction'],
                });
                const bt = full.charge && typeof full.charge === 'object' ? full.charge.balance_transaction : null;

                const gross = (full.amount_paid ?? full.total ?? 0) / 100;
                const vat = (full.tax ?? 0) / 100;
                const fee = bt && typeof bt === 'object' ? (bt.fee ?? 0) / 100 : 0;

                const paidTs = full.status_transitions?.paid_at ?? full.created ?? Math.floor(event.created);
                const date = new Date(paidTs * 1000).toISOString().split('T')[0];
                const company = (carpenter.raw_data as any)?.company_name
                    || full.customer_name || full.customer_email || customerId;
                const description = `Frame-abonnement — ${company}`;

                // Hent Stripe-fakturaens PDF som bilag (uden auth-header — den er direkte hentbar).
                let pdfBytes: Uint8Array | null = null;
                if (full.invoice_pdf) {
                    try {
                        const pdfRes = await fetch(full.invoice_pdf);
                        if (pdfRes.ok) pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
                    } catch (e) {
                        console.warn('Kunne ikke hente Stripe-PDF:', (e as Error).message);
                    }
                }

                const result = await bookStripeIncomeToEconomic({
                    invoiceId: full.id,
                    number: full.number ?? null,
                    description,
                    date,
                    currency: full.currency,
                    gross, vat, fee,
                    pdfBytes,
                    pdfName: `stripe_${full.number || full.id}.pdf`,
                });

                await supabaseClient.from('stripe_bookings').update({
                    status: 'booked',
                    gross, vat, fee,
                    voucher_number: result.voucherNumber ? String(result.voucherNumber) : null,
                    accounting_year: result.accountingYear,
                    booked_at: new Date(paidTs * 1000).toISOString(),
                    error: result.attachmentUploaded ? null : `Bilag oprettet, PDF ikke vedhæftet: ${result.attachmentError || 'ukendt'}`,
                }).eq('stripe_invoice_id', full.id);

                console.log(`Bogført faktura ${full.id} i Bison e-conomic (bilagsnr ${result.voucherNumber}, PDF vedhæftet: ${result.attachmentUploaded})`);
            } catch (bookErr) {
                // Bogføringen fejlede — marker rækken så den kan bogføres manuelt.
                const invId = (event.data.object as any)?.id;
                console.error(`Automatisk bogføring fejlede for faktura ${invId}:`, (bookErr as Error).message);
                if (invId) {
                    await supabaseClient.from('stripe_bookings')
                        .update({ status: 'error', error: (bookErr as Error).message })
                        .eq('stripe_invoice_id', invId);
                }
            }
            break;
        }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    console.error("Webhook Fejl:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
