-- Funktion til at lade kunder hente deres tilbud via det hemmelige token
CREATE OR REPLACE FUNCTION get_lead_by_token(token_val UUID)
RETURNS SETOF leads
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM leads WHERE quote_token = token_val LIMIT 1;
$$;

-- Funktion til at lade kunder opdatere deres tilbud (Tracking & Accept) via det hemmelige token
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
