# AGENTS.md — Corporate Agent Guide

**Repo:** OpenCode corporate kit
**Runtime:** Bun + TypeScript (matching OpenCode defaults)

## 1) Build / lint / test commands

### Install

```bash
bun install
```

### Format

```bash
bun fmt
```

### Typecheck

```bash
bunx tsc --noEmit --pretty false
```

### Tests

All tests belong under `/tests`.

```bash
bun test
bun test --pass-with-no-tests
```

### Tool validation

```bash
bun .opencode/tool/verify-loop.ts --type auto
```

## 2) Repo layout

- `.opencode/tool/*.ts` — shared automation tools
- `src/agent/*.md` — agent personas (canonical source; `agent/` is a symlink)
- `src/plugin/` — local plugins
- `src/protocols/*.md` — operational standards
- `src/protocols/rulesets/*.md` — codified rules
- `src/skills/` — skill library
- `README.md` — orientation and install guidelines

## 3) Agent workflow

1. **Plan** directly in agent prompt or README sections
2. **Execute** with checkpoints and testing
3. **Report** using standard status format
4. **Document** only when required; avoid temporary summaries

## 4) Corporate tone

- Focus on capability, not character
- Use concise, professional language
- Always explain how to extend or customize agents
- No anime references, mascots, or personality flourishes

## 5) Skill loading guide

Load skills on-demand based on your task. Skills are loaded via: `skill({ name: "skill-name" })`

| When you are...                                                   | Load this skill                             |
| ----------------------------------------------------------------- | ------------------------------------------- |
| Delegating work to another agent                                  | `delegation-protocols`                      |
| Coordinating multi-agent handoffs                                 | `handoff-patterns`                          |
| Selecting tools for a task                                        | `tool-selection`                            |
| Planning F2+ effort work (Medium+ effort OR Moderate+ complexity) | `effort-complexity-framework`               |
| Writing or reviewing code                                         | `coding-guidelines`, `clean-code-standards` |
| Running tests or verification                                     | `verification-and-tests`                    |
| Using GitButler virtual branches                                  | `gitbutler`                                 |
| Selecting which agent to use                                      | `agent-routing`                             |

**Benefits:** Token efficiency (load only what's needed), cleaner prompts, better discoverability via `<available_skills>`.

## 6) Agent routing

| Need           | Agent         | Purpose                                     |
| -------------- | ------------- | ------------------------------------------- |
| Coordination   | `coordinator` | Oversees delegation and compliance          |
| Architecture   | `strategist`  | Designs systems and plans migrations        |
| Implementation | `implementer` | Builds features that follow standards       |
| Verification   | `reviewer`    | Checks quality, docs, and release readiness |

## 7) Customization path

To add your own agents:

1. **Read the persona definition guide**: See `docs/PERSONA_DEFINITION_GUIDE.md` for comprehensive best practices, examples, and anti-patterns.
2. Copy an existing agent (e.g., `src/agent/implementer.md`) to `src/agent/<name>.md` with a descriptive name.
3. Describe capabilities, constraints, and preferred work style following the guide's template.
4. Embed delegation protocol requirements (STATUS format, escalations, quality gates).
5. Define clear scope boundaries (in scope / out of scope / escalate to user).
6. Register the agent in `opencode.json` and update this table if needed.
7. Test against protocol compliance scenarios.

## 8) Verification loop

The kit enforces the verification loop from the protocols. Always confirm:

- Tests and lint pass
- Documentation references updated
- Status updates include `[OK]` / `[!]` tags when needed
