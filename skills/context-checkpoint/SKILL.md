---
name: context-checkpoint
description: Capture current project state/decisions/progress into persistent context (Mai)
---

# Context Checkpoint

Persist what matters across sessions (decisions, progress, blockers, next steps) using the `checkpoint` tool and Mai Context DB.

## Use when

- End of a session (before compaction or closing)
- Before/after major refactors or architectural changes
- After a key decision or milestone
- Before handing work to another agent (clean handoff)
- When you need durable state that survives session restarts

## How it works

**Two-layer persistence:**

1. **Local checkpoint** - `.opencode/checkpoints/latest.json`
   - Fast, file-based snapshot
   - Used by plugins (e.g., mai-compaction-plugin)
   - Survives session restarts

2. **Mai Context DB** - Durable knowledge base
   - Decisions, constraints, patterns, issues
   - Queryable across sessions
   - Semantic search enabled

## Checkpoint Tool Usage

**Basic checkpoint (local only):**

```bash
checkpoint --name "milestone-name" --focus "what changed" --note "key details"
```

**Checkpoint with Mai sync:**

```bash
checkpoint --name "milestone-name" --focus "what changed" --note "key details" --sync
```

**What gets captured:**

- Checkpoint name and timestamp
- Focus area (what changed)
- Note (key details, decisions, next steps)
- Git state (branch, commit, diff stat)
- Created by (agent name)

## Mai Context DB Integration

**For durable decisions/constraints/patterns:**

Use Mai Context DB MCP tools directly:

```typescript
// Record a decision
await global.mcp?.callTool("mai-context-db", "create_context_entry", {
  table: "decisions",
  data: {
    title: "Use JWT for authentication",
    decision_type: "architecture",
    status: "active",
    rationale: "Stateless scaling, better for distributed systems",
    alternatives_considered: "Session-based auth (rejected: requires Redis)",
  },
});

// Query active decisions
await global.mcp?.callTool("mai-context-db", "query_context", {
  table: "decisions",
  filters: { status: "active" },
  limit: 10,
});
```

## Output Format

**Checkpoint success:**

```
[OK] Checkpoint created: milestone-name
- Path: .opencode/checkpoints/latest.json
- Focus: what changed
- Mai sync: yes/no
- Timestamp: 2026-01-26T08:30:00Z
```

**What to include in checkpoint notes:**

- **Decisions made:** What was decided and why
- **Progress:** What was completed (files, features, tests)
- **Blockers:** What's blocking progress (if any)
- **Next steps:** What should happen next
- **Context:** Any important context for future sessions

## Example: Good Checkpoint

```bash
checkpoint \
  --name "auth-system-complete" \
  --focus "JWT authentication with refresh tokens" \
  --note "Implemented JWT auth with 15min access tokens and 7-day refresh tokens. Added middleware for protected routes. All tests pass. Next: add rate limiting and CSRF protection." \
  --sync
```

**Corresponding Mai decision:**

```typescript
await global.mcp?.callTool("mai-context-db", "create_context_entry", {
  table: "decisions",
  data: {
    title: "JWT authentication with 15min/7day token strategy",
    decision_type: "architecture",
    status: "active",
    rationale:
      "Balance security (short access tokens) with UX (long refresh tokens)",
    project_id: "...",
  },
});
```

## When to Use Checkpoint vs. Mai Directly

**Use `checkpoint` tool when:**

- You want a quick snapshot of current state
- You're at a natural stopping point (end of session, milestone)
- You want local file-based persistence

**Use Mai Context DB directly when:**

- You're recording a specific decision/constraint/pattern
- You need semantic search later
- You want to query/update existing entries
- You're building durable knowledge (not just progress tracking)

**Use both when:**

- Major milestone with architectural decisions
- Handoff to another agent (checkpoint for state, Mai for decisions)
- End of complex work (checkpoint for progress, Mai for lessons learned)

## Related

- `mai-context-db-playbook` - Mai Context DB usage patterns
- `delegation-orchestration` - Coordination with checkpoints
- `.opencode/tool/checkpoint.ts` - Checkpoint tool implementation
