# Changelog

All notable changes to ai-kit are documented here.

## [0.9.11] — 2026-04-17

### Added

- **Claude Opus 4.7 (aitooling)** — Added `claude-opus-4-7` to the `aitooling` provider model catalog in `opencode.json`

---

## [0.9.10] — 2025-04-14

### Added

- **5 new skills** — verify-loop, session-end, brainstorming, git-hygiene, output-discipline

---

## [0.9.9] — 2025-01-27

### Added

- **7 new skills** — claims-and-citations, prompt-caching, security-best-practices, testing, checkpoint, status-snapshot, webfetch-best-practices

### Changed

- All 6 agents updated with new skill triggers matching role responsibilities
- AGENTS.md skill loading table updated

---

## [0.9.8] — 2025-01-27

### Added

- **Skill discovery tables** — All 6 agents now include skill auto-loading triggers and loading rules for better skill discovery

### Fixed

- `coding-guidelines/SKILL.md` — Removed nested metadata block, converted to multi-line description format per Agent Skills spec

### Changed

- **coordinator** — Expanded from 1 skill reference to full skill table with SKILL CHECK requirement
- **implementer, reviewer, research, architect, strategist** — Added skill trigger tables matching role responsibilities

---

## [0.9.7] — 2025-01-25

### Fixed

- **ai-kit-update** — JSON-aware merge preserves custom agent model choices when updating `opencode.json`

### Fixed

- **ai-kit-update** — JSON-aware merge preserves custom agent model choices when updating `opencode.json`
- **Cross-provider detection** — Detects and warns when model config becomes stale after provider switch

---

## [0.9.3] — 2025-01-15

### Added

- **ai-kit-models** command — List available models for any provider
- **ai-kit-provider** command — Switch providers safely with auto model defaults

### Fixed

- **cosign verification** — Gracefully skips when bundle unavailable

### Changed

- **Model defaults** — Architect now uses `claude-opus-4.6` (copilot)

---

## [0.9.2] — 2025-01-10

### Added

- **Per-agent model config** — Support for mixing GPT and Anthropic models per agent
- **Copilot model sync** — Syncs GitHub Copilot model list for selection

### Changed

- README condensed, dead code removed

---

## [0.9.1] — 2025-01-05

### Fixed

- **ai-kit-update** — Unescapes glob patterns correctly on Windows

---

## [0.9.0] — 2024-12-20

### Added

- **Full ai-kit installer** — Single-command setup
- **Provider selection** — aitooling or copilot
- **6 core agents** — coordinator, strategist, implementer, reviewer, research, architect
- **16 skills** — delegation, routing, verification, testing, and more
- **Shade support** — Background task executor
- **Frieren integration** — Optional memory planes
