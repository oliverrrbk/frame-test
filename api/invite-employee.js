import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Ideelt set bruger man SUPABASE_SERVICE_ROLE_KEY her for at omgå RLS, 
// men hvis vi tillader signUp, kan vi bruge ANON_KEY.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { name, email, phone, role, companyId, adminId } = req.body;

        if (!['sales', 'admin', 'accountant'].includes(role)) {
            return res.status(400).json({ error: 'Ugyldig rolle.' });
        }

        if (!name || !email || !companyId) {
            return res.status(400).json({ error: 'Mangler påkrævede felter.' });
        }

        // Generer en læsevenlig engangskode
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);
        const finalPassword = `BISON-${randomNumbers}`;

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

        // 2. Opret brugeren i carpenters tabellen så de dukker op i oversigten med det samme
        const { error: dbError } = await supabase.from('carpenters').insert([{
            id: authData.user.id,
            email: email,
            owner_name: name,
            phone: phone || '',
            role: role,
            company_id: companyId,
            company_name: 'Medarbejder',
            requires_password_change: true
        }]);

        if (dbError) {
            console.error("DB Insert Error:", dbError);
            // Ignorerer fejlen her for ikke at blokere, men den burde gå igennem
        }

        // 3. Send velkomstmail via Resend API (samme logik som send-email.js)
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            const htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0f172a;">Velkommen til Bison Frame</h2>
                    <p>Hej ${name},</p>
                    <p>Du er blevet oprettet som bruger af din virksomhed på Bison Frame.</p>
                    <p>Du kan nu logge ind og få adgang til dine opgaver og kunder.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px 0;"><strong>Dine login-oplysninger:</strong></p>
                        <p style="margin: 0 0 5px 0;">Brugernavn: <strong>${email}</strong></p>
                        <p style="margin: 0;">Adgangskode: <strong>${finalPassword}</strong></p>
                    </div>

                    <p><em>Bemærk: Første gang du logger ind, vil du blive bedt om at ændre adgangskoden til din egen personlige.</em></p>
                    
                    <div style="margin-top: 30px;">
                        <a href="https://bisonframe.dk/login" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Gå til Login</a>
                    </div>
                </div>
            `;

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
