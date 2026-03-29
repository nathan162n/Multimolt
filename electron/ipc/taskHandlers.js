'use strict';

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const gatewayBridge = require('./gatewayBridge');
const { getSupabase } = require('../services/supabase');
const requireAuth = require('./requireAuth');

/**
 * Register all task:* IPC handlers.
 * Tasks flow through the Gateway for execution and are persisted in Supabase.
 * @param {Electron.BrowserWindow} mainWindow
 */
module.exports = function registerTaskHandlers(mainWindow) {
  // ---------------------------------------------------------------------------
  // task:submit-goal — The primary action: send a high-level goal to the Gateway.
  // Creates a task record in Supabase, appends an audit log entry, and sends
  // the goal to the Gateway which will decompose it through the Orchestrator.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:submit-goal', async (_event, { goal, metadata }) => {
    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Persist the task in Supabase
    const supabase = getSupabase();
    if (supabase) {
      const { error: taskError } = await supabase.from('tasks').insert({
        id: taskId,
        goal,
        status: 'pending',
        user_id: auth.userId,
        created_at: now,
      });

      if (taskError) {
        console.error('[taskHandlers] Failed to persist task:', taskError.message);
      }

      // Append audit log entry — append-only, never update or delete
      const { error: auditError } = await supabase.from('audit_log').insert({
        event_type: 'goal_submitted',
        task_id: taskId,
        user_id: auth.userId,
        payload: {
          goal,
          metadata: metadata || {},
        },
        created_at: now,
      });

      if (auditError) {
        console.error('[taskHandlers] Failed to write audit log:', auditError.message);
      }
    }

    // Send the goal to the Gateway for execution
    if (!gatewayBridge.isConnected) {
      // Update the task status to reflect gateway unavailability
      if (supabase) {
        await supabase.from('tasks').update({
          status: 'failed',
          result: 'Gateway not connected',
        }).eq('id', taskId);
      }
      return { error: 'Gateway not connected', taskId };
    }

    try {
      const result = await gatewayBridge.request('task.submit', {
        taskId,
        goal,
        metadata: metadata || {},
      });

      // Update task status to running
      if (supabase) {
        await supabase.from('tasks').update({
          status: 'running',
          assigned_agents: result?.agents || [],
        }).eq('id', taskId);
      }

      // Forward the task:started event to the renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('task:started', {
          taskId,
          goal,
          startedAt: new Date().toISOString(),
        });
      }

      return { data: { taskId, ...result } };
    } catch (err) {
      // Update task with failure
      if (supabase) {
        await supabase.from('tasks').update({
          status: 'failed',
          result: err.message,
        }).eq('id', taskId);
      }

      return { error: err.message, taskId };
    }
  });

  // ---------------------------------------------------------------------------
  // task:cancel — Cancel a running task via the Gateway and update Supabase.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:cancel', async (_event, { taskId }) => {
    const id =
      typeof taskId === 'string' ? taskId.trim() : String(taskId ?? '').trim();
    if (!id) return { error: 'taskId is required' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const { data: row, error: fetchErr } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return { error: fetchErr.message };
    if (!row) return { error: 'Task not found' };
    if (!['pending', 'running'].includes(row.status)) {
      return { error: 'Only pending or running tasks can be cancelled or stopped' };
    }

    // Persist cancellation in the DB first so the UI can refresh immediately.
    // Awaiting gateway.task.cancel before this blocked the IPC for up to the
    // request timeout; pending tasks especially may get a slow/no response from
    // the gateway even though the row should be cleared right away.
    const now = new Date().toISOString();

    // Omit completed_at: some databases lack this column (schema drift); status
    // alone is enough for cancel. cancelledAt is still sent to the renderer below.
    const { data: updatedRows, error: taskError } = await supabase
      .from('tasks')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('id');

    if (taskError) return { error: taskError.message };
    if (!updatedRows || updatedRows.length === 0) {
      return {
        error:
          'Task could not be updated. It may belong to another account or was already completed.',
      };
    }

    const { error: auditError } = await supabase.from('audit_log').insert({
      event_type: 'task_cancelled',
      task_id: id,
      user_id: auth.userId,
      payload: { reason: 'Cancelled by user' },
      created_at: now,
    });
    if (auditError) {
      console.error('[taskHandlers] audit_log insert failed:', auditError.message);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('task:cancelled', {
        taskId: id,
        reason: 'Cancelled by user',
        cancelledAt: now,
      });
    }

    if (gatewayBridge.isConnected) {
      gatewayBridge.request('task.cancel', { taskId: id }).catch((err) => {
        console.error('[taskHandlers] Gateway cancel failed:', err.message);
      });
    }

    return { data: { cancelled: true, taskId: id } };
  });

  // ---------------------------------------------------------------------------
  // task:list — List tasks from Supabase, ordered newest first.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:list', async (_event, { limit, status } = {}) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data };
  });

  // ---------------------------------------------------------------------------
  // task:get — Retrieve a single task by ID.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:get', async (_event, { taskId }) => {
    if (!taskId) return { error: 'taskId is required' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    // Try gateway first for real-time state
    if (gatewayBridge.isConnected) {
      try {
        const result = await gatewayBridge.request('task.get', { taskId });
        return { data: result };
      } catch (_) {
        // Fall through to Supabase
      }
    }

    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) return { error: error.message };
    return { data };
  });
};
