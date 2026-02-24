---
name: protocol-compliance-v13
description: Enforce Delegation Protocols v1.3 with acknowledgment, checkpoint-based status updates, sequential work, and immediate escalation/return-control when blocked.
---

# Delegation Protocols v1.3 — Compliance Enforcer

**Purpose:** Make protocol compliance automatic: acknowledgement, checkpoint updates, sequential work, and escalation/return-control when blocked.

## When to use

- Any time you're delegated work under Delegation Protocols v1.3.
- Any time you see agents drifting (no checkpoints, unclear scope, silent blockers).
- Any time you're coordinating across sessions and need deterministic escalation.

## Non-negotiables

1. **Acknowledgment first:** "Protocols acknowledged, beginning work."
2. **One task at a time:** no parallel "also fixed X".
3. **Checkpoint updates:** after each discrete unit of work.
4. **Escalate uncertainty immediately:** questions/decisions are blockers.
5. **Cross-session escalation:** use the return-control block when you need a coordinator decision.

## Required STATUS UPDATE format (copy/paste)

```
STATUS UPDATE:
- COMPLETED: [checkpoint done] OR N/A
- STARTING: [next checkpoint] OR CONTINUING: [current checkpoint]
- PROGRESS: [concrete progress: files, functions, commands run]
- BLOCKERS: [None or specific]
```

**First update must include:**

```
SKILL CHECK:
- SKILL CHECK: loaded [x] OR none applicable
```

## Escalation templates

### Blocker / resource

```
ESCALATION TO COORDINATOR:
- BLOCKER: …
- CONTEXT: …
- ATTEMPTED: …
- NEED: …
- IMPACT: …
```

### Uncertainty / decision

```
QUESTION FOR COORDINATOR:
- CONTEXT: …
- QUESTION: …
- OPTIONS:
  A) … (pros/cons)
  B) … (pros/cons)
  C) … (pros/cons)
- RECOMMENDATION: …
- IMPACT: …
```

### Cross-session return-control (mandatory when blocked)

Use exactly:

```
---
[ALERT] ESCALATION TO COORDINATOR - RETURNING CONTROL
---

AGENT: [name]
SESSION: [identifier]
CONTEXT: [1 sentence]
ESCALATION TYPE: [Blocker / Uncertainty / Question / Decision / Plan Approval]

QUESTION/BLOCKER:
...

OPTIONS (if applicable):
A) ...
B) ...
C) ...

RECOMMENDATION: ...

IMPACT:
- Timeline: ...
- Scope: ...

WAITING STATE: ...

---
[PAUSED]  PAUSED - Awaiting coordinator response to continue
---
```

## Self-audit checklist (run before posting "COMPLETED")

- [ ] Did I acknowledge protocols at start?
- [ ] Did I include SKILL CHECK on first update?
- [ ] Are my updates checkpoint-based (not "still working")?
- [ ] Did I avoid scope creep?
- [ ] Did I run required checks (e.g. `verify-loop`) and report results?
- [ ] If uncertain: did I escalate rather than guess?

## Example (good)

- COMPLETED: Added tests under `/tests/foo.test.ts`
- STARTING: Run `verify-loop` type auto
- PROGRESS: `bun test` passes; `bunx tsc --noEmit` passes
- BLOCKERS: None

## Example (bad)

- "Implemented most of it, will polish later."  
  Fix: break into checkpoints, state what's done, and what's next.
