import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// get-invoices
// Henter firmaets fakturaer DIREKTE fra Stripe, så de kan vises pænt inde i Frame
// (i stedet for at sende folk til Stripe-portalen). Read-only.
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

        const { data: caller } = await supa.from('carpenters').select('id, company_id').eq('id', user.id).single()
        if (!caller) return json({ error: 'Bruger findes ikke.' }, 403)
        const companyId = caller.company_id || caller.id

        const { data: owner } = await supa.from('carpenters').select('payment_customer_id').eq('id', companyId).single()
        if (!owner?.payment_customer_id) return json({ success: true, invoices: [] })

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient(),
        })

        const list = await stripe.invoices.list({ customer: owner.payment_customer_id, limit: 24 })
        const invoices = list.data.map((i: any) => ({
            id: i.id,
            number: i.number,
            created: i.created ? i.created * 1000 : null,
            total: typeof i.total === 'number' ? i.total / 100 : null, // øre → kr (inkl. moms)
            currency: (i.currency || 'dkk').toUpperCase(),
            status: i.status, // paid | open | void | uncollectible | draft
            pdf: i.invoice_pdf || null,
            hostedUrl: i.hosted_invoice_url || null,
        }))

        return json({ success: true, invoices })
    } catch (error) {
        console.error('get-invoices fejl:', (error as Error).message)
        return json({ success: false, error: (error as Error).message }, 400)
    }
})
