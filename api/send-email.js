import { applyCors } from './_cors.js';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

/**
 * Gætter IMAP-hosten ud fra SMTP-hosten, hvis brugeren ikke selv har angivet én.
 */
function guessImapHost(smtpHost) {
    if (!smtpHost) return null;
    const host = smtpHost.toLowerCase().trim();

    if (host.includes('dandomain')) return 'post.dandomain.dk';
    if (host.includes('simply.com')) return 'imap.simply.com';
    if (host.includes('office365') || host.includes('outlook')) return 'outlook.office365.com';
    if (host.includes('gmail') || host.includes('googlemail') || host.includes('google')) return 'imap.gmail.com';
    if (host.includes('one.com')) return 'imap.one.com';
    // Generisk: byt 'smtp' ud med 'imap' (fx smtp.minhost.dk -> imap.minhost.dk)
    if (host.includes('smtp')) return host.replace('smtp', 'imap');

    return host;
}

/**
 * Bygger den rå RFC822-besked (MIME) fra mailOptions uden faktisk at sende.
 * Bruger Nodemailers streamTransport, så vi får præcis samme indhold som den
 * afsendte mail. newline: 'windows' giver CRLF, hvilket IMAP APPEND kræver.
 */
async function buildRawMessage(mailOptions) {
    const builder = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: 'windows',
    });
    const built = await builder.sendMail(mailOptions);
    return built.message; // Buffer med fuld RFC822-besked
}

/**
 * Lægger en kopi af mailen i brugerens "Sendt post"-mappe via IMAP APPEND.
 * Returnerer { ok, reason?, folder? } og kaster aldrig — kalderen håndterer fejl blødt.
 */
