-- ============================================================================
-- TILBUDS-DATASÆT (quote_dataset) — datavolden til fremtidig AI-tilbudsmotor
-- Kør i Supabase -> SQL Editor.  Idempotent.  Additiv.
-- ============================================================================
-- FORMÅL:
-- Saml ALLE reelle tilbud (beregner OG hurtigt tilbud) + deres UDFALD ét rent,
-- struktureret, append-opdateret sted — så vi senere kan træne/retrieve på det.
-- Kilden er `leads` (rodet + RLS-afgrænset). Dette er den ML-klare projektion:
-- én række pr. sag, opdateret af en trigger når tilbud/udfald ændrer sig.
--
-- GULDET er tilbud → udfald: blev det accepteret? faktisk faktureret beløb?
-- faktiske timer (fra timeregistreringen) vs. den tilbudte pris.
--
-- ADGANG: kun superadmin (team@bisoncompany.dk) må læse. Triggeren skriver som
-- SECURITY DEFINER og er FEJL-SIKKER (en capture-fejl må ALDRIG vælte et lead-skriv).
--
-- JURA: tabellen MÅ samle nu (data I allerede opbevarer, organiseret renere). At
-- TRÆNE/SÆLGE en model på tværs af kunder kræver licens-klausulen i vilkårene
-- (separat, i den juridiske omgang) — det er en senere, separat handling.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_dataset (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                BIGINT NOT NULL UNIQUE,     -- kilde-sag (leads.id) — UNIQUE = ON CONFLICT-mål
    company_id             UUID,                       -- ejende firma (leads.carpenter_id)
    business_type          TEXT,                       -- branche (snapshot fra carpenters)

    quote_type             TEXT,                       -- 'calculator' | 'manual'
    project_category       TEXT,
    project_title          TEXT,
    region_zip             TEXT,
    region_city            TEXT,

    quoted_price           NUMERIC,                    -- tilbudt pris (price_estimate eller manuel total)
    features               JSONB DEFAULT '{}'::jsonb,  -- strukturerede input (calc_data / manual_quote) til ML

    -- Udfald (opdateres over sagens livscyklus) — DET er det trænbare:
    status                 TEXT,
    accepted               BOOLEAN DEFAULT false,
    accepted_at            TIMESTAMPTZ,
    final_invoiced_amount  NUMERIC,
    actual_hours           NUMERIC,

    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_dataset_company  ON quote_dataset(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_dataset_type     ON quote_dataset(business_type, quote_type);
CREATE INDEX IF NOT EXISTS idx_quote_dataset_accepted ON quote_dataset(accepted);

-- ----------------------------------------------------------------------------
-- 2) RLS — kun superadmin må læse. Triggeren (DEFINER) skriver udenom RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE quote_dataset ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin kan læse tilbuds-datasæt" ON quote_dataset;
CREATE POLICY "Superadmin kan læse tilbuds-datasæt"
ON quote_dataset FOR SELECT
USING ((auth.jwt() ->> 'email') = 'team@bisoncompany.dk');

-- ----------------------------------------------------------------------------
-- 3) Capture-funktion + trigger på leads
-- ----------------------------------------------------------------------------
-- Snapshotter et tilbud + dets udfald ind i quote_dataset. FEJL-SIKKER: hele
-- kroppen er pakket i EXCEPTION-håndtering, så en capture-fejl ALDRIG ruller et
-- lead-skriv tilbage. Kører kun for "reelle" tilbud (har pris/manuel/bekræftet).
CREATE OR REPLACE FUNCTION public.capture_quote_dataset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_btype   text;
    v_qtype   text;
    v_hours   numeric;
    v_accepted boolean;
    v_rd      jsonb := COALESCE(NEW.raw_data, '{}'::jsonb);
