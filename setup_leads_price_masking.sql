-- ============================================================================
-- PRIS-MASKERING FOR SVENDE/LÆRLINGE — kør i Supabase -> SQL Editor
-- ============================================================================
-- BAGGRUND (audit #6): RLS er rækkeniveau og giver hele rækken — så en tildelt
-- svend/lærling kan via devtools/netværk læse pris, avance og calc_data på de
-- sager han er på (UI'et skjuler dem kun). Økonomi-data kan IKKE flyttes til en
-- separat tabel, da de skrives af låste filer (Wizard m.fl.).
--
-- LØSNING: en SECURITY INVOKER-RPC (RLS afgør stadig hvilke RÆKKER man ser) der
-- FJERNER økonomi-felterne for svend/lærling — undtagen på deres EGNE kladder
-- (som de selv har lavet og skal kunne se prisen på). Klienten henter via denne
-- RPC for de roller, så prisdata aldrig forlader serveren til en svend.
--
-- Bevaret: navne/mængder i materialelisten (svenden skal kunne se HVAD der skal
-- bruges — bare ikke priserne), samt alt ikke-økonomisk (checkliste, timer, hold).
--
-- Idempotent. Rollback nederst (udkommenteret).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_visible_leads()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM carpenters WHERE id = auth.uid();

    -- Alle andre end svend/lærling: fuld adgang (RLS afgør rækkerne).
    IF v_role IS DISTINCT FROM 'worker' AND v_role IS DISTINCT FROM 'apprentice' THEN
        RETURN QUERY
            SELECT to_jsonb(l) FROM leads l
            WHERE l.status IS DISTINCT FROM 'Slettet'
            ORDER BY l.created_at DESC;
        RETURN;
    END IF;

    -- Svend/lærling: maskér økonomi (men ikke på egne kladder).
    RETURN QUERY
        SELECT
            CASE
                WHEN (l.raw_data->>'created_by') = auth.uid()::text THEN to_jsonb(l)
                ELSE jsonb_set(
                        jsonb_set(to_jsonb(l), '{price_estimate}', 'null'::jsonb),
                        '{raw_data}',
                        (
                            COALESCE(l.raw_data, '{}'::jsonb)
                            - 'calc_data' - 'invoice_history' - 'invoiced_amount'
                            - 'actual_quote_price' - 'supplier_invoices'
                        )
                        -- behold materialelistens navne/mængder, men fjern priser
                        || jsonb_build_object(
                            'material_list',
                            COALESCE((
                                SELECT jsonb_agg(m - 'price' - 'markup')
                                FROM jsonb_array_elements(COALESCE(l.raw_data->'material_list', '[]'::jsonb)) m
                            ), l.raw_data->'material_list')
                        )
                     )
            END
        FROM leads l
        WHERE l.status IS DISTINCT FROM 'Slettet'
        ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_leads() TO authenticated;

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
-- DROP FUNCTION IF EXISTS public.get_visible_leads();
-- ============================================================================
