-- ==========================================================================
-- MIGRATION 0007: User Authentication & Multi-Tenant Support
--
-- Adds:
--   1. profiles table (extends auth.users with app-specific metadata)
--   2. user_id column on all data tables for per-user data isolation
--   3. Replaces permissive anon RLS policies with authenticated user-scoped policies
--   4. Auto-profile creation trigger on signup
--
-- Preset agents (is_preset=true, user_id=NULL) remain visible to all
-- authenticated users as read-only templates.
-- ==========================================================================

-- =========================================================================
-- 1. PROFILES TABLE
-- =========================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- =========================================================================
-- 2. ADD user_id COLUMN TO ALL DATA TABLES
-- =========================================================================

-- agents: user_id NULL = shared preset template
ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- checkpoints
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id);

-- skills: user_id NULL = global system skill
ALTER TABLE skills ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);

-- user_settings: need composite uniqueness for per-user settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Drop the old key-only PK and replace with composite unique
-- (allows same setting key for different users)
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Backfill id for any existing rows that got NULL
UPDATE user_settings SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE user_settings ADD PRIMARY KEY (id);
ALTER TABLE user_settings ADD CONSTRAINT uq_user_settings_key_user UNIQUE (key, user_id);


-- =========================================================================
-- 3. REPLACE anon POLICIES WITH authenticated USER-SCOPED POLICIES
-- =========================================================================

-- ---- AGENTS ----
DROP POLICY IF EXISTS "agents_anon_select" ON agents;
DROP POLICY IF EXISTS "agents_anon_insert" ON agents;
DROP POLICY IF EXISTS "agents_anon_update" ON agents;
DROP POLICY IF EXISTS "agents_anon_delete" ON agents;

-- Can see own agents + shared presets (user_id IS NULL AND is_preset)
CREATE POLICY "agents_select_own" ON agents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (is_preset = true AND user_id IS NULL));

CREATE POLICY "agents_insert_own" ON agents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_update_own" ON agents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_delete_own" ON agents
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND is_preset = false);


-- ---- TASKS ----
DROP POLICY IF EXISTS "tasks_anon_select" ON tasks;
DROP POLICY IF EXISTS "tasks_anon_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_anon_update" ON tasks;

CREATE POLICY "tasks_select_own" ON tasks
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "tasks_insert_own" ON tasks
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "tasks_update_own" ON tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---- AUDIT LOG (append-only) ----
DROP POLICY IF EXISTS "audit_anon_select" ON audit_log;
DROP POLICY IF EXISTS "audit_anon_insert" ON audit_log;

CREATE POLICY "audit_select_own" ON audit_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "audit_insert_own" ON audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Still NO UPDATE or DELETE policies — audit_log remains append-only


-- ---- CHECKPOINTS ----
DROP POLICY IF EXISTS "checkpoints_anon_select" ON checkpoints;
DROP POLICY IF EXISTS "checkpoints_anon_insert" ON checkpoints;
DROP POLICY IF EXISTS "checkpoints_anon_update" ON checkpoints;

CREATE POLICY "checkpoints_select_own" ON checkpoints
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "checkpoints_insert_own" ON checkpoints
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkpoints_update_own" ON checkpoints
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---- SKILLS ----
DROP POLICY IF EXISTS "skills_anon_select" ON skills;
DROP POLICY IF EXISTS "skills_anon_insert" ON skills;
DROP POLICY IF EXISTS "skills_anon_update" ON skills;
DROP POLICY IF EXISTS "skills_anon_delete" ON skills;

-- Can see own skills + global skills (user_id IS NULL, scope = 'global')
CREATE POLICY "skills_select_own" ON skills
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (scope = 'global' AND user_id IS NULL));

CREATE POLICY "skills_insert_own" ON skills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "skills_update_own" ON skills
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "skills_delete_own" ON skills
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- ---- USER SETTINGS ----
DROP POLICY IF EXISTS "settings_anon_select" ON user_settings;
DROP POLICY IF EXISTS "settings_anon_insert" ON user_settings;
DROP POLICY IF EXISTS "settings_anon_update" ON user_settings;
DROP POLICY IF EXISTS "settings_anon_delete" ON user_settings;

CREATE POLICY "settings_select_own" ON user_settings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "settings_insert_own" ON user_settings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_update_own" ON user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_delete_own" ON user_settings
  FOR DELETE TO authenticated USING (user_id = auth.uid());


-- =========================================================================
-- 4. SERVICE ROLE POLICY FOR SEEDING
-- =========================================================================
-- The service_role bypasses RLS entirely, so seed.sql (which inserts
-- preset agents with user_id = NULL) continues to work without changes.
-- No additional policies needed for the service role.
