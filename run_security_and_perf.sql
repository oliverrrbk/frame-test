-- ============================================================================
-- SAMLET KØRSEL: sikkerhed + ydelse (juni 2026)
-- Kør HELE filen i Supabase -> SQL Editor. Idempotent. Additiv. Sikker at gen-køre.
-- Rækkefølge: vigtigst først; valgfri search_path-hærdning i fejl-sikre blokke til sidst.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Atomisk shallow-merge af leads.raw_data (lost-update fix)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mutate_lead_raw_data(p_id BIGINT, p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_raw JSONB;
BEGIN
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
        RAISE EXCEPTION 'p_patch skal være et JSON-objekt';
    END IF;

    UPDATE leads
       SET raw_data = COALESCE(raw_data, '{}'::jsonb) || p_patch
     WHERE id = p_id
    RETURNING raw_data INTO v_raw;

    RETURN v_raw;  -- NULL hvis ingen række blev ramt (RLS/ukendt id)
END;
$$;

GRANT EXECUTE ON FUNCTION public.mutate_lead_raw_data(BIGINT, JSONB) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2) Indeks på leads (fjern fuld tabel-scan i RLS + dashboard-fetch)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_carpenter_created
    ON leads (carpenter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
    ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status
    ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_workers
    ON leads USING gin ((raw_data -> 'assigned_workers') jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_pm
    ON leads USING gin ((raw_data -> 'assigned_pm') jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_leads_invoice_history
    ON leads USING gin ((raw_data -> 'invoice_history') jsonb_path_ops);


-- ----------------------------------------------------------------------------
-- 3) Maskér det offentlige tilbuds-link (get_lead_by_token)
--    calc_data + quote_settings beholdes (kundesiden regner totalen ud fra dem),
--    men interne post-salgs-tal + intern chat/timer strippes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_lead_by_token(token_val UUID)
RETURNS SETOF leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (jsonb_populate_record(
            NULL::leads,
            to_jsonb(l) || jsonb_build_object(
              'raw_data',
              COALESCE(l.raw_data, '{}'::jsonb)
                - 'invoice_history'
                - 'invoiced_amount'
                - 'supplier_invoices'
                - 'actual_quote_price'
                - 'case_messages'
                - 'time_entries'
            )
         )).*
  FROM leads l
  WHERE l.quote_token = token_val
  LIMIT 1;
$$;


-- ----------------------------------------------------------------------------
-- 4) VALGFRI hærdning: SET search_path på øvrige SECURITY DEFINER-funktioner.
--    Fejl-sikkert: hvis en funktion ikke findes hos dig, springes den bare over.
-- ----------------------------------------------------------------------------
DO $$ BEGIN ALTER FUNCTION public.protect_carpenter_sensitive_cols() SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip protect_carpenter_sensitive_cols'; END $$;

DO $$ BEGIN ALTER FUNCTION public.get_public_carpenter(uuid) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_public_carpenter'; END $$;

DO $$ BEGIN ALTER FUNCTION public.get_public_carpenter_by_slug(text) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_public_carpenter_by_slug'; END $$;

DO $$ BEGIN ALTER FUNCTION public.confirm_agreement_by_token(uuid, text, jsonb) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip confirm_agreement_by_token'; END $$;

DO $$ BEGIN ALTER FUNCTION public.accept_estimate_by_token(uuid, text) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip accept_estimate_by_token'; END $$;

DO $$ BEGIN ALTER FUNCTION public.get_user_company_id(uuid) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_user_company_id'; END $$;

DO $$ BEGIN ALTER FUNCTION public.check_user_in_thread(uuid, uuid) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip check_user_in_thread'; END $$;

DO $$ BEGIN ALTER FUNCTION public.tr_on_chat_message_notify() SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip tr_on_chat_message_notify'; END $$;

DO $$ BEGIN ALTER FUNCTION public.tr_on_lead_push_notify() SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip tr_on_lead_push_notify'; END $$;

DO $$ BEGIN ALTER FUNCTION public.update_lead_by_token(uuid, text, jsonb, timestamptz) SET search_path = public;
EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip update_lead_by_token'; END $$;

-- ============================================================================
-- FÆRDIG. Tjek "Messages"-fanen for evt. "skip ..."-noter (uskadelige).
-- ============================================================================
