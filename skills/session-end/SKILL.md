---
name: session-end
description: |
  Comprehensive session closure. Logs lessons, persists decisions, creates checkpoint, updates memory.
  Trigger phrases: "end session", "log lesson", "save context", "checkpoint", "capture summary".
  Do NOT use for code implementation, debugging, or mid-session work.
tier: on-demand
---

# Session End Skill

## When to Use

**ALWAYS run at session end** when:
- Significant work was completed
- Lessons were learned that should persist
- Decisions were made needing cross-session continuity
- Blockers should be recorded for next session
- Next steps need explicit capture

**Minimum:** `session_summary` + at least one of (`lessons`, `decisions`, `next_steps`).

## Operations

| Op | When | Output |
|---|---|---|
| `summary` | Quick check-in, no new learnings | Session stats only |
| `log` | Lessons learned | → self-improve |
| `wisdom` | Decisions needing persistence | → Frieren wisdom plane |
| `checkpoint` | Work state needs rescue point | Snapshot saved |
| `full` | Default — session has meaningful work | All of above |

## Usage

```typescript
session_end({
  op: "full",
  session_summary: "What happened this session",
  lessons: "lesson1;lesson2",
  decisions: "decision1",
  next_steps: "step1",
  focus: "current focus area",
  blockers: "any blockers",
});
```

## Failure Handling

- Log to stderr, continue remaining steps
- Report which steps succeeded vs failed
- Never block on partial failure — capture what you can

## Integration Points

- **self-improve**: Lessons written via CLI
- **Frieren**: Call `gremory-armoury_frieren_wisdom_write` directly
- **checkpoint**: Call directly if `.opencode/status.json` has `blocked` items

## Quality Gates

- `session_summary` required
- Each `lesson` needs specific actionable content
- `next_steps` must be concrete enough for next session to act on
