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

## Quick Start

### Automatic (curl | bash)

```bash
curl -fsSL "https://github.com/krajh/ai-kit/releases/latest/download/install" | bash
```

This installs the kit **into OpenCode’s config directory**:

- `~/.config/opencode/versions/<tag>/` (versioned content)
- `~/.config/opencode/current` → the active version

To keep the config easy to use (and not nested), the installer exposes the kit at the top-level via symlinks:

- `~/.config/opencode/opencode.json` → `~/.config/opencode/current/opencode.json`
- `~/.config/opencode/agents` → `~/.config/opencode/current/agents`
- (same for `protocols/`, `skills/`, `plugins/`, `AGENTS.md`)

To pin a specific release:

```bash
curl -fsSL "https://github.com/krajh/ai-kit/releases/latest/download/install" | \
  bash -s -- --version v0.1.7
```

Update an existing install (download + apply immediately):

```bash
curl -fsSL "https://github.com/krajh/ai-kit/releases/latest/download/install" | \
  bash -s -- --command update
```

### npm (Node.js projects)

If your project uses Node.js, you can install ai-kit as a dev dependency:

```bash
npm install --save-dev @ai-kit/core
```

This automatically symlinks the kit files into `~/.config/opencode/`:

- `opencode.json`, `AGENTS.md`, `agents/`, `skills/`, `protocols/`, `plugins/`

Each symlink points into `node_modules/@ai-kit/core/kit/`, so the kit stays in sync with your pinned version.

**Uninstalling** (`npm uninstall @ai-kit/core`) cleanly removes only its own symlinks — any user-created files are preserved.

#### Personalisation safety (npm)

If you've customised a file that ai-kit also manages (e.g. `~/.config/opencode/opencode.json`), the postinstall script will:

1. Detect the user-modified file
2. Back it up as `<filename>.user-backup`
3. Replace it with the kit's symlink

This ensures you never silently lose your customisations.

#### When to use npm vs curl | bash

| Method         | Best for                                              |
| -------------- | ----------------------------------------------------- |
| `npm install`  | Node.js projects, version pinning via `package.json`  |
| `curl \| bash` | System-wide install, non-Node projects, CI pipelines  |

> **Note:** The npm distribution does not include the auto-updater plugin. Version updates happen through normal `npm update` workflows.

### Manual (download installer)

1. **Pick a release**: <https://github.com/krajh/ai-kit/releases>
2. **Download the installer** and run it:

