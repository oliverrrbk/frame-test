import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// manage-subscription
// Opsig / genaktivér / aflæs abonnement DIREKTE i appen (uden Stripe-portalen),
// så Frame altid kan vise den rigtige tilstand:
//   - 'cancel'     → sætter cancel_at_period_end = true (kører perioden ud)
//   - 'reactivate' → sætter cancel_at_period_end = false (fortsætter)
//   - 'status'     → aflæser blot (bruges ved sideindlæsning)
// Gemmer {cancelAtPeriodEnd, periodEnd, status} i ejerens raw_data.billing, så
// UI'et er retvisende selv uden at kalde Stripe igen.
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

        const supa = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const { data: { user }, error: ue } = await supa.auth.getUser(jwt)
        if (ue || !user) return json({ error: 'Bruger ikke logget ind' }, 401)

        let action = 'status'
        try { const b = await req.json(); if (b?.action) action = b.action } catch { /* default status */ }

        const { data: caller } = await supa.from('carpenters').select('id, role, company_id').eq('id', user.id).single()
        if (!caller) return json({ error: 'Bruger findes ikke' }, 403)
        const companyId = caller.company_id || caller.id

        // Kun ejeren/Mester må ændre abonnementet (alle må aflæse 'status').
        const callerIsAdmin = caller.id === companyId || caller.role === 'admin'
        if ((action === 'cancel' || action === 'reactivate') && !callerIsAdmin) {
            return json({ error: 'Kun firmaets Mester kan ændre abonnementet.' }, 403)
        }

        const { data: owner } = await supa.from('carpenters')
            .select('id, subscription_status, payment_customer_id, raw_data').eq('id', companyId).single()
        if (!owner) return json({ error: 'Firma findes ikke' }, 404)

        if (owner.subscription_status === 'exempt') return json({ success: true, exempt: true })
        if (!owner.payment_customer_id) {
            return json({ success: true, hasSubscription: false, cancelAtPeriodEnd: false, status: owner.subscription_status })
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })

        const subs = await stripe.subscriptions.list({ customer: owner.payment_customer_id, status: 'all', limit: 10 })
        let sub = subs.data.find((s: any) => s.status === 'active' || s.status === 'trialing') || subs.data[0]
        if (!sub) {
            return json({ success: true, hasSubscription: false, cancelAtPeriodEnd: false, status: owner.subscription_status })
        }

        if (action === 'cancel' && !sub.cancel_at_period_end) {
            sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true })
        } else if (action === 'reactivate' && sub.cancel_at_period_end) {
            sub = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false })
        }

        const billing = {
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            periodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null, // ms epoch
            status: sub.status,
        }

        await supa.from('carpenters')
            .update({ raw_data: { ...(owner.raw_data || {}), billing } }).eq('id', companyId)

        return json({ success: true, hasSubscription: true, ...billing })
    } catch (error) {
        console.error('manage-subscription fejl:', (error as Error).message)
        return json({ success: false, error: (error as Error).message }, 400)
    }
})
