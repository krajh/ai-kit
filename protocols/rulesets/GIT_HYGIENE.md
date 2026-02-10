# Git hygiene ruleset

## Commit discipline

- Do not commit unless explicitly asked.
- Do not commit files that likely contain secrets (e.g. `.env`, `credentials.json`).

## Safe git operations

- Avoid destructive/irreversible commands unless explicitly asked (e.g. `reset --hard`, `push --force`, history rewrite).
- Avoid interactive git (`-i`) in this environment.

## PR discipline

- Prefer incremental, reviewable changes.
- Keep diffs to requested scope; note unrelated issues but dont fix unless asked.
