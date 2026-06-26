-- ============================================================================
-- GÆSTE-ADGANG / PROJEKT-MEDLEMMER (Ghost → Guest → Netværk)  —  TRIN 1
-- Kør i Supabase -> SQL Editor.  Idempotent.  Rollback nederst.
-- ============================================================================
-- BAGGRUND:
-- I dag er adgang FIRMA-afgrænset: man ser et lead, hvis man ejer firmaet
-- (carpenter_id), er tildelt det, eller er i samme firma (jf.
-- widen_leads_access_confirmed.sql). Der findes INGEN måde at give en bruger fra
-- ET ANDET firma adgang til ÉN konkret sag — og det er præcis det gæste-flowet
-- kræver.
--
-- LØSNING (additiv — rører ingen eksisterende tabel-data):
--   1) Ny tabel `project_members`: kobler en PERSON til ÉT lead.
--        auth_user_id = NULL  -> "ghost" (kun kontakt, intet login)
--        auth_user_id udfyldt  -> "guest" (kan logge ind på netop denne sag)
--      Ghost → Guest er dermed ét felt der skifter — ingen data-merge.
--   2) `is_project_member(lead_id, user_id)` SECURITY DEFINER-helper (i stil med
--      my_company_id()), så leads-policyerne kan udvides med ÉN OR-gren.
--   3) Udvider leads SELECT + UPDATE med "ELLER jeg er aktivt medlem af sagen".
--      Skrivning hærdes FORTSAT af protect_lead_sensitive_fields() (gæsten kan
--      reelt kun røre time_entries/checklist/case_logs — aldrig økonomi/status).
--   4) Udvider get_visible_leads() så `guest` får økonomi MASKERET ligesom
--      svend/lærling (ellers ville en gæst kunne læse pris/avance via netværket).
--
-- mutate_time_entries() er SECURITY INVOKER og bruger kalderens RLS — derfor er
-- den nye UPDATE-gren nok til at en gæst kan føre SINE egne timer. RPC'en røres
-- IKKE. Gæste-timer tagges client-side (external:true + carpenter_id) så de kan
-- vises som "eksterne timer" og holdes UDE af lønkørslen.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Tabel: project_members
-- ----------------------------------------------------------------------------
-- (Plain kolonner uden hårde FK'er — samme konvention som subcontractors.)
-- BEMÆRK: leads.id er BIGINT (ikke uuid) — derfor er lead_id bigint.
-- Sikker gen-kørsel: tabellen er ny/uden data, så vi dropper den først, hvis en
-- tidligere (fejlet) kørsel nåede at lave den med forkert kolonnetype.
DROP TABLE IF EXISTS project_members CASCADE;
CREATE TABLE IF NOT EXISTS project_members (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id               BIGINT NOT NULL,            -- Hvilken sag (leads.id — BIGINT)
    auth_user_id          UUID,                       -- NULL = ghost · udfyldt = guest (carpenters.id)
    invited_by_company_id UUID NOT NULL,              -- Firmaet der inviterede (mesterens firma-id) — attribution + senere netværk

    -- Kontakt-data (kendt allerede i ghost-fasen)
    name                  TEXT,
    email                 TEXT,
    phone                 TEXT,
    company_name          TEXT,                       -- Underleverandørens eget firmanavn

    -- Rolle på sagen (blueprintets roller — gemmes som tekst, ingen enum)
    role                  TEXT NOT NULL DEFAULT 'subcontractor_owner',
                                                      -- 'subcontractor_owner' | 'journeyman' (svend) | 'apprentice' (lærling) | 'project_manager'

    -- Livscyklus
    status                TEXT NOT NULL DEFAULT 'ghost',  -- 'ghost' -> 'invited' -> 'active'
    invite_token          TEXT,                       -- Engangs-token til mail-linket (sættes ved 'Send gæste-login')
    invite_sent_at        TIMESTAMPTZ,
    activated_at          TIMESTAMPTZ,                -- Sat når gæsten første gang logger ind

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_members_lead_id      ON project_members(lead_id);
CREATE INDEX IF NOT EXISTS idx_project_members_auth_user_id ON project_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_company      ON project_members(invited_by_company_id);
-- Hurtigt token-opslag ved aktivering (kun for rækker med et token)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_token  ON project_members(invite_token) WHERE invite_token IS NOT NULL;
-- Samme gæst må kun stå én gang på samme sag. (Postgres: NULL'er er distinkte, så
-- flere ghosts uden login pr. sag er stadig tilladt — og fungerer som ON CONFLICT-mål.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_lead_user ON project_members(lead_id, auth_user_id);


-- ----------------------------------------------------------------------------
-- 2) RLS på selve project_members
-- ----------------------------------------------------------------------------
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firma styrer egne projekt-medlemmer (select)" ON project_members;
DROP POLICY IF EXISTS "Firma styrer egne projekt-medlemmer (insert)" ON project_members;
DROP POLICY IF EXISTS "Firma styrer egne projekt-medlemmer (update)" ON project_members;
DROP POLICY IF EXISTS "Firma styrer egne projekt-medlemmer (delete)" ON project_members;
DROP POLICY IF EXISTS "Gæst kan se sit eget medlemskab" ON project_members;

-- Det inviterende firma (mester/admin) må fuldt styre medlemmer på SINE egne sager.
-- (coalesce(c.company_id, c.id) = firmaets id — samme mønster som resten af systemet.)
CREATE POLICY "Firma styrer egne projekt-medlemmer (select)"
ON project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = project_members.invited_by_company_id
  )
);

