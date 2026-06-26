-- ============================================================================
-- Sæt udvalgte firmaer til GRATIS / fuld adgang (exempt).
-- Exempt = opkræves aldrig, kan tilføje medarbejdere uden Stripe-træk, fuld adgang.
-- Kør i Supabase -> SQL Editor. TJEK de matchede rækker bagefter (SELECT nederst).
--
-- RETTET 2026-06-26: matcher nu det KORREKTE firmanavn "Skovbo Byg" (+ mailen
-- ws@skovbobyg.dk). Den gamle version matchede kun "skåbro/skaabro" (forkert
-- stavning) og ramte derfor IKKE William → han var ikke exempt.
-- ============================================================================

-- 1) Se hvilke firma-ejere der vil blive ramt (kør denne FØRST og tjek listen):
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE company_id IS NULL          -- kun firma-ejere (mestre), ikke medarbejdere
  AND (
        company_name ILIKE '%skovbo%' OR company_name ILIKE '%skåbro%' OR company_name ILIKE '%skaabro%'
     OR email        ILIKE '%skovbobyg%'
     OR email        = 'ws@skovbobyg.dk'
     OR email        = 'mbc@bisoncompany.dk'
     OR company_name ILIKE '%bison%'
  );

-- 2) Når listen ser rigtig ud, kør selve opdateringen:
UPDATE public.carpenters
SET subscription_status = 'exempt'
WHERE company_id IS NULL
  AND (
        company_name ILIKE '%skovbo%' OR company_name ILIKE '%skåbro%' OR company_name ILIKE '%skaabro%'
     OR email        ILIKE '%skovbobyg%'
     OR email        = 'ws@skovbobyg.dk'
     OR email        = 'mbc@bisoncompany.dk'
     OR company_name ILIKE '%bison%'
  );

-- 3) Bekræft resultatet (her skal William/Skovbo Byg + Bison nu stå som 'exempt'):
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE subscription_status = 'exempt';
