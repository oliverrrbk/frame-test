-- ============================================================================
-- ATOMISK SHALLOW-MERGE AF leads.raw_data
-- Kør i Supabase -> SQL Editor. Idempotent. Additiv.
-- ============================================================================
-- BAGGRUND:
-- Mange klient-skrivninger gjorde "læs raw_data -> spread i JS -> skriv HELE
-- bloben tilbage". To brugere på samme sag samtidig: den anden skrivning er
-- bygget på et øjebliksbillede fra FØR den første blev gemt, så den førstes
-- ændring forsvandt (lost update) — fx kunne en materiale-opdatering overskrive
-- en netop registreret time-/besked-ændring.
--
-- LØSNING: flet KUN de ændrede top-level-nøgler ind, server-side, mod den LEVENDE
-- række: raw_data = raw_data || p_patch. Andre nøgler bevares uanset hvad der er
-- sket imens. (Samtidige skrivninger til SAMME nøgle er fortsat sidste-vinder —
-- de hyppigste samtidige felter, time_entries/case_messages/calendar_events, har
-- allerede deres egne remove+append-RPC'er der serialiserer korrekt.)
--
-- SECURITY INVOKER: kører som kalderen, så leads-RLS OG
-- protect_lead_sensitive_fields()-triggeren gælder fuldstændig som ved en
-- almindelig UPDATE. Ingen rettigheds-udvidelse.
-- p_id er BIGINT (leads.id).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mutate_lead_raw_data(p_id BIGINT, p_patch JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_raw JSONB;
BEGIN
    IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
        RAISE EXCEPTION 'p_patch skal være et JSON-objekt';
    END IF;

    UPDATE leads
       SET raw_data = COALESCE(raw_data, '{}'::jsonb) || p_patch
     WHERE id = p_id
    RETURNING raw_data INTO v_raw;

    RETURN v_raw;  -- NULL hvis ingen række blev ramt (RLS/ukendt id)
END;
$$;

GRANT EXECUTE ON FUNCTION public.mutate_lead_raw_data(BIGINT, JSONB) TO authenticated;

-- ============================================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.mutate_lead_raw_data(BIGINT, JSONB);
-- ============================================================================
