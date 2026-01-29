---
name: protocol-verify
description: Verify delegation protocol compliance (acknowledgment, reporting, sequential work, escalation)
agent: rias-queen
---

# Protocol Verify

Use this to quickly confirm delegations follow **Delegation Protocols v1.3 (Jan 9, 2026)**.

## Use when

- Before delegating complex work
- After a delegation if you suspect drift
- During enforcement (`/check-protocols`, `/cp`)

## How to verify compliance

### 1. Check Delegation Prompt Includes v1.3 Requirements

**MANDATORY PROTOCOLS block must include:**

- Acknowledgment requirement: "Protocols acknowledged, beginning work."
- STATUS UPDATE format (COMPLETED/STARTING/CONTINUING/PROGRESS/BLOCKERS/ETA)
- SKILL CHECK requirement (first STATUS UPDATE only)
- Escalation formats (ESCALATION TO RIAS, QUESTION FOR RIAS/MASTER)
- Cross-session return-control block (for blockers requiring approval)
- Sequential work requirement (one task at a time)

### 2. Check Agent's First Message

**Must include:**

- Explicit acknowledgment: "Protocols acknowledged, beginning work."
- Initial STATUS UPDATE
- SKILL CHECK (loaded skills or "none applicable")

### 3. Check Ongoing Updates

**Every checkpoint must include:**

- STATUS UPDATE with all required fields
- Concrete progress (files changed, commands run, results)
- Escalation when blocked/uncertain (not guessing)

### 4. Check Sequential Work

**Agent must:**

- Work on ONE task at a time
- Complete current task before starting next
- Report after each checkpoint
- Break large tasks into explicit sub-tasks

## Turn-Based Monitoring (OpenCode Compatible)

**Use these tools for compliance monitoring:**

- `status-snapshot` - Check task status from `.opencode/status.json`
- `blocker-tracker` - Track open blockers with duration
- Manual review - Check agent messages for protocol adherence

**Backstop cadence:**

- `status-snapshot` every 3 coordinator turns
- `blocker-tracker` every 5 coordinator turns

**Note:** OpenCode agents are stateless (task-based), so use turn-based monitoring instead of time-based heartbeats.

## Output Format

**Compliance check result:**

```
[OK] Protocol compliance verified
- Acknowledgment: present
- STATUS UPDATE format: correct
- SKILL CHECK: present
- Sequential work: confirmed
- Escalation format: correct

OR

[X] Protocol violations detected
- Missing: [acknowledgment / SKILL CHECK / STATUS UPDATE fields]
- Issue: [specific violation]
- Action: [re-delegate / coach / escalate]
```

## Common Violations & Fixes

| Violation                    | Fix                                                    |
| ---------------------------- | ------------------------------------------------------ |
| No acknowledgment            | Remind: "Protocols acknowledged, beginning work."      |
| Missing SKILL CHECK          | Remind: "Include SKILL CHECK on first STATUS UPDATE"   |
| Vague progress               | Require: files changed, commands run, concrete results |
| Parallel work                | Stop: "Complete current task before starting next"     |
| No escalation on uncertainty | Remind: "Uncertainty = blocker; escalate with options" |
| Wrong escalation format      | Provide: correct template from protocols               |

## Related

- `delegation-orchestration` - Full coordination playbook
- `protocol-compliance-v13` - Agent-side compliance guide
- `protocols/DELEGATION_PROTOCOLS.md` - Canonical protocol document
