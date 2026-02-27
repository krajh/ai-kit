---
name: agent-selection
description: Select the best agent(s) for a task based on domain fit and coordination needs
---

# Agent Selection

Choose the right agent(s) for a task based on scope clarity, domain fit, and coordination needs.

## Use when

- Routing a request to the most qualified agent
- Deciding between single-agent vs. multi-agent execution
- Decomposing an ambiguous task into assignments

## Recommended routing (this kit)

| Need                                              | Agent         |
| ------------------------------------------------- | ------------- |
| Coordination / sequencing / dependency management | `coordinator` |
| Product/system strategy and trade-offs            | `strategist`  |
| Architecture and interface boundaries             | `architect`   |
| Implementation (code changes)                     | `implementer` |
| Code/doc review, correctness, safety              | `reviewer`    |
| Discovery / requirements / research               | `research`    |

## Decision tree

```
Task received
  ↓
Is scope clear and single-domain?
  YES → delegate directly to the matching specialist
  NO  → route to coordinator to decompose into measurable tasks
  ↓
Does it require 2+ domains or sequencing?
  YES → coordinator owns the plan + assigns specialists
  NO  → single specialist
```

## Anti-patterns

- Over-coordination: using the coordinator for trivial, single-file edits.
- Under-coordination: delegating multi-domain work to one specialist and expecting them to self-coordinate.

## Related

- `delegation-orchestration` - coordination playbook
- `protocol-verify` - quick compliance checks
- `protocol-compliance-v13` - agent-side compliance checklist
