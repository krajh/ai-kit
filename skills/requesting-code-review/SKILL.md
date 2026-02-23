---
name: requesting-code-review
description: "Use after significant changes to request a review; define scope, risks, and verification status."
---

# Requesting Code Review

## When to Use

- After significant changes
- Before merge/PR
- When asked for a review

## Reviewer

Use the repo’s code review agent (guillotine-reviewer) unless the user requests otherwise.

## Review Packet

Provide a concise packet:

- Summary of intent and changes
- Files/areas touched
- Risk areas or open questions
- Verification status (what was run)

## After Review

- Triage findings (critical/important/nice-to-have)
- Fix critical/important issues first
- Push back only with clear technical evidence
- Run `verify-loop` before claiming completion
