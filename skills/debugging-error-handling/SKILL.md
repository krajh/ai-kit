---
name: debugging-error-handling
description: Fast triage and prevention patterns for tool/plugin/test failures with reproducible fixes, safe logging, and recurrence prevention.
---

# Debugging & Error Handling — Patterns That Prevent Repeat Failures

**Purpose:** Standardize how we diagnose failures (tools/plugins/tests) and turn fixes into durable prevention.

## When to use

- A tool crashes, a plugin breaks startup, tests fail unexpectedly
- You need a reproducible fix with minimal churn

## Triage sequence (fast)

1. **Localize:** which command/tool triggers it?
2. **Reduce:** smallest repro (one command, one file).
3. **Classify:** type error, runtime error, IO error, dependency, environment.
4. **Fix + guard:** add validation, better error message, or fallback.
5. **Prevent recurrence:** add a test and/or Mai issue entry.

## Common failure classes + fixes

### 1) "Works on my machine" / path issues

- Ensure tools use absolute paths or repo-root-relative paths
- Validate file existence before reading/writing
- Provide `[X]` message with the missing path

### 2) TypeScript typecheck friction (no tsconfig)

- Avoid fancy TS config assumptions
- Use explicit types at boundaries (`unknown` → narrow)
- Keep exports clean; avoid implicit any

### 3) Plugins crashing startup

- Move heavy work behind enable flags
- Wrap init in try/catch
- Prefer no-throw behavior: report `[X]` and disable

### 4) Secret leakage risk

- Never print env vars
- Redact tokens/keys if you must echo config snippets
- Prefer "loaded config keys: [a,b,c]" rather than values

## Error message rubric (high signal)

A good error includes:

- What failed
- Where (file/tool name)
- Why (likely cause)
- Next action (what the user should do)

Template:

```
[X] <component>: <action> failed
- Cause: <best guess>
- Next: <one concrete step>
```

## Example

```
[X] skill loading: skill not found
- Cause: missing `.opencode/skills/<name>/SKILL.md` or `~/.config/opencode/skills/<name>/SKILL.md`
- Next: verify directory name matches `name:` in SKILL.md frontmatter and that the skill appears in `<available_skills>`
```

## "Fix + Test + Note" pattern

- Fix the bug
- Add/adjust a test under `/tests`
- If it's a recurring class of bug: add a Mai "issue" entry with root cause + prevention
