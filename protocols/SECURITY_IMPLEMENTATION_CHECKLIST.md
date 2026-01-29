# Security Implementation Checklist

**Document Version:** 1.0  
**Date:** January 29, 2026  
**Purpose:** Track implementation of security hardening plan items  
**Status:** Ready for implementation

---

## Phase 1: CRITICAL (v1.0 Release)

### 1.1 Eliminate curl|bash Pattern

- [ ] **Task:** Remove curl|bash from README.md
  - [ ] Update Quick Start section
  - [ ] Update Installation section
  - [ ] Add signed release download instructions
  - [ ] Document cosign verification steps
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Create GitHub release with signed artifacts
  - [ ] Set up GitHub Actions workflow for release
  - [ ] Sign installer with cosign keyless
  - [ ] Sign opencode.json with cosign keyless
  - [ ] Upload signatures and certificates to release
  - [ ] Test verification process
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Document official download URL
  - [ ] Add to README.md
  - [ ] Add to SECURITY.md
  - [ ] Create short URL with verification instructions
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.2 Implement Cosign Keyless Verification

- [ ] **Task:** Set up GitHub OIDC for cosign
  - [ ] Configure GitHub Actions workflow
  - [ ] Test OIDC token generation
  - [ ] Verify cosign can sign with OIDC
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Add signature verification to installer
  - [ ] Implement `verify_signature()` function
  - [ ] Verify installer before execution
  - [ ] Verify opencode.json before loading
  - [ ] Test with valid and invalid signatures
  - [ ] Test with tampered files
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Add signature verification to updater
  - [ ] Download and verify manifest signature
  - [ ] Verify each file before applying
  - [ ] Reject if any signature invalid
  - [ ] Test failure scenarios
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Document cosign verification for users
  - [ ] Add to README.md
  - [ ] Create SECURITY.md with verification steps
  - [ ] Provide example commands
  - [ ] Document failure scenarios
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.3 Secret Scanning Gate (Pre-Commit)

- [ ] **Task:** Create pre-commit hook
  - [ ] Implement pattern matching for secrets
  - [ ] Add API key patterns
  - [ ] Add token patterns
  - [ ] Add private key patterns
  - [ ] Add connection string patterns
  - [ ] Test with sample secrets
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Install pre-commit hook
  - [ ] Copy hook to .git/hooks/pre-commit
  - [ ] Make executable (chmod +x)
  - [ ] Test hook blocks commits with secrets
  - [ ] Test hook allows --no-verify override
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Document secret scanning
  - [ ] Add to README.md
  - [ ] Document override procedure
  - [ ] Document false positive handling
  - [ ] Add to SECURITY.md
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Add CI/CD secret scanning
  - [ ] Add GitHub Actions workflow
  - [ ] Scan on every commit
  - [ ] Block merge if secrets detected
  - [ ] Alert on --no-verify overrides
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.4 Validate Installer Permissions & Paths

- [ ] **Task:** Implement permission validation
  - [ ] Check TARGET_DIR permissions (must be 0700)
  - [ ] Check BACKUP_ROOT for symlinks
  - [ ] Check RC_FILE is in $HOME
  - [ ] Check SCRIPT_DIR is readable
  - [ ] Reject unsafe permissions
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Test permission validation
  - [ ] Test with correct permissions (0700)
  - [ ] Test with world-readable (0755)
  - [ ] Test with group-writable (0770)
  - [ ] Test with symlinks
  - [ ] Test with RC file outside $HOME
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.5 Secure RC File Handling

- [ ] **Task:** Implement safe RC file append
  - [ ] Validate RC file path is in $HOME
  - [ ] Check if AITOOLINGKEY already exists
  - [ ] Use append-only mode (>>)
  - [ ] Never truncate RC file
  - [ ] Use atomic writes (temp → mv)
  - [ ] Redact secrets in logs
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Test RC file handling
  - [ ] Test append to existing RC file
  - [ ] Test detection of existing AITOOLINGKEY
  - [ ] Test with RC file outside $HOME
  - [ ] Test that RC file is not truncated
  - [ ] Test that secrets are redacted in logs
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.6 Disable curl|bash in Updater

