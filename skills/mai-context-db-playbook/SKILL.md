---
name: mai-context-db-playbook
description: Practical patterns for querying and writing durable decisions, constraints, issues, and performance baselines to Mai Context DB.
---

# Mai Context DB — Practical Usage Playbook

**Purpose:** Capture durable decisions, constraints, and recurring patterns so future sessions/agents stop repeating work.

## When to use

- Before a non-trivial architectural decision (providers, retry strategy, schema, stop conditions).
- When you discover a recurring failure mode (tests flaky, tool crashes, CI mismatch).
- When you finish a milestone that others will build on.
- When starting a complex task: query active constraints/decisions first.

## What belongs in Mai (and what doesn't)

**Do store:**

- Decisions (with rationale + alternatives rejected)
- Constraints (hard requirements, non-goals)
- Integration contracts (inputs/outputs, edge cases)
- Issues + resolutions (root cause + fix)
- Performance baselines (latency/cost numbers)

**Don't store:**

- Long ephemeral logs
- Giant diffs
- "We did a bunch of stuff" summaries without action value

## Query patterns (TypeScript examples)

### 1) Pull active decisions/constraints

```ts
await global.mcp?.callTool("mai-context-db", "query_context", {
  table: "decisions",
  filters: { status: "active" },
  limit: 10,
});
```

```ts
await global.mcp?.callTool("mai-context-db", "query_context", {
  table: "constraints",
  filters: { status: "active" },
  limit: 10,
});
```

### 2) Semantic search for "how we usually do X"

```ts
await global.mcp?.callTool("mai-context-db", "semantic_search", {
  query: "how do we structure opencode tool error handling",
  table_filter: "patterns",
  limit: 5,
});
```

### 3) Record a decision (minimal but complete)

```ts
await global.mcp?.callTool("mai-context-db", "create_context_entry", {
  table: "decisions",
  data: {
    title: "Use verify-loop as Definition of Done gate",
    decision_type: "process",
    status: "active",
    rationale:
      "Consistent quality checks across tools/plugins; reduces regressions",
    alternatives_considered: "Manual checklists; ad-hoc commands",
  },
});
```

## Recommended entry templates (copy/paste)

### Decision

- Title:
- Decision type: (architecture/process/integration/security)
- Status: active/superseded
- Rationale:
- Alternatives considered:
- Consequences (good/bad):
- Links/artifacts: (commit/file paths/URLs)

### Issue

- Title:
- Severity:
- Symptoms:
- Root cause:
- Fix:
- Preventive actions:
- Artifacts:

## "Checkpoint to Mai" pattern

When a task outcome must persist across sessions:

1. Create a short Mai decision/issue entry.
2. Include pointers: file paths, tool names, command used.
3. Keep it under ~10 bullets; no big dumps.

## Examples (good)

- "Decision: standardize stop markers for autonomous loops; require `verify-loop` green + explicit marker."

## Examples (bad)

- "We changed a lot of code and it's better now." (no durable value)
