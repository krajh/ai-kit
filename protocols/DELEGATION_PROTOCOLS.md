# Delegation Protocols — Corporate Edition

> **⚠️ SKILL AVAILABLE:** Consider using the `delegation-protocols` skill instead.  
> Load via: `skill({ name: "delegation-protocols" })`  
> This provides the same content in a more token-efficient, on-demand format.

**Version:** 1.0
**Effective Date:** 2026-01-28

These protocols keep multi-agent work visible, accountable, and predictable.

## Key Principles

1. **One task at a time.** Each agent works sequentially to completion before starting the next scope.
2. **Checkpoint-driven updates.** Report after every discrete milestone, scope shift, or tooling run.
3. **Immediate escalation.** Uncertainty, blockers, and decisions are treated as blockers—ask before guessing.
4. **Professional tone.** Keep language concise, objective, and free of narrative or character references.

## Status Report Format

Before work begins, acknowledge the protocol:

```
Protocols acknowledged, beginning work.
STATUS UPDATE:
- COMPLETED: N/A
- STARTING: [task name]
- BLOCKERS: None
```

During the task, report progress or checkpoints:

```
STATUS UPDATE:
- COMPLETED: [what just finished]
- STARTING: [next checkpoint]
- BLOCKERS: None
```

Or for continuing work:

```
STATUS UPDATE:
- CONTINUING: [task]
- PROGRESS: [specific accomplishments]
- BLOCKERS: None
```

## Escalations

Escalate immediately when blocked or when a decision is required:

```
ESCALATION TO COORDINATOR:
- BLOCKER: [describe]
- CONTEXT: [what you were trying]
- ATTEMPTED: [what you tried]
- NEED: [specific support or data]
- IMPACT: [what is blocked]
```

If there are multiple approaches, include options and a recommendation:

```
OPTIONS:
A) ...
B) ...
RECOMMENDATION: ...
```

## Completion

Before declaring the task done, confirm:

- Tests/checks run (list commands and results)
- Documentation updated if needed
- Recommendations or follow-ups noted

**Verification loop**: run `bun test` or `bun test --pass-with-no-tests` plus any project-specific checks before marking done.

## Background Task Delegation

For fire-and-forget tasks that don't require live agent interaction, use the Reaper Realm queue instead of `task()`:

```typescript
reaper_enqueue({
  task: "Fix all TypeScript errors in src/",
  priority: 3,
  timeout_seconds: 600
})
```

**When to use background delegation:**

- Batch operations (lint, test, migrate, format)
- Long-running jobs with clear acceptance criteria
- Independent tasks that don't need coordinator checkpoints
- Overnight or low-priority cleanup work

**When NOT to use background delegation:**

- Work requiring plan approval or escalation paths
- Multi-agent coordination or handoffs
- Time-sensitive or user-facing tasks
- Tasks with ambiguous acceptance criteria

**Monitoring:** Use `reaper_status` to check queue state. Shade reports completion via the queue — no STATUS UPDATE protocol needed.

See `reaper-realm` skill for setup, routing, and troubleshooting.
