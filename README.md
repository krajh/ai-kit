```
  ___  _____      _   _______ _____
 / _ \|_   _|    | | / /_   _|_   _|
/ /_\ \ | |______| |/ /  | |   | |
|  _  | | |______|    \  | |   | |
| | | |_| |_     | |\  \_| |_  | |
\_| |_/\___/     \_| \_/\___/  \_/
```

# ai-kit (OpenCode Team Kit)

A lightweight, installer-first OpenCode configuration kit for teams.

**Supports WSL, Linux, and macOS** (x86_64/amd64/arm64 architectures).

## Installation

### npm (recommended)

```bash
npm install -g @brisingr-kr/core
```

This installs ai-kit globally and runs the setup script, which:

1. **Copies files** from the package into `~/.config/opencode/`
2. **Writes `bunfig.toml`** with `trustedDependencies = ["protobufjs"]` to unblock `opencode-mem` install
3. **Merges `opencode.json`** so your customisations aren't lost
4. **Creates `.ai-kit-manifest.json`** to track files for updates

You get:

- `AGENTS.md`, `agents/`, `skills/`, `protocols/`, `plugins/`
- `opencode.json`, `bunfig.toml`
- All configured and ready to use

### Bash installer (download)

For system-wide installs or non-Node projects:

```bash
TAG=$(curl -s https://api.github.com/repos/krajh/ai-kit/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
curl -fsSL -o ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

Or pin a specific version:

```bash
TAG="v0.6.3"
curl -fsSL -o ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

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

ai-kit supports three ways to update:

### Automatic (recommended for Node projects)

```bash
npm update -g @brisingr-kr/core
```

The auto-updater plugin (included in npm installs) also checks GitHub releases when OpenCode starts—at most once per 24h.

### Manual (any install method)

```bash
ai-kit-install update
```

Or with npm:

```bash
npm update -g @brisingr-kr/core
```

### Handling conflicts

If you've customised files that ai-kit also manages, the update process:

1. **Detects your changes** using the `.ai-kit-manifest.json` checksum
2. **Stages new versions** under `.ai-kit-incoming/` instead of overwriting
3. **Prompts you** (interactive) or waits for resolution (auto-updater)

Check what's pending:

```bash
ai-kit-install status
```

Resolve conflicts:

```bash
# Accept the new version (overwrite your changes)
ai-kit-install resolve --accept-incoming

# Keep your version (reject the update)
ai-kit-install resolve --keep-mine
```

Your files are never silently lost. If there are conflicts, you resolve them explicitly.

## Uninstall

```bash
npm uninstall -g @brisingr-kr/core
```

Or with the bash installer:

```bash
./ai-kit-install uninstall
```

This removes only ai-kit files that haven't been modified. Your customisations in `~/.config/opencode/local/` and `~/.config/opencode/.env` are always preserved.

## Requirements

- **npm** (for Node.js projects) or **curl**, **tar** (for bash installer)
- **WSL 2**, **Linux**, or **macOS** (x86_64/amd64/arm64 architecture)
- No special privileges required
- Bun is required to run postinstall/preuninstall scripts (installed with npm)

## How It Works

### File layout

ai-kit copies files into `~/.config/opencode/`:

```
~/.config/opencode/
├── opencode.json          # Deep-merged (your customisations preserved)
├── AGENTS.md
├── agents/
├── skills/
├── protocols/
├── plugins/
├── bunfig.toml            # Includes trustedDependencies for opencode-mem
├── .ai-kit-manifest.json  # SHA-256 checksum tracking (for updates)
├── .ai-kit-incoming/      # Staged conflicts (if update detects changes)
├── local/                 # User-owned local customisations (never touched)
└── .env                   # Environment variables (never touched)
```

### Customisation safety

ai-kit protects your customisations across updates using `.ai-kit-manifest.json`:

1. **Checksum tracking** — On install, ai-kit records the SHA-256 hash of every file
2. **Modification detection** — Before updating, the updater compares current files against checksums to find what you changed
3. **Staging** — If you've modified files, new versions are placed in `.ai-kit-incoming/` for you to review
4. **Resolution** — You decide: accept the new version or keep yours via `ai-kit-install resolve`

Your files are never overwritten silently.

### Environment variables

Two environment variables are configurable:

| Variable       | Purpose                            | Default                      |
| -------------- | ---------------------------------- | ---------------------------- |
| `AITOOLINGKEY` | API key for the aitooling provider | Required; prompts if missing |
| `BASE_URL`     | Override default API endpoint      | Optional                     |

These are persisted to `~/.config/opencode/.env` during install and preserved across updates.

## What's Included

ai-kit ships with:

