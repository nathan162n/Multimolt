import { useCallback, useEffect, useState } from 'react';
import { getAuthClient } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { syncSessionToMain, clearMainSession } from '../services/auth';

// User-friendly error mapping (hides internal Supabase codes)
const mapAuthError = (err) => {
  if (!err) return 'An unknown error occurred';
  const msg = err.message || '';
  if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
  if (msg.includes('User already registered')) return 'An account with this email already exists.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please try again later.';
  if (msg.includes('Password should be')) return 'Password does not meet requirements.';
  if (msg.includes('not connected') || msg.includes('fetch')) return 'Network error. Check your connection.';
  return 'Authentication failed. Please try again.';
};

export function useAuth() {
  const { session, user, initialized, loading, error } = useAuthStore();
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const clear = useAuthStore((s) => s.clear);

  const [rateLimit, setRateLimit] = useState({ attempts: 0, lockoutUntil: 0 });

  // 1. Initialize Supabase Auth CLient & Listeners
  useEffect(() => {
    let mounted = true;
    let authListener = null;

    async function init() {
      try {
        const supabase = await getAuthClient();
        
        // Listen for internal state changes (including token refresh)
        const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;
          console.log(`[Auth] State changed: ${event}`);

          if (event === 'SIGNED_OUT') {
            clear();
            // Clear the main-process session so DB calls revert to anon
            clearMainSession().catch((err) =>
              console.error('[Auth] Failed to clear main session:', err)
            );
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            // Sync JWT to main process BEFORE updating the store.
            // This ensures the main-process Supabase client is authenticated
            // before RequireAuth unblocks and components start making DB calls.
            if (newSession?.access_token) {
              try {
                await syncSessionToMain(newSession.access_token);
                // After syncing auth, initialize workspaces (non-blocking)
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                  window.hivemind.invoke('app:init-workspaces').catch((err) =>
                    console.warn('[Auth] Workspace init failed:', err)
                  );
                }
              } catch (err) {
                console.error('[Auth] Failed to sync session to main:', err);
              }
            }
            setSession(newSession);
          }
        });
        
        authListener = data.subscription;

        // Try to fetch initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (mounted) {
          if (sessionError) {
            console.error('[Auth] Failed to restore session:', sessionError);
            setSession(null);
          } else {
            // Sync restored session to main process BEFORE setting store
            if (initialSession?.access_token) {
              try {
                await syncSessionToMain(initialSession.access_token);
              } catch (err) {
                console.error('[Auth] Failed to sync restored session to main:', err);
              }
            }
            setSession(initialSession);
          }
        }
      } catch (err) {
        if (mounted) {
          console.warn('[Auth] Initialization skipped or failed:', err.message);
          setSession(null); // Mark as initialized but unauthenticated
        }
      }
    }

    if (!initialized) {
      init();
    }

    return () => {
      mounted = false;
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, [initialized, setSession, clear]);

  // Rate Limiting Check
  const checkRateLimit = useCallback(() => {
    if (Date.now() < rateLimit.lockoutUntil) {
      const wait = Math.ceil((rateLimit.lockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many attempts. Please wait ${wait} seconds.`);
    }
  }, [rateLimit]);

  const recordFailure = useCallback(() => {
    setRateLimit(prev => {
      const attempts = prev.attempts + 1;
      const penaltySeconds = attempts >= 3 ? 12 : attempts >= 2 ? 6 : 3;
      return { attempts, lockoutUntil: Date.now() + (penaltySeconds * 1000) };
    });
  }, []);

  // 2. Auth Methods
  const signIn = useCallback(async (email, password) => {
    checkRateLimit();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (sbError) throw sbError;
      setRateLimit({ attempts: 0, lockoutUntil: 0 }); // clear on success
      return { data, error: null };
    } catch (err) {
      recordFailure();
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [checkRateLimit, recordFailure, setLoading, setError]);

  const signUp = useCallback(async (email, password) => {
    checkRateLimit();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (sbError) throw sbError;
      return { data, error: null };
    } catch (err) {
      recordFailure();
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [checkRateLimit, recordFailure, setLoading, setError]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = await getAuthClient();
      await supabase.auth.signOut();
      clear();
      // Clear main-process session so DB reverts to anon
      await clearMainSession();
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      // Force clear locally anyway
      clear();
      clearMainSession().catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [setLoading, clear]);

  const signInWithOAuth = useCallback(async (provider) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // deep link protocol we registered in main process
          redirectTo: 'hivemind-os://auth/callback',
          skipBrowserRedirect: false,
        },
      });
      if (sbError) throw sbError;
      return { data, error: null };
    } catch (err) {
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const resetPasswordForEmail = useCallback(async (email) => {
    checkRateLimit();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'hivemind-os://auth/callback?type=recovery',
      });
      if (sbError) throw sbError;
      return { data, error: null };
    } catch (err) {
      recordFailure();
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [checkRateLimit, recordFailure, setLoading, setError]);

  const updatePassword = useCallback(async (newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (sbError) throw sbError;
      return { data, error: null };
    } catch (err) {
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  const signInWithOtp = useCallback(async (email) => {
    checkRateLimit();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getAuthClient();
      const { data, error: sbError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: 'hivemind-os://auth/callback',
        }
      });
      if (sbError) throw sbError;
      return { data, error: null };
    } catch (err) {
      recordFailure();
      const friendlyError = mapAuthError(err);
      setError(friendlyError);
      return { data: null, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [checkRateLimit, recordFailure, setLoading, setError]);

  return {
    session,
    user,
    isAuthenticated: !!session,
    initialized,
    loading,
    error,
    rateLimitLockout: Math.max(0, rateLimit.lockoutUntil - Date.now()),
    
    // Actions
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    signInWithOtp,
    resetPasswordForEmail,
    updatePassword,
    clearError: () => setError(null),
  };
}
