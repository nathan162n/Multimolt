# CLEANUP.md — HiveMind OS MVP Cleanup Plan

## Priority 1: Crash Bugs (Fix Immediately)

### 1.1 IPC Return Value Mismatch — Agent Sub-Components
**Root cause**: `electron/ipc/fileSystemHandlers.js` returns `{ data: { content, exists, path } }` but components treat the result as a raw string.

| File | Bug | Fix |
|------|-----|-----|
| `src/components/agents/SoulEditor.jsx` | `readSoul(agentId).then((text) => setContent(text \|\| ''))` — `text` is `{data: {content: '...'}}`, not a string | Extract `result?.data?.content \|\| ''` |
| `src/components/agents/AgentsEditor.jsx` | Same pattern — `readAgentsMd(agentId).then((text) => setContent(text \|\| ''))` | Extract `result?.data?.content \|\| ''` |
| `src/components/agents/MemoryViewer.jsx` | Same pattern — `readMemory(agentId).then((text) => setMemory(text \|\| ''))` | Extract `result?.data?.content \|\| ''` |

All three also missing `.catch()` error handling — uncaught promise rejections crash the renderer.

### 1.2 MemoryViewer Date Parameter Not Forwarded
- `MemoryViewer.jsx` calls `readDailyLog(agentId, date)` with 2 args
- `fileService.js` `readDailyLogs(agentId)` only passes 1 arg to IPC
- Daily logs never load for specific dates

### 1.3 CheckpointModal Field Name Mismatch
- `src/store/agentStore.js` saves: `{ id, agentId, action, description, risk, context, timestamp }`
- `src/components/security/CheckpointModal.jsx` reads: `agentName`, `actionType`, `riskLevel`
- Result: Modal displays "undefined" for all fields — effectively broken

---

## Priority 2: Dead Code Removal

These files are never imported anywhere in the codebase:

| File | Reason |
|------|--------|
| `src/components/agents/AgentDetail.jsx` | `Agents.jsx` defines `AgentDetailPanel` inline instead |
| `src/components/agents/SkillsPanel.jsx` | Never imported by any screen |
| `src/components/builder/AgentBuilder.jsx` | `Builder.jsx` defines all steps inline |
| `src/components/builder/ReviewStep.jsx` | Unused — Builder has inline ReviewStep |
| `src/components/builder/RoleWizardStep.jsx` | Unused — Builder has inline RoleStep |
| `src/components/builder/SkillWizardStep.jsx` | Unused — Builder has inline SkillsStep |
| `src/components/builder/SoulWizardStep.jsx` | Unused — Builder has inline SoulStep |
| `src/components/security/AuditLog.jsx` | Never imported |
| `src/components/security/ViolationBanner.jsx` | Never imported |

**Verify before deleting**: `AgentBadge.jsx`, `KeyboardShortcut.jsx`, `Tooltip.jsx` (likely unused but confirm).

---

## Priority 3: Hardcoding Violations

### 3.1 Builder.jsx — Hardcoded Model & Sandbox Arrays
```javascript
const AVAILABLE_MODELS = [
  { value: 'gemini/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ...
]
const SANDBOX_MODES = [...]
```
**Fix**: These should come from a config table or be derived from existing agent data in Supabase.

### 3.2 Onboarding.jsx — Hardcoded Agent Names
The Welcome step hardcodes all 9 agent names/descriptions inline.
**Fix**: Fetch from `agents` table (preset agents) on mount.

---

## Priority 4: Service Layer Consolidation

### Duplicate File Operations
- `src/services/openclaw.js` exports: `readSoul`, `writeSoul`, `readAgentsMd`, `writeAgentsMd`, `readMemory`, `readDailyLogs`, `readHeartbeat`, `writeHeartbeat`
- `src/services/fileService.js` exports: same functions PLUS `listSessions`, `readSessionLog`

**Fix**: Keep `fileService.js` as the single source for all file operations. Remove file ops from `openclaw.js`. Update all imports.

---

## Priority 5: Missing Error Handling

Components that call async IPC without `.catch()`:
- `SoulEditor.jsx` — load and save
- `AgentsEditor.jsx` — load and save
- `MemoryViewer.jsx` — load memory and logs
- `SessionHistory.jsx` — load sessions (partially handled)

**Fix**: Add `.catch()` with user-visible error state to each.

---

## MVP Scope Assessment

### Keep (Essential)
- Dashboard (goal input, agent grid, activity feed)
- Auth (sign in, sign up, forgot/reset password, OAuth)
- Agents screen (detail view, SOUL.md editor, AGENTS.md editor, memory viewer, sessions)
- Builder (create custom agents)
- Tasks (view task history)
- Skills (manage installed skills)
- Settings (API keys, preferences)
- Onboarding (first-run setup)
- Security (checkpoint modal, audit trail)
- Gateway connection (WebSocket bridge)

### Remove (Not MVP)
- Dead component files listed in Priority 2
- Any placeholder UI that doesn't connect to real functionality

### Defer (Post-MVP)
- Memory screen (works but low priority)
- Advanced skill management
- Appearance/theme settings
