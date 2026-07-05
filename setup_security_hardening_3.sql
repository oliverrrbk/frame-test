-- ============================================================================
-- SIKKERHEDSHÆRDNING #3 — kør i Supabase -> SQL Editor.
-- ============================================================================
-- Lukker de cross-tenant- og privilege-escalation-huller en sikkerhedsaudit
-- (juli 2026) fandt. ALT er idempotent og kan køres i én omgang. Rollback-noter
-- står ved hver blok. Kør EFTER setup_rls.sql, setup_rls_hardening.sql,
-- setup_rls_carpenters_hardening.sql, setup_security_hardening_2.sql,
-- setup_public_carpenter.sql, setup_profile_fields.sql, setup_calendar_events_rpc.sql,
-- supabase/setup_chat.sql (+ fix_chat_rls_case_private.sql), setup_avatars.sql.
--
-- Blokke:
--   1) carpenters: kolonne-beskyttelse på BÅDE INSERT og UPDATE (var kun UPDATE,
--      og triggeren manglede helt på live-DB → ny bruger kunne selv vælge
--      company_id/role/abonnement). LUKKER cross-tenant + gratis-abonnement.
--   2) materials: RLS til (læses anonymt af beregneren, men writes låst til eget firma).
--   3) settings: RLS til (samme mønster).
--   4) profiles: view → security_invoker / tabel → RLS (stop cross-tenant PII).
--   5) leads: (a) anon-UPDATE-policy indsnævret til rollen 'anon', (b) trigger der
--      fryser quote_token + kunde-felter mod ikke-ejere, (c) INSERT-vagt.
--   6) sanitize_carpenter: fjern også calendar_events/team/hr_notes fra offentligt output.
--   7) avatars-bucket: kun ejeren må ændre/slette sine egne filer.
--   8) mutate_calendar_events: menige må kun slette EGNE aftaler (mester alt).
--   9) chat: luk WITH CHECK(true) på tråde/deltagere (stop cross-tenant besked-injektion).
--  10) carpenters: nul + drop de gamle *_api_key-kolonner (secrets bor i carpenter_secrets).
-- ============================================================================

-- Sikrer hjælpefunktionen findes (idempotent — samme som i _2).
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(company_id, id) FROM carpenters WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 1) carpenters — beskyt følsomme kolonner på INSERT *og* UPDATE
-- ----------------------------------------------------------------------------
-- service_role (Stripe-webhook, invite-employee, convert-guest, admin-flows) må alt.
-- Almindelige klienter: kan ALDRIG selv vælge firma, rolle eller abonnement.
--   • UPDATE: felterne bevares (kan ikke ændres af brugeren selv).
--   • INSERT: en selvbetjent bruger bliver ALTID admin i sit EGET nye firma med
--     30 dages prøve — præcis som Dashboard-fallbacken tiltænker. Medarbejdere/
--     gæster oprettes server-side (service_role) og rammer ikke denne gren.
CREATE OR REPLACE FUNCTION protect_carpenter_sensitive_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_service_role BOOLEAN;
BEGIN
    is_service_role := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );
    IF is_service_role THEN
        RETURN NEW; -- service_role må alt
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Bevar gamle værdier på beskyttede felter, uanset hvad klienten sender.
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
    END IF;

    -- TG_OP = 'INSERT': tving sikre værdier (klienten kan ikke vælge firma/rolle/abonnement).
    NEW.company_id := NULL;               -- bliver sit eget firma (id = company-rod)
    NEW.role := 'admin';
    NEW.subscription_status := 'trialing';
    NEW.subscription_end_date := NULL;
    NEW.payment_customer_id := NULL;
    NEW.permissions := '{}'::jsonb;
    NEW.is_active := COALESCE(NEW.is_active, true);
    NEW.trial_ends_at := COALESCE(
        (SELECT created_at FROM auth.users WHERE id = NEW.id),
        now()
    ) + INTERVAL '30 days';
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_carpenter_cols ON carpenters;
CREATE TRIGGER trg_protect_carpenter_cols
BEFORE INSERT OR UPDATE ON carpenters
FOR EACH ROW
EXECUTE FUNCTION protect_carpenter_sensitive_cols();
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_protect_carpenter_cols ON carpenters;
--           CREATE TRIGGER trg_protect_carpenter_cols BEFORE UPDATE ON carpenters
--           FOR EACH ROW EXECUTE FUNCTION protect_carpenter_sensitive_cols();

