---
name: testing
description: |
  Enforces testing best practices: run tests with bun test, place tests in /tests/, and validate changes with smoke checks.
  Use when asked to "write tests", "check test coverage", or "follow testing guidelines".
  Trigger phrases: "test", "tests", "testing", "coverage", "bun test", "smoke check", "spec", "specs".
  Do NOT use for writing production code or designing system architecture.
tier: on-demand
---

# Testing

## Rule 1: Test Execution

- **ALWAYS** run tests with `bun test`
- **ALWAYS** use `bun test --pass-with-no-tests` in CI or when no tests exist
- **ALWAYS** ensure tests pass before considering work complete

## Rule 2: Test Placement

- **ALWAYS** put tests in `/tests/` directory
- **NEVER** put `*.test.ts` or `*.spec.ts` files in `/plugin/` (plugins auto-load at startup)
- **ALWAYS** follow the project's existing test organization patterns

## Rule 3: Validation Hygiene

- **ALWAYS** prefer small smoke checks after changes
- **ALWAYS** include command + outcome when reporting test results
- **NEVER** skip testing for "small changes" or "obvious fixes"

## When to Write Tests

Write tests when adding new functionality, fixing bugs, refactoring code, or working on security-critical paths.

Do NOT write tests when:

- User explicitly says tests aren't needed
- Documentation/config-only changes

## Test Design

- Prefer unit tests over integration tests to reduce flakiness
- Test edge cases: empty inputs, missing config, invalid args
- One clear purpose per test; deterministic; tests behavior not internals
- Assert `[OK]`/`[X]` outputs; cover error paths

## Report Format

```
[OK] All tests passing
Ran: bun test
Result: 42 passed, 0 failed
```
