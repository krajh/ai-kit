# Security Hardening Plan: ai-kit v1 Installer & Updater with Cosign Keyless

**Document Version:** 1.0  
**Date:** January 29, 2026  
**Scope:** WSL-only installer and silent daily updater with cosign keyless verification  
**Status:** Plan (no code changes; implementation pending approval)

---

## Executive Summary

This plan addresses supply-chain security, local privilege escalation, tampering, and rollback attacks for the ai-kit installer and updater. The plan includes:

1. **Threat Model** - Attack vectors and risk assessment
2. **Mitigations Checklist** - Concrete controls ranked by priority
3. **Installer & Plugin Rules** - Do/don't guidelines for safe execution
4. **Secret Scanning Gate** - Lightweight prevention of credential leaks
5. **Cosign Verification Strategy** - Keyless pinning and failure handling

---

## 1. Threat Model

### 1.1 Supply-Chain Attacks

**Threat:** Attacker compromises GitHub repository or intercepts curl|bash download

| Attack Vector                                          | Likelihood      | Impact               | Mitigation                                                    |
| ------------------------------------------------------ | --------------- | -------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| GitHub repo compromise (credentials, malicious commit) | Medium          | Critical             | Cosign keyless verification, branch protection, code review   |
| Man-in-the-middle (curl                                | bash over HTTP) | Low (HTTPS enforced) | Critical                                                      | Enforce HTTPS only, pin certificate, verify signature |
| Typosquatting (similar repo name)                      | Low             | High                 | Document official repo URL, use short links with verification |
| Compromised npm plugin dependency                      | Medium          | High                 | Pin plugin versions, audit dependencies, verify checksums     |
| Malicious plugin in opencode.json                      | Medium          | High                 | Validate plugin list, sign opencode.json, audit on update     |

**Risk Rating:** 🔴 **CRITICAL** - Installer runs with user privileges; updater runs silently

---

### 1.2 Local Privilege Escalation

**Threat:** Installer or updater exploits local permissions to gain elevated access

| Attack Vector                                 | Likelihood | Impact | Mitigation                                                    |
| --------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Unsafe file permissions on ~/.config/opencode | Medium     | High   | Verify 0700 (user-only), reject if world-readable             |
| Symlink attacks during backup/restore         | Medium     | High   | Use atomic operations, verify symlink targets, no follow      |
| Temporary file race conditions                | Low        | Medium | Use mktemp with secure flags, verify ownership                |
| RC file injection (append to .bashrc/.zshrc)  | Medium     | High   | Validate RC file path, use append-only mode, verify content   |
| Backup directory traversal                    | Low        | Medium | Validate backup path, reject if contains .. or absolute paths |

**Risk Rating:** 🟠 **HIGH** - Affects user's shell environment and config directory

---

### 1.3 Tampering & Integrity

**Threat:** Attacker modifies installer, updater, or configuration files after download

| Attack Vector                    | Likelihood | Impact   | Mitigation                                                  |
| -------------------------------- | ---------- | -------- | ----------------------------------------------------------- |
| Unsigned installer script        | High       | Critical | Sign installer with cosign keyless, verify before execution |
| Unsigned opencode.json           | High       | High     | Sign config, verify signature on load, reject if tampered   |
| Unsigned plugin manifests        | Medium     | High     | Verify plugin checksums, pin versions, audit on update      |
| Unsigned backup archives         | Low        | Medium   | Sign backups, verify before restore, reject if tampered     |
| Modified README or documentation | Low        | Medium   | Sign docs, verify integrity, warn if mismatch               |

**Risk Rating:** 🔴 **CRITICAL** - No current signature verification

---

### 1.4 Rollback Attacks

**Threat:** Attacker forces downgrade to older, vulnerable version

| Attack Vector                                     | Likelihood | Impact | Mitigation                                                    |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Downgrade to unsigned older installer             | Medium     | High   | Enforce minimum version, verify version in signature          |
| Downgrade to older opencode.json with weak config | Medium     | High   | Track version in config, reject downgrades, audit trail       |
| Restore from old backup with vulnerabilities      | Low        | Medium | Sign backups with timestamp, reject old backups, audit        |
| Replay old update manifest                        | Low        | Medium | Include timestamp in manifest, verify freshness, reject stale |

**Risk Rating:** 🟠 **HIGH** - Silent updater makes rollback detection difficult

---

### 1.5 Remote Code Execution (RCE)

**Threat:** Installer or updater executes untrusted remote code

