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
bun .opencode/tools/verify-loop.ts --type auto
```

## 2) Repo layout

- `.opencode/tools/*.ts` — shared automation tools
- `agents/*.md` — agent personas (editable)
- `protocols/*.md` — operational standards
- `protocols/rulesets/*.md` — codified rules
- `README.md` — orientation and install guidelines

## 3) Agent workflow

1. **Plan** directly in agent prompt or README sections
2. **Execute** with checkpoints and testing
3. **Report** using standard status format
4. **Document** only when required; avoid temporary summaries

## 4) Persona philosophy

The ai-kit supports **corporate-first personas by default**, but allows customization for personality-rich approaches when appropriate. See `docs/PERSONA_DEFINITION_GUIDE.md` for comprehensive best practices.

**Core principles (apply to all personas):**

- **Clarity over character**: Focus on capabilities, scope, and decision criteria
- **Protocol compliance**: All agents follow delegation protocols, status formats, and quality gates
- **Customizability**: Teams can extend or replace personas to match their culture

**Professional (default) vs. Personality-Rich:**

| Approach             | When to Use                                 | Key Characteristics                                                |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| **Professional**     | Regulated industries, audit-friendly docs   | Neutral tone, technical focus, standardized reporting              |
| **Personality-Rich** | Internal teams, complex domains, engagement | Distinct voice, metaphors, motivational language (with boundaries) |

**Critical boundaries for personality-rich personas:**

- Must follow delegation protocols exactly
- Cannot override safety or security rules
- Must escalate appropriately regardless of persona style
- Acknowledge when switching between "character" and technical mode

**Required reading before creating personas**: `docs/PERSONA_DEFINITION_GUIDE.md`

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
2. Copy an existing agent (e.g., `agents/implementer.md`) to `agents/<name>.md` with a descriptive name.
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

---

## 9) Compound Engineering (Global)

This section applies **globally** to every project. It's the discipline that makes your setup compound over time instead of degrading.

### The Compound Step (Mandatory After Non-Trivial Work)

The loop: **Plan → Work → Review → Compound → Repeat**

After any bug fix, feature, or significant investigation:

1. **Capture what worked** — Write a brief summary of the solution approach
2. **Tag it for retrieval** — Add YAML frontmatter (problem type, tools used, outcome)
3. **Update the system** — Add to `AGENTS.md`, a project-specific `SOLUTIONS/`, or Mai Context DB
4. **Verify the learning** — Run `memory search "<problem keywords>"`. If the solution doesn't surface, the tagging is insufficient.

**When to run the Compound Step (use effort-based triggers, not time):**

- After any task rated Medium effort or above (F2+)
- After any task that required 3+ retries or significant replanning
- After discovering a non-obvious pattern or workaround
- After any mistake the agent makes (add constraint to prevent recurrence)

### Time Allocation: The 50/50 Rule

Allocate engineering time as follows:

- **50% — Feature work:** Implementing, debugging, delivering user value
- **50% — System improvement:** Agent instructions, patterns, documentation, tooling, automation

This inverts traditional engineering (~90/10). The system improvement half includes:

- Updating `AGENTS.md` with new constraints
- Creating reusable scripts/slash commands
- Documenting solved problems in `docs/solutions/`
- Improving verification and testing infrastructure

### The Living Document Pattern

`AGENTS.md` is not static — it grows with every session. After each mistake or frustration:

1. Identify what the agent didn't know
2. Add a constraint or preference to prevent recurrence
3. Next session starts smarter

**Rule:** AGENTS.md gets constraints and behavior rules only. Solutions, code patterns, and solved problems go in `docs/solutions/` or Mai Context DB.

**Mistake → Instruction Loop:**

```
Error happens → Add constraint → Next session is smarter
```

This is the core of compound engineering: each session should leave the system better than it found it.

### docs/solutions/ Pattern (Recommended for Projects)

For project-specific work, create a searchable solution library:

```
docs/solutions/
├── 2024-01-auth-setup.md      # Format: YYYY-MM-topic.md
├── 2024-02-api-rate-limit.md
└── README.md                  # Index with problem-type tags
```

Each solution file includes:

- Problem statement
- Approach taken
- Key decisions and why
- Tags for retrieval (e.g., `#api #performance #debugging`)

---

### Quick Reference: Compound Engineering Commands

| Action                    | Command/Tool                                         |
| ------------------------- | ---------------------------------------------------- |
| Capture solution          | Use `record` skill → promotes to Mai                 |
| Document decision         | Add to project `SOLUTIONS/` or Mai `decisions` table |
| Add constraint            | Edit `AGENTS.md` (global) or project `AGENTS.md`     |
| Find past solutions       | `memory search` or Mai semantic search               |
| End-of-session reflection | Use `reflect` skill                                  |
