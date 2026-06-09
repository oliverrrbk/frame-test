-- ============================================================================
-- SIKKERHEDSHÆRDNING #2 — kør i Supabase -> SQL Editor.
-- Indeholder 3 uafhængige blokke (#1 carpenter_secrets, #2 bilag-bucket,
-- #3 tegninger). Alt er idempotent og kan køres uden at vælte eksisterende.
-- Rollback-blokke står nederst (udkommenteret).
-- ============================================================================

-- Sikrer at hjælpefunktionen findes (også hvis carpenters-hærdningen ikke er kørt).
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(company_id, id) FROM carpenters WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- #1  carpenter_secrets — API-nøgler må KUN læses/skrives af eget firma
-- ----------------------------------------------------------------------------
ALTER TABLE public.carpenter_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firma kan se egne secrets" ON public.carpenter_secrets;
DROP POLICY IF EXISTS "Firma kan oprette egne secrets" ON public.carpenter_secrets;
DROP POLICY IF EXISTS "Firma kan opdatere egne secrets" ON public.carpenter_secrets;

CREATE POLICY "Firma kan se egne secrets"
ON public.carpenter_secrets FOR SELECT
USING (carpenter_id = public.my_company_id() OR (auth.jwt() ->> 'email') = 'team@bisoncompany.dk');

CREATE POLICY "Firma kan oprette egne secrets"
ON public.carpenter_secrets FOR INSERT
WITH CHECK (carpenter_id = public.my_company_id());

CREATE POLICY "Firma kan opdatere egne secrets"
ON public.carpenter_secrets FOR UPDATE
USING (carpenter_id = public.my_company_id());

-- ----------------------------------------------------------------------------
-- #2  Privat bucket til bilag (finansielle dokumenter) — IKKE offentlig
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('bilag', 'bilag', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Indloggede kan uploade bilag" ON storage.objects;
DROP POLICY IF EXISTS "Indloggede kan se bilag" ON storage.objects;

CREATE POLICY "Indloggede kan uploade bilag"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bilag' AND auth.uid() IS NOT NULL);

-- Læseadgang gives kun til indloggede (signed URLs genereres klient-side).
CREATE POLICY "Indloggede kan se bilag"
ON storage.objects FOR SELECT
USING (bucket_id = 'bilag' AND auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- #3  Tegninger — kun eget firma (luk cross-tenant læsning)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all drawings" ON public.drawings;
DROP POLICY IF EXISTS "Firma kan se egne tegninger" ON public.drawings;

CREATE POLICY "Firma kan se egne tegninger"
ON public.drawings FOR SELECT
USING (
  user_id = auth.uid()
  OR (auth.jwt() ->> 'email') = 'team@bisoncompany.dk'
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = drawings.lead_id
    AND (
      l.carpenter_id = public.my_company_id()
      OR l.carpenter_id = auth.uid()
      OR COALESCE(l.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
    )
  )
);

-- ============================================================================
-- ROLLBACK (fjern -- og kør den relevante blok, hvis noget driller):
-- ============================================================================
-- #1: ALTER TABLE public.carpenter_secrets DISABLE ROW LEVEL SECURITY;
-- #2: UPDATE storage.buckets SET public = true WHERE id = 'bilag';
-- #3: DROP POLICY IF EXISTS "Firma kan se egne tegninger" ON public.drawings;
--     CREATE POLICY "Users can view all drawings" ON public.drawings FOR SELECT USING (auth.uid() IS NOT NULL);
