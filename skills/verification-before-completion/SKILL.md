---
name: verification-before-completion
description: Use before claiming work is complete or passing; requires running verification commands and confirming output first.
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

1. **Identify** the command that proves the claim.
2. **Run** the full command (fresh).
3. **Read** the output and check exit status.
4. **Verify** the output supports the claim.
5. **Only then** make the claim.

Skip any step = no claim.

## Required Verification

For repo work, run `verify-loop` before claiming completion:

```bash
bun .opencode/tool/verify-loop.ts --type auto
```

Or use the command: `/verify-loop`

## Common Failures

| Claim          | Requires                        | Not Sufficient              |
| -------------- | ------------------------------- | --------------------------- |
| Tests pass     | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean   | Linter output: 0 errors         | Partial check               |
| Build succeeds | Build output: exit 0            | Linter passing              |
| Bug fixed      | Repro steps now pass            | Code changed                |

## Red Flags — STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/PR without verification
- Trusting agent reports
- Relying on partial verification

## Requirements Verification

- Re-read the plan or requirements
- Make a checklist
- Verify each item before claiming completion
- Run `verify-loop` as the final gate
