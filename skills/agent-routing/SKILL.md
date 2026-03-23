---
name: agent-routing
description: Fast specialist selection for team-based AI agent coordination. Core routing by domain, overlap rules, and effort+complexity matrix.
---

# Agent Routing

**Purpose:** Fast, correct specialist selection for multi-agent teams.

**Created:** February 10, 2026  
**Version:** 1.0 (Corporate Edition)

---

## When to Load This Skill

**Load when:**

- Coordinator is planning delegation (multi-agent or specialist selection)
- Uncertain which specialist to choose
- Need to understand agent capabilities and overlap rules

---

## Core Routing Principle

**Pick the smallest specialist that can finish the job reliably.**

---

## Decision Tree

### Step 1: Do You Need Orchestration?

**Use coordinator when:**

- 3+ specialists required
- Dependencies/sequencing matter
- Requirements are ambiguous
- Need continuous monitoring + blocker resolution

**Consider Shade (reaper_enqueue) when:**

- Task is fire-and-forget with clear acceptance criteria
- Batch operations (lint, test, migrate, format)
- Long-running background jobs
- No need for plan approval or escalation paths

**If NO orchestration or background delegation needed → Proceed to Step 2**

---

### Step 2: Core Domain Routing

#### Build / Implement

| Task Type                                   | Agent Role               | Also Handles             |
| ------------------------------------------- | ------------------------ | ------------------------ |
| General features/fixes/refactors            | **Implementer**          | Python, TypeScript, Go   |
| End-to-end integration (FE+BE+DB glue)      | **Integration Engineer** | Cross-layer features     |
| Backend services/API design                 | **Backend Specialist**   | External integrations    |
| Frontend UI implementation                  | **Frontend Specialist**  | UI/UX design             |
| Build/TypeScript/test fixes (minimal diffs) | **Build Doctor**         | Type errors, quick fixes |

#### Architecture / Research

| Task Type                                   | Agent Role              | Also Handles            |
| ------------------------------------------- | ----------------------- | ----------------------- |
| System design & migration planning          | **System Architect**    | End-to-end architecture |
| Technical research & codebase investigation | **Research Specialist** | Codebase scouting       |

#### Quality / Safety / Ops

| Task Type                        | Agent Role               | Also Handles      |
| -------------------------------- | ------------------------ | ----------------- |
| Code review (quality + risk)     | **Code Reviewer**        | Test adequacy     |
| Threat modeling/security posture | **Security Specialist**  | Security audits   |
| Deep debugging/RCA               | **Debugging Specialist** | Forensic analysis |

#### Performance

| Task Type                           | Agent Role                 | Also Handles       |
| ----------------------------------- | -------------------------- | ------------------ |
| Hands-on profiling & hot-path fixes | **Performance Specialist** | Perf strategy/SLOs |

#### Cloud / Docs / Misc

| Task Type                                      | Agent Role                   | Also Handles              |
| ---------------------------------------------- | ---------------------------- | ------------------------- |
| Cloud infra/IaC/FinOps/Hardware/IoT/CI/CD      | **Cloud Infrastructure**     | Deployment                |
| Documentation                                  | **Documentation Specialist** | READMEs, guides, API docs |
| LLM/RAG/AI systems/scientific computing        | **AI Systems Specialist**    | AI optimization           |
| Requirements analysis / pre-plan interrogation | **Requirements Analyst**     | Assumption extraction     |

---

## Overlap Resolution Rules

**When multiple agents could fit:**

### Implementer vs Integration Engineer

- **Implementer:** Builds single components (e.g., one API service, one React component)
- **Integration Engineer:** Integrates across layers (e.g., FE form → API → DB → response display)

### Backend vs Others

- **Backend:** Backend services + external integrations
- **NOT Backend:** Frontend work (use Frontend), full-stack integration (use Integration Engineer)

### Frontend vs Others

- **Frontend:** Frontend + UI/UX design
- **NOT Frontend:** Backend logic (use Backend), full integration (use Integration Engineer)

### Cloud vs Others

- **Cloud:** Cloud infra + CI/CD + deployment
- **NOT Cloud:** Application code (use domain specialists), AI infra (use AI Systems)

### Reviewer vs Others

- **Reviewer:** Code review + test adequacy
- **NOT Reviewer:** Writing tests from scratch (use implementing agent), security audit (use Security)

### Performance vs Others

- **Performance:** Performance optimization + perf strategy
- **NOT Performance:** Architecture design (use Architect), functional bugs (use Debugging)

### Research vs Others

- **Research:** Research + codebase scouting
- **NOT Research:** Implementation (use Implementer or domain specialist), architecture design (use Architect)

### Coordinator vs Others

