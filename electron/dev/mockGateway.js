#!/usr/bin/env node
'use strict';

/**
 * Mock OpenClaw Gateway Server
 *
 * A standalone development server that simulates the OpenClaw Gateway daemon.
 * Run with: node electron/dev/mockGateway.js
 *
 * Listens on ws://127.0.0.1:18789 (or the port specified by MOCK_GATEWAY_PORT env).
 * Simulates realistic multi-agent behavior for UI development.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = parseInt(process.env.MOCK_GATEWAY_PORT || '18789', 10);

// =============================================================================
// PRESET AGENT DEFINITIONS
// =============================================================================

const AGENTS = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'CEO & Task Router', model: 'gemini/gemini-1.5-pro' },
  { id: 'pm', name: 'Project Manager', role: 'Planning & Specification', model: 'gemini/gemini-2.0-flash' },
  { id: 'coder', name: 'Coder', role: 'Software Engineering', model: 'gemini/gemini-2.0-flash' },
  { id: 'qa', name: 'QA Engineer', role: 'Testing & Validation', model: 'gemini/gemini-2.0-flash' },
  { id: 'cybersec', name: 'CyberSec', role: 'Security Audit', model: 'gemini/gemini-2.0-flash' },
  { id: 'design', name: 'Designer', role: 'UI/UX & Visual Design', model: 'gemini/gemini-2.0-flash' },
  { id: 'marketing', name: 'Marketing', role: 'Copywriting & Growth', model: 'gemini/gemini-2.0-flash' },
  { id: 'research', name: 'Research', role: 'Market Intelligence', model: 'gemini/gemini-2.0-flash' },
  { id: 'patrol', name: 'Patrol', role: 'Watchdog & Recovery', model: 'gemini/gemini-2.0-flash' },
];

// =============================================================================
// REALISTIC MOCK MESSAGES PER AGENT
// =============================================================================

const MOCK_MESSAGES = {
  orchestrator: [
    'Analyzing goal: breaking down into 7 subtasks',
    'Assigning spec writing to PM Agent',
    'Briefing Coder with full API requirements',
    'Waiting for CyberSec audit before merge approval',
    'All agents reporting nominal progress',
    'Synthesizing final deliverable from completed subtasks',
    'Routing QA results back to Coder for fixes',
    'Checking in on all agents: 5/9 active',
    'Adjusting task priorities based on dependencies',
    'Final review complete: assembling deliverable',
  ],
  pm: [
    'Writing technical specification for auth module',
    'Breaking user story into 4 implementation tasks',
    'Creating acceptance criteria for each endpoint',
    'Documenting API contract: POST /auth/login, POST /auth/register',
    'Estimating task complexity: 3 high, 2 medium, 1 low',
    'Updating project timeline with new dependencies',
    'Sending spec to Orchestrator for approval',
    'Tracking progress: 3/7 subtasks complete',
  ],
  coder: [
    'Setting up Express project structure',
    'Writing user authentication middleware',
    'Implementing JWT token generation with RS256',
    'Running npm install for required dependencies',
    'Writing unit tests for auth endpoints',
    'Fixing edge case in token refresh logic',
    'Code complete — sending to QA for review',
    'Creating database migration for users table',
    'Implementing rate limiting on login endpoint',
    'Refactoring error handling to use custom error classes',
    'Adding input validation with Zod schemas',
    'Writing integration tests for the full auth flow',
  ],
  qa: [
    'Setting up test environment with Jest and Supertest',
    'Running unit test suite: 14 tests found',
    'Testing authentication flow: login, register, refresh',
    'Verifying error responses match API contract',
    'Testing rate limiting: 100 requests in 10 seconds',
    'Checking for SQL injection in all user inputs',
    'All 14 tests passing — sending results to Orchestrator',
    'Running load test: 1000 concurrent users simulated',
    'Edge case found: empty password accepted — flagging',
    'Regression test complete: no new failures',
  ],
  cybersec: [
    'Scanning auth.js for injection vulnerabilities',
    'Checking npm dependencies for known CVEs',
    'Running static analysis with ESLint security plugin',
    'Verifying JWT secret is not hardcoded',
    'No critical vulnerabilities found — proceeding',
    'Reviewing CORS configuration for overly permissive origins',
    'Checking bcrypt rounds: 10 is minimum, found 12 — good',
    'Auditing file permissions on key storage directory',
    'Scanning for exposed environment variables in logs',
    'Weak password hashing detected — flagging for Coder',
  ],
  design: [
    'Reviewing auth screens against design system tokens',
    'Creating wireframe for login page: email + password',
    'Designing error state components for form validation',
    'Selecting typography: DM Sans 400 for form labels',
    'Building responsive layout for auth modal',
    'Creating loading spinner animation for submit button',
    'Documenting color usage: error-dot for validation errors',
    'Designing password strength indicator component',
  ],
  marketing: [
    'Writing copy for login page: "Welcome back"',
    'Drafting onboarding email sequence: 3 emails',
    'Analyzing competitor auth flows for UX benchmarks',
    'Creating A/B test variants for signup CTA',
    'Writing microcopy for form validation messages',
    'Optimizing signup funnel: reducing fields from 5 to 3',
    'Drafting changelog entry for new auth feature',
    'Writing help article: "How to reset your password"',
  ],
  research: [
    'Researching OAuth 2.0 best practices (RFC 6749)',
    'Analyzing OWASP Top 10 for authentication risks',
    'Finding primary sources on JWT security considerations',
    'Comparing bcrypt vs argon2 for password hashing',
    'Reviewing industry benchmarks for session timeout values',
    'Depositing findings into shared memory: auth-patterns.md',
    'Summarizing NIST password guidelines (SP 800-63B)',
    'Researching passkey/WebAuthn adoption rates',
  ],
  patrol: [
    'Monitoring all agents: 9 active, 0 stuck',
    'Checking agent iteration counts: all within limits',
    'Coder agent at 47 iterations — within normal range',
    'No anomalies detected in the last 5 minutes',
    'Verifying heartbeat responses from all agents',
    'Scanning for loop conditions: none found',
    'QA agent idle for 2 minutes — waiting for Coder output',
    'All agents healthy: memory usage nominal',
    'Running scheduled health check: pass',
    'Logging system metrics to audit trail',
  ],
};

// =============================================================================
// MOCK CHECKPOINT DATA
// =============================================================================

const CHECKPOINT_ACTIONS = [
  {
    agentId: 'coder',
    action: 'CODE_EXECUTION',
    riskLevel: 'HIGH',
    command: 'npm install express dotenv cors jsonwebtoken bcrypt',
    directory: '/workspace/coder/project-auth',
    affects: ['package.json', 'node_modules/'],
    reason: 'Installing runtime dependencies required for the Express API server as defined in task. These packages are from trusted npm registries.',
    taskId: null,
    taskDescription: null,
  },
  {
    agentId: 'coder',
    action: 'FILE_WRITE',
    riskLevel: 'MEDIUM',
    command: 'write src/middleware/auth.js',
    directory: '/workspace/coder/project-auth',
    affects: ['src/middleware/auth.js'],
    reason: 'Creating the authentication middleware file. Contains JWT verification logic and route protection.',
    taskId: null,
    taskDescription: null,
  },
  {
    agentId: 'coder',
    action: 'CODE_EXECUTION',
    riskLevel: 'HIGH',
    command: 'npx prisma migrate dev --name add-users-table',
    directory: '/workspace/coder/project-auth',
    affects: ['prisma/schema.prisma', 'prisma/migrations/'],
    reason: 'Running database migration to create the users table with email, password_hash, and session columns.',
    taskId: null,
    taskDescription: null,
  },
  {
    agentId: 'cybersec',
    action: 'CODE_EXECUTION',
    riskLevel: 'LOW',
    command: 'npx eslint --plugin security src/**/*.js',
    directory: '/workspace/coder/project-auth',
    affects: [],
    reason: 'Running ESLint with the security plugin for static analysis. This is a read-only operation.',
    taskId: null,
    taskDescription: null,
  },
  {
    agentId: 'qa',
    action: 'CODE_EXECUTION',
    riskLevel: 'MEDIUM',
    command: 'npx jest --coverage --runInBand',
    directory: '/workspace/coder/project-auth',
    affects: ['coverage/'],
    reason: 'Running the full test suite with code coverage reporting.',
    taskId: null,
    taskDescription: null,
  },
  {
    agentId: 'coder',
    action: 'NETWORK_REQUEST',
    riskLevel: 'HIGH',
    command: 'curl -X POST https://api.sendgrid.com/v3/mail/send',
    directory: '/workspace/coder/project-auth',
    affects: [],
    reason: 'Sending a test email via SendGrid API to verify email delivery for password reset flow.',
    taskId: null,
    taskDescription: null,
  },
];

