---
name: delegation-orchestration
description: Coordinate multi-agent work with tight visibility, low token burn, and fast blocker resolution using Delegation Protocols v1.3 and monitoring tools.
---

# Delegation & Orchestration (Rias Playbook)

**Purpose:** Coordinate multi-agent work with tight visibility, low token burn, and fast blocker resolution, using Delegation Protocols v1.3 and the repo's monitoring tools.

## When to use

- You're Rias coordinating 2+ agents, or orchestrating across sessions.
- You need turn-based status guarantees (not wall-clock).
- You need clean handoffs, minimal thrash, and quick escalation routing.

## Core principles

- **One owner per task.** Avoid "everyone touches everything".
- **Checkpoint-driven reporting.** Every meaningful unit of progress produces a STATUS UPDATE.
- **Uncertainty = blocker.** Don't let agents "guess-build" for an hour.
- **Backstop monitoring.** Use `status-snapshot` and `blocker-tracker` on schedule and on signals.
- **Cost discipline.** Keep prompts narrow; avoid broad "improve everything" asks.

## Pre-flight checklist (before delegating)

1. Define _one_ deliverable and acceptance criteria.
2. Specify allowed tools + required checks (e.g. `verify-loop`).
3. If task is architectural or cross-cutting: require **PLAN FOR APPROVAL**.
4. Decide who is coordinator (Rias) vs implementer (agent).
5. Establish the next checkpoint you expect (agent-defined is OK).

## Delegation template (copy/paste)

Use this verbatim structure (edit the bracketed fields):

**DELEGATION (Protocols v1.3):**

- TASK: `[roadmap id if any] — concise goal`
- SCOPE: `In scope: … / Out of scope: …`
- ACCEPTANCE CRITERIA:
  - [ ] `…`
  - [ ] `Tests/verify-loop: …`
- CONSTRAINTS:
  - `No broad refactors`
  - `No commits unless asked`
  - `Follow repo code style (2 spaces, double quotes, no semicolons)`
- REQUIRED UPDATES:
  - `Initial acknowledgment + SKILL CHECK`
  - `STATUS UPDATE after each checkpoint`
  - `Escalate uncertainty immediately`

## Monitoring patterns (Rias-only)

- On any material change → run `status-snapshot` before updating Master.
- On any escalation/blocker → run `blocker-tracker` same turn (or next).
- Backstop cadence:
  - `status-snapshot` every **3 coordinator turns**
  - `blocker-tracker` every **5 coordinator turns**

## Handoff pattern (clean, low-noise)

- Implementer finishes checkpoint → posts STATUS UPDATE + exact commands run + file paths changed.
- Rias responds with: "Proceed / adjust / stop" and sets next checkpoint.

## Example: Coordinating a tool addition

**You delegate to `marin-coder`:**

- "Implement `.opencode/tool/foo.ts` + tests under `/tests` + ensure `bun fmt`, `bunx tsc --noEmit`, `bun test` pass. Don't touch unrelated tools."

**Agent checkpoint sequence:**

1. scaffolding done → STATUS UPDATE
2. main logic done → STATUS UPDATE
3. tests added → STATUS UPDATE
4. verify-loop pass → STATUS UPDATE (COMPLETED)

## Common failure modes (and fixes)

- **Vague goal** ("make it better") → rewrite into acceptance criteria + non-goals.
- **Agent parallelizes** → force sequential checkpoints; stop and re-scope.
- **No escalation on uncertainty** → remind "uncertainty=blocker"; require options + recommendation.
- **Token bloat** → require "minimal diff, minimal narrative, show paths + commands only".
