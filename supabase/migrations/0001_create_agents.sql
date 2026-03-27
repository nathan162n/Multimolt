-- ==========================================================================
-- AGENTS TABLE
-- All agent definitions (preset + custom). The 9 presets are seeded rows.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL,
  model           TEXT NOT NULL,
  workspace       TEXT,
  soul_content    TEXT,
  agents_content  TEXT,
  tools_allow     JSONB DEFAULT '[]'::jsonb,
  tools_deny      JSONB DEFAULT '[]'::jsonb,
  sandbox_mode    TEXT DEFAULT 'all',
  is_preset       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for filtering preset vs custom agents
CREATE INDEX IF NOT EXISTS idx_agents_is_preset ON agents (is_preset);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_agents_updated_at();

-- Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_anon_select" ON agents
  FOR SELECT TO anon USING (true);

CREATE POLICY "agents_anon_insert" ON agents
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "agents_anon_update" ON agents
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "agents_anon_delete" ON agents
  FOR DELETE TO anon USING (is_preset = false);
