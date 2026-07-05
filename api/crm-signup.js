import { applyCors } from './_cors.js';
import { rateLimit } from './_ratelimit.js';
import { getAdminNewSignupTemplate } from '../src/utils/emailTemplates.js';

// Server-side signup-notifikation: sender admin-mailen + CRM-webhooken.
// Lå tidligere i browseren (Register.jsx) med en HARDKODET CRM-bearer-token i
// bundlen — enhver kunne læse den. Nu bor tokenet i CRM_WEBHOOK_TOKEN (server-env)
// og rammer aldrig klienten. Best-effort: fejl må ikke vælte selve oprettelsen.
export default async function handler(req, res) {
    if (applyCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Misbrugs-værn: max 20 signups per IP per time.
    const rl = await rateLimit(req, { limit: 20, windowSec: 3600, suffix: 'crm-signup' });
    if (!rl.ok) {
        if (rl.retryAfter) res.setHeader('Retry-After', String(rl.retryAfter));
        return res.status(429).json({ error: 'For mange forespørgsler. Prøv igen om lidt.' });
    }

    try {
        const { companyName, contactName, email, phone, product, price, cvr } = req.body || {};
        if (!companyName || !String(companyName).trim()) {
            return res.status(400).json({ error: 'Firmanavn mangler.' });
        }

        // 1) Admin-notifikation via Resend (system-afsender).
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: 'Bison Frame <info@bisonframe.dk>',
                        to: ['mbc@bisoncompany.dk'],
                        subject: `Ny Tømrer: ${companyName}`,
                        html: getAdminNewSignupTemplate(companyName, cvr || '', contactName || '', email || '', phone || ''),
                    }),
                });
            } catch (mailErr) {
                console.error('Admin-signup-notifikation fejlede:', mailErr);
            }
        }

        // 2) CRM-webhook — token fra server-env (aldrig i browseren).
        const crmToken = process.env.CRM_WEBHOOK_TOKEN;
        if (crmToken) {
            try {
                await fetch('https://www.bisoncrm.dk/api/webhooks/frame-signup', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${crmToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        companyName,
                        contactName: contactName || '',
                        email: email || '',
                        phone: phone || '',
                        product: product || 'Bison Frame',
                        price: price ?? null,
                    }),
                });
            } catch (hookErr) {
                console.error('CRM-webhook fejlede:', hookErr);
            }
        } else {
            console.warn('CRM_WEBHOOK_TOKEN ikke sat — CRM-webhook sprunget over.');
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('crm-signup fejl:', error);
        return res.status(500).json({ error: 'Kunne ikke behandle signup-notifikation.' });
    }
}