-- ----------------------------------------------------------------------------
-- 2) materials — RLS til. Beregneren (anon) skal kunne LÆSE en tømrers materialer,
--    men skrivning låses til eget firma (stop sabotage + cross-tenant-skrivning).
-- ----------------------------------------------------------------------------
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials_public_read"  ON public.materials;
DROP POLICY IF EXISTS "materials_owner_insert"  ON public.materials;
DROP POLICY IF EXISTS "materials_owner_update"  ON public.materials;
DROP POLICY IF EXISTS "materials_owner_delete"  ON public.materials;

-- Læsning: nødvendig for den offentlige beregner (anon henter en specifik tømrers priser).
CREATE POLICY "materials_public_read" ON public.materials
  FOR SELECT USING (true);

CREATE POLICY "materials_owner_insert" ON public.materials
  FOR INSERT WITH CHECK (carpenter_id = public.my_company_id());

CREATE POLICY "materials_owner_update" ON public.materials
  FOR UPDATE USING (carpenter_id = public.my_company_id())
             WITH CHECK (carpenter_id = public.my_company_id());

CREATE POLICY "materials_owner_delete" ON public.materials
  FOR DELETE USING (carpenter_id = public.my_company_id());
-- ROLLBACK: ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3) settings — RLS til (samme mønster som materials).
-- ----------------------------------------------------------------------------
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_read"  ON public.settings;
DROP POLICY IF EXISTS "settings_owner_insert"  ON public.settings;
DROP POLICY IF EXISTS "settings_owner_update"  ON public.settings;
DROP POLICY IF EXISTS "settings_owner_delete"  ON public.settings;

CREATE POLICY "settings_public_read" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "settings_owner_insert" ON public.settings
  FOR INSERT WITH CHECK (carpenter_id = public.my_company_id());

CREATE POLICY "settings_owner_update" ON public.settings
  FOR UPDATE USING (carpenter_id = public.my_company_id())
             WITH CHECK (carpenter_id = public.my_company_id());

CREATE POLICY "settings_owner_delete" ON public.settings
  FOR DELETE USING (carpenter_id = public.my_company_id());
-- ROLLBACK: ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4) profiles — luk cross-tenant læsning af navn/e-mail.
--    Er 'profiles' en VIEW (typisk over carpenters), sætter vi security_invoker=on,
--    så den arver carpenters' (allerede firma-scopede) RLS. Er det en TABEL, slår
--    vi RLS til med selv/eget-firma-adgang. Findes den ikke, springes den over.
-- ----------------------------------------------------------------------------
DO $$
DECLARE k "char";
BEGIN
    SELECT relkind INTO k FROM pg_class WHERE oid = 'public.profiles'::regclass;

    IF k = 'v' THEN
        EXECUTE 'ALTER VIEW public.profiles SET (security_invoker = on)';
        RAISE NOTICE 'profiles: view → security_invoker=on (arver carpenters-RLS).';

    ELSIF k = 'r' THEN
        EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "profiles_self_or_company_read" ON public.profiles';
        EXECUTE $p$
            CREATE POLICY "profiles_self_or_company_read" ON public.profiles
            FOR SELECT USING (
                id = auth.uid()
                OR (auth.jwt() ->> 'email') = 'team@bisoncompany.dk'
                OR EXISTS (
                    SELECT 1 FROM public.carpenters me, public.carpenters them
                    WHERE me.id = auth.uid()
                      AND them.id = profiles.id
                      AND COALESCE(them.company_id, them.id) = COALESCE(me.company_id, me.id)
                )
            )
        $p$;
        RAISE NOTICE 'profiles: tabel → RLS + selv/eget-firma-læsning.';
    ELSE
        RAISE NOTICE 'profiles: ukendt/ingen relation — springer over.';
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'profiles findes ikke — springer over.';
END $$;
-- ROLLBACK (view):  ALTER VIEW public.profiles SET (security_invoker = off);
-- ROLLBACK (tabel): ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5a) leads — indsnævr den anonyme UPDATE-policy fra 'public' (anon+auth) til KUN 'anon'.
--     Indloggede brugere styres derefter udelukkende af ejer-policyen ("Tømrere kan
--     opdatere deres egne leads") — så en tømrer i firma B kan ikke længere bruge
--     denne brede policy til at røre firma A's tidlige leads.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tillad at anonyme kunder kan opdatere deres egne leads" ON leads;
CREATE POLICY "Tillad at anonyme kunder kan opdatere deres egne leads"
ON leads FOR UPDATE
TO anon
USING (status = 'Overslag (Afventer)' OR status = 'Ny forespørgsel')
WITH CHECK (status = 'Overslag (Afventer)' OR status = 'Ny forespørgsel');

-- 5b) leads — frys quote_token + kunde-identitet mod alle der IKKE er ejer af leadet.
--     Det legitime anonyme accept-flow ændrer kun status/contact_preference/raw_data —
--     ALDRIG quote_token eller customer_*. Så vi kan trygt fryse dem. Token-RPC'erne
--     (update_lead_by_token m.fl.) sætter app.confirm_via_token og slippes igennem.
CREATE OR REPLACE FUNCTION protect_lead_customer_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_service_role boolean;
    is_owner boolean;
