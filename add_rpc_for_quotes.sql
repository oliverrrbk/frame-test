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
  UPDATE leads 
  SET 
    status = COALESCE(new_status, status), 
    raw_data = COALESCE(new_raw_data, raw_data),
    opened_at = COALESCE(new_opened_at, opened_at)
  WHERE quote_token = token_val;
END;
$$;
