-- ============================================================================
-- TRIN 1 (additivt — nul risiko): Sikker offentlig læsning af tømrer-profil
-- ============================================================================
-- Kør dette i Supabase -> SQL Editor FØR du genindlæser appen.
-- Returnerer tømrerens profil til den offentlige beregner/tilbudssider, MEN:
--   • renser raw_data for løn/PII (time_entries, lonnummer, vacation_quota)
--   • fjerner alle integrations-API-nøgle-kolonner fra outputtet (defensivt)
-- Pris-opsætningen i raw_data bevares, så beregneren virker præcis som før.

CREATE OR REPLACE FUNCTION public.sanitize_carpenter(c carpenters)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
      to_jsonb(c)
      - 'dinero_api_key' - 'economic_api_key' - 'apacta_api_key'
      - 'ordrestyring_api_key' - 'minuba_api_key' - 'payment_customer_id'
    )
    || jsonb_build_object(
      'raw_data',
      COALESCE(c.raw_data, '{}'::jsonb) - 'time_entries' - 'lonnummer' - 'vacation_quota'
    )
$$;

-- Offentligt opslag via slug (beregneren / PublicWizardPage)
CREATE OR REPLACE FUNCTION public.get_public_carpenter_by_slug(slug_val text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sanitize_carpenter(c) FROM carpenters c WHERE c.slug = slug_val LIMIT 1;
$$;

-- Offentligt opslag via id (tilbuds-/overslags-accept-sider)
CREATE OR REPLACE FUNCTION public.get_public_carpenter(carpenter_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.sanitize_carpenter(c) FROM carpenters c WHERE c.id = carpenter_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_carpenter_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_carpenter(uuid) TO anon, authenticated;
