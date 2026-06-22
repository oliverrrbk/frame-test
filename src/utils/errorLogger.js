// In-house fejl-opsamling. Skriver app-fejl til error_logs i Supabase, så
// superadmin kan se dem i admin-dashboardet.
//
// Skudsikker: kaster ALDRIG selv, throttler dubletter (så en fejl-løkke ikke
// spammer databasen), og logger aldrig fejl forårsaget af loggeren selv.
import { supabase } from '../supabaseClient';

const WINDOW_MS = 60000;            // samme besked logges højst én gang pr. minut
const recent = new Map();           // beskednøgle -> sidste tidspunkt
let isLogging = false;              // forhindrer selv-løkke under skrivning

export async function logError({ message, stack, source } = {}) {
    try {
        if (isLogging) return;
        const msg = String(message || '').trim().slice(0, 500);
        if (!msg) return;

        const now = Date.now();
        const key = msg.slice(0, 140);
        const last = recent.get(key);
        if (last && now - last < WINDOW_MS) return; // throttle dubletter
        recent.set(key, now);
        if (recent.size > 200) {
            for (const [k, t] of recent) if (now - t > WINDOW_MS) recent.delete(k);
        }

        isLogging = true;

        let user = null;
        try { user = (await supabase.auth.getUser()).data?.user || null; } catch { /* ignore */ }
        // Log kun for indloggede brugere (RLS tillader kun authenticated insert).
        if (!user) return;

        const path = source || (typeof location !== 'undefined' ? location.pathname : '');
        await supabase.from('error_logs').insert({
            message: msg,
            stack: String(stack || '').slice(0, 4000),
            source_url: String(path || '').slice(0, 300),
            user_id: user.id || null,
            user_email: user.email || null,
            user_agent: (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 300),
        });
    } catch {
        // Loggeren må aldrig forstyrre appen.
    } finally {
        isLogging = false;
    }
}

// Globale lyttere — fanger fejl der ikke fanges af React's ErrorBoundary
// (async-fejl, afviste promises, netværk osv.). Installeres én gang.
export function installGlobalErrorLogging() {
    if (typeof window === 'undefined' || window.__bfErrorLogInstalled) return;
    window.__bfErrorLogInstalled = true;

    window.addEventListener('error', (e) => {
        logError({
            message: e?.message || e?.error?.message || 'Uventet fejl',
            stack: e?.error?.stack,
            source: typeof location !== 'undefined' ? location.pathname : '',
        });
    });

    window.addEventListener('unhandledrejection', (e) => {
        const r = e?.reason;
        logError({
            message: (r && r.message) || String(r || 'Afvist promise'),
            stack: r && r.stack,
            source: typeof location !== 'undefined' ? location.pathname : '',
        });
    });
}