| Attack Vector                                 | Likelihood | Impact   | Mitigation                                              |
| --------------------------------------------- | ---------- | -------- | ------------------------------------------------------- |
| curl\|bash pattern (current)                  | High       | Critical | **ELIMINATE** - never pipe curl to bash                 |
| Executing remote scripts without verification | High       | Critical | Download, verify signature, then execute                |
| Eval or source of untrusted content           | Medium     | Critical | Never eval/source remote content, parse and validate    |
| Plugin auto-load without verification         | Medium     | High     | Verify plugin signatures, audit plugin code, sandboxing |
| Unvalidated shell variable expansion          | Low        | Medium   | Quote all variables, use set -u, validate inputs        |

**Risk Rating:** 🔴 **CRITICAL** - Current README recommends curl|bash

---

### 1.6 Credential Leakage

**Threat:** Secrets (API keys, tokens) accidentally committed or logged

| Attack Vector                       | Likelihood | Impact   | Mitigation                                                  |
| ----------------------------------- | ---------- | -------- | ----------------------------------------------------------- |
| AITOOLINGKEY in RC file (plaintext) | Medium     | Critical | Use env vars only, never log, rotate on leak                |
| Credentials in test files           | Medium     | High     | Secret scanning gate, pre-commit hook, audit                |
| Credentials in logs or error output | Low        | High     | Redact secrets, use placeholders, audit logging             |
| Credentials in backup archives      | Low        | High     | Exclude sensitive files from backup, encrypt backups        |
| Credentials in git history          | Medium     | Critical | Pre-commit hook, secret scanning, history rewrite if needed |

**Risk Rating:** 🔴 **CRITICAL** - AITOOLINGKEY is sensitive

---

## 2. Mitigations Checklist

### Priority 1: CRITICAL (Must implement before v1 release)

#### 2.1.1 Eliminate curl|bash Pattern

- [ ] **Action:** Remove curl|bash from README.md and all documentation
- [ ] **Replacement:** Provide signed installer download + verification instructions
- [ ] **Rationale:** curl|bash is the #1 supply-chain attack vector
- [ ] **Implementation:**
  - Host installer on GitHub releases with cosign signatures
  - Document: `curl -fsSL https://github.com/krajh/ai-kit/releases/download/v1.0.0/install -o install && cosign verify-blob --signature install.sig install && bash install`
  - Provide checksums (SHA256) as fallback verification

#### 2.1.2 Implement Cosign Keyless Verification

- [ ] **Action:** Sign installer, opencode.json, and plugin manifests with cosign keyless
- [ ] **Issuer:** Use GitHub OIDC (issuer: `https://token.actions.githubusercontent.com`)
- [ ] **Identity:** Pin to specific GitHub identity (e.g., `https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0`)
- [ ] **Verification:** Installer must verify cosign signature before proceeding
- [ ] **Failure Handling:** Reject unsigned/invalid signatures; never proceed with warning-only
- [ ] **Implementation:**
  ```bash
  # Installer verification (before execution)
  cosign verify-blob \
    --signature install.sig \
    --certificate install.crt \
    --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    install
  ```

#### 2.1.3 Secret Scanning Gate (Pre-Commit)

- [ ] **Action:** Implement lightweight secret scanning to prevent credential commits
- [ ] **Tools:** Use `truffleHog` or `detect-secrets` in pre-commit hook
- [ ] **Scope:** Scan all files except `.git/`, `node_modules/`, `venv/`
- [ ] **Patterns:** API keys, tokens, private keys, connection strings, passwords
- [ ] **Failure:** Block commit if secrets detected; require explicit override with justification
- [ ] **Implementation:**

  ```bash
  # .git/hooks/pre-commit
  #!/bin/bash
  set -euo pipefail

  # Scan for secrets
  if ! truffleHog filesystem . --json --fail 2>/dev/null | grep -q "^$"; then
    echo "[!] Secret scanning detected potential credentials. Commit blocked."
    echo "    Review the output above and remove secrets before committing."
    exit 1
  fi
  ```

#### 2.1.4 Validate Installer Permissions & Paths

- [ ] **Action:** Installer must validate all paths and permissions before execution
- [ ] **Checks:**
  - Reject if TARGET_DIR (~/.config/opencode) is world-readable or group-writable
  - Reject if BACKUP_ROOT contains symlinks or .. traversal
  - Reject if RC_FILE is not in $HOME
  - Verify SCRIPT_DIR is readable and not world-writable
