---
name: webfetch-best-practices
description: |
  Avoid common webfetch failure modes (404s, auth, size limits) with reliable URL patterns and fallbacks.
  Use when fetching web content, handling URLs, or when the user asks about "webfetch", "fetch URL", "get content".
  Trigger phrases: "webfetch", "fetch", "URL", "get content", "scrape", "download".
  Do NOT use for code implementation, debugging, or local file operations.
---

# Webfetch Best Practices

Use these rules when calling `webfetch` to reduce 404s, auth failures, and oversized responses.

## 1. GitHub Raw Content

- **ALWAYS use `main`**, not `dev`.
- Format:

```
https://raw.githubusercontent.com/{org}/{repo}/main/{path}
```

## 2. Documentation Sites

- If a doc URL 404s, retry the **base domain** and navigate from there.
- Microsoft Learn and GitHub Docs reorganized many paths from 2024–2026.

## 3. OpenCode URLs

- **Do NOT use** `opencode.ai/config` (does not exist).
- Use: `https://github.com/anomalyco/opencode`.

## 4. Ephemeral URLs

- **NEVER webfetch GitHub Actions job URLs.**
- Use the `gh` CLI for Actions logs/artifacts instead.

## 5. Auth-Required Endpoints

- `webfetch` cannot handle authentication.
- Use authenticated clients for `auth.*` subdomains, OpenRouter API, etc.

## 6. Private Repositories

- `webfetch` cannot access private repos.
- Use `gh` CLI with auth or clone locally.

## 7. Size Limits

- Pages larger than **5MB** will fail.
- For large content, use targeted API calls or narrower endpoints.
