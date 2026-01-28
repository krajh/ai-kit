# Tool Usage Guide — Corporate Edition

## 1. Command selection
- Use `bash` only for repository management, installs, build/test commands, or git operations.
- Use `read`, `glob`, and `grep` for journalistic inspection—keep outputs concise.
- Create or edit files with `write`, `edit`, or `apply_patch`; avoid `cat`, `sed`, or inline shell redirection for large changes.

## 2. File creation workflow
1. Inspect existing files before editing (`read` or `glob`).
2. If you are adding a new file, use `write` with full contents.
3. For small inline edits, prefer `apply_patch` for clarity and history.
4. When reorganizing directories, use `bash` with `mkdir -p` and `mv` as needed.

## 3. Testing & validation
- Run `bun install` once before other commands.
- Use `bun fmt`, `bunx tsc --noEmit --pretty false`, and `bun test --pass-with-no-tests` as baseline checks.
- After editing documentation, re-run `bun fmt` if code snippets changed, then `bun test`.

## 4. Custom agents & protocols
- When adding agents, use `agent/templates/specialist.md.template` as a starting point (see AGENTS guide).
- Protocol updates must land under `protocols/` and mention which rule set they belong to (delegation, documentation, etc.).
- Avoid referencing specific personalities; keep tone institutional and capability-driven.
