-- ============================================================================
-- SQL Migration: Tilbagekald af afsendte tilbud (link-invalidering)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- PROBLEM:
--   Et tilbud sendes til kunden som en mail med et link til den offentlige side
--   /:slug/tilbud/:quote_token. Sletter tømreren tilbuddet bagefter, kan mailen
--   IKKE trækkes tilbage fra kundens indbakke — men linket levede videre og viste
--   stadig tilbuddet, og kunden kunne endda BEKRÆFTE et slettet tilbud (RPC'en
--   tjekkede ikke status).
--
-- LØSNING:
--   1. Ny kolonne `revoked_at` der markerer, at et AFSENDT tilbud er trukket
--      tilbage. soft_delete_lead() sætter den automatisk, når den sag, der slettes,
--      allerede var sendt/åbnet/bekræftet (en ren intern kladde påvirkes ikke).
--   2. update_lead_by_token() nægter at bekræfte et tilbud, der er slettet eller
--      tilbagekaldt — server-side spærre, så et lækket/gammelt link er værdiløst.
--   3. Den offentlige side (QuoteAcceptPage) læser `revoked_at`/`status` (følger
--      med get_lead_by_token, der returnerer hele leads-rækken) og viser
--      "tilbuddet er trukket tilbage" i stedet for at lade kunden bekræfte.
-- ============================================================================

