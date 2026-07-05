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
--   2) Auto-nummeret styres nu af en lille tæller PR. FIRMA (i stedet for den delte
--      globale sekvens). Tælleren FØLGER det senest satte nummer: ændrer/opretter man
--      en sag til fx 20, bliver næste nye sag 21 — også selvom højere gamle numre
--      findes. Blankt felt = næste ledige fra tælleren (springer optagne over, så en
--      auto-oprettelse aldrig fejler på dublet).
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
-- 3) "Smart" tæller PR. FIRMA der FØLGER det senest satte nummer.
--    Ønske (Tobias): når man ændrer/opretter en sag til fx 20, skal NÆSTE nye sag
--    blive 21 — også selvom der stadig findes højere gamle numre (fx 1003). Så vi
--    kan ikke bruge et rent MAX+1; vi holder en lille tæller pr. firma, der peger
--    på "næste nummer", og som flyttes hen til (sat nummer + 1) HVER gang et
--    sagsnummer sættes — ved oprettelse ELLER redigering, også nedad.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.case_number_pointer (
    company_id  uuid PRIMARY KEY,
    next_number integer NOT NULL
);
-- Kun SECURITY DEFINER-funktionerne nedenfor rører tabellen → RLS til uden policyer
-- (ingen direkte klient-adgang; DEFINER omgår RLS).
ALTER TABLE public.case_number_pointer ENABLE ROW LEVEL SECURITY;

-- BEFORE INSERT: tildel firmaets næste ledige nummer, når intet er valgt.
--   • Startpunkt = tælleren, ellers udledt af firmaets nuværende max (gulv 1000).
--   • Springer optagne numre over, så en auto-oprettelse ALDRIG fejler på dublet.
--   • Manuelt indtastet nummer respekteres uændret (unikhed = constraint i blok 2).
CREATE OR REPLACE FUNCTION public.assign_lead_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    start_num integer;
    candidate integer;
BEGIN
    IF NEW.case_number IS NOT NULL THEN
        RETURN NEW; -- brugeren har selv valgt et nummer
    END IF;

    IF NEW.carpenter_id IS NULL THEN
        -- Anonyme leads (ingen firma endnu): simpel max+1, ingen tæller.
        SELECT COALESCE(MAX(case_number), 999) + 1 INTO NEW.case_number
          FROM public.leads WHERE carpenter_id IS NULL;
        RETURN NEW;
    END IF;

    SELECT next_number INTO start_num
      FROM public.case_number_pointer WHERE company_id = NEW.carpenter_id;
    IF start_num IS NULL THEN
        SELECT GREATEST(1000, COALESCE(MAX(case_number), 999) + 1) INTO start_num
          FROM public.leads WHERE carpenter_id = NEW.carpenter_id;
    END IF;

    candidate := start_num;
    WHILE EXISTS (
        SELECT 1 FROM public.leads
         WHERE carpenter_id = NEW.carpenter_id AND case_number = candidate
    ) LOOP
        candidate := candidate + 1;
    END LOOP;

    NEW.case_number := candidate;
    RETURN NEW;
END;
$$;

-- AFTER INSERT/UPDATE: flyt tælleren hen til (sat nummer + 1). Gælder både auto- og
-- manuelt-satte numre, og ved redigering (også nedad — det er præcis ønsket).
CREATE OR REPLACE FUNCTION public.bump_case_number_pointer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.carpenter_id IS NULL OR NEW.case_number IS NULL THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.case_number IS NOT DISTINCT FROM OLD.case_number THEN
        RETURN NEW; -- nummeret blev ikke ændret
    END IF;

    INSERT INTO public.case_number_pointer (company_id, next_number)
    VALUES (NEW.carpenter_id, NEW.case_number + 1)
    ON CONFLICT (company_id) DO UPDATE SET next_number = EXCLUDED.next_number;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_lead_case_number ON public.leads;
CREATE TRIGGER trg_assign_lead_case_number
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.assign_lead_case_number();

DROP TRIGGER IF EXISTS trg_bump_case_number_pointer_ins ON public.leads;
CREATE TRIGGER trg_bump_case_number_pointer_ins
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.bump_case_number_pointer();

DROP TRIGGER IF EXISTS trg_bump_case_number_pointer_upd ON public.leads;
CREATE TRIGGER trg_bump_case_number_pointer_upd
AFTER UPDATE OF case_number ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.bump_case_number_pointer();
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_assign_lead_case_number ON public.leads;
--           DROP TRIGGER IF EXISTS trg_bump_case_number_pointer_ins ON public.leads;
--           DROP TRIGGER IF EXISTS trg_bump_case_number_pointer_upd ON public.leads;
--           DROP TABLE IF EXISTS public.case_number_pointer;
--           (og gendan DEFAULT'en fra blok 1 hvis nødvendigt)
