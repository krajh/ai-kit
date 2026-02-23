---
name: dispatching-parallel-agents
description: "Use when multiple independent tasks can be delegated in parallel; defines safe delegation and integration."
---

# Dispatching Parallel Agents

## When to Use

Use this when you have **2+ independent tasks** that do not share state or require sequencing.

Do **not** use this when tasks:

- Share the same files or state
- Depend on each other’s outputs
- Require a single, coordinated design decision

## Preparation

For each task, define using the **mini-spec template**:

```
Goal: [what this task accomplishes]
Output: [what will be produced/changed]
Constraints: [what NOT to do - no refactors, no extra files, no scope creep]
Verify: [command(s) to run]
```

For each agent, specify:

- Files/areas to touch
- Verification command(s)
- Reporting format

## Delegation Template

Provide each agent with:

1. **Objective**
2. **Scope/constraints**
3. **Expected outputs**
4. **Verification steps**
5. **Reporting format** (summary + files changed)

When delegating, follow this repo’s delegation protocols and agent routing.

## Integration

After agents return:

- Review results for conflicts
- Verify changes locally
- Run `verify-loop` before claiming success
- Include command + result in report

If results conflict, stop and resolve design/requirements before proceeding.
