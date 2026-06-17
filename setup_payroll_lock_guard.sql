-- ============================================================================
-- SERVER-SIDE LØNLÅS — kør i Supabase -> SQL Editor
-- ============================================================================
-- BAGGRUND (audit #4): lønlåsen håndhæves i dag kun i browseren (isDateLocked).
-- En forældet/offline klient eller et omgået UI kan derfor skrive timer ind i en
-- allerede lønkørt og lukket periode og korrumpere bogføringen bagud.
--
-- LØSNING: 1) en SQL-funktion der SPEJLER klientens getEffectiveLockedUntil
-- (manuel locked_until + den rullende auto-lås med cycle/anchor/grace/reopen),
-- og 2) en BEFORE UPDATE-trigger på leads + carpenters der afviser ændringer af
-- timeregistreringer hvis datoen ligger i den låste periode. Den sammenligner
-- KUN de poster der ligger i låst periode — normale skrivninger (tjek-ind/ud i
-- dag, nye poster i åben periode) røres ikke. Genåbning er escape (som i UI'et).
--
-- Idempotent. Rollback nederst (udkommenteret).
-- ============================================================================

-- 1) Effektiv låsedato — 1:1 med klientens getEffectiveLockedUntil.
CREATE OR REPLACE FUNCTION public.effective_payroll_lock(p_company uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    s              payroll_settings%ROWTYPE;
    cfg            jsonb;
    v_autolock     boolean;
    v_cycle        text;
    v_anchor       date;
    v_grace        int;
    v_shifted      date;
    v_auto         date;
    v_at_auto      date;
    v_open_to      date;
    v_reopen_mark  date;
BEGIN
    SELECT * INTO s FROM payroll_settings WHERE company_id = p_company;
    IF NOT FOUND THEN RETURN NULL; END IF;

    cfg := COALESCE(s.config, '{}'::jsonb);
    v_autolock := COALESCE((cfg->>'auto_lock')::boolean, true);

    -- Manuel tilstand: den gemte locked_until er sandheden.
    IF NOT v_autolock THEN
        RETURN s.locked_until;
    END IF;

    v_cycle  := COALESCE(s.cycle, 'monthly');
    v_anchor := s.anchor;
    v_grace  := COALESCE((cfg->>'grace_days')::int, 0);
    -- Dansk lokaltid for at matche klientens new Date().
    v_shifted := ((now() AT TIME ZONE 'Europe/Copenhagen')::date) - v_grace;

    -- lastCompletedPeriodEnd(cycle, anchor, shifted)
    IF v_cycle = 'biweekly' AND v_anchor IS NOT NULL THEN
        v_auto := v_anchor + (floor((v_shifted - v_anchor) / 14.0)::int * 14) - 1;
    ELSE
        v_auto := date_trunc('month', v_shifted)::date - 1; -- sidste dag i forrige måned
    END IF;

    -- Manuel genåbning (cfg.reopen)
    v_at_auto := NULLIF(cfg->'reopen'->>'at_auto', '')::date;
    v_open_to := NULLIF(cfg->'reopen'->>'open_to', '')::date;
    IF (cfg ? 'reopen') AND v_at_auto IS NOT NULL THEN
        IF v_auto <= v_at_auto THEN
            RETURN v_open_to;       -- stadig i det genåbnede vindue
        ELSE
            RETURN v_auto;          -- ny periode afsluttet -> genlås
        END IF;
    END IF;

    -- Bagudkompatibel reopen_marker
    v_reopen_mark := NULLIF(cfg->>'reopen_marker', '')::date;
    IF v_reopen_mark IS NOT NULL AND v_auto <= v_reopen_mark THEN
        IF v_cycle = 'biweekly' THEN
            RETURN v_auto - 14;     -- previousPeriodEnd (biweekly)
        ELSE
            RETURN date_trunc('month', v_auto)::date - 1; -- previousPeriodEnd (monthly)
        END IF;
    END IF;

    RETURN v_auto;
END;
$$;

-- 2) Trigger-funktion: afvis ændring af timer i låst periode.
CREATE OR REPLACE FUNCTION public.enforce_payroll_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_service boolean;
    v_company    uuid;
    v_lock       date;
    v_lock_text  text;
    v_old_locked jsonb;
    v_new_locked jsonb;
BEGIN
    v_is_service := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );
    IF v_is_service THEN RETURN NEW; END IF;

    IF TG_TABLE_NAME = 'leads' THEN
        v_company := OLD.carpenter_id;
    ELSE
        v_company := COALESCE(OLD.company_id, OLD.id);
    END IF;

    v_lock := public.effective_payroll_lock(v_company);
    IF v_lock IS NULL THEN RETURN NEW; END IF;
    v_lock_text := to_char(v_lock, 'YYYY-MM-DD');

    -- Poster i låst periode FØR og EFTER (stabilt sorteret på id).
    SELECT COALESCE(jsonb_agg(e ORDER BY e->>'id'), '[]'::jsonb) INTO v_old_locked
      FROM jsonb_array_elements(COALESCE(OLD.raw_data->'time_entries', '[]'::jsonb)) e
     WHERE COALESCE(e->>'date','') <> '' AND left(e->>'date', 10) <= v_lock_text;

    SELECT COALESCE(jsonb_agg(e ORDER BY e->>'id'), '[]'::jsonb) INTO v_new_locked
      FROM jsonb_array_elements(COALESCE(NEW.raw_data->'time_entries', '[]'::jsonb)) e
     WHERE COALESCE(e->>'date','') <> '' AND left(e->>'date', 10) <= v_lock_text;

    -- Kun hvis en post i den låste periode er tilføjet/fjernet/ændret.
    IF v_old_locked IS DISTINCT FROM v_new_locked THEN
        RAISE EXCEPTION 'Lønperioden er låst til og med % — genåbn perioden for at ændre timer her.', v_lock_text;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payroll_lock_leads ON leads;
CREATE TRIGGER trg_payroll_lock_leads
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payroll_lock();

DROP TRIGGER IF EXISTS trg_payroll_lock_carpenters ON carpenters;
CREATE TRIGGER trg_payroll_lock_carpenters
BEFORE UPDATE ON carpenters
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payroll_lock();

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
-- DROP TRIGGER IF EXISTS trg_payroll_lock_leads ON leads;
-- DROP TRIGGER IF EXISTS trg_payroll_lock_carpenters ON carpenters;
-- DROP FUNCTION IF EXISTS public.enforce_payroll_lock();
-- DROP FUNCTION IF EXISTS public.effective_payroll_lock(uuid);
-- ============================================================================
