-- ============================================================================
-- EKSISTERENDE KONTI — prissætning FØR den nye prismodel rulles ud (juli 2026).
-- Kør i Supabase -> SQL Editor. Kør hvert trins SELECT FØRST, tjek rækkerne,
-- kør derefter UPDATE. ALT er idempotent og kan køres igen uden skade.
--
-- Der er PRÆCIS tre konti, med tre FORSKELLIGE behandlinger:
--
--   A) Mads Byg      (mbc@bisoncompany.dk)  → exempt  — betaler ALDRIG.
--   B) Skovbo Byg    (ws@skovbobyg.dk)      → exempt  — betaler ALDRIG.
--        (A+B er allerede dækket af set_billing_exempt.sql; her gen-asserteres de,
--         så vi kan bekræfte alle tre konti i ét script.)
--
--   C) Tobias (tømrer og montage)          → GRANDFATHERED (kun grundprisen).
--        • Er IKKE exempt — han betaler.
--        • Beholder for ALTID 249 kr/md (eks. moms) som GRUNDPRIS.
--        • Springer ALDRIG op på Solo (390) eller Hold (890) — beholder 249 som
--          grundpris, også når han tilføjer medarbejdere (ingen inkluderede Hold-pladser).
--        • Tillæg pr. ekstra bruger bruger de NYE standard-satser (svend 129,
--          kontor 149, lærling 79 osv.) — dvs. KUN grundprisen er fastfrosset,
--          ikke tillæggene.
--        • Han er den ENESTE konto i hele Frame der beholder 249-grundprisen.
--
-- VIGTIGT: Flaget raw_data.legacy_pricing læses IKKE af nogen kode endnu — det er
-- et markør-data der stemples nu, så den KOMMENDE nye prismodel kan respektere det.
-- Den nye pricing.js / create-stripe-checkout / sync-subscription-seats SKAL tjekke
-- owner.raw_data.legacy_pricing.locked === true og så: bruge 249-grundprisen
-- (eksisterende STRIPE_PRICE_MESTER, qty 1) i stedet for Solo/Hold, MENS tillæg pr.
-- bruger bruger de NYE standard-satser/price-id'er præcis som alle andre konti.
-- Kun grundprisen er grandfathered — ikke tillæggene.
-- ============================================================================


-- ############################################################################
-- A + B) EXEMPT — Mads Byg + Skovbo Byg (betaler aldrig)
-- ############################################################################

-- 1) SE hvem der rammes (kør FØRST, tjek at det kun er Bison + Skovbo Byg):
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE company_id IS NULL                       -- kun firma-ejere (mestre)
  AND (
        email = 'mbc@bisoncompany.dk'
     OR email = 'ws@skovbobyg.dk'
     OR email        ILIKE '%skovbobyg%'
     OR company_name ILIKE '%skovbo%'
     OR company_name ILIKE '%bison%'
  );

-- 2) Når listen ser rigtig ud → sæt dem exempt:
UPDATE public.carpenters
SET subscription_status = 'exempt'
WHERE company_id IS NULL
  AND (
        email = 'mbc@bisoncompany.dk'
     OR email = 'ws@skovbobyg.dk'
     OR email        ILIKE '%skovbobyg%'
     OR company_name ILIKE '%skovbo%'
     OR company_name ILIKE '%bison%'
  );
-- ROLLBACK (fjern gratis-status igen): sæt subscription_status tilbage til 'active'
--   eller 'trialing' for de(n) pågældende række(r).


-- ############################################################################
-- C) GRANDFATHERED — Tobias (tømrer og montage): beholder 249-modellen for altid
-- ############################################################################

-- 3) FIND Tobias FØRST (bekræft at rækken er ham: tobias@tomrertn.dk).
--    UID bekræftet af Mads 2026-07-05 fra Supabase Auth.
SELECT id, company_name, email, subscription_status, trial_ends_at,
       raw_data->'team'           AS team,
       raw_data->'legacy_pricing' AS legacy_pricing
FROM public.carpenters
WHERE id = '68d661b5-d2fd-4633-a7da-309080c4b085';  -- tobias@tomrertn.dk

-- 4) Stempl grandfather-flaget. Vi MERGER ind i raw_data med ||-operatoren, så
--    intet andet i raw_data (team, time_entries, billing, …) overskrives.
--    Kun firma-ejeren (company_id IS NULL) rammes.
UPDATE public.carpenters
SET raw_data = COALESCE(raw_data, '{}'::jsonb) || jsonb_build_object(
      'legacy_pricing', jsonb_build_object(
        'locked',            true,                    -- KOMMENDE ny-model-kode SKAL respektere dette
        'model',             'grandfathered_base_249',
        'base',              249,                     -- grundpris eks. moms — ALDRIG Solo/Hold
        'base_stripe_price', 'STRIPE_PRICE_MESTER',   -- eksisterende 249-price-id (qty 1)
        'no_team_upgrade',   true,                    -- springer aldrig op på Solo/Hold-grundprisen
        'additions',         'standard',              -- tillæg pr. bruger = de NYE standard-satser
        'note',  'Grandfathered ifm. ny prismodel juli 2026. KUN grundprisen (249) er fastfrosset — tillæg pr. bruger bruger de nye satser. Eneste konto med 249-grundpris.',
        'since', '2026-07-05'
      )
    )
WHERE id = '68d661b5-d2fd-4633-a7da-309080c4b085';  -- tobias@tomrertn.dk
-- ROLLBACK: UPDATE public.carpenters SET raw_data = raw_data - 'legacy_pricing'
--           WHERE id = '68d661b5-d2fd-4633-a7da-309080c4b085';

-- Bemærk: Tobias' subscription_status ændres BEVIDST ikke her. Han skal betale
-- (ikke exempt), og hans normale abonnements-livscyklus (trialing → active) er
-- uafhængig af pris-fastfrysningen. Rør kun status manuelt hvis den er forkert.


-- ############################################################################
-- BEKRÆFT RESULTATET (kør til sidst)
-- ############################################################################

-- Alle exempt-konti (skal vise Bison + Skovbo Byg):
SELECT id, company_name, email, subscription_status
FROM public.carpenters
WHERE subscription_status = 'exempt';

-- Grandfatherede konti (skal vise PRÆCIS Tobias):
SELECT id, company_name, email, subscription_status,
       raw_data->'legacy_pricing' AS legacy_pricing
FROM public.carpenters
WHERE raw_data ? 'legacy_pricing';
