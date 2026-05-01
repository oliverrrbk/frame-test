-- Tilføjelse af kolonner til at understøtte Digitale Web Tilbud
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS quote_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_signature TEXT;
