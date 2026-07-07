-- ============================================================================
-- Personligt arbejdstempo på beregneren — kør i Supabase -> SQL Editor.
-- Additivt. Tilføjer én kolonne til `settings`:
--   speed_factor = universel multiplikator på IKKE-materiale-delen af prisen
--   (timer + buffer + kørsel). 1.0 = neutral. <1.0 = hurtigere/billigere,
--   >1.0 = langsommere/dyrere. Materialepriser røres ALDRIG (jf. calibration.js).
--
-- Sættes i simulatorens "Tilpas beregning" og i "Hvor hurtigt laver du opgaven?"
-- under simulator-knappen. Anvendes universelt i alle tilbud, fordi
-- fetchCalibrationFactor() (src/utils/calibration.js) ganger den ind i den
-- kalibreringsfaktor som Wizard sender til performCalculation().
-- ============================================================================

ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS speed_factor NUMERIC NOT NULL DEFAULT 1.0;

-- Sikkerhedsnet: hold værdien inden for et fornuftigt spænd (0.5–2.0).
ALTER TABLE public.settings
    DROP CONSTRAINT IF EXISTS settings_speed_factor_range;
ALTER TABLE public.settings
    ADD CONSTRAINT settings_speed_factor_range
    CHECK (speed_factor >= 0.5 AND speed_factor <= 2.0);
