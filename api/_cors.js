// Fælles CORS-allowlist for alle /api/* endpoints.
// Producerer Vercel-kompatible response-headers og afviser ukendte origins.

const ALLOWED_ORIGINS = new Set([
    'https://bisonframe.dk',
    'https://www.bisonframe.dk',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
]);

// Tillad alle vercel preview-deployments (*.vercel.app) for samme projekt
function isAllowedOrigin(origin) {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.has(origin)) return true;
    try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.vercel.app')) return true;
    } catch {
        return false;
    }
    return false;
}

export function applyCors(req, res) {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-client-info, apikey');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true; // signal: caller should return
    }
    return false;
}
