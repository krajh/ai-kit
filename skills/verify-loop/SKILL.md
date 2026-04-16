---
name: verify-loop
description: |
  Run verification loop to ensure work meets Definition of Done. Checks formatting, typechecking, tests, and console logging.
  Use before committing, after making changes, or as Definition of Done gate.
  Trigger phrases: "verify", "verify-loop", "quality gate", "definition of done", "check", "passes", "format check", "typecheck".
  Do NOT use for code implementation, debugging, or feature design.
allowed-tools:
  - bash
  - blocker-tracker
  - checkpoint
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

## Tips

- Always run before committing
- Use `type: "auto"` for mixed work
- Fix failures immediately — don't accumulate
- Type errors are the most common failure