// =============================================================================
// MOCK INTER-AGENT MESSAGE PAIRS
// =============================================================================

const INTER_AGENT_MESSAGES = [
  { from: 'orchestrator', to: 'coder', text: 'Assigned: build Express API for /auth endpoints' },
  { from: 'orchestrator', to: 'pm', text: 'Write technical spec for user authentication module' },
  { from: 'pm', to: 'orchestrator', text: 'Spec complete: 4 endpoints defined with acceptance criteria' },
  { from: 'orchestrator', to: 'coder', text: 'Spec approved. Begin implementation. Report after auth middleware.' },
  { from: 'coder', to: 'qa', text: 'Ready for review: src/middleware/auth.js, src/routes/auth.js' },
  { from: 'qa', to: 'orchestrator', text: '14/14 tests passed. Auth flow validated.' },
  { from: 'orchestrator', to: 'cybersec', text: 'Run security audit on auth module before merge' },
  { from: 'cybersec', to: 'orchestrator', text: 'SQL injection risk in query.js:47 — blocking merge' },
  { from: 'orchestrator', to: 'coder', text: 'Security issue found. Fix SQL injection in query.js:47.' },
  { from: 'coder', to: 'cybersec', text: 'Fixed: parameterized query now used. Please re-audit.' },
  { from: 'cybersec', to: 'orchestrator', text: 'Re-audit passed. No vulnerabilities remaining.' },
  { from: 'orchestrator', to: 'design', text: 'Create login/register UI components using design system' },
  { from: 'design', to: 'orchestrator', text: 'Auth screens complete: login, register, forgot-password' },
  { from: 'orchestrator', to: 'marketing', text: 'Write copy for auth pages and onboarding emails' },
  { from: 'marketing', to: 'orchestrator', text: 'Copy delivered: 3 variants for A/B testing' },
  { from: 'patrol', to: 'orchestrator', text: 'All agents healthy. No stuck tasks detected.' },
  { from: 'orchestrator', to: 'research', text: 'Research best practices for JWT refresh token rotation' },
  { from: 'research', to: 'orchestrator', text: 'Findings deposited: recommend sliding window + token family tracking' },
];

