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


-- 2. Create trigger function for push notification
CREATE OR REPLACE FUNCTION public.tr_on_lead_push_notify()
RETURNS TRIGGER AS $$
DECLARE
    service_role_key TEXT;
    v_new_msg jsonb;
    v_msg_exists boolean;
    v_added_workers jsonb;
    v_added_pms jsonb;
    v_new_agr jsonb;
    v_agr_confirmed boolean;
BEGIN
    -- Retrieve service role key from cron job command dynamically to avoid hardcoding secrets
    SELECT substring(command from 'Bearer ([^\"]+)') INTO service_role_key 
      FROM cron.job 
     WHERE jobname = 'send-push-reminders-cron' 
     LIMIT 1;

    -- 1. Status transition push notifications
    IF (TG_OP = 'INSERT' AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave')) OR
       (TG_OP = 'UPDATE' AND NEW.status IN ('Ny forespørgsel', 'Bekræftet opgave') AND (OLD.status IS NULL OR OLD.status <> NEW.status)) THEN
       
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

    -- 2. Worker assignment notifications
    v_added_workers := '[]'::jsonb;
    v_added_pms := '[]'::jsonb;
    
    IF TG_OP = 'INSERT' THEN
        IF jsonb_typeof(COALESCE(NEW.raw_data->'assigned_workers', '[]'::jsonb)) = 'array' THEN
            v_added_workers := NEW.raw_data->'assigned_workers';
        END IF;
        IF jsonb_typeof(COALESCE(NEW.raw_data->'assigned_pm', '[]'::jsonb)) = 'array' THEN
            v_added_pms := NEW.raw_data->'assigned_pm';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF COALESCE(NEW.raw_data->'assigned_workers', '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.raw_data->'assigned_workers', '[]'::jsonb) 
           AND jsonb_typeof(COALESCE(NEW.raw_data->'assigned_workers', '[]'::jsonb)) = 'array' THEN
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_added_workers
            FROM jsonb_array_elements_text(COALESCE(NEW.raw_data->'assigned_workers', '[]'::jsonb)) AS elem
            WHERE jsonb_typeof(COALESCE(OLD.raw_data->'assigned_workers', '[]'::jsonb)) <> 'array' 
               OR NOT (COALESCE(OLD.raw_data->'assigned_workers', '[]'::jsonb) ? elem);
        END IF;
        
        IF COALESCE(NEW.raw_data->'assigned_pm', '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.raw_data->'assigned_pm', '[]'::jsonb)
           AND jsonb_typeof(COALESCE(NEW.raw_data->'assigned_pm', '[]'::jsonb)) = 'array' THEN
            SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_added_pms
            FROM jsonb_array_elements_text(COALESCE(NEW.raw_data->'assigned_pm', '[]'::jsonb)) AS elem
            WHERE jsonb_typeof(COALESCE(OLD.raw_data->'assigned_pm', '[]'::jsonb)) <> 'array'
               OR NOT (COALESCE(OLD.raw_data->'assigned_pm', '[]'::jsonb) ? elem);
        END IF;
    END IF;

    IF jsonb_array_length(v_added_workers) > 0 OR jsonb_array_length(v_added_pms) > 0 THEN
        PERFORM net.http_post(
            url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
            body := jsonb_build_object(
                'type', 'new_assignment',
                'lead_id', NEW.id,
                'added_workers', v_added_workers,
                'added_pms', v_added_pms
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
            )
        );
    END IF;

    -- 3. Case message notification
    IF TG_OP = 'UPDATE' AND COALESCE(NEW.raw_data->'case_messages', '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.raw_data->'case_messages', '[]'::jsonb) THEN
        v_new_msg := NEW.raw_data->'case_messages'->-1;
        IF v_new_msg IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.raw_data->'case_messages', '[]'::jsonb)) AS elem
                WHERE elem->>'id' = v_new_msg->>'id'
            ) INTO v_msg_exists;

            IF NOT v_msg_exists THEN
                PERFORM net.http_post(
                    url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
                    body := jsonb_build_object(
                        'type', 'case_message_notification',
                        'lead_id', NEW.id,
                        'message', v_new_msg
                    ),
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
                    )
                );
            END IF;
        END IF;
    END IF;

    -- 4. Kunde har åbnet tilbuddet (kun første åbning: opened_at går null → tid)
    IF TG_OP = 'UPDATE' AND OLD.opened_at IS NULL AND NEW.opened_at IS NOT NULL THEN
        PERFORM net.http_post(
            url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
            body := jsonb_build_object(
                'type', 'quote_opened',
                'lead_id', NEW.id
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
            )
        );
    END IF;

    -- 5. Aftaleseddel (ekstraarbejde) bekræftet af kunde: et element i extra_agreements
    --    skifter til 'bekraeftet'/'Godkendt', og var ikke bekræftet i forvejen.
    IF TG_OP = 'UPDATE' AND COALESCE(NEW.raw_data->'extra_agreements', '[]'::jsonb) IS DISTINCT FROM COALESCE(OLD.raw_data->'extra_agreements', '[]'::jsonb) THEN
        FOR v_new_agr IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.raw_data->'extra_agreements', '[]'::jsonb))
        LOOP
            IF (v_new_agr->>'status') IN ('bekraeftet', 'Godkendt') THEN
                SELECT EXISTS (
                    SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.raw_data->'extra_agreements', '[]'::jsonb)) AS oe
                    WHERE oe->>'id' = v_new_agr->>'id'
                      AND (oe->>'status') IN ('bekraeftet', 'Godkendt')
                ) INTO v_agr_confirmed;

                IF NOT v_agr_confirmed THEN
                    PERFORM net.http_post(
                        url := 'https://zjbjupovlgwlrvojusnr.supabase.co/functions/v1/send-push-reminders',
                        body := jsonb_build_object(
                            'type', 'agreement_confirmed',
                            'lead_id', NEW.id,
                            'agreement_id', v_new_agr->>'id'
                        ),
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
                        )
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
