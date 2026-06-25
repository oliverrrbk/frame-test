import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_cors.js';
import { getAdminNewSignupTemplate } from '../src/utils/emailTemplates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Konverter en gæst til sit eget betalende firma (afslutter den virale loop).
// Kører server-side fordi trg_protect_carpenter_cols spærrer rolle/tier/abonnement
// for almindelige brugere — kun service_role må opgradere. Gæstens project_members
// bevares (auth_user_id uændret), så de beholder adgangen til mesterens sag = frøet til Phase 3.
export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Ikke logget ind.' });
        }
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(jwt);
        if (callerErr || !caller) return res.status(401).json({ error: 'Ugyldig session.' });

        const { companyName, cvr, address, phone } = req.body;
        if (!companyName || !companyName.trim()) return res.status(400).json({ error: 'Firmanavn mangler.' });

        // Hent gæstens profil + bekræft at det FAKTISK er en gæst (kun gæster konverterer)
        const { data: prof } = await supabase
            .from('carpenters').select('*').eq('id', caller.id).single();
        if (!prof) return res.status(404).json({ error: 'Profil ikke fundet.' });
        if (prof.role !== 'guest') return res.status(409).json({ error: 'Kun en gæste-konto kan konverteres.' });

        // Slug ud fra firmanavn (samme mønster som Register.jsx)
        const baseSlug = companyName.toLowerCase()
            .replace(/[^a-z0-9æøå-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tomrer';
        const slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

        // Opgradér til eget firma: 30 dages gratis prøve (intet kort), eget firma (company_id=null → ER firmaet).
        const { error: updErr } = await supabase.from('carpenters').update({
            role: 'admin',
            company_id: null,
            tier: 'role_based',
            company_name: companyName,
            cvr: cvr || prof.cvr || '',
            address: address || prof.address || '',
            phone: phone || prof.phone || '',
            slug,
            subscription_status: 'trialing',
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            has_completed_onboarding: false,   // få den normale mester-onboarding nu
            requires_password_change: false,
        }).eq('id', caller.id);

        if (updErr) {
            console.error('convert-guest update error:', updErr);
            return res.status(500).json({ error: 'Kunne ikke oprette firmaet.' });
        }

        // Ramt den EKSISTERENDE "ny tømrer oprettet"-notifikation (ingen ny push) — din salgs-trigger.
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: 'Bison Frame <info@bisonframe.dk>',
                        to: ['mbc@bisoncompany.dk'],
                        subject: `Ny Tømrer (konverteret gæst): ${companyName}`,
                        html: getAdminNewSignupTemplate(companyName, cvr || '', prof.owner_name || '', prof.email || caller.email || '', phone || prof.phone || ''),
                    }),
                });
            } catch (mailErr) {
                console.error('Konverterings-notifikation fejlede:', mailErr);
            }
        }

        // CRM-webhook (samme som ved normal signup), så konverteringer også lander i CRM.
        try {
            await fetch('https://www.bisoncrm.dk/api/webhooks/frame-signup', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer bf_sec_8f92a4c10e39b7d6a5f4c3e2d1', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName,
                    contactName: prof.owner_name || '',
                    email: prof.email || caller.email || '',
                    phone: phone || prof.phone || '',
                    product: 'Bison Frame (konverteret gæst)',
                    price: 249,
                }),
            });
        } catch (hookErr) {
            console.error('CRM-webhook fejlede:', hookErr);
        }

        return res.status(200).json({ success: true, slug });
    } catch (error) {
        console.error('convert-guest server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
