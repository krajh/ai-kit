---
name: ralph-loop
description: Tight iterate-to-done loop for mechanical tasks with one small change per iteration, `verify-loop` checks, and explicit stop markers.
---

# Ralph Loop (Iterate-to-Done) — OpenCode Edition

**Purpose:** Run a tight, repeatable autonomous iteration loop for mechanical tasks with clear acceptance criteria, using `verify-loop` and explicit stop markers.

## When to use

- Mechanical refactors, migrations, test coverage improvements
- Tool/plugin hardening with deterministic checks
- Any task where "done" can be proven by commands + criteria

**Do not use** when:

- Requirements are ambiguous
- Architecture decisions are unresolved (escalate first)
- The task is too broad to finish in small iterations

## The loop contract (every iteration)

Each iteration must do **exactly one** of:

- Implement one small slice of functionality
- Refactor one contained area
- Add/repair one test group
- Fix one failing check

Then it must:

1. Run required checks (`verify-loop` preferred)
2. Update progress log
3. Report a checkpoint-style STATUS UPDATE
4. Decide: continue or stop

## Required stop marker

When (and only when) acceptance criteria are met and checks are green, output:
`<promise>COMPLETE</promise>`

If blocked or uncertain, output:
`<promise>BLOCKED</promise>` and escalate.

## Progress log format (`progress.txt`)

Maintain a short, append-only log (keep under ~200 lines):

- Iteration N:
  - Goal:
  - Files changed:
  - Commands run + results:
  - Next:

Example:

- Iteration 3:
  - Goal: Add tests for config layering
  - Files: .opencode/tool/some-tool.ts, tests/some-tool.test.ts
  - Checks: bun test OK; tsc OK
  - Next: edge case for missing dirs

## Acceptance criteria template (fill before starting)

- [ ] Scope statement (in/out)
- [ ] Required checks list (commands)
- [ ] Test expectations (what should pass)
- [ ] No policy violations (docs, secrets, etc.)

## Iteration prompt template (copy/paste)

Use this same prompt every loop; only update the checklist/progress section.

**TASK:** [one sentence]
**ACCEPTANCE CRITERIA:**

- [ ] …
- [ ] …

**ITERATION RULES:**

- Make one small, reviewable change
- Run: `bun .opencode/tool/verify-loop.ts --type auto` (or explain why not)
- Update `progress.txt`
- Output a STATUS UPDATE (checkpoint-based)
- If complete: print `<promise>COMPLETE</promise>`
- If blocked/uncertain: escalate immediately

## STATUS UPDATE template

```
STATUS UPDATE:
- COMPLETED: Iteration N — [what changed]
- STARTING: Iteration N+1 — [next small step] OR CONTINUING: [same]
- PROGRESS: Files: …; Checks: …; Notes: …
- BLOCKERS: None OR …
```

## Safety rules (must follow)

- No commits/pushes unless explicitly requested
- No broad refactors outside scope
- No secret printing/logging
- Keep diffs small; prefer multiple iterations over one giant change