- [ ] **Implementation:**

  ```bash
  validate_permissions() {
    # Check target directory permissions
    if [ -d "$TARGET_DIR" ]; then
      local perms=$(stat -c %a "$TARGET_DIR")
      if [[ ! "$perms" =~ ^7[0-7][0-7]$ ]]; then
        log "ERROR: $TARGET_DIR has unsafe permissions: $perms (expected 7xx)"
        exit 1
      fi
    fi

    # Reject symlinks in backup path
    if [ -L "$BACKUP_ROOT" ]; then
      log "ERROR: $BACKUP_ROOT is a symlink. Rejecting for security."
      exit 1
    fi

    # Validate RC file is in home directory
    if [[ ! "$RC_FILE" =~ ^$HOME/ ]]; then
      log "ERROR: RC_FILE is outside \$HOME. Rejecting."
      exit 1
    fi
  }
  ```

#### 2.1.5 Secure RC File Handling

- [ ] **Action:** Installer must safely append to RC file without overwriting or injection
- [ ] **Checks:**
  - Use append-only mode (>>), never truncate
  - Validate RC file path is in $HOME
  - Check if AITOOLINGKEY already exists before appending
  - Use atomic writes (write to temp, then mv)
  - Never execute RC file content during install
- [ ] **Implementation:**

  ```bash
  ensure_aio_key() {
    # Validate RC file path
    if [[ ! "$RC_FILE" =~ ^$HOME/ ]]; then
      log "ERROR: RC_FILE is outside \$HOME"
      return 1
    fi

    # Check if already configured
    if grep -q "^export AITOOLINGKEY=" "$RC_FILE" 2>/dev/null; then
      log "AITOOLINGKEY already configured"
      return
    fi

    # Append safely (never truncate)
    {
      echo ""
      echo "# OpenCode Corporate Kit - AITooling API Key"
      echo "export AITOOLINGKEY=\"<REDACTED>\""
    } >> "$RC_FILE"

    log "AITOOLINGKEY added to $RC_FILE (value redacted in logs)"
  }
  ```

#### 2.1.6 Disable curl|bash in Updater

- [ ] **Action:** Updater must never use curl|bash or pipe remote scripts
- [ ] **Implementation:**
  - Download manifest to temp file
  - Verify cosign signature
  - Parse manifest (JSON, not shell)
  - Download each file individually
  - Verify each file's signature
  - Apply updates atomically
- [ ] **Failure Handling:** If any signature verification fails, abort and alert user

#### 2.1.7 Timeout & Resource Limits

- [ ] **Action:** Installer and updater must have strict timeouts and resource limits
- [ ] **Timeouts:**
  - Network operations: 30 seconds max
  - Signature verification: 10 seconds max
  - Backup/restore: 5 minutes max
- [ ] **Resource Limits:**
  - Max file size: 100MB
  - Max backup size: 500MB
  - Max concurrent operations: 1 (sequential only)
- [ ] **Implementation:**

  ```bash
  # Timeout wrapper
  timeout_cmd() {
    local timeout=$1
    shift
    timeout "$timeout" "$@" || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        log "ERROR: Operation timed out after ${timeout}s"
      fi
      return $exit_code
    }
  }

  # Usage
  timeout_cmd 30 curl -fsSL "$REMOTE_MANIFEST"
  ```

#### 2.1.8 Audit Trail & Logging

- [ ] **Action:** Installer and updater must maintain audit trail of all operations
- [ ] **Log File:** ~/.config/opencode/.install-audit.log (append-only, 0600 permissions)
- [ ] **Entries:**
  - Timestamp, operation, result (success/failure)
  - File checksums before/after
  - Signature verification results
  - User who ran installer
  - Installer version
- [ ] **Retention:** Keep last 30 days of logs
- [ ] **Implementation:**
  ```bash
  audit_log() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local user=$(whoami)
    local msg="$*"
    echo "[$timestamp] [$user] $msg" >> "$AUDIT_LOG"
  }
  ```

---

### Priority 2: HIGH (Implement in v1.1 or shortly after)

#### 2.2.1 Signature Verification for opencode.json

- [ ] **Action:** Updater must verify cosign signature on opencode.json before loading
- [ ] **Implementation:**
  - Sign opencode.json with cosign keyless during release
  - Updater verifies signature before parsing
  - Reject if signature invalid or missing
  - Store signature alongside config

#### 2.2.2 Plugin Manifest Verification

- [ ] **Action:** Verify checksums and signatures for all plugins listed in opencode.json
- [ ] **Implementation:**
  - Create plugin-manifest.json with checksums and signatures
  - Updater verifies each plugin before installation
  - Reject if checksum mismatch or signature invalid
  - Audit plugin changes in log

