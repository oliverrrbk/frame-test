-- ============================================================================
-- SQL Migration: Pålidelig soft-delete af tilbud/kladder
-- ============================================================================
-- BAGGRUND:
-- Sletning skete som rå UPDATE status='Slettet'. For ikke-ejer-roller og for leads
-- der ikke længere er kladder ('Sendt tilbud', 'Ny forespørgsel') rullede triggeren
-- protect_lead_sensitive_fields() status-ændringen tilbage → sletningen "kom tilbage".
--
-- LØSNING:
-- 1. En SECURITY DEFINER RPC soft_delete_lead() der autoriserer kalderen (ejer,
--    opretter af kladden, eller admin/sales/accountant i firmaet), nægter at slette
--    bekræftede sager med arbejde, og sætter en transaktions-flag app.allow_delete.
-- 2. En lille undtagelse i protect_lead_sensitive_fields() der respekterer flaget
--    (samme mønster som app.confirm_via_token).
-- ============================================================================

-- 1. Opdatér den kanoniske beskyttelses-funktion med allow_delete-undtagelsen.
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
    IF current_setting('app.confirm_via_token', true) = '1' THEN
        RETURN NEW;
    END IF;

    -- Kontrolleret soft-delete via soft_delete_lead() RPC (har allerede autoriseret kalderen).
    IF current_setting('app.allow_delete', true) = '1' AND NEW.status = 'Slettet' THEN
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

    v_rd := COALESCE(NEW.raw_data, '{}'::jsonb);

    FOREACH k IN ARRAY protected_all LOOP
        IF (v_uid IS NULL OR auth.role() = 'anon') AND k IN ('audit_trail', 'audit_trail_opened') THEN
            CONTINUE;
        END IF;

        IF OLD.raw_data ? k THEN
            v_rd := jsonb_set(v_rd, ARRAY[k], OLD.raw_data->k);
        ELSE
            v_rd := v_rd - k;
        END IF;
    END LOOP;

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


-- 2. RPC: autoriseret soft-delete af et tilbud/kladde.
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

    PERFORM set_config('app.allow_delete', '1', true);
    UPDATE leads SET status = 'Slettet' WHERE id = p_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_lead(bigint) TO authenticated;
