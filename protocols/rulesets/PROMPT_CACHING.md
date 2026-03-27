# Prompt Caching Policy

**Purpose:** Maximize prompt cache hit rate by enforcing stable ordering and avoiding mid-conversation mutations.

**Scope:** All agents (coordinator and specialists), all sessions.

**Effective Date:** March 23, 2026

---

## Core Principle

**Never break prompt caching mid-conversation.**

LLM providers cache the prompt prefix. Any change to the prefix invalidates the cache, increasing latency and cost. Treat the prompt as immutable once the conversation starts.

---

## Hard Rules

### 1. No mid-conversation skill reloading

- Do not call `skill({ name: "..." })` for a skill that was already loaded in this session
- If a skill was loaded at session start, it stays loaded
- Only load NEW skills that weren't in the initial set

### 2. No re-querying cached context

- Do not re-call `frieren_wisdom_search`, `frieren_session_recall`, or `memory` search for queries already answered in the current window
- If the answer is in context, use it — don't fetch it again
- Cache Frieren results in conversation memory rather than re-querying

### 3. Stable system prompt ordering

The system prompt is ordered for cache-friendliness:

1. **Agent identity** (rarely changes)
2. **Rulesets** (changes only between sessions, not within)
3. **Skills** (loaded once at session start, stable within session)
4. **Memory** (appended, never reordered)
5. **Working files** (most volatile, at the end)

Do not reorder these sections or inject volatile content into stable sections.

### 4. No toolset mutations mid-session

- Do not add or remove tools from the available set during a session
- If a tool becomes unavailable, note it and work around it — don't reload the tool registry
- Tool discovery happens once at startup

---

## Soft Rules

### 5. Minimize skill loading

- Load 1–3 skills per task, not more
- Loading more skills than needed increases the prefix size and reduces cache efficiency
- Prefer focused skill loading over comprehensive loading

### 6. Batch memory writes

- Batch `frieren_wisdom_write` calls rather than making many small writes
- Each write changes the conversation state; batching reduces churn

### 7. Avoid unnecessary tool calls

- If you already have the answer in context, don't call a tool to confirm it
- Prefer reading from context over re-fetching from disk/network

---

## What Breaks Caching

| Action                             | Cache Impact                   | Alternative                     |
| ---------------------------------- | ------------------------------ | ------------------------------- |
| Loading a new skill mid-session    | Breaks cache for skill section | Load all needed skills at start |
| Re-querying Frieren for known data | Adds tokens to prefix          | Use conversation memory         |
| Injecting system messages          | Appends to prefix (mild)       | Use sparingly                   |
| Reordering prompt sections         | Breaks entire prefix           | Keep stable ordering            |
| Adding new tools mid-session       | Breaks tool section            | Not supported — restart session |

---

## Monitoring

Signs of cache inefficiency:

- Increasing response latency within a session
- Token usage higher than expected for simple follow-ups
- Frequent skill loading/unloading

If you suspect cache issues, note the session ID and check `session-analytics` for token breakdown.

---

## Related Policies

- **Skill Loading** (`AGENTS.md` § Skills) — how skills are loaded at session start
- **Memory Model** (`AGENTS.md` § 5) — 3-tier memory and when to query each
- **Performance** (`protocols/rulesets/PERFORMANCE.md`) — general performance rules
