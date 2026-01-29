# ai-kit (OpenCode Team Kit)

A lightweight, installer-first OpenCode configuration kit for teams.

**v0 is WSL/Linux-only** (intended for Dell/Windows laptops running WSL2).

## Quick Start

1. **Pick a release**: https://github.com/krajh/ai-kit/releases
2. **Download the installer** and run it:

```bash
TAG="v0.1.0"

curl -fsSL -o ai-kit-install \
  "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install
./ai-kit-install install
```

### Installer options

The installer supports the following commands:

| Command    | Description                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `install`  | Fresh installation of OpenCode configuration to `~/.config/opencode`.                                                       |
| `update`   | Update an existing installation. Validates install state, archives the prior config, and applies the latest files in place. |
| `status`   | Check the current installation status and version.                                                                          |
| `rollback` | Restore the previous configuration from backup.                                                                             |
| `dry-run`  | Validates prerequisites, simulates an install, and reports the actions without touching `~/.config/opencode`.               |

This will:

- Set up OpenCode configuration for corporate use
- Install protocols and agent definitions
- Configure sensible defaults for team collaboration

## What's Included

### 📋 Protocols

- **Delegation Protocols**: Professional agent coordination and escalation
- **Tool Usage Guide**: Efficient tool selection patterns

### 🤖 Agent Framework

- **Professional Agent Definitions**: Corporate-friendly agent templates (coordinator, architect, implementer, reviewer, research, strategist)
- **Agent Routing**: Clear selection criteria for optimal agent choice

### ⚙️ Configuration

- **opencode.json**: Production-ready configuration with plugin defaults
- **Skills Library**: Playbooks for delegation, testing, and tool authoring
- **Plugin Support**: Memory integration and roadmap management

## Installation

### Requirements

- **WSL 2** (Windows Subsystem for Linux) or **Linux** (x86_64 architecture)
- **curl**, **tar**, **mkdir** (standard utilities)
- No special privileges required

### Automatic (Recommended)

1. Download the installer from [GitHub Releases](https://github.com/krajh/ai-kit/releases):

```bash
TAG="v0.1.0"

curl -fsSL -o ai-kit-install \
  "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x ai-kit-install

# Run the installer
./ai-kit-install install
```

2. For updates, use the same installer with the `update` command:

```bash
./ai-kit-install update
```

### How Updates Work

- **Automatic checks**: OpenCode checks for updates daily on launch (silent, no interruption)
- **Staging**: New versions are downloaded and staged in `~/.config/opencode/versions/`
- **Apply on restart**: Updates are applied when you restart OpenCode
- **Preservation**: Your user-owned files are always preserved:
  - `~/.config/opencode/.env` (environment variables)
  - `~/.config/opencode/local/` (custom configurations)
- **Rollback**: Previous versions are archived in `~/.config/opencode.backups/` for recovery

### Manual (Advanced)

```bash
git clone https://github.com/krajh/ai-kit.git ~/.config/opencode
cd ~/.config/opencode
# Review the configuration before using
```

## Customization

### Adding Your Own Agents

1. **Create Agent Definition**: Copy an existing agent definition (e.g., `agent/implementer.md`) as a template
2. **Edit Agent Profile**:
   - Focus on technical capabilities and expertise
   - Use professional, neutral language
   - Provide clear escalation paths and decision criteria
3. **Register in Configuration**: Add to `opencode.json` agents list
4. **Update AGENTS.md**: Document your agent in the agent matrix

### Corporate Guidelines

- ✅ Focus on technical capabilities and expertise
- ✅ Use professional, neutral language
- ✅ Provide clear escalation paths and decision criteria
- ✅ Include accountability metrics and quality gates

## Directory Structure

```
~/.config/opencode/
├── README.md                      # This file
├── AGENTS.md                      # Agent matrix and routing guide
├── opencode.json                  # Main configuration
├── ai-kit-install                 # Installer/updater script
├── protocols/                     # Operational protocols
│   ├── DELEGATION_PROTOCOLS.md    # Agent coordination and escalation
│   └── TOOL_USAGE_GUIDE.md        # Tool selection patterns
├── agent/                         # Agent definitions
│   ├── coordinator.md
│   ├── architect.md
│   ├── implementer.md
│   ├── reviewer.md
│   ├── research.md
│   └── strategist.md
├── skills/                        # Playbooks and skill definitions
│   ├── delegation-orchestration/
│   ├── protocol-verify/
│   ├── verification-and-tests/
│   └── ... (additional skills)
├── plugin/                        # Runtime plugins
│   └── ... (plugin files)
├── local/                         # User-owned local customizations (preserved on update)
└── .env                           # User-owned environment variables (preserved on update)
```

## Usage

### Configuration is active after installation. Select agents by technical need:

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

This kit ships with essential playbooks for agent coordination and quality assurance. The `/skills/` directory contains:

- **Delegation & Coordination**: `delegation-orchestration`, `protocol-verify`, `context-checkpoint`, `agent-selection`
- **Quality & Testing**: `verification-and-tests`, `protocol-compliance-v13`, `debugging-error-handling`
- **Tool & Plugin Authoring**: `opencode-tool-authoring`, `opencode-plugin-authoring`
- **Workflow Patterns**: `ralph-loop`, `memory-tool-playbook`

### Using Skills

Load skills in-session when needed:

```typescript
// Load a skill for your current task
await skill({ name: "delegation-orchestration" });
```

Each skill file (`skills/<skill>/SKILL.md`) contains:

- Recommended prompts and patterns
- Command references
- Guardrails and best practices

Use skills as part of your standard workflow to maintain protocol compliance and quality standards.

## License

Apache License 2.0 - see [LICENSE](LICENSE).

---

**ai-kit**: A stable OpenCode setup for teams.
