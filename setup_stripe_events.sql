-- Idempotens-tabel til Stripe-webhook. Stripe retry'er events ved 5xx-svar,
-- så vi gemmer event_id og dropper duplikater stille.
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    received_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-oprydning: behold kun 30 dages historik (kør evt. som pg_cron job)
-- DELETE FROM stripe_events WHERE received_at < now() - interval '30 days';