// =============================================================================
// SERVER STATE
// =============================================================================

let seqCounter = 0;
let activeTaskId = null;
let activeGoal = null;
let simulationInterval = null;
let checkpointTimer = null;
let messageIndex = 0;

/** Per-client state for protocol v3 challenge-response */
const clientState = new WeakMap();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function nextSeq() {
  return ++seqCounter;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timestamp() {
  return new Date().toISOString();
}

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================

const wss = new WebSocket.Server({ port: PORT });

console.log(`[MockGateway] OpenClaw Mock Gateway started on ws://127.0.0.1:${PORT}`);
console.log('[MockGateway] Waiting for HiveMind OS to connect...');

wss.on('connection', (ws) => {
  console.log('[MockGateway] Client connected');

  // Protocol v3: Send challenge immediately on connection
  const nonce = uuidv4();
  const state = { authenticated: false, nonce, tickTimer: null };
  clientState.set(ws, state);

  sendEvent(ws, 'connect.challenge', {
    nonce,
    ts: Date.now(),
    protocols: [3],
  });
  console.log('[MockGateway] Sent connect.challenge (nonce:', nonce.slice(0, 8) + '...)');

  ws.on('message', (raw) => {
    let frame;
    try {
      frame = JSON.parse(raw.toString());
    } catch (err) {
      console.error('[MockGateway] Invalid JSON received:', raw.toString().slice(0, 200));
      return;
    }

    // Handle tick.pong responses from client (keepalive ack)
    if (frame.type === 'event' && frame.event === 'tick.pong') {
      return;
    }

    if (frame.type !== 'req') {
      console.log('[MockGateway] Ignoring non-request frame:', frame.type);
      return;
    }

    console.log(`[MockGateway] Request: ${frame.method} (id: ${frame.id})`);

    // -------------------------------------------------------------------------
    // CONNECT — mandatory first frame (supports both v1.0 and v3)
    // -------------------------------------------------------------------------
    if (frame.method === 'connect') {
      state.authenticated = true;

      // Detect protocol version from the connect params
      const isV3 = frame.params?.minProtocol >= 3 || frame.params?.maxProtocol >= 3;

      if (isV3) {
        // Protocol v3: respond with hello-ok
        sendResponse(ws, frame.id, true, {
          type: 'hello-ok',
          protocol: 3,
          gateway: 'mock',
          policy: { tickIntervalMs: 15000 },
          agents: AGENTS.length,
          timestamp: timestamp(),
        });
        console.log('[MockGateway] Client authenticated (protocol v3)');

        // Start tick keepalive timer
        state.tickTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            sendEvent(ws, 'tick', { timestamp: timestamp(), seq: nextSeq() });
          } else {
            clearInterval(state.tickTimer);
            state.tickTimer = null;
          }
        }, 15000);
      } else {
        // Protocol v1.0: simple response
        sendResponse(ws, frame.id, true, {
          version: '1.0.0',
          gateway: 'mock',
          agents: AGENTS.length,
          timestamp: timestamp(),
        });
        console.log('[MockGateway] Client authenticated (protocol v1.0)');
      }
      return;
    }

    // Reject all requests if not authenticated
    if (!state.authenticated) {
      sendResponse(ws, frame.id, false, null, 'Not authenticated. Send connect frame first.');
      ws.close(4001, 'Authentication required');
      return;
    }

    // -------------------------------------------------------------------------
    // AGENT.LIST
    // -------------------------------------------------------------------------
    if (frame.method === 'agent.list') {
      sendResponse(ws, frame.id, true, {
        agents: AGENTS.map((a) => ({
          ...a,
          status: activeTaskId ? 'running' : 'idle',
          currentAction: '',
          taskCount: 0,
        })),
      });
      return;
    }

    // -------------------------------------------------------------------------
    // AGENT.GET
    // -------------------------------------------------------------------------
    if (frame.method === 'agent.get') {
      const agent = AGENTS.find((a) => a.id === frame.params?.agentId);
      if (!agent) {
        sendResponse(ws, frame.id, false, null, `Agent not found: ${frame.params?.agentId}`);
        return;
      }
      sendResponse(ws, frame.id, true, {
        ...agent,
        status: activeTaskId ? 'running' : 'idle',
        currentAction: '',
        taskCount: 0,
      });
      return;
    }

    // -------------------------------------------------------------------------
    // AGENT.START / AGENT.STOP / AGENT.RESTART
    // -------------------------------------------------------------------------
    if (frame.method === 'agent.start' || frame.method === 'agent.stop' || frame.method === 'agent.restart') {
      sendResponse(ws, frame.id, true, {
        agentId: frame.params?.agentId,
        status: frame.method === 'agent.stop' ? 'idle' : 'running',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // AGENT.REGISTER / AGENT.UNREGISTER / AGENT.UPDATE_CONFIG
    // -------------------------------------------------------------------------
    if (frame.method === 'agent.register' || frame.method === 'agent.unregister' || frame.method === 'agent.update_config') {
      sendResponse(ws, frame.id, true, { ok: true });
      return;
    }

    // -------------------------------------------------------------------------
    // TASK.SUBMIT — Start the simulation
    // -------------------------------------------------------------------------
    if (frame.method === 'task.submit') {
      activeTaskId = frame.params?.taskId || uuidv4();
      activeGoal = frame.params?.goal || 'No goal provided';
      messageIndex = 0;

      sendResponse(ws, frame.id, true, {
        taskId: activeTaskId,
        status: 'running',
        startedAt: timestamp(),
      });

      console.log(`[MockGateway] Task started: "${activeGoal}" (${activeTaskId})`);

      // Start the simulation loop
      startSimulation(ws);
      return;
    }

    // -------------------------------------------------------------------------
    // TASK.CANCEL — Stop the simulation
    // -------------------------------------------------------------------------
    if (frame.method === 'task.cancel') {
      stopSimulation();
      sendResponse(ws, frame.id, true, {
        taskId: frame.params?.taskId || activeTaskId,
        status: 'cancelled',
        cancelledAt: timestamp(),
      });
      console.log('[MockGateway] Task cancelled');
      activeTaskId = null;
      activeGoal = null;
      return;
    }

    // -------------------------------------------------------------------------
    // TASK.GET
    // -------------------------------------------------------------------------
    if (frame.method === 'task.get') {
      sendResponse(ws, frame.id, true, {
        taskId: frame.params?.taskId || activeTaskId,
        goal: activeGoal,
        status: activeTaskId ? 'running' : 'idle',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // CHECKPOINT.RESPOND
    // -------------------------------------------------------------------------
    if (frame.method === 'checkpoint.respond') {
      const approved = frame.params?.approved;
      console.log(`[MockGateway] Checkpoint ${approved ? 'APPROVED' : 'REJECTED'}: ${frame.params?.checkpointId}`);
      sendResponse(ws, frame.id, true, {
        checkpointId: frame.params?.checkpointId,
        decision: approved ? 'approved' : 'rejected',
        decidedAt: timestamp(),
      });

      // If rejected, send an error status for the requesting agent
      if (!approved) {
        const checkpointAction = CHECKPOINT_ACTIONS.find(
          (c) => c.agentId === (frame.params?.agentId || 'coder')
        );
        if (checkpointAction) {
          sendEvent(ws, 'agent', {
            agentId: checkpointAction.agentId,
            type: 'status',
            content: {
              status: 'error',
              currentAction: `Checkpoint rejected: ${frame.params?.reason || 'User denied request'}`,
            },
          });
        }
      }
      return;
    }

    // -------------------------------------------------------------------------
    // DEFAULT — unknown method
    // -------------------------------------------------------------------------
    sendResponse(ws, frame.id, false, null, `Unknown method: ${frame.method}`);
  });

  ws.on('close', () => {
    console.log('[MockGateway] Client disconnected');
    stopSimulation();
    const s = clientState.get(ws);
    if (s?.tickTimer) {
      clearInterval(s.tickTimer);
      s.tickTimer = null;
    }
  });

  ws.on('error', (err) => {
    console.error('[MockGateway] WebSocket error:', err.message);
  });
});

// =============================================================================
// RESPONSE / EVENT HELPERS
// =============================================================================

function sendResponse(ws, id, ok, payload, error) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const frame = { type: 'res', id, ok };
  if (ok) {
    frame.payload = payload || {};
  } else {
    frame.error = error || 'Unknown error';
  }
  ws.send(JSON.stringify(frame));
}

function sendEvent(ws, event, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'event',
    event,
    payload,
    seq: nextSeq(),
  }));
}

