-- ============================================================================
-- FELT-VAGT PÅ leads — kør i Supabase -> SQL Editor
-- ============================================================================
-- VIGTIGT: Den KANONISKE version af funktionen protect_lead_sensitive_fields()
-- vedligeholdes både her OG i supabase/add_lead_push_trigger.sql (som derudover
-- tilføjer push-triggeren tr_on_lead_push_notify). De skal være IDENTISKE.
-- Denne fil er den fulde "felt-vagt"-opsætning inkl. selve BEFORE UPDATE-triggeren.
--
-- BAGGRUND (audit #5): RLS er rækkeniveau. UPDATE-politikken på `leads` lader
-- enhver TILDELT bruger (svend/lærling/projektleder) opdatere HELE rækken — altså
-- også pris, calc_data, faktura-historik, status, holdtildeling og kundens
-- økonomi-data. UI'et skjuler det, men et API-kald/devtools kan ændre det.
--
-- LØSNING (samme metode som trg_protect_carpenter_cols på carpenters): vi BEHOLDER
-- den brede UPDATE-policy, så alle eksisterende skrive-stier + RPC'er virker
-- uændret, og lægger en BEFORE UPDATE-trigger der ruller BESKYTTEDE felter tilbage
-- til de gamle værdier for ikke-privilegerede brugere.
--
-- PRIVILEGERET (fuld adgang, uændret):
--   • service_role (edge-funktioner)
--   • ejeren/mesteren (auth.uid() = leads.carpenter_id)
--   • bogholder (carpenters.role = 'accountant' i samme firma)
--   • en brugers EGEN kladde (raw_data->created_by = auth.uid og status er kladde)
--
-- ANONYM KUNDE (offentlig accept-side): må sætte status til 'Ny forespørgsel' /
-- 'Bekræftet opgave' og skrive audit_trail/audit_trail_opened — så de kan
-- acceptere tilbud/overslag. Alt andet er stadig beskyttet.
--
-- IKKE-PRIVILEGERET på en RIGTIG sag (svend/lærling/projektleder):
--   • Altid beskyttet:  status*, assigned_to, price_estimate, carpenter_id,
--     ordrestyring/apacta/minuba-id'er, samt i raw_data: calc_data,
--     invoice_history, invoiced_amount, actual_quote_price, customerDetails, audit_trail.
--   • Kun projektleder (sales) må røre hold/drift: assigned_workers, assigned_pm,
--     assigned_subcontractors, material_list(+meta), daily_message, case_messages.
--   • Tilladt for alle tildelte (drift): time_entries, checklist, logs, foto-arrays mm.
--
-- Idempotent. Rollback-blok står nederst (udkommenteret).
-- ============================================================================

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

    -- Beskyttede top-niveau-kolonner ruller tilbage.
    -- Undtagelse: en anonym kunde må acceptere via public RPC (sætte status til
    -- 'Ny forespørgsel' eller 'Bekræftet opgave').
    IF NOT (
        (v_uid IS NULL OR auth.role() = 'anon')
        AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave')
    ) THEN
        NEW.status := OLD.status;
    END IF;

    NEW.assigned_to          := OLD.assigned_to;
    NEW.price_estimate       := OLD.price_estimate;
    NEW.carpenter_id         := OLD.carpenter_id;
    NEW.ordrestyring_case_id := OLD.ordrestyring_case_id;
    NEW.apacta_case_id       := OLD.apacta_case_id;
    NEW.minuba_case_id       := OLD.minuba_case_id;

    -- Beskyttede raw_data-nøgler ruller tilbage (uanset hvad klienten sender).
    v_rd := COALESCE(NEW.raw_data, '{}'::jsonb);

    FOREACH k IN ARRAY protected_all LOOP
        -- Undtagelse: anonym kunde må skrive audit_trail/audit_trail_opened.
        IF (v_uid IS NULL OR auth.role() = 'anon') AND k IN ('audit_trail', 'audit_trail_opened') THEN
            CONTINUE;
        END IF;

        IF OLD.raw_data ? k THEN
            v_rd := jsonb_set(v_rd, ARRAY[k], OLD.raw_data->k);
        ELSE
            v_rd := v_rd - k;
        END IF;
    END LOOP;

    -- Hold/drift kun for projektleder (sales); beskyttet for svend/lærling.
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

DROP TRIGGER IF EXISTS trg_protect_lead_fields ON leads;
CREATE TRIGGER trg_protect_lead_fields
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION public.protect_lead_sensitive_fields();

-- ============================================================================
-- ROLLBACK (fjern beskyttelsen igen — kør kun hvis noget legitimt blokeres):
-- ----------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_protect_lead_fields ON leads;
-- DROP FUNCTION IF EXISTS public.protect_lead_sensitive_fields();
-- ============================================================================