#### 2.2.3 Backup Encryption & Signing

- [ ] **Action:** Sign and optionally encrypt backup archives
- [ ] **Implementation:**
  - Sign backup with cosign keyless
  - Optionally encrypt with user's GPG key (if available)
  - Verify signature before restore
  - Reject if signature invalid or missing

#### 2.2.4 Version Pinning & Rollback Prevention

- [ ] **Action:** Track version in config and reject downgrades
- [ ] **Implementation:**
  - Add "version" field to opencode.json
  - Updater rejects if new version < current version
  - Log version changes in audit trail
  - Warn user if downgrade attempted

#### 2.2.5 Updater Sandboxing (WSL-specific)

- [ ] **Action:** Run updater in isolated WSL environment to limit blast radius
- [ ] **Implementation:**
  - Create temporary WSL distro for update operations
  - Run updater in temp distro
  - Verify changes before applying to main installation
  - Clean up temp distro after completion

---

### Priority 3: MEDIUM (Implement in v1.2+)

#### 2.3.1 Automated Security Scanning

- [ ] **Action:** Scan installer and updater code for security issues
- [ ] **Tools:** ShellCheck, Trivy, SAST
- [ ] **CI/CD:** Run on every commit, block merge if issues found

#### 2.3.2 Dependency Audit

- [ ] **Action:** Audit npm plugin dependencies for known vulnerabilities
- [ ] **Tools:** npm audit, Snyk
- [ ] **CI/CD:** Run on every commit, alert on new vulnerabilities

#### 2.3.3 Code Signing for Installer Script

- [ ] **Action:** Sign installer script itself (not just verify, but sign for distribution)
- [ ] **Implementation:**
  - Use cosign to sign installer script
  - Provide signature alongside installer
  - Document verification process

#### 2.3.4 User Consent & Transparency

- [ ] **Action:** Display what installer will do before proceeding
- [ ] **Implementation:**
  - Show summary of changes (files to be copied, RC file modifications)
  - Require explicit user confirmation (not just --dry-run)
  - Display cosign verification results
  - Show audit trail of previous installs

---

## 3. Installer & Plugin Rules (Do/Don't)

### 3.1 Installer Script Rules

#### DO:

- ✅ **Validate all inputs** - Check paths, permissions, file sizes before use
- ✅ **Use absolute paths** - Never rely on $PATH or relative paths
- ✅ **Quote all variables** - Prevent word splitting and globbing: `"$VAR"`
- ✅ **Set strict mode** - Use `set -euo pipefail` at top of script
- ✅ **Verify signatures** - Check cosign signatures before executing any remote code
- ✅ **Use atomic operations** - Write to temp file, then mv (not append directly)
- ✅ **Log all operations** - Maintain audit trail with timestamps
- ✅ **Timeout network calls** - Set 30s max for curl/wget operations
- ✅ **Validate file ownership** - Ensure files are owned by user, not root
- ✅ **Use mktemp securely** - Create temp files with `mktemp -d` (not /tmp/install-$$)
- ✅ **Verify checksums** - Compare SHA256 before and after operations
- ✅ **Reject symlinks** - Never follow symlinks in critical paths
- ✅ **Validate RC file path** - Ensure RC file is in $HOME, not /etc or /root
- ✅ **Use append-only mode** - Never truncate RC file, only append
- ✅ **Redact secrets in logs** - Never print API keys, tokens, or passwords

#### DON'T:

- ❌ **Never use curl|bash** - Always download, verify, then execute
- ❌ **Never eval or source remote content** - Parse and validate instead
- ❌ **Never run as root** - Installer should run as user, not sudo
- ❌ **Never trust $PATH** - Use absolute paths for all commands
- ❌ **Never skip signature verification** - Always verify, never proceed with warning-only
- ❌ **Never write to /etc or /root** - Only write to $HOME
- ❌ **Never use /tmp for critical files** - Use mktemp in $HOME or ~/.config
- ❌ **Never follow symlinks** - Check with `[ -L "$file" ]` and reject
- ❌ **Never execute user-provided scripts** - Parse and validate instead
- ❌ **Never log secrets** - Use placeholders like `<REDACTED>` or `<TOKEN>`
- ❌ **Never assume file permissions** - Always validate with `stat -c %a`
- ❌ **Never use unquoted variables** - Always quote: `"$VAR"`, not $VAR
- ❌ **Never truncate RC file** - Use append (>>) not overwrite (>)
- ❌ **Never skip error handling** - Check exit codes, use `|| exit 1`
- ❌ **Never hardcode paths** - Use variables and validate

