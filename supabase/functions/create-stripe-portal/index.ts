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

    const customerId = carpenter.payment_customer_id;
    if (!customerId || !customerId.startsWith('cus_')) {
        throw new Error("Ingen aktiv Stripe-kunde fundet. Opret venligst et abonnement først.");
    }

    // Verify customer exists
    let customerExists = false;
    try {
        const stripeCustomer = await stripe.customers.retrieve(customerId);
        if (!stripeCustomer.deleted) {
            customerExists = true;
        }
    } catch (e) {
        throw new Error("Kunne ikke finde kunden i Stripe. Kontakt venligst support.");
    }

    if (!customerExists) {
        throw new Error("Kunden er blevet slettet i Stripe. Kontakt venligst support.");
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';
    
    // Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard?activeTab=account_settings`,
    });

    return new Response(
      JSON.stringify({ success: true, url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error("Fejl i create-stripe-portal function:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})
