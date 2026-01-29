# Threat Matrix: ai-kit v1 Installer & Updater

**Purpose:** Quick reference for threat assessment and mitigation status  
**Date:** January 29, 2026  
**Status:** Planning phase

---

## Threat Summary

| Threat Category            | Count  | Critical | High   | Medium | Status                 |
| -------------------------- | ------ | -------- | ------ | ------ | ---------------------- |
| Supply-Chain Attacks       | 5      | 3        | 2      | 0      | 🔴 Unmitigated         |
| Local Privilege Escalation | 5      | 1        | 4      | 0      | 🔴 Unmitigated         |
| Tampering & Integrity      | 5      | 3        | 2      | 0      | 🔴 Unmitigated         |
| Rollback Attacks           | 4      | 0        | 3      | 1      | 🔴 Unmitigated         |
| Remote Code Execution      | 6      | 4        | 2      | 0      | 🔴 Unmitigated         |
| Credential Leakage         | 6      | 2        | 3      | 1      | 🟠 Partially Mitigated |
| **TOTAL**                  | **31** | **13**   | **16** | **2**  | **🔴 CRITICAL**        |

---

## Detailed Threat Matrix

### 1. Supply-Chain Attacks

| #   | Threat                     | Vector                               | Likelihood | Impact   | Current Status | Mitigation                                     | Priority |
| --- | -------------------------- | ------------------------------------ | ---------- | -------- | -------------- | ---------------------------------------------- | -------- |
| 1.1 | GitHub repo compromise     | Malicious commit, stolen credentials | Medium     | Critical | 🔴 None        | Cosign keyless verification, branch protection | P1       |
| 1.2 | MITM attack (curl\|bash)   | HTTP interception                    | Low        | Critical | 🔴 None        | HTTPS enforcement, signature verification      | P1       |
| 1.3 | Typosquatting              | Similar repo name                    | Low        | High     | 🟠 Partial     | Official URL documentation                     | P2       |
| 1.4 | Compromised npm plugin     | Malicious dependency                 | Medium     | High     | 🔴 None        | Plugin manifest verification, version pinning  | P2       |
| 1.5 | Malicious plugin in config | Unsigned plugin list                 | Medium     | High     | 🔴 None        | Sign opencode.json, audit plugins              | P2       |

**Mitigation Status:** 🔴 **CRITICAL** - No signature verification currently implemented

---

### 2. Local Privilege Escalation

| #   | Threat                     | Vector                            | Likelihood | Impact | Current Status | Mitigation                         | Priority |
| --- | -------------------------- | --------------------------------- | ---------- | ------ | -------------- | ---------------------------------- | -------- |
| 2.1 | Unsafe file permissions    | World-readable ~/.config/opencode | Medium     | High   | 🔴 None        | Permission validation (0700 check) | P1       |
| 2.2 | Symlink attacks            | Symlink in backup path            | Medium     | High   | 🔴 None        | Symlink detection and rejection    | P1       |
| 2.3 | Temp file race condition   | /tmp file hijacking               | Low        | Medium | 🟠 Partial     | mktemp usage (needs verification)  | P2       |
| 2.4 | RC file injection          | Append to .bashrc/.zshrc          | Medium     | High   | 🔴 None        | Path validation, append-only mode  | P1       |
| 2.5 | Backup directory traversal | .. in backup path                 | Low        | Medium | 🔴 None        | Path validation, reject traversal  | P1       |

**Mitigation Status:** 🔴 **CRITICAL** - No permission validation currently implemented

---

### 3. Tampering & Integrity

| #   | Threat                    | Vector                         | Likelihood | Impact   | Current Status | Mitigation             | Priority |
| --- | ------------------------- | ------------------------------ | ---------- | -------- | -------------- | ---------------------- | -------- |
| 3.1 | Unsigned installer        | No signature on install script | High       | Critical | 🔴 None        | Cosign keyless signing | P1       |
| 3.2 | Unsigned opencode.json    | No signature on config         | High       | High     | 🔴 None        | Cosign keyless signing | P2       |
| 3.3 | Unsigned plugin manifests | No signature on plugin list    | Medium     | High     | 🔴 None        | Cosign keyless signing | P2       |
| 3.4 | Unsigned backup archives  | No signature on backups        | Low        | Medium   | 🔴 None        | Cosign keyless signing | P2       |
| 3.5 | Modified documentation    | No integrity check on docs     | Low        | Medium   | 🟠 Partial     | Git commit history     | P3       |

