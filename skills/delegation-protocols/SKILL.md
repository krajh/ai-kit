---
name: delegation-protocols
description: Enforce Delegation Protocols v1.4 with acknowledgment, checkpoint-based status updates, sequential work, and immediate escalation/return-control when blocked.
---

# Delegation Protocols Enforcement

Enforce Delegation Protocols v1.4 across all delegations with copy/paste templates and verification checklists.

**When to load:** Before delegating to any agent via `task` tool, or before enqueuing background tasks via `reaper_enqueue`.

---

## MANDATORY PROTOCOLS Block (Copy/Paste)

**INCLUDE VERBATIM IN EVERY DELEGATION:**

```
**MANDATORY PROTOCOLS v1.4:**
- Acknowledge protocols before starting: "Protocols acknowledged, beginning work."
- Report after each sub-task/checkpoint (ALWAYS)
- If no checkpoint: use CONTINUING format after each investigation/tool batch
- Status format: "STATUS UPDATE - COMPLETED: [X], STARTING/CONTINUING: [Y], PROGRESS: [Z if continuing], BLOCKERS: [None or specific]"
- SKILL CHECK on first STATUS UPDATE (F2+ only): "SKILL CHECK: loaded [skill-a] OR none applicable"
- One task at a time; finish before switching
- If blocked after 2 attempts, escalate IMMEDIATELY to coordinator
- Blocker format: "ESCALATION TO COORDINATOR - BLOCKER: [what], CONTEXT: [why], ATTEMPTED: [what tried], NEED: [what needed], EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic], SCOPE IMPACT: [impact]"
- Treat uncertainty/questions/decisions as blockers; present options
- Cross-session escalation: return control using MANDATORY CROSS-SESSION ESCALATION PROCEDURE
- Update todo status immediately upon completion
```

---

## Delegation Template (Copy/Paste Ready)

```
task({
  subagent_type: "[agent-name]",
  description: "[3-5 words]",
  prompt: `
- GOAL: [What needs to be accomplished]
- ACCEPTANCE CRITERIA:
  - [Criterion 1]
  - [Criterion 2]

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

INSTRUCTIONS:
[Your detailed task instructions here]
`
})
```

---

## Fidelity-Based Delegation Templates

**Base template (all fidelity levels):**

```
task({
  subagent_type: "[agent-name]",
  description: "[3-5 words]",
  prompt: `
[TASK]: [What needs to be done]

[PRE-WORK REQUIREMENT — F2/F3 only: see additions below]

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

INSTRUCTIONS:
- [Specific task instructions]
- Report at each checkpoint
`
})
```

**What each fidelity level adds:**

|                    | F1 (Minimal)          | F2 (Standard)                                                                                                                     | F3 (High)                                                                                   |
| ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| When               | Exploratory, low-risk | Medium-Large effort OR Moderate-High complexity                                                                                   | Epic OR Critical OR Architecture-level                                                      |
| PRE-WORK           | None                  | PLAN FOR APPROVAL block (TASK/EFFORT/COMPLEXITY/FIDELITY/APPROACH/GROUNDING/OPTIONS/RECOMMENDATION/VERIFICATION/RISKS/REQUESTING) | F2 + ROLLBACK + FRIEREN CAPTURE PLAN                                                        |
| Extra instructions | None                  | Query `frieren_wisdom_search` before starting                                                                                     | F2 + capture decisions via `frieren_wisdom_write` before implementing + sanity check at 25% |

---

## Pre-flight Checklist (Before Delegating)

Before every delegation:

1. Define one deliverable and acceptance criteria.
2. Specify allowed tools + required checks (e.g. `verify-loop`).
3. If architectural or cross-cutting: require **PLAN FOR APPROVAL**.
4. Decide coordinator vs implementer roles.
5. Establish the next expected checkpoint.
6. **Verify MANDATORY PROTOCOLS v1.4 block is included.**

---

## Post-Delegation Verification Checklist

- [ ] **Protocol included:** MANDATORY PROTOCOLS v1.4 present
- [ ] **Fidelity level set:** F1/F2/F3 appropriate
- [ ] **Acceptance criteria clear**
- [ ] **First checkpoint defined**
- [ ] **Todo created:** owner + status
- [ ] **Update contract set:** material changes + backstop every 3 coordinator turns

```
[OK] Delegation verified:
- Protocol: v1.4 included ✓
- Fidelity: [1/2/3]
- Agent: [name]
- First checkpoint: [what agent will report after]
- Update contract: Material changes + backstop every 3 coordinator turns
```

---

## Agent Escalation Response Templates

### For Blockers

**Agent escalates:**

```
ESCALATION TO COORDINATOR:
- BLOCKER: [description]
- CONTEXT: [what trying to accomplish]
- ATTEMPTED: [what tried]
- NEED: [what needed]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- SCOPE IMPACT: [impact on deliverables]
```

**Coordinator responds:**

```
Acknowledged. [Action taken or routing].
You're unblocked - proceed with [next step].
```

### For Uncertainty/Questions/Decisions

**Agent escalates:**

```
QUESTION FOR COORDINATOR:
- CONTEXT: [what working on]
- QUESTION: [specific question/decision point]
- OPTIONS: [2-3 approaches with trade-offs]
- RECOMMENDATION: [preferred + why]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- SCOPE IMPACT: [what's blocked]
```

