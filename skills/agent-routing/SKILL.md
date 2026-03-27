---
name: agent-routing
description: Fast specialist selection for team-based AI agent coordination. Core routing by domain, overlap rules, and effort+complexity matrix.
---

# Agent Routing

Fast, correct specialist selection for multi-agent teams. **Pick the smallest specialist that can finish the job reliably.**

**Load when:** planning delegation, uncertain which specialist to choose, or need to understand agent overlap rules.

---

## Step 1: Orchestration or Background?

**Use coordinator when:** 3+ specialists required · dependencies/sequencing matter · ambiguous requirements · continuous monitoring needed.

**Use Shade (`reaper_enqueue`) when:** fire-and-forget with clear acceptance criteria · batch operations · long-running background jobs · no escalation paths needed.

**If neither → proceed to Step 2.**

---

## Step 2: Core Domain Routing

### Build / Implement

| Task Type                                   | Agent Role               |
| ------------------------------------------- | ------------------------ |
| General features/fixes/refactors            | **Implementer**          |
| End-to-end integration (FE+BE+DB)           | **Integration Engineer** |
| Backend services/API design                 | **Backend Specialist**   |
| Frontend UI implementation                  | **Frontend Specialist**  |
| Build/TypeScript/test fixes (minimal diffs) | **Build Doctor**         |

### Architecture / Research

| Task Type                                           | Agent Role               |
| --------------------------------------------------- | ------------------------ |
| System design & migration planning                  | **System Architect**     |
| Technical research & codebase investigation         | **Research Specialist**  |
| Requirements clarification / pre-plan interrogation | **Requirements Analyst** |

### Quality / Safety / Ops

| Task Type                           | Agent Role                 |
| ----------------------------------- | -------------------------- |
| Code review (quality + risk)        | **Code Reviewer**          |
| Threat modeling/security posture    | **Security Specialist**    |
| Deep debugging/RCA                  | **Debugging Specialist**   |
| Hands-on profiling & hot-path fixes | **Performance Specialist** |

### Cloud / Docs / AI

| Task Type             | Agent Role                   |
| --------------------- | ---------------------------- |
| Cloud infra/IaC/CI/CD | **Cloud Infrastructure**     |
| Documentation         | **Documentation Specialist** |
| LLM/RAG/AI systems    | **AI Systems Specialist**    |

---

## Overlap Resolution Rules

| Overlap                             | Rule                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Implementer vs Integration Engineer | Implementer: single component. Integration Engineer: across layers (FE→API→DB).                      |
| Backend vs others                   | Backend: services + external integrations. NOT frontend or full-stack integration.                   |
| Frontend vs others                  | Frontend: UI + UX. NOT backend logic or full integration.                                            |
| Reviewer vs others                  | Reviewer: code review + test adequacy. NOT writing tests (use implementing agent) or security audit. |
| Performance vs others               | Performance: optimization + perf strategy. NOT architecture design or functional bugs.               |
| Research vs others                  | Research: investigation + codebase scouting. NOT implementation or architecture design.              |
| Coordinator vs others               | Coordinator: orchestration. NOT single-specialist tasks (delegate directly).                         |

---

## Routing by Effort & Complexity

| Effort + Complexity | Route                                                      |
| ------------------- | ---------------------------------------------------------- |
| Trivial/Small + Low | Domain specialist directly                                 |
| Medium + Moderate   | Domain specialist (or Integration Engineer if cross-layer) |
| Large + High        | Architect for design → specialist for implementation       |
| Epic OR Critical    | **Coordinator orchestrates** — design → build → review     |

---

## Common Routing Mistakes

| Mistake                                                        | Correct                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| Coordinator delegates trivial work (adds overhead)             | User asks specialist directly                                  |
| Asking Implementer to redesign auth system                     | Coordinator → Architect (design) → Implementer → Reviewer      |
| Asking Frontend to build FE+BE+DB feature                      | Use Integration Engineer                                       |
| Asking Implementer to implement novel pattern without research | Research first → present options → implement approved approach |
| Delegating "run linter on all files" to live agent             | `reaper_enqueue` (Shade) — batch work doesn't need live agent  |
| Implementer ships critical security change without review      | Implementer → Reviewer → Security Specialist                   |

---

## Routing Decision Matrix

| If Task Is...         | Route To...                  | Optional Follow-Up |
| --------------------- | ---------------------------- | ------------------ |
| Simple bug fix        | Domain specialist            | None               |
| Feature across layers | Integration Engineer         | Reviewer           |
| Novel pattern         | Research → Architect         | Implementer        |
| Performance issue     | Performance Specialist       | Reviewer           |
| Security concern      | Security Specialist          | Reviewer           |
| Mysterious bug        | Debugging Specialist         | None (RCA)         |
| Documentation         | Documentation Specialist     | None               |
| Cloud infra           | Cloud Infrastructure         | None               |
| LLM/AI system         | AI Systems Specialist        | None               |
| Batch/background task | **Shade** (`reaper_enqueue`) | None               |
| Multi-specialist epic | **Coordinator orchestrates** | Multiple agents    |

---

## Integration with Delegation Protocols

1. Assess effort + complexity (`effort-complexity-framework` skill)
2. Determine fidelity level (F1/F2/F3)
3. Route: F1 → direct to specialist · F2 → specialist with plan approval · F3 → Coordinator orchestrates

**Mandatory:** All delegations follow **Delegation Protocols v1.4**

---

**Related:** `effort-complexity-framework` · `handoff-patterns` · `delegation-protocols`