### 3.2 Updater Rules

#### DO:

- ✅ **Download manifest first** - Get update manifest before any changes
- ✅ **Verify manifest signature** - Check cosign signature on manifest
- ✅ **Stage updates** - Apply to staging directory, not live installation
- ✅ **Verify each file** - Check signature and checksum for every file
- ✅ **Atomic swap** - Use mv to swap staging → live (all-or-nothing)
- ✅ **Backup before update** - Create backup before applying changes
- ✅ **Verify backup** - Test backup can be restored before proceeding
- ✅ **Log all changes** - Record what was updated, when, and by whom
- ✅ **Notify user** - Show what was updated and any breaking changes
- ✅ **Provide rollback** - Document how to restore from backup
- ✅ **Check version** - Reject downgrades, warn on major version changes
- ✅ **Timeout operations** - Set 5-minute max for entire update process
- ✅ **Validate permissions** - Ensure updated files have correct permissions

#### DON'T:

- ❌ **Never update in-place** - Always stage first, then swap
- ❌ **Never skip signature verification** - Verify every file
- ❌ **Never proceed if backup fails** - Abort if backup cannot be created
- ❌ **Never update without user consent** - Show what will change, get approval
- ❌ **Never delete old version** - Keep backup for rollback
- ❌ **Never run updater as root** - Should run as user
- ❌ **Never update during active use** - Only update on startup or after shutdown
- ❌ **Never ignore verification failures** - Abort and alert user
- ❌ **Never update plugins without verification** - Check signatures first
- ❌ **Never proceed if version check fails** - Reject downgrades

### 3.3 Plugin Rules

#### DO:

- ✅ **Verify plugin signatures** - Check cosign signature before loading
- ✅ **Validate plugin manifest** - Ensure plugin is listed in opencode.json
- ✅ **Check plugin version** - Verify version matches pinned version
- ✅ **Audit plugin code** - Review plugin source before first load
- ✅ **Isolate plugin execution** - Run plugins in separate process if possible
- ✅ **Limit plugin permissions** - Plugins should not access sensitive files
- ✅ **Log plugin loads** - Record which plugins are loaded and when
- ✅ **Timeout plugin initialization** - Set 10s max for plugin startup
- ✅ **Validate plugin output** - Sanitize any output from plugins

#### DON'T:

- ❌ **Never auto-load unsigned plugins** - Require signature verification
- ❌ **Never execute plugin code without review** - Audit before first load
- ❌ **Never allow plugins to modify RC files** - Restrict file access
- ❌ **Never allow plugins to execute shell commands** - Sandbox execution
- ❌ **Never allow plugins to access credentials** - Isolate from secrets
- ❌ **Never load plugins from untrusted sources** - Only from opencode.json
- ❌ **Never skip version pinning** - Always pin to specific version
- ❌ **Never allow plugins to modify installer** - Restrict file access

---

## 4. Secret Scanning Gate

### 4.1 Implementation Strategy

**Goal:** Prevent accidental credential commits without blocking legitimate development

**Approach:** Lightweight pre-commit hook using pattern matching (not ML-based)

### 4.2 Patterns to Detect

```
# API Keys & Tokens
- AITOOLINGKEY=
- api_key=
- apiKey:
- access_token=
- secret_key=
- private_key=
- AWS_SECRET_ACCESS_KEY=
- GITHUB_TOKEN=
- OPENAI_API_KEY=

# Connection Strings
- password=
- passwd=
- pwd=
- connection_string=
- mongodb://.*:.*@
- postgresql://.*:.*@

# Private Keys
- BEGIN RSA PRIVATE KEY
- BEGIN PRIVATE KEY
- BEGIN EC PRIVATE KEY
- BEGIN OPENSSH PRIVATE KEY

# AWS Credentials
- AKIA[0-9A-Z]{16}  (AWS Access Key ID)
- aws_secret_access_key=

# Generic Secrets
- secret:
- credentials:
- token:
```

### 4.3 Pre-Commit Hook Implementation

