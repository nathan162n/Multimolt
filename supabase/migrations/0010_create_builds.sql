-- ==========================================================================
-- BUILDS TABLE
-- Tracks agent-produced builds (compiled artifacts, deployed services, etc.)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS builds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,
  output          TEXT,
  artifact_url    TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  user_id         UUID REFERENCES auth.users(id),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE builds ADD CONSTRAINT chk_builds_status
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_builds_status ON builds (status);
CREATE INDEX IF NOT EXISTS idx_builds_created_at ON builds (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_builds_agent_id ON builds (agent_id);
CREATE INDEX IF NOT EXISTS idx_builds_task_id ON builds (task_id);
CREATE INDEX IF NOT EXISTS idx_builds_user_id ON builds (user_id);

-- Row Level Security
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builds_select_own" ON builds
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "builds_insert_own" ON builds
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "builds_update_own" ON builds
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "builds_delete_own" ON builds
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
