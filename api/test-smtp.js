import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

function guessImapHost(smtpHost) {
    if (!smtpHost) return null;
    const host = smtpHost.toLowerCase().trim();
    if (host.includes('dandomain')) return 'post.dandomain.dk';
    if (host.includes('simply.com')) return 'imap.simply.com';
    if (host.includes('office365') || host.includes('outlook')) return 'outlook.office365.com';
    if (host.includes('gmail') || host.includes('googlemail') || host.includes('google')) return 'imap.gmail.com';
    if (host.includes('one.com')) return 'imap.one.com';
    if (host.includes('smtp')) return host.replace('smtp', 'imap');
    return host;
}

/**
 * Blødt IMAP-tjek: forsøger at logge ind og finde en Sendt-mappe.
 * Fejler ALDRIG hele testen — returnerer kun en status-besked.
 */
async function testImapConnection({ imap_host, smtp_host, smtp_user, smtp_pass }) {
    const host = (imap_host || '').trim() || guessImapHost(smtp_host);
    if (!host) return { ok: false, message: 'Ingen IMAP-server angivet — kopi i "Sendt Post" springes over.' };

    const client = new ImapFlow({
        host,
        port: 993,
        secure: true,
        auth: { user: smtp_user, pass: smtp_pass },
        logger: false,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        const mailboxes = await client.list();
        const hasSent = mailboxes.some(mb =>
            mb.specialUse === '\\Sent' || /sent|sendt|gesendt/i.test(mb.name || '')
        );
        return hasSent
            ? { ok: true, message: `IMAP forbundet (${host}) — tilbud gemmes i "Sendt Post".` }
            : { ok: false, message: `IMAP forbundet (${host}), men ingen "Sendt"-mappe blev fundet.` };
    } catch (err) {
        return { ok: false, message: `IMAP-forbindelse fejlede (${host}): ${err.message}` };
    } finally {
        try { await client.logout(); } catch { /* ignorér */ }
    }
}

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

        const { smtp_host, smtp_port, smtp_user, smtp_pass, imap_host } = req.body;

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

        // Test SMTP-forbindelsen (skal lykkes)
        await transporter.verify();

        // Blødt IMAP-tjek (må ikke vælte SMTP-resultatet)
        let imapStatus = null;
        try {
            imapStatus = await Promise.race([
                testImapConnection({ imap_host, smtp_host, smtp_user, smtp_pass }),
                new Promise((resolve) => setTimeout(
                    () => resolve({ ok: false, message: 'IMAP-test timede ud.' }),
                    12000
                )),
            ]);
        } catch (e) {
            imapStatus = { ok: false, message: `IMAP-test fejlede: ${e.message}` };
        }

        const message = imapStatus?.ok
            ? `Forbindelsen lykkedes! ${imapStatus.message}`
            : `SMTP-forbindelsen lykkedes! ${imapStatus ? `(${imapStatus.message})` : ''}`;

        return res.status(200).json({ success: true, message, imap: imapStatus });
    } catch (error) {
        console.error('SMTP Test Error:', error);
        return res.status(400).json({ 
            success: false, 
            error: `Kunne ikke forbinde til mailserveren: ${error.message}` 
        });
    }
}
