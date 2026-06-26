-- 1. Sikre at quote_token altid eksisterer
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_token UUID UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_signature TEXT;

-- 2. Funktion til at hente data via hemmeligt token (Bypasser RLS sikkert)
-- SIKKERHED: tilbuds-linket er offentligt (token i URL), så vi må ikke udlevere
-- INTERNE post-salgs-tal. calc_data + quote_settings BEHOLDES (kundesiden regner
-- tilbuds-totalen ud fra dem), men rent interne felter strippes: hvad der er
-- faktureret, leverandør-fakturaer, faktisk salgspris og intern kommunikation/timer.
-- (Disse læses aldrig af QuoteAccept/EstimateAccept/AgreementConfirm-siderne.)
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

-- 3. Funktion til at opdatere lead via hemmeligt token (Bypasser RLS sikkert)
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
AS $$
BEGIN
  -- Sikkerhed: Tillad KUN overgang til specifikke tilladte statusser via public token
  IF new_status IS NOT NULL AND new_status NOT IN ('Bekræftet opgave') THEN
    RAISE EXCEPTION 'Ugyldig statusændring via public token';
  END IF;

  UPDATE leads 
  SET 
    status = COALESCE(new_status, status), 
    raw_data = CASE 
      WHEN new_raw_data IS NOT NULL THEN
        -- Sikkerhed: Ignorer resten af new_raw_data (f.eks. manipulerede priser), 
        -- og udtræk og merge KUN de felter, der er sikre at opdatere fra kunde-siden.
        raw_data || jsonb_strip_nulls(jsonb_build_object(
          'audit_trail', new_raw_data->'audit_trail',
          'audit_trail_opened', new_raw_data->'audit_trail_opened'
        ))
      ELSE raw_data
    END,
    opened_at = COALESCE(new_opened_at, opened_at)
  WHERE quote_token = token_val;
END;
$$;
