-- LØN-INDSTILLINGER & LÅSNING AF LØNPERIODER
-- Kopiér dette script og kør det i Supabase -> SQL Editor.
-- Helt additivt: rører ingen eksisterende tabeller.
--
-- Én række pr. firma. Indeholder lønperiode-cyklus + hvor langt timerne er låst
-- (locked_until = alle registreringer til og med denne dato er fastlåst efter lønkørsel).

CREATE TABLE IF NOT EXISTS payroll_settings (
    company_id    UUID PRIMARY KEY,                 -- Firmaets (Mesterens) ID
    cycle         TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly' eller 'biweekly'
    anchor        DATE,                             -- Startdato for 14-dages-cyklus
    locked_until  DATE,                             -- Timer til og med denne dato er låst
    log           JSONB DEFAULT '[]'::jsonb,        -- Historik over låsninger/genåbninger
    updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firmaet kan se sine løn-indstillinger" ON payroll_settings;
DROP POLICY IF EXISTS "Mester/bogholder kan oprette løn-indstillinger" ON payroll_settings;
DROP POLICY IF EXISTS "Mester/bogholder kan opdatere løn-indstillinger" ON payroll_settings;

-- Alle i firmaet må SE låsen (så svende kan se at perioden er lønkørt) — fuld transparens.
CREATE POLICY "Firmaet kan se sine løn-indstillinger"
ON payroll_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = payroll_settings.company_id
  )
);

-- Kun Mester og Bogholder må køre/låse/genåbne løn.
CREATE POLICY "Mester/bogholder kan oprette løn-indstillinger"
ON payroll_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = payroll_settings.company_id
    AND c.role IN ('admin', 'accountant')
  )
);

CREATE POLICY "Mester/bogholder kan opdatere løn-indstillinger"
ON payroll_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = payroll_settings.company_id
    AND c.role IN ('admin', 'accountant')
  )
);