BEGIN
    is_service_role := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );
    IF is_service_role THEN RETURN NEW; END IF;

    -- Betroet token-bekræftelse (RPC'erne kører SET row_security=off + denne GUC).
    IF current_setting('app.confirm_via_token', true) = 'true' THEN RETURN NEW; END IF;

    is_owner := (
        auth.uid() = OLD.carpenter_id
        OR auth.uid() = OLD.assigned_to
        OR COALESCE(OLD.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
        OR EXISTS (
            SELECT 1 FROM carpenters c
            WHERE c.id = auth.uid()
              AND (c.company_id = OLD.carpenter_id OR c.id = OLD.carpenter_id)
        )
    );
    IF is_owner THEN RETURN NEW; END IF;

    -- Alle andre (anonyme kunder + fremmede firmaer): frys identitet, token og pris.
    NEW.carpenter_id    := OLD.carpenter_id;
    NEW.quote_token     := OLD.quote_token;
    NEW.customer_name   := OLD.customer_name;
    NEW.customer_email  := OLD.customer_email;
    NEW.customer_phone  := OLD.customer_phone;
    NEW.customer_address := OLD.customer_address;
    NEW.price_estimate  := OLD.price_estimate;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lead_customer_identity ON leads;
CREATE TRIGGER trg_protect_lead_customer_identity
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION protect_lead_customer_identity();

-- 5c) leads — INSERT-vagt. Indloggede må kun oprette i eget firma; anonyme (wizard)
--     tvinges til en lovlig start-status (stop cross-tenant "fake bekræftet opgave").
CREATE OR REPLACE FUNCTION guard_lead_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_service_role boolean;
    caller_company uuid;
BEGIN
    is_service_role := (
        current_setting('request.jwt.claim.role', true) = 'service_role'
        OR auth.role() = 'service_role'
    );
    IF is_service_role THEN RETURN NEW; END IF;

    IF auth.uid() IS NOT NULL THEN
        -- Indlogget bruger: må kun oprette sager i sit eget firma.
        caller_company := public.my_company_id();
        IF NEW.carpenter_id IS DISTINCT FROM caller_company
           AND NEW.carpenter_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Du kan kun oprette sager i dit eget firma';
        END IF;
    ELSE
        -- Anonym wizard: tving en lovlig start-status.
        IF NEW.status IS NULL OR NEW.status NOT IN ('Ny forespørgsel', 'Overslag (Afventer)') THEN
            NEW.status := 'Ny forespørgsel';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_lead_insert ON leads;
CREATE TRIGGER trg_guard_lead_insert
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION guard_lead_insert();
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_protect_lead_customer_identity ON leads;
--           DROP TRIGGER IF EXISTS trg_guard_lead_insert ON leads;
--           (og gendan 'public' på anon-UPDATE-policyen hvis nødvendigt)

-- ----------------------------------------------------------------------------
-- 6) sanitize_carpenter — fjern også interne felter (kalender m. kundemøder, hold,
--    hr-noter) fra det offentlige output. Beholder pris-opsætningen (beregneren).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_carpenter(c carpenters)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
      to_jsonb(c)
      - 'dinero_api_key' - 'economic_api_key' - 'apacta_api_key'
      - 'ordrestyring_api_key' - 'minuba_api_key' - 'payment_customer_id'
    )
    || jsonb_build_object(
      'raw_data',
      COALESCE(c.raw_data, '{}'::jsonb)
        - 'time_entries' - 'lonnummer' - 'vacation_quota'
        - 'home_address' - 'home_zip' - 'home_city' - 'next_of_kin'
        - 'calendar_events' - 'team' - 'hr_notes'
    )
$$;

-- ----------------------------------------------------------------------------
-- 7) avatars-bucket — kun ejeren (uploaderen) må ændre/slette sine egne filer.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;

CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "Users can delete their own avatar."
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND owner = auth.uid());
-- ROLLBACK: gendan de gamle "auth.role() = 'authenticated'"-policyer fra setup_avatars.sql.

-- ----------------------------------------------------------------------------
-- 8) mutate_calendar_events — menige medarbejdere må kun slette EGNE aftaler.
--    Mester/ejer (role='admin' eller id = firma-roden) må slette alt. Tilføjelser
--    er fortsat tilladt for alle i firmaet (uændret). Matcher frontendens canEditEvent.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mutate_calendar_events(
    p_company_id text,
    p_remove_ids text[]  default '{}',
    p_add        jsonb   default '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
    v_result jsonb;
    v_is_admin boolean;
begin
    -- Autorisation: kalderen skal være ejer af eller ansat i firmaet.
    if not exists (
        select 1 from carpenters c
        where c.id = auth.uid()
          and (c.id::text = p_company_id or c.company_id::text = p_company_id)
    ) then
        raise exception 'Ingen adgang til denne kalender';
    end if;

    -- Er kalderen mester/ejer? (må slette alle aftaler)
    select exists (
        select 1 from carpenters c
        where c.id = auth.uid()
          and (c.role = 'admin' or c.id::text = p_company_id)
    ) into v_is_admin;

    update carpenters
       set raw_data = jsonb_set(
             coalesce(raw_data, '{}'::jsonb),
             '{calendar_events}',
             coalesce(
               (select jsonb_agg(e)
                  from jsonb_array_elements(coalesce(raw_data->'calendar_events', '[]'::jsonb)) e
                 -- Behold aftalen HVIS den ikke skal fjernes, ELLER hvis kalderen
                 -- ikke har lov (menig der prøver at slette en andens aftale).
                 where not (
                       (e->>'id') = any(p_remove_ids)
                   and (v_is_admin or (e->>'createdById') = auth.uid()::text)
                 )),
               '[]'::jsonb
             ) || coalesce(p_add, '[]'::jsonb)
           )
     where id::text = p_company_id
     returning raw_data->'calendar_events' into v_result;

    return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function mutate_calendar_events(text, text[], jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 9) chat — luk WITH CHECK(true) på tråde + deltagere (stop cross-tenant injektion).
--    En bruger må kun oprette tråde i SIT eget firma og kun tilføje deltagere til
--    tråde der tilhører hans eget firma (kan ikke joine et fremmed firmas tråd).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create threads" ON public.chat_threads;
CREATE POLICY "Users can create threads" ON public.chat_threads
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
CREATE POLICY "Users can insert participants" ON public.chat_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct
            WHERE ct.id = thread_id
              AND ct.company_id = public.get_user_company_id(auth.uid())
        )
    );
-- ROLLBACK: gendan "WITH CHECK (true)" fra supabase/setup_chat.sql.

-- ----------------------------------------------------------------------------
-- 10) carpenters — nul + drop de gamle *_api_key-kolonner. Nøgler bor i
--     carpenter_secrets (firma-scopet RLS). De gamle kolonner kunne læses af alle
--     ansatte via carpenters' firma-brede SELECT-policy.
-- ----------------------------------------------------------------------------
-- Robust: nogle miljøer har allerede fjernet disse kolonner (nøglerne bor i
-- carpenter_secrets). Vi rører derfor kun de kolonner der FAKTISK findes — nuller
-- dem (belt) og dropper dem (suspenders). Findes de ikke, gøres intet (ingen fejl).
DO $$
DECLARE
    col  text;
    cols text[] := ARRAY['economic_api_key','dinero_api_key','apacta_api_key','ordrestyring_api_key','minuba_api_key'];
BEGIN
    FOREACH col IN ARRAY cols LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'carpenters' AND column_name = col
        ) THEN
            EXECUTE format('UPDATE public.carpenters SET %I = NULL WHERE %I IS NOT NULL', col, col);
            EXECUTE format('ALTER TABLE public.carpenters DROP COLUMN IF EXISTS %I', col);
            RAISE NOTICE 'carpenters: fjernede gammel kolonne %', col;
        ELSE
            RAISE NOTICE 'carpenters: kolonne % findes ikke — springer over', col;
        END IF;
    END LOOP;
END $$;
-- NB: hvis du hellere vil BEHOLDE kolonnerne (kun nulstille), fjern EXECUTE-linjen
-- med 'ALTER TABLE ... DROP COLUMN' ovenfor.