- [ ] **Task:** Implement safe update mechanism
  - [ ] Download manifest to temp file
  - [ ] Verify manifest signature
  - [ ] Parse manifest (JSON, not shell)
  - [ ] Download each file individually
  - [ ] Verify each file's signature
  - [ ] Apply updates atomically
  - [ ] Never use curl|bash
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Test updater safety
  - [ ] Test with valid manifest
  - [ ] Test with invalid manifest
  - [ ] Test with tampered files
  - [ ] Test atomic application
  - [ ] Test rollback on failure
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.7 Timeout & Resource Limits

- [ ] **Task:** Implement timeouts
  - [ ] Network operations: 30s max
  - [ ] Signature verification: 10s max
  - [ ] Backup/restore: 5 minutes max
  - [ ] Use `timeout` command
  - [ ] Handle timeout errors gracefully
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Implement resource limits
  - [ ] Max file size: 100MB
  - [ ] Max backup size: 500MB
  - [ ] Max concurrent operations: 1
  - [ ] Validate file sizes before processing
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Test timeouts and limits
  - [ ] Test network timeout
  - [ ] Test signature verification timeout
  - [ ] Test file size limit
  - [ ] Test backup size limit
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 1.8 Audit Trail & Logging

- [ ] **Task:** Implement audit logging
  - [ ] Create ~/.config/opencode/.install-audit.log
  - [ ] Log all operations with timestamp
  - [ ] Log user and installer version
  - [ ] Log file checksums
  - [ ] Log signature verification results
  - [ ] Redact secrets in logs
  - [ ] Set permissions to 0600
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Test audit logging
  - [ ] Verify log file created with correct permissions
  - [ ] Verify all operations logged
  - [ ] Verify secrets redacted
  - [ ] Verify log persists across updates
  - [ ] Verify log rotation (30-day retention)
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Document audit trail
  - [ ] Add to README.md
  - [ ] Document log location
  - [ ] Document log format
  - [ ] Document how to view logs
  - [ ] Document how to check update history
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

## Phase 2: HIGH PRIORITY (v1.1)

### 2.1 Signature Verification for opencode.json

- [ ] **Task:** Implement opencode.json signature verification
  - [ ] Sign opencode.json in release workflow
  - [ ] Verify signature before loading config
  - [ ] Reject if signature invalid
  - [ ] Test with valid and invalid signatures
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 2.2 Plugin Manifest Verification

- [ ] **Task:** Create plugin manifest
  - [ ] List all plugins with checksums
  - [ ] Sign manifest with cosign
  - [ ] Include in release
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Implement plugin verification
  - [ ] Verify plugin checksums
  - [ ] Verify plugin signatures
  - [ ] Reject if verification fails
  - [ ] Test with valid and invalid plugins
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 2.3 Backup Encryption & Signing

- [ ] **Task:** Implement backup signing
  - [ ] Sign backup archives with cosign
  - [ ] Include signature with backup
  - [ ] Verify signature before restore
  - [ ] Reject if signature invalid
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Implement backup encryption (optional)
  - [ ] Encrypt backup with user's GPG key
  - [ ] Decrypt before restore
  - [ ] Handle missing GPG key gracefully
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 2.4 Version Pinning & Rollback Prevention

- [ ] **Task:** Add version tracking
  - [ ] Add "version" field to opencode.json
  - [ ] Track version in audit log
  - [ ] Reject downgrades
  - [ ] Warn on major version changes
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 2.5 Updater Sandboxing (WSL-specific)

- [ ] **Task:** Implement WSL sandboxing
  - [ ] Create temporary WSL distro for updates
  - [ ] Run updater in temp distro
  - [ ] Verify changes before applying
  - [ ] Clean up temp distro
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

## Phase 3: MEDIUM PRIORITY (v1.2+)

### 3.1 Automated Security Scanning

- [ ] **Task:** Add ShellCheck to CI/CD
  - [ ] Install ShellCheck
  - [ ] Scan installer and updater scripts
  - [ ] Fix all warnings
  - [ ] Block merge if issues found
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Add Trivy scanning
  - [ ] Install Trivy
  - [ ] Scan for vulnerabilities
  - [ ] Block merge if critical issues found
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 3.2 Dependency Audit

