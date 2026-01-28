# OpenCode Corporate Kit

A lightweight, drop-in OpenCode configuration optimized for corporate environments with no anime references or personality.

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/krajh/ai-kit/main/install | bash
```

### Installer options

The installer also supports the following flags for controlled rollouts:

| Flag                | Description                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`         | Validates prerequisites, simulates an install, and reports the actions without touching `~/.config/opencode`.                                         |
| `--validate-remote` | Ensures GitHub assets (e.g., `README.md`) are reachable before proceeding.                                                                            |
| `--update`          | Treats the run as an update/refresh of an existing kit. It validates install state, archives the prior config, and applies the latest files in place. |

This will:

- Set up OpenCode configuration for corporate use
- Install protocols and agent definitions
- Configure sensible defaults for team collaboration

## What's Included

### 📋 Protocols

- **Delegation Protocols**: Professional agent coordination and escalation
- **Agent Selection Guide**: Technical routing for specialized agents
- **Documentation Policy**: Maintaining clean, focused documentation
- **Tool Usage Guide**: Efficient tool selection patterns
- **Security Ruleset**: Safe coding practices
- **Testing Standards**: Quality assurance processes

### 🤖 Agent Framework

- **Professional Agent Templates**: Corporate-friendly agent definitions
- **Customization Guide**: Add your own agents without personality references
- **Routing Matrix**: Clear selection criteria for optimal agent choice

### ⚙️ Configuration

- **opencode.json**: Production-ready configuration
- **Theme Settings**: Clean, professional interface
- **MCP Integration**: Context management without custom tools

## Installation

### Automatic (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/krajh/ai-kit/main/install | bash
```

#### Update mode

When you already have `~/.config/opencode` managed by this kit, re-run the installer with `--update` to refresh it safely:

```bash
curl -fsSL https://raw.githubusercontent.com/krajh/ai-kit/main/install | bash -s -- --update
```

Update mode keeps the existing directory intact, archives the prior config, and then deploys the latest package on top.

### Manual

```bash
git clone https://github.com/krajh/ai-kit.git ~/.config/opencode-corporate
cd ~/.config/opencode-corporate
./setup.sh
```

## Customization

### Adding Your Own Agents

1. **Create Agent Definition**:

   ```bash
   cp agent/your-specialist.md.template agent/your-specialist.md
   ```

2. **Edit Agent Profile**:
   - Remove personality references
   - Focus on technical capabilities
   - Use professional tone throughout

3. **Update Selection Guide**:
   Add your agent to `AGENTS.md` under the appropriate category

4. **Register in Configuration**:
   Add to `opencode.json` agents list

### Corporate Guidelines

- ✅ Focus on technical capabilities and expertise
- ✅ Use professional, neutral language
- ✅ Provide clear escalation paths and decision criteria
- ✅ Include accountability metrics and quality gates
- ❌ No personality traits or character references
- ❌ No narrative elements or themes
- ❌ No informal language or slang

## Directory Structure

```
~/.config/opencode-corporate/
├── README.md                 # This file
├── AGENTS.md                 # Development guide and agent matrix
├── opencode.json            # Main configuration
├── install                  # Installation script
├── protocols/               # Operational protocols
│   ├── DELEGATION_PROTOCOLS.md
│   ├── AGENT_SELECTION_GUIDE.md
│   ├── DOCUMENTATION_POLICY.md
│   └── rulesets/
│       ├── SECURITY.md
│       ├── TESTING.md
│       └── OUTPUT_DISCIPLINE.md
└── agent/                  # Agent definitions
    ├── coordinator.md
    ├── architect.md
    ├── implementer.md
    ├── reviewer.md
    └── templates/
        └── specialist.md.template
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
- **Raise issues** (bugs, missing requirements, infrastructure access) by tagging them as `[!]` in your status updates and logging the same structure in your shared issue tracker or `protocols/ESCALATION_GUIDE.md` if needed.
- **Every subagent is responsible** for the escalation cadence: even if the blocker seems minor, use the escalation template so the coordinator can track it formally.
- **Escalations must happen immediately** when uncertainty, blockers, or decisions emerge—the coordinator should never guess or proceed without that signal.

## Support

- **Issues**: [GitHub Issues](https://github.com/krajh/ai-kit/issues)
- **Documentation**: [Wiki](https://github.com/krajh/ai-kit/wiki)
- **Community**: [Discussions](https://github.com/krajh/ai-kit/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**OpenCode Corporate Kit**: Professional AI agent coordination for enterprise environments.
