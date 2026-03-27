---
name: effort-complexity-framework
description: Standardized task assessment using Effort (Trivial/Small/Medium/Large/Epic) + Complexity (Low/Moderate/High/Critical). Includes fidelity matrix (F1/F2/F3), plan brief template, and assessment heuristics. Replaces time estimates.
---

# Effort & Complexity Framework

Replace time estimates with effort levels and complexity ratings for predictable planning and appropriate review gates.

**Load when:** assessing task scope, creating PLAN FOR APPROVAL briefs, determining fidelity level (F1/F2/F3), or escalating with effort/complexity assessment.

---

## The Framework

### Effort Levels (Scope & Size)

| Level       | Definition                                 | Lines of Code | Files | Investigation |
| ----------- | ------------------------------------------ | ------------- | ----- | ------------- |
| **Trivial** | Single-file, well-understood pattern       | <10           | 1     | None          |
| **Small**   | Single component, clear scope              | <50           | 1-2   | Minimal       |
| **Medium**  | Multi-file, some investigation needed      | <200          | 2-5   | Moderate      |
| **Large**   | Cross-component, significant investigation | 200-1000      | 5-15  | Significant   |
| **Epic**    | Architecture-level, multi-agent            | >1000         | 15+   | Extensive     |

### Complexity Ratings (Risk & Novelty)

| Rating       | Definition                                  | Risk     | Review                   |
| ------------ | ------------------------------------------- | -------- | ------------------------ |
| **Low**      | Straightforward, copy-paste patterns        | Minimal  | Self-review OK           |
| **Moderate** | Some design decisions, established patterns | Standard | Peer review              |
| **High**     | Novel approach, multiple valid solutions    | Elevated | Architecture review      |
| **Critical** | Security/performance/data-loss risk         | Severe   | Formal review + rollback |

### Fidelity Level Matrix

| Effort → Complexity ↓ | Trivial | Small | Medium | Large | Epic |
| --------------------- | ------- | ----- | ------ | ----- | ---- |
| **Low**               | F1      | F1    | F2     | F2    | F3   |
| **Moderate**          | F1      | F2    | F2     | F2    | F3   |
| **High**              | F2      | F2    | F2     | F3    | F3   |
| **Critical**          | F2      | F2    | F3     | F3    | F3   |

- **F1** (Minimal): No plan approval required
- **F2** (Standard): Plan approval + grounding + options + verification
- **F3** (High): F2 + comprehensive grounding + Frieren decision capture + rollback plan

---

## Assessment Heuristics

**Effort — ask:**

1. How many files will I touch?
2. Rough lines of code?
3. How much investigation before coding?
4. Does this cross component boundaries?
5. Does this require multi-agent coordination?

**Complexity — ask:**

1. Is the approach well-established in this codebase?
2. How many valid solutions exist?
3. What's the blast radius if this breaks?
4. Does this touch security/performance/data critical paths?

**Examples by effort:**

- Trivial: fix typo, update single config value
- Small: add validation to one endpoint, new utility function
- Medium: new API endpoint with tests, add feature flag system
- Large: design new service, migrate DB schema
- Epic: redesign system architecture, major framework migration

**Examples by complexity:**

- Low: CRUD endpoint following existing pattern
- Moderate: choosing between JWT and session auth, designing API contract
- High: novel state management, custom auth flow
- Critical: changing encryption algorithm, redesigning authorization model, payment processing

---

## Common Assessment Mistakes

- **Underestimating effort:** "It's just one file" — but touches 20 imports. Fix: count affected files, not just changed files.
- **Underestimating complexity:** "Standard CRUD" — but involves PII. Fix: assess risk and novelty separately from effort.
- **Conflating effort and complexity:** Large+Low (DB migration from script) and Trivial+Critical (changing single crypto constant) are both valid. Assess independently.
- **Ignoring risk factors:** always ask "What if this breaks?" and consider rollback difficulty.

---

## Plan Brief Template (Copy/Paste Ready)

```
PLAN FOR APPROVAL:
- TASK: [What you're implementing - 1 sentence]
- EFFORT: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY: [Low/Moderate/High/Critical]
- FIDELITY: [1/2/3]
- APPROACH: [High-level approach in 3-5 bullet points]
- GROUNDING: [Repo patterns found / dependencies checked]
- OPTIONS:
  A) [Option A - pros/cons]
  B) [Option B - pros/cons]
  C) [Option C - pros/cons]
- RECOMMENDATION: [Your preferred approach and why]
- VERIFICATION: [How you'll validate - test plan, acceptance criteria]
- ROLLBACK (Fidelity 3 only): [How to roll back if needed]
- RISKS: [Potential issues and mitigation]
- REQUESTING: Approval to proceed OR feedback on approach
```

---

## Escalation Format

```
ESCALATION TO COORDINATOR:
- BLOCKER: [clear description]
- CONTEXT: [what you were trying to accomplish]
- ATTEMPTED: [what you've already tried]
- NEED: [what you need to proceed]
- EFFORT BLOCKED: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY BLOCKED: [Low/Moderate/High/Critical]
- SCOPE IMPACT: [how this affects deliverables]
```

---

## Key Rules

- Fidelity 2+ work **requires plan approval** before starting
- Fidelity 2+ work requires **sanity check at 25% completion**
- All escalations must include effort/complexity assessment
- Never report time estimates (agents are stateless)

---

**Related:** `delegation-protocols` skill · `agent-routing` skill · `handoff-patterns` skill
