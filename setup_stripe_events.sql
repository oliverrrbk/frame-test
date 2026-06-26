-- Idempotens-tabel til Stripe-webhook. Stripe retry'er events ved 5xx-svar,
-- så vi gemmer event_id og dropper duplikater stille.
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    received_at TIMESTAMPTZ DEFAULT now()
);

-- SIKKERHED: lås tabellen. Webhooken bruger service_role (omgår RLS), så den
-- påvirkes ikke — men uden RLS ville tabellen være læs/skriv-bar via anon-nøglen
-- (idempotens-bypass/replay). RLS uden politikker = kun service_role har adgang.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Auto-oprydning: behold kun 30 dages historik (kør evt. som pg_cron job)
-- DELETE FROM stripe_events WHERE received_at < now() - interval '30 days';
