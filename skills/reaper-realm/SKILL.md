---
name: reaper-realm
description: Background task delegation via the Reaper Realm queue. Enqueue tasks for autonomous execution by Shade (Pi-based executor with ai-kit agent delegation).
---

# Reaper Realm

Background task queue for autonomous execution. The coordinator enqueues tasks → Shade picks them up and executes them using Pi with ai-kit agent delegation.

**Requires:** Frieren MCP server (provides queue tools) + Pi runtime.

## When to Use

- Long-running tasks that don't need real-time interaction
- Batch operations (lint fixes, test runs, migrations)
- Research tasks that can run in the background
- Anything you want to fire-and-forget

## Architecture

```
Coordinator (OpenCode)     Shade (Pi)
     │                      │
     │ reaper_enqueue       │ reaper_dequeue
     │ ──────────────────►  │
     │                      │ execute task
     │                      │ reaper_heartbeat (every 60s)
     │ reaper_status        │
     │ ◄──────────────────  │
     │                      │ reaper_complete / reaper_fail
```

**Queue DB:** `~/.frieren/queue.db` (SQLite, WAL mode)

## MCP Tools (Coordinator side)

| Tool | Description |
|------|-------------|
| `reaper_enqueue` | Cast a task into the queue |
| `reaper_dequeue` | Claim next pending task (Shade uses this) |
| `reaper_heartbeat` | Signal liveness for manifesting task |
| `reaper_complete` | Mark task done with result |
| `reaper_fail` | Mark task failed (auto-retries if under limit) |
| `reaper_status` | Query queue state |
| `reaper_cancel` | Cancel a pending task |

## Enqueueing Tasks

```
reaper_enqueue({
  task: "Fix all TypeScript errors in src/api/",
  files: ["src/api/"],
  priority: 3,           // 1-10, lower = higher priority
  timeout_seconds: 600,  // per-task timeout
  max_retries: 3,        // retry count before dead
  project_id: "my-app",  // optional project scope
  idempotency_key: "fix-api-ts-2026-03"  // prevent duplicates
})
```

## Shade Executor

Shade runs as a Pi process in a tmux session. It polls the queue every 30 seconds.

### Shade Tools

Shade has standard Pi tools (read, write, edit, bash, grep, find, ls) plus:

**Queue tools:** `reaper_dequeue`, `reaper_heartbeat`, `reaper_complete`, `reaper_fail`, `reaper_status`

**Agent tools** (specialist delegation):

| Tool | Agent | Domain |
|------|-------|--------|
| `implementer` | Implementer | Feature development, fixes, integrations |
| `reviewer` | Reviewer | Code review, testing validation, documentation |
| `strategist` | Strategist | System architecture, migration strategies |
| `research` | Research | Investigation, data gathering, findings |
| `architect` | Architect | System-wide strategy, roadmaps, trade-offs |

### Routing

| Task type | Use this tool |
|-----------|--------------|
| Write/fix/refactor code | `implementer` |
| Review code quality | `reviewer` |
| System design, architecture | `strategist` |
| Investigate codebase | `research` |
| System-wide strategy | `architect` |

## Monitoring

```bash
shade-status          # Is Shade running?
shade-attach          # View Shade's tmux session
reaper_status         # Check queue from coordinator
```

## Setup

Shade is installed separately via ai-kit:

```bash
ai-kit-install install --shade
ai-kit-install update --shade
```

Or manually: see `docs/REAPER_REALM.md`.

## Related

- `delegation-protocols` — Agent coordination patterns
- `handoff-patterns` — Multi-agent handoff types
- `docs/REAPER_REALM.md` — Full setup and architecture docs
