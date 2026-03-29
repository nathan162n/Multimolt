import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as db from '../services/db';

/**
 * Task Store — manages the task queue and the live activity feed.
 *
 * The feed is capped at MAX_FEED_ENTRIES to prevent unbounded memory growth.
 * Tasks are fetched from the database; feed messages are ephemeral in-memory state
 * that accumulates from gateway events during the session.
 */
const useTaskStore = create(
  subscribeWithSelector((set, get) => ({
    // ---- State ----
    tasks: [],
    feedMessages: [],
    MAX_FEED_ENTRIES: 300,

    // ---- Actions ----

    /**
     * Append a message to the activity feed.
     * Automatically trims older entries when exceeding MAX_FEED_ENTRIES.
     */
    addFeedMessage: (msg) => {
      set((state) => {
        const entry = {
          id: msg.id || `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: msg.type || 'info',
          agentId: msg.agentId || null,
          agentName: msg.agentName || null,
          content: msg.content || '',
          detail: msg.detail || null,
          timestamp: msg.timestamp || Date.now(),
        };
        const updated = [entry, ...state.feedMessages];
        if (updated.length > state.MAX_FEED_ENTRIES) {
          return { feedMessages: updated.slice(0, state.MAX_FEED_ENTRIES) };
        }
        return { feedMessages: updated };
      });
    },

    /**
     * Clear all feed messages.
     */
    clearFeed: () => {
      set({ feedMessages: [] });
    },

    /**
     * Add a task to the local task list.
     */
    addTask: (task) => {
      set((state) => ({
        tasks: [
          {
            id: task.id,
            goal: task.goal || '',
            status: task.status || 'pending',
            agentId: task.agentId || null,
            createdAt: task.createdAt || Date.now(),
            updatedAt: task.updatedAt || Date.now(),
            progress: task.progress || 0,
            result: task.result || null,
            error: task.error || null,
          },
          ...state.tasks,
        ],
      }));
    },

    /**
     * Update an existing task by taskId with partial updates.
     */
    updateTask: (taskId, updates) => {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, ...updates, updatedAt: Date.now() }
            : t
        ),
      }));
    },

    /**
     * Fetch all tasks from the database.
     */
    fetchTasks: async () => {
      try {
        const result = await db.listTasks();
        if (result?.error) {
          console.error('[TaskStore] fetchTasks DB error:', result.error);
          return;
        }
        const taskList = result?.data;
        if (Array.isArray(taskList)) {
          set({
            tasks: taskList.map((t) => ({
              id: t.id,
              goal: t.goal || '',
              status: t.status || 'pending',
              agentId: t.agentId || null,
              createdAt: t.createdAt || t.created_at || Date.now(),
              updatedAt: t.updatedAt || t.updated_at || Date.now(),
              completedAt: t.completedAt || t.completed_at || null,
              progress: t.progress || 0,
              result: t.result || null,
              error: t.error || null,
            })),
          });
        }
      } catch (err) {
        console.error('[TaskStore] fetchTasks failed:', err);
      }
    },
  }))
);

export { useTaskStore };
export default useTaskStore;
