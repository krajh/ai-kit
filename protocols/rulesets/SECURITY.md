# Security ruleset

## Secrets and credentials

- Never hardcode secrets (API keys, tokens, private keys, connection strings).
- In `opencode.json`, reference secrets using `{env:VAR_NAME}` (do not inline literal values).
- Do not commit `.env` files or credential exports.

## Redaction & safe logging

- Treat logs/output as user-visible: never print secrets.
- Use placeholders in examples (`<TOKEN>`, `<PASSWORD>`).
- Return only the minimum excerpt needed to diagnose.

## Safe handling

- Prefer reading secrets from environment variables at runtime.
- If a tool output likely contains secrets, summarize instead of pasting raw.
