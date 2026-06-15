-- FIX: Projektledere (assigned_pm) kunne ikke SE de sager de blev tildelt.
--
-- Årsag: RLS SELECT/UPDATE-politikkerne på `leads` tjekkede kun ejer (carpenter_id),
-- assigned_to og raw_data->assigned_workers — men IKKE raw_data->assigned_pm.
-- Når en projektleder tilføjes via "Holdet på sagen", gemmes hans id i assigned_pm,
-- så databasen filtrerede sagen væk for ham, og den nåede aldrig hans dashboard.
--
-- Klient-filtrene tjekker allerede assigned_pm korrekt; problemet var udelukkende RLS.
-- Denne migration tilføjer assigned_pm-leddet til både SELECT og UPDATE.

-- assigned_pm gemmes som et JSON-array af bruger-id'er (samme som assigned_workers),
-- så samme containment-tjek (@>) virker for både array og enkelt-værdi.

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
);
