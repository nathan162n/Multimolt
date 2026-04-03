'use strict';

const fs = require('fs').promises;
const path = require('path');
const { getOpenClawBase, getWorkspacePath, getAgentDir, safeReadFile } = require('./pathUtils');

/**
 * Build the openclaw.json configuration object from an array of agent records.
 * This config drives the OpenClaw Gateway — it defines all agents, their workspaces,
 * models, tools, and gateway settings.
 *
 * Follows the OpenClaw configuration reference:
 * - agents.defaults: workspace, model, sandbox, heartbeat, compaction
 * - agents.list: per-agent overrides with identity, tools, sandbox
 * - gateway: port, bind, auth, controlUi, reload
 * - skills: entries, load config
 * - session: dmScope, reset, maintenance
 *
 * @param {object[]} agents  Agent records from the Supabase `agents` table
 * @param {object}   [options]
 * @param {number}   [options.gatewayPort=18789]
 * @param {string}   [options.authMode='token']
 * @returns {object}  The complete openclaw.json structure
 */
function buildConfig(agents, options = {}) {
  const { gatewayPort = 18789, authMode = 'token' } = options;

  const agentList = agents.map((agent) => {
    const entry = {
      id: agent.id,
      workspace: agent.workspace || getWorkspacePath(agent.id),
      agentDir: getAgentDir(agent.id),
      model: agent.model,
      identity: {
        name: agent.name,
        emoji: '',
        avatar: '',
      },
      tools: {
        allow: agent.tools_allow || [],
        deny: agent.tools_deny || [],
      },
      sandbox: {
        mode: agent.sandbox_mode || 'all',
      },
    };
    // Mark orchestrator as default agent
    if (agent.id === 'orchestrator') {
      entry.default = true;
    }
    return entry;
  });

  // Find the default model from the majority of agents
  const modelCounts = {};
  for (const agent of agents) {
    const m = agent.model || 'gemini/gemini-2.0-flash';
    modelCounts[m] = (modelCounts[m] || 0) + 1;
  }
  const defaultModel = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'gemini/gemini-2.0-flash';

  return {
    agents: {
      defaults: {
        workspace: getOpenClawBase(),
        model: { primary: defaultModel },
        sandbox: { mode: 'all' },
        heartbeat: { every: '30m', target: 'last' },
        // OpenClaw CLI (e.g. 2026.3.x) rejects compaction.timeoutSeconds — keep schema minimal.
        compaction: { mode: 'safeguard' },
        timeoutSeconds: 600,
        contextTokens: 200000,
      },
      list: agentList,
    },
    gateway: {
      mode: 'local',
      port: gatewayPort,
      bind: 'loopback',
      auth: { mode: authMode },
      controlUi: { enabled: true, basePath: '/openclaw' },
      reload: { mode: 'hybrid' },
    },
    tools: {
      profile: 'coding',
      exec: { backgroundMs: 10000, timeoutSec: 1800 },
      sessions: { visibility: 'tree' },
    },
    skills: {
      entries: {},
      load: {
        watch: true,
        watchDebounceMs: 500,
      },
    },
    session: {
      scope: 'per-sender',
      dmScope: 'main',
      reset: { mode: 'daily', atHour: 4 },
      maintenance: { pruneAfter: '30d', maxEntries: 500 },
    },
    bindings: [],
  };
}

/**
 * Write the generated config to ~/.openclaw/openclaw.json.
 * Creates the directory if it does not exist.
 *
 * @param {object[]} agents  Agent records from the database
 * @param {object}   [options]  Options passed to buildConfig
 * @returns {Promise<{written: boolean, path: string, agentCount: number}>}
 */
async function writeConfig(agents, options = {}) {
  const config = buildConfig(agents, options);
  const configPath = path.join(getOpenClawBase(), 'openclaw.json');

  await fs.mkdir(getOpenClawBase(), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

  return {
    written: true,
    path: configPath,
    agentCount: agents.length,
  };
}

/**
 * Read the current openclaw.json config from disk.
 * Returns null if the file does not exist.
 *
 * @returns {Promise<object|null>}
 */
async function readConfig() {
  const configPath = path.join(getOpenClawBase(), 'openclaw.json');
  const content = await safeReadFile(configPath);
  if (content === null) return null;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error('[openclawConfig] Failed to parse openclaw.json:', err.message);
    return null;
  }
}

module.exports = {
  buildConfig,
  writeConfig,
  readConfig,
};
