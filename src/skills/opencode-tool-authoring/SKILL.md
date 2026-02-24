---
name: opencode-tool-authoring
description: Standards and templates for authoring reliable `.opencode/tool/*.ts` tools in this repo (Bun+TS), with good error handling, output discipline, and tests.
---

# Authoring an OpenCode Tool (`.opencode/tool/*.ts`) — Production Pattern

**Purpose:** Build reliable, cost-conscious tools that behave well in this repo's Bun+TS environment.

## When to use

- Creating or refactoring `.opencode/tool/*.ts`
- Adding new automation for status/checkpoints/skills/workflows

## Repo conventions to follow

- Runtime: **Bun + TypeScript**
- Formatting: `bun fmt` (no ESLint/Prettier config)
- Typecheck: best-effort `bunx tsc --noEmit --pretty false` (no tsconfig)
- Tests: `bun test`, tests must live under `/tests`  
  **Do not** place `*.test.ts` in `/plugin/` (auto-loaded at startup)

## Tool quality bar (minimum)

- Clear `[OK]` / `[!]` / `[X]` output tags
- Actionable error messages (include what failed + next step)
- No secret leakage (never print env vars or tokens)
- Safe IO: validate paths; avoid destructive operations by default
- Minimal output: summaries > full dumps

## Recommended structure (template)

```ts
import { tool } from "@opencode-ai/plugin";

interface Args {
  foo?: string;
}

export default tool({
  name: "my-tool",
  description: "Does one specific thing",
  parameters: {
    type: "object",
    properties: {
      foo: { type: "string" },
    },
    additionalProperties: false,
  },
  async execute(args: Args) {
    try {
      // validate args
      // do work
      return `[OK] my-tool\n…`;
    } catch (error) {
      return `[X] my-tool error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
```

## Error-handling patterns

- Wrap async IO in `try/catch`
- When calling `Bun.$`, capture `.text()` and include context on failure
- Prefer "soft failures" with guidance over throwing raw errors

Example:

```ts
try {
  const out = await Bun.$`git status --short`.text();
  return `[OK] git status\n${out}`;
} catch (error) {
  return `[X] Failed to run git status. Is git installed?\n${String(error)}`;
}
```

## Input validation patterns

- Reject unknown fields: `additionalProperties: false`
- Validate paths: only allow within repo root if writing
- Validate enums with explicit union types

## Output discipline (cost + UX)

- Default to **summaries**
- If output can be large: print the first N lines and mention where the full content is written (file path)

## Example workflow (new tool)

1. Implement tool file.
2. Add tests under `/tests/`.
3. Run:
   - `bun fmt`
   - `bunx tsc --noEmit --pretty false`
   - `bun test`
4. Run the tool manually (restart OpenCode if needed).
5. Confirm output uses `[OK]/[X]`.
