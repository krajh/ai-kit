---
name: delegation-protocols
description: Enforce Delegation Protocols v1.4 with acknowledgment, checkpoint-based status updates, sequential work, and immediate escalation/return-control when blocked.
---

# Delegation Protocols Enforcement

Enforce Delegation Protocols v1.4 across all delegations with copy/paste templates and verification checklists.

**When to load:** Before delegating to any agent via `task` tool.

---

## MANDATORY PROTOCOLS Block (Copy/Paste)

**INCLUDE VERBATIM IN EVERY DELEGATION:**

```
**MANDATORY PROTOCOLS v1.4:**
- Acknowledge protocols before starting: "Protocols acknowledged, beginning work."
- Report after each sub-task/checkpoint (ALWAYS)
- If no checkpoint: use CONTINUING format after each investigation/tool batch
- Status format: "STATUS UPDATE - COMPLETED: [X], STARTING/CONTINUING: [Y], PROGRESS: [Z if continuing], BLOCKERS: [None or specific]"
- SKILL CHECK on first STATUS UPDATE: "SKILL CHECK: loaded [skill-a] OR none applicable"
- One task at a time; finish before switching
- If blocked after 2 attempts, escalate IMMEDIATELY to Rias
- Blocker format: "ESCALATION TO RIAS - BLOCKER: [what], CONTEXT: [why], ATTEMPTED: [what tried], NEED: [what needed], EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic], SCOPE IMPACT: [impact]"
- Treat uncertainty/questions/decisions as blockers; present options
- Cross-session escalation: return control using MANDATORY CROSS-SESSION ESCALATION PROCEDURE
- Update todo status immediately upon completion
```

---

## Delegation Template (Copy/Paste Ready)

Use this when delegating via `task` tool:

```
task({
  subagent_type: "[agent-name]",
  description: "[Short description 3-5 words]",
  prompt: `
[TASK CONTEXT]
- GOAL: [What needs to be accomplished]
- BACKGROUND: [Why this matters / context]
- ACCEPTANCE CRITERIA:
  - [Criterion 1]
  - [Criterion 2]
  - [Criterion 3]

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

[SPECIFIC INSTRUCTIONS]
[Your detailed task instructions here]
`
})
```

---

## Fidelity-Based Delegation Templates

### Fidelity 1 (Minimal) - Exploratory, low-risk

```
task({
  subagent_type: "[agent-name]",
  description: "[3-5 words]",
  prompt: `
[TASK]: [Simple, well-understood task]

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

INSTRUCTIONS:
- [Step 1]
- [Step 2]
- Report completion when done
`
})
```

### Fidelity 2 (Standard) - Medium-Large effort OR Moderate-High complexity

```
task({
  subagent_type: "[agent-name]",
  description: "[3-5 words]",
  prompt: `
[TASK]: [Feature/integration work requiring plan approval]

**PRE-WORK REQUIREMENT:**
Submit PLAN FOR APPROVAL before implementation:
- TASK: [What implementing - 1 sentence]
- EFFORT: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY: [Low/Moderate/High/Critical]
- FIDELITY: 2
- APPROACH: [High-level approach - 3-5 bullets]
- GROUNDING: [Repo patterns / dependencies checked]
- OPTIONS:
  A) [Option A - pros/cons]
  B) [Option B - pros/cons]
  C) [Option C - pros/cons]
- RECOMMENDATION: [Preferred + why]
- VERIFICATION: [How validate - test plan]
- RISKS: [Potential issues + mitigation]
- REQUESTING: Approval to proceed OR feedback

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

INSTRUCTIONS:
- Query Mai Context DB for relevant decisions/constraints
- [Specific task instructions]
- Report at each checkpoint
`
})
```

### Fidelity 3 (High) - Epic effort OR Critical complexity OR Architecture-level impact

```
task({
  subagent_type: "[agent-name]",
  description: "[3-5 words]",
  prompt: `
[TASK]: [System redesign / major architectural change]

**PRE-WORK REQUIREMENT:**
Submit PLAN FOR APPROVAL before implementation:
- TASK: [What implementing - 1 sentence]
- EFFORT: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY: [Low/Moderate/High/Critical]
- FIDELITY: 3
- APPROACH: [High-level approach - 3-5 bullets]
- GROUNDING: [Comprehensive repo analysis + dependency audit + stakeholder review]
- OPTIONS:
  A) [Option A - detailed pros/cons + impact]
  B) [Option B - detailed pros/cons + impact]
  C) [Option C - detailed pros/cons + impact]
- RECOMMENDATION: [Preferred + detailed rationale]
- VERIFICATION: [Test plan + rollback strategy]
- ROLLBACK: [How to roll back if needed]
- RISKS: [Potential issues + detailed mitigation]
- MAI CAPTURE PLAN: [What decisions/constraints to record]
- REQUESTING: Approval to proceed OR feedback

**MANDATORY PROTOCOLS v1.4:**
[...include full block...]

**CRITICAL REQUIREMENTS:**
- Query Mai Context DB for all relevant decisions/constraints/patterns
- Capture architecture-level decisions in Mai BEFORE implementing
- Report at each checkpoint
- Sanity check at 25% completion
`
})
```

---

## Pre-flight Checklist (Before Delegating)

**BEFORE EVERY DELEGATION, RIAS MUST:**

1. Define _one_ deliverable and acceptance criteria.
2. Specify allowed tools + required checks (e.g. `verify-loop`).
3. If task is architectural or cross-cutting: require **PLAN FOR APPROVAL**.
4. Decide who is coordinator (Rias) vs implementer (agent).
5. Establish the next checkpoint you expect (agent-defined is OK).
6. **Verify delegation includes MANDATORY PROTOCOLS v1.4 block** (see above).

