---
name: security-best-practices
description: |
  Perform language and framework specific security best-practice reviews and suggest improvements.
  Use when the user explicitly requests security best practices guidance, a security review/report, or secure-by-default coding help.
  Trigger phrases: "security best practices", "secure coding", "security review", "vulnerability", "secure-by-default", "OWASP".
  Do NOT use for general code review, debugging, or non-security tasks.
---

# Security Best Practices

## Overview

Identify all languages and frameworks in the project scope. Then apply security best practices for those technologies.

## Workflow

1. **Identify** — Determine all languages and frameworks in the project
2. **Apply** — Use security best practices for the identified technologies
3. **Detect** — Passively flag critical vulnerabilities while working
4. **Report** — If requested, produce a prioritized security report

## General Security Advice

### Avoid Using Incrementing IDs for Public IDs

When assigning IDs exposed to the internet, use UUID4 or random hex strings instead of auto-incrementing IDs. This prevents users from learning resource quantities and guessing IDs.

### TLS Warning

Be careful about reporting lack of TLS as a security issue in development environments. Most dev work uses TLS disabled or provided by a proxy. Also be cautious with "secure" cookies — they MUST only be set over TLS.

## Passive Detection Guidelines

- Focus on **critical and high-severity** vulnerabilities
- Report passively found issues to the user, ask if they want fixes
- Avoid fighting with the user if they choose to bypass a best practice

## Report Format (if requested)

When producing a security report:

1. **Executive summary** at the top
2. **Severity sections** — Critical → High → Medium → Low
3. **Line numbers** when referencing code
4. **Impact statement** for each critical finding

## Fixes

- Fix one finding at a time
- Include comments explaining the security rationale
- Assess second-order impacts before making changes
- Follow project's existing change/commit flow