- **Coordinator:** Orchestration + agent selection
- **NOT Coordinator:** Single-specialist tasks (delegate directly to smallest specialist)

---

## Routing by Effort & Complexity

### Trivial/Small + Low Complexity

- **First choice:** Most specific domain specialist
- **Rationale:** Keep overhead minimal, direct execution

### Medium + Moderate Complexity

- **First choice:** Domain specialist with relevant expertise
- **Consider:** Integration Engineer if task spans layers
- **Rationale:** Specialist knows patterns, can self-correct

### Large + High Complexity

- **First choice:** Architect for design → domain specialist for implementation
- **Consider:** Multiple specialists coordinated by Coordinator
- **Rationale:** Need architecture review before building

### Epic OR Critical Complexity

- **REQUIRED:** Coordinator orchestration
- **Pattern:** Architect designs → Coordinator coordinates implementation → Reviewer reviews
- **Rationale:** Cross-cutting concerns, formal review gates

---

## Common Routing Mistakes

### ❌ **Over-Orchestrating Trivial Work**

- **Bad:** Coordinator delegates "fix typo" → Implementer
- **Good:** User asks Implementer directly
- **Why:** Coordinator overhead unnecessary for simple work

### ❌ **Under-Orchestrating Complex Work**

- **Bad:** User asks Implementer to "redesign auth system"
- **Good:** User asks Coordinator → Coordinator delegates Architect (design) → Implementer (implement) → Reviewer (review)
- **Why:** Epic/Critical work needs coordination and reviews

### ❌ **Wrong Specialist for Integration**

- **Bad:** Ask Frontend to build FE+BE+DB feature
- **Good:** Ask Integration Engineer to integrate across layers
- **Why:** Integration Engineer specializes in cross-layer glue

### ❌ **Skipping Research for Novel Work**

- **Bad:** Ask Implementer to implement novel pattern without precedent
- **Good:** Ask Research to research → present options → Architect/Implementer implement approved approach
- **Why:** Avoid reinventing or choosing wrong approach

### ❌ **Using Live Agents for Batch Work**

- **Bad:** Coordinator delegates "run linter on all files" → Implementer (wastes agent session)
- **Good:** `reaper_enqueue({ task: "Run linter on all files and fix issues", priority: 5 })`
- **Why:** Batch/background tasks don't need live agent interaction — Shade handles them autonomously

### ❌ **Missing Review Gates**

- **Bad:** Implementer implements critical security change, ships without review
- **Good:** Implementer implements → Reviewer reviews code quality → Security audits security posture
- **Why:** Critical complexity requires formal reviews

---

## Routing Decision Matrix

| If Task Is...         | Route To...                      | Optional Follow-Up |
| --------------------- | -------------------------------- | ------------------ |
| Simple bug fix        | Domain specialist                | None               |
| Feature across layers | Integration Engineer             | Reviewer           |
| Novel pattern         | Research → Architect             | Implementer        |
| Performance issue     | Performance Specialist           | Reviewer           |
| Security concern      | Security Specialist              | Reviewer           |
| Mysterious bug        | Debugging Specialist             | None (RCA)         |
| Documentation needed  | Documentation Specialist         | None               |
| Cloud infra           | Cloud Infrastructure             | None               |
| LLM/AI system         | AI Systems Specialist            | None               |
| Batch/background task | **Shade** (reaper_enqueue)       | None               |
| Multi-specialist epic | **Coordinator orchestrates all** | Multiple agents    |

---

## Integration with Delegation Protocols

When routing:

1. **Assess effort + complexity** (use `effort-complexity-framework` skill)
2. **Determine fidelity level** (F1/F2/F3)
3. **Choose routing strategy:**
   - F1: Direct to specialist
   - F2: Specialist with plan approval
   - F3: Coordinator orchestrates (design → implement → review)

**Mandatory:** All delegations follow **Delegation Protocols v1.4**

---

## Quick Reference: Agent Role Categories

**Implementers:** Implementer, Integration Engineer, Backend Specialist, Frontend Specialist, Build Doctor  
**Thinkers:** Architect, Research Specialist, Requirements Analyst  
**Reviewers:** Code Reviewer, Security Specialist  
**Specialists:** Debugging (debug), Performance (perf), AI Systems (LLM), Cloud (infra), Documentation (docs)  
**Orchestrator:** Coordinator

---

## Related Skills

- `effort-complexity-framework` - Assess task before routing
- `handoff-patterns` - Multi-agent handoff types

**Related Protocols:**

- `DELEGATION_PROTOCOLS.md` - Mandatory for all delegations
- `AGENT_SELECTION_GUIDE.md` - Detailed capabilities reference

---

**Last Updated:** February 10, 2026  
**Next Review:** April 2026
