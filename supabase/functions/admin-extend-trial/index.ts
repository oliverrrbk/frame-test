import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// admin-extend-trial
// Lader SUPER-ADMIN (team@bisoncompany.dk) forlænge en kundes prøveperiode med et
// valgfrit antal dage. trial_ends_at + subscription_status er beskyttede kolonner
// (kun service_role må ændre dem), så det skal ske server-side her.
// ============================================================================

const SUPER_ADMIN_EMAIL = 'team@bisoncompany.dk'

serve(async (req) => {
    const corsHeaders = corsHeadersFor(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'Ikke logget ind.' }, 401)
        const jwt = authHeader.replace('Bearer ', '')

        const admin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const { data: { user }, error: ue } = await admin.auth.getUser(jwt)
        if (ue || !user) return json({ error: 'Ugyldig session.' }, 401)
        if ((user.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
            return json({ error: 'Kun super-admin kan forlænge prøveperioder.' }, 403)
        }

        const { companyId, days } = await req.json()
        const n = Math.round(Number(days))
        if (!companyId || !Number.isFinite(n) || n < 1 || n > 365) {
            return json({ error: 'Ugyldigt firma-id eller antal dage (1–365).' }, 400)
        }

        const { data: owner } = await admin.from('carpenters')
            .select('id, subscription_status, trial_ends_at').eq('id', companyId).single()
        if (!owner) return json({ error: 'Firma findes ikke.' }, 404)
        if (owner.subscription_status === 'exempt') {
            return json({ error: 'Kontoen er gratis (exempt) — prøveperiode er ikke relevant.' }, 400)
        }

        // Forlæng fra det seneste af (nu) og (nuværende trial-slut), så man aldrig forkorter.
        const now = Date.now()
        const base = owner.trial_ends_at ? Math.max(now, new Date(owner.trial_ends_at).getTime()) : now
        const newEnd = new Date(base + n * 24 * 60 * 60 * 1000).toISOString()

        // Aktive (betalende) konti beholder 'active' — vi flytter blot trial-datoen (harmløst).
        // Alt andet (prøve/udløbet/opsagt) sættes til 'trialing' så adgangen genåbnes.
        const newStatus = owner.subscription_status === 'active' ? 'active' : 'trialing'

        await admin.from('carpenters')
            .update({ trial_ends_at: newEnd, subscription_status: newStatus })
            .eq('id', companyId)

        return json({ success: true, trial_ends_at: newEnd, subscription_status: newStatus })
    } catch (error) {
        console.error('admin-extend-trial fejl:', (error as Error).message)
        return json({ error: (error as Error).message }, 400)
    }
})
