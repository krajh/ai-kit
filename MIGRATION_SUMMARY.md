# ai-kit Migration Summary

**Date:** February 10, 2026  
**Source:** OpenCode personal setup (`~/.config/opencode`)  
**Destination:** ai-kit corporate team kit (`~/ai-kit`)

---

## ✅ What Was Added

### 📚 New Skills (7 clean + 2 sanitized)

**Copied Clean (No Modifications):**

1. **`effort-complexity-framework/`** - Replaces time estimates with Effort (Trivial/Small/Medium/Large/Epic) + Complexity (Low/Moderate/High/Critical) ratings. Referenced heavily in Delegation Protocols v1.4.

2. **`delegation-protocols/`** - Updated skill matching Delegation Protocols v1.4. Complements existing `delegation-orchestration` and `protocol-compliance-v13`.

3. **`handoff-patterns/`** - 5 handoff types (Sequential, Parallel, Mesh, Escalation, Verification gate) to prevent context loss between agents.

4. **`tool-selection/`** - Fast tool selection guide (patch→edit→write priority, search strategy, coordination tools).

5. **`coding-guidelines/`** - Behavioral guidelines to reduce common LLM coding mistakes.

6. **`gitbutler/`** - Virtual branch workflow for parallel agent work and stacked deliverables.

**Sanitized (Corporate-Friendly Versions):**

7. **`agent-routing/`** - Fast specialist selection guide. **Sanitized** from personality-specific names (Marin/Rias/etc.) to generic role names (Implementer/Coordinator/etc.).

8. **`clean-code-standards/`** - Minimal comments, maximum readability standards. **Sanitized** from `kai-clean-code` by removing personal references and specific codebase paths.

---

### 🛠️ Custom Tools (5 files)

Added to `.opencode/tool/`:

1. **`clip-img.ts`** - Save images from Windows clipboard for analysis (useful for screenshot-based work)
2. **`playwright.ts`** - Browser automation CLI tool (token-efficient alternative to MCP)
3. **`doctor.ts`** - Health checks for OpenCode configuration
4. **`blocker-tracker.ts`** - Real-time blocker monitoring with duration tracking
5. **`episodic-memory-query.ts`** - Query tool events and artifacts from episodic memory

---

### 📋 Protocols Added

**New Protocol Rulesets (in `protocols/rulesets/`):**

1. **`CLAIMS_AND_CITATIONS.md`** - Ensures quantitative claims (cost, performance, improvements) are cited or marked as estimates
2. **`SECURITY.md`** - Security rules (no hardcoded secrets, safe logging, redaction)
3. **`GIT_HYGIENE.md`** - Git safety (commit discipline, no force push, incremental PRs)
4. **`TESTING.md`** - Test placement rules (tests in `/tests/`, not `/plugin/`)
5. **`PERFORMANCE.md`** - Performance discipline (avoid unbounded work, profile hot paths)
6. **`OUTPUT_DISCIPLINE.md`** - Skimmable outputs, consistent tags, avoid huge dumps

**Main Protocol:**

7. **`HANDOFF_PROTOCOLS.md`** - Lightweight handoff patterns complement Delegation Protocols

---

## ❌ What Was EXCLUDED

**Mai Context DB Related:**

- `mai-context-patterns/` skill (requires Mai MCP)
- `mai-context-db-playbook/` skill (requires Mai MCP)
- `MAI_CONTEXT_INTEGRATION.md` protocol (requires Mai MCP)
- All references to Mai Context DB in copied skills

**Personality-Specific (Not Sanitized):**

