---
name: verification-and-tests
description: Definition-of-Done workflow using `verify-loop` plus Bun formatting, typecheck, and tests; includes placement rules and reporting expectations.
---

# Verification & Tests — `verify-loop` and Bun Test Workflow

**Purpose:** Make Definition-of-Done deterministic for tools/plugins/docs: format, typecheck, tests, and policy checks.

## When to use

- Before declaring a tool/plugin "done"
- When CI-equivalent local checks are needed
- When reviewing PR readiness

## The repo's verification commands

- Format: `bun fmt`
- Typecheck (best-effort): `bunx tsc --noEmit --pretty false`
- Tests: `bun test`
- Unified gate: `bun .opencode/tool/verify-loop.ts --type auto`

## Work-type rules

### Tool (`.opencode/tool/*.ts`)

Must pass:

- `bun fmt`
- `bunx tsc --noEmit`
- `bun test`
- Manual run of the tool
- Output tags: `[OK]`, `[!]`, `[X]`

### Plugin (`plugin/*.ts`)

Must pass:

- `bun fmt`
- `bunx tsc --noEmit`
- `bun test`
- Runtime sanity check (plugin doesn't crash on load)

### Docs

Must pass:

- No forbidden patterns (e.g. `*SUMMARY.md`, `*IMPLEMENTATION*.md`, `*COMPLETE.md`)
- Coherent updates to existing canonical docs (don't add bloat)

## Test placement rules (critical)

- ✅ Put tests in `/tests/`
- ❌ Do not put `*.test.ts` / `*.spec.ts` in `/plugin/`

## Test design patterns (cost-conscious)

- Prefer unit tests over integration tests when possible
- Mock filesystem/IO if it avoids flakiness
- Assert **outputs** and **error messages** (especially `[X]` paths)
- Cover edge cases: empty dirs, missing config, invalid args, huge file guardrails

## Example: Tool test checklist

- [ ] Valid inputs return `[OK]`
- [ ] Missing path returns `[X]` with actionable next step
- [ ] Unknown arg rejected (schema)
- [ ] Large output is truncated or redirected safely

## Example workflow (before reporting "COMPLETED")

1. Run `bun .opencode/tool/verify-loop.ts --type auto`
2. If fail: fix issues, re-run
3. Report exact output summary (no huge dumps), e.g.:
   - `bun fmt: OK; tsc: OK; bun test: OK; verify-loop: OK`