// =============================================================================
// SIMULATION ENGINE
// =============================================================================

function startSimulation(ws) {
  stopSimulation();

  let completedAgents = new Set();
  const taskStartTime = Date.now();
  // Task completes after 60-120 seconds
  const taskDuration = randomInt(60000, 120000);

  // Phase 1: Initialize all agents
  AGENTS.forEach((agent, idx) => {
    setTimeout(() => {
      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: 'initializing',
          currentAction: 'Starting up...',
        },
      });
    }, idx * 200);

    // Transition to running after a short delay
    setTimeout(() => {
      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: 'running',
          currentAction: MOCK_MESSAGES[agent.id]?.[0] || 'Processing...',
        },
      });
    }, 1500 + idx * 150);
  });

  // Phase 2: Continuous agent activity
  simulationInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      stopSimulation();
      return;
    }

    const elapsed = Date.now() - taskStartTime;
    const progress = Math.min(Math.round((elapsed / taskDuration) * 100), 99);

    // Send task progress updates
    if (elapsed % 5000 < 2500) {
      sendEvent(ws, 'task', {
        taskId: activeTaskId,
        status: 'progress',
        progress,
        timestamp: timestamp(),
      });
    }

    // Pick a random agent and send a status update
    const agent = randomChoice(AGENTS);
    const messages = MOCK_MESSAGES[agent.id];
    if (messages && messages.length > 0) {
      const message = randomChoice(messages);

      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: 'running',
          currentAction: message,
        },
      });
    }

    // Also send an inter-agent message sometimes
    if (Math.random() < 0.4 && messageIndex < INTER_AGENT_MESSAGES.length) {
      const msg = INTER_AGENT_MESSAGES[messageIndex];
      messageIndex++;

      sendEvent(ws, 'agent', {
        agentId: msg.from,
        type: 'message',
        content: {
          recipient: msg.to,
          text: msg.text,
          timestamp: timestamp(),
        },
      });
    } else if (messageIndex >= INTER_AGENT_MESSAGES.length) {
      messageIndex = 0;
    }

    // Occasionally send a health event
    if (Math.random() < 0.1) {
      sendEvent(ws, 'health', {
        memoryUsage: {
          heapUsed: randomInt(50, 200),
          heapTotal: 512,
          rss: randomInt(100, 400),
        },
        modelLatency: randomInt(80, 500),
        activeAgents: AGENTS.length,
        timestamp: timestamp(),
      });
    }

    // Gradually complete agents as the task progresses
    if (progress > 40 && Math.random() < 0.08) {
      const workAgents = AGENTS.filter(
        (a) => a.id !== 'orchestrator' && a.id !== 'patrol' && !completedAgents.has(a.id)
      );
      if (workAgents.length > 0) {
        const completedAgent = randomChoice(workAgents);
        completedAgents.add(completedAgent.id);
        sendEvent(ws, 'agent', {
          agentId: completedAgent.id,
          type: 'status',
          content: {
            status: 'completed',
            currentAction: 'Subtask completed successfully',
          },
        });
      }
    }

    // Check if the task should complete
    if (elapsed >= taskDuration) {
      completeTask(ws);
    }
  }, randomInt(1500, 3000));

  // Phase 3: Random security checkpoints (first one after 20-40 seconds)
  scheduleCheckpoint(ws, randomInt(20000, 40000));
}