async function saveToSentFolder({ smtpSettings, rawMessage }) {
    const imapHost = (smtpSettings.imap_host || '').trim() || guessImapHost(smtpSettings.smtp_host);
    if (!imapHost) return { ok: false, reason: 'Ingen IMAP-host kunne bestemmes' };

    const client = new ImapFlow({
        host: imapHost,
        port: 993,
        secure: true,
        auth: {
            user: smtpSettings.smtp_user,
            pass: smtpSettings.smtp_pass,
        },
        logger: false,
        // Korte timeouts så en hængende IMAP-server ikke holder serverless-funktionen i live
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        // Find "Sendt post"-mappen
        const mailboxes = await client.list();
        const sentNames = [
            'sent', 'sendt', 'sendt post', 'sent items', 'sent mail',
            'sendte beskeder', 'sendte', 'gesendt', 'sent messages',
        ];

        let sentPath = null;

        // 1) Mest pålideligt: IMAP special-use flaget \Sent (uafhængigt af sprog)
        for (const mb of mailboxes) {
            if (mb.specialUse === '\\Sent') { sentPath = mb.path; break; }
        }
        // 2) Eksakt navne-match
        if (!sentPath) {
            for (const mb of mailboxes) {
                const name = (mb.name || '').toLowerCase().trim();
                if (sentNames.includes(name)) { sentPath = mb.path; break; }
            }
        }
        // 3) Sidste forsøg: delvist match
        if (!sentPath) {
            const partial = mailboxes.find(mb => /sent|sendt|gesendt/i.test(mb.name || ''));
            if (partial) sentPath = partial.path;
        }

        if (!sentPath) return { ok: false, reason: 'Sendt-mappe blev ikke fundet' };

        await client.append(sentPath, rawMessage, ['\\Seen']);
        return { ok: true, folder: sentPath };
    } finally {
        try { await client.logout(); } catch { /* ignorér oprydningsfejl */ }
    }
}

export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html, fromName, replyTo, attachments, quoteToken } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Misbrugs-værn: begræns størrelser
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof to !== 'string' || !emailRegex.test(to)) {
            return res.status(400).json({ error: 'Ugyldig modtager-adresse' });
        }
        if (typeof subject !== 'string' || subject.length > 250) {
            return res.status(400).json({ error: 'Ugyldigt emne' });
        }
        if (typeof html !== 'string' || html.length > 200_000) {
            return res.status(400).json({ error: 'Indhold er for stort' });
        }
        if (replyTo && (typeof replyTo !== 'string' || !emailRegex.test(replyTo))) {
            return res.status(400).json({ error: 'Ugyldig reply-to adresse' });
        }

        let validAttachments;
        if (attachments != null) {
            if (!Array.isArray(attachments) || attachments.length > 5) {
                return res.status(400).json({ error: 'Ugyldige vedhæftninger' });
            }
            let totalSize = 0;
            for (const att of attachments) {
                if (!att || typeof att.filename !== 'string' || typeof att.content !== 'string') {
                    return res.status(400).json({ error: 'Ugyldig vedhæftning' });
                }
                totalSize += att.content.length;
            }
            if (totalSize > 8_000_000) {
                return res.status(400).json({ error: 'Vedhæftninger er for store' });
            }
            validAttachments = attachments.map(att => ({ filename: att.filename, content: att.content }));
        }

        // Tjek for SMTP credentials
        let smtpSettings = null;
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        try {
            const authHeader = req.headers.authorization;
            let targetCarpenterId = null;

            if (authHeader) {
                // Afsenderen er logget ind som tømrer
                const token = authHeader.replace('Bearer ', '');
                const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
                const { data: { user } } = await supabaseAnon.auth.getUser(token);
                if (user) {
                    targetCarpenterId = user.id;
                }
            } else if (quoteToken) {
                // Afsenderen er en kunde der godkender et tilbud (via quote_token)
                const { data: leadData } = await supabaseAdmin
                    .from('leads')
                    .select('carpenter_id')
                    .eq('quote_token', quoteToken)
                    .single();
                
                if (leadData?.carpenter_id) {
                    targetCarpenterId = leadData.carpenter_id;
                }
            }

            if (targetCarpenterId) {
                const { data: secrets } = await supabaseAdmin
                    .from('carpenter_secrets')
                    .select('smtp_settings')
                    .eq('carpenter_id', targetCarpenterId)
                    .single();

                if (secrets?.smtp_settings?.smtp_host && secrets?.smtp_settings?.smtp_user) {
                    smtpSettings = secrets.smtp_settings;
                }
            }
        } catch (e) {
            console.error('Fejl ved opslag af SMTP indstillinger:', e);
            // Forsæt med Resend fallback
        }

        const senderName = fromName ? `${fromName} <info@bisonframe.dk>` : 'Bison Frame <info@bisonframe.dk>';

        // 1. Send via Egen SMTP hvis aktiveret
        if (smtpSettings) {
            const transporter = nodemailer.createTransport({
                host: smtpSettings.smtp_host,
                port: parseInt(smtpSettings.smtp_port),
                secure: parseInt(smtpSettings.smtp_port) === 465,
                auth: {
                    user: smtpSettings.smtp_user,
                    pass: smtpSettings.smtp_pass,
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const customFrom = smtpSettings.smtp_from_email || smtpSettings.smtp_user;
            const customSenderName = fromName ? `"${fromName}" <${customFrom}>` : customFrom;

            const mailOptions = {
                from: customSenderName,
                to: to,
                subject: subject,
                html: html,
                replyTo: replyTo || undefined,
            };

            if (validAttachments && validAttachments.length > 0) {
                mailOptions.attachments = validAttachments.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    encoding: 'base64'
                }));
            }

            const info = await transporter.sendMail(mailOptions);

            // Læg en kopi i brugerens "Sendt post"-mappe via IMAP.
            // Dette må ALDRIG vælte selve afsendelsen — kunden skal have succes-svar,
            // selv hvis IMAP-uploadet timer ud eller fejler.
            try {
                const rawMessage = await buildRawMessage(mailOptions);
                const result = await Promise.race([
                    saveToSentFolder({ smtpSettings, rawMessage }),
                    new Promise((resolve) => setTimeout(
                        () => resolve({ ok: false, reason: 'IMAP timeout' }),
                        12000
                    )),
                ]);
                if (!result.ok) {
                    console.warn('IMAP Sendt-kopi sprunget over:', result.reason);
                }
            } catch (imapError) {
                console.error('IMAP Append fejlede (mailen er stadig sendt korrekt):', imapError);
            }

            return res.status(200).json({ success: true, data: info, provider: 'smtp' });
        }

        // 2. Fallback: Send via Resend (Bison Frame System)
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            return res.status(500).json({ error: 'Server mangler både SMTP og RESEND_API_KEY' });
        }
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: senderName,
                to: [to],
                subject: subject,
                html: html,
                ...(replyTo && { reply_to: replyTo }),
                ...(validAttachments && validAttachments.length > 0 && { attachments: validAttachments })
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Fejl fra Resend');
        }

        return res.status(200).json({ success: true, data, provider: 'resend' });
    } catch (error) {
        console.error('Email sending error:', error);
        return res.status(500).json({ error: error.message });
    }
}
