```
  ___  _____      _   _______ _____
 / _ \|_   _|    | | / /_   _|_   _|
/ /_\ \ | |------| |/ /  | |   | |
|  _  | | |______|    \  | |   | |
| | | |_| |_     | |\  \_| |_  | |
\_| |_/\___/     \_| \_/\___/  \_/
```

# ai-kit (OpenCode Team Kit)

A lightweight, installer-first OpenCode configuration kit for teams. **WSL, Linux, macOS** (x86_64/amd64/arm64).

## Installation

```bash
# Latest release
TAG=$(curl -s https://api.github.com/repos/krajh/ai-kit/releases/latest | grep '"tag_name"' | cut -d'"' -f4)

# Or pin a version: TAG="v0.9.3"

curl -fsSL -o ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

### Choosing your model provider

The installer prompts on first run. You can also pass it directly or via env:

```bash
./ai-kit-install install --provider aitooling   # or copilot
MODEL_PROVIDER=copilot ./ai-kit-install install  # alternative
```

Your choice is saved to `~/.config/opencode/.env`.

#### Provider model tiers

| Agent         | aitooling                             | copilot                            | Role                                  |
| ------------- | ------------------------------------- | ---------------------------------- | ------------------------------------- |
| `strategist`  | `aitooling/claude-sonnet-4-6`         | `github-copilot/claude-opus-4.6`   | Architecture planning (Anthropic)     |
| `implementer` | `aitooling/claude-sonnet-4-6`         | `github-copilot/gpt-5.3-codex`     | Code generation (OpenAI Codex)        |
| `reviewer`    | `aitooling/claude-haiku-4-5-20251001` | `github-copilot/claude-sonnet-4.6` | Code/doc review (Anthropic)           |
| `research`    | `aitooling/claude-haiku-4-5-20251001` | `github-copilot/gpt-5.4`           | Investigation, large context (OpenAI) |
| `architect`   | `aitooling/claude-sonnet-4-6`         | `github-copilot/claude-opus-4.6`   | Big-picture design (Anthropic)        |

`aitooling` model catalog currently includes: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.2`, `gpt-5.1`, `gpt-4.1`, `gpt-4.1-mini`, `claude-sonnet-4.6`, `claude-sonnet-4.5`, and `claude-haiku-4.5` variants.

### Verify installation

```bash
ai-kit-install status
```

## Updates

```bash
ai-kit-install update
```

Or from within OpenCode: `/ai-kit-update` — fetches the latest version, compares with installed, and runs the update. **Restart OpenCode** after updating.

To switch provider safely (without manually editing `opencode.json`), use:

```bash
/ai-kit-provider copilot
# or
/ai-kit-provider aitooling --models
```

This runs `ai-kit-install update --provider ...` and re-applies provider-appropriate per-agent model defaults.

To inspect the supported model IDs from inside OpenCode, use:

```bash
/ai-kit-models
/ai-kit-models aitooling
/ai-kit-models copilot
```

### How conflicts are handled

If you've customised files that ai-kit also manages:

1. **Detects changes** via `.ai-kit-manifest.json` checksums
2. **3-way merge** — compares your version, old baseline, and new version
3. **Non-interactive** — your file preserved as `<file>.user`, new version applied
4. **Interactive** — prompts `[k]eep / [o]verwrite / [d]iff / [s]kip` per file

```bash
ai-kit-install status                          # check pending conflicts
ai-kit-install resolve --accept-incoming       # take new version
ai-kit-install resolve --keep-mine             # keep yours
```

## Rollback

```bash
ai-kit-install rollback
```

Restores the previous version. Your `.env` and `local/` are never touched.

## Uninstall

```bash
rm -rf ~/.config/opencode/versions ~/.config/opencode/current \
       ~/.config/opencode/.ai-kit-manifest.json \
       ~/.config/opencode/.ai-kit-incoming
```

Your customisations in `local/` and `.env` are always preserved.

## Requirements

