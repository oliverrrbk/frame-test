import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// manage-payment-method
//  - 'setup'       → opretter en SetupIntent og returnerer client_secret, så et nyt
//                    kort kan indtastes sikkert i Frame via Stripe Elements.
//  - 'set-default' → sætter det nye kort som standard på kunden + abonnementet.
// Kun ejeren/Mester må ændre betalingskort.
// ============================================================================

serve(async (req) => {
    const corsHeaders = corsHeadersFor(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'Ikke logget ind.' }, 401)
        const jwt = authHeader.replace('Bearer ', '')

        const supa = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
        const { data: { user }, error: ue } = await supa.auth.getUser(jwt)
        if (ue || !user) return json({ error: 'Ugyldig session.' }, 401)

        const { action, paymentMethodId } = await req.json()

        const { data: caller } = await supa.from('carpenters').select('id, role, company_id').eq('id', user.id).single()
        if (!caller) return json({ error: 'Bruger findes ikke.' }, 403)
        const companyId = caller.company_id || caller.id
        const callerIsAdmin = caller.id === companyId || caller.role === 'admin'
        if (!callerIsAdmin) return json({ error: 'Kun firmaets Mester kan ændre betalingskort.' }, 403)

        const { data: owner } = await supa.from('carpenters').select('id, payment_customer_id').eq('id', companyId).single()
        if (!owner?.payment_customer_id) return json({ error: 'Ingen Stripe-kunde fundet. Opret abonnement først.' }, 400)

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })

        if (action === 'setup') {
            const si = await stripe.setupIntents.create({
                customer: owner.payment_customer_id,
                payment_method_types: ['card'],
                usage: 'off_session',
            })
            return json({ success: true, clientSecret: si.client_secret })
        }

        if (action === 'set-default') {
            if (!paymentMethodId) return json({ error: 'Mangler kort-id.' }, 400)
            // Sæt som standard på kunden (bruges til fremtidige fakturaer).
            await stripe.customers.update(owner.payment_customer_id, {
                invoice_settings: { default_payment_method: paymentMethodId },
            })
            // ...og på det aktive abonnement, så næste træk bruger det nye kort.
            const subs = await stripe.subscriptions.list({ customer: owner.payment_customer_id, status: 'all', limit: 10 })
            const sub = subs.data.find((s: any) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due')
            if (sub) {
                await stripe.subscriptions.update(sub.id, { default_payment_method: paymentMethodId })
            }
            return json({ success: true })
        }

        return json({ error: 'Ukendt handling.' }, 400)
    } catch (error) {
        console.error('manage-payment-method fejl:', (error as Error).message)
        return json({ success: false, error: (error as Error).message }, 400)
    }
})
