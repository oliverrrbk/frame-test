-- 1. Sikre at quote_token altid eksisterer
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_token UUID UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_signature TEXT;

-- 2. Funktion til at hente data via hemmeligt token (Bypasser RLS sikkert)
CREATE OR REPLACE FUNCTION get_lead_by_token(token_val UUID)
RETURNS SETOF leads
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM leads WHERE quote_token = token_val LIMIT 1;
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
          'audit_trail_opened', new_raw_data->'audit_trail_opened',
          'synced_to_accounting', new_raw_data->'synced_to_accounting',
          'synced_to_management', new_raw_data->'synced_to_management',
          'invoice_id', new_raw_data->'invoice_id'
        ))
      ELSE raw_data
    END,
    opened_at = COALESCE(new_opened_at, opened_at)
  WHERE quote_token = token_val;
END;
$$;
