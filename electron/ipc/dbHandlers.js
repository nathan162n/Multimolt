'use strict';

const { ipcMain } = require('electron');
const { getSupabase } = require('../services/supabase');
const requireAuth = require('./requireAuth');

module.exports = function registerDbHandlers() {
  // ---------------------------------------------------------------------------
  // AGENTS
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:agents:list', async () => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('is_preset', { ascending: false })
      .order('name', { ascending: true });

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:agents:get', async (_event, { id }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:agents:upsert', async (_event, { agent }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      ...agent,
      updated_at: new Date().toISOString(),
      user_id: agent.user_id || auth.userId,
    };

    const { data, error } = await supabase
      .from('agents')
      .upsert(record, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:agents:delete', async (_event, { id }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    // Safety: never delete preset agents
    const { data: existing, error: fetchError } = await supabase
      .from('agents')
      .select('is_preset')
      .eq('id', id)
      .single();

    if (fetchError) return { error: fetchError.message };
    if (existing && existing.is_preset) {
      return { error: 'Cannot delete a preset agent' };
    }

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('is_preset', false);

    if (error) return { error: error.message };
    return { data: { deleted: true, id } };
  });

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:tasks:list', async (_event, { limit, offset } = {}) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    }
    if (typeof offset === 'number' && offset > 0) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:tasks:create', async (_event, { task }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      ...task,
      created_at: task.created_at || new Date().toISOString(),
      status: task.status || 'pending',
      user_id: task.user_id || auth.userId,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(record)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:tasks:update', async (_event, { id, updates }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  // ---------------------------------------------------------------------------
  // AUDIT LOG — append-only, NEVER update or delete
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:audit:append', async (_event, { entry }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      ...entry,
      created_at: new Date().toISOString(),
      user_id: entry.user_id || auth.userId,
    };

    const { data, error } = await supabase
      .from('audit_log')
      .insert(record)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:audit:list', async (_event, { limit, agentId, actionType } = {}) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (actionType) {
      query = query.eq('event_type', actionType);
    }
    if (typeof limit === 'number' && limit > 0) {
      query = query.limit(limit);
    } else {
      query = query.limit(200);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data };
  });

  // ---------------------------------------------------------------------------
  // CHECKPOINTS
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:checkpoints:create', async (_event, { checkpoint }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      ...checkpoint,
      created_at: new Date().toISOString(),
      user_id: checkpoint.user_id || auth.userId,
    };

    const { data, error } = await supabase
      .from('checkpoints')
      .insert(record)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:checkpoints:resolve', async (_event, { id, decision }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { data, error } = await supabase
      .from('checkpoints')
      .update({
        decision,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  // ---------------------------------------------------------------------------
  // SKILLS
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:skills:list', async (_event, { agentId } = {}) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    let query = supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:skills:upsert', async (_event, { skill }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      ...skill,
      user_id: skill.user_id || auth.userId,
    };

    const { data, error } = await supabase
      .from('skills')
      .upsert(record, { onConflict: 'id' })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });

  ipcMain.handle('db:skills:delete', async (_event, { id }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { data: { deleted: true, id } };
  });

  // ---------------------------------------------------------------------------
  // USER SETTINGS (key-value store)
  // ---------------------------------------------------------------------------

  ipcMain.handle('db:settings:get', async (_event, { key }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('key', key)
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned — that is not a real error for settings
      return { error: error.message };
    }
    return { data: data || null };
  });

  ipcMain.handle('db:settings:set', async (_event, { key, value }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase not configured' };

    const auth = requireAuth();
    if (auth.error) return { error: auth.error };

    const record = {
      key,
      value,
      updated_at: new Date().toISOString(),
      user_id: auth.userId,
    };

    // Use the composite unique constraint (key, user_id)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(record, { onConflict: 'key,user_id' })
      .select()
      .single();

    if (error) return { error: error.message };
    return { data };
  });
};
