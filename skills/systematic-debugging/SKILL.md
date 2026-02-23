---
name: systematic-debugging
description: "Use when encountering bugs, test failures, or unexpected behavior; requires root-cause investigation before proposing fixes."
---

# Systematic Debugging

## Overview

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find the root cause before attempting fixes.

## The Iron Law

```
NO FIXES WITHOUT ROOT-CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:

- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this especially when:**

- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**

- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check recent changes**
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather evidence in multi-component systems**
   - Log what data enters each component boundary
   - Log what data exits each component boundary
   - Verify environment/config propagation
   - Run once to gather evidence showing WHERE it breaks
   - Then investigate the failing component

5. **Trace data flow**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source
   - Fix at the source, not the symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find working examples**
   - Locate similar working code in the same codebase

2. **Compare against references**
   - If implementing a known pattern, read the reference completely

3. **Identify differences**
   - List every difference, however small

4. **Understand dependencies**
   - Required settings, config, environment
   - Assumptions the code makes

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form a single hypothesis**
   - "I think X is the root cause because Y"
   - Be specific, not vague

2. **Test minimally**
   - Make the smallest possible change to test the hypothesis
   - One variable at a time

3. **Verify before continuing**
   - If it worked → Phase 4
   - If not → form a new hypothesis (don’t stack fixes)

4. **When you don't know**
   - Say you don’t understand X
   - Ask for help or research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create a failing test or minimal reproduction**
   - Automated test if practical
   - One-off script or manual steps if not
   - Capture evidence before fixing

2. **Implement a single fix**
   - Address the root cause identified
   - One change at a time
   - No bundled refactoring

3. **Verify the fix**
   - Run the relevant tests/commands
   - Run `verify-loop` before claiming success
   - Include command + result in report

4. **If the fix doesn't work**
   - STOP
   - Return to Phase 1 with new information
   - If three fixes fail, pause and re-evaluate the architecture with your partner

## Red Flags — STOP and Follow the Process

- "Quick fix for now, investigate later"
- "Just try changing X and see"
- "Skip the test, I’ll manually verify"
- "It’s probably X, let me fix that"
- Proposing solutions before tracing data flow

## Communication

- **One question at a time** - When clarifying the issue, ask single questions
- **Status tags** - Use `[OK]`, `[!]`, `[X]` in reports
- **Evidence required** - Never claim "fixed" without running verification

## Supporting Techniques

- Trace data flow backward to find the original trigger
- Add validation at component boundaries after root cause is found
- Replace arbitrary waits with condition-based checks
