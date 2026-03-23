---
name: tool-selection
description: Fast tool selection for file modification (patch→edit→write priority), search (grep/glob first, then Serena/ast-grep), coordination (task+session), context (Frieren vs memory), execution (bash), custom tools (verify-loop/checkpoint/status-snapshot).
---

# Tool Selection

**Purpose:** Fast, correct tool selection for OpenCode (optimize speed + token cost).

**Created:** February 10, 2026  
**Version:** 1.0

---

## When to Load This Skill

**Load when:**

- Uncertain which tool to use for file modification
- Need to search/discover code patterns
- Choosing between coordination tools
- Unsure about custom workflow tools

**Auto-loaded for:**

- Agents working in unfamiliar codebases
- When tool selection ambiguity exists

---

## File Modification (Priority Order)

### 1. `patch` - Best for Multi-Line / Multi-File

**Use when:**

- Refactors, multi-file changes
- Code review batches
- Merges
- Need unified diff with clear context

**Example:** Refactoring auth across 5 files

---

### 2. `edit` - Best for Surgical Replacement

**Use when:**

- One precise replacement in one file
- Renames or small fixes where exact match matters
- Need to preserve surrounding context exactly

**Example:** Rename function across single file

**Critical:** Match exact indentation after line number prefix

---

### 3. `write` - Best for New File or Full Replace

**Use when:**

- Creating new files
- Replacing an entire file (read first if it exists)

**CRITICAL Parameter Requirements:**

- ALWAYS provide BOTH `filePath` AND `content`
- Never construct partial JSON
- For large files (>5000 lines), prefer `edit` with incremental updates

**Common Errors:**

- **JSON Parse Error** - Missing `content` parameter
  - Cause: Token limit truncation, missing validation
  - Fix: Use `edit` for large files, break into chunks

---

## Search & Discovery

### Decision Tree

```
Do you know exactly what you need?
├─ YES → Use specific tool (below)
└─ NO → Start with `grep` (content) or `glob` (names)
```

### Specific Search Tools

**Symbols (classes/functions, call graph):**

- Tool: Serena MCP (`serena_find_symbol`, `serena_find_referencing_symbols`)
- Use when: Finding class definitions, function calls, refactoring symbols

**Structural code patterns:**

- Tool: `ast-grep`
- Use when: Finding AST patterns (e.g., all try-catch blocks, specific syntax)

**Text search:**

- Tool: `grep` (or `rg` via `bash` for counting/advanced options)
- Use when: Searching file contents by regex

**File names:**

- Tool: `glob`
- Use when: Finding files by pattern (e.g., `**/*.test.ts`)

---

## Coordination & Context Management

### Delegation

**`task` tool:**

- Use to delegate complex work to specialist agents
- MANDATORY: Enforce Delegation Protocols v1.4
- Also use to invoke ephemeral specialist agents for disposable, single-purpose tasks

**`session` tool:**

- Turn-based collaboration (`message`)
- Clean phase transitions (`new`)
- Manual compaction (`compact`)
- Parallel design exploration (`fork`)

---

### Context Management

**Frieren Memory (durable layer):**

**Use for:**

- Durable knowledge (permanent — survives restarts and sessions)
- Architectural decisions
- Cross-agent contracts
- Multi-session work

**Common tools:**

- `frieren_wisdom_write({ type, content, tags?, evidence?, confidence? })`
- `frieren_wisdom_search({ query, type_filter?, limit? })`
- `frieren_session_write({ event_type, content, artifacts? })`
- `frieren_session_recall({ query, since?, limit? })`
- `frieren_memory_search({ query, planes?, limit? })`

**Knowledge types (wisdom plane):**

- `decision` - Architectural decisions with rationale
- `constraint` - Active constraints and requirements
- `pattern` - Established patterns and best practices
- `issue` - Critical issues and resolutions

**Example:**

```typescript
// Query before delegation
await frieren_wisdom_search({
  query: "authentication decisions",
  type_filter: "decision",
  limit: 5,
});

// Create after decision
await frieren_wisdom_write({
  type: "decision",
  content: "Use JWT for auth — stateless scaling",
  tags: ["auth", "architecture"],
  confidence: 0.9,
});
```

---

**Memory Tool (opencode-mem):**

**Use for:**

- Ephemeral session continuity (30-day retention)
- Semantic search across recent history
- User preferences

**Operations:**

```typescript
// Search past context
memory({ mode: "search", query: "authentication patterns" });

// View preferences
memory({ mode: "profile" });

// List recent
memory({ mode: "list", limit: 10 });
```

**When NOT to use:**

- Durable decisions → Use Frieren wisdom plane (`frieren_wisdom_write`)
- Tool history → Use episodic memory
- Permanent constraints → Use Frieren wisdom plane (`frieren_wisdom_write`)

**Cost:**

