---
description: "Run verification loop (Definition of Done)"
usage: "bun tools/verify-loop.ts [options]"
integration:
  - blocker-tracker: creates/updates blocker on failure
  - checkpoint: creates checkpoint on success
  - roadmap: Completion Proof for updateroadmap
---

# verify-loop

Run verification loop to ensure work meets **Definition of Done**.

## Quick Start

```bash
bun tools/verify-loop.ts --type auto
```

## Options

| Flag | Shorthand | Description |
|---|---|---|
| `--type <type>` | `-t` | Work type: `tool`, `plugin`, `doc`, or `auto` (default: `auto`) |
| `--spec <path>` | `-s` | Optional semantic gate using acceptance criteria from spec.md/plan.md |
| `--checkpoint-name <name>` | `-c` | Create checkpoint with this name if all checks pass |
| `--effort <level>` | `-e` | Effort level: `f1`, `f2`, or `f3` (for Crimson Seal) |
| `--guillotine-passed` | `-g` | Confirm Guillotine review done (required for f2/f3 completion) |
| `--skip-console-logging` | `-s` | Skip console logging check (for non-opencode repos) |
| `--skip-circuit-breaker` | | Ignore persisted failure state and force execution |
| `--dry-run` | `-d` | Simulate gate outcomes from file analysis (no command execution) |
| `--version` | `-v` | Print verify-loop version and exit |
| `--help` | `-h` | Show this help message |

## Examples

```bash
# Version info
bun tools/verify-loop.ts --version

# Auto-detect work type
bun tools/verify-loop.ts --type auto

# With semantic gate
bun tools/verify-loop.ts --type auto --spec ./docs/plan.md

# With checkpoint
bun tools/verify-loop.ts --type tool --checkpoint-name 'my-checkpoint'

# F2 work (requires Guillotine review)
bun tools/verify-loop.ts --type plugin --effort f2
# ... run Guillotine review, fix findings ...
bun tools/verify-loop.ts --effort f2 --guillotine-passed  # after Guillotine review

# For non-opencode repos
bun tools/verify-loop.ts --type auto --skip-console-logging

# Dry run (simulate only)
bun tools/verify-loop.ts --type auto --dry-run
```

## Checks by Work Type

| Check | Tool | Plugin | Doc |
|---|---|---|
| format | ✅ | ✅ | - |
| typecheck | ✅ | ✅ | - |
| test | ✅ | ✅ | - |
| console logging | ✅ | ✅ | - |
| doc policy | - | - | ✅ |

> **PM-agnostic:** auto-detects package manager (bun/pnpm/npm/yarn) from lockfiles.

## Semantic Gate (Optional)

When `--spec` is provided, validates implementation against acceptance criteria extracted from `spec.md`/`plan.md`.

Criteria are extracted from bullet/numbered lists under headings containing: `acceptance criteria`, `done`, or `requirements`.

The gate uses LLM evaluation and emits `PASS`/`FAIL` in the verification report.

## F2/F3 Crimson Seal

For medium+ complexity work (f2/f3), a **Guillotine review** is mandatory before the Completion Proof is emitted.

```bash
bun tools/verify-loop.ts --effort f2  # fails at guillotine gate
# ... run Guillotine review, fix findings ...
bun tools/verify-loop.ts --effort f2 --guillotine-passed  # emits Completion Proof
```

The Guillotine gate is hidden until all other checks pass — no point reviewing broken code.

## Integration

### With Roadmap

After completing a roadmap action:

1. Run `verify-loop` — all checks must pass
2. Copy the **Completion Proof** from the report
3. Run `updateroadmap(actionNumber='N.NN', status='completed', note='<paste Completion Proof>')`

### With Checkpoint

```bash
bun tools/verify-loop.ts --checkpoint-name "my-milestone"
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

```bash
bun tools/verify-loop.ts --dry-run
```

Simulates verification from file analysis without executing commands:

- **format:** checks for trailing whitespace, merge conflicts
- **typecheck:** parses files with Bun transpiler
- **test:** checks for `.only()` test focus
- **semantic:** extracts criteria only, skips LLM evaluation

## Agent Integration

This tool is designed for use by:
- **coordinator** — orchestrating multi-step work
- **strategist** — validating architectural decisions
- **implementer** — verifying implementation before commit
- **reviewer** — checking PR quality
- **research** — validating research artifacts
- **architect** — ensuring design compliance

## Output Format

The verification report includes:

1. **Summary line** — PASS/FAIL, work types, duration
2. **Project roots** — PM and changed file counts
3. **Semantic gate** (if `--spec` provided)
4. **Gate table** — status of each check
5. **Failures** (if any) — detailed output and remedies
6. **Next Action** — what to do next
7. **Completion Proof** (on success) — for roadmap integration
