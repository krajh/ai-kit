---
name: prompt-caching
description: |
  Maximizes prompt cache hit rate by enforcing stable ordering and avoiding mid-conversation mutations.
  Use when noticing increasing latency within a session, frequent skill reloads, or re-querying cached data.
  Do NOT use for changing agent behavior or modifying core instructions.
tier: always
---

# Prompt Caching

Ensures stable prompt prefixes to maximize cache efficiency and reduce latency/cost.

## Rule 1: No Mid-Session Skill Reloading

- **NEVER** call `skill({ name: "..." })` for a skill already loaded this session
- Skills loaded at session start remain loaded for the entire session
- Only load **NEW** skills not in the initial set

## Rule 2: No Re-querying Cached Context

- **NEVER** re-call `frieren_wisdom_search`, `frieren_session_recall`, or `memory` search for queries already answered in current window
- If answer is in conversation context, **use it** — don't fetch again

## Rule 3: Stable System Prompt Ordering

Do not reorder (ordered for cache-friendliness):

1. **Agent identity** (rarely changes)
2. **Rulesets** (changes only between sessions)
3. **Skills** (loaded once at session start)
4. **Memory** (appended, never reordered)
5. **Working files** (most volatile, at end)

## Rule 4: No Toolset Mutations Mid-Session

- **NEVER** add or remove tools during a session
- If tool becomes unavailable, note it and work around it

## When to Load New Skills

**Load when:** current task requires capabilities not in loaded skills, trigger phrases match, confirmed not already loaded.

**Don't load when:** equivalent capability exists, request handled with current set, unsure (check first).

## Minimizing Skill Loading

- Load **1–3 on-demand/specialist skills per task** (not more)
- `always`-tier skills are ambient — excluded from count
- Each additional skill increases prefix size, reduces cache efficiency