**Coordinator responds:**

```
DECISION: [Approved approach or guidance]
RATIONALE: [Why this approach]
CONSTRAINTS: [Any constraints to follow]
NEXT STEPS: [What agent should do]
```

### For Cross-Session Escalation

**Agent returns control:**

```
---
[ALERT] ESCALATION TO COORDINATOR - RETURNING CONTROL
---

AGENT: [Name]
CONTEXT: [What working on - 1 sentence]
ESCALATION TYPE: [Blocker/Uncertainty/Question/Decision/Plan Approval]

QUESTION/BLOCKER:
[Specific decision needed or blocker]

OPTIONS (if applicable):
A) [Option A with pros/cons]
B) [Option B with pros/cons]

RECOMMENDATION: [Preference + rationale]

EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
SCOPE IMPACT:
- What's blocked: [Specific work]
- Dependencies: [Downstream dependencies affected]

WAITING STATE: [What doing while blocked]

---
[PAUSED] Awaiting coordinator's response to continue
---
```

**Coordinator responds:**

```
ESCALATION RESOLVED - [Agent Name]

DECISION: [Approved approach or guidance]
RATIONALE: [Why this approach]
CONSTRAINTS: [Any constraints to follow]
NEXT STEPS: [What agent should do next]

You're unblocked - proceed with [specific action].
```

---

## Monitoring Triggers (Turn-Based)

**After every delegation:**

- Verify protocol compliance immediately

**On material change (agent reports COMPLETED/STARTING/CONTINUING/BLOCKED):**

- Run `status-snapshot` before updating Master
- Synthesize decisions, risks, next moves

**On blocker signal (ESCALATION/BLOCKER:/return-control):**

- Acknowledge within 1 coordinator turn (same or next)
- Run `blocker-tracker` immediately
- Route/resolve within 3 coordinator turns

**Backstop cadence (message-count):**

- `status-snapshot` every 3 coordinator turns during active orchestration
- `blocker-tracker` every 5 coordinator turns during active orchestration

---

## Red Flags (Call Out Immediately)

**Agent violations:**

- [ ] Agent starts complex work without plan approval (F2+)
- [ ] Agent reports vague progress: "Still working on it" (no checkpoint)
- [ ] Agent makes architectural decision without presenting options
- [ ] Agent working Medium+ effort without sanity check at 25%
- [ ] Agent guesses instead of escalating uncertainty
- [ ] Agent missing STATUS UPDATE after checkpoint completion
- [ ] Agent missing SKILL CHECK on first STATUS UPDATE of F2+ tasks

**Coordinator self-check:**

- [ ] Delegated without MANDATORY PROTOCOLS block
- [ ] Missed verification after delegation
- [ ] Missed status-snapshot on material change
- [ ] Missed blocker-tracker acknowledgment within 1 turn
- [ ] Missed backstop cadence (3/5 coordinator turns)

---

## Common Failure Modes & Fixes

| Violation                     | Fix                                                               |
| ----------------------------- | ----------------------------------------------------------------- |
| No acknowledgment             | Remind: "Protocols acknowledged, beginning work."                 |
| Missing SKILL CHECK           | Remind: "Include SKILL CHECK on first STATUS UPDATE"              |
| Vague progress                | Require: files changed, commands run, concrete results            |
| Parallel work                 | Stop: "Complete current task before starting next"                |
| No escalation on uncertainty  | Remind: "Uncertainty = blocker; escalate with options"            |
| Wrong escalation format       | Provide: correct template from this skill                         |
| Vague goal ("make it better") | Rewrite into acceptance criteria + non-goals                      |
| Token bloat                   | Require: "minimal diff, minimal narrative, paths + commands only" |

---

## Background Task Delegation (Shade)

For fire-and-forget tasks that don't need live agent interaction, use `reaper_enqueue` instead of `task()`:

```
reaper_enqueue({
  task: "Fix all TypeScript errors in src/",
  priority: 3,
  timeout_seconds: 600
})
```

**When to use Shade vs live agents:**

| Use Shade (reaper_enqueue)                           | Use live agents (task)                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| Batch operations (lint, test, migrate)               | Interactive work requiring checkpoints         |
| Fire-and-forget tasks with clear acceptance criteria | Work needing plan approval or escalation paths |
| Long-running background jobs                         | Time-sensitive or user-facing work             |
| Independent tasks that don't need coordinator input  | Multi-agent coordination or handoffs           |

**Monitoring:** Use `reaper_status` to check queue state. Shade reports completion via the queue — no STATUS UPDATE protocol needed.

See `reaper-realm` skill for full setup and usage.

---

## Related Skills

- `agent-routing` - Agent selection patterns
- `effort-complexity-framework` - Task assessment (Effort + Complexity)
- `frieren-context-patterns` - When to use Frieren vs memory vs checkpoint
- `handoff-patterns` - 5 handoff types for multi-agent work
- `reaper-realm` - Background task delegation via Shade

---

**Protocol Version:** 1.4  
**Effective Date:** February 4, 2026  
**Skill Version:** 2.0  
**Last Updated:** February 10, 2026

_Note: Consolidated into this skill._
