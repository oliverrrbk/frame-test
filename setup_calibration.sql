-- ============================================================================
-- Calibration tables for the auto-learning system.
-- Run once in Supabase SQL editor to provision the schema.
--
-- Læringen virker sådan:
--   1. Når en kunde kører wizarden gemmes lead.raw_data.calc_data (initial systempris).
--   2. Når tømreren via tilbudsbyggeren sender det faktiske tilbud, gemmes
--      lead.raw_data.actual_quote_price.
--   3. Et baggrundsjob (function recompute_calibration) sammenligner de to
--      tal på TVÆRS af materialedelen — kun arbejde/tillægs/kørsel/buffer.
--   4. Resultatet (en faktor pr tømrer pr kategori) cached i carpenter_calibration.
--   5. Næste gang wizarden kører ganges ikke-materiale-delen med denne faktor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Per-tømrer kalibrering
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carpenter_calibration (
    id BIGSERIAL PRIMARY KEY,
    carpenter_id UUID NOT NULL REFERENCES carpenters(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    factor NUMERIC(6,4) NOT NULL DEFAULT 1.0000,  -- 1.0 = ingen justering
    sample_size INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(carpenter_id, category)
);

CREATE INDEX IF NOT EXISTS idx_carpenter_calibration_lookup
    ON carpenter_calibration(carpenter_id, category);

-- ----------------------------------------------------------------------------
-- Globalt branche-aggregat (anonymiseret, på tværs af alle tømrere)
-- Bruges som "prior" for nye tømrere via Bayesisk vægtning.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS global_calibration (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    factor NUMERIC(6,4) NOT NULL DEFAULT 1.0000,
    sample_size INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Funktion: gen-beregn kalibrering for ALLE tømrere/kategorier.
-- Kører på leads hvor actual_quote_price er udfyldt og initial calc_data findes.
-- Ignorerer outliers (ratio < 0.5 eller > 2.0) som antaget indtastningsfejl.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_calibration()
RETURNS TABLE(rows_carpenter INT, rows_global INT) AS $$
DECLARE
    n_carp INT;
    n_glob INT;
BEGIN
    -- Per-tømrer-pr-kategori
    WITH ratios AS (
        SELECT
            l.carpenter_id,
            l.project_category AS category,
            -- ratio på IKKE-materiale-delen kun
            (l.raw_data->>'actual_quote_price')::NUMERIC
              - COALESCE((l.raw_data->'calc_data'->>'materialCost')::NUMERIC, 0)
            AS final_non_mat,
            COALESCE((l.raw_data->'calc_data'->>'finalEstimateIncVat')::NUMERIC, 0)
              - COALESCE((l.raw_data->'calc_data'->>'materialCost')::NUMERIC, 0)
            AS initial_non_mat
        FROM leads l
        WHERE l.carpenter_id IS NOT NULL
          AND l.project_category IS NOT NULL
          AND l.raw_data ? 'actual_quote_price'
          AND l.raw_data ? 'calc_data'
          AND (l.raw_data->'calc_data') ? 'materialCost'
    ),
    clean AS (
        SELECT carpenter_id, category,
               final_non_mat / NULLIF(initial_non_mat, 0) AS r
        FROM ratios
        WHERE initial_non_mat > 1000  -- undgå division af mikrosmå tal
    ),
    filtered AS (
        SELECT carpenter_id, category, r
        FROM clean
        WHERE r IS NOT NULL AND r BETWEEN 0.5 AND 2.0
    ),
    aggregated AS (
        SELECT carpenter_id, category,
               AVG(r)::NUMERIC(6,4) AS factor,
               COUNT(*)::INT AS sample_size
        FROM filtered
        GROUP BY carpenter_id, category
    )
    INSERT INTO carpenter_calibration (carpenter_id, category, factor, sample_size, last_updated)
    SELECT carpenter_id, category, factor, sample_size, now()
    FROM aggregated
    ON CONFLICT (carpenter_id, category)
    DO UPDATE SET
        factor = EXCLUDED.factor,
        sample_size = EXCLUDED.sample_size,
        last_updated = now();

    GET DIAGNOSTICS n_carp = ROW_COUNT;

    -- Globalt aggregat (samme logik, blot uden carpenter_id grouping)
    WITH ratios AS (
        SELECT
            l.project_category AS category,
            (l.raw_data->>'actual_quote_price')::NUMERIC
              - COALESCE((l.raw_data->'calc_data'->>'materialCost')::NUMERIC, 0)
            AS final_non_mat,
            COALESCE((l.raw_data->'calc_data'->>'finalEstimateIncVat')::NUMERIC, 0)
              - COALESCE((l.raw_data->'calc_data'->>'materialCost')::NUMERIC, 0)
            AS initial_non_mat
        FROM leads l
        WHERE l.project_category IS NOT NULL
          AND l.raw_data ? 'actual_quote_price'
          AND l.raw_data ? 'calc_data'
    ),
    clean AS (
        SELECT category, final_non_mat / NULLIF(initial_non_mat, 0) AS r
        FROM ratios
        WHERE initial_non_mat > 1000
    ),
    filtered AS (
        SELECT category, r FROM clean
        WHERE r IS NOT NULL AND r BETWEEN 0.5 AND 2.0
    ),
    aggregated AS (
        SELECT category,
               AVG(r)::NUMERIC(6,4) AS factor,
               COUNT(*)::INT AS sample_size
        FROM filtered
        GROUP BY category
    )
    INSERT INTO global_calibration (category, factor, sample_size, last_updated)
    SELECT category, factor, sample_size, now()
    FROM aggregated
    ON CONFLICT (category)
    DO UPDATE SET
        factor = EXCLUDED.factor,
        sample_size = EXCLUDED.sample_size,
        last_updated = now();

    GET DIAGNOSTICS n_glob = ROW_COUNT;

    rows_carpenter := n_carp;
    rows_global := n_glob;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RLS — tømrere kan kun læse deres egen kalibrering. Global er åben for alle.
-- ----------------------------------------------------------------------------
ALTER TABLE carpenter_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_calibration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carpenters read own calibration" ON carpenter_calibration;
CREATE POLICY "carpenters read own calibration" ON carpenter_calibration
    FOR SELECT USING (auth.uid() = carpenter_id);

DROP POLICY IF EXISTS "anyone read global calibration" ON global_calibration;
CREATE POLICY "anyone read global calibration" ON global_calibration
    FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- Køreplan:
--   1. Kør denne fil i Supabase SQL Editor
--   2. Kald 'SELECT * FROM recompute_calibration();' manuelt eller via cron
--      (pg_cron extension anbefales, planlæg dagligt om natten)
--   3. Brug carpenter_calibration + global_calibration tabellerne fra JS-klienten
-- ----------------------------------------------------------------------------