```bash
#!/bin/bash
# .git/hooks/pre-commit

set -euo pipefail

PATTERNS=(
  "AITOOLINGKEY="
  "api_key="
  "apiKey:"
  "access_token="
  "secret_key="
  "private_key="
  "AWS_SECRET_ACCESS_KEY="
  "GITHUB_TOKEN="
  "OPENAI_API_KEY="
  "password="
  "passwd="
  "pwd="
  "connection_string="
  "BEGIN RSA PRIVATE KEY"
  "BEGIN PRIVATE KEY"
  "BEGIN EC PRIVATE KEY"
  "BEGIN OPENSSH PRIVATE KEY"
  "AKIA[0-9A-Z]{16}"
  "aws_secret_access_key="
  "secret:"
  "credentials:"
  "token:"
)

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Scan for secrets
FOUND_SECRETS=0
for file in $STAGED_FILES; do
  # Skip binary files and common safe directories
  if [[ "$file" =~ \.(png|jpg|gif|pdf|zip|tar|gz)$ ]] || \
     [[ "$file" =~ ^(\.git|node_modules|venv|\.venv)/ ]]; then
    continue
  fi

  for pattern in "${PATTERNS[@]}"; do
    if grep -E "$pattern" "$file" 2>/dev/null; then
      echo "[!] Potential secret detected in $file: $pattern"
      FOUND_SECRETS=1
    fi
  done
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo ""
  echo "[!] Secret scanning detected potential credentials."
  echo "    Review the output above and remove secrets before committing."
  echo ""
  echo "    If this is a false positive, you can override with:"
  echo "    git commit --no-verify"
  echo ""
  exit 1
fi

exit 0
```

### 4.4 Installation & Enforcement

- [ ] **Install hook:** Copy pre-commit hook to `.git/hooks/pre-commit`
- [ ] **Make executable:** `chmod +x .git/hooks/pre-commit`
- [ ] **Document:** Add to README.md with instructions for override
- [ ] **CI/CD:** Run same scan in GitHub Actions to catch bypasses

### 4.5 False Positive Handling

- [ ] **Allow override:** `git commit --no-verify` for legitimate cases
- [ ] **Document exceptions:** Add comments explaining why secret-like pattern is safe
- [ ] **Review overrides:** Audit commits with --no-verify in CI/CD
- [ ] **Improve patterns:** Refine patterns based on false positives

---

## 5. Cosign Verification Strategy

### 5.1 Keyless Signing Overview

**Why Keyless?**

- No key management burden (no private key to protect)
- Uses GitHub OIDC token (already available in CI/CD)
- Verifiable identity (GitHub account + workflow)
- Transparent and auditable

**How It Works:**

1. GitHub Actions workflow runs during release
2. Workflow obtains OIDC token from GitHub
3. Token proves: "This is GitHub user X, running workflow Y, at commit Z"
4. Cosign uses token to sign artifact (no private key needed)
5. Signature includes issuer, identity, and timestamp
6. Verifier checks: issuer is GitHub, identity matches expected workflow, timestamp is recent

### 5.2 Issuer & Identity Pinning

**Issuer (OIDC Provider):**

```
https://token.actions.githubusercontent.com
```

**Identity (GitHub Workflow):**

```
https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0
```

**Breakdown:**

- `https://github.com/krajh/ai-kit/` - Repository
- `.github/workflows/release.yml` - Workflow file
- `@refs/tags/v1.0.0` - Git ref (tag, branch, or commit)

### 5.3 Verification Command

```bash
# Verify installer signature
cosign verify-blob \
  --signature install.sig \
  --certificate install.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  install

# Verify opencode.json signature
cosign verify-blob \
  --signature opencode.json.sig \
  --certificate opencode.json.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  opencode.json
```

### 5.4 Failure Handling

**Verification Failures:**

| Failure             | Action               | Rationale                    |
| ------------------- | -------------------- | ---------------------------- |
| Signature missing   | Abort, show error    | Cannot verify authenticity   |
| Signature invalid   | Abort, show error    | Possible tampering           |
| Certificate invalid | Abort, show error    | Possible forgery             |
| Identity mismatch   | Abort, show error    | Wrong workflow or repository |
| Issuer mismatch     | Abort, show error    | Not from GitHub              |
| Timestamp too old   | Warn, allow override | Possible replay attack       |
| Network error       | Retry 3x, then abort | Transient failure            |

**Error Messages:**

```bash
# Signature missing
[X] ERROR: Signature file not found: install.sig
    Cannot verify authenticity of installer.
    Download from official GitHub release: https://github.com/krajh/ai-kit/releases

# Signature invalid
[X] ERROR: Signature verification failed for install
    Possible tampering detected. Do not proceed.
    Download fresh copy from: https://github.com/krajh/ai-kit/releases

# Identity mismatch
[X] ERROR: Certificate identity mismatch
    Expected: https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0
    Got: https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v0.9.0
    Possible downgrade attack. Do not proceed.

# Network error
[!] WARNING: Could not verify signature (network error)
    Retrying... (attempt 1/3)
    If this persists, download from: https://github.com/krajh/ai-kit/releases
```

