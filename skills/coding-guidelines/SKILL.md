---
name: coding-guidelines
description: |
  Apply when writing, modifying, or reviewing code. Behavioral guidelines to reduce common LLM coding mistakes. Triggers on implementation tasks, code changes, refactoring, bug fixes, or feature development.
---

# Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. These principles bias toward caution over speed—for trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them—don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- Disagree honestly. If the user's approach seems wrong, say so—don't be sycophantic.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it—don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**The test:** Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Edit Tool Best Practices

**Edit failures are mostly preventable. Follow these rules before calling `edit`.**

1. **ALWAYS read the file before editing.**
   - Avoids stale assumptions and "must-read-first" violations.
2. **Use enough surrounding context in `oldString`.**
   - Include 3–5 lines of surrounding context so the match is unique.
3. **Never send `oldString` identical to `newString`.**
   - Verify the strings differ to avoid no-op edits.
4. **Verify file paths with `glob` before editing.**
   - Many "oldString not found" errors come from wrong paths or stale content.
5. **Preserve exact indentation.**
   - Copy whitespace exactly as it appears in the file.
6. **Prefer `edit` over `write` for targeted changes.**
   - Use `write` only when creating a new file.

## 6. Compress Tool Boundary Selection

**Boundary uniqueness matters more than length. Use precise, unique strings.**

### Boundary String Selection Rules

- ✅ Include specific technical terms (tool names, file paths, function names)
- ✅ Include proper names (agent names, project names)
- ✅ Use exact code syntax for technical content
- ❌ Don't use generic agent phrases ("Let me", "Now we're talking", "Would you like")
- ❌ Don't use generic sign-offs ("Your call", "Just say the word")
- ❌ Don't pick strings from system-reminder tags or XML wrappers

### Pre-compress Checklist

- Does this phrase appear ONLY ONCE in the conversation?
- Is it from MY text or user text (not injected system text)?
- Is the `startString` BEFORE the `endString` in conversation order?
- Are both strings non-empty?

### Good vs Bad Examples

- ❌ BAD: `"Let me"` → too generic, appears many times
- ❌ BAD: `"Now we're talking"` → repeated agent personality phrase
- ✅ GOOD: `"session-analytics tool found 166 webfetch"` → unique technical content
- ✅ GOOD: `"Shall I start research first, then implement?"` → unique with clear intent
