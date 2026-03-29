-- Ensure tasks.completed_at exists. Older or manually created databases may have a
-- tasks table from before this column was added; CREATE TABLE IF NOT EXISTS does not
-- add new columns to an existing table, which causes PostgREST errors when the app
-- updates completed_at on cancel / complete / fail.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