**Mitigation Status:** 🔴 **CRITICAL** - No signature verification currently implemented

---

### 4. Rollback Attacks

| #   | Threat                     | Vector                | Likelihood | Impact | Current Status | Mitigation                               | Priority |
| --- | -------------------------- | --------------------- | ---------- | ------ | -------------- | ---------------------------------------- | -------- |
| 4.1 | Downgrade to old installer | Force old version     | Medium     | High   | 🔴 None        | Version pinning, signature verification  | P2       |
| 4.2 | Downgrade opencode.json    | Restore old config    | Medium     | High   | 🔴 None        | Version tracking, reject downgrades      | P2       |
| 4.3 | Restore old backup         | Use vulnerable backup | Low        | Medium | 🔴 None        | Timestamp validation, reject old backups | P2       |
| 4.4 | Replay old manifest        | Use cached manifest   | Low        | Medium | 🔴 None        | Timestamp validation, freshness check    | P2       |

**Mitigation Status:** 🔴 **CRITICAL** - No version tracking or rollback prevention

---

### 5. Remote Code Execution (RCE)

| #   | Threat                        | Vector                      | Likelihood | Impact   | Current Status | Mitigation                              | Priority |
| --- | ----------------------------- | --------------------------- | ---------- | -------- | -------------- | --------------------------------------- | -------- |
| 5.1 | curl\|bash pattern            | Pipe remote script to bash  | High       | Critical | 🔴 Active      | Eliminate pattern, download + verify    | P1       |
| 5.2 | Execute remote scripts        | No verification before exec | High       | Critical | 🔴 None        | Signature verification before execution | P1       |
| 5.3 | Eval/source untrusted content | Dynamic code execution      | Medium     | Critical | 🔴 None        | Parse and validate, never eval          | P1       |
| 5.4 | Plugin auto-load              | Unsigned plugin execution   | Medium     | High     | 🔴 None        | Plugin signature verification           | P2       |
| 5.5 | Unvalidated shell expansion   | Variable injection          | Low        | Medium   | 🟠 Partial     | Quote all variables (needs audit)       | P2       |
| 5.6 | Command injection             | Unsanitized input           | Low        | Medium   | 🟠 Partial     | Input validation (needs audit)          | P2       |

**Mitigation Status:** 🔴 **CRITICAL** - curl|bash pattern still in use

---

### 6. Credential Leakage

| #   | Threat                        | Vector                     | Likelihood | Impact   | Current Status | Mitigation                       | Priority |
| --- | ----------------------------- | -------------------------- | ---------- | -------- | -------------- | -------------------------------- | -------- |
| 6.1 | AITOOLINGKEY in RC file       | Plaintext in .bashrc       | Medium     | Critical | 🟠 Partial     | Env var only, never log          | P1       |
| 6.2 | Credentials in test files     | Hardcoded secrets          | Medium     | High     | 🔴 None        | Secret scanning pre-commit hook  | P1       |
| 6.3 | Credentials in logs           | Printed to stdout/stderr   | Low        | High     | 🔴 None        | Redact secrets, use placeholders | P1       |
| 6.4 | Credentials in backups        | Secrets in backup archives | Low        | High     | 🔴 None        | Exclude sensitive files, encrypt | P2       |
| 6.5 | Credentials in git history    | Committed secrets          | Medium     | Critical | 🔴 None        | Pre-commit hook, history rewrite | P1       |
| 6.6 | Credentials in error messages | Secrets in error output    | Low        | High     | 🔴 None        | Sanitize error messages          | P2       |

**Mitigation Status:** 🟠 **PARTIALLY MITIGATED** - AITOOLINGKEY handling needs improvement

---

## Risk Heat Map

```
CRITICAL (13 threats)
├─ Supply-Chain: 3 threats
├─ Local Privilege: 1 threat
├─ Tampering: 3 threats
├─ RCE: 4 threats
└─ Credential Leakage: 2 threats

HIGH (16 threats)
├─ Supply-Chain: 2 threats
├─ Local Privilege: 4 threats
├─ Tampering: 2 threats
├─ Rollback: 3 threats
├─ RCE: 2 threats
└─ Credential Leakage: 3 threats

MEDIUM (2 threats)
├─ Rollback: 1 threat
└─ Credential Leakage: 1 threat
```

---

## Mitigation Status by Phase

### Phase 1: CRITICAL (v1.0 Release)