- **`AGENTS.md`** — Agent definitions and routing guide
- **`agents/`** — Agent prompt templates (coordinator, strategist, implementer, reviewer, etc.)
- **`skills/`** — Playbooks for delegation, testing, architecture, code quality, and more
- **`protocols/`** — Operating standards and rulesets
- **`plugins/`** — Auto-updater, memory integration, roadmap management
- **`opencode.json`** — Production-ready configuration with sensible defaults
- **`bunfig.toml`** — Bun configuration including trusted dependencies for package install

## Using Skills in Other Projects

After installation, all ai-kit skills are available globally in any project:

```typescript
// Load skills in any project
await skill({ name: "delegation-protocols" });
await skill({ name: "handoff-patterns" });
await skill({ name: "effort-complexity-framework" });
```

Skills are discoverable via `<available_skills>` in any session.

## Customization

### Adding Your Own Agents

1. **Read the Guide**: See `docs/PERSONA_DEFINITION_GUIDE.md` for comprehensive best practices
2. **Create Agent Definition**: Copy an existing agent definition (e.g., `agents/implementer.md`) as a template
3. **Edit Agent Profile**:
   - Define clear role, capabilities, and scope boundaries
   - Embed delegation protocol requirements
   - Specify escalation criteria and quality gates
   - Choose communication style (professional or personality-rich)
4. **Register in Configuration**: Add to `opencode.json` agents list
5. **Update AGENTS.md**: Document your agent in the agent matrix
6. **Test**: Validate protocol compliance and boundary recognition

### Corporate Guidelines

- ✅ Focus on technical capabilities and expertise
- ✅ Use professional, neutral language (or personality-rich with clear boundaries)
- ✅ Provide clear escalation paths and decision criteria
- ✅ Include accountability metrics and quality gates
- ✅ Embed delegation protocol requirements (non-negotiable)

**For detailed guidance**, including examples, anti-patterns, and testing strategies, see:

- **`docs/PERSONA_DEFINITION_GUIDE.md`** - Comprehensive persona definition guide

## Support

- **Issues**: [GitHub Issues](https://github.com/krajh/ai-kit/issues)
- **Documentation**: [Wiki](https://github.com/krajh/ai-kit/wiki)
- **Community**: [Discussions](https://github.com/krajh/ai-kit/discussions)

## Skills Library

This kit ships with essential playbooks for agent coordination, quality assurance, and development workflows. The `/skills/` directory contains:

**Delegation & Coordination**:

- `delegation-protocols` - Agent coordination and continuous reporting
- `handoff-patterns` - 5 handoff types to prevent context loss
- `agent-routing` - Fast specialist selection for routing work
- `context-checkpoint` - Capture project state/decisions/progress

**Planning & Assessment**:

- `effort-complexity-framework` - Replace time estimates with Effort+Complexity ratings
- `tlc-spec-driven` - Spec-driven development workflow (when available)

**Development & Code Quality**:

- `coding-guidelines` - Behavioral guidelines to reduce common LLM coding mistakes
- `clean-code-standards` - Minimal comments, maximum readability
- `tool-selection` - Fast tool selection guide (patch→edit→write priority)

**Quality & Testing**:

- `verification-and-tests` - Definition of Done workflow
- `debugging-error-handling` - Error triage and prevention patterns
- `debug-instrumentation` - Structured logging for debugging

**Workflow & Tooling**:

- `gitbutler` - Virtual branch workflow for parallel work
- `opencode-tool-authoring` - Standards for authoring `.opencode/tools/*.ts` tools
- `opencode-plugin-authoring` - Patterns for authoring `plugins/*.ts` runtime plugins
- `ralph-loop` - Iterate-to-done loop for mechanical tasks
- `memory-tool-playbook` - Episodic memory patterns

### Using Skills

Load skills in-session when triggers apply:

```typescript
// Skill auto-loading triggers (from AGENTS.md)
// - Delegating work → load `delegation-protocols`
// - Planning F2+ effort → load `effort-complexity-framework`
// - Writing/modifying code → load `coding-guidelines`
// - Using GitButler → load `gitbutler`

// Example:
await skill({ name: "delegation-protocols" });
```

**First STATUS UPDATE requirement**: Include a SKILL CHECK line showing loaded skills:

```
SKILL CHECK: loaded [skill-name-1, skill-name-2]
# OR
SKILL CHECK: none applicable
```

Each skill file (`skills/<skill>/SKILL.md`) contains:

- Trigger conditions (when to load)
- Recommended patterns and workflows
- Command references
- Guardrails and best practices

Use skills as part of your standard workflow to maintain protocol compliance and quality standards.

## License

Apache License 2.0 - see [LICENSE](LICENSE).

---

**ai-kit**: A stable OpenCode setup for teams.
