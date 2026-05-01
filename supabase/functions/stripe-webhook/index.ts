import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'

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

    console.log("Modtog Stripe Webhook event:", event.type);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

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
        .select('id, tier, subscription_status')
        .eq('payment_customer_id', customerId)
        .single();

    if (findError || !carpenter) {
        console.log("Kunne ikke finde tømrer for customer:", customerId);
        return new Response('Ok (ukendt kunde)', { status: 200 });
    }

    // Håndter events
    switch (event.type) {
        case 'checkout.session.completed':
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            const sub = event.data.object as any;
            if (sub.status === 'active' || sub.status === 'trialing' || event.type === 'checkout.session.completed') {
                const targetTier = sub.metadata?.target_tier;
                
                const updateData: any = {
                    subscription_status: 'active',
                    trial_ends_at: null
                };
                
                if (targetTier) {
                    updateData.tier = targetTier;
                }
                
                await supabaseClient.from('carpenters').update(updateData).eq('id', carpenter.id);
                console.log(`Opdaterede firma ${carpenter.id} til active${targetTier ? ` med tier ${targetTier}` : ''}`);
            }
            break;
            
        case 'customer.subscription.deleted':
        case 'customer.subscription.canceled':
            await supabaseClient.from('carpenters').update({
                subscription_status: 'canceled'
            }).eq('id', carpenter.id);
            console.log(`Opdaterede firma ${carpenter.id} til canceled`);
            break;
            
        case 'invoice.payment_failed':
            await supabaseClient.from('carpenters').update({
                subscription_status: 'past_due'
            }).eq('id', carpenter.id);
            console.log(`Opdaterede firma ${carpenter.id} til past_due`);
            break;
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    console.error("Webhook Fejl:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
