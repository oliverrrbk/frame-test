-- ============================================================================
-- TILBUDS-SKABELONER (arbejdsbeskrivelse) — kør i Supabase -> SQL Editor
-- ============================================================================
-- Genbrugelige rich-text-skabeloner til feltet "Arbejdsbeskrivelse" i Hurtigt
-- tilbud. Tømreren bygger en skabelon én gang, og kan derefter indsætte og rette
-- den på et nyt tilbud.
--
-- DELING: skabeloner gemmes pr. FIRMA (carpenter_id = firma-roden, dvs.
-- company_id || egen id), så hele teamet deler de samme skabeloner.
-- SIKKERHED: kun firmaets egne medlemmer kan se/rette/oprette/slette.
-- Additivt + idempotent. Rollback nederst.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quote_templates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    carpenter_id uuid NOT NULL,                 -- firma-roden (company_id || egen id)
    name         text NOT NULL,                 -- vist på skabelon-chippen
    body_html    text NOT NULL DEFAULT '',      -- rich-text (samme HTML som editoren/PDF'en)
    created_by   uuid,                          -- hvem oprettede den (info)
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_owner
    ON public.quote_templates(carpenter_id, created_at DESC);

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Hjælpe-udtryk: "tilhører den indloggede bruger dette firma?"
--   - ejeren selv: auth.uid() = carpenter_id (firma-roden er ejerens id)
--   - et team-medlem: dets company_id peger på firma-roden
-- Bruges ens i alle fire politikker.

-- LÆS
DROP POLICY IF EXISTS "firmaets medlemmer kan læse skabeloner" ON public.quote_templates;
CREATE POLICY "firmaets medlemmer kan læse skabeloner" ON public.quote_templates
    FOR SELECT TO authenticated
    USING (
        auth.uid() = carpenter_id
        OR EXISTS (
            SELECT 1 FROM public.carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = quote_templates.carpenter_id OR c.id = quote_templates.carpenter_id)
        )
    );

-- OPRET
DROP POLICY IF EXISTS "firmaets medlemmer kan oprette skabeloner" ON public.quote_templates;
CREATE POLICY "firmaets medlemmer kan oprette skabeloner" ON public.quote_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = carpenter_id
        OR EXISTS (
            SELECT 1 FROM public.carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = quote_templates.carpenter_id OR c.id = quote_templates.carpenter_id)
        )
    );

-- RET
DROP POLICY IF EXISTS "firmaets medlemmer kan rette skabeloner" ON public.quote_templates;
CREATE POLICY "firmaets medlemmer kan rette skabeloner" ON public.quote_templates
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = carpenter_id
        OR EXISTS (
            SELECT 1 FROM public.carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = quote_templates.carpenter_id OR c.id = quote_templates.carpenter_id)
        )
    )
    WITH CHECK (
        auth.uid() = carpenter_id
        OR EXISTS (
            SELECT 1 FROM public.carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = quote_templates.carpenter_id OR c.id = quote_templates.carpenter_id)
        )
    );

-- SLET
DROP POLICY IF EXISTS "firmaets medlemmer kan slette skabeloner" ON public.quote_templates;
CREATE POLICY "firmaets medlemmer kan slette skabeloner" ON public.quote_templates
    FOR DELETE TO authenticated
    USING (
        auth.uid() = carpenter_id
        OR EXISTS (
            SELECT 1 FROM public.carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = quote_templates.carpenter_id OR c.id = quote_templates.carpenter_id)
        )
    );

-- Hold updated_at frisk ved rettelser.
CREATE OR REPLACE FUNCTION public.touch_quote_templates_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_templates_updated_at ON public.quote_templates;
CREATE TRIGGER trg_quote_templates_updated_at
    BEFORE UPDATE ON public.quote_templates
    FOR EACH ROW EXECUTE FUNCTION public.touch_quote_templates_updated_at();

-- ============================================================================
-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_quote_templates_updated_at ON public.quote_templates;
-- DROP FUNCTION IF EXISTS public.touch_quote_templates_updated_at();
-- DROP TABLE IF EXISTS public.quote_templates;
-- ============================================================================