### 5.5 Verification in Installer

```bash
verify_signature() {
  local file=$1
  local signature="${file}.sig"
  local certificate="${file}.crt"
  local identity="https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0"
  local issuer="https://token.actions.githubusercontent.com"

  # Check signature file exists
  if [ ! -f "$signature" ]; then
    log "ERROR: Signature file not found: $signature"
    log "Cannot verify authenticity of $file"
    return 1
  fi

  # Verify signature
  if ! cosign verify-blob \
    --signature "$signature" \
    --certificate "$certificate" \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer "$issuer" \
    "$file" 2>/dev/null; then
    log "ERROR: Signature verification failed for $file"
    log "Possible tampering detected. Do not proceed."
    return 1
  fi

  log "OK: Signature verified for $file"
  return 0
}

# Usage in main()
if ! verify_signature "$SCRIPT_DIR/install"; then
  exit 1
fi
```

### 5.6 Verification in Updater

```bash
verify_manifest() {
  local manifest=$1

  # Download manifest
  log "Downloading update manifest..."
  if ! timeout_cmd 30 curl -fsSL "$REMOTE_MANIFEST" -o "$manifest"; then
    log "ERROR: Failed to download manifest"
    return 1
  fi

  # Verify manifest signature
  log "Verifying manifest signature..."
  if ! verify_signature "$manifest"; then
    log "ERROR: Manifest signature verification failed"
    return 1
  fi

  # Parse manifest (JSON, not shell)
  log "Parsing manifest..."
  if ! jq empty "$manifest" 2>/dev/null; then
    log "ERROR: Invalid manifest format"
    return 1
  fi

  log "OK: Manifest verified and parsed"
  return 0
}
```

### 5.7 Certificate Pinning (Optional)

For additional security, pin the expected certificate:

```bash
# Extract certificate from signed artifact
cosign download certificate ghcr.io/krajh/ai-kit:v1.0.0 > expected.crt

# Verify certificate matches
if ! diff -q expected.crt install.crt; then
  log "ERROR: Certificate mismatch"
  return 1
fi
```

---

## 6. Implementation Roadmap

### Phase 1: Critical (v1.0 Release)

- [ ] Eliminate curl|bash from documentation
- [ ] Implement cosign keyless signing in CI/CD
- [ ] Add signature verification to installer
- [ ] Implement secret scanning pre-commit hook
- [ ] Add permission validation to installer
- [ ] Secure RC file handling
- [ ] Add audit logging

### Phase 2: High Priority (v1.1)

- [ ] Signature verification for opencode.json
- [ ] Plugin manifest verification
- [ ] Backup encryption and signing
- [ ] Version pinning and rollback prevention
- [ ] Comprehensive audit trail

### Phase 3: Medium Priority (v1.2+)

- [ ] Automated security scanning (ShellCheck, Trivy)
- [ ] Dependency auditing (npm audit, Snyk)
- [ ] User consent and transparency UI
- [ ] WSL-specific sandboxing

---

## 7. Testing & Validation

### 7.1 Security Testing Checklist

- [ ] **Signature Verification**
  - [ ] Valid signature passes verification
  - [ ] Invalid signature fails verification
  - [ ] Missing signature fails verification
  - [ ] Tampered file fails verification
  - [ ] Wrong identity fails verification

- [ ] **Permission Validation**
  - [ ] Rejects world-readable ~/.config/opencode
  - [ ] Rejects group-writable ~/.config/opencode
  - [ ] Rejects symlinks in backup path
  - [ ] Rejects RC file outside $HOME

- [ ] **RC File Handling**
  - [ ] Appends without truncating
  - [ ] Detects existing AITOOLINGKEY
  - [ ] Validates RC file path
  - [ ] Never logs secrets

- [ ] **Secret Scanning**
  - [ ] Detects API keys
  - [ ] Detects tokens
  - [ ] Detects private keys
  - [ ] Detects connection strings
  - [ ] Allows override with --no-verify

- [ ] **Timeout & Resource Limits**
  - [ ] Network operations timeout after 30s
  - [ ] Signature verification times out after 10s
  - [ ] Backup/restore times out after 5 minutes
  - [ ] Max file size enforced (100MB)

