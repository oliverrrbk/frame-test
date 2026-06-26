-- ============================================================================
-- INDEKS PÅ leads  —  ydelse for RLS-filtre og dashboard-fetch.
-- Kør i Supabase -> SQL Editor. Idempotent. Additiv (rører ingen data).
-- ============================================================================
-- BAGGRUND:
-- Hver dashboard-load og hver RLS-evaluering filtrerer på carpenter_id /
-- assigned_to / status og laver jsonb-containment på raw_data->assigned_workers
-- og raw_data->assigned_pm. Uden indeks blev det fuld tabel-scan hver gang.
-- Disse indeks fjerner scannet og holder ydelsen flad når leads-tabellen vokser.
--
-- BEMÆRK: På en STOR, aktiv tabel bør du tilføje CONCURRENTLY for at undgå lås
-- (kan dog ikke køre i en transaktion). På nuværende datamængde er almindelig
-- CREATE INDEX hurtigt og fint.
-- ============================================================================

-- Hovedfetchen: WHERE carpenter_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_leads_carpenter_created
    ON leads (carpenter_id, created_at DESC);

-- RLS + tildelte sager: WHERE assigned_to = ?
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
    ON leads (assigned_to);

-- Status-filtre (RLS-grene + lister): WHERE status IN (...)
CREATE INDEX IF NOT EXISTS idx_leads_status
    ON leads (status);

-- jsonb-containment i RLS: raw_data->'assigned_workers' @> to_jsonb(uid)
-- og raw_data->'assigned_pm' @> ... — jsonb_path_ops er kompakt og dækker @>.
CREATE INDEX IF NOT EXISTS idx_leads_assigned_workers
    ON leads USING gin ((raw_data -> 'assigned_workers') jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_pm
    ON leads USING gin ((raw_data -> 'assigned_pm') jsonb_path_ops);

-- Webhook-opslag (accounting-webhooks): raw_data->'invoice_history' @> [{"id":..}]
CREATE INDEX IF NOT EXISTS idx_leads_invoice_history
    ON leads USING gin ((raw_data -> 'invoice_history') jsonb_path_ops);

-- ============================================================================
-- ROLLBACK (kør kun hvis nødvendigt):
--   DROP INDEX IF EXISTS idx_leads_carpenter_created;
--   DROP INDEX IF EXISTS idx_leads_assigned_to;
--   DROP INDEX IF EXISTS idx_leads_status;
--   DROP INDEX IF EXISTS idx_leads_assigned_workers;
--   DROP INDEX IF EXISTS idx_leads_assigned_pm;
--   DROP INDEX IF EXISTS idx_leads_invoice_history;
-- ============================================================================
