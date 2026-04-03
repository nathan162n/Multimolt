'use strict';

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** Timeout (ms) to wait for a protocol v3 challenge before falling back to v1.0 */
const CHALLENGE_TIMEOUT_MS = 8000;

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function base64UrlEncode(buf) {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function derivePublicKeyRaw(publicKeyPem) {
  const spki = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem) {
  return crypto.createHash('sha256').update(derivePublicKeyRaw(publicKeyPem)).digest('hex');
}

function resolveIdentityDir() {
  return path.join(os.homedir(), '.openclaw', 'identity');
}

function loadOrCreateDeviceIdentity() {
  const filePath = path.join(resolveIdentityDir(), 'device.json');
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed?.version === 1 && parsed.deviceId && parsed.publicKeyPem && parsed.privateKeyPem) {
        return { deviceId: parsed.deviceId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem };
      }
    }
  } catch (_) { /* fall through to generate */ }
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const deviceId = fingerprintPublicKey(publicKeyPem);
  const stored = { version: 1, deviceId, publicKeyPem, privateKeyPem, createdAtMs: Date.now() };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(stored, null, 2) + '\n', { mode: 0o600 });
  return { deviceId, publicKeyPem, privateKeyPem };
}

function resolveDeviceAuthPath() {
  return path.join(resolveIdentityDir(), 'device-auth.json');
}

function loadDeviceAuthToken(deviceId, role) {
  try {
    const raw = JSON.parse(fs.readFileSync(resolveDeviceAuthPath(), 'utf8'));
    if (raw?.deviceId !== deviceId) return null;
    const entry = raw.tokens?.[role];
    return entry?.token || null;
  } catch (_) { return null; }
}

function storeDeviceAuthToken(deviceId, role, token, scopes) {
  const filePath = resolveDeviceAuthPath();
  let store = { version: 1, deviceId, tokens: {} };
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (existing?.deviceId === deviceId) store = existing;
    else store.tokens = {};
  } catch (_) { /* start fresh */ }
  store.deviceId = deviceId;
  store.tokens[role] = { token, scopes, storedAtMs: Date.now() };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2) + '\n', { mode: 0o600 });
}

function normalizeDeviceMetadata(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

function buildDeviceAuthPayloadV3(params) {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
    normalizeDeviceMetadata(params.platform),
    normalizeDeviceMetadata(params.deviceFamily),
  ].join('|');
}

function signDevicePayload(privateKeyPem, payload) {
  const key = crypto.createPrivateKey(privateKeyPem);
  return base64UrlEncode(crypto.sign(null, Buffer.from(payload, 'utf8'), key));
}

