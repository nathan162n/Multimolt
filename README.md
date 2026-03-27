# HiveMind OS

A production-grade Electron desktop application for orchestrating multiple [OpenClaw](https://openclaw.ai) AI agents in parallel. Built for real workflows — not demos.

## What it does

HiveMind OS connects to a running OpenClaw gateway and gives you a unified control panel for your entire agent team. You can dispatch tasks, monitor live activity, approve or reject security checkpoints, manage agent configurations, and inspect memory logs — all from one app.

## Prerequisites

- [OpenClaw](https://openclaw.ai) installed and in your PATH
- A [Supabase](https://supabase.com) project (free tier works)
- Node.js 18+

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**

Copy `.env` and fill in your values:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
```

**3. Initialize the database**

In the Supabase SQL Editor, run `supabase/schema.sql` then `supabase/seed.sql`.

**4. Start the app**
```bash
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run build` | Build the React frontend |
| `npm run dist` | Build and package for distribution |
| `npm test` | Run the test suite |
| `npm run mock-gateway` | Start a local mock OpenClaw gateway for development |
| `npm run lint` | Lint the source files |

## Tech stack

- **Electron 31** — frameless window, contextIsolation, no nodeIntegration
- **React 18** + React Router 6 + Zustand 4
- **Supabase** — database layer (agents, tasks, audit log, checkpoints, skills, settings)
- **Framer Motion** — page transitions and UI animation
- **Vite 5** + Tailwind 3
- **Vitest** + Testing Library — 119 tests across 20 files

## Agents

Nine preset agents ship out of the box:

| Agent | Role |
|---|---|
| Orchestrator | CEO & task router |
| Project Manager | Planning & specification |
| Coder | Software engineering |
| QA Engineer | Testing & validation |
| CyberSec | Security audit |
| Designer | UI/UX & visual design |
| Marketing | Copywriting & growth |
| Research | Market intelligence |
| Patrol | Watchdog & recovery |

## Security

- All API keys encrypted with OS-level `electron.safeStorage`
- Every Supabase table has RLS enabled
- Security checkpoints require explicit human approval — cannot be dismissed
- Prompt injection protection built into the gateway bridge
- Content Security Policy enforced on all renderer pages
