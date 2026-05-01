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
  UPDATE leads 
  SET 
    status = COALESCE(new_status, status), 
    raw_data = COALESCE(new_raw_data, raw_data),
    opened_at = COALESCE(new_opened_at, opened_at)
  WHERE quote_token = token_val;
END;
$$;
