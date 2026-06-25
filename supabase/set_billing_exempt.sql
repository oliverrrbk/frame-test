-- ============================================================================
-- Sæt udvalgte firmaer til GRATIS / fuld adgang (exempt).
-- Exempt = opkræves aldrig, kan tilføje medarbejdere uden Stripe-træk, fuld adgang.
-- Kør i Supabase -> SQL Editor. TJEK de matchede rækker bagefter (SELECT nederst).
-- ============================================================================

-- 1) Se hvilke firma-ejere der vil blive ramt (kør denne FØRST og tjek listen):
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE company_id IS NULL          -- kun firma-ejere (mestre), ikke medarbejdere
  AND (
        company_name ILIKE '%skåbro%' OR company_name ILIKE '%skaabro%'
     OR email        ILIKE '%skåbro%' OR email        ILIKE '%skaabro%'
     OR email = 'mbc@bisoncompany.dk'
     OR company_name ILIKE '%bison%'
  );

-- 2) Når listen ser rigtig ud, kør selve opdateringen:
UPDATE public.carpenters
SET subscription_status = 'exempt'
WHERE company_id IS NULL
  AND (
        company_name ILIKE '%skåbro%' OR company_name ILIKE '%skaabro%'
     OR email        ILIKE '%skåbro%' OR email        ILIKE '%skaabro%'
     OR email = 'mbc@bisoncompany.dk'
     OR company_name ILIKE '%bison%'
  );

-- 3) Bekræft resultatet:
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE subscription_status = 'exempt';
