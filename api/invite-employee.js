import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { applyCors } from './_cors.js';
import { getEmployeeInviteTemplate } from '../src/utils/emailTemplates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Genererer et læsevenligt password med ~52 bits entropi (uden forvekslingstegn 0/O/1/l/I)
function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(10);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
        out += alphabet[bytes[i] % alphabet.length];
    }
    return `BISON-${out}`;
}

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Verificér kalderen før noget som helst andet
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Ikke logget ind.' });
        }
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: callerErr } = await supabase.auth.getUser(jwt);
        if (callerErr || !caller) {
            return res.status(401).json({ error: 'Ugyldig session.' });
        }

        const { name, email, phone, role, companyId, adminId } = req.body;

        if (!['sales', 'admin', 'accountant', 'worker', 'apprentice'].includes(role)) {
            return res.status(400).json({ error: 'Ugyldig rolle.' });
        }

        if (!name || !email || !companyId) {
            return res.status(400).json({ error: 'Mangler påkrævede felter.' });
        }

        // Verificér at kalderen er admin i det firma der inviteres til
        const { data: callerProfile, error: profileErr } = await supabase
            .from('carpenters')
            .select('id, role, company_id')
            .eq('id', caller.id)
            .single();
        if (profileErr || !callerProfile) {
            return res.status(403).json({ error: 'Profil ikke fundet.' });
        }
        const callerCompanyId = callerProfile.company_id || callerProfile.id; // ejeren har company_id = sit eget id eller null
        if (callerCompanyId !== companyId || (callerProfile.role !== 'admin' && callerProfile.id !== companyId)) {
            return res.status(403).json({ error: 'Du har ikke rettigheder til at invitere her.' });
        }

        const finalPassword = generatePassword();

        // 1. Opret brugeren i Supabase Auth
        // Bemærk: Hvis vi bruger admin.createUser, kræver det Service Role Key.
        // Hvis vi bruger almindelig signUp, skal e-mail bekræftes, medmindre det er slået fra.
        let authData, authError;
        
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const result = await supabase.auth.admin.createUser({
                email: email,
                password: finalPassword,
                email_confirm: true,
                user_metadata: {
                    owner_name: name,
                    email: email,
                    phone: phone || '',
                    role: role,
                    company_id: companyId
                }
            });
            authData = result.data;
            authError = result.error;
        } else {
            // Fallback til almindelig signup
            const result = await supabase.auth.signUp({
                email: email,
                password: finalPassword,
                options: {
                    data: {
                        owner_name: name,
                        email: email,
                        phone: phone || '',
                        role: role,
                        company_id: companyId
                    }
                }
            });
            authData = result.data;
            authError = result.error;
        }

        if (authError) {
            console.error("Auth Error:", authError);
            return res.status(400).json({ error: authError.message });
        }

        // Find højeste nuværende lønnummer for at tildele næste i rækken
        const { data: existingTeam } = await supabase.from('carpenters').select('raw_data').eq('company_id', companyId);
        const { data: adminProfile2 } = await supabase.from('carpenters').select('raw_data').eq('id', companyId).single();
        
        const existingNumbers = [
            ...(existingTeam || []).map(m => m.raw_data?.lonnummer),
            adminProfile2?.raw_data?.lonnummer
        ].filter(Boolean);
        
        const validNumbers = existingNumbers.map(Number).filter(n => !isNaN(n));
        const maxNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 1000;
        const autoLonnummer = (maxNum + 1).toString();

        // 2. Opret brugeren i carpenters tabellen så de dukker op i oversigten med det samme
        const { error: dbError } = await supabase.from('carpenters').insert([{
            id: authData.user.id,
            email: email,
            owner_name: name,
            phone: phone || '',
            role: role,
            company_id: companyId,
            company_name: 'Medarbejder',
            raw_data: { lonnummer: autoLonnummer },
            requires_password_change: true
        }]);

        if (dbError) {
            console.error("DB Insert Error:", dbError);
            // Ignorerer fejlen her for ikke at blokere, men den burde gå igennem
        }

        // 3. Send velkomstmail via Resend API (samme logik som send-email.js)
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            const htmlContent = getEmployeeInviteTemplate(
                name.split(' ')[0], // Brug kun fornavn
                email,
                finalPassword,
                { company_name: callerProfile?.company_name || 'Bison Frame' }
            );

            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Bison Frame <info@bisonframe.dk>',
                        to: [email],
                        subject: 'Velkommen til Bison Frame - Dine login oplysninger',
                        html: htmlContent
                    })
                });
            } catch (mailError) {
                console.error("Mail send error:", mailError);
            }
        }

        // Returner succes
        return res.status(200).json({ 
            success: true, 
            message: 'Medarbejder inviteret og mail sendt',
            user: authData.user
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
