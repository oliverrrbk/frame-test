-- ============================================================================
-- TRIN 3: Stram læseadgang til 'carpenters' (kør FØRST når Trin 1 + ny kode
-- er bekræftet at virke — test beregner, login og team bagefter).
-- ============================================================================
-- Lukker hullet hvor enhver med den offentlige anon-nøgle kunne læse ALLE
-- firmaers carpenters-rækker (navne, e-mails, raw_data, evt. gamle API-nøgle-
-- kolonner). Efter dette kan:
--   • en bruger læse sig selv + sit eget firmas rækker
--   • super-admin (team@bisoncompany.dk) læse alle
--   • den offentlige beregner læser via get_public_carpenter*-RPC'erne (SECURITY
--     DEFINER), så den er upåvirket.
--
-- ROLLBACK: kør nederste blok ("GENDAN") for at vende tilbage til USING(true).

-- Henter kalderens firma-id uden at trigge RLS (undgår rekursion).
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(company_id, id) FROM carpenters WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Alle kan læse carpenter profiler (wizard)" ON carpenters;
DROP POLICY IF EXISTS "Firma og super-admin kan læse carpenters" ON carpenters;

CREATE POLICY "Firma og super-admin kan læse carpenters"
ON carpenters FOR SELECT
USING (
  auth.uid() = id
  OR COALESCE(company_id, id) = public.my_company_id()
  OR (auth.jwt() ->> 'email') = 'team@bisoncompany.dk'
);

-- ----------------------------------------------------------------------------
-- GENDAN (rollback) — fjern -- og kør, hvis noget uventet sker:
-- ----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "Firma og super-admin kan læse carpenters" ON carpenters;
-- CREATE POLICY "Alle kan læse carpenter profiler (wizard)" ON carpenters FOR SELECT USING (true);
