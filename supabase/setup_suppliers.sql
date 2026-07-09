-- ============================================================================
-- SQL Migration: Leverandør-bibliotek (suppliers-tabel)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- BAGGRUND:
--   Leverandører (fx Davidsen, Stark) fandtes indtil nu KUN som fritekst pr. sag
--   i leads.raw_data.material_supplier. Samme leverandør på 20 sager = 20 løsrevne
--   kopier, og man måtte taste navn/kontakt/mail forfra hver gang man sendte en
--   materialeliste.
--
-- LØSNING:
--   Ny tabel `suppliers` — ét leverandørkort pr. firma (carpenter_id = firma-rod,
--   præcis som customers/leads). Gemmes én gang og genvælges i materialeliste-flowet.
--   RLS er firma-afgrænset (samme mønster som customers). Man ser ALDRIG andre
--   firmaers leverandører. INGEN backfill (leverandør-fritekst pr. sag bevares som den er).
--
-- FIRMA-MODEL (samme som resten af systemet):
--   carpenter_id = firma-roden (mesterens id). En carpenters-række har `id` +
--   `company_id` (= firma-roden). Ejeren har company_id = egen id.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    carpenter_id  uuid NOT NULL REFERENCES public.carpenters(id) ON DELETE CASCADE,
    name          text NOT NULL,                     -- leverandørens firmanavn (fx Davidsen)
    contact_name  text,                              -- kontaktperson (fx Kenneth)
    email         text,                              -- salg@davidsen.dk
    phone         text,
    address       text,
    zip           text,
    city          text,
    notes         text,
    logo_url      text,                              -- logo/billede (avatars-bucket)
    created_by    uuid,                              -- hvem oprettede leverandøren
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_carpenter ON public.suppliers(carpenter_id);
-- Hurtig søgning på navn pr. firma (biblioteket + leverandørvælger i materialeliste)
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(carpenter_id, lower(name));

-- Hold updated_at frisk
CREATE OR REPLACE FUNCTION public.touch_suppliers_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.touch_suppliers_updated_at();

-- ----------------------------------------------------------------------------
-- 2) RLS — firma-afgrænset (samme mønster som customers)
-- ----------------------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Hjælpe-udtryk: "denne leverandør tilhører mit firma".
--   carpenter_id = auth.uid()  → jeg ER firma-roden (ejer)
--   ELLER jeg er ansat i firmaet (carpenters.company_id = suppliers.carpenter_id)
DROP POLICY IF EXISTS "Firma kan se egne leverandoerer" ON public.suppliers;
CREATE POLICY "Firma kan se egne leverandoerer"
ON public.suppliers FOR SELECT
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = suppliers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan oprette leverandoerer" ON public.suppliers;
CREATE POLICY "Firma kan oprette leverandoerer"
ON public.suppliers FOR INSERT
WITH CHECK (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = suppliers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan opdatere leverandoerer" ON public.suppliers;
CREATE POLICY "Firma kan opdatere leverandoerer"
ON public.suppliers FOR UPDATE
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = suppliers.carpenter_id
    )
);

DROP POLICY IF EXISTS "Firma kan slette leverandoerer" ON public.suppliers;
CREATE POLICY "Firma kan slette leverandoerer"
ON public.suppliers FOR DELETE
USING (
    auth.uid() = carpenter_id
    OR EXISTS (
        SELECT 1 FROM carpenters c
        WHERE c.id = auth.uid() AND c.company_id = suppliers.carpenter_id
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;

COMMENT ON TABLE public.suppliers IS
'Leverandør-bibliotek: ét leverandørkort pr. firma (carpenter_id = firma-rod). Genvælges i materialeliste-flowet. RLS er firma-afgrænset som customers.';
