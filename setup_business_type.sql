-- ============================================================================
-- BRANCHE / HÅNDVÆRKER-TYPE PÅ FIRMAET  (business_type)
-- Kør i Supabase -> SQL Editor.  Idempotent.  Additiv.
-- ============================================================================
-- BAGGRUND:
-- Bison Frame åbnes for ALLE håndværkere — ikke kun tømrere. Kun tømrere (og
-- bevidst IKKE entreprenører) har prisberegner + materialer + Wizard-tilbud.
-- Alle andre fag får hele appen UNDTAGEN beregner/materialer og kan kun lave
-- "Hurtigt tilbud" (manuelt).
--
-- LØSNING: én kolonne på firmaet (carpenters). Default = 'tomrer', så ALLE
-- eksisterende konti (og medarbejdere, der arver firmaets type) fortsætter
-- præcis som nu. Vælges ved oprettelse. Gating sker udelukkende i klienten
-- (vi rører ALDRIG de låste beregner-filer — vi skjuler bare UI).
--
-- Værdier: 'tomrer' | 'murer' | 'maler' | 'vvs' | 'anlaegsgartner'
--          | 'elektriker' | 'kloakmester' | 'entreprenor'
-- ============================================================================

ALTER TABLE carpenters
    ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'tomrer';

-- Sikr at alle nuværende rækker eksplicit er tømrere (default dækker dem allerede,
-- men dette gør det utvetydigt for de få eksisterende konti).
UPDATE carpenters SET business_type = 'tomrer' WHERE business_type IS NULL;

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   ALTER TABLE carpenters DROP COLUMN IF EXISTS business_type;
-- ============================================================================
