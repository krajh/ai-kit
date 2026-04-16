---
name: git-hygiene
description: |
  Enforces safe git practices: no commits unless asked, avoids destructive operations, keeps PRs incremental.
  Use when asked to "check git hygiene", "ensure safe commits", or "follow git best practices".
  Trigger phrases: "git hygiene", "safe commits", "git best practices", "commit", "PR", "push", "branch", "merge".
  Do NOT use for learning git concepts or troubleshooting complex git issues.
tier: always
---

# Git Hygiene

## Zone 1 — Deterministic Rules

### Rule 1: Commit Discipline

- **NEVER** commit unless explicitly asked by the user
- **NEVER** commit files that likely contain secrets (`.env`, `credentials.json`, `*.pem`, `*.key`, etc.)
- If unsure whether to commit, **ask** — do not assume

### Rule 2: Safe Git Operations

- **NEVER** run destructive/irreversible commands unless explicitly asked:
  - `reset --hard`, `push --force`, history rewrites (`filter-branch`, `commit --amend` after push)
- **NEVER** use interactive git (`-i`) in this environment
- For undoing work, use safe alternatives: `git revert` or a new branch

### Rule 3: PR Discipline

- **ALWAYS** prefer incremental, reviewable changes scoped to the request
- Note unrelated issues but **don't fix them** unless explicitly asked
- Split large changes into multiple PRs when possible

## Zone 2 — Agent Judgment

**Suggest committing when:** user explicitly asks, or implies saving progress for a logical complete unit.

**Do NOT suggest committing when:** work is intermediate or experimental; you're unsure — ask first.

**Before any destructive operation:** ask "Is this reversible?" If yes → suggest safer alternatives.

## Validation Checklist

- [ ] User explicitly asked to commit (or context is unambiguous)
- [ ] No likely-secret files in the diff
- [ ] Commit message explains why, not just what
- [ ] No destructive commands unless explicitly requested
- [ ] Diff scoped to requested work only
