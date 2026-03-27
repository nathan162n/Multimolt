-- ==========================================================================
-- CHECKPOINTS TABLE
-- Security checkpoint decisions. decision is NULL until resolved.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS checkpoints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            TEXT NOT NULL REFERENCES agents(id),
  task_id             UUID REFERENCES tasks(id) ON DELETE SET NULL,
  action_description  TEXT NOT NULL,
  action_payload      JSONB,
  decision            TEXT,
  decided_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Validate decision values (NULL = pending)
ALTER TABLE checkpoints ADD CONSTRAINT chk_checkpoints_decision
  CHECK (decision IS NULL OR decision IN ('approved', 'denied'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_agent_id ON checkpoints (agent_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_task_id ON checkpoints (task_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_decision ON checkpoints (decision);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints (created_at DESC);

-- Row Level Security
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkpoints_anon_select" ON checkpoints
  FOR SELECT TO anon USING (true);

CREATE POLICY "checkpoints_anon_insert" ON checkpoints
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "checkpoints_anon_update" ON checkpoints
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
