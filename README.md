```
  ___  _____      _   _______ _____
 / _ \|_   _|    | | / /_   _|_   _|
/ /_\ \ | |------| |/ /  | |   | |
|  _  | | |______|    \  | |   | |
| | | |_| |_     | |\  \_| |_  | |
\_| |_/\___/     \_| \_/\___/  \_/
```

# ai-kit (OpenCode Team Kit)

A lightweight, installer-first OpenCode configuration kit for teams.

**Supports WSL, Linux, and macOS** (x86_64/amd64/arm64 architectures).

## Installation

Download the installer and run it:

```bash
TAG=$(curl -s https://api.github.com/repos/krajh/ai-kit/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
curl -fsSL -o ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

Or pin a specific version:

```bash
TAG="v0.8.9"
curl -fsSL -o ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

### Choosing your model provider

On first install, the installer will prompt you to choose a model provider:

```
Select your model provider:
  1) aitooling
  2) copilot
```

You can also pass it directly:

```bash
./ai-kit-install install --provider aitooling
./ai-kit-install install --provider copilot
```

Or set it in your environment before running:

```bash
MODEL_PROVIDER=copilot ./ai-kit-install install
```

Your choice is saved to `~/.config/opencode/.env` and used for all future updates.

#### Provider model tiers

Agents are assigned models based on role:

| Tier                            | aitooling                             | copilot                            |
| ------------------------------- | ------------------------------------- | ---------------------------------- |
| Critical (architect)            | `aitooling/claude-sonnet-4-6`         | `github-copilot/claude-opus-4.6`   |
| Heavy (strategist, implementer) | `aitooling/claude-sonnet-4-6`         | `github-copilot/claude-sonnet-4.6` |
| Light (reviewer, research)      | `aitooling/claude-haiku-4-5-20251001` | `github-copilot/claude-haiku-4.5`  |

### After installation

Check that everything installed correctly:

```bash
ai-kit-install status
```

You should see:

- Current version listed
- No pending conflicts
- `.env` and `local/` directories present

## Updates

```bash
ai-kit-install update
```

### Updating from OpenCode

You can update ai-kit without leaving your OpenCode session using the `/ai-kit-update` command:

```bash
/ai-kit-update
```

This will:

1. Fetch the latest version from GitHub
2. Compare with your installed version
3. Download and run the update if newer
4. Warn you to restart OpenCode after the update completes

**Caveats:**

- The installer may prompt for conflict resolution (interactive mode)
- You must **restart OpenCode** after updating to pick up new config, skills, and agent definitions

### How conflicts are handled

If you've customised files that ai-kit also manages, the update process:

1. **Detects your changes** using `.ai-kit-manifest.json` checksums
2. **3-way merges** — compares your version, the old baseline, and the new version
3. **Non-interactive mode** — your file is preserved as `<file>.user`, new version is applied
4. **Interactive mode** — prompts `[k]eep / [o]verwrite / [d]iff / [s]kip` per file

Check what's pending after an update:

```bash
ai-kit-install status
```

Resolve staged conflicts:

```bash
# Accept the new version (overwrite your changes)
ai-kit-install resolve --accept-incoming

# Keep your version (reject the update)
ai-kit-install resolve --keep-mine
```

## Rollback

```bash
ai-kit-install rollback
```

Restores the previous version. Your `.env` and `local/` are never touched.

## Uninstall

To remove ai-kit, delete the managed files:

```bash
rm -rf ~/.config/opencode/versions ~/.config/opencode/current \
       ~/.config/opencode/.ai-kit-manifest.json \
       ~/.config/opencode/.ai-kit-incoming
```

Your customisations in `~/.config/opencode/local/` and `~/.config/opencode/.env` are always preserved.

## Requirements

- **curl** and **tar**
- **WSL 2**, **Linux**, or **macOS** (x86_64/amd64/arm64)

## How It Works

### File layout

ai-kit installs into `~/.config/opencode/`:

```
~/.config/opencode/
├── opencode.json          # Main config (your customisations preserved across updates)
├── AGENTS.md              # Agent routing and protocol guide
├── agents/                # Agent prompt templates
├── skills/                # Playbooks for delegation, testing, architecture, and more
├── protocols/             # Operating standards and rulesets
├── plugins/               # Auto-loaded runtime plugins (memory, roadmap, etc.)
├── bunfig.toml            # Bun config (includes trustedDependencies for opencode-mem)
├── .ai-kit-manifest.json  # SHA-256 checksums for update tracking
├── local/                 # Your local customisations (never touched by ai-kit)
└── .env                   # Environment variables (never touched by ai-kit)
```

`.ai-kit-incoming/` only appears when an update has staged conflict files for resolution.

### Customisation safety

ai-kit uses `.ai-kit-manifest.json` to track changes across updates:

1. **Checksum tracking** — SHA-256 recorded for every managed file at install time
2. **Modification detection** — files compared against checksums before updating
3. **3-way merge** — your changes and upstream changes are both preserved
4. **Explicit resolution** — you decide what to keep; nothing silently overwritten

### Environment variables

