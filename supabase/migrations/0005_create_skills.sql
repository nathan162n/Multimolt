-- ==========================================================================
-- SKILLS TABLE
-- Installed skills registry. Skills can be global or agent-scoped.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS skills (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  version       TEXT,
  scope         TEXT NOT NULL DEFAULT 'global',
  agent_id      TEXT REFERENCES agents(id) ON DELETE CASCADE,
  skill_content TEXT,
  enabled       BOOLEAN DEFAULT true,
  installed_at  TIMESTAMPTZ DEFAULT now()
);

-- Validate scope values
ALTER TABLE skills ADD CONSTRAINT chk_skills_scope
  CHECK (scope IN ('global', 'agent'));

-- agent_id must be set when scope is 'agent'
ALTER TABLE skills ADD CONSTRAINT chk_skills_agent_scope
  CHECK (scope = 'global' OR agent_id IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_scope ON skills (scope);
CREATE INDEX IF NOT EXISTS idx_skills_agent_id ON skills (agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills (enabled);

-- Row Level Security
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills_anon_select" ON skills
  FOR SELECT TO anon USING (true);

CREATE POLICY "skills_anon_insert" ON skills
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "skills_anon_update" ON skills
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "skills_anon_delete" ON skills
  FOR DELETE TO anon USING (true);
