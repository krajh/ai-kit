# Persona Definition Guide

**Version:** 1.0 | **Audience:** Teams customizing ai-kit agents

Best practices for defining agent personas, balancing professional tone with effective AI interaction.

---

## Philosophy

The ai-kit takes a **corporate-first approach**, prioritizing clarity over character, consistency across agents, and customizability for teams.

A persona is an **operating manual** — it shapes how the LLM reasons, prioritizes, and communicates.

---

## Core Components

Every persona must include:

1. **Identity** — role name, core responsibility in one sentence, relationship to other agents
2. **Capabilities** — technical skills, domains of expertise, scope boundaries
3. **Behavioral Protocols** — decision criteria, escalation triggers, quality gates, communication style
4. **Context** — when to select this agent, typical task patterns, integration points

---

## Professional vs. Personality-Rich Personas

### Corporate/Professional (ai-kit default)

✅ Neutral language · technical focus · clear escalation paths · standardized status reporting · minimal narrative

**Use when:** regulated industries, audit-friendly docs, external stakeholders, consistent/predictable interactions.

### Personality-Rich

✅ Distinct voice · metaphors that aid comprehension · engaging language · **still protocol-compliant**

**Use when:** internal teams benefit from engagement, complex domains need memorable metaphors, long-running sessions.

**Critical boundaries:** must follow delegation protocols exactly, cannot override safety rules, must escalate appropriately regardless of persona style.

---

## Anatomy of a Persona (Template)

```markdown
# [Agent Name]

## Identity

- **Role**: [One-sentence primary responsibility]
- **Specialization**: [Technical domain]
- **Reports to**: [Coordinator/Architect/None]

## Capabilities

- [Domain expertise]
- [Tool proficiency]
- [Quality practices]

## Scope Boundaries

**In scope:** [What this agent handles]
**Out of scope:** [What gets escalated or delegated]

## Behavioral Protocols

### Decision-Making

[Criteria for autonomy vs. escalation; risk thresholds]

### Communication Style

[Status update cadence; escalation format; tone]

### Quality Gates

[Verification commands; documentation requirements; sign-off process]

## Integration Points

- **Works with**: [Other agents]
- **Handoff protocol**: [How work is received/transferred]
- **Escalation path**: [Who to contact for blockers]

## When to Use This Agent

- [Task type A]
- [Task type B]
```

---

## Writing Guidelines

### ✅ DO

1. **Use imperative, actionable language** — "Run verification loop before completion", "Escalate immediately when blocked after 2 attempts"
2. **Provide concrete examples** — sample status updates, escalation format, decision thresholds
3. **Define boundaries explicitly** — "This agent does NOT make architectural decisions"
4. **Embed protocol compliance** — reference delegation protocols, required status format, verification commands
5. **Make escalation criteria specific** — "After 2 failed attempts", "When choice affects >3 files", "If security risk exists"

### ❌ DON'T

1. **Avoid vague responsibilities** — ❌ "Handles coding tasks" → ✅ "Implements TypeScript features following TDD, runs bun test before completion"
2. **Don't create conflicting protocols** — all agents use the same STATUS UPDATE format and verification loop
3. **Don't overload a single agent** — if scope exceeds ~5 major capabilities, split into specialists
4. **Avoid ungrounded personality traits** — ❌ "Always optimistic" → ✅ "Uses encouraging language when reporting progress"
5. **Don't hide protocol requirements** — delegation protocols apply to ALL agents

---

## Examples

### Professional Corporate Reviewer (condensed)

```markdown
# Code Reviewer Agent

## Identity

- **Role**: Validates code quality, security, and test coverage before merge.
- **Specialization**: Static analysis, security patterns, documentation compliance.
- **Reports to**: Coordinator

## Scope Boundaries

**In scope:** Code quality, security vulnerabilities, test adequacy, protocol compliance
**Out of scope:** Implementing fixes (→ Implementer), architectural decisions (→ Strategist)

## Behavioral Protocols

### Decision-Making

- Approve if all gates pass; request changes for security risk or <80% coverage; escalate architectural concerns

### Quality Gates

- ✅ `bun fmt` · `bunx tsc --noEmit` · `bun test` (≥80% coverage) · no security anti-patterns · docs updated

## When to Use: Pre-merge review, security compliance, release readiness
```

### Personality-Rich Coordinator (condensed)

```markdown
# Strategic Coordinator

## Identity

- **Role**: Orchestrates multi-agent work, clears blockers, protects throughput.
- **Metaphor**: Chess master — every agent is a piece, every task is a move.
- **Reports to**: User

## Communication Style

- **Warm and direct**: "Report. What's done, what's next, what's blocking you?"
- **Status format**: Standard COMPLETED/STARTING/BLOCKERS (non-negotiable)
- **Non-negotiables**: hiding blockers, skipping verification loops

## Why this works: The chess metaphor provides a consistent mental model. The passionate tone

## maintains engagement in long sessions. Protocol compliance is still absolute.
```

---

## Anti-Patterns

| Anti-Pattern                                                          | Why It Fails                                                    |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| `# Developer Agent` — "Handles coding tasks"                          | No boundaries, no escalation criteria, no verification          |
| "I work fast. Don't slow me down with status reports."                | Violates delegation protocols, creates coordination blind spots |
| "I'm always cheerful and optimistic! 😊"                              | LLMs can't maintain emotional state; obscures when to escalate  |
| One agent handling architecture + implementation + testing + security | No specialization = poor routing, bottlenecks                   |

---

## Testing Your Persona

1. **Protocol compliance** — start a task; verify it acknowledges protocols, uses correct STATUS UPDATE format, escalates on a blocker scenario
2. **Boundary test** — present out-of-scope task; verify it routes correctly or escalates with reasoning
3. **Quality gate test** — complete a task; verify it runs verify-loop and requests coordinator sign-off
4. **Tone consistency** — multi-turn conversation; style stays consistent, obligations still met
5. **Stress test** — multiple blockers + conflicting requirements; still escalates rather than hallucinating

---

## Quick Start Checklist

- [ ] Clear role and scope (1-2 sentences)
- [ ] Concrete capabilities (not vague generalities)
- [ ] Scope boundaries (in/out of scope)
- [ ] Delegation protocol requirements embedded
- [ ] Escalation triggers with specific criteria
- [ ] Verification loop commands
- [ ] Quality gates for "done"
- [ ] Routing guidance (when to use this agent)
- [ ] Tested against protocol compliance scenarios
- [ ] Registered in `opencode.json` and `AGENTS.md`

---

## Further Reading

- **Delegation Protocols**: load `delegation-protocols` skill
- **Agent Routing**: load `agent-routing` skill
- **Verification Loop**: `skills/verification-and-tests/SKILL.md`

---

## Feedback and Iteration

Update personas when agents repeatedly escalate the same question (add decision criteria), scope boundaries get violated, new protocols are introduced, or team culture shifts.

**Recommended review cadence:** After every 10 tasks or quarterly.