| Variable         | Purpose                                   | Default                                        |
| ---------------- | ----------------------------------------- | ---------------------------------------------- |
| `MODEL_PROVIDER` | Model provider (`aitooling` or `copilot`) | Prompted on first install; persisted to `.env` |
| `AITOOLINGKEY`   | API key (aitooling provider only)         | Prompted if provider is `aitooling`            |
| `BASE_URL`       | Override default API endpoint             | Optional                                       |

These are written to `~/.config/opencode/.env` during install and preserved across updates.

## What's Included

| Item            | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `AGENTS.md`     | Agent definitions, routing guide, and protocol requirements   |
| `agents/`       | Prompt templates for coordinator, implementer, reviewer, etc. |
| `skills/`       | Playbooks — see Skills Library below                          |
| `protocols/`    | Operating standards, delegation protocols, rulesets           |
| `plugins/`      | Runtime plugins auto-loaded by OpenCode at startup            |
| `opencode.json` | Production-ready config with sensible model and tool defaults |
| `bunfig.toml`   | Bun configuration including `trustedDependencies`             |

## Skills Library

Skills are playbooks loaded on-demand in session. All ai-kit skills are globally available in any project after installation.

```typescript
await skill({ name: "delegation-protocols" });
await skill({ name: "verification-and-tests" });
```

Skills are discovered automatically via `<available_skills>` in any session.

### Delegation & Coordination

| Skill                  | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `delegation-protocols` | Agent coordination, continuous reporting, v1.4 |
| `handoff-patterns`     | 5 handoff types to prevent context loss        |
| `agent-routing`        | Fast specialist selection                      |
| `context-checkpoint`   | Capture project state and decisions            |

### Planning & Assessment

| Skill                         | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `effort-complexity-framework` | Replace time estimates with Effort+Complexity |

### Development & Code Quality

| Skill                  | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `coding-guidelines`    | Reduce common LLM coding mistakes               |
| `clean-code-standards` | Minimal comments, maximum readability           |
| `tool-selection`       | Fast tool selection (patch→edit→write priority) |

### Quality & Testing

| Skill                      | Purpose                              |
| -------------------------- | ------------------------------------ |
| `verification-and-tests`   | Definition of Done workflow          |
| `debugging-error-handling` | Error triage and prevention patterns |

### Workflow & Tooling

| Skill                       | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `gitbutler`                 | Virtual branch workflow for parallel agent work |
| `opencode-tool-authoring`   | Standards for `.opencode/tool/*.ts` tools       |
| `opencode-plugin-authoring` | Patterns for `plugin/*.ts` runtime plugins      |
| `ralph-loop`                | Iterate-to-done loop for mechanical tasks       |
| `memory-tool-playbook`      | Episodic memory patterns                        |

### Skill Auto-Loading

The first STATUS UPDATE of any delegated task must include a SKILL CHECK:

```
SKILL CHECK: loaded [delegation-protocols, verification-and-tests]
# OR
SKILL CHECK: none applicable
```

## Optional Integrations

### Frieren: Durable Memory

Agents work fully out of the box with `opencode-mem` for 30-day ephemeral memory. If you want **permanent cross-session memory** — decisions, constraints, and patterns that survive indefinitely — add [Frieren](docs/FRIEREN_INTEGRATION.md).

| Without Frieren                        | With Frieren                                          |
| -------------------------------------- | ----------------------------------------------------- |
| `opencode-mem` — 30-day rolling memory | + Wisdom plane — permanent decisions & patterns       |
| No cross-session knowledge persistence | + Session plane — episodic event capture              |
| No semantic code search                | + Codebase plane — semantic search + dependency graph |

**Quick setup:** See [`docs/FRIEREN_INTEGRATION.md`](docs/FRIEREN_INTEGRATION.md) for prerequisites, the `opencode.json` config snippet, and which skills activate.

### Shade: Background Task Executor

If you have Frieren installed, you can add **Shade** — an autonomous background executor that picks up tasks from a queue and runs them using Pi with specialist delegation.

| Without Shade               | With Shade                                                    |
| --------------------------- | ------------------------------------------------------------- |
| All work happens in-session | + Fire-and-forget background tasks                            |
| No batch processing         | + Batch operations (lint, test, migrate) run autonomously     |
| Single-agent execution      | + 5 agent tools for delegation (implement, review, research…) |

**Quick setup:**

```bash
ai-kit-install install --shade
```

**Prerequisites:** Frieren (queue tools) + Pi runtime (`npm install -g @mariozechner/pi-coding-agent`) + tmux.

**Usage:**

```bash
# From coordinator (OpenCode session):
reaper_enqueue({ task: "Fix all TypeScript errors in src/", priority: 3 })

# Monitor:
shade-status    # Is Shade running?
shade-attach    # View live output
```

**Docs:** See [`docs/REAPER_REALM.md`](docs/REAPER_REALM.md) for full architecture, queue schema, and troubleshooting.

---

## Adding Your Own Agents

1. Read `docs/PERSONA_DEFINITION_GUIDE.md`
2. Copy an existing agent in `agents/` as a template
3. Define role, capabilities, scope, escalation criteria, and communication style
4. Register in `opencode.json` and document in `AGENTS.md`

## Support

- **Issues**: [GitHub Issues](https://github.com/krajh/ai-kit/issues)
- **Documentation**: [Wiki](https://github.com/krajh/ai-kit/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/krajh/ai-kit/discussions)

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

**ai-kit**: A stable OpenCode setup for teams.
