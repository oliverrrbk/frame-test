-- ============================================================================
-- Revisionsspor + dobbelt-spærre for automatisk bogføring af Stripe-indtægter.
-- ============================================================================
-- stripe-webhook opretter én række HER pr. betalt Stripe-faktura, FØR den
-- forsøger at oprette kladde-bilaget i Bisons e-conomic. Primærnøglen er
-- Stripe-faktura-id'et, så hvis samme betaling rammer os to gange (Stripe
-- retry + flere event-typer), fejler den anden insert (23505) og vi bogfører
-- ALDRIG samme indtægt to gange.
--
-- Kolonnen 'status' fortæller om bogføringen lykkedes:
--   'pending' → kladde forsøges oprettet
--   'booked'  → kladde-bilag oprettet i e-conomic (voucher_number sat)
--   'error'   → noget fejlede (se error) — kan bogføres manuelt/genkøres
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_bookings (
    stripe_invoice_id TEXT PRIMARY KEY,   -- Stripe-fakturaens id (idempotens-nøgle)
    stripe_number     TEXT,               -- Stripe-fakturanummer (menneskeligt)
    customer_id       TEXT,               -- Stripe customer id
    carpenter_id      UUID,               -- hvilken tømrer betalte (hvis kendt)
    gross             NUMERIC,            -- bruttobeløb (inkl. moms)
    vat               NUMERIC,            -- salgsmoms
    fee               NUMERIC,            -- Stripe-gebyr (udgift)
    currency          TEXT,
    voucher_number    TEXT,               -- e-conomic bilagsnummer når bogført
    accounting_year   TEXT,
    status            TEXT DEFAULT 'pending',
    error             TEXT,
    booked_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- SIKKERHED: lås tabellen. Webhooken bruger service_role (omgår RLS). Uden RLS
-- ville tabellen kunne læses/skrives via anon-nøglen. RLS uden politikker =
-- kun service_role har adgang.
ALTER TABLE stripe_bookings ENABLE ROW LEVEL SECURITY;

-- ROLLBACK: DROP TABLE IF EXISTS stripe_bookings;
