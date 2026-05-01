import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    let tier = (targetTier || carpenter.tier || 'standard').toLowerCase();
    // Fallbacks hvis navnet i databasen hedder 'professionel' i stedet for 'standard'
    if (tier === 'professionel') tier = 'standard';
    if (tier === 'entreprise') tier = 'enterprise';
    
    // MAPPING FRA TIER TIL STRIPE PRICE ID
    const priceIds: Record<string, string> = {
        'basis': Deno.env.get('STRIPE_PRICE_BASIS') || 'price_12345basis',
        'standard': Deno.env.get('STRIPE_PRICE_STANDARD') || 'price_12345standard',
        'enterprise': Deno.env.get('STRIPE_PRICE_ENTERPRISE') || 'price_12345enterprise'
    };

    const priceId = priceIds[tier];
    if (!priceId) throw new Error("Kunne ikke finde Stripe Price ID for tier: " + tier);

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
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        subscription_data: {
            metadata: {
                target_tier: tier
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
