// Letvægts rate-limiter via Upstash Redis REST API.
// Ingen ekstra dependency — kun fetch.
//
// Konfiguration via env vars (Vercel):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Hvis env vars mangler, no-op'er limiteren (returnerer { ok: true })
// så systemet ikke blokeres før Upstash er sat op.

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function getClientKey(req, suffix) {
    const fwd = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(fwd) ? fwd[0] : (fwd?.split(',')[0]?.trim())) || req.socket?.remoteAddress || 'unknown';
    return `rl:${suffix}:${ip}`;
}

/**
 * Sliding window rate limit via Redis INCR + EXPIRE.
 * @param {object} req - Vercel request
 * @param {object} opts - { limit, windowSec, suffix }
 * @returns {Promise<{ok: boolean, remaining: number, retryAfter?: number}>}
 */
export async function rateLimit(req, { limit, windowSec, suffix }) {
    if (!URL || !TOKEN) return { ok: true, remaining: limit };

    const key = getClientKey(req, suffix);

    try {
        // Pipeline: INCR + EXPIRE (kun hvis ny key)
        const res = await fetch(`${URL}/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([
                ['INCR', key],
                ['EXPIRE', key, String(windowSec), 'NX']
            ])
        });

        if (!res.ok) {
            console.warn('Rate limit Redis fejl:', res.status);
            return { ok: true, remaining: limit };
        }
        const data = await res.json();
        const count = Array.isArray(data) ? Number(data[0]?.result) : 0;

        if (!Number.isFinite(count)) return { ok: true, remaining: limit };

        if (count > limit) {
            return { ok: false, remaining: 0, retryAfter: windowSec };
        }
        return { ok: true, remaining: Math.max(0, limit - count) };
    } catch (err) {
        console.warn('Rate limit fejlede stille:', err.message);
        return { ok: true, remaining: limit };
    }
}