/**
 * Complete the active task — send completion events for all agents and a task:completed event.
 */
function completeTask(ws) {
  if (!activeTaskId || ws.readyState !== WebSocket.OPEN) return;

  const taskId = activeTaskId;
  const goal = activeGoal;

  // Stop the simulation loop
  stopSimulation();

  // Mark all agents as completed
  AGENTS.forEach((agent, idx) => {
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: agent.id === 'orchestrator' ? 'idle' : 'completed',
          currentAction: agent.id === 'orchestrator'
            ? 'All subtasks complete — synthesizing deliverable'
            : 'Work completed',
        },
      });
    }, idx * 100);
  });

  // Send task completed event after all agents are done
  setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) return;

    sendEvent(ws, 'task', {
      taskId,
      status: 'completed',
      goal,
      result: `Task "${goal}" completed successfully. All 9 agents coordinated to deliver the result. Key outputs: specification written, code implemented, tests passing (14/14), security audit passed, UI components created, copy delivered.`,
      completedAt: timestamp(),
    });

    // Set all agents to idle
    AGENTS.forEach((agent) => {
      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: 'idle',
          currentAction: null,
        },
      });
    });

    console.log(`[MockGateway] Task completed: "${goal}" (${taskId})`);
    activeTaskId = null;
    activeGoal = null;
  }, AGENTS.length * 100 + 500);
}

