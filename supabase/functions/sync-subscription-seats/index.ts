import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// sync-subscription-seats
// Holder Stripe-abonnementets sæder i sync med firmaets FAKTISKE aktive medarbejdere.
// Kaldes efter hver hold-ændring (tilføj / fjern / deaktivér / skift rolle).
//
// - Udleder holdet fra carpenters-rækkerne (1 Mester + kontor-sæder + felt-sæder).
// - Opdaterer KUN Stripe hvis kontoen er 'active' (betalende). Prøve/exempt/canceled
//   røres ikke — så prøve-konti, William og Bison selv koster aldrig noget.
// - Idempotent: regner altid hele holdet på ny, så den er sikker at kalde gentagne gange.
// ============================================================================

const KONTOR_ROLES = ['admin', 'boss', 'sales', 'lead', 'pm', 'accountant']; // fuld adgang (149)
const FELT_ROLES = ['worker', 'apprentice'];                                  // app-adgang (99)
const VOLUME_FROM = 11;

serve(async (req) => {
    const corsHeaders = corsHeadersFor(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Mangler Authorization header')
        const jwt = authHeader.replace('Bearer ', '')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
        if (userError || !user) throw new Error("Bruger ikke logget ind")

        // Find kalderens firma (company_id, ellers er kalderen selv ejeren).
        const { data: caller } = await supabaseClient
            .from('carpenters').select('id, company_id').eq('id', user.id).single()
        if (!caller) throw new Error("Bruger findes ikke")
        const companyId = caller.company_id || caller.id

        // Hent ejeren (Mester) + alle aktive medarbejdere i firmaet.
        const { data: owner } = await supabaseClient
            .from('carpenters').select('id, subscription_status, payment_customer_id, raw_data')
            .eq('id', companyId).single()
        if (!owner) throw new Error("Firma findes ikke")

        const { data: members } = await supabaseClient
            .from('carpenters').select('role, is_active').eq('company_id', companyId)

        const activeMembers = (members || []).filter(m => m.is_active !== false)
        const kontorSeats = activeMembers.filter(m => KONTOR_ROLES.includes(m.role)).length
        const feltSeats = activeMembers.filter(m => FELT_ROLES.includes(m.role)).length

        // Gem det udledte hold på profilen (så det altid afspejler virkeligheden).
        const team = { mester: 1, kontor: kontorSeats, felt: feltSeats }
        await supabaseClient.from('carpenters')
            .update({ raw_data: { ...(owner.raw_data || {}), team } }).eq('id', companyId)

        // Kun betalende konti synces til Stripe. Prøve/exempt/canceled → færdig her.
        if (owner.subscription_status !== 'active' || !owner.payment_customer_id) {
            return json({ success: true, synced: false, reason: owner.subscription_status, team }, corsHeaders)
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })

        // Ønskede sæder → Stripe price-id'er.
        const PRICE = {
            MESTER: Deno.env.get('STRIPE_PRICE_MESTER'),
            KONTOR: Deno.env.get('STRIPE_PRICE_KONTOR'),
            KONTOR_VOLUME: Deno.env.get('STRIPE_PRICE_KONTOR_11'),
            FELT: Deno.env.get('STRIPE_PRICE_FELT'),
            FELT_VOLUME: Deno.env.get('STRIPE_PRICE_FELT_11'),
        }
        const split = (n: number) => ({ std: Math.min(n, VOLUME_FROM - 1), vol: Math.max(n - (VOLUME_FROM - 1), 0) })
        const k = split(kontorSeats), f = split(feltSeats)
        const desired: { price: string; quantity: number }[] = [{ price: PRICE.MESTER as string, quantity: 1 }]
        if (k.std > 0) desired.push({ price: PRICE.KONTOR as string, quantity: k.std })
        if (k.vol > 0) desired.push({ price: PRICE.KONTOR_VOLUME as string, quantity: k.vol })
        if (f.std > 0) desired.push({ price: PRICE.FELT as string, quantity: f.std })
        if (f.vol > 0) desired.push({ price: PRICE.FELT_VOLUME as string, quantity: f.vol })

        // Find det aktive abonnement.
        const subs = await stripe.subscriptions.list({ customer: owner.payment_customer_id, status: 'active', limit: 1 })
        if (!subs.data.length) {
            return json({ success: true, synced: false, reason: 'no_active_subscription', team }, corsHeaders)
        }
        const sub = subs.data[0]

        // Byg items-array: opdater eksisterende, tilføj nye, slet dem der ikke længere er ønsket.
        const items: Record<string, unknown>[] = []
        const desiredPrices = new Set(desired.map(d => d.price))
        for (const d of desired) {
            const existing = sub.items.data.find((it: any) => it.price.id === d.price)
            if (existing) items.push({ id: existing.id, quantity: d.quantity })
            else items.push({ price: d.price, quantity: d.quantity })
        }
        for (const it of sub.items.data as any[]) {
            if (!desiredPrices.has(it.price.id)) items.push({ id: it.id, deleted: true })
        }

        await stripe.subscriptions.update(sub.id, { items, proration_behavior: 'create_prorations' })

        return json({ success: true, synced: true, team }, corsHeaders)
    } catch (error) {
        console.error("sync-subscription-seats fejl:", (error as Error).message)
        return json({ success: false, error: (error as Error).message }, corsHeadersFor(req))
    }
})

function json(body: unknown, corsHeaders: Record<string, string>) {
    return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
}
