import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Uautoriseret: Ingen adgangsgivende token' });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Uautoriseret: Ugyldigt token' });
        }

        const { smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;

        if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
            return res.status(400).json({ error: 'Manglende SMTP-indstillinger' });
        }

        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port),
            secure: parseInt(smtp_port) === 465,
            auth: {
                user: smtp_user,
                pass: smtp_pass,
            },
            tls: {
                rejectUnauthorized: false // Sikrer stabilitet for almindelige danske hosts
            }
        });

        // Test forbindelsen
        await transporter.verify();

        return res.status(200).json({ success: true, message: 'Forbindelsen lykkedes!' });
    } catch (error) {
        console.error('SMTP Test Error:', error);
        return res.status(400).json({ 
            success: false, 
            error: `Kunne ikke forbinde til mailserveren: ${error.message}` 
        });
    }
}
