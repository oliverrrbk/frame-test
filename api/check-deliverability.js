import { createClient } from '@supabase/supabase-js';
import { promises as dns } from 'dns';

/**
 * Tjekker om afsender-domænets DNS er sat op til god mail-leverbarhed:
 *  - SPF   (TXT på roden, "v=spf1 ...")      → godkender hvem der må sende
 *  - DMARC (TXT på _dmarc.<domæne>, "v=DMARC1") → politik der binder SPF/DKIM sammen
 *  - MX    (findes der overhovedet en mailserver på domænet)
 *
 * DKIM kan IKKE tjekkes pålideligt uden at kende udbyderens selector, og signeres
 * normalt automatisk af mailudbyderen — derfor rapporterer vi det som "udbyder-styret"
 * i stedet for at risikere en falsk fejl.
 *
 * Ingen hemmeligheder involveret — kun offentlige DNS-opslag. Kræver dog login,
 * så endpointet ikke bliver en åben DNS-proxy.
 */

// Kendte udbydere → den SPF-include de kræver (bruges i forslaget til brugeren).
function spfIncludeFor(smtpHost) {
    const h = String(smtpHost || '').toLowerCase();
    if (/gmail|google/.test(h)) return 'include:_spf.google.com';
    if (/office365|outlook/.test(h)) return 'include:spf.protection.outlook.com';
    if (/one\.com/.test(h)) return 'include:_spf.one.com';
    if (/simply\.com/.test(h)) return 'include:_spf.simply.com';
    if (/dandomain/.test(h)) return 'include:_spf.dandomain.dk';
    return 'include:<din-udbyders-spf>';
}

async function resolveTxtJoined(name) {
    // resolveTxt returnerer string[][] (hvert record kan være delt i bidder) → saml dem.
    const records = await dns.resolveTxt(name);
    return records.map(chunks => chunks.join(''));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Kræv login (som /api/test-smtp) — ikke en åben DNS-proxy.
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Uautoriseret: Ingen adgangsgivende token' });
        }
        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Uautoriseret: Ugyldigt token' });
        }

        const { email, smtp_host } = req.body || {};
        const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
        if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
            return res.status(400).json({ error: 'Ugyldig afsender-e-mail' });
        }

        const checks = {};

        // --- SPF (TXT på roden) ---
        try {
            const txts = await resolveTxtJoined(domain);
            const spf = txts.find(t => /^v=spf1\b/i.test(t.trim()));
            checks.spf = spf
                ? { status: 'pass', message: 'SPF er sat op.', record: spf }
                : {
                    status: 'fail',
                    message: 'Ingen SPF-record fundet. Uden den bliver dine mails ofte markeret som spam.',
                    suggestion: `v=spf1 ${spfIncludeFor(smtp_host)} ~all`,
                };
        } catch (e) {
            checks.spf = (e.code === 'ENODATA' || e.code === 'ENOTFOUND')
                ? {
                    status: 'fail',
                    message: 'Ingen SPF-record fundet. Uden den bliver dine mails ofte markeret som spam.',
                    suggestion: `v=spf1 ${spfIncludeFor(smtp_host)} ~all`,
                }
                : { status: 'unknown', message: `Kunne ikke slå SPF op (${e.code || e.message}).` };
        }

        // --- DMARC (TXT på _dmarc.<domæne>) ---
        try {
            const txts = await resolveTxtJoined(`_dmarc.${domain}`);
            const dmarc = txts.find(t => /^v=dmarc1\b/i.test(t.trim()));
            checks.dmarc = dmarc
                ? { status: 'pass', message: 'DMARC er sat op.', record: dmarc }
                : {
                    status: 'warn',
                    message: 'Ingen DMARC-record. Anbefales stærkt — den forbedrer leverbarhed markant.',
                    suggestion: `v=DMARC1; p=none; rua=mailto:${email}`,
                };
        } catch (e) {
            checks.dmarc = (e.code === 'ENODATA' || e.code === 'ENOTFOUND')
                ? {
                    status: 'warn',
                    message: 'Ingen DMARC-record. Anbefales stærkt — den forbedrer leverbarhed markant.',
                    suggestion: `v=DMARC1; p=none; rua=mailto:${email}`,
                }
                : { status: 'unknown', message: `Kunne ikke slå DMARC op (${e.code || e.message}).` };
        }

        // --- MX (findes der en mailserver?) ---
        try {
            const mx = await dns.resolveMx(domain);
            checks.mx = (Array.isArray(mx) && mx.length > 0)
                ? { status: 'pass', message: 'Domænet har en mailserver (MX).' }
                : { status: 'warn', message: 'Ingen MX-record fundet på domænet.' };
        } catch (e) {
            checks.mx = { status: 'warn', message: `Kunne ikke slå MX op (${e.code || e.message}).` };
        }

        // DKIM: udbyder-styret, kan ikke tjekkes uden selector — vis som info.
        checks.dkim = {
            status: 'info',
            message: 'DKIM signeres normalt automatisk af din mailudbyder. Er SPF og DMARC grønne, er du i god form.',
        };

        // Samlet dom: rød hvis SPF fejler, gul hvis DMARC mangler, ellers grøn.
        let overall = 'pass';
        if (checks.spf.status === 'fail') overall = 'fail';
        else if (checks.dmarc.status === 'warn' || checks.mx.status === 'warn') overall = 'warn';

        return res.status(200).json({ success: true, domain, overall, checks });
    } catch (error) {
        console.error('Deliverability check error:', error);
        return res.status(500).json({ error: 'Kunne ikke tjekke leverbarhed. Prøv igen senere.' });
    }
}
