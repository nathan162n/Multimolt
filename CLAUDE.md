# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## WHAT THIS PROJECT IS

**HiveMind OS** — a production-grade Electron desktop app that serves as a graphical mission control panel for orchestrating a fleet of 9 **OpenClaw** autonomous AI agents working together like a company. Not a chat interface. The user types one goal; the agents execute it autonomously; the user only intervenes for security checkpoints.

The app connects to a locally-running OpenClaw Gateway daemon (`ws://127.0.0.1:18789`) over WebSocket. **Supabase** is the persistent database and backend layer. Everything is local-first for agent execution; Supabase persists all config, history, and audit data.

**This is a real production application. No mocking, no hardcoding, no placeholder data.**

---

## BUILD & DEV COMMANDS

```bash
npm install              # Install dependencies
npm run dev              # Vite dev server (port 5173) + Electron hot reload
npm run build            # Vite production build -> dist/
npm run dist             # electron-builder package (signed installer)

# Testing
npm run test             # Run all tests (vitest)
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Playwright E2E tests

# Mock Gateway (for development without a real OpenClaw Gateway)
npm run mock-gateway     # Starts mock gateway at ws://127.0.0.1:18789 (protocol v3)

# Supabase
npx supabase start       # Start local Supabase (Docker)
npx supabase db push     # Apply migrations to remote
npx supabase db reset    # Reset local DB and re-run all migrations + seed
npx supabase gen types typescript --local > src/types/supabase.ts  # Regenerate types after schema change
```

Vite config **must** have `base: './'` — Electron loads from the filesystem, not a web server.

---

## TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 31 (frameless window) |
| Frontend | React 18 + React Router 6 |
| Animation | Framer Motion 11 |
| State | Zustand 4 (`subscribeWithSelector`) |
| Icons | Lucide React |
| Styling | Tailwind 3 + CSS variables |
| Build | Vite 5 |
| IPC | `contextBridge` whitelist — `contextIsolation: true`, `nodeIntegration: false` |
| Database | **Supabase** (Postgres + Auth + RLS + Realtime) |
| DB client | `@supabase/supabase-js` — **main process only** |
| API key storage | `electron.safeStorage` (OS-level encryption) |
| WebSocket | `ws` package — main process only, OpenClaw Gateway |
| Config | `electron-store` (ephemeral UI state only) |
| LLM | Gemini Flash / Pro (Google AI Studio) |
| Testing | Vitest + Testing Library + Playwright |
| Fonts | Playfair Display, DM Sans, JetBrains Mono (Google Fonts) |

---

## PROJECT STRUCTURE

