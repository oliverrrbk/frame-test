import { createClient } from '@supabase/supabase-js';

// ============================================================================
// /api/trial-nudges  (kører dagligt via Vercel Cron — se vercel.json)
// Finder prøve-konti UDEN betalingskort der er ældre end 3 dage og endnu ikke
// påmindet. Sender en venlig mail til kunden + en notifikation til teamet, så
// Mads kan ringe. Markerer dem som påmindet (raw_data.trial_nudge_sent_at), så
// ingen spammes. Idempotent og sikker at kalde gentagne gange.
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const TEAM_EMAIL = 'team@bisoncompany.dk';
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

async function sendEmail(to, subject, html) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return false;
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'Bison Frame <info@bisonframe.dk>', to: [to], subject, html }),
        });
        return r.ok;
    } catch {
        return false;
    }
}

const userNudgeHtml = (firstName) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 0;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="background:#0f172a;padding:24px 32px;color:#fff;font-size:18px;font-weight:700;">Bison Frame</div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">Hej ${firstName},</h2>
        <p style="color:#334155;line-height:1.6;margin:0 0 8px;">I er godt i gang i jeres prøveperiode — dejligt at have jer med! 🛠️</p>
        <p style="color:#334155;line-height:1.6;margin:0 0 24px;">For at I ikke mister adgang når prøveperioden slutter, mangler I bare at tilknytte et betalingskort. Det tager under et minut, og I bliver <strong>ikke</strong> trukket før prøveperioden er ovre.</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="https://bisonframe.dk/dashboard?activeTab=account_settings" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;">Tilknyt betalingskort</a>
        </div>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Har I spørgsmål, eller er der noget der driller? Ring til os på <a href="tel:+4540265002" style="color:#2563eb;font-weight:700;text-decoration:none;">40 26 50 02</a> — vi hjælper gerne.</p>
      </div>
    </div>
  </div>`;

const teamNudgeHtml = (company, email, days) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:28px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
      <div style="background:#0f172a;padding:18px 24px;color:#fff;font-weight:700;">Trial uden kort — ring til dem</div>
      <div style="padding:24px;color:#334155;">
        <p style="margin:0 0 12px;"><strong>${company || '—'}</strong> har været i prøveperiode i <strong>${days} dage</strong> uden at tilknytte kort.</p>
        <p style="margin:0;color:#64748b;font-size:14px;">E-mail: <strong style="color:#0f172a;">${email}</strong><br/>Der er netop sendt dem en venlig påmindelse.</p>
      </div>
    </div>
  </div>`;

export default async function handler(req, res) {
    // Sikkerhed: hvis CRON_SECRET er sat, kræv den (Vercel Cron sender den automatisk).
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Mangler Supabase-konfiguration' });

    const supabase = createClient(supabaseUrl, serviceKey);

    // Prøve-EJERE (company_id = null) uden betalingskort.
    const { data, error } = await supabase
        .from('carpenters')
        .select('id, owner_name, company_name, email, created_at, raw_data, subscription_status, payment_customer_id, company_id')
        .eq('subscription_status', 'trialing')
        .is('company_id', null)
        .is('payment_customer_id', null);

    if (error) return res.status(500).json({ error: error.message });

    const now = Date.now();
    const candidates = (data || [])
        .filter(c => c.email)
        .filter(c => !c.raw_data?.trial_nudge_sent_at)                       // ikke allerede påmindet
        .filter(c => c.created_at && (now - new Date(c.created_at).getTime()) >= THREE_DAYS)
        .slice(0, 50);                                                       // loft pr. kørsel

    let emailsSent = 0;
    for (const c of candidates) {
        const firstName = (c.owner_name || '').split(' ')[0] || 'der';
        const days = Math.floor((now - new Date(c.created_at).getTime()) / (24 * 60 * 60 * 1000));
        const okUser = await sendEmail(c.email, 'Kom godt videre med Bison Frame', userNudgeHtml(firstName));
        await sendEmail(TEAM_EMAIL, `Trial uden kort: ${c.company_name || c.email} (${days} dage)`, teamNudgeHtml(c.company_name, c.email, days));
        await supabase.from('carpenters')
            .update({ raw_data: { ...(c.raw_data || {}), trial_nudge_sent_at: new Date().toISOString() } })
            .eq('id', c.id);
        if (okUser) emailsSent++;
    }

    return res.status(200).json({ success: true, scanned: (data || []).length, nudged: candidates.length, emailsSent });
}
