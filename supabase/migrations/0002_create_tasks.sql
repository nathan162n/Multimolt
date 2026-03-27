-- ==========================================================================
-- TASKS TABLE
-- Task queue and history. Tracks goals from submission through completion.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  assigned_agents JSONB DEFAULT '[]'::jsonb,
  result          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- Validate status values
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_anon_select" ON tasks
  FOR SELECT TO anon USING (true);

CREATE POLICY "tasks_anon_insert" ON tasks
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "tasks_anon_update" ON tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
