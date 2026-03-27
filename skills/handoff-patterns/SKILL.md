---
name: handoff-patterns
description: Five handoff types to prevent context loss - Sequential (validate before proceed), Parallel (coordinator integrates), Mesh (collaborative investigation), Escalation (immediate with return-control), Verification gate (tests+rollback). Includes handoff manifest template.
---

# Handoff Patterns

Prevent context loss and rework when multiple agents touch the same mission.

**Load when:** coordinating 2+ agents, handing off between phases, planning parallel/sequential workstreams.

---

## The Five Handoff Types

### 1) Sequential (Dependent Phases)

**Use when:** work must happen in strict order (design → implement → review → test → deploy)

```
Agent A completes Phase 1 → Agent B validates A's output → Agent B proceeds
```

- ✓ Next agent validates previous output before proceeding
- ✓ Escalate with findings if validation fails — don't fix silently
- ✓ Include acceptance criteria for each phase
- ❌ Starting without validating prior output
- ❌ Silently "fixing" prior agent's work

---

### 2) Parallel (Independent Workstreams)

**Use when:** tasks are independent and can run concurrently

```
Coordinator → Agent X (Task A) [parallel]
Coordinator → Agent Y (Task B) [parallel]
↓
Coordinator integrates/merges results
```

- ✓ Each agent has clear, independent acceptance criteria
- ✓ One integrator (coordinator) owns merge/synthesis
- ✓ Coordinator monitors for unexpected dependencies
- ❌ No designated integrator
- ❌ Hidden dependencies discovered mid-work

**Alternative:** For batch/background tasks, use `reaper_enqueue` (Shade) — see `reaper-realm` skill.

---

### 3) Mesh (Collaborative Investigation)

**Use when:** multi-domain problem requiring continuous collaboration (e.g., production incidents)

```
Agent A investigates Layer 1 → shares findings
Agent B investigates Layer 2 → shares findings
↓
Coordinator synthesizes into unified diagnosis
```

- ✓ Share intermediate findings early — don't wait for "final answer"
- ✓ Converge on one hypothesis tree — not competing diagnoses
- ✓ Use shared investigation log (Frieren wisdom or checkpoint)
- ❌ Working in silos with conflicting final answers

---

### 4) Escalation (Blockers)

**Use when:** agent cannot proceed due to missing decision/resource/uncertainty

```
Agent blocked → escalates with context → coordinator routes to resolver → agent unblocked
```

- ✓ Escalate immediately — don't guess, don't spin
- ✓ Include: what was tried, options considered
- ✓ Coordinator acknowledges within 1 coordinator turn
- ❌ Spinning multiple turns without escalating

**Escalation format:**

```
ESCALATION TO COORDINATOR:
- BLOCKER: [clear description]
- CONTEXT: [what trying to accomplish]
- ATTEMPTED: [what tried - be specific]
- NEED: [what needed to proceed]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY BLOCKED: [Low/Moderate/High/Critical]
- SCOPE IMPACT: [how this affects deliverables]
```

**Cross-session (MANDATORY):**

```
---
[ALERT] ESCALATION TO COORDINATOR - RETURNING CONTROL
---

AGENT: [Name]
CONTEXT: [Working on - 1 sentence]
ESCALATION TYPE: [Blocker / Uncertainty / Question / Decision]

QUESTION/BLOCKER:
[Specific decision needed or blocker]

OPTIONS (if applicable):
A) [Option A with pros/cons]
B) [Option B with pros/cons]

RECOMMENDATION: [Preference with rationale]

EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
SCOPE IMPACT:
- What's blocked: [Specific work]
- Dependencies: [Downstream affected]

WAITING STATE: [What doing while blocked]

---
[PAUSED] PAUSED - Awaiting coordinator's response to continue
---
```

---

### 5) Verification Gate (Quality Checkpoint)

**Use when:** before declaring anything "done"

```
Implementation → verification checks → pass/fail
↓ (pass) → mark complete
↓ (fail) → fix → re-verify
```

**Checklist:**

```
Tools/Plugins:
- [ ] bun fmt · bunx tsc --noEmit · bun test · manual run · status tags correct

Features:
- [ ] Tests written and passing · integration tested · edge cases covered
- [ ] Error handling validated · rollback plan documented (Fidelity 3)

Docs:
- [ ] No forbidden patterns (*SUMMARY.md, *IMPLEMENTATION*.md)
- [ ] Formatting consistent · examples tested · links valid
```

- ❌ Work marked "done" without running tests
- ❌ Risky change with no rollback plan

---

## Handoff Manifest Template (Copy/Paste Ready)

```
HANDOFF
- GOAL: [What this work achieves - 1 sentence]
- CURRENT STATE: [What's been completed]
- DECISIONS: [Key decisions made, alternatives considered]
- FILES TOUCHED: [List of modified/created files]
- RISKS: [Known issues, edge cases, debt introduced]
- NEXT STEPS: [What the next agent should do]
- HOW TO VERIFY: [Test commands, acceptance criteria]
- ROLLBACK (if applicable): [How to undo if needed]
```

---

## Handoff Selection Guide

| Scenario                                | Handoff Type                 |
| --------------------------------------- | ---------------------------- |
| Research → Design → Implement           | Sequential                   |
| Build FE + Build BE simultaneously      | Parallel                     |
| Batch/background tasks                  | **Shade** (`reaper_enqueue`) |
| Debug production incident across layers | Mesh                         |
| Agent blocked on credentials            | Escalation                   |
| Merge PR after review                   | Verification gate            |

---

## Common Mistakes

| Mistake                                               | Correct Approach                                            |
| ----------------------------------------------------- | ----------------------------------------------------------- |
| Agent B silently refactors Agent A's work             | Escalate: "Agent A's approach has issue X, propose Y"       |
| Agent B starts implementing without validating design | Validate design, escalate gaps before starting              |
| No handoff manifest — Agent B guesses intent          | Create manifest with decisions + risks                      |
| Agents discover shared dependency mid-work            | Coordinator identifies dependencies upfront, sequences work |

---

## Integration with Delegation Protocols

1. Choose handoff type before delegating
2. Define acceptance criteria for each phase
3. Assign integrator/synthesizer (parallel/mesh)
4. Include Handoff Manifest in delegation
5. After completion: update Frieren wisdom with decisions (`frieren_wisdom_write`)

**Mandatory:** All handoffs follow **Delegation Protocols v1.4**

---

**Related:** `agent-routing` · `effort-complexity-framework` · `reaper-realm`
