-- ============================================================================
-- REDIGERBART SAGSNUMMER — kør i Supabase -> SQL Editor.
-- ============================================================================
-- Gør sagsnummeret (leads.case_number) selvvalgt:
--   • Skriver man INTET → systemet vælger automatisk næste nummer (som før).
--   • Skriver man et nummer der ALLEREDE findes i firmaet → afvises (unik-fejl),
--     og appen viser "Sagsnummer X findes allerede".
--
-- Kør EFTER add_case_number.sql. ALT er idempotent og kan køres i én omgang.
--
-- HVAD ÆNDRES OG HVORFOR:
--   1) Unikhed gøres PR. FIRMA i stedet for globalt. Den gamle globale
--      UNIQUE(case_number) betød at to firmaer ikke måtte dele samme nummer —
--      forkert, når hver tømrer skal føre sine EGNE gamle sagsnumre over. Nu er
--      det UNIQUE(carpenter_id, case_number) (leads.carpenter_id er altid
--      firma-roden i denne app).
--   2) Auto-nummeret kommer nu fra firmaets EGET max+1 (via en BEFORE INSERT-
--      trigger) i stedet for den delte globale sekvens. Det fjerner risikoen for
--      at et auto-nummer senere kolliderer med et manuelt indtastet nummer i
--      samme firma (fx når man importerer gamle sager i samme talområde), og
--      giver hvert firma en sammenhængende egen nummerrække.
--
-- ROLLBACK-noter står ved hver blok.
-- ============================================================================

-- Sørg for at kolonnen findes (idempotent — normalt lavet i add_case_number.sql).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS case_number INTEGER;

-- ----------------------------------------------------------------------------
-- 1) Fjern den globale DEFAULT (sekvensen) — så en tom (NULL) værdi når frem til
--    triggeren, der tildeler firmaets eget næste nummer. Sekvensen selv efterlades
--    urørt (harmløs); den bruges bare ikke længere som default.
-- ----------------------------------------------------------------------------
ALTER TABLE public.leads ALTER COLUMN case_number DROP DEFAULT;
-- ROLLBACK: ALTER TABLE public.leads ALTER COLUMN case_number
--           SET DEFAULT nextval('leads_case_number_seq');

-- ----------------------------------------------------------------------------
-- 2) Skift unikhed fra global → pr. firma.
--    (Ingen eksisterende data brydes: globalt unikke tal er også unikke pr. firma.)
-- ----------------------------------------------------------------------------
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_case_number_unique;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_company_case_number_unique'
    ) THEN
        ALTER TABLE public.leads
            ADD CONSTRAINT leads_company_case_number_unique UNIQUE (carpenter_id, case_number);
    END IF;
END $$;
-- ROLLBACK: ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_company_case_number_unique;
--           ALTER TABLE public.leads ADD CONSTRAINT leads_case_number_unique UNIQUE (case_number);

-- ----------------------------------------------------------------------------
-- 3) BEFORE INSERT-trigger: tildel firmaets eget næste nummer, når intet er valgt.
--    Manuelt indtastet nummer respekteres uændret (unikheden håndteres af
--    constraint'en i blok 2). Gulv på 1000 så nye firmaer starter pænt (matcher
--    den gamle sekvens' START 1000).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_lead_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.case_number IS NULL THEN
        SELECT COALESCE(MAX(case_number), 999) + 1
          INTO NEW.case_number
          FROM public.leads
         WHERE carpenter_id IS NOT DISTINCT FROM NEW.carpenter_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_lead_case_number ON public.leads;
CREATE TRIGGER trg_assign_lead_case_number
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.assign_lead_case_number();
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_assign_lead_case_number ON public.leads;
--           (og gendan DEFAULT'en fra blok 1 hvis nødvendigt)
