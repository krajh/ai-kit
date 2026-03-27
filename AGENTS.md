# AGENTS.md — ai-kit Project Guide

**Repo:** OpenCode corporate kit
**Runtime:** Bun + TypeScript

> **Shared protocols** (commands, conventions, layout rules, verification, delegation, agent routing) live in `~/.config/opencode/AGENTS.md`. This file covers only project-specific details.

## Repo layout

- `.opencode/tools/*.ts` — shared automation tools
- `agents/*.md` — agent personas
- `plugins/` — local plugins
- `protocols/*.md` — operational standards
- `protocols/rulesets/*.md` — codified rules
- `skills/` — skill library
- `shade/` — Shade background executor (optional, requires Frieren)
- `docs/REAPER_REALM.md` — Shade architecture and queue schema

## Skill loading

Load skills on-demand via `skill({ name: "skill-name" })`. Key triggers for this repo:

| When you are...                                                   | Load this skill               |
| ----------------------------------------------------------------- | ----------------------------- |
| Delegating work to another agent                                  | `delegation-protocols`        |
| Coordinating multi-agent handoffs                                 | `handoff-patterns`            |
| Selecting tools for a task                                        | `tool-selection`              |
| Planning F2+ effort work (Medium+ effort OR Moderate+ complexity) | `effort-complexity-framework` |
| Writing or reviewing code                                         | `coding-guidelines`           |
| Running tests or verification                                     | `verification-and-tests`      |
| Using GitButler virtual branches                                  | `gitbutler`                   |
| Selecting which agent to use                                      | `agent-routing`               |
| Enqueuing background/batch tasks to Shade                         | `reaper-realm`                |

## Agent routing (project-specific)

| Need           | Agent         | Purpose                                     |
| -------------- | ------------- | ------------------------------------------- |
| Coordination   | `coordinator` | Oversees delegation and compliance          |
| Architecture   | `strategist`  | Designs systems and plans migrations        |
| Implementation | `implementer` | Builds features that follow standards       |
| Verification   | `reviewer`    | Checks quality, docs, and release readiness |

## Adding agents

1. Read `docs/PERSONA_DEFINITION_GUIDE.md` for best practices and anti-patterns.
2. Copy an existing agent (e.g., `agents/implementer.md`) to `agents/<name>.md`.
3. Describe capabilities, constraints, and work style following the guide's template.
4. Embed delegation protocol requirements (STATUS format, escalations, quality gates).
5. Define scope boundaries (in scope / out of scope / escalate to user).
6. Register in `opencode.json` and update the routing table above.
7. Test against protocol compliance scenarios.
