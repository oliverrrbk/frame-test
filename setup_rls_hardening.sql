-- ============================================================================
-- RLS HARDENING — kør i Supabase SQL Editor
-- ============================================================================
-- Lukker to konkrete huller uden at røre wizardens public-flow:
--
--   1) Privilege escalation: en logget-ind bruger kan i dag opdatere SIN EGEN
--      række i 'carpenters' og dermed selv sætte tier='enterprise',
--      role='admin', subscription_status='active' osv. Vi spærrer disse felter
--      via en BEFORE UPDATE-trigger der kun lader service_role ændre dem.
--
--   2) Wizard / Quote-accept skal stadig kunne læse tømrerens offentlige
--      profil (navn, logo, slug). Vi BEHOLDER den brede SELECT-policy fordi
--      'select(*)' bruges flere steder i frontend, men anbefaler at man over
--      tid migrerer til 'get_public_carpenter()' RPC'en defineret nederst.
--
--   3) leads-tabellen: INSERT-policy 'WITH CHECK (true)' BEHOLDES — wizard
--      skal kunne oprette leads anonymt. Vi rører den IKKE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bloker selv-eskalering på carpenters
-- ----------------------------------------------------------------------------

-- Hvilke kolonner må en almindelig bruger ALDRIG ændre på sig selv?
-- Disse styres kun af Stripe-webhook + admin-flows (alle bruger service_role).
CREATE OR REPLACE FUNCTION protect_carpenter_sensitive_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_service_role BOOLEAN;
BEGIN
    -- service_role har ingen JWT-claims der peger på en auth.uid → den er NULL
    -- og dens role-claim er 'service_role'. Vi tjekker begge for sikkerheds skyld.
    is_service_role := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );

    IF is_service_role THEN
        RETURN NEW; -- service_role må alt
    END IF;

    -- Bevar gamle værdier på beskyttede felter, uanset hvad klienten sender
    NEW.role := OLD.role;
    NEW.tier := OLD.tier;
    NEW.company_id := OLD.company_id;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_end_date := OLD.subscription_end_date;
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.payment_customer_id := OLD.payment_customer_id;
    NEW.permissions := OLD.permissions;
    NEW.is_active := OLD.is_active;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_carpenter_cols ON carpenters;
CREATE TRIGGER trg_protect_carpenter_cols
BEFORE UPDATE ON carpenters
FOR EACH ROW
EXECUTE FUNCTION protect_carpenter_sensitive_cols();

-- ----------------------------------------------------------------------------
-- 2) Stram INSERT på carpenters: kun ens egen række (modvirker fremmed-firma-injection)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tømrere kan oprette deres profil første gang" ON carpenters;
CREATE POLICY "Tømrere kan oprette deres profil første gang"
ON carpenters FOR INSERT
WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3) UPDATE-policy: kun egen række (uændret fra før — beskyttelsen sker via trigger)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tømrere kan kun rette deres egen profil" ON carpenters;
CREATE POLICY "Tømrere kan kun rette deres egen profil"
ON carpenters FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 4) Public RPC til at hente tømrerens offentlige profil (anbefalet fremtid)
--    Returnerer KUN sikre kolonner. Frontend kan migrere over tid:
--      supabase.rpc('get_public_carpenter', { lookup_id: ... })
--      supabase.rpc('get_public_carpenter_by_slug', { lookup_slug: ... })
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_public_carpenter(lookup_id UUID)
RETURNS TABLE(
    id UUID,
    owner_name TEXT,
    company_name TEXT,
    slug TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, owner_name, company_name, slug, logo_url, address, phone, email, is_active
    FROM carpenters
    WHERE id = lookup_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_public_carpenter_by_slug(lookup_slug TEXT)
RETURNS TABLE(
    id UUID,
    owner_name TEXT,
    company_name TEXT,
    slug TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, owner_name, company_name, slug, logo_url, address, phone, email, is_active
    FROM carpenters
    WHERE slug = lookup_slug
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_carpenter(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_carpenter_by_slug(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) Sanity-check: bekræft at leads-INSERT-policyen STADIG er åben for wizard
-- ----------------------------------------------------------------------------
-- (Vi rører den ikke, men dokumenterer her at den SKAL stå sådan)
-- CREATE POLICY "Tillad at alle kan oprette leads (wizard)"
-- ON leads FOR INSERT WITH CHECK (true);
--
-- Hvis du nogensinde vil stramme den: tilføj et anti-spam check som fx
-- AT customer_email IS NOT NULL OG raw_data->>'project_category' IS NOT NULL.