```
hivemind-os/
├── electron/
│   ├── main.js                     # Window creation, app lifecycle, startup init
│   ├── preload.js                  # contextBridge — security-critical
│   ├── services/
│   │   ├── supabase.js             # Supabase client singleton — main process ONLY
│   │   ├── pathUtils.js            # Shared path utilities (getOpenClawBase, getWorkspacePath, etc.)
│   │   ├── workspaceManager.js     # Agent workspace creation/validation
│   │   └── openclawConfig.js       # openclaw.json generation from agents table
│   ├── ipc/
│   │   ├── gatewayBridge.js        # WebSocket <-> OpenClaw Gateway (protocol v3 + v1.0 fallback)
│   │   ├── agentHandlers.js        # agent CRUD, status, config + workspace/config regen
│   │   ├── taskHandlers.js         # task queue, goal submission
│   │   ├── dbHandlers.js           # ALL Supabase DB operations via IPC (16 channels)
│   │   ├── fileSystemHandlers.js   # Read/write SOUL.md, AGENTS.md, memory
│   │   ├── skillHandlers.js        # Skill install/list/toggle
│   │   └── systemHandlers.js       # Window controls, safeStorage, settings
│   ├── dev/
│   │   └── mockGateway.js          # Mock OpenClaw Gateway for local dev (protocol v3)
│   └── __tests__/                  # Main-process integration tests (vitest, node environment)
│       ├── gatewayBridge.test.js   # Protocol v3/v1.0 handshake, tick, reconnect
│       ├── dbHandlers.test.js      # All 16 db:* IPC handlers
│       ├── workspaceManager.test.js # Workspace creation, idempotency, validation
│       ├── openclawConfig.test.js  # Config build, write, read round-trip
│       └── supabase.test.js        # Supabase client singleton
│
├── src/
│   ├── main.jsx / App.jsx          # React entry + router + WS context
│   ├── types/
│   │   └── supabase.ts             # Auto-generated Supabase types (never edit manually)
│   ├── contexts/                   # GatewayContext, AgentContext
│   ├── hooks/                      # useGateway, useAgents, useActivityFeed, useCheckpoint
│   ├── store/                      # Zustand: agentStore, taskStore, checkpointStore, settingsStore
│   ├── services/
│   │   ├── openclaw.js             # ALL IPC calls — never call window.hivemind directly in components
│   │   ├── db.js                   # All DB IPC calls (wraps window.hivemind 'db:*' channels)
│   │   ├── gatewayService.js       # WS manager with reconnect
│   │   ├── fileService.js          # SOUL.md / AGENTS.md via IPC
│   │   └── skillService.js         # Skill registry via IPC
│   ├── components/
│   │   ├── layout/                 # AppShell, Titlebar, Sidebar, MainContent
│   │   ├── dashboard/              # GoalInput, AgentGrid, AgentCard, ActivityFeed, FeedEntry
│   │   ├── agents/                 # AgentDetail, SoulEditor, AgentsEditor, MemoryViewer, SessionHistory
│   │   ├── builder/                # AgentBuilder wizard (4 steps)
│   │   ├── security/               # CheckpointModal (BLOCKING), AuditLog, ViolationBanner
│   │   └── shared/                 # StatusDot, Badge, CodeBlock, MarkdownEditor, EmptyState
│   ├── screens/                    # Dashboard, Agents, Builder, Tasks, Skills, Memory, Settings, Onboarding
│   └── styles/
│       ├── tokens.css              # ALL CSS variables — import before everything else
│       ├── globals.css
│       ├── typography.css
│       └── animations.css
│
├── supabase/
│   ├── migrations/                 # Timestamped SQL migration files — never edit manually after deploy
│   │   ├── 0001_create_agents.sql
│   │   ├── 0002_create_tasks.sql
│   │   ├── 0003_create_audit_log.sql
│   │   ├── 0004_create_checkpoints.sql
│   │   ├── 0005_create_skills.sql
│   │   ├── 0006_create_user_settings.sql
│   │   └── 0007_add_user_auth.sql
│   ├── seed.sql                    # Seeds the 9 preset agents with full SOUL.md/AGENTS.md — run on db reset
│   └── config.toml
│
├── .env.example                    # Committed — shows required vars without values
├── .env                            # NEVER committed — local secrets
├── package.json
├── vite.config.js
├── tailwind.config.js
└── electron-builder.config.js
```

---

## SUPABASE ARCHITECTURE

### Core Rule: Main Process Only
The Supabase client (`@supabase/supabase-js`) is instantiated **once** in `electron/services/supabase.js` and used only in the main process. The renderer **never** has direct Supabase access. All DB operations flow through IPC:

```
Renderer -> window.hivemind.invoke('db:agents:list') -> IPC -> electron/ipc/dbHandlers.js -> supabase.js -> Supabase
```

### Environment Variables
```bash
# .env (never committed)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...         # Public anon key — used with RLS
SUPABASE_SERVICE_ROLE_KEY=eyJ... # ONLY for seed/migration scripts, NEVER shipped in app binary
```

In production (distributed app), `SUPABASE_URL` and `SUPABASE_ANON_KEY` are encrypted via `electron.safeStorage` and set during onboarding. They are never bundled in the distributed binary.

### Key Distribution Rule
- **Anon key + RLS** for all runtime operations in the shipped app
- **Service role key** only in local dev scripts and CI/CD migrations — never in app code
- If an operation requires bypassing RLS, it must go through a Supabase **Edge Function**, not a service role key in the client

### Database Schema

