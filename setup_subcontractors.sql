-- UNDERLEVERANDØRER (Eksterne partnere / kontakter UDEN login)
-- Kopiér dette script og kør det i Supabase -> SQL Editor.
-- Helt additivt: rører ingen eksisterende tabeller (carpenters, leads m.m.).

-- 1. Tabel
CREATE TABLE IF NOT EXISTS subcontractors (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL,            -- Peger på Mesterens (firmaets) ID, samme scoping som carpenters
    company_name TEXT NOT NULL,            -- Underleverandørens firmanavn
    trade        TEXT,                     -- Fag (Elektriker, VVS, Maler, ...)
    contact_name TEXT,                     -- Mester / fast kontaktperson
    contact_phone TEXT,
    contact_email TEXT,
    cvr          TEXT,
    address      TEXT,                     -- Firmaadresse: vej og nr.
    zip          TEXT,                     -- Postnr.
    city         TEXT,                     -- By
    workers      JSONB DEFAULT '[]'::jsonb, -- Svende/lærlinge (navn, telefon, rolle, e-mail)
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subcontractors_company_id ON subcontractors(company_id);

-- Tilføj kolonner på eksisterende tabeller (idempotent — sikkert at køre igen).
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS workers JSONB DEFAULT '[]'::jsonb;

-- 2. Row Level Security
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firmaet kan se egne underleverandører" ON subcontractors;
DROP POLICY IF EXISTS "Firmaet kan oprette underleverandører" ON subcontractors;
DROP POLICY IF EXISTS "Firmaet kan opdatere egne underleverandører" ON subcontractors;
DROP POLICY IF EXISTS "Firmaet kan slette egne underleverandører" ON subcontractors;

-- En bruger må se/redigere underleverandører der hører til hans eget firma.
-- (coalesce(c.company_id, c.id) = firmaets ID, ligesom resten af systemet)
CREATE POLICY "Firmaet kan se egne underleverandører"
ON subcontractors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = subcontractors.company_id
  )
);

CREATE POLICY "Firmaet kan oprette underleverandører"
ON subcontractors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = subcontractors.company_id
  )
);

CREATE POLICY "Firmaet kan opdatere egne underleverandører"
ON subcontractors FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = subcontractors.company_id
  )
);

CREATE POLICY "Firmaet kan slette egne underleverandører"
ON subcontractors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = subcontractors.company_id
  )
);