| Threat                       | Mitigation                   | Status     |
| ---------------------------- | ---------------------------- | ---------- |
| 1.1 - GitHub compromise      | Cosign keyless verification  | ⏳ Pending |
| 1.2 - MITM attack            | Eliminate curl\|bash         | ⏳ Pending |
| 2.1 - Unsafe permissions     | Permission validation        | ⏳ Pending |
| 2.2 - Symlink attacks        | Symlink detection            | ⏳ Pending |
| 2.4 - RC file injection      | Path validation, append-only | ⏳ Pending |
| 2.5 - Directory traversal    | Path validation              | ⏳ Pending |
| 3.1 - Unsigned installer     | Cosign signing               | ⏳ Pending |
| 5.1 - curl\|bash             | Eliminate pattern            | ⏳ Pending |
| 5.2 - Execute remote scripts | Signature verification       | ⏳ Pending |
| 5.3 - Eval/source            | Parse and validate           | ⏳ Pending |
| 6.1 - AITOOLINGKEY leak      | Env var only, no logging     | ⏳ Pending |
| 6.2 - Secrets in tests       | Secret scanning hook         | ⏳ Pending |
| 6.5 - Secrets in git         | Pre-commit hook              | ⏳ Pending |

**Phase 1 Coverage:** 13/13 critical threats addressed

---

### Phase 2: HIGH PRIORITY (v1.1)

| Threat                          | Mitigation           | Status     |
| ------------------------------- | -------------------- | ---------- |
| 1.3 - Typosquatting             | Official URL docs    | ⏳ Pending |
| 1.4 - Compromised plugin        | Plugin verification  | ⏳ Pending |
| 1.5 - Malicious plugin config   | Sign opencode.json   | ⏳ Pending |
| 2.3 - Temp file race            | mktemp verification  | ⏳ Pending |
| 3.2 - Unsigned opencode.json    | Cosign signing       | ⏳ Pending |
| 3.3 - Unsigned plugin manifests | Cosign signing       | ⏳ Pending |
| 3.4 - Unsigned backups          | Cosign signing       | ⏳ Pending |
| 4.1 - Downgrade installer       | Version pinning      | ⏳ Pending |
| 4.2 - Downgrade config          | Version tracking     | ⏳ Pending |
| 4.3 - Restore old backup        | Timestamp validation | ⏳ Pending |
| 4.4 - Replay manifest           | Freshness check      | ⏳ Pending |
| 5.4 - Plugin auto-load          | Plugin verification  | ⏳ Pending |
| 6.3 - Secrets in logs           | Redaction            | ⏳ Pending |
| 6.4 - Secrets in backups        | Encryption           | ⏳ Pending |
| 6.6 - Secrets in errors         | Error sanitization   | ⏳ Pending |

**Phase 2 Coverage:** 15/16 high-priority threats addressed

---

### Phase 3: MEDIUM PRIORITY (v1.2+)

| Threat                  | Mitigation       | Status      |
| ----------------------- | ---------------- | ----------- |
| 3.5 - Modified docs     | Git history      | ✅ Existing |
| 5.5 - Shell expansion   | Quote variables  | ⏳ Pending  |
| 5.6 - Command injection | Input validation | ⏳ Pending  |

**Phase 3 Coverage:** 2/2 medium-priority threats addressed

---

## Compliance Mapping

### NIST SP 800-53

| Control                    | Threat        | Mitigation                                   |
| -------------------------- | ------------- | -------------------------------------------- |
| SC-7 (Boundary Protection) | 1.2, 5.1, 5.2 | Signature verification, eliminate curl\|bash |
| SI-7 (Software Integrity)  | 3.1, 3.2, 3.3 | Cosign signing, signature verification       |
| AC-2 (Account Management)  | 2.1, 2.4      | Permission validation, RC file handling      |
| AC-3 (Access Control)      | 2.1, 2.2, 2.5 | Permission checks, symlink detection         |
| AU-2 (Audit Events)        | 6.1, 6.2, 6.5 | Audit logging, secret redaction              |

---

### CIS Controls v8

| Control                     | Threat        | Mitigation                                  |
| --------------------------- | ------------- | ------------------------------------------- |
| 2.3 (Unauthorized Software) | 1.4, 5.4      | Plugin verification, signature verification |
| 6.2 (Authorized Software)   | 1.1, 3.1, 5.2 | Cosign verification, signature validation   |
| 8.1 (Inventory)             | 4.1, 4.2      | Version tracking, audit logging             |
| 8.5 (Integrity)             | 3.1, 3.2, 3.3 | Cosign signing, checksum verification       |

---