CREATE POLICY "Firma styrer egne projekt-medlemmer (insert)"
ON project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = project_members.invited_by_company_id
  )
);

CREATE POLICY "Firma styrer egne projekt-medlemmer (update)"
ON project_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = project_members.invited_by_company_id
  )
);

CREATE POLICY "Firma styrer egne projekt-medlemmer (delete)"
ON project_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND coalesce(c.company_id, c.id) = project_members.invited_by_company_id
  )
);

-- Gæsten selv må læse sit/sine egne medlemskab(er) — så klienten kan vise "Dine sager".
CREATE POLICY "Gæst kan se sit eget medlemskab"
ON project_members FOR SELECT
USING (auth_user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3) Helper: is_project_member(lead_id, user_id)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER, så leads-policyerne kan kalde den uden at gæsten skal have
-- bred SELECT på project_members. Kun AKTIVE medlemmer (gæster der har logget
-- ind) giver adgang — ghosts har intet login og rammer aldrig RLS.
-- p_lead_id er BIGINT (leads.id). Drop en evt. gammel UUID-overload først.
DROP FUNCTION IF EXISTS public.is_project_member(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_project_member(p_lead_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.lead_id = p_lead_id
        AND pm.auth_user_id = p_user_id
        AND pm.status = 'active'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(BIGINT, UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4) Udvid leads SELECT + UPDATE med projekt-medlemskab
-- ----------------------------------------------------------------------------
-- VIGTIGT (ingen drift!): nedenstående er den KANONISKE
-- widen_leads_access_confirmed.sql-version + ÉN ny OR-gren til sidst. Ændrer du
-- leads-policy ét sted, skal begge filer følges ad. Denne fil køres EFTER
-- widen_leads_access_confirmed.sql og bliver den nye kanoniske version.

DROP POLICY IF EXISTS "Tømrere kan kun se deres egne leads" ON leads;
CREATE POLICY "Tømrere kan kun se deres egne leads"
ON leads FOR SELECT
USING (
  auth.uid() = carpenter_id
  OR auth.uid() = assigned_to
  OR coalesce(leads.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR coalesce(leads.raw_data->'assigned_pm', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND (
      c.role = 'accountant'
      OR c.permissions @> '{"view_all_leads": true}'::jsonb
    )
  )
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND leads.status IN ('Bekræftet opgave','Sæt i bero','Historik','Afbrudt Sag')
  )
  -- NYT: en aktiv gæst/underentreprenør koblet på netop denne sag må se den.
  OR public.is_project_member(leads.id, auth.uid())
);

DROP POLICY IF EXISTS "Tømrere kan opdatere deres egne leads" ON leads;
CREATE POLICY "Tømrere kan opdatere deres egne leads"
ON leads FOR UPDATE
USING (
  auth.uid() = carpenter_id
  OR auth.uid() = assigned_to
  OR coalesce(leads.raw_data->'assigned_workers', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR coalesce(leads.raw_data->'assigned_pm', '[]'::jsonb) @> to_jsonb(auth.uid()::text)
  OR EXISTS (SELECT 1 FROM carpenters c WHERE c.id = auth.uid() AND c.role = 'accountant' AND c.company_id = leads.carpenter_id)
  OR EXISTS (
    SELECT 1 FROM carpenters c
    WHERE c.id = auth.uid()
    AND c.company_id = leads.carpenter_id
    AND leads.status IN ('Bekræftet opgave','Sæt i bero','Historik','Afbrudt Sag')
  )
  -- NYT: en aktiv gæst må opdatere sagen (i praksis kun time_entries/checklist/
  -- case_logs — alt følsomt rulles tilbage af protect_lead_sensitive_fields()).
  OR public.is_project_member(leads.id, auth.uid())
);


-- ----------------------------------------------------------------------------
-- 5) Udvid pris-maskering så `guest` også får skjult økonomi
-- ----------------------------------------------------------------------------
-- VIGTIGT (ingen drift!): kopi af get_visible_leads() fra
-- setup_leads_price_masking.sql — eneste ændring er at 'guest' tilføjes til
-- maskerings-rollerne. Ændrer du masken ét sted, skal begge filer følges ad.
CREATE OR REPLACE FUNCTION public.get_visible_leads()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role FROM carpenters WHERE id = auth.uid();

    -- Alle andre end svend/lærling/gæst: fuld adgang (RLS afgør rækkerne).
    IF v_role NOT IN ('worker', 'apprentice', 'guest') OR v_role IS NULL THEN
        RETURN QUERY
            SELECT to_jsonb(l) FROM leads l
            WHERE l.status IS DISTINCT FROM 'Slettet'
            ORDER BY l.created_at DESC;
        RETURN;
    END IF;

    -- Svend/lærling/gæst: maskér økonomi (men ikke på egne kladder).
    RETURN QUERY
        SELECT
            CASE
                WHEN (l.raw_data->>'created_by') = auth.uid()::text THEN to_jsonb(l)
                ELSE jsonb_set(
                        jsonb_set(to_jsonb(l), '{price_estimate}', 'null'::jsonb),
                        '{raw_data}',
                        (
                            COALESCE(l.raw_data, '{}'::jsonb)
                            - 'calc_data' - 'invoice_history' - 'invoiced_amount'
                            - 'actual_quote_price' - 'supplier_invoices'
                            -- Gæster må ALDRIG se intern kommunikation (svend/lærling beholder den).
                            -- '__noop__' fjerner en ikke-eksisterende nøgle = ingen effekt.
                            - (CASE WHEN v_role = 'guest' THEN 'case_messages' ELSE '__noop__' END)
                        )
                        || jsonb_build_object(
                            'material_list',
                            COALESCE((
                                SELECT jsonb_agg(m - 'price' - 'markup')
                                FROM jsonb_array_elements(COALESCE(l.raw_data->'material_list', '[]'::jsonb)) m
                            ), l.raw_data->'material_list')
                        )
                        -- GÆST: må KUN se sine EGNE timer (ikke andres). Ellers kunne en snu
                        -- underentreprenør-mester læse sine svendes/andres timer i payloaden →
                        -- begyndelsen på gratis team-overblik. Svend/lærling beholder fuldt hold.
                        || (CASE WHEN v_role = 'guest' THEN jsonb_build_object(
                            'time_entries',
                            COALESCE((
                                SELECT jsonb_agg(t)
                                FROM jsonb_array_elements(COALESCE(l.raw_data->'time_entries', '[]'::jsonb)) t
                                WHERE t->>'employeeId' = auth.uid()::text
                            ), '[]'::jsonb)
                        ) ELSE '{}'::jsonb END)
                     )
            END
        FROM leads l
        WHERE l.status IS DISTINCT FROM 'Slettet'
        ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_leads() TO authenticated;


-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   -- Gendan leads-policyerne fra widen_leads_access_confirmed.sql (uden is_project_member-grenen)
--   -- Gendan get_visible_leads() fra setup_leads_price_masking.sql (uden 'guest')
--   DROP FUNCTION IF EXISTS public.is_project_member(BIGINT, UUID);
--   DROP TABLE IF EXISTS project_members;
-- ============================================================================
