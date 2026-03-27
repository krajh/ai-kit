---
name: tool-selection
description: Fast tool selection for file modification (patch→edit→write priority), search (grep/glob first, then Serena/ast-grep), coordination (task+session), context (Frieren vs memory), execution (bash), custom tools (verify-loop/checkpoint/status-snapshot).
---

# Tool Selection

**Purpose:** Fast, correct tool selection for OpenCode (optimize speed + token cost).

---

## File Modification (Priority Order)

| Priority | Tool    | Use when                                                  |
| -------- | ------- | --------------------------------------------------------- |
| 1        | `patch` | Multi-file refactors, code review batches, merges         |
| 2        | `edit`  | One precise replacement in one file; exact match required |
| 3        | `write` | New file, or full file replacement (read first if exists) |

**`write` critical:** Always provide BOTH `filePath` AND `content`. For files >5000 lines, use `edit` instead (prevents JSON truncation errors).

---

## Search & Discovery

```
Do you know exactly what you need?
├─ YES → Use specific tool (below)
└─ NO → Start with `grep` (content) or `glob` (names)
```

| Need                                          | Tool                                              |
| --------------------------------------------- | ------------------------------------------------- |
| Class/function definitions, call graph        | Serena `find_symbol` / `find_referencing_symbols` |
| AST patterns (all try-catch, specific syntax) | `ast-grep`                                        |
| File contents by regex                        | `grep` (or `rg` via `bash` for counting)          |
| Files by name pattern (`**/*.test.ts`)        | `glob`                                            |

---

## Coordination & Context

### Delegation

- **`task`** — delegate complex work to specialists. Enforce Delegation Protocols v1.4.
- **`session`** — turn-based collab (`message`), phase transitions (`new`), compaction (`compact`), parallel exploration (`fork`).
- **`todowrite`/`todoread`** — coordinator-only orchestration tracking.

### Context Management

**Frieren (durable):** architectural decisions, cross-agent contracts, multi-session work.

```typescript
frieren_wisdom_write({ type: "decision", content: "...", tags: ["auth"] });
frieren_wisdom_search({
  query: "authentication decisions",
  type_filter: "decision",
});
frieren_session_write({ event_type: "milestone", content: "..." });
frieren_memory_search({ query: "...", planes: ["wisdom", "session"] });
```

Wisdom types: `decision` · `constraint` · `pattern` · `issue`

**opencode-mem (ephemeral, 30-day):** session continuity, user preferences, recent history.

```typescript
memory({ mode: "search", query: "authentication patterns" });
memory({ mode: "profile" });
```

> Durable decisions → Frieren wisdom plane. Permanent constraints → Frieren wisdom plane. Recent context only → `memory`.

---

## Execution

**`bash`** — tests, builds, git, shell commands (`bun test`, `git status`, `npm install`).

---

## Custom Workflow Tools

| Tool                    | Usage                                  | Purpose                                            |
| ----------------------- | -------------------------------------- | -------------------------------------------------- |
| `verify-loop`           | `bun tools/verify-loop.ts --type auto` | Definition of Done check (format, typecheck, test) |
| `checkpoint`            | `bun tools/checkpoint.ts --name "X"`   | Write milestone snapshot; add `--sync` for Frieren |
| `status-snapshot`       | coordinator-only                       | Read `.opencode/status.json` summary               |
| `blocker-tracker`       | coordinator-only                       | Create/update blockers in `.opencode/status.json`  |
| `episodic-memory-query` | `--mode recent --limit 20`             | Query recent tool events or artifacts              |

---

## Quick Decision Matrix

| Task                            | Tool                    |
| ------------------------------- | ----------------------- |
| Multi-file refactor             | `patch`                 |
| Precise single-file replacement | `edit`                  |
| New file                        | `write`                 |
| Find class definition           | Serena `find_symbol`    |
| Find all try-catch              | `ast-grep`              |
| Search file contents            | `grep`                  |
| Find `*.test.ts` files          | `glob`                  |
| Delegate complex work           | `task` (Protocols v1.4) |
| Durable decision                | Frieren wisdom plane    |
| Recent context                  | `memory` (30-day)       |
| Run tests                       | `bash`                  |
| Verify work                     | `verify-loop`           |

---

## Related Skills

- `delegation-protocols` — when/how to use `task`
- `agent-routing` — route to correct specialist
- `handoff-patterns` — tools for each handoff type
- `memory-tool-playbook` — Frieren vs opencode-mem routing
