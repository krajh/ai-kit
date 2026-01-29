---
name: memory-tool-playbook
description: Practical patterns for using opencode-mem to capture session insights, check user preferences, and avoid duplicate work.
---

# OpenCode Memory (opencode-mem) — Practical Usage Playbook

**Purpose:** Use ephemeral semantic memory to maintain continuity across sessions, avoid duplicate work, and align execution with the user's preferences.

## When to use

- Before starting a task: search for similar past work
- When choosing between approaches: check the user profile for learned preferences
- When resuming work: pull recent context from prior sessions
- When uncertain: search before escalating

## What belongs in memory (and what doesn’t)

**Good fits (temporary, 30-day window):**

- Session context and “what we already tried”
- User preferences (style, risk tolerance, review expectations)
- Repeatable implementation patterns (where they’re not a durable policy)
- Short, actionable reminders ("this file owns the CLI flags")

**Not a good fit:**

- Secrets or credentials
- Long logs/dumps
- Permanent architectural decisions or team policies
  - Put these in your durable system of record: repo docs/ADRs, issue tracker, or an internal knowledge base

## Quick decision tree

```
Need recent session context or preferences?
  YES → opencode-mem

Need durable policy/decision that must last beyond memory retention?
  YES → record in your durable system of record (docs/ADR/issue)

Need tool execution history (commands run, artifacts created)?
  YES → episodic memory (tool events/artifacts)
```

## Core API patterns (TypeScript examples)

### 1) Search for relevant past work

```ts
memory({ mode: "search", query: "API response caching implementation" });
```

### 2) Check user preferences

```ts
memory({ mode: "profile" });
```

### 3) List recent memories (debugging/review)

```ts
memory({ mode: "list", limit: 20 });
```

### 4) Add memory manually (rare)

```ts
memory({
  mode: "add",
  content: "User prefers minimal-diff fixes for build errors",
});
```

## Recommended workflow pattern

### Pattern: Task start alignment

1. Search for similar work.
2. Read the user profile for preferences.
3. Use the results to shape the approach.
4. If still uncertain: escalate as a blocker.

**How to report (STATUS UPDATE):**

```
STATUS UPDATE:
- COMPLETED: N/A (starting)
- STARTING: <checkpoint>
- PROGRESS: Memory search: <what you found>; Preferences: <what you’re following>
- BLOCKERS: None
```

## “Memory → durable record” escalation (corporate)

When you find a preference or pattern that should outlive memory retention, escalate to the coordinator to record it durably (ADR / policy doc / issue).

```
ESCALATION TO COORDINATOR - KNOWLEDGE PROMOTION:
- INSIGHT: [one sentence]
- CONTEXT: [where it was observed / why it matters]
- RECOMMENDATION: [where to record it: ADR / docs / issue tracker]
- IMPACT: [how it will guide future work]
```

## Common pitfalls

- **Not searching first:** causes duplicated investigation.
- **Treating memory as permanent:** it’s retention-limited; record durable decisions elsewhere.
- **Using memory for policy conflicts:** if memory conflicts with repo protocols/docs, follow the repo and update memory (or add a clarifying note).

## Related

- `protocol-verify` — delegation compliance checks
- `context-checkpoint` — capture session/project state
