-- 1. Create a sequence that starts at 1000
CREATE SEQUENCE IF NOT EXISTS leads_case_number_seq START 1000;

-- 2. Add the column to the leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS case_number INTEGER;

-- 3. Backfill existing rows, ordered by created_at so older leads get lower numbers
-- We use a CTE to assign row numbers starting from current value of sequence (which is 1000)
DO $$
DECLARE
    r RECORD;
    next_num INTEGER;
BEGIN
    FOR r IN SELECT id FROM leads WHERE case_number IS NULL ORDER BY created_at ASC LOOP
        next_num := nextval('leads_case_number_seq');
        UPDATE leads SET case_number = next_num WHERE id = r.id;
    END LOOP;
END $$;

-- 4. Set the default value to automatically use the sequence for new rows
ALTER TABLE leads ALTER COLUMN case_number SET DEFAULT nextval('leads_case_number_seq');

-- 5. Optional: Add a unique constraint to ensure no collisions
ALTER TABLE leads ADD CONSTRAINT leads_case_number_unique UNIQUE (case_number);
