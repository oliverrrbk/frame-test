-- SIKKERHEDS SCRIPT TIL SUPABASE (Row Level Security)
-- Kopiér dette script og kør det i Supabase -> SQL Editor

-- 1. Tabeller og Kolonner
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ny forespørgsel';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_responded_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID; -- Peger på sælgerens ID

ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin'; -- 'admin' eller 'sales'
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS company_id UUID; -- Peger på Mesterens ID
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basis'; -- 'basis', 'standard', 'enterprise'
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false;
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS payment_customer_id TEXT;
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpenters ENABLE ROW LEVEL SECURITY;

-- 2. Sikkerhed for LEADS tabellen
DROP POLICY IF EXISTS "Tillad at alle kan oprette leads (wizard)" ON leads;
DROP POLICY IF EXISTS "Tømrere kan kun se deres egne leads" ON leads;
DROP POLICY IF EXISTS "Tømrere kan opdatere deres egne leads" ON leads;
DROP POLICY IF EXISTS "Tømrere kan slette deres egne leads" ON leads;

-- Alle (inklusive gæster der ikke er logget ind) må oprette et nyt lead via beregneren
CREATE POLICY "Tillad at alle kan oprette leads (wizard)" 
ON leads FOR INSERT 
WITH CHECK (true);

-- En bruger må se leads, hvis han ejer firmaet (carpenter_id) ELLER er blevet tildelt leadet (assigned_to) ELLER er bogholder ELLER har view_all_leads rettighed.
CREATE POLICY "Tømrere kan kun se deres egne leads" 
ON leads FOR SELECT 
USING (
  auth.uid() = carpenter_id 
  OR auth.uid() = assigned_to 
  OR EXISTS (
    SELECT 1 FROM carpenters c 
    WHERE c.id = auth.uid() 
    AND c.company_id = leads.carpenter_id
    AND (
      c.role = 'accountant' 
      OR c.permissions @> '{"view_all_leads": true}'::jsonb
    )
  )
);

-- En bruger må opdatere leads, hvis han ejer firmaet ELLER er tildelt leadet ELLER er bogholder
CREATE POLICY "Tømrere kan opdatere deres egne leads" 
ON leads FOR UPDATE 
USING (auth.uid() = carpenter_id OR auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM carpenters c WHERE c.id = auth.uid() AND c.role = 'accountant' AND c.company_id = leads.carpenter_id));

-- KUN ejeren må slette leads (Sælgere må ikke slette)
CREATE POLICY "Tømrere kan slette deres egne leads" 
ON leads FOR DELETE 
USING (auth.uid() = carpenter_id);


-- 3. Sikkerhed for CARPENTERS tabellen (Profil & Indstillinger)
DROP POLICY IF EXISTS "Alle kan læse carpenter profiler (wizard)" ON carpenters;
DROP POLICY IF EXISTS "Tømrere kan kun rette deres egen profil" ON carpenters;
DROP POLICY IF EXISTS "Tømrere kan oprette deres profil første gang" ON carpenters;

-- Alle må læse tømrerens profil (Nødvendigt for at wizarden kan vise navn/logo til kunder)
CREATE POLICY "Alle kan læse carpenter profiler (wizard)" 
ON carpenters FOR SELECT 
USING (true);

-- Tømreren må oprette deres profil når de logger ind første gang
CREATE POLICY "Tømrere kan oprette deres profil første gang" 
ON carpenters FOR INSERT 
WITH CHECK (auth.uid() = id);

-- En tømrer må kun opdatere sin egen profil/API-nøgler
CREATE POLICY "Tømrere kan kun rette deres egen profil" 
ON carpenters FOR UPDATE 
USING (auth.uid() = id);