- [ ] **Task:** Add npm audit to CI/CD
  - [ ] Run npm audit on every commit
  - [ ] Alert on new vulnerabilities
  - [ ] Update dependencies regularly
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Add Snyk scanning
  - [ ] Integrate Snyk with GitHub
  - [ ] Scan on every commit
  - [ ] Alert on vulnerabilities
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 3.3 Code Signing for Installer Script

- [ ] **Task:** Sign installer script
  - [ ] Sign installer with cosign
  - [ ] Provide signature alongside installer
  - [ ] Document verification process
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

### 3.4 User Consent & Transparency

- [ ] **Task:** Implement pre-install summary
  - [ ] Show what will be installed
  - [ ] Show what files will be modified
  - [ ] Show RC file modifications
  - [ ] Require explicit user confirmation
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

- [ ] **Task:** Display verification results
  - [ ] Show cosign verification results
  - [ ] Show audit trail of previous installs
  - [ ] Show version information
  - **Owner:** ****\_\_\_****
  - **Status:** Pending
  - **Notes:**

---

## Testing & Validation

### Security Testing

- [ ] **Signature Verification Tests**
  - [ ] Valid signature passes
  - [ ] Invalid signature fails
  - [ ] Missing signature fails
  - [ ] Tampered file fails
  - [ ] Wrong identity fails

- [ ] **Permission Validation Tests**
  - [ ] Rejects world-readable config
  - [ ] Rejects group-writable config
  - [ ] Rejects symlinks
  - [ ] Rejects RC file outside $HOME

- [ ] **RC File Handling Tests**
  - [ ] Appends without truncating
  - [ ] Detects existing AITOOLINGKEY
  - [ ] Validates RC file path
  - [ ] Never logs secrets

- [ ] **Secret Scanning Tests**
  - [ ] Detects API keys
  - [ ] Detects tokens
  - [ ] Detects private keys
  - [ ] Detects connection strings
  - [ ] Allows override with --no-verify

- [ ] **Timeout & Resource Limit Tests**
  - [ ] Network operations timeout
  - [ ] Signature verification times out
  - [ ] Backup/restore times out
  - [ ] File size limit enforced

- [ ] **Audit Logging Tests**
  - [ ] All operations logged
  - [ ] Secrets redacted
  - [ ] Correct permissions (0600)
  - [ ] Persists across updates

### Attack Simulation

- [ ] **Supply-Chain Attack**
  - [ ] Modify installer
  - [ ] Verify signature verification catches it

- [ ] **Privilege Escalation**
  - [ ] Try to create world-readable config
  - [ ] Verify rejection

- [ ] **Tampering**
  - [ ] Modify opencode.json
  - [ ] Verify signature verification catches it

- [ ] **Rollback**
  - [ ] Try to downgrade version
  - [ ] Verify rejection

- [ ] **Credential Leak**
  - [ ] Try to commit API key
  - [ ] Verify pre-commit hook catches it

---

## Documentation

- [ ] **README.md Updates**
  - [ ] Remove curl|bash pattern
  - [ ] Add signed release download instructions
  - [ ] Add cosign verification steps
  - [ ] Add audit trail documentation

- [ ] **SECURITY.md Creation**
  - [ ] Reporting vulnerabilities
  - [ ] Supported versions
  - [ ] Security update process
  - [ ] Responsible disclosure

- [ ] **Audit Trail Documentation**
  - [ ] How to view logs
  - [ ] How to check update history
  - [ ] How to restore from backup

---

## Sign-Off

| Phase                | Owner        | Status  | Date         | Notes        |
| -------------------- | ------------ | ------- | ------------ | ------------ |
| Phase 1 (Critical)   | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |
| Phase 2 (High)       | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |
| Phase 3 (Medium)     | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |
| Testing & Validation | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |
| Documentation        | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |
| **FINAL APPROVAL**   | ****\_\_**** | Pending | ****\_\_**** | ****\_\_**** |

---

**Document Status:** READY FOR IMPLEMENTATION  
**Next Steps:**

1. Assign owners to each task
2. Create GitHub issues for each phase
3. Set deadlines and milestones
4. Begin Phase 1 implementation
5. Track progress in this checklist