- [ ] **Audit Logging**
  - [ ] All operations logged with timestamp
  - [ ] Secrets redacted in logs
  - [ ] Audit log has correct permissions (0600)
  - [ ] Audit log persists across updates

### 7.2 Attack Simulation

- [ ] **Supply-Chain Attack:** Modify installer, verify signature verification catches it
- [ ] **Privilege Escalation:** Try to create world-readable config, verify rejection
- [ ] **Tampering:** Modify opencode.json, verify signature verification catches it
- [ ] **Rollback:** Try to downgrade version, verify rejection
- [ ] **Credential Leak:** Try to commit API key, verify pre-commit hook catches it

---

## 8. Documentation & User Communication

### 8.1 README.md Updates

**Current (UNSAFE):**

```bash
curl -fsSL https://raw.githubusercontent.com/krajh/ai-kit/main/install | bash
```

**Proposed (SAFE):**

```bash
# Download installer and signature
curl -fsSL https://github.com/krajh/ai-kit/releases/download/v1.0.0/install -o install
curl -fsSL https://github.com/krajh/ai-kit/releases/download/v1.0.0/install.sig -o install.sig
curl -fsSL https://github.com/krajh/ai-kit/releases/download/v1.0.0/install.crt -o install.crt

# Verify signature
cosign verify-blob \
  --signature install.sig \
  --certificate install.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  install

# Execute installer
bash install
```

### 8.2 Security Policy

Create `SECURITY.md`:

- Reporting security vulnerabilities
- Supported versions
- Security update process
- Responsible disclosure

### 8.3 Audit Trail Documentation

Document how to:

- View audit logs: `cat ~/.config/opencode/.install-audit.log`
- Verify installer version: `head -1 ~/.config/opencode/.install-audit.log`
- Check update history: `grep "UPDATE" ~/.config/opencode/.install-audit.log`
- Restore from backup: `~/.config/opencode.backups/opencode-TIMESTAMP/`

---

## 9. Compliance & Standards

### 9.1 Standards Alignment

- **NIST SP 800-53:** SC-7 (Boundary Protection), SI-7 (Software, Firmware, and Information Integrity)
- **CIS Controls:** v8 2.3 (Address Unauthorized Software), 6.2 (Ensure Software is Authorized)
- **OWASP:** A06:2021 (Vulnerable and Outdated Components), A08:2021 (Software and Data Integrity Failures)

### 9.2 Threat Modeling Framework

- **STRIDE:** Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **CVSS:** Common Vulnerability Scoring System for risk assessment

---

## 10. Success Metrics

| Metric                          | Target | Measurement                           |
| ------------------------------- | ------ | ------------------------------------- |
| Signature verification coverage | 100%   | All artifacts signed and verified     |
| Secret scanning detection       | 100%   | No credentials in commits             |
| Audit trail completeness        | 100%   | All operations logged                 |
| Permission validation           | 100%   | All paths validated before use        |
| Timeout enforcement             | 100%   | All network ops have timeouts         |
| Documentation clarity           | 100%   | No curl\|bash in docs                 |
| User adoption                   | >90%   | Verified installs via signed releases |

---

## 11. Appendix: Reference Commands

### Cosign Installation

```bash
# macOS
brew install cosign

# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.0.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# WSL
# Use Linux installation above
```

### Signing Artifacts (CI/CD)

```bash
# Sign installer
cosign sign-blob \
  --yes \
  install > install.sig

# Sign opencode.json
cosign sign-blob \
  --yes \
  opencode.json > opencode.json.sig
```

### Verifying Artifacts (User)

```bash
# Verify installer
cosign verify-blob \
  --signature install.sig \
  --certificate install.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  install

# Verify opencode.json
cosign verify-blob \
  --signature opencode.json.sig \
  --certificate opencode.json.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  opencode.json
```

### Secret Scanning

```bash
# Install truffleHog
pip install truffleHog

# Scan repository
truffleHog filesystem . --json --fail

# Scan specific file
truffleHog filesystem . --json --fail --include-paths "opencode.json"
```

---

## 12. Revision History

| Version | Date       | Author   | Changes                         |
| ------- | ---------- | -------- | ------------------------------- |
| 1.0     | 2026-01-29 | Security | Initial security hardening plan |

---

**Document Status:** PLAN (Ready for Review & Implementation)  
**Next Steps:**

1. Review with security team
2. Prioritize implementation phases
3. Create GitHub issues for each action item
4. Assign owners and deadlines
5. Begin Phase 1 implementation
