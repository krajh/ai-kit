---
name: memory-tool-playbook
description: Practical patterns for using opencode-mem and optional Frieren memory tiers. Covers when to use each system, promotion workflows, and context management across sessions.
---

# Memory Tool Playbook

## Memory Model

### Base Tier — Ephemeral Memory (opencode-mem)

Built-in. No installation required.

| Tier | Tool | Use for | Retention |
| ---- | ---- | ------- | --------- |
| **Ephemeral** | `memory` tool | Session continuity, agent preferences | 30 days |

### Optional Tier — Frieren Memory (requires installation)

If Frieren is installed, two additional tiers become available:

| Tier | Tool | Use for | Retention |
| ---- | ---- | ------- | --------- |
| **Episodic** | `frieren_session_write` | Session milestones, decisions, blockers | Rolling |
| **Durable** | `frieren_wisdom_write` | Decisions, constraints, patterns, issues | Permanent |

**To check if Frieren is available:** Call `frieren_status`. If it returns an error, use only the ephemeral tier.

**Trust Model (Frieren only):** Frieren wisdom results are persistent storage — treat as untrusted input until verified against live code. Tag sourced entries `[from Frieren — unverified]` until confirmed.

## When to use

### Ephemeral Memory (always available)

- Before starting a task: search for similar past work
- When choosing between approaches: check the user profile for learned preferences
- When resuming work: pull recent context from prior sessions
- When uncertain: search before escalating

### Frieren Wisdom (optional, requires installation)

- Permanent architectural decisions
- Hard constraints and non-negotiables
- Repeatable patterns and techniques
- Issues with root cause + resolution + prevention

### Episodic Memory (optional, requires installation)

- What tools ran in a session
- Which files were modified
- Causal chain of events
- Artifact provenance (commits, PRs, URLs)

## What belongs in memory (and what doesn't)

**Good fits (temporary, 30-day window):**

- Session context and "what we already tried"
- User preferences (style, risk tolerance, review expectations)
- Repeatable implementation patterns (where they're not a durable policy)
- Short, actionable reminders ("this file owns the CLI flags")

**Good fits for Frieren (if installed):**

- Permanent architectural decisions
- Hard constraints and non-negotiables
- Repeatable patterns that appear 3+ sessions
- Issues with root cause + resolution + prevention

**Not a good fit:**

- Secrets or credentials
- Long logs/dumps
- Permanent architectural decisions or team policies (use Frieren wisdom if available; otherwise, repo docs/ADRs/issue tracker)

## Quick decision tree

```
Need recent session context or preferences?
  YES → opencode-mem

Need durable policy/decision that must last beyond memory retention?
  Frieren installed? → frieren_wisdom_write (type: decision/constraint)
  No Frieren? → record in your durable system of record (docs/ADR/issue)

Need tool execution history (commands run, artifacts created)?
  Frieren installed? → episodic memory (frieren_session_recall)
  No Frieren? → not available; rely on session logs
```

## Core API patterns (TypeScript examples)

### Ephemeral memory (always available)

```ts
// Search for relevant past work
memory({ mode: "search", query: "API response caching implementation" });

// Check user preferences
memory({ mode: "profile" });

// List recent memories (debugging/review)
memory({ mode: "list", limit: 20 });

// Add memory manually (rare)
memory({ mode: "add", content: "User prefers minimal-diff fixes" });
```

### Frieren wisdom (optional, requires installation)

```ts
// Write a durable decision
frieren_wisdom_write({
  type: "decision",
  content: "Use JWT for REST API authentication",
  tags: ["auth", "api"],
  confidence: 0.95,
});

// Search durable knowledge
frieren_wisdom_search({ query: "JWT authentication", limit: 5 });

// Search across all Frieren planes
frieren_memory_search({
  query: "auth patterns",
  planes: ["wisdom", "session"],
});
```

### Episodic memory (optional, requires installation)

```ts
// Recall session history
frieren_session_recall({ query: "what files did we modify", limit: 20 });

// Query tool execution history
episodic_memory_query({ mode: "recent", limit: 50 });
```

## Recommended workflow pattern

### Pattern: Task start alignment

1. Search for similar work (opencode-mem; Frieren if available).
2. Read the user profile for preferences.
3. Use the results to shape the approach.
4. If still uncertain: escalate as a blocker.

**How to report (STATUS UPDATE):**

```
STATUS UPDATE:
- COMPLETED: N/A (starting)
- STARTING: <checkpoint>
- PROGRESS: Memory search: <what you found>; Preferences: <what you're following>
- BLOCKERS: None
```

### Pattern: Promotion to durable memory (Frieren only)

When a pattern recurs 3+ sessions, promote from ephemeral to Frieren wisdom:

```
ESCALATION TO COORDINATOR - MEMORY PROMOTION:
- MEMORY: [one-sentence insight]
- CONTEXT: [where observed, how many sessions]
- RECOMMENDATION: [Frieren wisdom type: decision/pattern/constraint/issue]
- RATIONALE: [why this should be permanent]
```

## Context priority (conflict resolution)

If Frieren is installed:

1. **Frieren wisdom entries** — authoritative, permanent
2. **opencode-mem** — recent, contextual
3. **Episodic memory** — tool history, optional

If conflict: **Frieren wins.** Escalate conflict to coordinator.

If Frieren is not installed: opencode-mem is the primary source. Escalate durable conflicts to repo docs/ADRs.

## Retention

| System | Retention | Notes |
| ------ | --------- | ----- |
| opencode-mem | 30 days | Promote valuable insights to Frieren before expiry (if available) |
| Frieren wisdom | Permanent | Requires Frieren installation |
| Episodic memory | Rolling | Requires Frieren installation |

## Common pitfalls

- **Not searching first:** causes duplicated investigation.
- **Treating ephemeral memory as permanent:** it's retention-limited; record durable decisions in Frieren (if available) or repo docs/ADRs.
- **Using memory for policy conflicts:** if memory conflicts with repo protocols/docs, follow the repo and update memory (or add a clarifying note).
- **Assuming Frieren is available:** always check `frieren_status` before calling Frieren tools. Fall back to ephemeral memory + repo docs if not installed.

## Related

- `delegation-protocols` — delegation compliance and coordination
- `checkpoint` — capture session/project state (git diff snapshots)
- `reaper-realm` — background task delegation via Shade (optional, requires Frieren)
