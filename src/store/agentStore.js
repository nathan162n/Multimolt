import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as db from '../services/db';
import * as openclaw from '../services/openclaw';

/**
 * Agent Store — Zustand with subscribeWithSelector middleware.
 *
 * CRITICAL: NO hardcoded PRESET_AGENTS array. Agents are always fetched from
 * Supabase / the database via the db service layer. The agents map starts
 * empty and is populated by fetchAgents().
 *
 * All IPC goes through src/services/db.js or src/services/openclaw.js.
 * window.hivemind is NEVER referenced directly in this file.
 */
const useAgentStore = create(
  subscribeWithSelector((set, get) => ({
    // ---- State ----
    agents: {},
    customAgents: {},
    activeGoal: null,
    activeTaskId: null,
    isRunning: false,
    isStopping: false,
    activeCheckpoint: null,
    checkpointHistory: [],
    isLoading: true,

    // ---- Actions ----

    /**
     * Fetch all agents from the database and populate the agents map keyed by id.
     */
    fetchAgents: async () => {
      set({ isLoading: true });
      try {
        const result = await db.listAgents();
        if (result?.error) {
          console.error('[AgentStore] fetchAgents DB error:', result.error);
          set({ isLoading: false });
          return;
        }
        const agentsMap = {};
        const agentList = result?.data;
        if (Array.isArray(agentList)) {
          for (const agent of agentList) {
            agentsMap[agent.id] = {
              ...agent,
              status: agent.status || 'idle',
              currentAction: agent.currentAction || null,
            };
          }
        }
        set({ agents: agentsMap, isLoading: false });
      } catch (err) {
        console.error('[AgentStore] fetchAgents failed:', err);
        set({ isLoading: false });
      }
    },

    /**
     * Update a single agent's status and optional currentAction in the local store.
     */
    updateAgentStatus: (agentId, status, currentAction = null) => {
      set((state) => {
        const existing = state.agents[agentId];
        if (!existing) return state;
        return {
          agents: {
            ...state.agents,
            [agentId]: {
              ...existing,
              status,
              currentAction,
            },
          },
        };
      });
    },

    /**
     * Submit a natural-language goal. Sets running state and delegates to openclaw.
     */
    submitGoal: async (goalText) => {
      set({ activeGoal: goalText, isRunning: true, isStopping: false });
      try {
        const result = await openclaw.submitGoal({ goal: goalText });
        if (result?.taskId) {
          set({ activeTaskId: result.taskId });
        }
        return result;
      } catch (err) {
        console.error('[AgentStore] submitGoal failed:', err);
        set({ isRunning: false, activeGoal: null, activeTaskId: null });
        throw err;
      }
    },

    /**
     * When the active dashboard task ends (cancelled or completed), clear run flags
     * and return any running/paused agents to idle in local state.
     */
    endActiveTaskSession: (taskId) => {
      if (get().activeTaskId !== taskId) return;
      set((state) => {
        const updated = {};
        for (const [id, agent] of Object.entries(state.agents)) {
          updated[id] = {
            ...agent,
            status: ['running', 'paused'].includes(agent.status) ? 'idle' : agent.status,
            currentAction: null,
          };
        }
        return {
          agents: updated,
          activeGoal: null,
          activeTaskId: null,
          isRunning: false,
          isStopping: false,
        };
      });
    },

    /**
     * Clear dashboard run flags if this task was the active one (e.g. task failed).
     * Does not change agent rows — failure handler may set a specific agent to error.
     */
    clearDashboardRunFlagsIfActiveTask: (taskId) => {
      if (get().activeTaskId !== taskId) return;
      set({
        activeGoal: null,
        activeTaskId: null,
        isRunning: false,
        isStopping: false,
      });
    },

    /**
     * Stop all running agents and cancel the active task.
     */
    stopAll: async () => {
      const { activeTaskId } = get();
      set({ isStopping: true });
      try {
        if (activeTaskId) {
          await openclaw.cancelTask({ taskId: activeTaskId });
        }
        // Reset all agents to idle
        set((state) => {
          const updated = {};
          for (const [id, agent] of Object.entries(state.agents)) {
            updated[id] = {
              ...agent,
              status: agent.status === 'running' ? 'idle' : agent.status,
              currentAction: null,
            };
          }
          return {
            agents: updated,
            activeGoal: null,
            activeTaskId: null,
            isRunning: false,
            isStopping: false,
          };
        });
      } catch (err) {
        console.error('[AgentStore] stopAll failed:', err);
        set({ isStopping: false });
      }
    },

    /**
     * Trigger a security checkpoint. Pauses all running agents and presents
     * the checkpoint for human review.
     */
    triggerCheckpoint: (data) => {
      set((state) => {
        const updated = {};
        for (const [id, agent] of Object.entries(state.agents)) {
          updated[id] = {
            ...agent,
            status: agent.status === 'running' ? 'paused' : agent.status,
          };
        }
        return {
          agents: updated,
          activeCheckpoint: {
            id: data.checkpointId || data.id,
            agentId: data.agentId,
            action: data.action,
            description: data.description,
            risk: data.risk || 'medium',
            context: data.context || {},
            timestamp: data.timestamp || Date.now(),
          },
        };
      });
    },

    /**
     * Respond to an active checkpoint (approve or reject).
     * Resumes paused agents on approval, sets error on rejection.
     */
    respondToCheckpoint: async (approved, reason = '') => {
      const { activeCheckpoint } = get();
      if (!activeCheckpoint) return;

      try {
        await openclaw.respondCheckpoint({
          checkpointId: activeCheckpoint.id,
          approved,
          reason,
        });

        set((state) => {
          const updated = {};
          for (const [id, agent] of Object.entries(state.agents)) {
            if (agent.status === 'paused') {
              updated[id] = {
                ...agent,
                status: approved ? 'running' : 'error',
                currentAction: approved ? agent.currentAction : null,
              };
            } else {
              updated[id] = agent;
            }
          }
          return {
            agents: updated,
            activeCheckpoint: null,
            checkpointHistory: [
              ...state.checkpointHistory,
              {
                ...state.activeCheckpoint,
                approved,
                reason,
                resolvedAt: Date.now(),
              },
            ],
          };
        });
      } catch (err) {
        console.error('[AgentStore] respondToCheckpoint failed:', err);
      }
    },

    /**
     * Add a custom agent definition to local state and persist to DB.
     */
    addCustomAgent: async (agentDef) => {
      try {
        await db.upsertAgent(agentDef);
        set((state) => ({
          customAgents: {
            ...state.customAgents,
            [agentDef.id]: agentDef,
          },
          agents: {
            ...state.agents,
            [agentDef.id]: {
              ...agentDef,
              status: 'idle',
              currentAction: null,
              isCustom: true,
            },
          },
        }));
      } catch (err) {
        console.error('[AgentStore] addCustomAgent failed:', err);
        throw err;
      }
    },

    /**
     * Remove a custom agent by id from local state and DB.
     */
    removeCustomAgent: async (id) => {
      try {
        await db.deleteAgent(id);
        set((state) => {
          const { [id]: removed, ...remainingAgents } = state.agents;
          const { [id]: removedCustom, ...remainingCustom } = state.customAgents;
          return {
            agents: remainingAgents,
            customAgents: remainingCustom,
          };
        });
      } catch (err) {
        console.error('[AgentStore] removeCustomAgent failed:', err);
        throw err;
      }
    },
  }))
);

export { useAgentStore };
export default useAgentStore;
