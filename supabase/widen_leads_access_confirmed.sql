-- ============================================================================
-- SQL Migration: Udvid leads-adgang til bekræftede firma-sager
-- ============================================================================
-- BAGGRUND:
-- Tidligere kunne en svend/lærling/PM kun SE og redigere (føre timer på) sager
-- de var direkte tildelt (assigned_workers / assigned_pm). Det betød at mester
-- (William) manuelt skulle sætte alle folk på hver eneste sag, før de kunne se
-- den og registrere timer.
--
-- ØNSKE: Så snart en sag er BEKRÆFTET, skal alle i samme firma kunne se den og
-- føre timer på den — uden manuel tildeling.
--
-- SIKKERHED:
-- * Udvidelsen er FIRMA-afgrænset via leads.carpenter_id (= mesterens id). Man
--   ser ALDRIG andre firmaers sager.
-- * Kun BEKRÆFTEDE statusser åbnes. Ikke-bekræftede leads (tilbud/forespørgsler/
--   kladder) forbliver lukkede for menige — kun ejer/tildelte/sælger ser dem.
-- * Skrivning er fortsat hærdet af triggeren protect_lead_sensitive_fields()
--   (add_lead_push_trigger.sql), der for alle ikke-ejer/admin/sælger ruller
--   status, assigned_*, calc_data, customerDetails m.fl. tilbage. En menig kan
--   derfor reelt kun ændre ikke-beskyttede raw_data-nøgler (time_entries,
--   checklist, case_logs).
--
-- mutate_time_entries() er SECURITY INVOKER (setup_time_entries_rpc.sql), så den
-- bruger kalderens RLS — derfor SKAL både SELECT og UPDATE udvides.
-- ============================================================================

-- Statusser der regnes som "bekræftede" (samme sæt som klientens isConfirmedCase)
-- 'Bekræftet opgave', 'Sæt i bero' = aktive · 'Historik', 'Afbrudt Sag' = afsluttede

DROP POLICY IF EXISTS "Tømrere kan kun se deres egne leads" ON leads;
CREATE POLICY "Tømrere kan kun se deres egne leads"
ON leads FOR SELECT
USING (
  auth.uid() = carpenter_id
  OR auth.uid() = assigned_to
  OR coalesce(leads.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR coalesce(leads.raw_data->'assigned_pm', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND (
      c.role = 'accountant'
      OR c.permissions @> '{"view_all_leads": true}'::jsonb
    )
  )
  -- NYT: alle i firmaet må se bekræftede sager
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND leads.status IN ('Bekræftet opgave','Sæt i bero','Historik','Afbrudt Sag')
  )
);

DROP POLICY IF EXISTS "Tømrere kan opdatere deres egne leads" ON leads;
CREATE POLICY "Tømrere kan opdatere deres egne leads"
ON leads FOR UPDATE
USING (
  auth.uid() = carpenter_id
  OR auth.uid() = assigned_to
  OR coalesce(leads.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR coalesce(leads.raw_data->'assigned_pm', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR EXISTS (SELECT 1 FROM carpenters c WHERE c.id = auth.uid() AND c.role = 'accountant' AND c.company_id = leads.carpenter_id)
  -- NYT: alle i firmaet må opdatere (føre timer på) bekræftede sager.
  -- Følsomme felter beskyttes fortsat af triggeren protect_lead_sensitive_fields().
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND leads.status IN ('Bekræftet opgave','Sæt i bero','Historik','Afbrudt Sag')
  )
);
