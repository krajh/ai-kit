---
name: verify-loop
description: |
  Run verification loop to ensure work meets Definition of Done. Checks formatting, typechecking, tests, and doc policy.
  Use before committing, after making changes, or as Definition of Done gate.
  Trigger phrases: "verify", "verify-loop", "quality gate", "definition of done", "check", "passes", "format check", "typecheck".
  Do NOT use for code implementation, debugging, or feature design.
keywords: ["verify", "quality gate", "definition of done", "format", "typecheck", "tests", "doc policy", "completion proof"]
allowed-tools:
  - bash
  - blocker-tracker
  - checkpoint
compatibility:
  agents:
    - coordinator
    - strategist
    - implementer
    - reviewer
    - research
    - architect
---

# Verify Loop Skill

## Overview

Runs standardized checks based on work type:

- **Tools:** format, typecheck, tests, console logging
- **Plugins:** format, typecheck, tests, console logging
- **Docs:** documentation policy
- **Auto:** detects work type from git diff

Integrates with blocker-tracker (creates blockers on failure) and checkpoint (creates checkpoints on success).

## Usage

### Auto-Detect Work Type

```
verify-loop({ type: "auto" });
```

### Specify Work Type

```
verify-loop({ type: "tool" });
verify-loop({ type: "plugin" });
verify-loop({ type: "doc" });
```

## Checks by Work Type

| Check           | Tool | Plugin | Doc |
| --------------- | ---- | ------ | --- |
| format          | ✅   | ✅     | -   |
| typecheck       | ✅   | ✅     | -   |
| test            | ✅   | ✅     | -   |
| console logging | ✅   | ✅     | -   |
| doc policy      | -    | -      | ✅  |

> **PM-agnostic:** auto-detects package manager (bun/pnpm/npm/yarn) from lockfiles.

## Check Details

### format

Runs `fmt`, `format`, or `lint` script from `package.json`. Skip if none defined.

### typecheck

Runs `typecheck` or `type-check` script, or falls back to `tsc --noEmit` if `tsconfig.json` exists.

### test

Runs test suite via `test` script (vitest/jest/mocha). Falls back to `bun test --pass-with-no-tests` only when PM is bun.

### console logging

Checks for `console.log/debug/info/warn/error` in tools/plugins. Fail if found.

## Semantic Gate (Optional)

When `--spec` is provided, validates implementation against acceptance criteria extracted from `spec.md`/`plan.md`.

```
verify-loop({ spec: "./docs/plan.md" });
```

Criteria are extracted from bullet/numbered lists under headings containing: `acceptance criteria`, `done`, or `requirements`.

The gate uses LLM evaluation and emits `PASS`/`FAIL` in the verification report.

## F2/F3 Crimson Seal

For medium+ complexity work (f2/f3), a **Guillotine review** is mandatory before the Completion Proof is emitted.

```
verify-loop({ effort: "f2" });  // fails at guillotine gate
// ... run Guillotine review, fix findings ...
verify-loop({ effort: "f2", guillotinePassed: true });  // emits Completion Proof
```

The Guillotine gate is hidden until all other checks pass — no point reviewing broken code.

## Integration

### With Roadmap

After completing a roadmap action:

1. Run `verify-loop` — all checks must pass
2. Copy the **Completion Proof** from the report
3. Run `updateroadmap(actionNumber='N.NN', status='completed', note='<paste Completion Proof>')`

### With Checkpoint

```
verify-loop({ checkpointName: "my-milestone" });
```

Creates `.opencode/checkpoints/latest.json` on success.

### With Blocker Tracker

On failure, creates/updates a blocker in `.opencode/status.json` with:

- **Title:** `verification-loop failure: <failed checks>`
- **Note:** Full failure output for each failed check
- **Status:** `open`

## Error Handling

### Circuit Breaker

After 3 consecutive failures, the circuit breaker trips and blocks further verification:

```
[X] circuit breaker tripped after 3 consecutive verify-loop failures
Last error encountered: <last error>
Suggestion: inspect the last error, fix the root cause, then retry verify-loop.
```

**Reset:** A successful verify-loop run automatically resets the circuit breaker.

**Override:** Pass `--skip-circuit-breaker` to force execution.

### Dry Run

```
verify-loop({ dryRun: true });
```

Simulates verification from file analysis without executing commands:

- **format:** checks for trailing whitespace, merge conflicts
- **typecheck:** parses files with Bun transpiler
- **test:** checks for `.only()` test focus
- **semantic:** extracts criteria only, skips LLM evaluation

## Tips

- Always run before committing
- Use `type: "auto"` for mixed work
- Fix failures immediately — don't accumulate
- Type errors are the most common failure
- For non-opencode repos, use `skipConsoleLogging: true`
