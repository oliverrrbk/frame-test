// Fælles CORS-allowlist for Supabase Edge Functions.
// Returnerer headers der ekko'er origin tilbage hvis den er på allowlisten.

const ALLOWED_HOSTS = new Set([
    'bisonframe.dk',
    'www.bisonframe.dk',
    'localhost'
]);

function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    try {
        const url = new URL(origin);
        if (ALLOWED_HOSTS.has(url.hostname)) return true;
        if (url.hostname.endsWith('.vercel.app')) return true;
    } catch {
        return false;
    }
    return false;
}

export function corsHeadersFor(req: Request): Record<string, string> {
    const origin = req.headers.get('Origin');
    if (isAllowedOrigin(origin)) {
        return {
            'Access-Control-Allow-Origin': origin!,
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Vary': 'Origin'
        };
    }
    return {};
}

export function handlePreflight(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeadersFor(req) });
    }
    return null;
}
