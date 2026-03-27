'use strict';

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const gatewayBridge = require('./gatewayBridge');
const { getSupabase } = require('../services/supabase');

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
    const taskId = uuidv4();
    const now = new Date().toISOString();

    // Persist the task in Supabase
    const supabase = getSupabase();
    if (supabase) {
      const { error: taskError } = await supabase.from('tasks').insert({
        id: taskId,
        goal,
        status: 'pending',
        created_at: now,
      });

      if (taskError) {
        console.error('[taskHandlers] Failed to persist task:', taskError.message);
      }

      // Append audit log entry — append-only, never update or delete
      const { error: auditError } = await supabase.from('audit_log').insert({
        event_type: 'goal_submitted',
        task_id: taskId,
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
          completed_at: new Date().toISOString(),
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
          completed_at: new Date().toISOString(),
        }).eq('id', taskId);
      }

      return { error: err.message, taskId };
    }
  });

  // ---------------------------------------------------------------------------
  // task:cancel — Cancel a running task via the Gateway and update Supabase.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:cancel', async (_event, { taskId }) => {
    if (!taskId) return { error: 'taskId is required' };

    const supabase = getSupabase();

    // Send cancel request to gateway
    if (gatewayBridge.isConnected) {
      try {
        await gatewayBridge.request('task.cancel', { taskId });
      } catch (err) {
        console.error('[taskHandlers] Gateway cancel failed:', err.message);
        // Continue anyway — we still update the local record
      }
    }

    // Update the task in Supabase
    if (supabase) {
      const now = new Date().toISOString();

      const { error: taskError } = await supabase.from('tasks').update({
        status: 'cancelled',
        completed_at: now,
      }).eq('id', taskId);

      if (taskError) {
        console.error('[taskHandlers] Failed to update cancelled task:', taskError.message);
      }

      // Audit log
      await supabase.from('audit_log').insert({
        event_type: 'task_cancelled',
        task_id: taskId,
        payload: { reason: 'Cancelled by user' },
        created_at: now,
      });
    }

    // Notify the renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('task:failed', {
        taskId,
        reason: 'Cancelled by user',
        cancelledAt: new Date().toISOString(),
      });
    }

    return { data: { cancelled: true, taskId } };
  });

  // ---------------------------------------------------------------------------
  // task:list — List tasks from Supabase, ordered newest first.
  // ---------------------------------------------------------------------------
  ipcMain.handle('task:list', async (_event, { limit, status } = {}) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

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
