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

const KONTOR_ROLES = ['admin', 'boss', 'sales', 'lead', 'pm', 'accountant']; // fuld adgang (kontor)
const SVEND_ROLES = ['worker'];        // svend (app-adgang, timer)
const LAER_ROLES = ['apprentice'];     // lærling (app-adgang, mindre brug)
const HOLD_INCLUDED = 3;               // Hold dækker de første 3 brugere (mester + 2)
const TIER_BREAKS = [10, 50];          // trin skifter efter samlet bruger 10 og 50
const STRIPE_KEY: Record<string, string[]> = {
    kontor: ['KONTOR', 'KONTOR_11', 'KONTOR_51'],
    svend: ['SVEND', 'SVEND_11', 'SVEND_51'],
    laer: ['LAERLING', 'LAERLING_11', 'LAERLING_51'],
};
const tierForPosition = (pos: number) => (pos <= TIER_BREAKS[0] ? 0 : pos <= TIER_BREAKS[1] ? 1 : 2);

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
        const svendSeats = activeMembers.filter(m => SVEND_ROLES.includes(m.role)).length
        const laerSeats = activeMembers.filter(m => LAER_ROLES.includes(m.role)).length

        // Gem det udledte hold på profilen (så det altid afspejler virkeligheden).
        const team = { mester: 1, kontor: kontorSeats, svend: svendSeats, laer: laerSeats }
        await supabaseClient.from('carpenters')
            .update({ raw_data: { ...(owner.raw_data || {}), team } }).eq('id', companyId)

        // Kun betalende konti synces til Stripe. Prøve/exempt/canceled → færdig her.
        if (owner.subscription_status !== 'active' || !owner.payment_customer_id) {
            return json({ success: true, synced: false, reason: owner.subscription_status, team }, corsHeaders)
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })

        // NY PRISMODEL (kanonisk spec: src/utils/pricing.js). Grundplan (Solo/Hold, eller
        // MESTER=249 hvis grandfathered) + tillæg pr. ekstra bruger efter samlet position.
        const PRICE: Record<string, string | undefined> = {
            SOLO: Deno.env.get('STRIPE_PRICE_SOLO'),
            HOLD: Deno.env.get('STRIPE_PRICE_HOLD'),
            MESTER: Deno.env.get('STRIPE_PRICE_MESTER'),
            KONTOR: Deno.env.get('STRIPE_PRICE_KONTOR'),
            KONTOR_11: Deno.env.get('STRIPE_PRICE_KONTOR_11'),
            KONTOR_51: Deno.env.get('STRIPE_PRICE_KONTOR_51'),
            SVEND: Deno.env.get('STRIPE_PRICE_SVEND'),
            SVEND_11: Deno.env.get('STRIPE_PRICE_SVEND_11'),
            SVEND_51: Deno.env.get('STRIPE_PRICE_SVEND_51'),
            LAERLING: Deno.env.get('STRIPE_PRICE_LAERLING'),
            LAERLING_11: Deno.env.get('STRIPE_PRICE_LAERLING_11'),
            LAERLING_51: Deno.env.get('STRIPE_PRICE_LAERLING_51'),
        }
        const legacy = !!(owner.raw_data && owner.raw_data.legacy_pricing && owner.raw_data.legacy_pricing.locked)
        // Eksplicit Hold-flag (opgraderet Solo) fastholder Hold-grundpris selv med
        // kun mester — så seat-sync aldrig nedgraderer en opgraderet konto til Solo.
        const wantsHold = !!(owner.raw_data && owner.raw_data.plan === 'hold')
        const heads = 1 + kontorSeats + svendSeats + laerSeats
        let baseKey: string, included: number
        if (legacy) { baseKey = 'MESTER'; included = 1 }
        else if (wantsHold || heads >= 2) { baseKey = 'HOLD'; included = HOLD_INCLUDED }
        else { baseKey = 'SOLO'; included = 1 }

        const roleOrder: string[] = []
        for (let i = 0; i < kontorSeats; i++) roleOrder.push('kontor')
        for (let i = 0; i < svendSeats; i++) roleOrder.push('svend')
        for (let i = 0; i < laerSeats; i++) roleOrder.push('laer')
        const bucket: Record<string, number> = {}
        roleOrder.forEach((role, idx) => {
            const position = idx + 2
            if (position <= included) return
            const key = STRIPE_KEY[role][tierForPosition(position)]
            bucket[key] = (bucket[key] || 0) + 1
        })
        const desired: { price: string; quantity: number }[] = [{ price: PRICE[baseKey] as string, quantity: 1 }]
        for (const [key, quantity] of Object.entries(bucket)) desired.push({ price: PRICE[key] as string, quantity })
        if (desired.some((d) => !d.price)) {
            return json({ success: false, error: 'Mangler en eller flere STRIPE_PRICE_* secrets i Supabase.', team }, corsHeaders)
        }

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
