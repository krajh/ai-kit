---
name: checkpoint
description: |
  Create a checkpoint snapshot of current work state. Captures git status, changed files, recent commits, and optionally syncs to Frieren. Essential for session continuity.
  Use when saving work state, creating a snapshot before risky changes, or when the user asks to "checkpoint", "snapshot", "save state", "capture work".
  Trigger phrases: "checkpoint", "snapshot", "save state", "capture work", "before I try", "save progress", "backup".
  Do NOT use for debugging, testing, or code review.
---

# Checkpoint

Capture work state to `.opencode/checkpoints/latest.json`.

## Usage

```typescript
// Basic
checkpoint({ name: "Before auth refactor" });

// With context
checkpoint({
  name: "Auth refactor checkpoint",
  focus: "src/auth/*",
  note: "JWT tokens working, need refresh logic",
});

// Full diff
checkpoint({
  name: "Complete state",
  includeDiff: "full",
  maxDiffChars: 80000,
});

// Sync to Frieren (for cross-session recovery)
checkpoint({ name: "Feature complete", focus: "Payment flow", sync: true });
```

## Options

| Option         | Type    | Default                             | Description                  |
| -------------- | ------- | ----------------------------------- | ---------------------------- |
| `name`         | string  | (required)                          | Checkpoint name              |
| `focus`        | string  | null                                | Focus area / context         |
| `note`         | string  | null                                | Optional notes               |
| `includeDiff`  | enum    | `"stat"`                            | `"none"`, `"stat"`, `"full"` |
| `maxDiffChars` | number  | 40000                               | Max chars for full diff      |
| `outPath`      | string  | `.opencode/checkpoints/latest.json` | Output file path             |
| `sync`         | boolean | false                               | Sync to Frieren              |
| `createdBy`    | string  | `"Kai"`                             | Creator field for sync       |

## When to Use

- Before risky operations (refactors, migrations)
- Between phases requiring human review
- Session handoff (use `sync: true`)
- Milestone capture
