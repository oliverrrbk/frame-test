-- ============================================================================
-- FIX: Kunde-bekræftelse af tilbud virker for ALLE tømrere (også nye)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- Problem:
--   Når en kunde bekræfter et tilbud (status 'Sendt tilbud' -> 'Bekræftet opgave')
--   via det offentlige link, gik opdateringen ikke igennem for nyoprettede tømrere.
--
--   To ting blokerede den hemmelige-token-RPC (update_lead_by_token):
--     1) RLS: den anonyme UPDATE-policy tillader kun 'Overslag (Afventer)' /
--        'Ny forespørgsel' — IKKE 'Sendt tilbud'.
--     2) Triggeren protect_lead_sensitive_fields tillod kun status -> 'Bekræftet
--        opgave' for anonyme ELLER ejeren af sagen. En anden indlogget tømrer
--        (eller en kunde med session) fik status rullet tilbage.
--
-- Løsning:
--   Selve det hemmelige quote_token ER autorisationen. RPC'en
--   update_lead_by_token (SECURITY DEFINER) sætter et transaktions-lokalt flag,
--   som triggeren stoler på — og RPC'en kører uden RLS. Direkte opdateringer
--   udenom RPC'en er stadig fuldt beskyttede.
-- ============================================================================

-- 1) Trigger: stol på opdateringer der kommer gennem den sikre token-RPC.
CREATE OR REPLACE FUNCTION public.protect_lead_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid            uuid := auth.uid();
    v_is_service     boolean;
    v_role           text;
    v_is_owner       boolean;
    v_is_own_draft   boolean;
    v_rd             jsonb;
    k                text;
    protected_all    text[] := ARRAY['calc_data','invoice_history','invoiced_amount','actual_quote_price','customerDetails','audit_trail'];
    protected_team   text[] := ARRAY['assigned_workers','assigned_pm','assigned_subcontractors','material_list','material_lists_meta','daily_message','case_messages'];
BEGIN
    v_is_service := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );
    IF v_is_service THEN
        RETURN NEW; -- edge-funktioner må alt
    END IF;

    -- Betroet kunde-bekræftelse via hemmeligt quote-token (RPC update_lead_by_token).
    -- Tokenet ER autorisationen, så opdateringen tillades uanset hvem der er logget ind.
    IF current_setting('app.confirm_via_token', true) = '1' THEN
        RETURN NEW;
    END IF;

    v_is_owner := (v_uid IS NOT NULL AND v_uid = OLD.carpenter_id);

    SELECT role INTO v_role FROM carpenters
     WHERE id = v_uid AND company_id = OLD.carpenter_id
     LIMIT 1;

    -- Mester (ejer) eller bogholder = fuld adgang
    IF v_is_owner OR v_role = 'accountant' OR v_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- En brugers EGEN kladde → fuld redigering (de bygger tilbuddet)
    v_is_own_draft := (
        v_uid IS NOT NULL
        AND (OLD.raw_data->>'created_by') = v_uid::text
        AND OLD.status IN ('Kladde','Intern Kladde','Sendt Kladde')
    );
    IF v_is_own_draft THEN
        RETURN NEW;
    END IF;

    -- ---- Herfra: tildelt svend/lærling/PM eller anonym gæst (kunde) ----

    -- Beskyttede top-niveau-kolonner ruller tilbage
    -- SIKKERHED: Tillad at en anonym kunde (v_uid is null) ændrer status til 'Ny forespørgsel' eller 'Bekræftet opgave' via public RPC
    IF NOT (
        (v_uid IS NULL OR auth.role() = 'anon')
        AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave')
    ) THEN
        NEW.status := OLD.status;
    END IF;

    NEW.assigned_to         := OLD.assigned_to;
    NEW.price_estimate      := OLD.price_estimate;
    NEW.carpenter_id        := OLD.carpenter_id;
    NEW.ordrestyring_case_id := OLD.ordrestyring_case_id;
    NEW.apacta_case_id      := OLD.apacta_case_id;
    NEW.minuba_case_id      := OLD.minuba_case_id;

    -- Beskyttede raw_data-nøgler ruller tilbage (uanset hvad klienten sender)
    v_rd := COALESCE(NEW.raw_data, '{}'::jsonb);

    FOREACH k IN ARRAY protected_all LOOP
        -- SIKKERHED: Tillad at en anonym kunde opdaterer audit_trail / audit_trail_opened
        IF (v_uid IS NULL OR auth.role() = 'anon') AND k IN ('audit_trail', 'audit_trail_opened') THEN
            CONTINUE;
        END IF;

        IF OLD.raw_data ? k THEN
            v_rd := jsonb_set(v_rd, ARRAY[k], OLD.raw_data->k);
        ELSE
            v_rd := v_rd - k;
        END IF;
    END LOOP;

    -- Hold/drift kun for projektleder (sales); beskyttet for svend/lærling
    IF COALESCE(v_role,'') <> 'sales' THEN
        FOREACH k IN ARRAY protected_team LOOP
            IF OLD.raw_data ? k THEN
                v_rd := jsonb_set(v_rd, ARRAY[k], OLD.raw_data->k);
            ELSE
                v_rd := v_rd - k;
            END IF;
        END LOOP;
    END IF;

    NEW.raw_data := v_rd;
    RETURN NEW;
END;
$$;


-- 2) RPC: kør uden RLS, sæt token-flaget, og stempl confirmed_at ved bekræftelse.
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
BEGIN
  -- Sikkerhed: Tillad KUN overgang til specifikke tilladte statusser via public token
  IF new_status IS NOT NULL AND new_status NOT IN ('Bekræftet opgave') THEN
    RAISE EXCEPTION 'Ugyldig statusændring via public token';
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
'Lader en kunde bekræfte sit tilbud via det hemmelige quote_token. Kører uden RLS og sætter app.confirm_via_token, så protect_lead_sensitive_fields stoler på overgangen — uanset hvilken tømrer/kunde der er logget ind.';