- Embeddings: Zero (local model)
- Auto-capture: ~$0.02-0.07/session¹
- Search: <100ms

¹ Based on OpenAI pricing (Jan 2026): gpt-4o-mini $0.150/1M input, $0.600/1M output

---

### Todo Management (coordinator-only)

**`todowrite` / `todoread`:**

- Use only for orchestration tracking
- Coordinator-only by policy

---

## Execution

**`bash` tool:**

**Use for:**

- Running tests/builds/scripts
- Git operations
- Shell commands

**Examples:**

```bash
bun test
git status
npm install
```

---

## Custom Workflow Tools

### `verify-loop`

Run verification to ensure work meets Definition of Done

**Usage:**

```bash
bun .opencode/tools/verify-loop.ts --type auto
bun .opencode/tools/verify-loop.ts --type tool --checkpoint-name "complete"
```

**Checks:**

- Tool/plugin: `bun fmt`, `bunx tsc --noEmit`, `bun test`, status tags
- Doc: forbidden patterns, formatting

**Integration:**

- Creates blocker if checks fail
- Creates checkpoint if passes (with `--checkpoint-name`)

---

### `checkpoint`

Write local milestone snapshot

**Usage:**

```bash
bun .opencode/tools/checkpoint.ts --name "milestone" --focus "context"
bun .opencode/tools/checkpoint.ts --name "milestone" --sync  # Sync to Frieren
```

---

### `status-snapshot` (coordinator-only)

Read and summarize `.opencode/status.json` for fast status updates

---

### `blocker-tracker` (coordinator-only)

Create/update blockers in `.opencode/status.json`

---

### `episodic-memory-query`

Query episodic memory for recent tool events or artifacts

**Usage:**

```bash
bun .opencode/tools/episodic-memory-query.ts --mode recent --limit 20
bun .opencode/tools/episodic-memory-query.ts --mode artifacts --artifact-types '["file","git_commit"]'
```

---

## Quick Reference

**Modify code:** `patch` → `edit` → `write` (priority order)

**Find things:**

1. Unsure? Start with `glob` (names) or `grep` (content)
2. If needed: Serena (symbols), ast-grep (patterns), rg (text)

**Coordinate:** `task` (with Protocols v1.4) + (coordinator-only) todo tools

**Context:** Frieren (durable: wisdom/session/codebase) + opencode-mem (ephemeral 30-day)

---

## Tool Selection Decision Matrix

| Task                   | Tool                 | Notes                |
| ---------------------- | -------------------- | -------------------- |
| Multi-file refactor    | `patch`              | Unified diff         |
| Precise replacement    | `edit`               | Exact match          |
| New file               | `write`              | Both params required |
| Find class definition  | Serena `find_symbol` | Symbol search        |
| Find all try-catch     | `ast-grep`           | AST patterns         |
| Search file contents   | `grep`               | Text search          |
| Find `*.test.ts` files | `glob`               | File patterns        |
| Delegate complex work  | `task`               | Protocols v1.4       |
| Turn-based collab      | `session`            | Same conversation    |
| Durable decision       | Frieren wisdom plane | Permanent            |
| Recent context         | `memory`             | 30-day retention     |
| Run tests              | `bash`               | Shell execution      |
| Verify work            | `verify-loop`        | Definition of Done   |

---

## Integration with Other Skills

- `effort-complexity-framework` - Informs when to use verification gates
- `agent-routing` - Use `task` to delegate to correct specialist
- `handoff-patterns` - Tools for each handoff type
- `frieren-context-patterns` - Frieren vs opencode-mem routing

---

## Common Mistakes

### ❌ **Using `write` for Large Files**

- **Bad:** `write` 10,000-line file, hits token limit
- **Good:** Use `edit` for incremental updates
- **Why:** Prevents JSON truncation errors

### ❌ **Using `grep` When Need Symbols**

- **Bad:** `grep "class Foo"` (misses namespace, inheritance)
- **Good:** Serena `find_symbol` (understands code structure)
- **Why:** Symbol search is semantic, not textual

### ❌ **Using Memory for Permanent Decisions**

- **Bad:** Store "use JWT for auth" in memory (expires in 30 days)
- **Good:** Store in Frieren wisdom plane (`frieren_wisdom_write`)
- **Why:** Architectural decisions must survive sessions

### ❌ **Not Using `verify-loop` Before "Done"**

- **Bad:** Mark work complete without running checks
- **Good:** Run `verify-loop --type auto` before completion
- **Why:** Catches lint/test/format issues early

---

## Related Protocols

- `TOOL_USAGE_GUIDE.md` - Original source (being replaced by this skill)
- `DELEGATION_PROTOCOLS.md` - When to use `task` tool
- `protocols/MEMORY_ARCHITECTURE.md` - Memory architecture and tool routing

---

**Last Updated:** February 10, 2026  
**Next Review:** April 2026
