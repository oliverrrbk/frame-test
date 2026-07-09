import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { applyCors } from './_cors.js';
import { getGuestInviteTemplate } from '../src/utils/emailTemplates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gyldige medlems-roller PÅ en sag (project_members.role).
const MEMBER_ROLES = ['subcontractor_owner', 'journeyman', 'apprentice', 'project_manager'];

function tempPassword() {
    return `BISON-${randomBytes(12).toString('hex').toUpperCase()}`;
}

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // 1. Verificér kalderen
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Ikke logget ind.' });
        }
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(jwt);
        if (callerErr || !caller) return res.status(401).json({ error: 'Ugyldig session.' });

        const { leadId, name, email, phone, companyName, role, projectTitle, origin } = req.body;

        if (!leadId || !email || !name) return res.status(400).json({ error: 'Mangler påkrævede felter.' });
        if (role && !MEMBER_ROLES.includes(role)) return res.status(400).json({ error: 'Ugyldig rolle.' });

        // 2. Find kalderens firma + bekræft at han ejer/administrerer sagen
        const { data: callerProfile } = await supabase
            .from('carpenters').select('id, role, company_id, company_name, subscription_status').eq('id', caller.id).single();
        if (!callerProfile) return res.status(403).json({ error: 'Profil ikke fundet.' });
        const callerCompanyId = callerProfile.company_id || callerProfile.id;

        // Guardrail: kun firmaer med gyldigt abonnement må sprede gæste-logins (en udløbet
        // konto skal ikke kunne blive ved). Vi tjekker FIRMAETS (ejerens) status — ikke den
        // enkelte medarbejders — og 'exempt' (gratis test-/partner-konti som Bison + Skovbo)
        // behandles som fuldt aktive, præcis som paywall'en i appen.
        let ownerStatus = callerProfile.subscription_status;
        if (callerProfile.company_id) {
            const { data: owner } = await supabase
                .from('carpenters').select('subscription_status').eq('id', callerCompanyId).single();
            if (owner) ownerStatus = owner.subscription_status;
        }
        const subStatus = ownerStatus || 'trialing';
        if (!['active', 'trialing', 'exempt'].includes(subStatus)) {
            return res.status(402).json({ error: 'Dit abonnement er ikke aktivt. Forny for at sende gæste-logins.' });
        }

        const { data: lead } = await supabase.from('leads').select('id, carpenter_id').eq('id', leadId).single();
        if (!lead) return res.status(404).json({ error: 'Sagen blev ikke fundet.' });
        if (lead.carpenter_id !== callerCompanyId) {
            return res.status(403).json({ error: 'Du har ikke adgang til denne sag.' });
        }

        // 3. Find eller opret gæstens auth-bruger
        let guestUserId = null;
        let isNewUser = false;

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { data: created, error: createErr } = await supabase.auth.admin.createUser({
                email,
                password: tempPassword(),
                email_confirm: true,
                user_metadata: { owner_name: name, email, phone: phone || '', role: 'guest' },
            });
            if (created?.user) {
                guestUserId = created.user.id;
                isNewUser = true;
            } else if (createErr) {
                // Findes allerede (fx en eksisterende Bison-bruger) → genbrug deres id,
                // så de bare kobles på endnu en sag. Rør IKKE deres rolle/firma.
                const { data: existing } = await supabase
                    .from('carpenters').select('id').eq('email', email).limit(1).maybeSingle();
                if (existing?.id) guestUserId = existing.id;
                else return res.status(400).json({ error: createErr.message });
            }
        } else {
            return res.status(500).json({ error: 'Server mangler SUPABASE_SERVICE_ROLE_KEY.' });
        }

        // 4. Kun for NYE brugere: opret en spæd guest-profil (ingen trial, intet firma,
        //    ingen onboarding-popup). Eksisterende brugere røres ikke.
        if (isNewUser) {
            await supabase.from('carpenters').upsert([{
                id: guestUserId,
                email,
                owner_name: name,
                phone: phone || '',
                company_name: companyName || 'Underentreprenør',
                role: 'guest',
                company_id: null,
                has_completed_onboarding: true,   // ingen onboarding-flow for gæster
                requires_password_change: false,  // de vælger selv kode i aktiveringen
            }], { onConflict: 'id' });
        }

        // 5. Opret/opdatér projekt-medlemskabet (status 'active' → adgang via is_project_member)
        const inviteToken = randomBytes(24).toString('hex');
        await supabase.from('project_members').upsert([{
            lead_id: leadId,
            auth_user_id: guestUserId,
            invited_by_company_id: callerCompanyId,
            name,
            email,
            phone: phone || null,
            company_name: companyName || null,
            role: role || 'subcontractor_owner',
            status: 'active',
            invite_token: inviteToken,
            invite_sent_at: new Date().toISOString(),
        }], { onConflict: 'lead_id,auth_user_id' });

        // 6. NOTIFIKATION — afhænger af om personen er ny eller en EKSISTERENDE gæst:
        if (isNewUser) {
            // NY: send password-/vilkårs-mail (engangs-onboarding).
            const redirectTo = `${origin || 'https://bisonframe.dk'}/guest/aktiver`;
            const { data: linkData } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: { redirectTo },
            });
            const actionLink = linkData?.properties?.action_link || `${redirectTo}`;

            const resendApiKey = process.env.RESEND_API_KEY;
            if (resendApiKey) {
                const html = getGuestInviteTemplate(
                    (name || '').split(' ')[0],
                    callerProfile.company_name || 'En virksomhed',
                    projectTitle || 'et byggeprojekt',
                    actionLink
                );
                try {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: 'Bison Frame <info@bisonframe.dk>',
                            to: [email],
                            subject: `Du er tilføjet som underentreprenør i Bison Frame`,
                            html,
                        }),
                    });
                } catch (mailErr) {
                    console.error('Gæste-mail fejlede:', mailErr);
                }
            }
        } else {
            // EKSISTERENDE gæst tilføjet til en NY sag → ingen genlogin, bare en let PUSH.
            try {
                await fetch(`${supabaseUrl}/functions/v1/send-push-reminders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
                    body: JSON.stringify({
                        type: 'guest_new_project',
                        user_id: guestUserId,
                        lead_id: leadId,
                        company_name: callerProfile.company_name || 'En virksomhed',
                        project_title: projectTitle || 'et projekt',
                    }),
                });
            } catch (pushErr) {
                console.error('Gæste-push fejlede:', pushErr);
            }
        }

        return res.status(200).json({ success: true, isNewUser });
    } catch (error) {
        console.error('invite-guest server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
