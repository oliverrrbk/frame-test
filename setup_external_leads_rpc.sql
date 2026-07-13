-- ============================================================================
-- EKSTERNE SAGER FOR KONVERTEREDE GÆSTER  —  get_my_external_leads()
-- Kør i Supabase -> SQL Editor.  Idempotent.  Rollback nederst.
-- ============================================================================
-- BAGGRUND:
-- Når en gæst konverterer til sit eget firma (api/convert-guest.js) bevares hans
-- project_members-rækker, så han beholder adgangen til de sager han var
-- underentreprenør på. MEN mester-appens sags-hentning er FIRMA-afgrænset
-- (leads WHERE carpenter_id = mit-firma), så disse "hos andre"-sager forsvinder
-- fra visningen. Denne funktion henter netop dem — MASKERET — så de kan vises i
-- en egen "Underleverandør (hos andre)"-sektion i Sager & Ordrestyring.
--
-- HVORFOR EGEN FUNKTION (ikke get_visible_leads):
-- get_visible_leads() maskerer KUN for role in (worker/apprentice/guest). En
-- konverteret gæst er nu 'admin' → ville få FULD økonomi på den inviterende
-- mesters sager. Denne funktion maskerer ØKONOMI uafhængigt af rolle, men KUN for
-- de eksterne sager (carpenter_id <> eget firma), så mesterens priser/avance
-- ALDRIG lækker — i tråd med hele gæste-designet (samme maske som gæste-grenen).
--
-- SIKKERHED: SECURITY INVOKER → RLS på leads gælder. WHERE-grenen bruger
-- is_project_member() (SECURITY DEFINER, defineret i setup_guest_access.sql), så
-- kun AKTIVE medlemskaber giver adgang. Egne sager udelades eksplicit.
--
-- Denne fil er selvstændig og additiv (kun en funktion — rører ingen tabel-data).
-- NB: setup_guest_access.sql er nu sikker at gen-køre — den dropper KUN
-- project_members hvis tabellen er TOM (aldrig når der er live gæster).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_external_leads()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_company uuid;
BEGIN
    SELECT coalesce(company_id, id) INTO v_company FROM carpenters WHERE id = auth.uid();

    RETURN QUERY
        SELECT
            jsonb_set(
                jsonb_set(to_jsonb(l), '{price_estimate}', 'null'::jsonb),
                '{raw_data}',
                (
                    COALESCE(l.raw_data, '{}'::jsonb)
                    - 'calc_data' - 'invoice_history' - 'invoiced_amount'
                    - 'actual_quote_price' - 'supplier_invoices' - 'case_messages'
                    || jsonb_build_object(
                        'material_list',
                        COALESCE((
                            SELECT jsonb_agg(m - 'price' - 'markup')
                            FROM jsonb_array_elements(COALESCE(l.raw_data->'material_list', '[]'::jsonb)) m
                        ), l.raw_data->'material_list')
                    )
                    -- Kun EGNE timer (ikke andres) — som gæste-masken.
                    || jsonb_build_object(
                        'time_entries',
                        COALESCE((
                            SELECT jsonb_agg(t)
                            FROM jsonb_array_elements(COALESCE(l.raw_data->'time_entries', '[]'::jsonb)) t
                            WHERE t->>'employeeId' = auth.uid()::text
                        ), '[]'::jsonb)
                    )
                )
            )
        FROM leads l
        WHERE l.status IS DISTINCT FROM 'Slettet'
          AND l.carpenter_id IS DISTINCT FROM v_company     -- IKKE egne sager
          AND public.is_project_member(l.id, auth.uid())    -- kun sager jeg er aktiv gæst/UE på
        ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_external_leads() TO authenticated;

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   DROP FUNCTION IF EXISTS public.get_my_external_leads();
-- ============================================================================
