# Frieren: Optional Durable Memory

Frieren is an optional MCP (Model Context Protocol) server that adds **permanent, cross-session memory** to your OpenCode agents. It is not installed by default — ai-kit works fully without it.

**Fully local. No API keys. No external services.** Embeddings run on-device via a quantized MiniLM-L6-v2 model (~23 MB, auto-downloaded on first run).

## What It Adds

Frieren provides three memory planes:

| Plane        | Tool prefix          | Retention              | Use for                                          |
| ------------ | -------------------- | ---------------------- | ------------------------------------------------ |
| **Wisdom**   | `frieren_wisdom_*`   | Permanent              | Decisions, constraints, patterns, architecture   |
| **Session**  | `frieren_session_*`  | 60-day rolling         | Tool events, episode capture, blocker history    |
| **Codebase** | `frieren_codebase_*` | Re-indexed on demand   | Semantic code search, dependency graph traversal |

Without Frieren, agents use `opencode-mem` for ephemeral 30-day memory. With Frieren, they gain a **permanent wisdom layer** that survives indefinitely — decisions made in session 1 are still retrievable in session 1000.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0

## Installation

1. Clone and install the Frieren server:

```bash
git clone https://github.com/krajh/frieren.git ~/dev/frieren
cd ~/dev/frieren
bun install
```

2. Verify it starts:

```bash
bun src/index.ts
```

On first run, Frieren downloads the embedding model (~23 MB) to `~/.cache/`. You'll see download progress in the terminal. Subsequent starts are instant.

## Configuration

Add the following to `~/.config/opencode/opencode.json` under the `"mcp"` key. If no `"mcp"` key exists yet, add the whole block.

```json
{
  "mcp": {
    "frieren": {
      "type": "local",
      "command": "bun",
      "args": ["/absolute/path/to/frieren/src/index.ts"],
      "enabled": true
    }
  }
}
```

Replace `/absolute/path/to/frieren` with the actual path to your clone. Run `pwd` inside the repo directory to get it.

> **Note:** If you already have an `"mcp"` section with other servers, add the `"frieren"` key alongside them — do not replace the whole block.

## Verifying the Connection

Restart OpenCode and run:

```bash
# Inside an OpenCode session, ask your agent:
"Check frieren status"
# The agent will call frieren_frieren_status and report plane health
```

You should see a response showing all three planes online.

## Memory Architecture

With Frieren active, the full memory stack is:

```
opencode-mem     →  Ephemeral     (30-day, session continuity, agent prefs)
frieren session  →  Episodic      (rolling, tool events, episode capture)
frieren wisdom   →  Permanent     (decisions, constraints, patterns — never expires)
frieren codebase →  Semantic      (code index + dependency graph)
```

The `opencode-mem` layer continues to function as before. Frieren adds on top of it, not instead of it.

## Skills That Activate

Once Frieren is configured, these skills become fully useful:

| Skill                      | What it unlocks                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `frieren-context-patterns` | When/how to use each plane — wisdom vs session vs codebase; required fields, DoD gates |
| `memory-tool-playbook`     | Enhanced with Memory→Frieren promotion workflow                                        |
| `handoff-patterns`         | Cross-session handoff packs using `frieren_wisdom_write`                               |
| `delegation-protocols`     | F3 (High Fidelity) FRIEREN CAPTURE PLAN template                                       |

Load `frieren-context-patterns` first — it covers the complete usage model.

## Common Tool Calls

```typescript
// Record a permanent decision
frieren_wisdom_write({
  type: "decision",
  content: "Using JWT with 1h expiry",
  tags: ["auth"],
});

// Search wisdom before starting work
frieren_wisdom_search({ query: "auth pattern" });

// Log a session event
frieren_session_write({
  event_type: "milestone",
  content: "Auth module complete",
});

// Semantic code search
frieren_codebase_search({ query: "token refresh logic" });

// Traverse dependency graph
frieren_codebase_graph({
  entry: "src/auth/middleware.ts",
  direction: "dependents",
  depth: 3,
});
```

## Troubleshooting

**Frieren tools not appearing after config:**

- Restart OpenCode fully (MCP servers connect at startup)
- Verify the path in `opencode.json` resolves correctly: `bun /absolute/path/to/frieren/src/index.ts`

**Codebase search returns no results:**

- Run `frieren_codebase_index({})` once to build the initial index
- Re-index after large refactors: `frieren_codebase_index({ force: true })`

**Wisdom writes succeed but searches return nothing:**

- Embeddings are built asynchronously on first write; wait a few seconds and retry
- On very first run, the embedding model (~23 MB) may still be downloading to `~/.cache/` — check the terminal where Frieren is running
