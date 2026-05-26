-- ============================================================================
-- SQL Migration: Tillad anonyme opdateringer af leads via RLS (Bison Frame)
-- Kør dette script i Supabase -> SQL Editor.
-- ============================================================================
-- Formål:
-- Lader uregistrerede / anonyme gæster (kunder) opdatere status og kontaktindstillinger
-- på leads, når de accepterer et overslag på mobilen.
--
-- Sikkerhed:
-- Kunder må KUN opdatere leads, der har status 'Overslag (Afventer)' eller 'Ny forespørgsel'.
-- Leads i beskyttede tilstande som 'Sendt tilbud', 'Bekræftet opgave' eller 'Historik'
-- kan ALDRIG opdateres eller manipuleres af anonyme gæster.
-- ============================================================================

-- Fjern eksisterende policy hvis den findes, så vi undgår fejl ved kørsel
DROP POLICY IF EXISTS "Tillad at anonyme kunder kan opdatere deres egne leads" ON leads;

-- Opret ny UPDATE policy
CREATE POLICY "Tillad at anonyme kunder kan opdatere deres egne leads"
ON leads FOR UPDATE
TO public
USING (status = 'Overslag (Afventer)' OR status = 'Ny forespørgsel')
WITH CHECK (status = 'Overslag (Afventer)' OR status = 'Ny forespørgsel');

-- Bekræftelse
COMMENT ON POLICY "Tillad at anonyme kunder kan opdatere deres egne leads" ON leads IS
'Sikker policy der tillader at uautoriserede gæster kan acceptere overslag og opgradere dem til Ny forespørgsel.';
