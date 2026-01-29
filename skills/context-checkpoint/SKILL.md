---
name: context-checkpoint
description: Capture current project state/decisions/progress into a durable checkpoint
---

# Context Checkpoint

Persist what matters across sessions (decisions, progress, blockers, next steps) using the `checkpoint` tool.

## Use when

- End of a session (before compaction or closing)
- Before/after major refactors or architectural changes
- After a key decision or milestone
- Before handing work to another agent (clean handoff)
- When you need durable state that survives session restarts

## How it works

**Local persistence:**

1. **Local checkpoint** - `.opencode/checkpoints/latest.json`
   - Fast, file-based snapshot
   - Survives session restarts
   - Good for handoffs and compaction/resume workflows

## Checkpoint Tool Usage

**Basic checkpoint (local only):**

```bash
checkpoint --name "milestone-name" --focus "what changed" --note "key details"
```

**What gets captured:**

- Checkpoint name and timestamp
- Focus area (what changed)
- Note (key details, decisions, next steps)
- Git state (branch, commit, diff stat)
- Created by (agent name)

## Durable records (recommended)

Use a durable system of record for decisions and policies that must survive beyond memory retention:

- ADRs in the repo (`docs/adr/`)
- Issue tracker (for work items and decisions-in-context)
- Internal knowledge base / wiki

## Output Format

**Checkpoint success:**

```
[OK] Checkpoint created: milestone-name
- Path: .opencode/checkpoints/latest.json
- Focus: what changed
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
  --note "Implemented JWT auth with 15min access tokens and 7-day refresh tokens. Added middleware for protected routes. All tests pass. Next: add rate limiting and CSRF protection."
```

## When to Use Checkpoint vs. a durable record

**Use `checkpoint` tool when:**

- You want a quick snapshot of current state
- You're at a natural stopping point (end of session, milestone)
- You want local file-based persistence

**Use a durable record directly when:**

- You're recording a specific decision/constraint/pattern
- You need a permanent decision log or a policy that should outlive retention windows
- You need organization-wide discoverability (e.g., wiki/knowledge base)
- You want to track work items (issue tracker) or decisions (ADR)

**Use both when:**

- Major milestone with architectural decisions
- Handoff to another agent (checkpoint for state + ADR/issue for decisions)
- End of complex work (checkpoint for progress + write down lessons learned durably)

## Related

- `delegation-orchestration` - Coordination with checkpoints
- `.opencode/tool/checkpoint.ts` - Checkpoint tool implementation
