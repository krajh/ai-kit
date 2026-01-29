---
name: peerage-assemble
description: Select the best agent(s) for a task based on domain fit and coordination needs
agent: rias-queen
---

# Peerage Assemble

Choose the right specialist(s) for a task based on domain expertise, coordination needs, and workload.

## Use when

- Decomposing a complex task into agent assignments
- Routing a request to the most qualified specialist
- Deciding between single-agent vs. multi-agent approach
- Evaluating if a task needs orchestration (Rias) vs. direct delegation

## Agent Selection Criteria

### 1. Domain Match (Primary)

**Match task domain to agent specialty:**

| Domain                         | Primary Agent(s)                | Backup           |
| ------------------------------ | ------------------------------- | ---------------- |
| **Coordination/Orchestration** | rias-queen                      | -                |
| **Implementation**             | marin-coder                     | koneko-fullstack |
| **Code Review**                | rukia-reviewer                  | -                |
| **Research**                   | tsubaki-research                | rossweisse-llm   |
| **Architecture**               | yoruichi-architect              | -                |
| **Backend/API**                | xenovia-backend                 | -                |
| **Frontend/UI**                | mittelt-frontend, power-react   | -                |
| **Database**                   | mikasa-postgres, ravel-bigquery | -                |
| **Testing/QA**                 | nezuko-tester                   | -                |
| **Performance**                | rangiku-performance             | -                |
| **Plan Review**                | roygun-critic                   | -                |
| **Security**                   | raynare-security                | -                |
| **Cloud/Infra**                | grayfia-cloud                   | -                |
| **CI/CD**                      | venelana-deployment             | -                |
| **Debugging**                  | kuroka-debug                    | -                |
| **Context Management**         | mai-context                     | -                |
| **Incident Response**          | makima-incident                 | -                |
| **LLM/AI Systems**             | rossweisse-llm                  | -                |
| **Data Science**               | serafall-data                   | -                |
| **Documentation**              | zerotwo-docs                    | -                |
| **Language-Specific:**         |                                 |                  |
| - TypeScript                   | nelliel-typescript              | -                |
| - Go                           | mitsuri-golang                  | -                |
| - Python                       | fubuki-python                   | -                |

### 2. Task Complexity (Secondary)

**Single-agent tasks:**

- Clear scope, single domain
- Well-defined acceptance criteria
- No cross-domain dependencies

**Multi-agent tasks (need Rias):**

- Multiple domains (e.g., backend + frontend + database)
- Unclear scope (needs decomposition)
- Cross-agent dependencies
- High coordination overhead

### 3. Workload & Availability (Tertiary)

**In OpenCode's stateless architecture:**

- Agents don't have "workload" (they're task-based, not persistent)
- All agents are "available" (new session per task)
- Choose based on domain fit, not availability

**Exception:** If multiple tasks are delegated in parallel, consider:

- Task dependencies (sequential vs. parallel)
- Shared resources (same files/systems)
- Coordination overhead

## Decision Tree

```
Task received
  ↓
Is scope clear and single-domain?
  YES → Delegate to specialist directly
  NO → Use Rias for decomposition
  ↓
Does it need 2+ domains?
  YES → Use Rias for coordination
  NO → Single specialist
  ↓
Which domain?
  → Match to agent table above
  ↓
Delegate with Delegation Protocols v1.3
```

## Examples

**Example 1: Clear single-domain task**

- **Task:** "Add input validation to all tools in `.opencode/tool/`"
- **Domain:** Implementation (tool development)
- **Agent:** marin-coder
- **Why:** Clear scope, single domain, well-defined acceptance criteria

**Example 2: Multi-domain task**

- **Task:** "Build a user authentication system"
- **Domains:** Backend (API), Database (schema), Frontend (login UI), Security (tokens)
- **Agent:** rias-queen (coordinator)
- **Why:** Multiple domains, needs decomposition and coordination
- **Sub-delegations:**
  - xenovia-backend: API endpoints
  - mikasa-postgres: User schema + migrations
  - mittelt-frontend: Login/signup UI
  - raynare-security: Token strategy review

**Example 3: Ambiguous task**

- **Task:** "Improve the codebase"
- **Domain:** Unclear
- **Agent:** rias-queen (coordinator)
- **Why:** Needs decomposition into specific, measurable tasks

**Example 4: Research + Implementation**

- **Task:** "Research best practices for rate limiting, then implement"
- **Approach:** Sequential delegation
  1. tsubaki-research: Research rate limiting patterns
  2. marin-coder: Implement chosen pattern
- **Coordinator:** rias-queen (to sequence and handoff)

## Anti-Patterns

**❌ Wrong agent for domain:**

- Delegating database work to frontend specialist
- Delegating architecture to implementation specialist

**❌ Over-coordination:**

- Using Rias for trivial single-domain tasks
- Creating multi-agent workflows when one agent suffices

**❌ Under-coordination:**

- Delegating multi-domain work to single specialist
- Expecting agent to coordinate with others (agents are stateless)

## Related

- `delegation-orchestration` - How to coordinate multi-agent work
- `protocol-compliance-v13` - Delegation protocol requirements
- `protocols/AGENT_SELECTION_GUIDE.md` - Detailed agent capabilities reference
