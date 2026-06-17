-- ============================================================================
-- SQL Migration: Add Lead Status Push Notification Trigger & Fix Sensitive Fields Guard
-- ============================================================================
-- Purpose:
-- 1. Updates protect_lead_sensitive_fields() function to allow anonymous/anon
--    customers (using public token RPCs) to update status to 'Ny forespørgsel' 
--    or 'Bekræftet opgave' and write to raw_data->'audit_trail'.
-- 2. Triggers a push notification when a lead transitions to 'Ny forespørgsel' 
--    or 'Bekræftet opgave' by dynamically pulling the service role key from cron.job.
-- ============================================================================

-- 1. Update sensitive fields trigger function
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


-- 2. Create trigger function for push notification
CREATE OR REPLACE FUNCTION public.tr_on_lead_push_notify()
RETURNS TRIGGER AS $$
DECLARE
    service_role_key TEXT;
BEGIN
    -- Only trigger when status transitions to 'Ny forespørgsel' or 'Bekræftet opgave'
    IF (TG_OP = 'INSERT' AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave')) OR
       (TG_OP = 'UPDATE' AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave') AND (OLD.status IS NULL OR OLD.status <> NEW.status)) THEN
       
        -- Retrieve service role key from cron job command dynamically to avoid hardcoding secrets
        SELECT substring(command from 'Bearer ([^\"]+)') INTO service_role_key 
          FROM cron.job 
         WHERE jobname = 'send-push-reminders-cron' 
         LIMIT 1;

        -- Trigger HTTP Post to send-push-reminders edge function
        PERFORM net.http_post(
            url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
            body := jsonb_build_object(
                'type', 'lead_notification',
                'lead_id', NEW.id
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_lead_status_push_notify ON public.leads;
CREATE TRIGGER tr_lead_status_push_notify
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_on_lead_push_notify();

COMMENT ON FUNCTION public.protect_lead_sensitive_fields() IS 
'Restricts svende/lærlinge from changing lead status and settings, while allowing anonymous customers to accept quotes/estimates and record audit trails.';

COMMENT ON FUNCTION public.tr_on_lead_push_notify() IS 
'Triggers an HTTP call to send-push-reminders Edge Function when a lead status is created/updated to Ny forespørgsel or Bekræftet opgave.';
