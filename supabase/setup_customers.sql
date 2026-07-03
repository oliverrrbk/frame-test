-- ============================================================================
-- SQL Migration: Kunde-bibliotek (customers-tabel + kobling til leads)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- BAGGRUND:
--   Indtil nu fandtes der INGEN kunde-tabel. Al kundedata levede inline på hvert
--   `leads` (kolonnerne customer_name/email/phone/address + raw_data.customerDetails).
--   Samme kunde på 5 opgaver = 5 løsrevne kopier. Intet overblik, ingen genbrug.
--
-- LØSNING:
--   1. Ny tabel `customers` — ét rigtigt kundekort pr. firma (carpenter_id = firma-rod,
--      præcis som leads). Genbruges når man laver et nyt tilbud.
--   2. Ny kolonne `leads.customer_id` (nullable FK) → hvert tilbud/sag peger tilbage
--      på kunden. Overblik pr. kunde = alle leads med samme customer_id.
--   3. RLS: firma-afgrænset (samme mønster som leads). Man ser ALDRIG andre firmaers
--      kunder.
--   4. Backfill: opret kunder ud fra eksisterende leads (dedup pr. firma på
--      navn + telefon/mail) og kobl de gamle leads til dem, så biblioteket er fyldt
--      fra dag ét.
--
-- FIRMA-MODEL (samme som resten af systemet):
--   leads.carpenter_id = firma-roden (mesterens id). En carpenters-række har
--   `id` + `company_id` (= firma-roden). Ejeren har company_id = egen id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    carpenter_id  uuid NOT NULL REFERENCES public.carpenters(id) ON DELETE CASCADE,
    name          text NOT NULL,
    email         text,
    phone         text,
    address       text,
    zip           text,
    city          text,
    customer_type text NOT NULL DEFAULT 'privat',   -- 'privat' | 'erhverv'
    cvr           text,
    notes         text,
    logo_url      text,                              -- logo/billede pr. kunde (avatars-bucket)
    created_by    uuid,                              -- hvem oprettede kunden
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Idempotent for eksisterende installationer (tabellen fandtes før logo_url):
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS logo_url text;

CREATE INDEX IF NOT EXISTS idx_customers_carpenter ON public.customers(carpenter_id);
-- Hurtig søgning på navn pr. firma (biblioteket + kundevælger i tilbud)
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(carpenter_id, lower(name));

-- Hold updated_at frisk
CREATE OR REPLACE FUNCTION public.touch_customers_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.touch_customers_updated_at();

-- ----------------------------------------------------------------------------
-- 2) Kobling fra leads → customers
-- ----------------------------------------------------------------------------
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_customer ON public.leads(customer_id);

-- ----------------------------------------------------------------------------
-- 3) RLS — firma-afgrænset (samme mønster som leads)
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Hjælpe-udtryk: "denne kunde tilhører mit firma".
--   carpenter_id = auth.uid()  → jeg ER firma-roden (ejer)
--   ELLER jeg er ansat i firmaet (carpenters.company_id = customers.carpenter_id)
DROP POLICY IF EXISTS "Firma kan se egne kunder" ON public.customers;
CREATE POLICY "Firma kan se egne kunder"
ON public.customers FOR SELECT
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = customers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan oprette kunder" ON public.customers;
CREATE POLICY "Firma kan oprette kunder"
ON public.customers FOR INSERT
WITH CHECK (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = customers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan opdatere kunder" ON public.customers;
CREATE POLICY "Firma kan opdatere kunder"
ON public.customers FOR UPDATE
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = customers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan slette kunder" ON public.customers;
CREATE POLICY "Firma kan slette kunder"
ON public.customers FOR DELETE
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = customers.carpenter_id
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

-- ----------------------------------------------------------------------------
-- 4) Backfill — opret kunder ud fra eksisterende leads + kobl dem
--    (Idempotent: kører kun på leads uden customer_id, og springer navne over
--     der allerede har et matchende kundekort.)
-- ----------------------------------------------------------------------------

-- 4a) Uddrag alle kunde-oplysninger fra leads + byg en dedup-nøgle pr. firma.
WITH src AS (
    SELECT
        l.carpenter_id,
        NULLIF(TRIM(l.customer_name), '')                                         AS name,
        NULLIF(TRIM(l.customer_email), '')                                        AS email,
        NULLIF(TRIM(l.customer_phone), '')                                        AS phone,
        COALESCE(
            NULLIF(TRIM(l.raw_data->'customerDetails'->>'street'), ''),
            NULLIF(TRIM(l.customer_address), '')
        )                                                                         AS address,
        NULLIF(TRIM(l.raw_data->'customerDetails'->>'zip'), '')                   AS zip,
        NULLIF(TRIM(l.raw_data->'customerDetails'->>'city'), '')                  AS city,
        COALESCE(NULLIF(TRIM(l.raw_data->'customerDetails'->>'customerType'), ''), 'privat') AS customer_type,
        NULLIF(TRIM(l.raw_data->'customerDetails'->>'cvr'), '')                   AS cvr,
        l.created_at
    FROM leads l
    WHERE l.carpenter_id IS NOT NULL
      AND l.customer_id IS NULL
      AND NULLIF(TRIM(l.customer_name), '') IS NOT NULL
),
keyed AS (
    SELECT *,
        lower(name)                        AS name_key,
        COALESCE(phone, lower(email), '')  AS contact_key
    FROM src
),
-- Én kunde pr. (firma, navn, telefon/mail) — behold ældste (rigeste historik).
uniq AS (
    SELECT DISTINCT ON (carpenter_id, name_key, contact_key)
        carpenter_id, name, email, phone, address, zip, city, customer_type, cvr, created_at,
        name_key, contact_key
    FROM keyed
    ORDER BY carpenter_id, name_key, contact_key, created_at ASC
)
INSERT INTO customers (carpenter_id, name, email, phone, address, zip, city, customer_type, cvr, created_at)
SELECT u.carpenter_id, u.name, u.email, u.phone, u.address, u.zip, u.city, u.customer_type, u.cvr, u.created_at
FROM uniq u
-- Undgå dubletter hvis scriptet køres igen.
WHERE NOT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.carpenter_id = u.carpenter_id
      AND lower(c.name) = u.name_key
      AND COALESCE(c.phone, lower(c.email), '') = u.contact_key
);

-- 4b) Kobl de gamle leads til deres nye kundekort (samme dedup-nøgle).
UPDATE leads l
SET customer_id = c.id
FROM customers c
WHERE l.customer_id IS NULL
  AND l.carpenter_id = c.carpenter_id
  AND lower(TRIM(l.customer_name)) = lower(c.name)
  AND COALESCE(
        NULLIF(TRIM(l.customer_phone), ''),
        lower(NULLIF(TRIM(l.customer_email), '')),
        ''
      ) = COALESCE(c.phone, lower(c.email), '');

COMMENT ON TABLE public.customers IS
'Kunde-bibliotek: ét kundekort pr. firma (carpenter_id = firma-rod). Genbruges ved nye tilbud (leads.customer_id). RLS er firma-afgrænset som leads.';
