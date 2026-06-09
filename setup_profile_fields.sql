-- ============================================================================
-- Medarbejder-profil & underleverandør-adresse — kør i Supabase -> SQL Editor.
-- Additivt. Indeholder: (1) address-kolonne på subcontractors,
-- (2) opdateret sanitize_carpenter så private felter aldrig lækker offentligt.
-- ============================================================================

-- (1) Firmaadresse på underleverandører
ALTER TABLE public.subcontractors ADD COLUMN IF NOT EXISTS address TEXT;

-- (2) Udvid rensningen i den offentlige tømrer-RPC: fjern også de nye private
--     felter (adresse/by/postnr/pårørende) fra det der eksponeres offentligt.
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
      COALESCE(c.raw_data, '{}'::jsonb)
        - 'time_entries' - 'lonnummer' - 'vacation_quota'
        - 'home_address' - 'home_zip' - 'home_city' - 'next_of_kin'
    )
$$;
