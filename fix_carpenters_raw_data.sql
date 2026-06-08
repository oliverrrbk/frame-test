-- Dette script tilføjer den manglende 'raw_data' kolonne til 'carpenters' tabellen
-- Kopiér hele koden, indsæt den i Supabase -> SQL Editor og tryk RUN!

ALTER TABLE carpenters ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;
NOTIFY pgrst, 'reload schema';
