-- ============================================================================
-- FIX: Tømrere kan gemme egen SMTP-mailopsætning
-- Kør dette script i Supabase -> SQL Editor (idempotent, helt sikkert at køre).
-- ============================================================================
-- Problem:
--   Når man gemmer SMTP-indstillinger fejlede det med:
--   "Could not find the 'smtp_settings' column of 'carpenter_secrets' in the
--    schema cache".
--   Årsag: kolonnen smtp_settings blev aldrig oprettet på tabellen — koden
--   (SmtpIntegration.jsx + api/send-email.js) forventer den, men den fandtes ikke.
--
-- Løsning:
--   Tilføj kolonnen smtp_settings (JSONB) og bed PostgREST genindlæse skema-cachen.
-- ============================================================================

ALTER TABLE public.carpenter_secrets
  ADD COLUMN IF NOT EXISTS smtp_settings JSONB;

-- Genindlæs PostgREST's skema-cache med det samme, så 'smtp_settings' er kendt
-- uden at vente på en automatisk reload.
NOTIFY pgrst, 'reload schema';
