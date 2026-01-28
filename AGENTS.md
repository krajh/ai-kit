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
- `agent/*.md` — agent personas (editable)
- `protocols/*.md` — operational standards
- `protocols/rulesets/*.md` — codified rules
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

## 5) Agent routing
| Need | Agent | Purpose |
| ---- | ----- | ------- |
| Coordination | `coordinator` | Oversees delegation and compliance |
| Architecture | `strategist` | Designs systems and plans migrations |
| Implementation | `implementer` | Builds features that follow standards |
| Verification | `reviewer` | Checks quality, docs, and release readiness |

## 6) Customization path
To add your own agents:
1. Copy `agent/templates/specialist.md.template` to `agent/<name>.md` with a descriptive name.
2. Describe capabilities, constraints, and preferred work style.
3. Mention relevant tools, files, or protocols.
4. Register the agent in `opencode.json` and update this table if needed.

## 7) Verification loop
The kit enforces the verification loop from the protocols. Always confirm:
- Tests and lint pass
- Documentation references updated
- Status updates include `[OK]` / `[!]` tags when needed