function scheduleCheckpoint(ws, initialDelay) {
  if (checkpointTimer) clearTimeout(checkpointTimer);

  const delay = initialDelay || randomInt(45000, 90000); // 45-90 seconds
  checkpointTimer = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN || !activeTaskId) return;

    const action = randomChoice(CHECKPOINT_ACTIONS);
    const checkpointId = uuidv4();

    console.log(`[MockGateway] Security checkpoint fired: ${action.action} by ${action.agentId}`);

    sendEvent(ws, 'agent', {
      agentId: action.agentId,
      type: 'security_checkpoint',
      checkpointId,
      action: action.action,
      riskLevel: action.riskLevel,
      command: action.command,
      directory: action.directory,
      affects: action.affects,
      reason: action.reason,
      taskId: activeTaskId,
      taskDescription: activeGoal,
      timestamp: timestamp(),
    });

    // Pause all running agents
    AGENTS.forEach((agent) => {
      sendEvent(ws, 'agent', {
        agentId: agent.id,
        type: 'status',
        content: {
          status: 'paused',
          currentAction: 'Awaiting checkpoint approval...',
        },
      });
    });

    // Schedule the next checkpoint
    scheduleCheckpoint(ws);
  }, delay);
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  if (checkpointTimer) {
    clearTimeout(checkpointTimer);
    checkpointTimer = null;
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n[MockGateway] Shutting down...');
  stopSimulation();
  wss.close(() => {
    console.log('[MockGateway] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  stopSimulation();
  wss.close(() => process.exit(0));
});
