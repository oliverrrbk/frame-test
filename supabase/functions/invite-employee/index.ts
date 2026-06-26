import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

import { corsHeadersFor } from "../_shared/cors.ts"

// ============================================================================
// invite-employee
// Opretter en medarbejder — login + carpenter-RÆKKE — som Supabase edge-funktion,
// så service-role-nøglen ALTID er til stede (modsat Vercel, hvor en miljøvariabel
// kan mangle og DB-skrivningen så fejlede lydløst). Det betød tidligere at
// medarbejderen først dukkede op + talte med i prisen NÅR han selv loggede ind.
// Nu oprettes rækken med det samme → vises straks i listen og synces til Stripe.
// ============================================================================

const VALID_ROLES = ['sales', 'admin', 'accountant', 'worker', 'apprentice']

// Læsevenligt midlertidigt password (~52 bits) uden forvekslingstegn (0/O/1/l/I).
function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    let out = ''
    for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length]
    return `BISON-${out}`
}

// Selvstændig velkomst-mail (Deno kan ikke importere src/), holdt i Bison-stil.
function buildInviteEmail(firstName: string, loginEmail: string, password: string, companyName: string) {
    return `
    <div style="background:#f1f5f9;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#0f172a;padding:24px 32px;color:#fff;font-size:18px;font-weight:700;">Bison Frame</div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Hej ${firstName},</h2>
          <p style="color:#334155;line-height:1.6;margin:0 0 8px;">Du er netop blevet oprettet som bruger af <strong>${companyName || 'virksomheden'}</strong> på Bison Frame.</p>
          <p style="color:#334155;line-height:1.6;margin:0 0 24px;">Log ind og få adgang til dine sager, timer og byggechecklister.</p>
          <div style="background:#f1f5f9;padding:24px;border-radius:12px;border:1px solid #e2e8f0;text-align:center;margin:0 0 24px;">
            <p style="margin:0 0 14px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Dine midlertidige login-oplysninger</p>
            <p style="margin:0 0 8px;color:#0f172a;font-size:15px;">Brugernavn: <strong>${loginEmail}</strong></p>
            <p style="margin:0;color:#0f172a;font-size:15px;">Adgangskode: <strong style="background:#e2e8f0;padding:4px 10px;border-radius:6px;letter-spacing:1px;">${password}</strong></p>
          </div>
          <p style="color:#64748b;font-size:13px;font-style:italic;text-align:center;margin:0 0 24px;">Første gang du logger ind, bliver du bedt om at vælge din egen adgangskode.</p>
          <div style="text-align:center;">
            <a href="https://bisonframe.dk/login" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;">Gå til login</a>
          </div>
        </div>
      </div>
    </div>`
}

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

        const { name, email, phone, role } = await req.json()
        if (!name || !email) return json({ error: 'Mangler navn eller e-mail.' }, 400)
        if (!VALID_ROLES.includes(role)) return json({ error: 'Ugyldig rolle.' }, 400)

        // Kalderen skal være firmaets Mester (admin).
        const { data: callerProfile, error: profErr } = await admin
            .from('carpenters').select('id, role, company_id, company_name').eq('id', caller.id).single()
        if (profErr || !callerProfile) return json({ error: 'Profil ikke fundet.' }, 403)
        const companyId = callerProfile.company_id || callerProfile.id
        const callerIsAdmin = callerProfile.role === 'admin' || callerProfile.id === companyId
        if (!callerIsAdmin) return json({ error: 'Kun firmaets Mester kan oprette medarbejdere.' }, 403)

        const normEmail = String(email).trim().toLowerCase()
        const finalPassword = generatePassword()

        // 1. Opret login'et (service-role → altid muligt). Findes brugeren allerede
        //    (gen-invitation efter en tidligere fejl), genbruger vi den eksisterende.
        let userId: string
        const created = await admin.auth.admin.createUser({
            email: normEmail,
            password: finalPassword,
            email_confirm: true,
            user_metadata: { owner_name: name, email: normEmail, phone: phone || '', role, company_id: companyId },
        })
        if (created.error) {
            const list = await admin.auth.admin.listUsers()
            const existing = list.data?.users?.find((u) => (u.email || '').toLowerCase() === normEmail)
            if (!existing) return json({ error: created.error.message }, 400)
            userId = existing.id
        } else {
            userId = created.data.user.id
        }

        // 2. Næste ledige lønnummer (bevares hvis rækken allerede har ét).
        const { data: teamRows } = await admin.from('carpenters').select('raw_data').eq('company_id', companyId)
        const { data: ownerRow } = await admin.from('carpenters').select('raw_data').eq('id', companyId).single()
        const nums = [...(teamRows || []).map((r) => r.raw_data?.lonnummer), ownerRow?.raw_data?.lonnummer]
            .map(Number).filter((n) => !isNaN(n))
        const nextLon = String((nums.length ? Math.max(...nums) : 1000) + 1)

        const { data: existingMember } = await admin.from('carpenters').select('raw_data').eq('id', userId).single()
        const mergedRaw = { ...(existingMember?.raw_data || {}), lonnummer: existingMember?.raw_data?.lonnummer || nextLon }

        // 3. Opret/opdatér carpenter-rækken — DETTE er det der manglede via Vercel.
        const { data: member, error: upErr } = await admin.from('carpenters').upsert([{
            id: userId,
            email: normEmail,
            owner_name: name,
            phone: phone || '',
            role,
            company_id: companyId,
            company_name: 'Medarbejder',
            is_active: true,
            requires_password_change: true,
            raw_data: mergedRaw,
        }], { onConflict: 'id' }).select('*').single()
        if (upErr) return json({ error: `Kunne ikke oprette medarbejderen: ${upErr.message}` }, 400)

        // 4. Send velkomst-mail (best-effort). Hvis RESEND_API_KEY ikke er sat, sendes
        //    intet — så returnerer vi password'et, så Mesteren selv kan give det videre.
        let emailSent = false
        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (resendKey) {
            try {
                const html = buildInviteEmail(name.split(' ')[0], normEmail, finalPassword, callerProfile.company_name || '')
                const r = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: 'Bison Frame <info@bisonframe.dk>',
                        to: [normEmail],
                        subject: 'Velkommen til Bison Frame – dine login-oplysninger',
                        html,
                    }),
                })
                emailSent = r.ok
            } catch (_) { /* ignoreres — kontoen er oprettet uanset */ }
        }

        return json({
            success: true,
            member,
            lonnummer: mergedRaw.lonnummer,
            emailSent,
            // Vis kun password'et i UI'et hvis mailen IKKE blev sendt (fallback).
            tempPassword: emailSent ? undefined : finalPassword,
        })
    } catch (error) {
        console.error('invite-employee fejl:', (error as Error).message)
        return json({ error: (error as Error).message }, 400)
    }
})
