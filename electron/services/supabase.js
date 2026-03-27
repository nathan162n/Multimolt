'use strict';

const { createClient } = require('@supabase/supabase-js');

let supabaseInstance = null;
let currentUserId = null;

/**
 * Build the standard client options. When an accessToken is provided the
 * client authenticates every request with it (required for RLS).
 */
function buildClientOptions(accessToken) {
  const headers = { 'x-application-name': 'hivemind-os' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers },
  };
}

/**
 * Returns the singleton Supabase client.
 * Lazily initializes on first call using environment variables.
 * Returns null if SUPABASE_URL or SUPABASE_ANON_KEY are not configured,
 * indicating the user hasn't completed onboarding yet.
 */
function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  supabaseInstance = createClient(url, anonKey, buildClientOptions());
  return supabaseInstance;
}

/**
 * Returns the current authenticated user's ID, or null.
 */
function getUserId() {
  return currentUserId;
}

/**
 * Decode the `sub` claim from a JWT without verifying the signature.
 * Signature verification is left to Supabase on each DB request.
 * We also reject obviously expired tokens.
 */
function decodeJwtClaims(jwt) {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  if (!payload.sub) throw new Error('JWT missing sub claim');

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT is expired');
  }

  return payload;
}

/**
 * Set the user's auth session on the main-process Supabase client.
 * Called when the renderer authenticates or refreshes its token.
 * Recreates the client with the user's JWT in the Authorization header
 * so all subsequent DB requests pass RLS checks.
 *
 * userId is extracted from the JWT `sub` claim — never trusted from the renderer.
 *
 * @param {string} accessToken — JWT access token from Supabase Auth
 */
function setUserSession(accessToken) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase not configured — cannot set user session');
  }

  const claims = decodeJwtClaims(accessToken);
  currentUserId = claims.sub;
  supabaseInstance = createClient(url, anonKey, buildClientOptions(accessToken));
}

/**
 * Clear the user session (sign out). Recreates an anonymous client.
 */
function clearUserSession() {
  currentUserId = null;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (url && anonKey) {
    supabaseInstance = createClient(url, anonKey, buildClientOptions());
  } else {
    supabaseInstance = null;
  }
}

/**
 * Reconfigure the Supabase client with new credentials.
 * Called during the onboarding flow when the user provides
 * their Supabase URL and anon key for the first time,
 * or when updating credentials in settings.
 */
function reconfigure(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('Both url and anonKey are required to reconfigure Supabase');
  }

  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_ANON_KEY = anonKey;

  supabaseInstance = createClient(url, anonKey, buildClientOptions());
  currentUserId = null;

  return supabaseInstance;
}

module.exports = { getSupabase, getUserId, setUserSession, clearUserSession, reconfigure };