- **curl** and **tar**
- **WSL 2**, **Linux**, or **macOS** (x86_64/amd64/arm64)

## How It Works

### File layout

ai-kit installs into `~/.config/opencode/`:

```
~/.config/opencode/
├── opencode.json          # Main config (your customisations preserved)
├── AGENTS.md              # Agent routing and protocol guide
├── agents/                # Agent prompt templates
├── skills/                # Playbooks for delegation, testing, architecture
├── protocols/             # Operating standards and rulesets
├── plugins/               # Auto-loaded runtime plugins
├── bunfig.toml            # Bun config (trustedDependencies for opencode-mem)
├── .ai-kit-manifest.json  # SHA-256 checksums for update tracking
├── local/                 # Your customisations (never touched by ai-kit)
└── .env                   # Environment variables (never touched by ai-kit)
```

`.ai-kit-incoming/` only appears when an update has staged conflicts.

### Environment variables

| Variable         | Purpose                                   | Default                                        |
| ---------------- | ----------------------------------------- | ---------------------------------------------- |
| `MODEL_PROVIDER` | Model provider (`aitooling` or `copilot`) | Prompted on first install; persisted to `.env` |
| `AITOOLINGKEY`   | API key (aitooling provider only)         | Prompted if provider is `aitooling`            |
| `BASE_URL`       | Override default API endpoint             | Optional                                       |

## Skills Library

Skills are playbooks loaded on-demand. All ai-kit skills are globally available after installation.

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
| `brainstorming`              | Explore ideas into designs before coding       |

### Development & Code Quality

| Skill                  | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `coding-guidelines`    | Reduce common LLM coding mistakes               |
| `clean-code-standards` | Minimal comments, maximum readability           |
| `tool-selection`       | Fast tool selection (patch→edit→write priority) |
| `git-hygiene`          | Safe git practices and PR discipline            |
| `output-discipline`     | Skimmable outputs with consistent status tags   |

### Quality & Testing

| Skill                      | Purpose                              |
| -------------------------- | ------------------------------------ |
| `verification-and-tests`   | Definition of Done workflow          |
| `verify-loop`              | Run standardized quality gates        |
| `debugging-error-handling` | Error triage and prevention patterns |

### Workflow & Tooling

| Skill                       | Purpose                                         |
| --------------------------- | ----------------------------------------------- |
| `gitbutler`                 | Virtual branch workflow for parallel agent work |
| `opencode-tool-authoring`   | Standards for `.opencode/tool/*.ts` tools       |
| `opencode-plugin-authoring` | Patterns for `plugin/*.ts` runtime plugins      |
| `ralph-loop`                | Iterate-to-done loop for mechanical tasks       |
| `memory-tool-playbook`      | Episodic memory patterns                        |
| `session-end`              | Comprehensive session closure and continuity     |

## Optional Integrations

### Frieren: Durable Memory

Agents work out of the box with `opencode-mem` (30-day rolling memory). For **permanent cross-session memory**, add [Frieren](docs/FRIEREN_INTEGRATION.md):

- **Wisdom plane** — permanent decisions & patterns
- **Session plane** — episodic event capture
- **Codebase plane** — semantic search + dependency graph

See [`docs/FRIEREN_INTEGRATION.md`](docs/FRIEREN_INTEGRATION.md) for setup.

### Shade: Background Task Executor

Requires Frieren. Autonomous background executor that picks up tasks from a queue.

```bash
ai-kit-install install --shade
```

**Prerequisites:** Frieren + Pi runtime (`npm install -g @mariozechner/pi-coding-agent`) + tmux.

```bash
# Enqueue from coordinator:
reaper_enqueue({ task: "Fix all TypeScript errors in src/", priority: 3 })

# Monitor:
shade-status    # Is Shade running?
shade-attach    # View live output
```

See [`docs/REAPER_REALM.md`](docs/REAPER_REALM.md) for architecture and troubleshooting.

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.