### OWASP Top 10

| Category                         | Threat        | Mitigation                             |
| -------------------------------- | ------------- | -------------------------------------- |
| A06:2021 (Vulnerable Components) | 1.4, 1.5      | Dependency audit, plugin verification  |
| A08:2021 (Software Integrity)    | 3.1, 3.2, 3.3 | Cosign signing, signature verification |
| A01:2021 (Injection)             | 5.3, 5.6      | Input validation, no eval              |

---

## Risk Reduction Timeline

```
Current State (v0.9):
├─ Critical: 13 unmitigated
├─ High: 16 unmitigated
└─ Medium: 2 unmitigated
Total Risk: 🔴 CRITICAL

After Phase 1 (v1.0):
├─ Critical: 0 mitigated ✅
├─ High: 1 mitigated (6%)
└─ Medium: 0 mitigated
Total Risk: 🟠 HIGH (reduced from critical)

After Phase 2 (v1.1):
├─ Critical: 0 mitigated ✅
├─ High: 16 mitigated ✅
└─ Medium: 0 mitigated
Total Risk: 🟡 MEDIUM (reduced from high)

After Phase 3 (v1.2):
├─ Critical: 0 mitigated ✅
├─ High: 16 mitigated ✅
└─ Medium: 2 mitigated ✅
Total Risk: 🟢 LOW (all threats mitigated)
```

---

## Attack Scenarios

### Scenario 1: Supply-Chain Compromise

**Attacker Goal:** Inject malicious code into installer

**Attack Path:**

1. Compromise GitHub account or CI/CD
2. Modify installer script
3. User downloads and runs installer
4. Malicious code executes with user privileges

**Current Defenses:** None 🔴

**Mitigations (Phase 1):**

- Cosign keyless signature verification
- User verifies signature before execution
- Signature verification fails if installer modified

**Result:** Attack blocked ✅

---

### Scenario 2: Privilege Escalation

**Attacker Goal:** Gain elevated privileges

**Attack Path:**

1. Installer creates world-readable ~/.config/opencode
2. Attacker modifies files in directory
3. User runs opencode, loads malicious config
4. Attacker gains user privileges

**Current Defenses:** None 🔴

**Mitigations (Phase 1):**

- Permission validation (0700 check)
- Installer rejects if permissions unsafe
- Audit logging of permission checks

**Result:** Attack blocked ✅

---

### Scenario 3: Credential Leakage

**Attacker Goal:** Steal AITOOLINGKEY

**Attack Path:**

1. Developer commits AITOOLINGKEY to git
2. Attacker finds secret in git history
3. Attacker uses key to access API

**Current Defenses:** None 🔴

**Mitigations (Phase 1):**

- Pre-commit hook detects secrets
- Commit blocked unless overridden
- CI/CD scans for secrets

**Result:** Attack prevented ✅

---

### Scenario 4: Rollback Attack

**Attacker Goal:** Force downgrade to vulnerable version

**Attack Path:**

1. Attacker intercepts update
2. Serves old version of installer
3. User runs old installer with vulnerabilities
4. Attacker exploits vulnerability

**Current Defenses:** None 🔴

**Mitigations (Phase 2):**

- Version tracking in config
- Installer rejects downgrades
- Signature includes version info

**Result:** Attack blocked ✅

---

## Success Metrics

| Metric                          | Target | Current | Phase 1 | Phase 2 | Phase 3 |
| ------------------------------- | ------ | ------- | ------- | ------- | ------- |
| Critical threats mitigated      | 100%   | 0%      | 100%    | 100%    | 100%    |
| High threats mitigated          | 100%   | 0%      | 6%      | 100%    | 100%    |
| Medium threats mitigated        | 100%   | 0%      | 0%      | 0%      | 100%    |
| Signature verification coverage | 100%   | 0%      | 100%    | 100%    | 100%    |
| Secret scanning detection       | 100%   | 0%      | 100%    | 100%    | 100%    |
| Audit trail completeness        | 100%   | 0%      | 100%    | 100%    | 100%    |
| Permission validation           | 100%   | 0%      | 100%    | 100%    | 100%    |
| Timeout enforcement             | 100%   | 0%      | 100%    | 100%    | 100%    |

---

## Revision History

| Version | Date       | Changes               |
| ------- | ---------- | --------------------- |
| 1.0     | 2026-01-29 | Initial threat matrix |

---

**Document Status:** PLANNING PHASE  
**Next Review:** After Phase 1 implementation  
**Feedback:** Report to security team