```bash
TAG="v0.1.7"

curl -fsSL -o ai-kit-install \
  "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

### Installer options

The installer supports the following commands:

| Command    | Description                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `install`  | Fresh installation of OpenCode configuration to `~/.config/opencode`.                                                                |
| `update`   | Update an existing installation. Detects your personalisations, applies the new version, and reapplies your changes via 3-way merge. |
| `status`   | Check the current installation status and version.                                                                                   |
| `rollback` | Restore the previous configuration from backup.                                                                                      |
| `dry-run`  | Validates prerequisites, simulates an install, and reports the actions without touching `~/.config/opencode`.                        |

After installation, the installer is also available at:

- `~/.config/opencode/current/ai-kit-install`

This kit will:

- Set up OpenCode configuration for corporate use
- Install protocols and agent definitions
- Configure sensible defaults for team collaboration

## Requirements

- **WSL 2** (Windows Subsystem for Linux), **Linux**, or **macOS** (x86_64/amd64/arm64 architecture)
- **curl**, **tar**, **mkdir** (standard utilities)
- No special privileges required

## What's Included

### 📋 Protocols & Skills (Skill-First Approach)

This kit follows a **skill-first pattern**: load skills on-demand instead of referencing protocol files directly.

| Protocol File             | Preferred Skill        |
| ------------------------- | ---------------------- |
| `DELEGATION_PROTOCOLS.md` | `delegation-protocols` |
| `HANDOFF_PROTOCOLS.md`    | `handoff-patterns`     |
| `TOOL_USAGE_GUIDE.md`     | `tool-selection`       |

### 🤖 Agent Framework

- **Professional Agent Definitions**: Corporate-friendly agent templates (coordinator, architect, implementer, reviewer, research, strategist)
- **Agent Routing**: Clear selection criteria for optimal agent choice

### ⚙️ Configuration

- **opencode.json**: Production-ready configuration with plugin defaults
- **Skills Library**: Playbooks for delegation, testing, and tool authoring
- **Plugin Support**: Memory integration and roadmap management

## Using Skills in Other Projects

The installer symlinks all ai-kit skills to `~/.config/opencode/skills/`, making them available globally in any project you work on.

```bash
# After running ai-kit-install, skills are available globally:
await skill({ name: "delegation-protocols" })
await skill({ name: "handoff-patterns" })
await skill({ name: "tool-selection" })
```

### How It Works

The installer creates symlinks from:

- `~/.config/opencode/current/skills/<skill-name>/` → `~/.config/opencode/skills/<skill-name>/`

This means skills are discovered by OpenCode's runtime and listed in `<available_skills>` regardless of which directory you're working in.

### Manual Setup (if not using installer)

If you cloned the repo manually instead of using the installer:

```bash
# Symlink all ai-kit skills to make them globally available
ln -sf $(pwd)/skills/* ~/.config/opencode/skills/
```

Or copy specific skills:

```bash
# Copy only the skills you need
cp -r skills/delegation-protocols ~/.config/opencode/skills/
cp -r skills/handoff-patterns ~/.config/opencode/skills/
```

## Environment Variables

- **AITOOLINGKEY**: API key used by the `aitooling` provider in `opencode.json`.
  - If missing, `ai-kit-install` will prompt (input hidden) during `install` and `update`, then persist it to `~/.config/opencode/.env`.
  - In non-interactive environments (CI), the installer fails with instructions.
  - To disable prompting (fail fast), pass `--no-prompt` to `ai-kit-install`.

```bash
# Prefer setting in your shell env (installer will persist it into ~/.config/opencode/.env)
export AITOOLINGKEY="<your_key>"

# Or run without prompting (CI)
./ai-kit-install install --no-prompt
```

- **BASE_URL**: Optional base URL override for API endpoints.
  - Only needed if you want to override the default base URL from `opencode.json`.
  - If not set, the default from configuration will be used.
  - Useful for custom API gateways or proxy services.

```bash
# Set both variables when using curl | bash
export AITOOLINGKEY="<your_key>"
export BASE_URL="https://api.example.com/v1"

# Then run the installer
curl -fsSL "https://github.com/krajh/ai-kit/releases/latest/download/install" | bash
```

- **SKIP_VERIFY**: Set to `true` to skip cryptographic signature verification of release artifacts. This may be necessary in restricted network environments where cosign cannot connect to the OIDC provider. **Security warning:** Enabling this bypasses authenticity checks and can allow tampered or malicious artifacts to be installed; use only in exceptional cases and in trusted, controlled environments, and never set it as a default.

```bash
# WARNING: Disables signature verification; use only in exceptional, trusted environments
SKIP_VERIFY=true ./ai-kit-install install
```

### How Updates Work

- **Automatic checks**: the `ai-kit-updater` plugin checks GitHub Releases at most once per 24h
- **Staging**: new versions are downloaded and extracted into `~/.config/opencode/staging/<tag>/`
- **Apply on restart**: on the next OpenCode start, the updater moves the staged version into `~/.config/opencode/versions/<tag>/` and flips `~/.config/opencode/current`
- **Personalisation safety**: any files you've modified or added inside the active version directory are automatically detected, stashed, and reapplied after the update using a 3-way merge (see [Personalisation Safety](#personalisation-safety) below)
- **Preservation**: Your user-owned files are always preserved:
  - `~/.config/opencode/.env` (environment variables)
  - `~/.config/opencode/local/` (custom configurations)
- **Rollback**: previous installs are archived in `~/.config/opencode.backups/` for recovery

### Personalisation Safety

Starting with the version that introduces checksum tracking, ai-kit protects your in-place customisations across updates.

#### How it works

1. **Checksum manifest** — On every `install` or `update`, ai-kit writes a `.ai-kit-checksums` file inside the version directory. It records the SHA-256 hash of every file as it was shipped, giving the updater a reference point for "original" content.

2. **Modification detection** — Before applying a new version, the updater compares every file in the active version directory against its stored checksum. Files with a different hash are flagged as **modified** (`M`); files that exist on disk but aren't in the manifest are flagged as **user-added** (`A`).

3. **Stash** — Detected modifications are copied to a temporary stash directory, preserving their relative paths.

4. **3-way merge** — After the new version is extracted, each stashed file is compared against both the old original and the new version:

   | Old original       | New version        | User's version | Result                                                        |
   | ------------------ | ------------------ | -------------- | ------------------------------------------------------------- |
   | Same as new        | —                  | Different      | ✅ User's version applied (only the user changed it)          |
   | Different from new | —                  | Different      | ⚠️ **Conflict** — both upstream and the user changed the file |
   | N/A (user-added)   | File doesn't exist | —              | ✅ User's file copied into the new version                    |
   | N/A (user-added)   | File exists        | —              | ⚠️ **Conflict** — upstream added a file with the same name    |

5. **Conflict resolution**:
   - **Interactive terminal** (manual `./ai-kit-install update`): you're prompted per conflict with `[k]eep yours / [o]verwrite with new / [d]iff / [s]kip`.
   - **Non-interactive** (plugin auto-update, piped input, `--no-prompt`): the new upstream version wins, and your version is saved alongside it as `<filename>.user` so you can manually reconcile later.

#### Example

```
$ ./ai-kit-install update

Detecting user modifications...
  M ./agents/implementer.md
  A ./skills/my-custom-skill/SKILL.md
Stashing 2 modified files...
Downloading v0.3.2...
Reapplying personalisations...
  ✓ Applied: ./skills/my-custom-skill/SKILL.md (user-added)
  ⚠ Conflict: ./agents/implementer.md (both user and upstream changed)
    [k]eep yours / [o]verwrite with new / [d]iff / [s]kip? k
  ✓ Kept user version: ./agents/implementer.md
Personalisation complete: 1 applied, 1 conflict resolved.
```

#### Pre-feature upgrades

If you're upgrading from a version that predates checksum tracking, the updater will print a one-time warning:

```
[!] No checksums manifest found (pre-feature version).
    Your modifications cannot be detected this time.
    Future updates will support personalisation safety.
```

After this upgrade completes, the new version's checksums are written, and all subsequent updates will have full personalisation protection.

#### Files that are always preserved (outside the version directory)

These live outside the version directory and are never touched by updates:

| Path                        | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `~/.config/opencode/.env`   | Environment variables (AITOOLINGKEY, etc.) |
| `~/.config/opencode/local/` | User-owned local customisations            |

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

## Directory Structure

```
~/.config/opencode/
├── current -> versions/v0.1.7/     # Active version symlink
├── opencode.json -> current/opencode.json
├── AGENTS.md -> current/AGENTS.md
├── agents -> current/agents
├── plugins -> current/plugins
├── protocols -> current/protocols
├── skills -> current/skills
├── versions/                      # Installed versions
│   └── v0.1.7/                    # Kit contents (agents/protocols/plugins/etc.)
│       └── .ai-kit-checksums      # SHA-256 manifest of shipped files (personalisation tracking)
├── staging/                       # Downloaded+extracted updates (applied on restart)
├── state/                         # Updater state (last check, staged tag)
├── bin/                           # Tooling used by the installer/updater (e.g., cosign)
├── local/                         # User-owned local customizations (preserved on update)
├── .env                           # User-owned environment variables (preserved on update)
└── ...                            # Kit files live under versions/<tag>/
```

## Usage

### Configuration is active after installation. Select agents by technical need

```bash
# For system architecture
# Use architect agent for design and planning

# For implementation
# Use implementer agent for coding tasks

# For quality assurance
# Use reviewer agent for code review
```

### Protocol Compliance

All agents follow strict professional protocols:

- Continuous progress reporting
- Immediate escalation of blockers
- Sequential task execution
- Quality gate enforcement

### Coordinator interaction guide

- **Elect a coordinator before you begin.** The `coordinator` persona is intentionally left undefined so your team can pick or build the persona that matches your role model.
- **Do not work in isolation.** All agent work must be routed through the coordinator: plan approvals, architectural decisions, and blocker escalations go through the coordinator, even if it means pausing in place.
- **Keep the coordinator in the loop with short STATUS UPDATEs.** Follow the delegation protocol reporting format (COMPLETED / STARTING / CONTINUING with BLOCKERS) so the coordinator always has visibility.
- **Use the coordinator as the final gate.** Before calling something “done,” share verification loop results and documentation updates with the coordinator for final sign-off.

### Escalation and issue reporting

- **Escalate through the `ESCALATION TO COORDINATOR` format** defined in `protocols/DELEGATION_PROTOCOLS.md`. Capture the blocker, context, attempts, needs, and impact in that same structure.
- **Raise issues** (bugs, missing requirements, infrastructure access) by tagging them as `[!]` in your status updates and logging them in your shared issue tracker.
- **Every agent is responsible** for the escalation cadence: even if the blocker seems minor, use the escalation template so the coordinator can track it formally.
- **Escalations must happen immediately** when uncertainty, blockers, or decisions emerge—the coordinator should never guess or proceed without that signal.

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
