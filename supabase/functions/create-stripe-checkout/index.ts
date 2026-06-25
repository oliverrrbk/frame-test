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

    // ROLLEBASERET PRISMODEL — byg line-items ud fra firmaets hold (carpenter.raw_data.team).
    // 1 Mester (fast) + Kontor-sæder (149→119 fra nr. 11) + Felt-sæder (99→79 fra nr. 11).
    const PRICE_IDS: Record<string, string | undefined> = {
        MESTER: Deno.env.get('STRIPE_PRICE_MESTER'),
        KONTOR: Deno.env.get('STRIPE_PRICE_KONTOR'),
        KONTOR_VOLUME: Deno.env.get('STRIPE_PRICE_KONTOR_11'),
        FELT: Deno.env.get('STRIPE_PRICE_FELT'),
        FELT_VOLUME: Deno.env.get('STRIPE_PRICE_FELT_11'),
    };
    const VOLUME_FROM = 11;
    const rawTeam = (carpenter.raw_data && carpenter.raw_data.team) || {};
    const team = {
        mester: Math.max(1, Number(rawTeam.mester) || 1),
        pl: Number(rawTeam.pl) || 0,
        bog: Number(rawTeam.bog) || 0,
        svend: Number(rawTeam.svend) || 0,
        laer: Number(rawTeam.laer) || 0,
    };
    const kontorSeats = (team.mester - 1) + team.pl + team.bog;
    const feltSeats = team.svend + team.laer;
    const split = (n: number) => ({ std: Math.min(n, VOLUME_FROM - 1), vol: Math.max(n - (VOLUME_FROM - 1), 0) });
    const k = split(kontorSeats);
    const f = split(feltSeats);

    const lineItems: { price: string; quantity: number }[] = [{ price: PRICE_IDS.MESTER as string, quantity: 1 }];
    if (k.std > 0) lineItems.push({ price: PRICE_IDS.KONTOR as string, quantity: k.std });
    if (k.vol > 0) lineItems.push({ price: PRICE_IDS.KONTOR_VOLUME as string, quantity: k.vol });
    if (f.std > 0) lineItems.push({ price: PRICE_IDS.FELT as string, quantity: f.std });
    if (f.vol > 0) lineItems.push({ price: PRICE_IDS.FELT_VOLUME as string, quantity: f.vol });
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

    // Opret Checkout Session
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        subscription_data: {
            metadata: {
                target_tier: 'role_based'
            }
        },
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