- `peerage-assemble/` skill (too specific to personal setup's agent names)
- Original `kai-clean-code/` (replaced with generic `clean-code-standards/`)

---

## 📦 Directory Structure (After Migration)

```
~/ai-kit/
├── skills/
│   ├── agent-routing/              # NEW (sanitized)
│   ├── clean-code-standards/       # NEW (sanitized)
│   ├── coding-guidelines/          # NEW
│   ├── delegation-protocols/       # NEW
│   ├── effort-complexity-framework/  # NEW
│   ├── gitbutler/                  # NEW
│   ├── handoff-patterns/           # NEW
│   ├── tool-selection/             # NEW
│   └── [existing skills...]
├── .opencode/tool/
│   ├── blocker-tracker.ts          # NEW
│   ├── clip-img.ts                 # NEW
│   ├── doctor.ts                   # NEW
│   ├── episodic-memory-query.ts    # NEW
│   ├── playwright.ts               # NEW
│   └── [existing tools...]
├── protocols/
│   ├── rulesets/                   # NEW DIRECTORY
│   │   ├── CLAIMS_AND_CITATIONS.md
│   │   ├── GIT_HYGIENE.md
│   │   ├── OUTPUT_DISCIPLINE.md
│   │   ├── PERFORMANCE.md
│   │   ├── SECURITY.md
│   │   └── TESTING.md
│   ├── HANDOFF_PROTOCOLS.md        # NEW
│   └── [existing protocols...]
└── [existing files...]
```

---

## 🔧 Next Steps (Recommended)

### 1. Update AGENTS.md

Reference the new skills and rulesets in your `AGENTS.md`:

```markdown
## Skills

Load skills as needed:

- `effort-complexity-framework` - Replace time estimates
- `delegation-protocols` - v1.4 protocols
- `handoff-patterns` - Multi-agent handoffs
- `tool-selection` - Fast tool selection
- `coding-guidelines` - LLM coding anti-patterns
- `gitbutler` - Virtual branch workflow
- `agent-routing` - Specialist selection
- `clean-code-standards` - Minimal comments, max readability
```

### 2. Update Delegation Protocols

If your `protocols/DELEGATION_PROTOCOLS.md` is older than v1.4, consider updating to the latest version (which uses effort-complexity framework instead of time estimates).

### 3. Test New Tools

Try the new custom tools:

```bash
# Health check
bun .opencode/tool/doctor.ts

# Blocker tracking
bun .opencode/tool/blocker-tracker.ts --op list

# Episodic memory query
bun .opencode/tool/episodic-memory-query.ts --mode recent --limit 10
```

### 4. Reference Rulesets

Update your main protocols to reference the modular rulesets:

```markdown
## Safety Rules

See protocol rulesets:

- `protocols/rulesets/SECURITY.md`
- `protocols/rulesets/GIT_HYGIENE.md`
- `protocols/rulesets/TESTING.md`
- `protocols/rulesets/PERFORMANCE.md`
- `protocols/rulesets/OUTPUT_DISCIPLINE.md`
- `protocols/rulesets/CLAIMS_AND_CITATIONS.md`
```

### 5. Agent Role Mapping

For `agent-routing` skill to work, map your agent names to roles:

| Your Agent Name | Generic Role          |
| --------------- | --------------------- |
| coordinator     | Coordinator           |
| implementer     | Implementer           |
| architect       | System Architect      |
| reviewer        | Code Reviewer         |
| research        | Research Specialist   |
| strategist      | Requirements Analyst  |
| (add yours...)  | (map to generic role) |

---

## 💡 Key Benefits

**1. Effort-Complexity Framework**

- Replaces error-prone time estimates
- Clear fidelity gates (F1/F2/F3)
- Aligns with Delegation Protocols v1.4

**2. Modular Rulesets**

- Cleaner than inline rules in AGENTS.md
- Easy to reference and update
- Consistent enforcement

**3. Better Tool Selection**

- Fast routing with tool-selection skill
- Custom tools for specific needs
- GitButler for parallel agent work

**4. Quality Standards**

- Clean code standards from real codebases
- Coding guidelines to prevent LLM mistakes
- Handoff patterns to prevent context loss

**5. Corporate-Safe**

- No personality references
- Generic role names
- Professional language throughout

---

## 📊 Token Budget Impact

**Skills Added:** 8 skills (~20K tokens total when loaded)  
**Tools Added:** 5 tools (minimal runtime impact)  
**Protocols Added:** 7 protocol docs (~15K tokens)

**Recommendation:** Load skills only when needed (not all at once).

---

## 🎯 Usage Examples

**For Medium+ Effort Tasks:**

```typescript
// Load before planning
await skill({ name: "effort-complexity-framework" });

// Assess task
PLAN FOR APPROVAL:
- EFFORT: Medium
- COMPLEXITY: Moderate
- FIDELITY: 2 (requires plan approval)
```

**For Multi-Agent Work:**

```typescript
// Load for coordination
await skill({ name: "handoff-patterns" });
await skill({ name: "delegation-protocols" });

// Plan handoff
HANDOFF
- GOAL: Build auth system
- PATTERN: Sequential (Architect → Implementer → Reviewer)
```

**For Code Quality:**

```typescript
// Load before implementation
await skill({ name: "clean-code-standards" });
await skill({ name: "coding-guidelines" });

// Follow checklist before review
```

---

**Migration Complete!** 🎉

Your ai-kit now has enhanced coordination, quality, and tool capabilities while maintaining corporate-friendly language and excluding personal/Mai-specific content.
