-- ==========================================================================
-- USER SETTINGS TABLE
-- Key/value store for non-sensitive user preferences.
-- Sensitive credentials are stored in electron.safeStorage, NOT here.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS user_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_anon_select" ON user_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "settings_anon_insert" ON user_settings
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "settings_anon_update" ON user_settings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "settings_anon_delete" ON user_settings
  FOR DELETE TO anon USING (true);
