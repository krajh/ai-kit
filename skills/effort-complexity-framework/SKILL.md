---
name: effort-complexity-framework
description: Standardized task assessment using Effort (Trivial/Small/Medium/Large/Epic) + Complexity (Low/Moderate/High/Critical). Includes fidelity matrix (F1/F2/F3), plan brief template, and assessment heuristics. Replaces time estimates.
---

# Effort & Complexity Framework

**Purpose:** Standardized task assessment framework to replace time estimates with effort levels and complexity ratings.

**Created:** February 10, 2026  
**Version:** 1.0  
**Authority:** User, Delegation Protocols v1.4

---

## When to Load This Skill

**Load when:**

- Assessing task scope before planning
- Creating PLAN FOR APPROVAL briefs
- Determining fidelity level (1/2/3)
- Escalating with effort/complexity assessment

**Auto-loaded for:**

- Coordinator when coordinating delegation
- Agents receiving Fidelity 2+ delegation

---

## The Framework

### Effort Levels (Scope & Size)

| Level       | Definition                                 | Lines of Code | Files | Investigation |
| ----------- | ------------------------------------------ | ------------- | ----- | ------------- |
| **Trivial** | Single-file, well-understood pattern       | <10           | 1     | None needed   |
| **Small**   | Single component, clear scope              | <50           | 1-2   | Minimal       |
| **Medium**  | Multi-file, some investigation needed      | <200          | 2-5   | Moderate      |
| **Large**   | Cross-component, significant investigation | 200-1000      | 5-15  | Significant   |
| **Epic**    | Architecture-level, multi-agent            | >1000         | 15+   | Extensive     |

### Complexity Ratings (Risk & Novelty)

| Rating       | Definition                                  | Risk Level | Pattern Availability | Review Needs                  |
| ------------ | ------------------------------------------- | ---------- | -------------------- | ----------------------------- |
| **Low**      | Straightforward, copy-paste patterns        | Minimal    | Well-established     | Self-review OK                |
| **Moderate** | Some design decisions, established patterns | Standard   | Documented           | Peer review                   |
| **High**     | Novel approach, multiple valid solutions    | Elevated   | Limited precedent    | Architecture review           |
| **Critical** | Security/performance/data-loss risk         | Severe     | May be novel         | Formal review + rollback plan |

### Fidelity Level Matrix

| Effort → Complexity ↓ | Trivial | Small | Medium | Large | Epic |
| --------------------- | ------- | ----- | ------ | ----- | ---- |
| **Low**               | F1      | F1    | F2     | F2    | F3   |
| **Moderate**          | F1      | F2    | F2     | F2    | F3   |
| **High**              | F2      | F2    | F2     | F3    | F3   |
| **Critical**          | F2      | F2    | F3     | F3    | F3   |

**Legend:**

- **F1** (Minimal): No plan approval required
- **F2** (Standard): Plan approval + grounding + options + verification
- **F3** (High): F2 + comprehensive grounding + Mai decision capture + rollback plan

---

## Assessment Heuristics

### Effort Assessment Guide

**Ask yourself:**

1. How many files will I touch?
2. How many lines of code (rough estimate)?
3. How much investigation is needed before coding?
4. Does this cross component boundaries?
5. Does this require coordination with other agents?

**Examples by Effort:**

**Trivial:**

- Fix typo in error message
- Update single config value
- Add one environment variable

**Small:**

- Add validation to single endpoint
- Create new utility function
- Update single component styling

**Medium:**

- Implement new API endpoint with tests
- Add feature flag system
- Refactor authentication flow

**Large:**

- Design and implement new service
- Migrate database schema
- Integrate third-party API across multiple components

**Epic:**

- Redesign system architecture
- Major framework migration
- Multi-service orchestration system

### Complexity Assessment Guide

**Ask yourself:**

1. Is the approach well-established in this codebase?
2. How many valid solutions exist?
3. What's the blast radius if this breaks?
4. Is this touching security/performance/data critical paths?
5. Do I need architecture review before proceeding?

**Examples by Complexity:**

**Low:**

- Adding CRUD endpoint following existing pattern
- Copying established component for new feature
- Standard form validation

**Moderate:**

- Choosing between JWT and session auth
- Designing API contract for new integration
- Implementing caching strategy

**High:**

- Novel state management approach
- Custom authentication flow
- Performance optimization requiring deep profiling

**Critical:**

- Changing encryption algorithm
- Redesigning authorization model
- Database migration with potential data loss
- Payment processing integration

---

## Common Assessment Mistakes

### ❌ **Underestimating Effort:**

- "It's just one file" → But touches 20 imports and breaks 10 tests
- "Quick refactor" → But changes public API used across codebase
- **Fix:** Count affected files/components, not just changed files

