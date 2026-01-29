---
name: opencode-plugin-authoring
description: Safety-first patterns for authoring `plugin/*.ts` runtime plugins that don't break startup, leak secrets, or run heavy work at import-time.
---

# Authoring a Runtime Plugin (`plugin/*.ts`) — Safety-First Pattern

**Purpose:** Create runtime plugins that are stable at startup, predictable, and don't accidentally execute test code or heavy work.

## When to use

- Creating/refactoring `plugin/*.ts`
- Adding startup hooks, message transforms, or runtime integrations

## Hard rules (this repo)

- **Do not** put `*.test.ts` / `*.spec.ts` in `/plugin/` (auto-loaded).
- Keep plugin initialization fast and side-effect minimal.
- Prefer feature flags / config checks before doing anything heavy.

## Plugin design checklist

- [ ] Minimal work at import-time (top-level)
- [ ] Explicit enable/disable via config/env
- [ ] Defensive error handling (plugin should fail "softly")
- [ ] Logging is concise; no token-costly dumps
- [ ] No secrets in logs

## Recommended skeleton

```ts
export function init() {
  try {
    const enabled = process.env.OPENCODE_MY_PLUGIN_ENABLED === "1";
    if (!enabled) return;

    // register hooks / listeners
  } catch (error) {
    // fail softly; don't crash the host
    console.error("[X] my-plugin init failed:", error);
  }
}
```

## Configuration pattern

- Prefer reading from `opencode.json` (project) and `~/.config/opencode/opencode.json` (user) when you need configuration.
- If config loading is expensive, cache it.

## Reliability patterns

- Timeouts for external calls (if any)
- Circuit-breaker behavior: after N failures, disable until restart
- Fallbacks: degraded behavior rather than crashing

## Examples of "good plugin work"

- Light transform: add a header/footer to prompts
- Guardrail: detect forbidden doc filenames before write
- Telemetry: record tool timings (bounded, redacted)

## Examples of "bad plugin work"

- Running network calls on import
- Writing files unconditionally at startup
- Dumping full prompts/responses into logs
