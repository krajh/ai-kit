---
name: status-snapshot
description: |
  Show a snapshot of local work status from .opencode/status.json. Displays in-progress, blocked, pending, and completed items.
  Use when checking project status, getting a quick overview, or when the user asks to "status", "snapshot", "what's working on", "progress", "standup".
  Trigger phrases: "status", "snapshot", "progress", "standup", "what's working", "in-progress", "blocked items".
  Do NOT use for code implementation, debugging, or testing.
---

# Status Snapshot

Quick status overview from `.opencode/status.json`.

## Usage

```typescript
// Default text format
status - snapshot();

// Markdown (for checkpoints and reports)
status - snapshot({ format: "markdown" });

// HUD — unified project overview
status - snapshot({ format: "hud" });

// Limit items per section
status - snapshot({ limit: 10 });
```

**Format guidance:**

- `text` — quick status check, standups
- `markdown` — formal checkpoint reports
- `hud` — "what's the state of everything" at a glance

## Output (text format)

```
[OK] Status snapshot (2024-01-15T10:30:00.000Z)
Counts: in_progress=3 blocked=1 pending=2 completed=8

--- IN PROGRESS (3) ---
- [FEAT-1] Add dark mode toggle @mittelt-frontend
- [FEAT-2] Implement payment flow @marin-coder — Waiting for API

--- BLOCKED (1) ---
- [BLOCK-1] Database migration failing @xenovia-backend — Foreign key constraint

--- PENDING (2) ---
- [TASK-3] Write tests for auth

--- COMPLETED (8) ---
- [FEAT-0] Initial project setup
```

## Status Categories

| Status      | Description                   |
| ----------- | ----------------------------- |
| In Progress | Currently being worked on     |
| Blocked     | Cannot proceed — needs action |
| Pending     | Queued, not yet started       |
| Completed   | Done                          |

## Tips

- Check BLOCKED section first — it needs attention
- Items sorted by most recent update
