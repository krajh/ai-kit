# Testing ruleset

## Bun test conventions

- Run tests with `bun test`.
- In CI or when no tests exist, use `bun test --pass-with-no-tests`.

## Test placement (critical)

- Put tests in `/tests/`.
- Do not put `*.test.ts` / `*.spec.ts` in `/plugin/` (plugins auto-load at startup).

## Validation hygiene

- Prefer small smoke checks after changes (run the specific tool/script you touched).
- When reporting results, include command + outcome.
