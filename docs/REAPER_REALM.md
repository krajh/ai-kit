# Reaper Realm

Background task delegation system for OpenCode. The coordinator enqueues tasks → Shade (autonomous executor) picks them up and executes them using Pi with ai-kit agent delegation.

## Architecture

```
┌──────────────────────────┐         ┌─────────────────────────┐
│  Coordinator (OpenCode)  │         │  Shade (Pi process)     │
│                          │         │                         │
│  reaper_enqueue()        │────────►│  reaper_dequeue()       │
│                          │         │  execute task            │
│  reaper_status()         │◄────────│  reaper_heartbeat()     │
│                          │         │  reaper_complete/fail()  │
└──────────────────────────┘         └─────────────────────────┘
              │                              │
              ▼                              ▼
     ┌────────────────┐           ┌─────────────────────────┐
     │  queue.db      │           │  ai-kit Agents           │
     │  (SQLite/WAL)  │           │  (Pi subprocesses)       │
     └────────────────┘           └─────────────────────────┘
```

### Components

| Component     | Location                         | Description                                |
| ------------- | -------------------------------- | ------------------------------------------ |
| Queue DB      | `~/.frieren/queue.db`            | SQLite task queue (created by Frieren MCP) |
| Frieren MCP   | `~/dev/frieren/`                 | Provides `reaper_*` tools to OpenCode      |
| Shade harness | `~/.config/opencode/shade-pico/` | Pi extensions, launcher, tmux config       |
| Shade session | tmux `shade`                     | Persistent background executor             |

## Prerequisites

1. **Frieren MCP server**: `ai-kit-install install --frieren`
2. **Pi runtime**: `npm install -g @mariozechner/pi-coding-agent`
3. **tmux**: `apt install tmux` (Debian/Ubuntu) or `brew install tmux` (macOS)
4. **bun** — for queue count checks in the launcher.

## Installation

```bash
# Via ai-kit (recommended)
ai-kit-install install --shade

# Manual
cp -r shade/ ~/.config/opencode/shade-pico/
chmod +x ~/.config/opencode/shade-pico/shade-launcher.sh
chmod +x ~/.config/opencode/shade-pico/shade-tmux.sh
# Then add shell aliases from shade-tmux.sh to ~/.zshrc
```

> **Native Windows:** `ai-kit-install install --shade` copies the Shade files to `%APPDATA%\opencode\shade-pico` and installs a `shade` PowerShell alias, but `shade-tmux.sh` still depends on tmux and does not run natively on Windows. Use WSL/tmux for the persistent executor.

## Usage

### Enqueue a task (from coordinator/OpenCode)

```
reaper_enqueue({
  task: "Fix all TypeScript errors in src/api/",
  priority: 3
})
```

### Check queue status

```
reaper_status()
```

### Cancel a task

```
reaper_cancel({ task_id: "reaper_..." })
```

### Monitor Shade

```bash
shade-status    # Is Shade running?
shade-attach    # View live output
shade-stop      # Kill Shade session
shade-start     # Restart Shade session
```

## Agent Delegation

Shade delegates to ai-kit agents via Pi subprocesses. Each agent gets a domain-specific system prompt.

| Tool          | Agent       | Domain                                         |
| ------------- | ----------- | ---------------------------------------------- |
| `implementer` | Implementer | Feature development, fixes, integrations       |
| `reviewer`    | Reviewer    | Code review, testing validation, documentation |
| `strategist`  | Strategist  | System architecture, migration strategies      |
| `research`    | Research    | Investigation, data gathering, findings        |
| `architect`   | Architect   | System-wide strategy, roadmaps, trade-offs     |

### Delegation example

```
implementer({
  instruction: "Add input validation to the /api/users endpoint",
  files: ["src/api/users.ts"],
  timeout_seconds: 300
})
```

## Shade Configuration

### Model

Shade uses `claude-sonnet-4.6` via `github-copilot` provider by default. Edit `shade-launcher.sh` to change:

```bash
PI_ARGS=(
  --provider github-copilot
  --model claude-sonnet-4.6
  --models "github-copilot/claude-sonnet-4.6,github-copilot/claude-opus-4.6,..."
)
```

### Polling interval

Default: 30 seconds. Edit the `sleep 30` line in `shade-launcher.sh`.

### Queue DB path

Default: `~/.frieren/queue.db`. Override with `FRIEREN_QUEUE_DB` env var.

## File Layout

```
~/.config/opencode/shade-pico/
├── AGENTS.md                    # Shade's system prompt
├── shade.ps1                    # Windows wrapper / limitation notice
├── shade-launcher.sh            # Main launcher (poll loop)
├── shade-tmux.sh                # Tmux session manager
└── extensions/
    ├── reaper.ts                 # Queue tools (dequeue, heartbeat, complete, fail, status)
    └── peerage/
        └── peerage.ts            # 5 agent tools (implementer, reviewer, strategist, research, architect)
```

## Queue Schema

```sql
CREATE TABLE reaper_realm_queue (
  task_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  project_id TEXT,
  coordinator_origin TEXT NOT NULL DEFAULT 'coordinator',
  target_vessel TEXT NOT NULL DEFAULT 'shade',
  status TEXT NOT NULL CHECK(status IN ('pending','manifesting','completed','failed','dead','cancelled')),
  priority INTEGER NOT NULL DEFAULT 5,
  payload TEXT NOT NULL,
  result TEXT,
  error TEXT,
  heartbeat_at TEXT,
  timeout_seconds INTEGER NOT NULL DEFAULT 600,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
```

### Task lifecycle

```
pending → manifesting → completed
                    ↘ failed → pending (retry) → dead
                cancelled (from pending)
```

### Stale recovery

Tasks stuck in `manifesting` past their `timeout_seconds` are automatically:

- Requeued to `pending` if `retry_count < max_retries`
- Marked `dead` if `retry_count >= max_retries`

### Garbage collection

Completed/dead/cancelled tasks older than 7 days are purged on queue init.

## Troubleshooting

| Problem                    | Fix                                                                    |
| -------------------------- | ---------------------------------------------------------------------- |
| Shade not picking up tasks | `shade-status` (session running?); `reaper_status()` (tasks pending?)  |
| Shade crashes              | `shade-stop && shade-start`; `shade-attach` for errors                 |
| Queue DB not found         | `ai-kit-install status` — Frieren must be running to create `queue.db` |
| Pi not found               | `npm install -g @mariozechner/pi-coding-agent` then `which pi`         |

### Shade crashes

```bash
shade-stop && shade-start       # Restart
shade-attach                    # Check output for errors
```

### Queue DB not found

Frieren MCP server creates the queue DB on first use. Make sure Frieren is running:

```bash
ai-kit-install status           # Check Frieren config
```

### Pi not found

```bash
npm install -g @mariozechner/pi-coding-agent
which pi                        # Should show path
```
