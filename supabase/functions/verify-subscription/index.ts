import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// verify-subscription
// Spørger Stripe DIREKTE om firmaet har et aktivt abonnement og sætter
// subscription_status derefter. Bruges når man kommer tilbage fra checkout, så
// vi IKKE er afhængige af at webhook'en er nået frem (timing/opsætning).
// Idempotent og sikker at kalde gentagne gange.
// ============================================================================

serve(async (req) => {
    const corsHeaders = corsHeadersFor(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Mangler Authorization header')
        const jwt = authHeader.replace('Bearer ', '')

        const supa = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const { data: { user }, error: ue } = await supa.auth.getUser(jwt)
        if (ue || !user) throw new Error('Bruger ikke logget ind')

        const { data: caller } = await supa.from('carpenters').select('id, company_id').eq('id', user.id).single()
        if (!caller) throw new Error('Bruger findes ikke')
        const companyId = caller.company_id || caller.id

        const { data: owner } = await supa.from('carpenters')
            .select('id, payment_customer_id, subscription_status').eq('id', companyId).single()
        if (!owner) throw new Error('Firma findes ikke')

        // Exempt-konti (gratis) røres aldrig.
        if (owner.subscription_status === 'exempt') return json({ success: true, status: 'exempt' }, corsHeaders)
        // Intet Stripe-kundeid endnu = har aldrig startet betaling.
        if (!owner.payment_customer_id) return json({ success: true, status: owner.subscription_status, active: false }, corsHeaders)

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })
        const subs = await stripe.subscriptions.list({ customer: owner.payment_customer_id, status: 'all', limit: 10 })
        // Foretræk et aktivt abonnement; ellers et der stadig er i prøve (kort tilknyttet).
        const liveSub = subs.data.find((s: any) => s.status === 'active') || subs.data.find((s: any) => s.status === 'trialing')
        const isPastDue = subs.data.some((s: any) => s.status === 'past_due' || s.status === 'unpaid')

        if (liveSub) {
            if (liveSub.status === 'trialing') {
                // Kort tilknyttet, men stadig i prøve → behold 'trialing' + spejl trial_end.
                // Der trækkes IKKE endnu; prøve-uret bevares præcist.
                const trialEndsAt = liveSub.trial_end ? new Date(liveSub.trial_end * 1000).toISOString() : null
                const update: any = { subscription_status: 'trialing', tier: 'role_based' }
                if (trialEndsAt) update.trial_ends_at = trialEndsAt
                await supa.from('carpenters').update(update).eq('id', companyId)
                return json({ success: true, status: 'trialing', active: true, hasCard: true, trialEndsAt }, corsHeaders)
            }
            await supa.from('carpenters').update({ subscription_status: 'active', trial_ends_at: null, tier: 'role_based' }).eq('id', companyId)
            return json({ success: true, status: 'active', active: true }, corsHeaders)
        }
        if (isPastDue) {
            await supa.from('carpenters').update({ subscription_status: 'past_due' }).eq('id', companyId)
            return json({ success: true, status: 'past_due' }, corsHeaders)
        }
        return json({ success: true, status: owner.subscription_status, active: false }, corsHeaders)
    } catch (error) {
        console.error('verify-subscription fejl:', (error as Error).message)
        return json({ success: false, error: (error as Error).message }, corsHeadersFor(req))
    }
})

function json(body: unknown, corsHeaders: Record<string, string>) {
    return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
}