-- 1) Kolonne: tidspunkt for tilbagekald (NULL = stadig gyldigt).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 2) soft_delete_lead(): sæt revoked_at når et ALLEREDE AFSENDT tilbud slettes,
--    så kundens link selv-invaliderer. (Identisk med supabase/soft_delete_lead.sql
--    bortset fra den afsluttende UPDATE.)
CREATE OR REPLACE FUNCTION public.soft_delete_lead(p_lead_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid          uuid := auth.uid();
    v_lead         leads%rowtype;
    v_role         text;
    v_is_owner     boolean;
    v_is_creator   boolean;
    v_is_confirmed boolean;
    v_was_sent     boolean;
BEGIN
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead findes ikke';
    END IF;

    v_is_owner   := (v_uid IS NOT NULL AND v_uid = v_lead.carpenter_id);
    v_is_creator := (v_uid IS NOT NULL AND (v_lead.raw_data->>'created_by') = v_uid::text);

    SELECT role INTO v_role FROM carpenters
     WHERE id = v_uid AND company_id = v_lead.carpenter_id
     LIMIT 1;

    IF NOT (v_is_owner OR v_is_creator OR v_role IN ('admin','sales','accountant')) THEN
        RAISE EXCEPTION 'Ingen adgang til at slette dette tilbud';
    END IF;

    -- Ejer/admin/bogholder beholder fuld adgang (kan også fjerne bekræftede sager, som hidtil).
    -- Opretter/sælger må KUN slette ikke-bekræftede tilbud/kladder — bekræftede sager med
    -- arbejde beskyttes (de har "Marker som tabt" i stedet).
    IF NOT (v_is_owner OR v_role IN ('admin','accountant')) THEN
        v_is_confirmed := v_lead.status IN ('Bekræftet opgave','Historik','Afbrudt Sag')
           OR (v_lead.status = 'Sæt i bero' AND (
                (v_lead.raw_data->>'actual_quote_price') IS NOT NULL
                OR (v_lead.raw_data->'audit_trail') IS NOT NULL
                OR v_lead.ordrestyring_case_id IS NOT NULL
                OR v_lead.apacta_case_id IS NOT NULL
                OR v_lead.minuba_case_id IS NOT NULL
                OR jsonb_array_length(COALESCE(v_lead.raw_data->'case_logs','[]'::jsonb)) > 0
                OR jsonb_array_length(COALESCE(v_lead.raw_data->'todo_list','[]'::jsonb)) > 0
                OR jsonb_array_length(COALESCE(v_lead.raw_data->'assigned_workers','[]'::jsonb)) > 0
           ));
        IF v_is_confirmed THEN
            RAISE EXCEPTION 'Bekræftede sager kan kun slettes af ejeren';
        END IF;
    END IF;

    -- Var dette et kunde-vendt tilbud med et levende link? (Sendt, åbnet eller bekræftet.)
    -- Rene interne kladder ('Kladde','Intern Kladde','Sendt Kladde','Tilbudskladder')
    -- har aldrig haft et kunde-link og skal ikke markeres tilbagekaldt.
    v_was_sent := (
        v_lead.opened_at IS NOT NULL
        OR v_lead.status IN ('Sendt tilbud','Bekræftet opgave','Ny forespørgsel','Overslag (Afventer)')
    );

    PERFORM set_config('app.allow_delete', '1', true);
    UPDATE leads
       SET status = 'Slettet',
           revoked_at = CASE
               WHEN revoked_at IS NOT NULL THEN revoked_at  -- bevar første tilbagekald
               WHEN v_was_sent THEN now()
               ELSE revoked_at
           END
     WHERE id = p_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_lead(bigint) TO authenticated;


-- 3) update_lead_by_token(): nægt bekræftelse af et slettet/tilbagekaldt tilbud.
--    (Identisk med supabase/fix_public_quote_confirm.sql bortset fra gyldigheds-spærren.)
CREATE OR REPLACE FUNCTION update_lead_by_token(
  token_val UUID,
  new_status TEXT DEFAULT NULL,
  new_raw_data JSONB DEFAULT NULL,
  new_opened_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_status     text;
  v_revoked_at timestamptz;
BEGIN
  -- Sikkerhed: Tillad KUN overgang til specifikke tilladte statusser via public token
  IF new_status IS NOT NULL AND new_status NOT IN ('Bekræftet opgave') THEN
    RAISE EXCEPTION 'Ugyldig statusændring via public token';
  END IF;

  -- Gyldigheds-spærre: et tilbud der er trukket tilbage eller slettet kan IKKE
  -- bekræftes via linket (mailen kan ikke kaldes tilbage, men linket er nu værdiløst).
  IF new_status = 'Bekræftet opgave' THEN
    SELECT status, revoked_at INTO v_status, v_revoked_at
      FROM leads WHERE quote_token = token_val;
    IF v_revoked_at IS NOT NULL OR v_status = 'Slettet' THEN
      RAISE EXCEPTION 'Tilbuddet er ikke længere gyldigt';
    END IF;
  END IF;

  -- Markér at denne opdatering kommer fra den sikre token-RPC (transaktions-lokalt).
  PERFORM set_config('app.confirm_via_token', '1', true);

  UPDATE leads
  SET
    status = COALESCE(new_status, status),
    raw_data = CASE
      WHEN new_raw_data IS NOT NULL THEN
        raw_data || jsonb_strip_nulls(jsonb_build_object(
          'audit_trail', new_raw_data->'audit_trail',
          'audit_trail_opened', new_raw_data->'audit_trail_opened'
        ))
      ELSE raw_data
    END
    -- Stempl bekræftelsestidspunkt (bruges til "dagen efter"-påmindelsen) kun ved bekræftelse,
    -- og kun hvis det ikke allerede er sat.
    || CASE
         WHEN new_status = 'Bekræftet opgave' AND NOT (raw_data ? 'confirmed_at')
         THEN jsonb_build_object('confirmed_at', COALESCE(new_raw_data->'confirmed_at', to_jsonb(now())))
         ELSE '{}'::jsonb
       END,
    opened_at = COALESCE(new_opened_at, opened_at)
  WHERE quote_token = token_val;
END;
$$;

COMMENT ON FUNCTION update_lead_by_token(UUID, TEXT, JSONB, TIMESTAMPTZ) IS
'Lader en kunde bekræfte sit tilbud via det hemmelige quote_token. Kører uden RLS og sætter app.confirm_via_token, så protect_lead_sensitive_fields stoler på overgangen. Nægter bekræftelse hvis tilbuddet er slettet/tilbagekaldt (revoked_at).';
