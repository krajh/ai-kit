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
| Running tests                                                     | `testing`                     |
| Using GitButler virtual branches                                  | `gitbutler`                   |
| Selecting which agent to use                                      | `agent-routing`               |
| Enqueuing background/batch tasks to Shade                         | `reaper-realm`                |
| Reporting cost/performance metrics                                | `claims-and-citations`        |
| Creating work checkpoints                                         | `checkpoint`                  |
| Checking project status                                           | `status-snapshot`             |
| Verifying work meets Definition of Done                           | `verify-loop`                 |

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

## verify-loop Usage by Agent

Each agent in ai-kit should use `verify-loop` at specific points in their workflow:

| Agent | When to use verify-loop | Key flags |
|---|---|---|
| `coordinator` | Before marking roadmap actions complete; after multi-agent orchestration | `--type auto`, `--checkpoint-name` |
| `strategist` | After architectural decisions; validating design compliance | `--type tool`, `--spec ./docs/plan.md` |
| `implementer` | Before committing code; after implementation complete | `--type auto`, `--skip-console-logging` (non-opencode repos) |
| `reviewer` | Quality gate validation; F2/F3 work requires `--effort f2 --guillotine-passed` | `--type auto`, `--effort f2` |
| `research` | Validating research artifacts; documentation compliance | `--type doc`, `--spec ./docs/research.md` |
| `architect` | Design compliance validation; F2/F3 Crimson Seal gates | `--type tool`, `--effort f3` |

### F2/F3 Work (Crimson Seal)

For medium+ complexity work, agents must follow the Crimson Seal protocol:

1. **Implementer** runs: `bun tools/verify-loop.ts --effort f2`
2. **Reviewer** performs Guillotine review (code review)
3. **Implementer** runs: `bun tools/verify-loop.ts --effort f2 --guillotine-passed`
4. **Coordinator** marks roadmap action complete with Completion Proof

### Integration with Roadmap

After `verify-loop` passes:
1. Copy the **Completion Proof** from the report
2. Run: `updateroadmap(actionNumber='N.NN', status='completed', note='<paste Completion Proof>')`

### Integration with Checkpoint

On success with `--checkpoint-name`:
- Creates `.opencode/checkpoints/latest.json`
- Enables `session-end` to persist context
