---
name: output-discipline
description: |
  Enforces skimmable, structured outputs with consistent status tags and minimal dumps.
  Use when asked to "improve output clarity", "make outputs skimmable", or "avoid huge dumps".
  Trigger phrases: "output clarity", "skimmable", "avoid huge dumps", "structured output", "clean output".
  Do NOT use for content generation or creative writing tasks.
license: MIT
tier: always
---

# Output Discipline

## Zone 1 — Deterministic Rules

### Rule 1: Status Tags Required

All status indications MUST use exactly:

- `[OK]` — success, completion, positive confirmation
- `[!]` — warning, important notice, attention needed
- `[X]` — error, failure, blocked item, negative outcome

### Rule 2: No Huge Dumps

- **Maximum 20 lines** for any single excerpt
- **Always summarize** and point to file paths/commands instead of dumping
- If more context is needed: `See [file/path] for full output`

### Rule 3: Skimmability Requirements

Outputs MUST be scannable in <10 seconds:

- Lead with the most important information
- Use bullet points, not paragraphs
- Bold key terms only when essential
- One idea per line or sentence

## Zone 2 — Agent Judgment

**Summarize when:** output exceeds 20 lines; content is repetitive; user needs the gist.

**Quote minimally when:** exact error messages needed for debugging; user explicitly asks for verbatim output.

**Minimality test:** "If I removed this line, would the user still understand the key point?" If yes → omit.

## Validation Checklist

- [ ] Uses only `[OK]`, `[!]`, `[X]` tags (no variants)
- [ ] No single excerpt exceeds 20 lines
- [ ] Key information scannable in <10 seconds
- [ ] Leads with most important information
- [ ] Points to sources instead of embedding large content

## Reference: Good Output

```
[OK] Authentication flow updated

Changes:
- Added rate limiting to login attempts (max 5/min)
- Implemented email verification requirement
- Updated password reset token expiry to 30m

Files modified: src/auth/login.ts, src/auth/email-service.ts
See git diff for exact changes.
```
