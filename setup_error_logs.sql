-- ============================================================================
-- FEJL-LOG (in-house fejlfinder) — kør i Supabase -> SQL Editor
-- ============================================================================
-- Opsamler app-fejl så superadmin kan se dem i admin-dashboardet.
-- SIKKERHED: alle indloggede må SKRIVE en fejl (så deres app kan logge sin egen),
-- men KUN superadmin (team@bisoncompany.dk) må LÆSE/markere dem.
-- Additivt + idempotent. Rollback nederst.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message     text,
    stack       text,
    source_url  text,
    user_id     uuid,
    user_email  text,
    role        text,
    user_agent  text,
    resolved    boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved, created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Alle indloggede må logge en fejl (så klienten kan skrive sin egen).
DROP POLICY IF EXISTS "anyone authenticated can insert errors" ON public.error_logs;
CREATE POLICY "anyone authenticated can insert errors" ON public.error_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- KUN superadmin må læse fejlene.
DROP POLICY IF EXISTS "only superadmin can read errors" ON public.error_logs;
CREATE POLICY "only superadmin can read errors" ON public.error_logs
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'email' = 'team@bisoncompany.dk');

-- KUN superadmin må opdatere (markér løst).
DROP POLICY IF EXISTS "only superadmin can update errors" ON public.error_logs;
CREATE POLICY "only superadmin can update errors" ON public.error_logs
    FOR UPDATE TO authenticated
    USING (auth.jwt() ->> 'email' = 'team@bisoncompany.dk')
    WITH CHECK (auth.jwt() ->> 'email' = 'team@bisoncompany.dk');

-- ============================================================================
-- ROLLBACK:
-- DROP TABLE IF EXISTS public.error_logs;
-- ============================================================================