### ❌ **Underestimating Complexity:**

- "Standard CRUD" → But involves PII/security
- "Simple feature" → But no established pattern exists
- **Fix:** Assess risk and novelty separately from effort

### ❌ **Conflating Effort and Complexity:**

- Large + Low: Database migration following well-tested script
- Trivial + Critical: Changing single crypto constant
- **Fix:** Assess independently, then combine for fidelity

### ❌ **Ignoring Risk Factors:**

- Not considering rollback difficulty
- Ignoring blast radius
- Missing security/compliance implications
- **Fix:** Always ask "What if this breaks?"

---

## Plan Brief Template (Copy/Paste Ready)

```
PLAN FOR APPROVAL:
- TASK: [What you're implementing - 1 sentence]
- EFFORT: [Trivial/Small/Medium/Large/Epic]
- COMPLEXITY: [Low/Moderate/High/Critical]
- FIDELITY: [1/2/3] (based on matrix above)
- APPROACH: [High-level approach in 3-5 bullet points]
- GROUNDING: [Repo patterns found / dependencies checked / stakeholders consulted]
- OPTIONS:
  A) [Option A - pros/cons]
  B) [Option B - pros/cons]
  C) [Option C - pros/cons]
- RECOMMENDATION: [Your preferred approach and why]
- VERIFICATION: [How you'll validate the work - test plan, acceptance criteria]
- ROLLBACK (Fidelity 3 only): [How to roll back if needed]
- RISKS: [Potential issues and mitigation]
- REQUESTING: Approval to proceed OR feedback on approach
```

---

## Escalation Format (with Effort/Complexity)

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

## Integration with Delegation Protocols

This framework is referenced in **Delegation Protocols v1.4** under:

- **Fidelity Gates & Planning Requirements** (§74-164)
- **Plan Brief Template** (§126-143)
- **Escalation Formats** (§3)

**Key Rules:**

- Fidelity 2+ work **requires plan approval** before starting
- Fidelity 2+ work requires **sanity check at 25% completion**
- All escalations must include effort/complexity assessment
- Never report time estimates (agents are stateless)

---

## Examples: Applying the Framework

### Example 1: Add JWT Authentication

**Assessment:**

- EFFORT: **Large** (cross-component, 5-10 files, auth service + middleware + tests)
- COMPLEXITY: **Moderate** (established patterns exist, standard JWT libs available)
- FIDELITY: **2** (Standard)
- **ACTION:** Draft plan with options (JWT vs session vs OAuth2), get approval, proceed

### Example 2: Fix Typo in Error Message

**Assessment:**

- EFFORT: **Trivial** (1 file, 1 line)
- COMPLEXITY: **Low** (zero risk, straightforward)
- FIDELITY: **1** (Minimal)
- **ACTION:** Fix directly, report completion

### Example 3: Migrate to New Crypto Library

**Assessment:**

- EFFORT: **Medium** (3-5 files, replace crypto calls)
- COMPLEXITY: **Critical** (security risk, requires audit, rollback plan essential)
- FIDELITY: **3** (High)
- **ACTION:** Comprehensive plan with security review, rollback strategy, gradual rollout plan

### Example 4: Redesign Multi-Tenant Architecture

**Assessment:**

- EFFORT: **Epic** (architecture-level, 20+ files, multi-agent coordination)
- COMPLEXITY: **High** (novel approach, multiple solutions, deep impact)
- FIDELITY: **3** (High)
- **ACTION:** Comprehensive plan, Mai decision capture, phased approach, formal reviews

---

## Why This Matters

**Before (time-based):**

- ❌ "This will take 2 hours" → Agent is stateless, can't measure time
- ❌ "ETA: 3 days" → Meaningless without checkpoint definitions
- ❌ Creates false precision and broken promises

**After (effort+complexity):**

- ✓ "This is Medium effort, Moderate complexity" → Predictable planning needs
- ✓ Triggers appropriate review gates (Fidelity 1/2/3)
- ✓ Clear escalation when effort/complexity exceeds expectations
- ✓ Checkpoint-based progress (not time-based)

---

**Related Skills:**

- `agent-routing` - Choosing the right specialist for effort/complexity
- `handoff-patterns` - Handoff types by effort/complexity
- `frieren-context-patterns` - When to capture decisions in Frieren (Fidelity 3)

**Related Protocols:**

- `DELEGATION_PROTOCOLS.md` - Fidelity gates and planning requirements
- `CLAIMS_AND_CITATIONS.md` - No time estimates allowed

---

**Last Updated:** February 10, 2026  
**Next Review:** April 2026