function publicKeyRawBase64Url(publicKeyPem) {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

class GatewayBridge {
  constructor() {
    /** @type {WebSocket|null} */
    this.ws = null;
    /** @type {Electron.BrowserWindow|null} */
    this.mainWindow = null;
    /** @type {Map<string, {resolve: Function, reject: Function, timeout: NodeJS.Timeout}>} */
    this.pendingRequests = new Map();
    /** @type {number} Current reconnect delay in ms */
    this.reconnectDelay = 1000;
    /** @type {number} Maximum backoff ceiling in ms */
    this.maxReconnectDelay = 30000;
    /** @type {boolean} Whether the WebSocket is currently open and authenticated */
    this.isConnected = false;
    /** @type {boolean} Whether to attempt reconnection after a close event */
    this.shouldReconnect = true;
    /** @type {string|null} The URL we are connected or connecting to */
    this._url = null;
    /** @type {NodeJS.Timeout|null} Reconnection timer handle */
    this._reconnectTimer = null;
    /** @type {number} Negotiated protocol version (1 or 3) */
    this._protocolVersion = 1;
    /** @type {NodeJS.Timeout|null} Timer waiting for v3 challenge */
    this._challengeTimer = null;
    /** @type {NodeJS.Timeout|null} Tick keepalive interval */
    this._tickInterval = null;
    /** @type {number} Tick interval in ms from hello-ok */
    this._tickIntervalMs = 15000;
    /** @type {boolean} Whether the connect handshake has completed */
    this._handshakeComplete = false;
    /** @type {Array<{ resolve: Function, reject: Function, timer: NodeJS.Timeout }>} IPC waiters for handshake */
    this._handshakeWaiters = [];
    /**
     * Token for connect frames — set from loadGatewayToken() (env + Settings keychain).
     * `null` means "not loaded yet"; fall back to env only for tests.
     * @type {string|null}
     */
    this._connectToken = null;
    /** @type {{ deviceId: string, publicKeyPem: string, privateKeyPem: string }|null} */
    this._deviceIdentity = null;
  }

  /**
   * Set the token used in v3/v1 connect auth (call after loadGatewayToken()).
   * @param {string} token
   */
  setConnectToken(token) {
    this._connectToken = token != null ? String(token).trim() : '';
  }

  _getConnectToken() {
    if (this._connectToken !== null) return this._connectToken;
    return (process.env.OPENCLAW_GATEWAY_TOKEN || '').trim();
  }

  /**
   * Store a reference to the main BrowserWindow for event forwarding.
   * @param {Electron.BrowserWindow} mainWindow
   */
  init(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Wait until the connect handshake completes (v3 hello-ok or v1.0 synthetic).
   * Used by IPC so the renderer only resolves after the gateway is usable.
   * @param {number} [timeoutMs=15000]
   * @returns {Promise<void>}
   */
  waitUntilHandshake(timeoutMs = 15000) {
    if (this._handshakeComplete && this.isConnected) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const entry = {
        resolve: () => resolve(),
        reject: (err) => reject(err),
        timer: setTimeout(() => {
          const i = this._handshakeWaiters.indexOf(entry);
          if (i >= 0) this._handshakeWaiters.splice(i, 1);
          reject(new Error(`Gateway handshake timed out after ${timeoutMs}ms`));
        }, timeoutMs),
      };
      this._handshakeWaiters.push(entry);
    });
  }

  _resolveHandshakeWaiters() {
    while (this._handshakeWaiters.length) {
      const w = this._handshakeWaiters.shift();
      clearTimeout(w.timer);
      w.resolve();
    }
  }

  _rejectHandshakeWaiters(message) {
    const err = message instanceof Error ? message : new Error(message);
    while (this._handshakeWaiters.length) {
      const w = this._handshakeWaiters.shift();
      clearTimeout(w.timer);
      w.reject(err);
    }
  }

  /**
   * Open a WebSocket connection to the OpenClaw Gateway.
   * Supports both protocol v3 (challenge-response) and v1.0 (simple connect) with
   * automatic fallback: if no challenge arrives within 3s, falls back to v1.0.
   * @param {string} url  WebSocket URL (default ws://127.0.0.1:18789)
   */
  connect(url = 'ws://127.0.0.1:18789') {
    // Clean up any previous connection attempt
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    // Resume auto-reconnect after any intentional connect() (e.g. macOS window reopen).
    // disconnect() sets this false so user "Disconnect" stays off until they connect again.
    this.shouldReconnect = true;
    if (this._challengeTimer) {
      clearTimeout(this._challengeTimer);
      this._challengeTimer = null;
    }
    this._stopTick();

    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (_) {
        // Ignore cleanup errors
      }
    }

    this._url = url;
    this._handshakeComplete = false;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.forwardToRenderer('gateway:error', { message: err.message });
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      this.reconnectDelay = 1000;

      // Wait for a protocol v3 challenge event from the gateway.
      // If no challenge arrives within CHALLENGE_TIMEOUT_MS, fall back to v1.0.
      this._challengeTimer = setTimeout(() => {
        this._challengeTimer = null;
        if (!this._handshakeComplete) {
          this._sendV1Connect();
        }
      }, CHALLENGE_TIMEOUT_MS);
    });

    this.ws.on('message', (raw) => {
      let frame;
      try {
        frame = JSON.parse(raw.toString());
      } catch (err) {
        console.error('[GatewayBridge] Failed to parse incoming frame:', err.message);
        return;
      }

      if (frame.type === 'res') {
        // v3 connect rejected (bad token, policy, etc.) — surface error instead of hanging
        if (!this._handshakeComplete) {
          if (frame.ok && frame.payload?.type === 'hello-ok') {
            this._onHandshakeComplete(frame.payload);
            return;
          }
          if (!frame.ok) {
            const msg =
              frame.error?.message ||
              frame.error ||
              'Gateway rejected the connect handshake (check token and gateway config)';
            console.error('[GatewayBridge]', msg);
            this.forwardToRenderer('gateway:error', { message: msg });
            this._rejectHandshakeWaiters(new Error(msg));
            if (this._challengeTimer) {
              clearTimeout(this._challengeTimer);
              this._challengeTimer = null;
            }
            try {
              if (this.ws) this.ws.close();
            } catch (_) {
              /* ignore */
            }
            return;
          }
        }

        const pending = this.pendingRequests.get(frame.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(frame.id);
          if (frame.ok) {
            pending.resolve(frame.payload);
          } else {
            pending.reject(new Error(frame.error?.message || frame.error || 'Gateway request failed'));
          }
        }
      } else if (frame.type === 'event') {
        // Intercept connect.challenge before general event handling
        if (frame.event === 'connect.challenge' && !this._handshakeComplete) {
          this._handleChallenge(frame.payload);
          return;
        }
        this.handleEvent(frame);
      }
    });

    this.ws.on('close', (code, reason) => {
      const wasConnected = this.isConnected;
      const handshakeDone = this._handshakeComplete;
      this.isConnected = false;
      this._handshakeComplete = false;

      if (this._challengeTimer) {
        clearTimeout(this._challengeTimer);
        this._challengeTimer = null;
      }
      this._stopTick();

      // Reject all pending requests since the connection is gone
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Gateway connection closed'));
      }
      this.pendingRequests.clear();

      if (this._handshakeWaiters.length > 0 && !handshakeDone) {
        this._rejectHandshakeWaiters(
          reason
            ? `Gateway closed: ${reason.toString()}`
            : `Gateway closed (code ${code})`
        );
      }

      this.forwardToRenderer('gateway:disconnected', {
        code,
        reason: reason ? reason.toString() : '',
        wasConnected,
      });

      // After a working session (or completed handshake), retry soon — e.g. user ran
      // `openclaw gateway restart` and the gateway is back within seconds.
      if (wasConnected || handshakeDone) {
        this.reconnectDelay = 1000;
      }

      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      // The 'close' event always fires after 'error', so reconnection
      // is handled there. We only forward the error to the renderer.
      this.forwardToRenderer('gateway:error', { message: err.message });
    });
  }

  /**
   * Handle a protocol v3 challenge from the gateway.
   * Responds with the full connect request including client info and auth.
   * @param {object} payload  The challenge payload containing nonce
   * @private
   */
  _handleChallenge(payload) {
    if (this._challengeTimer) {
      clearTimeout(this._challengeTimer);
      this._challengeTimer = null;
    }

    this._protocolVersion = 3;
    const role = 'operator';
    const scopes = ['operator.read', 'operator.write', 'operator.approvals'];
    const nonce = payload?.nonce || '';
    const signedAtMs = Date.now();
    const clientId = 'gateway-client';
    const clientMode = 'backend';
    const platform = process.platform;

    if (!this._deviceIdentity) {
      try { this._deviceIdentity = loadOrCreateDeviceIdentity(); }
      catch (err) { console.error('[GatewayBridge] Failed to load device identity:', err.message); }
    }

    const explicitToken = this._getConnectToken() || undefined;
    const storedDeviceToken = this._deviceIdentity
      ? loadDeviceAuthToken(this._deviceIdentity.deviceId, role)
      : null;
    const resolvedDeviceToken = !explicitToken ? (storedDeviceToken || undefined) : undefined;
    const effectiveAuthToken = explicitToken || resolvedDeviceToken || undefined;
    const signatureToken = effectiveAuthToken || null;

    let device;
    if (this._deviceIdentity) {
      const authPayload = buildDeviceAuthPayloadV3({
        deviceId: this._deviceIdentity.deviceId,
        clientId,
        clientMode,
        role,
        scopes,
        signedAtMs,
        token: signatureToken,
        nonce,
        platform,
        deviceFamily: undefined,
      });
      const signature = signDevicePayload(this._deviceIdentity.privateKeyPem, authPayload);
      device = {
        id: this._deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64Url(this._deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      };
    }

    const auth = {};
    if (effectiveAuthToken) auth.token = effectiveAuthToken;

    this.sendFrame({
      type: 'req',
      id: uuidv4(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: clientId,
          version: '0.1.0',
          platform,
          mode: clientMode,
        },
        role,
        scopes,
        auth: Object.keys(auth).length > 0 ? auth : undefined,
        device,
      },
    });
  }

  /**
   * Send a v1.0 simple connect frame (fallback when no challenge arrives).
   * @private
   */
  _sendV1Connect() {
    this._protocolVersion = 1;
    const connectId = uuidv4();

    this.sendFrame({
      type: 'req',
      id: connectId,
      method: 'connect',
      params: {
        version: '1.0',
        token: this._getConnectToken(),
      },
    });

    // Mark as connected immediately for v1.0 (no hello-ok expected)
    this._onHandshakeComplete({ protocol: 1 });
  }

  /**
   * Called when the connect handshake completes (either v3 hello-ok or v1.0 fallback).
   * @param {object} payload  The hello-ok payload or synthetic v1 payload
   * @private
   */
  _onHandshakeComplete(payload) {
    this._handshakeComplete = true;
    this.isConnected = true;

    // Handshake succeeded — cancel any pending auto-reconnect. A stale timer must
    // not call connect() later; that would abort this working socket.
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this.reconnectDelay = 1000;

    // Persist device auth token for reconnection if the gateway issues one
    const authInfo = payload?.auth;
    if (authInfo?.deviceToken && this._deviceIdentity) {
      try {
        storeDeviceAuthToken(
          this._deviceIdentity.deviceId,
          authInfo.role ?? 'operator',
          authInfo.deviceToken,
          authInfo.scopes ?? []
        );
      } catch (err) {
        console.error('[GatewayBridge] Failed to store device auth token:', err.message);
      }
    }

    // Start tick keepalive if the gateway specifies an interval
    const tickMs = payload?.policy?.tickIntervalMs || payload?.tick?.interval;
    if (tickMs && typeof tickMs === 'number') {
      this._tickIntervalMs = tickMs;
    }

    this.forwardToRenderer('gateway:connected', {
      url: this._url,
      protocol: this._protocolVersion,
    });
    this._resolveHandshakeWaiters();
  }

  /**
   * Start the tick keepalive timer. Not used for v1.0 connections.
   * @param {number} intervalMs
   * @private
   */
  _startTick(intervalMs) {
    this._stopTick();
    this._tickInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendFrame({
          type: 'event',
          event: 'tick.pong',
          payload: { timestamp: Date.now() },
        });
      }
    }, intervalMs);
  }

  /**
   * Stop the tick keepalive timer.
   * @private
   */
  _stopTick() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * @private
   */
  _scheduleReconnect() {
    if (!this.shouldReconnect || !this._url) {
      return;
    }
    // Always clear the previous timer. Without this, rapid close/error sequences
    // leave orphaned timeouts; when they fire they call connect() and tear down a
    // healthy socket (connected briefly, then disconnected again).
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect(this._url);
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Process an incoming event frame from the Gateway.
   * All events are forwarded to the renderer via 'gateway:event'.
   * Specific event types get additional targeted forwarding.
   * @param {object} frame  The parsed EventFrame from the Gateway
   */
  handleEvent(frame) {
    // Respond to tick events with a pong — do not forward to renderer
    if (frame.event === 'tick') {
      this.sendFrame({
        type: 'event',
        event: 'tick.pong',
        payload: { seq: frame.seq, timestamp: Date.now() },
      });
      return;
    }

    // Forward every event to the renderer under the generic channel
    this.forwardToRenderer('gateway:event', frame);

    // Security checkpoint — special handling, triggers the blocking modal
    if (frame.event === 'agent' && frame.payload?.type === 'security_checkpoint') {
      this.forwardToRenderer('security:checkpoint', frame.payload);
    }

    // Security violation — non-blocking warning banner
    if (frame.event === 'agent' && frame.payload?.type === 'security_violation') {
      this.forwardToRenderer('security:violation', frame.payload);
    }

    // Forward typed agent events to dedicated channels with normalized payloads
    if (frame.event === 'agent') {
      const payload = frame.payload || {};

      if (payload.type === 'status') {
        // Normalize: mock gateway nests status in content, real gateway may use flat structure
        this.forwardToRenderer('agent:status-changed', {
          agentId: payload.agentId,
          status: payload.content?.status || payload.status,
          currentAction: payload.content?.currentAction || payload.currentAction || null,
        });
      }
      if (payload.type === 'message' || payload.type === 'response') {
        this.forwardToRenderer('agent:message-received', {
          agentId: payload.agentId,
          text: payload.content?.text || payload.text || payload.message || '',
          recipient: payload.content?.recipient || payload.recipient || null,
          timestamp: payload.content?.timestamp || payload.timestamp || null,
        });
      }
      if (payload.type === 'action' || payload.type === 'tool_call') {
        this.forwardToRenderer('agent:action-taken', payload);
      }
    }

    // Build lifecycle events — sync to Supabase
    if (frame.event === 'build') {
      const payload = frame.payload || {};
      const status = payload.status;

      if (status === 'started') {
        this._syncBuildStarted(payload);
      } else if (status === 'completed') {
        this._syncBuildCompletion(payload.buildId, 'completed', payload);
      } else if (status === 'failed') {
        this._syncBuildCompletion(payload.buildId, 'failed', payload);
      }
    }

    // Task lifecycle events — also sync to Supabase
    if (frame.event === 'task') {
      const payload = frame.payload || {};
      const status = payload.status;

      if (status === 'started') {
        this.forwardToRenderer('task:started', payload);
      } else if (status === 'progress') {
        this.forwardToRenderer('task:progress', payload);
      } else if (status === 'completed') {
        this.forwardToRenderer('task:completed', payload);
        this._syncTaskCompletion(payload.taskId, 'completed', payload.result);
      } else if (status === 'failed') {
        this.forwardToRenderer('task:failed', payload);
        this._syncTaskCompletion(payload.taskId, 'failed', payload.error || payload.reason);
      }
    }
  }

  /**
   * Sync a task completion/failure event from the gateway to Supabase.
   * This ensures the DB reflects the final state of tasks that the gateway manages.
   * @param {string} taskId
   * @param {string} status  'completed' or 'failed'
   * @param {string} [result]  Result text or error message
   * @private
   */
  async _syncTaskCompletion(taskId, status, result) {
    if (!taskId) return;

    try {
      const { getSupabase, getUserId } = require('../services/supabase');
      const supabase = getSupabase();
      if (!supabase) return;

      const now = new Date().toISOString();
      const userId = getUserId();

      const updates = {
        status,
        result: result || null,
      };
      if (status === 'completed' || status === 'failed') {
        updates.completed_at = now;
      }

      const { error: taskErr } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (taskErr) {
        console.error(
          '[GatewayBridge] Failed to sync task completion (tasks update):',
          taskErr.message
        );
        return;
      }

      if (userId) {
        const { safeInsert } = require('../services/supabase');
        const { error: auditErr } = await safeInsert(supabase, 'audit_log', {
          event_type: `task_${status}`,
          task_id: taskId,
          user_id: userId,
          payload: { result: result || null },
          created_at: now,
        });
        if (auditErr) {
          console.error('[GatewayBridge] audit_log insert failed:', auditErr.message);
        }
      }
    } catch (err) {
      console.error('[GatewayBridge] Failed to sync task completion to DB:', err.message);
    }
  }

  /**
   * Create or update a build record in Supabase when the gateway reports a build started.
   * @param {object} payload
   * @private
   */
  async _syncBuildStarted(payload) {
    if (!payload?.buildId) return;
    try {
      const { getSupabase, getUserId } = require('../services/supabase');
      const supabase = getSupabase();
      if (!supabase) return;
      const userId = getUserId();

      const now = new Date().toISOString();
      const record = {
        id: payload.buildId,
        title: payload.title || payload.goal || 'Untitled build',
        description: payload.description || null,
        status: 'running',
        agent_id: payload.agentId || null,
        task_id: payload.taskId || null,
        metadata: payload.metadata || {},
        started_at: now,
        created_at: now,
      };
      if (userId) record.user_id = userId;

      const { safeUpsert } = require('../services/supabase');
      const { error } = await safeUpsert(supabase, 'builds', record, { onConflict: 'id' });

      if (error) {
        console.error('[GatewayBridge] Failed to sync build started:', error.message);
      }
    } catch (err) {
      console.error('[GatewayBridge] Failed to sync build started:', err.message);
    }
  }

  /**
   * Sync a build completion/failure event from the gateway to Supabase.
   * @param {string} buildId
   * @param {string} status  'completed' or 'failed'
   * @param {object} payload
   * @private
   */
  async _syncBuildCompletion(buildId, status, payload) {
    if (!buildId) return;
    try {
      const { getSupabase, getUserId } = require('../services/supabase');
      const supabase = getSupabase();
      if (!supabase) return;

      const now = new Date().toISOString();
      const updates = {
        status,
        output: payload?.output || payload?.result || payload?.error || null,
        artifact_url: payload?.artifactUrl || null,
        completed_at: now,
      };

      const { error } = await supabase
        .from('builds')
        .update(updates)
        .eq('id', buildId);

      if (error) {
        console.error('[GatewayBridge] Failed to sync build completion:', error.message);
      }

      const userId = getUserId();
      if (userId) {
        const { safeInsert } = require('../services/supabase');
        const { error: auditErr } = await safeInsert(supabase, 'audit_log', {
          event_type: `build_${status}`,
          payload: { buildId, output: updates.output },
          user_id: userId,
          created_at: now,
        });
        if (auditErr) {
          console.error('[GatewayBridge] audit_log insert for build failed:', auditErr.message);
        }
      }
    } catch (err) {
      console.error('[GatewayBridge] Failed to sync build completion to DB:', err.message);
    }
  }

  /**
   * Send a request to the Gateway and return a promise that resolves
   * when the matching response frame arrives.
   * @param {string} method    The RPC method name (e.g. 'agent.list')
   * @param {object} params    Parameters for the request
   * @param {number} timeoutMs Timeout in milliseconds before rejecting
   * @returns {Promise<object>} The response payload
   */
  request(method, params = {}, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Gateway not connected'));
      }

      const id = uuidv4();

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.sendFrame({
        type: 'req',
        id,
        method,
        params,
      });
    });
  }

  /**
   * Serialize and send a frame over the WebSocket if the connection is open.
   * @param {object} frame  The frame to send
   */
  sendFrame(frame) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
  }

  /**
   * Forward data to the renderer process via the main window's webContents.
   * Silently drops the message if the window has been destroyed.
   * @param {string} channel  The IPC channel name
   * @param {*} data          The data to send
   */
  forwardToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Gracefully disconnect from the Gateway and stop reconnection attempts.
   */
  disconnect() {
    this.shouldReconnect = false;
    this._rejectHandshakeWaiters('Gateway disconnected by client');

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._challengeTimer) {
      clearTimeout(this._challengeTimer);
      this._challengeTimer = null;
    }
    this._stopTick();

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Gateway disconnected by client'));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'Client disconnect');
        }
      } catch (_) {
        // Ignore cleanup errors
      }
      this.ws = null;
    }

    this.isConnected = false;
    this._handshakeComplete = false;
  }
}

module.exports = new GatewayBridge();
