import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_cors.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const HAS_SERVICE_ROLE = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES = ['sales', 'admin', 'accountant', 'worker', 'apprentice'];

/*
 * Sikker administration af medarbejdere — KUN firmaets admin (Mester).
 * Håndhæves server-side (ikke kun i UI), så det ikke kan omgås.
 * Actions: set_role, set_permissions, deactivate, reactivate, delete
 */
export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 1. Verificér kalderen
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Ikke logget ind.' });
        }
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(jwt);
        if (callerErr || !caller) {
            return res.status(401).json({ error: 'Ugyldig session.' });
        }

        const { action, employeeId, role, permissions } = req.body || {};
        if (!action || !employeeId) {
            return res.status(400).json({ error: 'Mangler påkrævede felter.' });
        }

        // Opret en klient der kører som brugeren, så vi har de korrekte RLS rettigheder
        const userSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${jwt}` } }
        });

        // 2. Kalderens profil — skal være admin
        const { data: callerProfile, error: profileErr } = await supabase
            .from('carpenters')
            .select('id, role, company_id')
            .eq('id', caller.id)
            .single();
        if (profileErr || !callerProfile) {
            return res.status(403).json({ error: 'Profil ikke fundet.' });
        }
        const callerCompanyId = callerProfile.company_id || callerProfile.id;
        const callerIsAdmin = callerProfile.role === 'admin' || callerProfile.id === callerCompanyId;
        if (!callerIsAdmin) {
            return res.status(403).json({ error: 'Kun firmaets administrator (Mester) kan ændre medarbejdere.' });
        }

        // 3. Må ikke ændre sig selv eller firma-ejeren
        if (employeeId === caller.id) {
            return res.status(400).json({ error: 'Du kan ikke ændre din egen rolle/adgang her.' });
        }
        if (employeeId === callerCompanyId) {
            return res.status(400).json({ error: 'Firma-ejeren kan ikke ændres her.' });
        }

        // 4. Hent medarbejderen — skal tilhøre kalderens firma
        const { data: target, error: targetErr } = await supabase
            .from('carpenters')
            .select('id, role, company_id, permissions')
            .eq('id', employeeId)
            .single();
        if (targetErr || !target) {
            return res.status(404).json({ error: 'Medarbejder ikke fundet.' });
        }
        const targetCompanyId = target.company_id || target.id;
        if (targetCompanyId !== callerCompanyId) {
            return res.status(403).json({ error: 'Medarbejderen tilhører ikke dit firma.' });
        }

        if (action === 'set_role') {
            if (!ROLES.includes(role)) {
                return res.status(400).json({ error: 'Ugyldig rolle.' });
            }
            const client = HAS_SERVICE_ROLE ? supabase : userSupabase;
            const { data, error } = await client.from('carpenters').update({ role }).eq('id', employeeId).select('id');
            if (error) return res.status(400).json({ error: error.message });
            if (!data || data.length === 0) return res.status(403).json({ error: 'Kunne ikke opdatere rollen i databasen. RLS afviste handlingen.' });
            if (HAS_SERVICE_ROLE) {
                await supabase.auth.admin.updateUserById(employeeId, { user_metadata: { role } }).catch(() => {});
            }
            return res.status(200).json({ success: true });
        }

        if (action === 'set_permissions') {
            const client = HAS_SERVICE_ROLE ? supabase : userSupabase;
            const { data, error } = await client.from('carpenters').update({ permissions: permissions || {} }).eq('id', employeeId).select('id');
            if (error) return res.status(400).json({ error: error.message });
            if (!data || data.length === 0) return res.status(403).json({ error: 'Kunne ikke opdatere rettigheder i databasen. RLS afviste handlingen.' });
            return res.status(200).json({ success: true });
        }

        if (action === 'deactivate') {
            const client = HAS_SERVICE_ROLE ? supabase : userSupabase;
            const { data, error } = await client.from('carpenters').update({ is_active: false }).eq('id', employeeId).select('id');
            if (error) return res.status(400).json({ error: error.message });
            if (!data || data.length === 0) return res.status(403).json({ error: 'Kunne ikke deaktivere medarbejderen. RLS afviste handlingen.' });
            // Spær login (kan ikke logge ind mens deaktiveret)
            if (HAS_SERVICE_ROLE) {
                await supabase.auth.admin.updateUserById(employeeId, { ban_duration: '876000h' }).catch(() => {});
            }
            return res.status(200).json({ success: true });
        }

        if (action === 'reactivate') {
            const client = HAS_SERVICE_ROLE ? supabase : userSupabase;
            const { data, error } = await client.from('carpenters').update({ is_active: true }).eq('id', employeeId).select('id');
            if (error) return res.status(400).json({ error: error.message });
            if (!data || data.length === 0) return res.status(403).json({ error: 'Kunne ikke genaktivere medarbejderen. RLS afviste handlingen.' });
            if (HAS_SERVICE_ROLE) {
                await supabase.auth.admin.updateUserById(employeeId, { ban_duration: 'none' }).catch(() => {});
            }
            return res.status(200).json({ success: true });
        }

        if (action === 'delete') {
            // Sletning af et login kan kun ske med service-role. Uden den ville vi kun
            // kunne fjerne personen fra listen, men efterlade både login og persondata
            // (= GDPR-brud). Derfor er det et hårdt krav, og vi melder klart hvis det mangler.
            if (!HAS_SERVICE_ROLE) {
                return res.status(400).json({ error: 'Sletning er ikke konfigureret korrekt på serveren: SUPABASE_SERVICE_ROLE_KEY mangler (sættes som miljøvariabel på Vercel). Indtil den er sat, kan login og persondata ikke fjernes forsvarligt.' });
            }

            // 1. Forsøg fuld sletning af medarbejder-rækken.
            const { data: hardData, error: hardErr } = await supabase
                .from('carpenters').delete().eq('id', employeeId).select('id');

            let mode = 'deleted';

            // 2. Hvis fuld sletning afvises (typisk fremmednøgle til løn-/timehistorik der
            //    skal bevares lovpligtigt), anonymiserer vi i stedet personen (GDPR):
            //    persondata fjernes, men lønnummer + opgavehistorik på sager bevares.
            if (hardErr || !hardData || hardData.length === 0) {
                const { data: tgt } = await supabase
                    .from('carpenters').select('raw_data').eq('id', employeeId).single();

                if (tgt) {
                    const keptLonnummer = tgt?.raw_data?.lonnummer || null;
                    const { error: anonErr } = await supabase.from('carpenters').update({
                        owner_name: 'Slettet medarbejder',
                        email: `slettet-${employeeId}@slettet.invalid`,
                        phone: null,
                        avatar_url: null,
                        company_id: null,
                        role: 'inactive',
                        is_active: false,
                        requires_password_change: false,
                        // Beholder kun lønnummer (lovpligtig løn-/timehistorik) — alt øvrigt persondata fjernes.
                        raw_data: keptLonnummer ? { lonnummer: keptLonnummer } : {}
                    }).eq('id', employeeId).select('id');

                    if (anonErr) {
                        return res.status(400).json({ error: `Kunne ikke fjerne medarbejderen: ${anonErr.message}` });
                    }
                    mode = 'anonymized';
                }
                // tgt === null: rækken er allerede væk — betragtes som slettet.
            }

            // 3. Fjern selve login'et, så personen ikke kan logge ind igen.
            await supabase.auth.admin.deleteUser(employeeId).catch(() => {});

            return res.status(200).json({ success: true, mode });
        }

        return res.status(400).json({ error: 'Ukendt handling.' });
    } catch (error) {
        console.error('manage-employee error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