---

## Post-Delegation Verification Checklist

**AFTER EVERY DELEGATION, RIAS MUST:**

- [ ] **Protocol included:** MANDATORY PROTOCOLS v1.4 present
- [ ] **Fidelity level set:** F1/F2/F3 appropriate
- [ ] **Acceptance criteria clear:** Agent knows what "done" means
- [ ] **First checkpoint defined**
- [ ] **Todo created:** owner + status
- [ ] **Update contract set:** material changes + backstop every 3 coordinator turns

**Format for verification note:**

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

**Agent escalates with:**

```
ESCALATION TO RIAS:
- BLOCKER: [description]
- CONTEXT: [what trying to accomplish]
- ATTEMPTED: [what tried]
- NEED: [what needed]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- SCOPE IMPACT: [impact on deliverables]
```

**Rias responds with:**

```
Acknowledged, [Agent]. [Action taken or routing].
[Specific guidance or resource provided]
You're unblocked - proceed with [next step].
```

### For Uncertainty/Questions/Decisions

**Agent escalates with:**

```
QUESTION FOR RIAS/MASTER:
- CONTEXT: [what working on]
- QUESTION: [specific question/decision point]
- OPTIONS: [2-3 approaches with trade-offs]
- RECOMMENDATION: [preferred + why]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- SCOPE IMPACT: [what's blocked]
```

**Rias responds with:**

```
DECISION: [Approved approach or guidance]
RATIONALE: [Why this approach]
CONSTRAINTS: [Any constraints to follow]
NEXT STEPS: [What agent should do]

You're clear - proceed with [specific action].
```

### For Cross-Session Escalation

**Agent returns control with:**

```
---
[ALERT] ESCALATION TO RIAS - RETURNING CONTROL
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
[PAUSED] Awaiting Rias's response to continue
---
```

**Rias responds in agent's session with:**

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
- [ ] Agent missing SKILL CHECK on first STATUS UPDATE

**Rias self-check:**

- [ ] Delegated without MANDATORY PROTOCOLS block
- [ ] Missed verification after delegation
- [ ] Missed status-snapshot on material change
- [ ] Missed blocker-tracker acknowledgment within 1 turn
- [ ] Missed backstop cadence (3/5 coordinator turns)

---

## Corrective Actions

**First instance:**

```
[Agent], remember protocols: [specific violation]. Use this format: [template].
```

**Repeated:**

```
[Agent], you're not following [protocol]. Stop and [corrective action] now.
```

**Persistent:**

```
Escalating to Master Kai: Agent [X] repeatedly failing to [protocol]. Recommend review.
```

---

## Quick Reference Card

| Situation                | Agent Action             | Rias Action                                  |
| ------------------------ | ------------------------ | -------------------------------------------- |
| Starting work            | Acknowledge protocols    | Verify compliance                            |
| Checkpoint complete      | STATUS UPDATE            | Monitor (status-snapshot if material change) |
| No checkpoint yet        | CONTINUING format        | Track progress                               |
| Stuck after 2 attempts   | ESCALATE blocker         | Acknowledge within 1 turn, resolve within 3  |
| Uncertain about approach | ESCALATE with options    | Provide decision + rationale                 |
| Complex task (F2+)       | Submit PLAN FOR APPROVAL | Review + approve/feedback                    |
| 25% into Medium+ task    | Request sanity check     | Confirm direction                            |
| Cross-session blocker    | Return control           | Respond in agent's session                   |
| Work complete            | Update todo, report      | Verify Definition of Done                    |

---

## Common Protocol Violations & Fixes

| Violation                    | Fix                                                    |
| ---------------------------- | ------------------------------------------------------ |
| No acknowledgment            | Remind: "Protocols acknowledged, beginning work."      |
| Missing SKILL CHECK          | Remind: "Include SKILL CHECK on first STATUS UPDATE"   |
| Vague progress               | Require: files changed, commands run, concrete results |
| Parallel work                | Stop: "Complete current task before starting next"     |
| No escalation on uncertainty | Remind: "Uncertainty = blocker; escalate with options" |
| Wrong escalation format      | Provide: correct template from this skill              |

---

## Handoff Pattern (Clean, Low-Noise)

- Implementer finishes checkpoint → posts STATUS UPDATE + exact commands run + file paths changed.
- Rias responds with: "Proceed / adjust / stop" and sets next checkpoint.

---

## Common Failure Modes & Fixes

- **Vague goal** ("make it better") → rewrite into acceptance criteria + non-goals.
- **Agent parallelizes** → force sequential checkpoints; stop and re-scope.
- **No escalation on uncertainty** → remind "uncertainty=blocker"; require options + recommendation.
- **Token bloat** → require "minimal diff, minimal narrative, show paths + commands only".
- **Missing protocol compliance** → use verification checklist; re-delegate if major violations.

---

## Related Skills

- `peerage-assemble` - Agent selection patterns
- `effort-complexity-framework` - Task assessment (Effort + Complexity)
- `mai-context-patterns` - When to use Mai DB vs memory vs checkpoint
- `handoff-patterns` - 5 handoff types for multi-agent work
- `protocols/DELEGATION_PROTOCOLS.md` - Canonical protocol document

---

**Protocol Version:** 1.4  
**Effective Date:** February 4, 2026  
**Skill Version:** 2.0  
**Last Updated:** February 10, 2026

_Note: Consolidated with delegation-orchestration skill (deleted)._
