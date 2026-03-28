'use strict';

const { ipcMain, shell } = require('electron');
const secureTokenStorage = require('../services/secureTokenStorage');
const { setUserSession, clearUserSession } = require('../services/supabase');

/**
 * Register all auth:* IPC handlers.
 * @param {Electron.BrowserWindow} mainWindow
 */
module.exports = function registerAuthHandlers(mainWindow) {
  // =========================================================================
  // CUSTOM STORAGE ADAPTER — used by renderer's Supabase client
  // These 3 channels implement the getItem/setItem/removeItem interface
  // that the Supabase JS client needs for its custom storage option.
  // =========================================================================

  ipcMain.handle('auth:storage:get', async (_event, { key }) => {
    if (!key) return { data: null };
    try {
      const value = await secureTokenStorage.getItem(key);
      return { data: value };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:storage:set', async (_event, { key, value }) => {
    if (!key) return { error: 'key is required' };
    try {
      await secureTokenStorage.setItem(key, value);
      return { data: { saved: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:storage:remove', async (_event, { key }) => {
    if (!key) return { error: 'key is required' };
    try {
      await secureTokenStorage.removeItem(key);
      return { data: { removed: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  // =========================================================================
  // SESSION PERSISTENCE — high-level session save/load/clear
  // =========================================================================

  ipcMain.handle('auth:get-session', async () => {
    try {
      const session = await secureTokenStorage.loadSession();
      return { data: session };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:save-session', async (_event, { session }) => {
    if (!session) return { error: 'session object is required' };
    try {
      await secureTokenStorage.saveSession(session);
      return { data: { saved: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:clear-session', async () => {
    try {
      await secureTokenStorage.clearSession();
      return { data: { cleared: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  // =========================================================================
  // SESSION SYNC — bridge renderer auth to main-process Supabase client
  //
  // When the renderer authenticates (sign-in, token refresh), it sends the
  // access token here. The main-process Supabase client is recreated with
  // the JWT in its Authorization header so all DB operations pass RLS.
  // =========================================================================

  ipcMain.handle('auth:sync-session', async (_event, { accessToken }) => {
    if (!accessToken) {
      return { error: 'accessToken is required' };
    }
    try {
      setUserSession(accessToken);
      console.log('[Auth] Session synced to main process');
      return { data: { synced: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:clear-main-session', async () => {
    try {
      clearUserSession();
      await secureTokenStorage.clearSession();
      console.log('[Auth] Main-process session cleared');
      return { data: { cleared: true } };
    } catch (err) {
      return { error: err.message };
    }
  });

  // =========================================================================
  // SUPABASE CONFIG — provide URL + anon key to renderer
  // =========================================================================

  ipcMain.handle('auth:get-supabase-config', async () => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return {
        error: 'Supabase is not configured. Complete onboarding first.',
      };
    }

    return {
      data: { url, anonKey },
    };
  });

  // =========================================================================
  // OPEN EXTERNAL — open OAuth URLs in system browser
  //
  // In Electron the will-navigate handler blocks external URLs, so OAuth
  // must use skipBrowserRedirect:true and open the URL via shell.openExternal.
  // Only Supabase auth URLs are allowed to prevent open-redirect abuse.
  // =========================================================================

  ipcMain.handle('auth:open-external', async (_event, { url }) => {
    if (!url) return { error: 'url is required' };

    try {
      const parsed = new URL(url);

      // Only allow Supabase auth URLs and well-known OAuth providers
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;
      const allowedHosts = [
        supabaseHost,
        'accounts.google.com',
        'github.com',
      ].filter(Boolean);

      if (!allowedHosts.includes(parsed.host)) {
        return { error: `Blocked: ${parsed.host} is not an allowed OAuth host` };
      }

      await shell.openExternal(url);
      return { data: { opened: true } };
    } catch (err) {
      return { error: err.message };
    }
  });
};
