import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

import { corsHeadersFor } from "../_shared/cors.ts"

// Admin-sikret sletning af en medarbejder — kører som Supabase edge-funktion, så
// service-role-nøglen ALTID er til stede (modsat Vercel, hvor en miljøvariabel kan
// mangle). Sletter login'et og enten fjerner eller (ved fremmednøgle til løn-/time-
// historik) anonymiserer medarbejderen, så GDPR overholdes men lovpligtig historik
// bevares.
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller) return json({ error: 'Ugyldig session.' }, 401)

    const { employeeId } = await req.json()
    if (!employeeId) return json({ error: 'Mangler employeeId.' }, 400)

    // Kalderens profil — skal være admin (Mester)
    const { data: callerProfile, error: profErr } = await admin
      .from('carpenters').select('id, role, company_id').eq('id', caller.id).single()
    if (profErr || !callerProfile) return json({ error: 'Profil ikke fundet.' }, 403)

    const callerCompanyId = callerProfile.company_id || callerProfile.id
    const callerIsAdmin = callerProfile.role === 'admin' || callerProfile.id === callerCompanyId
    if (!callerIsAdmin) return json({ error: 'Kun firmaets administrator (Mester) kan slette medarbejdere.' }, 403)

    if (employeeId === caller.id) return json({ error: 'Du kan ikke slette dig selv her.' }, 400)
    if (employeeId === callerCompanyId) return json({ error: 'Firma-ejeren kan ikke slettes.' }, 400)

    // Medarbejderen skal tilhøre kalderens firma
    const { data: target, error: tErr } = await admin
      .from('carpenters').select('id, company_id, raw_data').eq('id', employeeId).single()
    if (tErr || !target) return json({ error: 'Medarbejder ikke fundet.' }, 404)
    if ((target.company_id || target.id) !== callerCompanyId) {
      return json({ error: 'Medarbejderen tilhører ikke dit firma.' }, 403)
    }

    // 1. Forsøg fuld sletning af rækken.
    const { data: hardData, error: hardErr } = await admin
      .from('carpenters').delete().eq('id', employeeId).select('id')

    let mode = 'deleted'

    // 2. Hvis fuld sletning afvises (fremmednøgle til løn-/timehistorik der skal bevares),
    //    anonymisér i stedet (GDPR): persondata fjernes, lønnummer + historik bevares.
    if (hardErr || !hardData || hardData.length === 0) {
      const keptLonnummer = target.raw_data?.lonnummer || null
      const { error: anonErr } = await admin.from('carpenters').update({
        owner_name: 'Slettet medarbejder',
        email: `slettet-${employeeId}@slettet.invalid`,
        phone: null,
        avatar_url: null,
        company_id: null,
        role: 'inactive',
        is_active: false,
        requires_password_change: false,
        raw_data: keptLonnummer ? { lonnummer: keptLonnummer } : {}
      }).eq('id', employeeId).select('id')
      if (anonErr) return json({ error: `Kunne ikke fjerne medarbejderen: ${anonErr.message}` }, 400)
      mode = 'anonymized'
    }

    // 3. Fjern login'et, så personen ikke kan logge ind igen.
    await admin.auth.admin.deleteUser(employeeId).catch(() => {})

    return json({ success: true, mode })
  } catch (error) {
    console.error('delete-employee fejl:', (error as Error).message)
    return json({ error: (error as Error).message }, 400)
  }
})
