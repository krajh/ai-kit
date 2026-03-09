---
name: handoff-patterns
description: Five handoff types to prevent context loss - Sequential (validate before proceed), Parallel (coordinator integrates), Mesh (collaborative investigation), Escalation (immediate with return-control), Verification gate (tests+rollback). Includes handoff manifest template.
---

# Handoff Patterns

**Purpose:** Prevent context loss and rework when multiple agents touch the same mission.

**Created:** February 10, 2026  
**Version:** 1.0  
**Authority:** Delegation Protocols v1.4, Handoff Protocols

---

## When to Load This Skill

**Load when:**

- Coordinating work across 2+ agents
- Handing off work between phases (research → design → implement)
- Need to structure multi-agent collaboration
- Planning parallel or sequential workstreams

**Auto-loaded for:**

- Coordinator when orchestrating multi-agent work
- Agents participating in multi-phase workflows

---

## The Five Handoff Types

### 1) Sequential Handoff (Dependent Phases)

**Use when:** Work must happen in strict order (design → implement → review → test → deploy)

**Pattern:**

```
Agent A completes Phase 1 → Agent B validates A's output → Agent B proceeds with Phase 2
```

**Rules:**

- ✓ Next agent **validates previous output** before proceeding
- ✓ If validation fails, **escalate with concrete findings** (don't guess/fix silently)
- ✓ Include **acceptance criteria** for each phase
- ✓ Use **Handoff Manifest** (see below)

**Example:**

```
Strategist: Designs API contracts
↓ (handoff with API spec)
Implementer: Validates spec, implements endpoints
↓ (handoff with implementation)
Reviewer: Reviews code quality + test coverage
↓ (handoff with approval)
Strategist: Deploys to staging
```

**Red Flags:**

- ❌ Agent B starts without validating Agent A's output
- ❌ Agent B silently "fixes" Agent A's work without escalating
- ❌ No clear acceptance criteria between phases

---

### 2) Parallel Handoff (Independent Workstreams)

**Use when:** Tasks are independent and can run concurrently

**Pattern:**

```
Coordinator delegates Task A → Agent X (parallel)
Coordinator delegates Task B → Agent Y (parallel)
↓
Coordinator integrates/merges results
```

**Rules:**

- ✓ Each agent has **clear, independent acceptance criteria**
- ✓ One integrator (usually coordinator) owns **merge/synthesis**
- ✓ Agents report progress independently to coordinator
- ✓ Coordinator monitors for **unexpected dependencies** and routes

**Example:**

```
Implementer: Build frontend components (parallel)
Implementer: Build backend API (parallel)
↓
Coordinator: Integrate FE+BE (merge phase)
```

**Red Flags:**

- ❌ Agents discover hidden dependencies mid-work
- ❌ No designated integrator
- ❌ Merge conflicts discovered too late

---

### 3) Mesh Handoff (Collaborative Investigation)

**Use when:** Multi-domain problem requiring continuous collaboration (e.g., production mystery bugs, cross-cutting concerns)

**Pattern:**

```
Agent A investigates Layer 1 → shares findings
Agent B investigates Layer 2 → shares findings
Agent C investigates Layer 3 → shares findings
↓
Agents converge on unified hypothesis tree
```

**Rules:**

- ✓ Agents share **intermediate findings early** (don't wait for "final answer")
- ✓ Converge on **one hypothesis tree** (don't produce competing "final answers")
- ✓ Coordinator synthesizes findings into unified diagnosis
- ✓ Use **shared investigation log** (Frieren wisdom plane or checkpoint)

**Example:**

```
Implementer: Investigates application logs → "DB queries timing out"
Implementer: Profiles query performance → "Queries are fast in isolation"
Strategist: Checks infra metrics → "DB connection pool exhausted"
↓
Coordinator: Synthesizes → "Root cause: connection pool leak under load"
```

**Red Flags:**

- ❌ Agents work in silos, produce conflicting diagnoses
- ❌ No shared investigation log
- ❌ Multiple "final answers" instead of unified conclusion

---

### 4) Escalation Handoff (Blockers)

**Use when:** Agent cannot proceed due to missing decision/resource/uncertainty

**Pattern:**

```
Agent encounters blocker → escalates to coordinator with context
↓
Coordinator routes to appropriate resolver (user, specialist, or resource provider)
↓
Resolver provides decision/resource → Agent unblocked
```

**Rules:**

- ✓ Escalate **immediately** (don't guess, don't spin)
- ✓ Include: **context, what was tried, options considered**
- ✓ Use **return-control block** for cross-session escalations
- ✓ Coordinator acknowledges within 1 coordinator turn

**Escalation Format:**

```
ESCALATION TO COORDINATOR:
- BLOCKER: [clear description]
- CONTEXT: [what you were trying to accomplish]
- ATTEMPTED: [what you've already tried - be specific]
- NEED: [what you need to proceed]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY BLOCKED: [Low/Moderate/High/Critical]
- SCOPE IMPACT: [how this affects deliverables]
```

**Cross-Session Escalation (MANDATORY):**

```
---
[ALERT] ESCALATION TO COORDINATOR - RETURNING CONTROL
---

AGENT: [Your name]
CONTEXT: [What you're working on - 1 sentence]
ESCALATION TYPE: [Blocker / Uncertainty / Question / Decision]

QUESTION/BLOCKER:
[Specific decision needed or blocker description]

OPTIONS (if applicable):
A) [Option A with pros/cons]
B) [Option B with pros/cons]
C) [Option C with pros/cons]

RECOMMENDATION: [Your preference with rationale]

EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
SCOPE IMPACT:
- What's blocked: [Specific work that cannot proceed]
- Dependencies: [Any downstream dependencies affected]

WAITING STATE: [What you're doing while blocked]

---
[PAUSED] PAUSED - Awaiting coordinator's response to continue
---
```

**Red Flags:**

- ❌ Agent spins for multiple turns without escalating
- ❌ Escalation missing context or attempted solutions
- ❌ Agent makes guess instead of asking for decision

---

### 5) Verification Gate (Quality Checkpoint)

**Use when:** Before declaring anything "done"

**Pattern:**

```
Agent completes implementation → runs verification checks → gates pass/fail
↓ (if pass)
Work marked complete
↓ (if fail)
Fix issues → re-verify
```

**Rules:**

- ✓ Run **relevant tests/checks** (lint, typecheck, tests, manual validation)
- ✓ Ensure **rollback plan exists** for risky changes
- ✓ Use **verify-loop tool** for automated checks
- ✓ For Fidelity 3 work: **formal review required** (designated reviewer + domain expert)

**Verification Checklist:**

```
For Tools/Plugins:
- [ ] bun fmt (formatting)
- [ ] bunx tsc --noEmit (typecheck)
- [ ] bun test (tests pass)
- [ ] Manual run (smoke test)
- [ ] Status tags correct ([OK]/[!]/[X])

For Features:
- [ ] Tests written and passing
- [ ] Integration tested
- [ ] Edge cases covered
- [ ] Error handling validated
- [ ] Rollback plan documented (Fidelity 3)

For Docs:
- [ ] No forbidden patterns (*SUMMARY.md, *IMPLEMENTATION*.md)
- [ ] Formatting consistent
- [ ] Examples tested
- [ ] Links valid
```

**Red Flags:**

- ❌ Work marked "done" without running tests
- ❌ Risky change with no rollback plan
- ❌ Verification failures ignored

---

## Minimal Handoff Manifest (Copy/Paste Ready)

Use this template when handing off work:

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

**Example:**

```
HANDOFF
- GOAL: Implement JWT authentication for API
- CURRENT STATE: JWT generation/validation implemented, middleware added
- DECISIONS:
  - Used RS256 (not HS256) for better key rotation
  - 1-hour access token, 7-day refresh token
  - Rejected OAuth2 (overkill for internal API)
- FILES TOUCHED:
  - src/auth/jwt.ts (new)
  - src/middleware/auth.ts (modified)
  - tests/auth/*.test.ts (new)
- RISKS:
  - Token rotation not yet implemented (planned for next phase)
  - No rate limiting on refresh endpoint (security debt)
- NEXT STEPS:
  - Add token rotation logic
  - Implement rate limiting
  - Deploy to staging for integration testing
- HOW TO VERIFY:
  - bun test tests/auth/
  - curl -X POST /auth/login (should return JWT)
  - curl -H "Authorization: Bearer <token>" /protected (should succeed)
- ROLLBACK: Revert commits abc123..def456, restart API service
```

---

## Handoff Selection Guide

| Scenario                                | Handoff Type | Rationale                                |
| --------------------------------------- | ------------ | ---------------------------------------- |
| Research → Design → Implement           | Sequential   | Phases depend on prior output            |
| Build FE + Build BE simultaneously      | Parallel     | Independent until integration            |
| Debug production incident across layers | Mesh         | Multi-domain collaboration needed        |
| Agent blocked on credentials            | Escalation   | Cannot proceed without external resource |
| Merge PR after review                   | Verification | Quality gate before "done"               |

---

## Integration with Delegation Protocols

**Before delegating:**

1. Choose handoff type (sequential/parallel/mesh/escalation/verification)
2. Define acceptance criteria for each phase
3. Assign integrator/synthesizer (for parallel/mesh)
4. Include Handoff Manifest template in delegation

**During execution:**

- Agents report checkpoints using STATUS UPDATE format
- Coordinator monitors for handoff boundaries
- Escalations use mandatory return-control block

**After completion:**

- Verification gate runs before marking "done"
- Handoff Manifest created if work continues next session
- Frieren wisdom plane updated with decisions/contracts (`frieren_wisdom_write`)

**Mandatory:** All handoffs follow **Delegation Protocols v1.4**

---

## Common Handoff Mistakes

### ❌ **Silent "Fixing" Previous Work**

- **Bad:** Agent B silently refactors Agent A's approach without asking
- **Good:** Agent B escalates: "Agent A's approach has issue X, propose alternative Y"
- **Why:** Preserves accountability, prevents rework

### ❌ **No Validation Between Phases**

- **Bad:** Agent B starts implementing without validating Agent A's design
- **Good:** Agent B validates design, escalates gaps before starting
- **Why:** Catches misalignment early

### ❌ **Missing Handoff Manifest**

- **Bad:** Agent A completes, no documentation, Agent B guesses intent
- **Good:** Agent A creates Handoff Manifest with decisions + risks
- **Why:** Prevents context loss across sessions

### ❌ **Parallel Work with Hidden Dependencies**

- **Bad:** Agents discover shared dependency mid-work, block each other
- **Good:** Coordinator identifies dependencies upfront, sequences work appropriately
- **Why:** Avoids thrashing and rework

---

## Related Skills

- `agent-routing` - Choosing which agents participate in handoff
- `effort-complexity-framework` - Assessing handoff complexity
- `frieren-context-patterns` - When to capture handoff state in Frieren

**Related Protocols:**

- `DELEGATION_PROTOCOLS.md` - STATUS UPDATE and escalation formats
- `HANDOFF_PROTOCOLS.md` - Original source (being replaced by this skill)
- `FRIEREN_CONTEXT_PATTERNS.md` - Handoff Pack pattern

---

**Last Updated:** February 10, 2026  
**Next Review:** April 2026
