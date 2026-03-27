-- ==========================================================================
-- AUDIT LOG TABLE
-- Append-only immutable record of every action. NEVER UPDATE or DELETE rows.
-- RLS enforces this: only SELECT and INSERT policies exist.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  agent_id    TEXT REFERENCES agents(id) ON DELETE SET NULL,
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_agent_id ON audit_log (agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_task_id ON audit_log (task_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- Row Level Security — APPEND-ONLY
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone can read the audit trail
CREATE POLICY "audit_anon_select" ON audit_log
  FOR SELECT TO anon USING (true);

-- INSERT: anyone can append entries
CREATE POLICY "audit_anon_insert" ON audit_log
  FOR INSERT TO anon WITH CHECK (true);

-- NO UPDATE policy = denied by RLS
-- NO DELETE policy = denied by RLS
