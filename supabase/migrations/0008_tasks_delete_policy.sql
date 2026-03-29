-- Allow authenticated users to delete their own task rows (e.g. remove failed tasks from history).
-- audit_log.task_id and checkpoints.task_id use ON DELETE SET NULL.

CREATE POLICY "tasks_delete_own" ON tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
