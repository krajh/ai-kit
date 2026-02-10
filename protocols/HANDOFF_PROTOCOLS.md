# Agent Handoff Protocols - Lightweight

> **⚠️ SKILL AVAILABLE:** Consider using the `handoff-patterns` skill instead.  
> Load via: `skill({ name: "handoff-patterns" })`  
> This provides the same patterns in a more structured, on-demand format.

**Purpose:** Prevent context loss and rework when multiple agents touch the same mission.

---

## Handoff types

### 1) Sequential handoff (dependent phases)

Use when work must happen in order (design -> implement -> review -> test -> deploy).

Rules:

- Next agent validates previous output before proceeding.
- If validation fails, escalate with concrete findings.

### 2) Parallel handoff (independent workstreams)

Use when tasks are independent and can run concurrently.

Rules:

- Each agent has clear acceptance criteria.
- One integrator (usually `rias-queen`) owns merge/synthesis.

### 3) Mesh handoff (collaborative investigation)

Use for multi-domain problems (e.g., production mystery bugs).

Rules:

- Agents share intermediate findings early.
- Converge on one hypothesis tree; don't produce competing "final answers".

### 4) Escalation handoff (blockers)

Use when an agent cannot proceed due to missing decision/resource/uncertainty.

Rules:

- Escalate immediately; don't guess.
- Include context, what was tried, and options.

### 5) Verification gate (quality checkpoint)

Use before declaring anything "done".

Rules:

- Run relevant tests / checks.
- Ensure rollback plan exists for risky changes.

---

## Minimal handoff manifest (recommended)

Copy/paste into the next agent prompt to reduce token cost and prevent drift:

```text
HANDOFF
- GOAL: …
- CURRENT STATE: …
- DECISIONS: …
- FILES TOUCHED: …
- RISKS: …
- NEXT STEPS: …
- HOW TO VERIFY: …
```

---

## Protocol reference

Delegated work must follow **Delegation Protocols v1.3 (Jan 9, 2026)**.
