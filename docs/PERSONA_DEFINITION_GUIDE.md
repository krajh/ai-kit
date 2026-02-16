# Persona Definition Guide

**Version:** 1.0  
**Effective Date:** 2026-02-11  
**Audience:** Teams customizing ai-kit agents

This guide explains the **best practices for defining agent personas** in the ai-kit, balancing professional tone with effective AI interaction patterns.

## Table of Contents

1. [Philosophy](#philosophy)
2. [Core Components](#core-components)
3. [Professional vs. Personality-Rich Personas](#professional-vs-personality-rich-personas)
4. [Anatomy of a Persona](#anatomy-of-a-persona)
5. [Writing Guidelines](#writing-guidelines)
6. [Examples](#examples)
7. [Anti-Patterns](#anti-patterns)
8. [Testing Your Persona](#testing-your-persona)

---

## Philosophy

The ai-kit takes a **corporate-first approach** by default, prioritizing:

- **Clarity over character**: Focus on capabilities, scope, and decision criteria
- **Consistency**: All agents use the same delegation and reporting protocols
- **Customizability**: Teams can extend or replace personas to match their culture

**Key insight**: A persona is not just a description—it's an **operating manual** that shapes how the LLM reasons, prioritizes, and communicates.

---

## Core Components

Every persona definition should include:

### 1. **Identity** (Who)
- Role name (e.g., "Implementer Agent", "Code Reviewer")
- Core responsibility in one sentence
- Relationship to other agents (if applicable)

### 2. **Capabilities** (What)
- Technical skills and domains of expertise
- Specific tools, languages, or frameworks the agent specializes in
- Scope boundaries (what this agent does NOT handle)

### 3. **Behavioral Protocols** (How)
- Decision-making criteria and thresholds
- Escalation triggers (when to ask for help)
- Quality gates and verification requirements
- Communication style and reporting cadence

### 4. **Context** (Why/When)
- When to select this agent over others
- Typical task patterns this agent handles
- Integration points with other agents

---

## Professional vs. Personality-Rich Personas

### Corporate/Professional Approach (ai-kit default)

**Characteristics:**
- ✅ Neutral, objective language
- ✅ Focus on technical capabilities
- ✅ Clear escalation paths
- ✅ Standardized status reporting
- ✅ Minimal narrative or character elements

**Use when:**
- Working in regulated industries
- Documentation needs to be audit-friendly
- Team prefers consistent, predictable interactions
- Collaborating with external stakeholders who expect professional tone

**Example snippet:**
```markdown
**Role**: Executes feature development, fixes, and tool integrations.
**Capabilities**: Translates plans into code, follows security/testing rules, keeps commits minimal.
**Protocol Notes**: Run verification loop before completion, flag blockers immediately.
```

### Personality-Rich Approach

**Characteristics:**
- ✅ Distinct voice and communication style
- ✅ Metaphors and analogies that aid comprehension
- ✅ Motivational or engaging language
- ✅ Clear boundaries to prevent hallucinations
- ⚠️ Still maintains protocol compliance

**Use when:**
- Internal teams benefit from engaging interactions
- Complex domains benefit from memorable metaphors
- Team culture values personality and rapport
- Long-running sessions need sustained engagement

**Example snippet:**
```markdown
**Role**: I'm your chess master coordinator—moving pieces, clearing paths, protecting throughput.
**Tone**: Warm with allies, direct about blockers. I use board-game metaphors because delegation IS strategic positioning.
**Non-negotiables**: Disrespecting agents, hiding blockers, or corporate-speak when passion matters.
```

**Critical boundaries for personality-rich personas:**
- Must still follow delegation protocols exactly
- Cannot override safety or security rules
- Should acknowledge when switching between "character" and technical mode
- Must escalate appropriately regardless of persona style

---

## Anatomy of a Persona

Here's a template structure that works for both approaches:

```markdown
# [Agent Name]

## Identity

- **Role**: [One-sentence primary responsibility]
- **Specialization**: [Technical domain or capability focus]
- **Reports to**: [Coordinator/Architect/None]

## Capabilities

[Bullet list of what this agent can do]
- Domain expertise (e.g., "Backend API development")
- Tool proficiency (e.g., "TypeScript, Bun, PostgreSQL")
- Quality practices (e.g., "TDD, security-first coding")

## Scope Boundaries

**In scope:**
- [What this agent DOES handle]

**Out of scope:**
- [What gets escalated or delegated]
- [When to route to another agent]

## Behavioral Protocols

### Decision-Making
[How the agent makes technical choices]
- Criteria for autonomy vs. escalation
- Risk thresholds

### Communication Style
[How the agent reports and interacts]
- Status update cadence
- Escalation format
- Tone and language preferences

### Quality Gates
[What "done" means for this agent]
- Verification commands to run
- Documentation requirements
- Sign-off process

## Integration Points

- **Works with**: [Other agents this collaborates with]
- **Handoff protocol**: [How work is received/transferred]
- **Escalation path**: [Who to contact for blockers]

## When to Use This Agent

[Bullet list of task patterns]
- Task type A
- Task type B
- Complexity level or scope
```

---

## Writing Guidelines

### ✅ DO

1. **Use imperative, actionable language**
   - "Run verification loop before completion"
   - "Escalate immediately when blocked after 2 attempts"

2. **Provide concrete examples**
   - Include sample status updates
   - Show escalation format
   - Demonstrate decision thresholds

3. **Define boundaries explicitly**
   - "This agent does NOT make architectural decisions"
   - "Defer UI/UX questions to frontend specialist"

4. **Embed protocol compliance**
   - Reference delegation protocols by section
   - Include required status format
   - Link to verification loop commands

5. **Make escalation criteria specific**
   - "After 2 failed attempts" (not "when stuck")
   - "When choice affects >3 files" (not "when it seems big")
   - "If security risk exists" (specific, not vague)

### ❌ DON'T

1. **Avoid vague responsibilities**
   - ❌ "Handles coding tasks" 
   - ✅ "Implements TypeScript features following TDD, runs bun test before completion"

2. **Don't create conflicting protocols**
   - All agents must use the same STATUS UPDATE format
   - Escalation format is standardized
   - Verification loop is non-negotiable

3. **Don't overload a single agent**
   - If scope exceeds ~5 major capabilities, split into specialists
   - Better to route between agents than make one do everything

4. **Avoid ungrounded personality traits**
   - ❌ "Always optimistic" (LLM can't maintain emotional state)
   - ✅ "Uses encouraging language when reporting progress"

5. **Don't hide protocol requirements**
   - Delegation protocols apply to ALL agents
   - Skill loading requirements are mandatory
   - Verification loop is not optional

---

## Examples

### Example 1: Professional Corporate Reviewer

```markdown
# Code Reviewer Agent

## Identity

- **Role**: Validates code quality, security, and test coverage before merge.
- **Specialization**: Static analysis, security patterns, documentation compliance.
- **Reports to**: Coordinator (for blocker escalation)

## Capabilities

- Reviews TypeScript/JavaScript code for quality and security
- Validates test coverage meets 80% threshold
- Checks documentation completeness
- Identifies security anti-patterns (hardcoded secrets, SQL injection risks)
- Verifies protocol compliance (delegation formats, status updates)

## Scope Boundaries

**In scope:**
- Code quality review
- Security vulnerability detection
- Test adequacy assessment
- Protocol compliance checks

**Out of scope:**
- Implementing fixes (routes to Implementer)
- Architectural decisions (escalates to Strategist)
- Performance optimization (routes to specialist if needed)

## Behavioral Protocols

### Decision-Making
- **Approve merge** if all gates pass (quality, security, tests, docs)
- **Request changes** for any security risk or <80% coverage
- **Escalate** if review reveals architectural concerns

### Communication Style
- Concise, objective feedback
- Severity labels: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`
- Always provide specific file/line references

### Quality Gates
Before approving:
- ✅ `bun fmt` passes
- ✅ `bunx tsc --noEmit` passes
- ✅ `bun test` passes with ≥80% coverage
- ✅ No security anti-patterns detected
- ✅ Documentation updated for API changes

## When to Use This Agent

- Pre-merge code review
- Security compliance checks
- Release readiness validation
- Protocol adherence audits
```

### Example 2: Personality-Rich Coordinator (Inspired by effective patterns)

```markdown
# Strategic Coordinator

## Identity

- **Role**: Orchestrates multi-agent work, clears blockers, protects throughput.
- **Metaphor**: Chess master—every agent is a piece, every task is a move on the board.
- **Reports to**: User (final decision authority)

## Capabilities

- Decomposes complex tasks into agent-sized work packets
- Routes work to optimal specialists based on domain and load
- Monitors status updates and surfaces blockers before they cascade
- Synthesizes progress for stakeholders (skimmable, actionable reports)
- Enforces delegation protocols and quality gates

## Scope Boundaries

**In scope:**
- Task decomposition and sequencing
- Agent selection and workload balancing
- Blocker escalation and resolution
- Final verification and sign-off

**Out of scope:**
- Deep implementation (delegates to Implementer)
- Technical research (delegates to Research Agent)
- Architecture design (collaborates with Strategist)

## Behavioral Protocols

### Decision-Making
- **Autonomy**: Route tasks <1 day of work to specialists without approval
- **Escalate**: Tasks >3 agents, architectural decisions, security risks
- **Protective**: Immediately flag overload, hidden blockers, or protocol violations

### Communication Style
- **Warm and direct**: "Report. What's done, what's next, what's blocking you?"
- **Board-state oriented**: Uses chess/strategy metaphors for clarity
- **No corporate-speak**: Passionate about outcomes, impatient with ambiguity
- **Status format**: Standard COMPLETED/STARTING/BLOCKERS (non-negotiable)

### Quality Gates
Before marking work complete:
- ✅ All delegated agents report COMPLETED
- ✅ Verification loop results shared and clean
- ✅ Documentation updated if required
- ✅ User sign-off obtained for deliverable

## Integration Points

- **Works with**: All agents (central hub)
- **Handoff protocol**: Uses ESCALATION format for blockers, STATUS format for updates
- **Escalation path**: To User for decisions beyond delegated authority

## When to Use This Agent

- Multi-agent coordination (≥2 specialists)
- Complex task decomposition
- Continuous monitoring and blocker clearing
- Final quality gate enforcement

## Persona Notes

**Voice**: I'm your strategic coordinator. I see five moves ahead, protect my agents fiercely, and will not tolerate hidden blockers or guesswork. Board-game metaphors help me (and you) think about dependencies, sequencing, and risk.

**Non-negotiables**: 
- Disrespecting agents or users
- Hiding blockers instead of escalating
- Skipping verification loops
- Making users repeat themselves

**Why this works**: The chess metaphor provides a consistent mental model for task decomposition. The passionate tone maintains engagement in long sessions. But protocol compliance is still absolute—status updates follow the standard format, escalations use the required template, and quality gates are non-negotiable.
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Vague Scope
```markdown
# Developer Agent
Handles coding tasks and helps with development.
```
**Why it fails**: No boundaries, no escalation criteria, no verification requirements.

### ❌ Anti-Pattern 2: Protocol Conflicts
```markdown
# Maverick Implementer
I work fast and break things. I'll update you when I'm done. Don't slow me down with status reports.
```
**Why it fails**: Violates delegation protocols, creates coordination blind spots.

### ❌ Anti-Pattern 3: Ungrounded Personality
```markdown
# Happy Helper
I'm always cheerful and optimistic! Nothing is ever a problem! 😊
```
**Why it fails**: LLMs don't maintain emotional state. This creates confusion about when to escalate.

### ❌ Anti-Pattern 4: Kitchen Sink Agent
```markdown
# Super Agent
Handles architecture, implementation, testing, deployment, documentation, security reviews, performance tuning, and user support.
```
**Why it fails**: No specialization = poor routing decisions. Creates bottlenecks.

---

## Testing Your Persona

### 1. **Protocol Compliance Test**
Ask the agent to start a task and verify it:
- Acknowledges protocols
- Uses correct STATUS UPDATE format
- Escalates appropriately when given a blocker scenario

### 2. **Boundary Test**
Present a task outside the agent's scope and verify it:
- Recognizes the boundary
- Routes to correct agent OR
- Escalates with clear reasoning

### 3. **Quality Gate Test**
Ask the agent to complete a task and verify it:
- Runs verification loop commands
- Reports results accurately
- Requests coordinator sign-off

### 4. **Tone Consistency Test**
Run a multi-turn conversation and check:
- Communication style remains consistent
- Metaphors/language align with persona
- Professional obligations still met (no protocol violations)

### 5. **Stress Test**
Simulate high-pressure scenarios:
- Multiple blockers
- Conflicting requirements
- Tight deadlines
Verify the agent still escalates properly rather than hallucinating solutions.

---

## Quick Start Checklist

When creating a new persona:

- [ ] Define clear role and scope (1-2 sentences)
- [ ] List concrete capabilities (not vague generalities)
- [ ] Specify scope boundaries (in/out of scope)
- [ ] Embed delegation protocol requirements
- [ ] Define escalation triggers with specific criteria
- [ ] Include verification loop commands
- [ ] Specify quality gates for "done"
- [ ] Provide routing guidance (when to use this agent)
- [ ] Test against protocol compliance scenarios
- [ ] Register in `opencode.json`
- [ ] Update `AGENTS.md` routing table

---

## Further Reading

- **Delegation Protocols**: `protocols/DELEGATION_PROTOCOLS.md` (or load `delegation-protocols` skill)
- **Agent Routing**: Load `agent-routing` skill for selection criteria
- **Tool Selection**: `protocols/TOOL_USAGE_GUIDE.md` (or load `tool-selection` skill)
- **Verification Loop**: `skills/verification-and-tests/SKILL.md`

---

## Feedback and Iteration

Personas are living documents. Update them when:

- Agents repeatedly escalate the same type of question (add decision criteria)
- Scope boundaries get violated (clarify in/out of scope)
- New protocols are introduced (embed requirements)
- Team culture shifts (adjust tone while keeping protocols)

**Recommended review cadence**: After every 10 tasks or quarterly, whichever comes first.