**`profiles`** — extends auth.users with app-specific metadata (auto-created on signup)
```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

**`agents`** — all agent definitions (preset + custom). The 9 presets are seeded rows, NOT hardcoded arrays.
```sql
create table agents (
  id           text primary key,          -- 'orchestrator', 'coder', etc.
  name         text not null,
  role         text not null,
  model        text not null,             -- 'gemini/gemini-2.0-flash'
  workspace    text,                      -- ~/.openclaw/workspace-[name]
  soul_content text,                      -- SOUL.md content
  agents_content text,                    -- AGENTS.md content
  tools_allow  jsonb default '[]',
  tools_deny   jsonb default '[]',
  sandbox_mode text default 'all',
  is_preset    boolean default false,     -- presets cannot be deleted
  user_id      uuid references auth.users(id), -- NULL for shared presets
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

**`tasks`** — task queue and history
```sql
create table tasks (
  id             uuid primary key default gen_random_uuid(),
  goal           text not null,
  status         text not null default 'pending', -- pending|running|completed|failed|cancelled
  assigned_agents jsonb default '[]',
  result         text,
  user_id        uuid references auth.users(id),
  created_at     timestamptz default now(),
  completed_at   timestamptz
);
```

**`audit_log`** — append-only immutable record of every action (never UPDATE or DELETE rows)
```sql
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  agent_id     text references agents(id),
  task_id      uuid references tasks(id),
  payload      jsonb,
  user_id      uuid references auth.users(id),
  created_at   timestamptz default now()
);
```

**`checkpoints`** — security checkpoint decisions
```sql
create table checkpoints (
  id                  uuid primary key default gen_random_uuid(),
  agent_id            text not null references agents(id),
  task_id             uuid references tasks(id),
  action_description  text not null,
  action_payload      jsonb,
  decision            text,           -- 'approved' | 'denied'
  decided_at          timestamptz,
  user_id             uuid references auth.users(id),
  created_at          timestamptz default now()
);
```

**`skills`** — installed skills registry
```sql
create table skills (
  id            text primary key,
  name          text not null,
  description   text,
  version       text,
  scope         text not null default 'global',  -- 'global' | 'agent'
  agent_id      text references agents(id),       -- null if global
  skill_content text,                             -- SKILL.md contents
  enabled       boolean default true,
  user_id       uuid references auth.users(id),   -- NULL for global system skills
  installed_at  timestamptz default now()
);
```

**`user_settings`** — key/value store for non-sensitive user preferences
```sql
create table user_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null,
  value      jsonb,
  user_id    uuid references auth.users(id),
  updated_at timestamptz default now(),
  unique (key, user_id)
);
```

### Row Level Security
RLS is **enabled on every table**. No table may be accessed without a policy. Default posture: deny all, grant explicitly.
- All data policies target the `authenticated` role (not `anon`)
- All CRUD policies check `user_id = auth.uid()` for user-scoped access
- Shared data (preset agents, global skills) has `user_id IS NULL` and is visible read-only
- The main-process Supabase client authenticates via JWT synced from the renderer

### IPC Channels for DB (`db:*`)
All go through `electron/ipc/dbHandlers.js` and exposed via `src/services/db.js`:
```
db:agents:list         db:agents:get          db:agents:upsert       db:agents:delete
db:tasks:list          db:tasks:create        db:tasks:update
db:audit:append        db:audit:list
db:checkpoints:create  db:checkpoints:resolve
db:skills:list         db:skills:upsert       db:skills:delete
db:settings:get        db:settings:set
```

### App Startup Sequence (`electron/main.js`)
1. Create BrowserWindow
2. Initialize gateway bridge with window reference
3. Connect to OpenClaw Gateway (`ws://127.0.0.1:18789`)
4. Register all IPC handlers (db, agent, task, fileSystem, skill, system)
5. Fetch agents from Supabase → `ensureAllWorkspaces(agents)` → `writeConfig(agents)`
6. Register gateway IPC handlers (status, send, connect, disconnect, checkpoint)

### No-Hardcoding Mandate
Every value that could change or vary between environments must come from the database or environment config — never from source code literals:
- Agent IDs, names, models, tool lists → `agents` table
- Preset agent definitions → `seed.sql` (seeded on first run)
- Model names → loaded from `agents` rows, never a hardcoded string in a component
- Feature flags / thresholds → `user_settings` table
- API endpoints → environment variables loaded at runtime

---

## AUTHENTICATION ARCHITECTURE

### Auth Flow (Renderer → Main Process Bridge)
The renderer handles Supabase Auth (sign-in, token refresh) via a dedicated auth client in `src/lib/supabase.js`. The main-process Supabase client (which does all DB operations) must also authenticate. The bridge works as follows:

1. **User signs in** (renderer) → Supabase Auth returns a session with JWT
2. **Renderer calls `auth:sync-session`** → sends `accessToken` + `userId` to main process via IPC
3. **Main process recreates the Supabase client** with the JWT in the `Authorization` header
4. **All subsequent DB operations** go through the authenticated client → RLS checks `auth.uid()`
5. **On token refresh**, the renderer re-syncs the new token to the main process
6. **On sign out**, renderer calls `auth:clear-main-session` → main process reverts to anonymous client

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/supabase.js` | Renderer Supabase client (auth only, PKCE flow) |
| `src/hooks/useAuth.js` | Auth hook — manages session, syncs to main process |
| `src/services/auth.js` | IPC wrappers for auth:* channels |
| `src/store/authStore.js` | Zustand store for auth state |
| `src/components/auth/guards/RequireAuth.jsx` | Route guard — redirects unauthenticated users |
| `electron/ipc/authHandlers.js` | IPC handlers for storage, session sync, config |
| `electron/services/secureTokenStorage.js` | OS-level encrypted token storage (safeStorage) |
| `electron/services/protocolHandler.js` | Deep-link protocol for OAuth callbacks |

### Multi-Tenant RLS
All data tables have a `user_id UUID` column referencing `auth.users(id)`. RLS policies enforce:
- `authenticated` role only (no `anon` access to data)
- `user_id = auth.uid()` for all CRUD operations
- Preset agents (`is_preset = true, user_id = NULL`) are visible to all authenticated users (read-only)
- Global skills (`scope = 'global', user_id = NULL`) are visible to all authenticated users

### Profiles Table
`profiles` extends `auth.users` with app-specific metadata. Auto-created on signup via a trigger on `auth.users` insert.

### Startup Sequence (Post-Auth)
1. User opens app → RequireAuth redirects to `/auth/signin`
2. User authenticates → `onAuthStateChange` fires
3. Session synced to main process via `auth:sync-session`
4. Workspace initialization triggered via `app:init-workspaces`
5. Agent workspaces and `openclaw.json` are created/updated

### Auth IPC Channels
```
auth:storage:get/set/remove     — Custom storage adapter for Supabase client
auth:get-session/save/clear     — Session persistence in secure storage
auth:sync-session               — Bridge JWT from renderer to main process
auth:clear-main-session         — Clear main process session (sign out)
auth:get-supabase-config        — Provide URL + anon key to renderer
app:init-workspaces             — Post-auth workspace initialization
```

---

## SCREENS & BUILD ORDER

| Screen | Route | Priority |
|--------|-------|----------|
| Dashboard | `/` | **1st** — agent grid + activity feed + goal input |
| Settings | `/settings` | **2nd** — API keys + Supabase connection must work |
| Onboarding | `/onboarding` | **2nd** — first-run: detect gateway, set Supabase creds |
| Agents | `/agents` | 3rd — detail view + SOUL.md editor |
| Builder | `/builder` | 4th — custom agent wizard |
| Tasks | `/tasks` | 5th |
| Skills | `/skills` | 6th |
| Memory | `/memory` | 7th |

---

## OPENCLAW GATEWAY — WIRE PROTOCOL

Gateway runs at `ws://127.0.0.1:18789`. The bridge (`electron/ipc/gatewayBridge.js`) handles connection, handshake, and event routing.

### Frame Types
```typescript
// CLIENT -> GATEWAY
{ type: "req", id: "<uuid>", method: string, params: object }

// GATEWAY -> CLIENT (response)
{ type: "res", id: "<uuid>", ok: boolean, payload?: object, error?: string }

// GATEWAY -> CLIENT (push event)
{ type: "event", event: string, payload: object, seq?: number }
```

### Protocol v3 Handshake (challenge-response)

The bridge supports both protocol v3 (preferred) and v1.0 (fallback). The handshake is automatic:

1. **WebSocket opens** — bridge waits up to 3 seconds for a challenge
2. **Gateway sends `connect.challenge`** event with `{ nonce, ts, protocols: [3] }`
3. **Bridge responds** with full connect request:
   ```json
   { "type": "req", "method": "connect", "params": {
       "minProtocol": 3, "maxProtocol": 3,
       "client": { "id": "hivemind-os", "version": "0.1.0", "platform": "...", "mode": "operator" },
       "role": "operator",
       "scopes": ["operator.read", "operator.write", "operator.approvals"],
       "auth": { "mode": "token", "token": "..." },
       "nonce": "<from challenge>"
   }}
   ```
4. **Gateway responds** with `hello-ok` payload including `policy.tickIntervalMs`
5. **Fallback**: If no challenge arrives within 3 seconds, bridge sends a v1.0 connect frame:
   ```json
   { "type": "req", "method": "connect", "params": { "version": "1.0", "token": "" } }
   ```

### Tick Keepalive

After a v3 handshake, the gateway sends periodic `tick` events. The bridge responds with `tick.pong` automatically. Tick events are **not** forwarded to the renderer.

### Task DB Sync

When the gateway sends task `completed` or `failed` events, the bridge automatically updates the `tasks` table and appends to `audit_log` in Supabase.

### Gateway Event Types
- `"agent"` — agent output, status change, tool call, security_checkpoint, security_violation
- `"task"` — task lifecycle (started, progress, completed, failed)
- `"chat"` — new message from messaging platform
- `"presence"` — contact online/offline
- `"health"` — system metrics
- `"heartbeat"` — 30-min periodic (agent reads HEARTBEAT.md)
- `"cron"` — scheduled job fired
- `"tick"` — keepalive (handled internally, not forwarded)

### Sub-Agent Pattern
```
orchestrator -> sessions_spawn(agentId: "coder", task: "...", returnTo: "orchestrator")
coder completes -> announces result back
orchestrator synthesizes all results
```

---

## OPENCLAW FILE SYSTEM

```
~/.openclaw/
├── openclaw.json                  # Master config (JSON) — generated from agents table
├── skills/                        # Global shared skills
├── credentials/                   # Shared credentials directory
├── workspace-[agentname]/         # Per-agent "brain"
│   ├── SOUL.md                    # Written from agents.soul_content in DB
│   ├── AGENTS.md                  # Written from agents.agents_content in DB
│   ├── USER.md
│   ├── MEMORY.md
│   ├── HEARTBEAT.md
│   ├── memory/YYYY-MM-DD.md       # Daily append-only logs (today + yesterday loaded)
│   └── skills/
└── agents/[agentId]/
    ├── agent/auth-profiles.json   # API keys — NEVER share across agents
    └── sessions/[id].jsonl        # Session history (append-only JSONL)
```

**The `openclaw.json` is generated from the `agents` table** via `electron/services/openclawConfig.js`. It is regenerated:
- On every app start (in `electron/main.js`)
- After every `agent:create`, `agent:update`, or `agent:delete` operation

**Agent workspaces** are managed by `electron/services/workspaceManager.js`:
- `ensureWorkspace(agentId, agentData)` — creates workspace + all required files (never overwrites existing)
- `ensureAllWorkspaces(agents)` — called on app startup for all agents
- `validateWorkspace(agentId)` — checks all 5 required files exist

SOUL.md and AGENTS.md on disk are written from DB on agent save, and read back into DB on edit. The DB is the source of truth.

Skill precedence: `workspace/skills/` > `~/.openclaw/skills/`

---

## THE 9 PRESET AGENTS

Defined in `supabase/seed.sql`, seeded into the `agents` table. Cannot be deleted (`is_preset = true`). Can be customized. IDs are stable across all environments.

| ID | Role | Model | Risk |
|----|------|-------|------|
| `orchestrator` | CEO & task router | gemini-1.5-pro | Low |
| `pm` | Planning | gemini-2.0-flash | Low |
| `coder` | Engineering | gemini-2.0-flash | **HIGH** (exec+write) |
| `qa` | Testing | gemini-2.0-flash | Medium |
| `cybersec` | Security audit | gemini-2.0-flash | Medium |
| `design` | UI/UX | gemini-2.0-flash | Low |
| `marketing` | Copywriting | gemini-2.0-flash | Low |
| `research` | Intelligence | gemini-2.0-flash | Low |
| `patrol` | Watchdog | gemini-2.0-flash | Low |

---

## SECURITY REQUIREMENTS

### Electron WebPreferences (LOCKED — never change)
```javascript
contextIsolation: true
nodeIntegration: false
sandbox: true
webSecurity: true
allowRunningInsecureContent: false
```

### IPC Rules
- Renderer calls **only** via `window.hivemind.invoke()` and `window.hivemind.on()`
- `preload.js` enforces a strict channel whitelist
- **ZERO imports from `'electron'` or `'@supabase/supabase-js'` in `src/`** — both are main-process only
- Every IPC payload validated in main process handler

### Credential Storage
| Credential | Storage |
|-----------|---------|
| Supabase URL | `safeStorage` (set during onboarding) |
| Supabase Anon Key | `safeStorage` (set during onboarding) |
| Gemini API Key | `safeStorage` |
| OpenClaw Gateway Token | `safeStorage` |
| Service Role Key | Local dev `.env` only — NEVER in app |
| Any secret | Never `localStorage`, never plaintext, never console |

### Agent Security
- Agent output rendered as **plain text only** — never inject raw HTML from agent responses
- `CheckpointModal` fully blocks UI — not dismissable with Escape, not a notification
- Tool allow/deny lists are config-hardcoded in DB — not expandable by prompt
- All actions appended to `audit_log` table — rows are immutable (no UPDATE/DELETE)
- Never share `agentDir` or `auth-profiles.json` between agents

### Supabase Security
- RLS enabled on every table — no exceptions
- Anon key used at runtime; service role key never shipped in binary
- All schema changes via migration files — no manual SQL on production
- Sensitive operations (bulk deletes, admin actions) go through Edge Functions, not client SDK

---

## DESIGN SYSTEM

### Aesthetic: Editorial Monochrome
Bloomberg Terminal x Linear.app. White surfaces. Black type. Surgical gray. Color only for functional status signals. Design word: **restraint**.

### Fonts
- `'Playfair Display'` — screen titles, modal titles, h1–h3 **only**
- `'DM Sans'` — all UI, body, buttons, labels, navigation
- `'JetBrains Mono'` — agent logs, code, IDs, timestamps, config values

**FORBIDDEN**: Inter, Roboto, Arial as display fonts.

### Color Tokens (`src/styles/tokens.css`)
Never hardcode hex in components — always use CSS variables:

```css
/* Surfaces */
--color-bg-base: #FFFFFF
--color-bg-surface: #F8F8F7
--color-bg-elevated: #F2F2F0
--color-bg-scrim: rgba(0,0,0,0.55)

/* Text */
--color-text-primary: #0A0A0A
--color-text-secondary: #3D3D3A
--color-text-tertiary: #8C8C87
--color-text-disabled: #C2C2BC
--color-text-inverse: #FFFFFF

/* Borders */
--color-border-light: rgba(0,0,0,0.06)
--color-border-medium: rgba(0,0,0,0.12)
--color-border-strong: rgba(0,0,0,0.22)
--color-border-accent: #0A0A0A

/* Buttons / Inputs */
--color-btn-primary-bg: #0A0A0A
--color-btn-primary-text: #FFFFFF
--color-btn-primary-hover: #2A2A2A
--color-input-bg: #F8F8F7
--color-input-border: rgba(0,0,0,0.12)
--color-input-border-focus: rgba(0,0,0,0.40)

/* Status (use sparingly) */
--color-status-success-dot: #2A6E3F
--color-status-warning-dot: #8A6B1A
--color-status-error-dot: #8B1A1A
```

### Animation
```css
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94)  /* standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)      /* modal open */
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1)         /* exits */
--dur-fast: 150ms  --dur-normal: 240ms  --dur-slow: 380ms  --dur-enter: 420ms
```

- `AnimatePresence` wraps every conditional render of a significant component
- Page transitions: opacity 0→1 + translateY(12px→0), `--dur-enter` + `--ease-smooth`
- Modal open: backdrop fade 240ms + scale(0.95→1) + fade, `--dur-slow` + `--ease-spring`
- Agent cards: staggered fade + 8px upward slide, 55ms delay between cards

---

## CODE CONVENTIONS

### Naming
```
Components:     PascalCase       AgentCard.jsx
Hooks:          useCamelCase     useAgentStore.js
IPC channels:   prefix:action    'agent:list', 'db:agents:upsert'
DB tables:      snake_case       audit_log, user_settings
CSS variables:  --color-name     --color-text-primary
Agent IDs:      kebab-case       'orchestrator', 'cybersec'
```

### Layering Rules
- Components call `src/services/db.js` or `src/services/openclaw.js` — never `window.hivemind` directly
- `src/services/db.js` calls `window.hivemind.invoke('db:*')` — the only file that does
- `electron/ipc/dbHandlers.js` calls `electron/services/supabase.js` — the only file that does
- `electron/services/supabase.js` contains the Supabase client — instantiated once, never re-created
- `electron/services/pathUtils.js` provides all path resolution — no duplicate `getOpenClawBase()` etc.
- `electron/services/workspaceManager.js` handles all workspace file I/O
- `electron/services/openclawConfig.js` generates `openclaw.json` — the only writer of this file
- Main-process code lives in `electron/` only — never in `src/`
- `@supabase/supabase-js` is imported only in `electron/` — never in `src/`

### Schema Changes
1. Create a new migration file: `supabase/migrations/NNNN_description.sql`
2. Run `npx supabase db push` to apply
3. Run `npx supabase gen types typescript --local > src/types/supabase.ts` to update types
4. Never edit generated types in `src/types/supabase.ts` manually

---

## TESTING

### Architecture
- **Test runner**: Vitest (configured in `vite.config.js`)
- **Frontend tests** (`src/`): jsdom environment, Testing Library
- **Main-process tests** (`electron/__tests__/`): node environment (`@vitest-environment node`)
- **E2E tests** (`e2e/`): Playwright

### Main-Process Test Pattern
Electron main-process modules use CJS (`require`/`module.exports`). Tests use ESM imports from vitest but load modules under test via `createRequire` + require cache seeding to mock dependencies:

```javascript
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);

// Seed mock into require cache before loading module under test
require_.cache[dependencyPath] = { id: path, filename: path, loaded: true, exports: mockExports };

// Then load module under test (gets mocked dependencies)
const moduleUnderTest = require_(modulePath);
```

This pattern is used consistently across all `electron/__tests__/` files. Built-in modules like `fs` can also be mocked via cache seeding with key `'fs'`.

### Running Tests
```bash
npm run test                              # All tests
npx vitest run electron/__tests__/        # Main-process tests only
npx vitest run src/                       # Frontend tests only
```

---

## COMMON BUGS TO AVOID

1. **Not handling v3 challenge-response** — Gateway sends `connect.challenge` before accepting connect frames
2. **Not resending `connect` frame on reconnect** — Gateway rejects subsequent frames
3. **Sharing `agentDir` across agents** — auth and session collisions
4. **Importing `'electron'` or `'@supabase/supabase-js'` in `src/`** — security violation, runtime crash
5. **Any credential in `localStorage`** — use `safeStorage` only
6. **Rendering raw agent output as HTML** — use plain text only (prompt injection XSS)
7. **Missing `AnimatePresence` on conditional renders** — exit animations never fire
8. **Hardcoded hex colors** — use CSS variables
9. **`CheckpointModal` dismissable by Escape** — must be fully blocking
10. **Deriving `checkpointId` from state** — use the ID directly from the event payload
11. **Hardcoding agent arrays in source** — agents come from the `agents` table, not source literals
12. **Editing `src/types/supabase.ts` manually** — regenerate with the CLI after schema changes
13. **UPDATE or DELETE on `audit_log`** — it is append-only; rows are permanent
14. **Using service role key at runtime** — anon key + RLS only in the distributed app
15. **Creating the Supabase client in the renderer** — main process only, accessed via IPC
16. **Duplicating path utilities** — use `electron/services/pathUtils.js`, never define local `getOpenClawBase()`
17. **Not regenerating `openclaw.json` after agent CRUD** — call `writeConfig()` after every agent create/update/delete
18. **Not creating workspace on agent create** — call `ensureWorkspace()` when a new agent is persisted
19. **Forwarding tick events to renderer** — tick/pong is internal keepalive, never forwarded to UI
20. **Not syncing auth session to main process** — after sign-in/token refresh, call `auth:sync-session` so the main-process Supabase client has the JWT for RLS
21. **Missing `user_id` on insert/upsert** — all data table writes must include `user_id` from `getUserId()` for RLS compliance
22. **Using `anon` role in RLS policies** — all data policies must target `authenticated` and check `auth.uid()`
23. **Not triggering `app:init-workspaces` after auth** — workspace init is deferred; must be called after session sync
24. **Editing profiles table directly** — profile rows are auto-created by a trigger on signup; only update, never insert manually

---

*See PROMPT.md for the full build prompt with complete code scaffolding examples.*
