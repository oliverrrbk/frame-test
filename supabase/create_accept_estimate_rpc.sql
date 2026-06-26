-- ============================================================================
-- SQL Migration: Opret accept_estimate_by_token RPC (Bison Frame)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- Formål:
-- Lader uregistrerede / anonyme gæster (kunder) opdatere status og kontaktindstillinger
-- på deres eget lead på en 100% sikker måde ved hjælp af et hemmeligt UUID token.
--
-- Sikkerhed:
-- 1. Bypasser RLS ved at køre som SECURITY DEFINER.
-- 2. Kræver det hemmelige quote_token (UUID), som kun kunden kender fra sit overslag.
-- 3. Tillader KUN at opdatere, hvis nuværende status er 'Overslag (Afventer)' eller 'Ny forespørgsel'.
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_estimate_by_token(token_val UUID, preference_val TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasser RLS sikkert under kørsel
SET search_path = public
AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE leads
    SET 
        status = 'Ny forespørgsel',
        contact_preference = preference_val
    WHERE quote_token = token_val
      AND (status = 'Overslag (Afventer)' OR status = 'Ny forespørgsel');
      
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows > 0;
END;
$$;

-- Tilføj kommentar til dokumentation i Supabase
COMMENT ON FUNCTION accept_estimate_by_token IS 
'Opdaterer sikkert status på et lead til Ny forespørgsel baseret på det hemmelige quote_token UUID.';