BEGIN
    -- Kun reelle tilbud (ikke tomme kladder uden noget som helst).
    IF NEW.carpenter_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.price_estimate IS NULL
       AND NOT (v_rd ? 'manual_quote')
       AND NEW.status NOT IN ('Sendt tilbud','Bekræftet opgave','Sæt i bero','Historik','Afbrudt Sag')
    THEN
        RETURN NEW;
    END IF;

    SELECT business_type INTO v_btype FROM carpenters WHERE id = NEW.carpenter_id LIMIT 1;

    v_qtype := CASE WHEN COALESCE((v_rd->>'is_manual_quote')::boolean, false) THEN 'manual' ELSE 'calculator' END;
    v_accepted := NEW.status IN ('Bekræftet opgave','Sæt i bero','Historik');

    -- Faktiske timer fra timeregistreringen (guard mod ikke-array/ugyldige tal).
    BEGIN
        SELECT COALESCE(sum((t->>'hours')::numeric), 0) INTO v_hours
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_rd->'time_entries') = 'array' THEN v_rd->'time_entries' ELSE '[]'::jsonb END) t;
    EXCEPTION WHEN OTHERS THEN v_hours := NULL;
    END;

    INSERT INTO quote_dataset AS q (
        lead_id, company_id, business_type, quote_type, project_category, project_title,
        region_zip, region_city, quoted_price, features, status, accepted, accepted_at,
        final_invoiced_amount, actual_hours, updated_at
    ) VALUES (
        NEW.id,
        NEW.carpenter_id,
        v_btype,
        v_qtype,
        COALESCE(NEW.project_category, v_rd->>'project_category'),
        v_rd->>'project_title',
        COALESCE(v_rd->'customerDetails'->>'zip', v_rd->>'zip'),
        COALESCE(v_rd->'customerDetails'->>'city', v_rd->>'city'),
        COALESCE(NEW.price_estimate, NULLIF(v_rd->'manual_quote'->>'total','')::numeric),
        -- ANONYMISERING: gem KUN de strukturerede beregnings-/tilbudsfelter til ML,
        -- og strip evt. nøgler der kan indeholde slutkunde-PII (navn/mail/tlf/adresse).
        -- quote_dataset gemmer i forvejen IKKE customer_name/email/phone.
        COALESCE(
            (CASE WHEN v_qtype = 'manual' THEN v_rd->'manual_quote' ELSE v_rd->'calc_data' END)
                - 'customerDetails' - 'customer' - 'customer_name' - 'name' - 'email' - 'phone' - 'address',
            '{}'::jsonb
        ),
        NEW.status,
        v_accepted,
        CASE WHEN v_accepted THEN COALESCE(NULLIF(v_rd->>'confirmed_at','')::timestamptz, now()) ELSE NULL END,
        NULLIF(v_rd->>'invoiced_amount','')::numeric,
        v_hours,
        now()
    )
    ON CONFLICT (lead_id) DO UPDATE SET
        company_id            = EXCLUDED.company_id,
        business_type         = EXCLUDED.business_type,
        quote_type            = EXCLUDED.quote_type,
        project_category      = EXCLUDED.project_category,
        project_title         = EXCLUDED.project_title,
        region_zip            = EXCLUDED.region_zip,
        region_city           = EXCLUDED.region_city,
        quoted_price          = EXCLUDED.quoted_price,
        features              = EXCLUDED.features,
        status                = EXCLUDED.status,
        accepted              = EXCLUDED.accepted,
        accepted_at           = COALESCE(q.accepted_at, EXCLUDED.accepted_at),
        final_invoiced_amount = EXCLUDED.final_invoiced_amount,
        actual_hours          = EXCLUDED.actual_hours,
        updated_at            = now();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Capture må ALDRIG vælte appen. Slug fejlen og lad lead-skrivet fortsætte.
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_quote_dataset ON public.leads;
CREATE TRIGGER trg_capture_quote_dataset
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.capture_quote_dataset();

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   DROP TRIGGER IF EXISTS trg_capture_quote_dataset ON public.leads;
--   DROP FUNCTION IF EXISTS public.capture_quote_dataset();
--   DROP TABLE IF EXISTS quote_dataset;
-- ============================================================================
