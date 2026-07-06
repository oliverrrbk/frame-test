import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

import { corsHeadersFor } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Mangler Authorization header')
    
    const jwt = authHeader.replace('Bearer ', '')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) throw new Error("Bruger ikke logget ind")

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
        throw new Error("Mangler Stripe API nøgle i miljøvariabler");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        httpClient: Stripe.createFetchHttpClient(),
    });

    // Fetch user details
    const { data: carpenter } = await supabaseClient
        .from('carpenters')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (!carpenter) throw new Error("Firma findes ikke i systemet");

    // Læs eventuel targetTier fra body
    let targetTier = null;
    try {
        const reqClone = req.clone();
        const bodyText = await reqClone.text();
        if (bodyText) {
            const body = JSON.parse(bodyText);
            targetTier = body.targetTier;
        }
    } catch(e) {
        console.log("Ingen gyldig body fundet (standard fallback bruges)");
    }

    // NY PRISMODEL (juli 2026) — byg line-items ud fra firmaets hold (carpenter.raw_data.team).
    // KANONISK SPEC: src/utils/pricing.js (holdes i sync med denne beregning).
    //   Solo 390 (1 bruger) / Hold 890 (3 inkl.) + tillæg pr. ekstra bruger,
    //   pr. rolle, efter SAMLET bruger-position (trin skifter efter bruger 10 og 50).
    //   Grandfathered (raw_data.legacy_pricing.locked): 249 grundpris (MESTER-price),
    //   ingen inkl. ekstra-pladser, men tillæg på de nye satser.
    const PRICE_IDS: Record<string, string | undefined> = {
        SOLO: Deno.env.get('STRIPE_PRICE_SOLO'),
        HOLD: Deno.env.get('STRIPE_PRICE_HOLD'),
        MESTER: Deno.env.get('STRIPE_PRICE_MESTER'), // 249 — kun grandfathered grundpris
        KONTOR: Deno.env.get('STRIPE_PRICE_KONTOR'),
        KONTOR_11: Deno.env.get('STRIPE_PRICE_KONTOR_11'),
        KONTOR_51: Deno.env.get('STRIPE_PRICE_KONTOR_51'),
        SVEND: Deno.env.get('STRIPE_PRICE_SVEND'),
        SVEND_11: Deno.env.get('STRIPE_PRICE_SVEND_11'),
        SVEND_51: Deno.env.get('STRIPE_PRICE_SVEND_51'),
        LAERLING: Deno.env.get('STRIPE_PRICE_LAERLING'),
        LAERLING_11: Deno.env.get('STRIPE_PRICE_LAERLING_11'),
        LAERLING_51: Deno.env.get('STRIPE_PRICE_LAERLING_51'),
    };
    const HOLD_INCLUDED = 3;
    const TIER_BREAKS = [10, 50];
    const STRIPE_KEY: Record<string, string[]> = {
        kontor: ['KONTOR', 'KONTOR_11', 'KONTOR_51'],
        svend: ['SVEND', 'SVEND_11', 'SVEND_51'],
        laer: ['LAERLING', 'LAERLING_11', 'LAERLING_51'],
    };
    const tierForPosition = (pos: number) => (pos <= TIER_BREAKS[0] ? 0 : pos <= TIER_BREAKS[1] ? 1 : 2);

    const rawTeam = (carpenter.raw_data && carpenter.raw_data.team) || {};
    const legacy = !!(carpenter.raw_data && carpenter.raw_data.legacy_pricing && carpenter.raw_data.legacy_pricing.locked);
    const nn = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
    // Holdet kan være gemt i flere former: {mester,pl,bog,svend,laer} (oprettelse),
    // {mester,kontor,svend,laer} (ny seat-sync) eller {mester,kontor,felt} (ældre). Læs alle.
    const mesterInput = Math.max(1, nn(rawTeam.mester));
    const kontorSeats = rawTeam.kontor != null ? nn(rawTeam.kontor) : (mesterInput - 1) + nn(rawTeam.pl) + nn(rawTeam.bog);
    const svendSeats = rawTeam.svend != null ? nn(rawTeam.svend) : nn(rawTeam.felt);
    const laerSeats = nn(rawTeam.laer);
    const heads = 1 + kontorSeats + svendSeats + laerSeats;

    let baseKey: string, included: number;
    if (legacy) { baseKey = 'MESTER'; included = 1; }
    else if (heads <= 1) { baseKey = 'SOLO'; included = 1; }
    else { baseKey = 'HOLD'; included = HOLD_INCLUDED; }

    const roleOrder: string[] = [];
    for (let i = 0; i < kontorSeats; i++) roleOrder.push('kontor');
    for (let i = 0; i < svendSeats; i++) roleOrder.push('svend');
    for (let i = 0; i < laerSeats; i++) roleOrder.push('laer');

    const bucket: Record<string, number> = {};
    roleOrder.forEach((role, idx) => {
        const position = idx + 2;             // idx 0 → samlet position 2
        if (position <= included) return;     // gratis (dækket af grundplan)
        const key = STRIPE_KEY[role][tierForPosition(position)];
        bucket[key] = (bucket[key] || 0) + 1;
    });

    const lineItems: { price: string; quantity: number }[] = [{ price: PRICE_IDS[baseKey] as string, quantity: 1 }];
    for (const [key, quantity] of Object.entries(bucket)) {
        lineItems.push({ price: PRICE_IDS[key] as string, quantity });
    }
    if (lineItems.some((li) => !li.price)) {
        throw new Error("Mangler en eller flere STRIPE_PRICE_* secrets i Supabase.");
    }

    // Tjek om kunden allerede eksisterer i Stripe, ellers opret en ny
    let customerId = carpenter.payment_customer_id;
    let customerExists = false;
    
    if (customerId && customerId.startsWith('cus_')) {
        try {
            // Verify customer exists in current Stripe environment (Live vs Test)
            const stripeCustomer = await stripe.customers.retrieve(customerId);
            if (!stripeCustomer.deleted) {
                customerExists = true;
            }
        } catch (e) {
            console.log(`Eksisterende Stripe kunde ${customerId} blev ikke fundet (muligvis fra gammelt test-miljø). Opretter ny.`);
        }
    }
    
    if (!customerExists) {
        const newCustomer = await stripe.customers.create({
            email: carpenter.email || user.email,
            name: carpenter.company_name || 'Ukendt Firma',
            metadata: {
                supabase_uuid: carpenter.id
            }
        });
        customerId = newCustomer.id;
        
        // Gem Stripe Customer ID i Supabase
        await supabaseClient.from('carpenters').update({ payment_customer_id: customerId }).eq('id', carpenter.id);
    }

    // PRØVEPERIODEN BEVARES: kortet må gemmes nu, men der må FØRST trækkes penge på
    // den oprindelige prøve-slutdato (oprettelse + 30 dage). Vi sender datoen som
    // Stripe trial_end, så abonnementet står 'trialing' indtil da og først trækker der.
    const nowMs = Date.now();
    const createdMs = carpenter.created_at ? new Date(carpenter.created_at).getTime() : nowMs;
    const trialEndsMs = carpenter.trial_ends_at
        ? new Date(carpenter.trial_ends_at).getTime()
        : createdMs + 30 * 24 * 60 * 60 * 1000;
    // Stripe kræver trial_end mindst ~48 timer ude. Er der reelt prøvetid tilbage, sætter
    // vi den — ellers lader vi Stripe trække normalt (prøven er så godt som udløbet).
    const MIN_TRIAL_LEAD_MS = 48 * 60 * 60 * 1000;
    const useTrial = trialEndsMs > nowMs + MIN_TRIAL_LEAD_MS;
    const trialEndUnix = Math.floor(trialEndsMs / 1000);

    const subscriptionData: any = { metadata: { target_tier: 'role_based' } };
    if (useTrial) subscriptionData.trial_end = trialEndUnix;

    // Pæn dansk dato til beskeden på betalingssiden.
    const chargeDateStr = new Date(trialEndsMs).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

    // Opret Checkout Session
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        subscription_data: subscriptionData,
        // Selv med prøveperiode SKAL kortet gemmes nu (ellers springer Stripe det over).
        payment_method_collection: 'always',
        ...(useTrial ? {
            custom_text: {
                submit: { message: `Du bliver først trukket d. ${chargeDateStr} — hele din gratis prøveperiode bevares.` },
            },
        } : {}),
        automatic_tax: { enabled: true }, // <--- Beder Stripe om at beregne og tillægge dansk moms automatisk
        customer_update: {
            address: 'auto',
            name: 'auto'
        },
        success_url: `${req.headers.get('origin')}/dashboard?activeTab=account_settings&success=true`,
        cancel_url: `${req.headers.get('origin')}/dashboard?activeTab=account_settings&canceled=true`,
        allow_promotion_codes: true, // Giver mulighed for rabatkoder
        billing_address_collection: 'required',
    });

    return new Response(
      JSON.stringify({ success: true, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i create-stripe-checkout function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
