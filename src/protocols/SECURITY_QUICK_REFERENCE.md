# Security Quick Reference Guide

**Purpose:** Fast lookup for security rules and best practices  
**Audience:** Developers, installers, updaters  
**Status:** Active

---

## 🚨 Critical Rules (MUST FOLLOW)

### Rule 1: Never curl|bash

```bash
# ❌ WRONG
curl -fsSL https://example.com/install | bash

# ✅ RIGHT
curl -fsSL https://example.com/install -o install
cosign verify-blob --signature install.sig install
bash install
```

### Rule 2: Always Verify Signatures

```bash
# ❌ WRONG
curl -fsSL https://example.com/installer > installer
bash installer  # No verification!

# ✅ RIGHT
curl -fsSL https://example.com/installer -o installer
curl -fsSL https://example.com/installer.sig -o installer.sig
cosign verify-blob --signature installer.sig installer
bash installer
```

### Rule 3: Never Log Secrets

```bash
# ❌ WRONG
log "AITOOLINGKEY=$AITOOLINGKEY"
echo "API Key: $API_KEY"

# ✅ RIGHT
log "AITOOLINGKEY configured"
log "API Key: <REDACTED>"
```

### Rule 4: Never Truncate RC Files

```bash
# ❌ WRONG
echo "export AITOOLINGKEY=$KEY" > ~/.bashrc  # Overwrites entire file!

# ✅ RIGHT
echo "export AITOOLINGKEY=$KEY" >> ~/.bashrc  # Appends only
```

### Rule 5: Always Quote Variables

```bash
# ❌ WRONG
mkdir $TARGET_DIR
cp $SOURCE $DEST

# ✅ RIGHT
mkdir "$TARGET_DIR"
cp "$SOURCE" "$DEST"
```

---

## 🔐 Signature Verification

### Verify Installer

```bash
cosign verify-blob \
  --signature install.sig \
  --certificate install.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  install
```

### Verify opencode.json

```bash
cosign verify-blob \
  --signature opencode.json.sig \
  --certificate opencode.json.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  opencode.json
```

### Verification Failure Handling

```bash
if ! cosign verify-blob ...; then
  log "ERROR: Signature verification failed"
  log "Possible tampering detected. Do not proceed."
  exit 1
fi
```

---

## 🛡️ Permission Validation

### Check Directory Permissions

```bash
# Check if directory is user-only (0700)
perms=$(stat -c %a "$TARGET_DIR")
if [[ ! "$perms" =~ ^7[0-7][0-7]$ ]]; then
  log "ERROR: Unsafe permissions: $perms"
  exit 1
fi
```

### Reject Symlinks

```bash
if [ -L "$BACKUP_ROOT" ]; then
  log "ERROR: $BACKUP_ROOT is a symlink"
  exit 1
fi
```

### Validate RC File Path

```bash
if [[ ! "$RC_FILE" =~ ^$HOME/ ]]; then
  log "ERROR: RC_FILE is outside \$HOME"
  exit 1
fi
```

---

## 🔑 Secret Handling

### Patterns to Detect

```
AITOOLINGKEY=
api_key=
apiKey:
access_token=
secret_key=
private_key=
AWS_SECRET_ACCESS_KEY=
GITHUB_TOKEN=
OPENAI_API_KEY=
password=
BEGIN RSA PRIVATE KEY
BEGIN PRIVATE KEY
```

### Pre-Commit Hook

```bash
# Install hook
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Override if needed
git commit --no-verify
```

### Secret Scanning

```bash
# Scan for secrets
truffleHog filesystem . --json --fail

# Scan specific file
grep -E "AITOOLINGKEY=|api_key=|secret_key=" opencode.json
```

---

## ⏱️ Timeouts & Limits

### Network Operations (30s max)

```bash
timeout 30 curl -fsSL "$URL" -o file
```

### Signature Verification (10s max)

```bash
timeout 10 cosign verify-blob --signature file.sig file
```

### Backup/Restore (5 minutes max)

```bash
timeout 300 tar -czf backup.tar.gz ~/.config/opencode
```

### File Size Limits

```bash
# Max 100MB
if [ $(stat -c%s "$file") -gt 104857600 ]; then
  log "ERROR: File too large"
  exit 1
fi
```

---

## 📝 Audit Logging

### Log Location

```
~/.config/opencode/.install-audit.log
```

### Log Format

```
[2026-01-29T12:34:56Z] [username] Operation: installer started
[2026-01-29T12:34:57Z] [username] Signature verified: install
[2026-01-29T12:35:00Z] [username] Backup created: opencode-20260129T123456Z
[2026-01-29T12:35:05Z] [username] Configuration deployed
[2026-01-29T12:35:06Z] [username] Installation complete
```

### Log Permissions

```bash
# Must be 0600 (user-only)
chmod 0600 ~/.config/opencode/.install-audit.log
```

### View Audit Trail

```bash
# View all operations
cat ~/.config/opencode/.install-audit.log

# View recent operations
tail -20 ~/.config/opencode/.install-audit.log

# View update history
grep "UPDATE" ~/.config/opencode/.install-audit.log

# View signature verification
grep "Signature" ~/.config/opencode/.install-audit.log
```

---

## 🔄 Update Process

### Safe Update Flow

```
1. Download manifest
2. Verify manifest signature
3. Parse manifest (JSON)
4. For each file:
   a. Download file
   b. Verify file signature
   c. Verify file checksum
5. Stage all files
6. Verify staged files
7. Backup current installation
8. Swap staging → live (atomic)
9. Log update
10. Notify user
```

### Never Do This

```bash
# ❌ WRONG: In-place update
curl -fsSL "$URL/opencode.json" > ~/.config/opencode/opencode.json

# ❌ WRONG: No verification
curl -fsSL "$URL/file" | tar -xz

# ❌ WRONG: No backup
rm -rf ~/.config/opencode && cp staging/* ~/.config/opencode

# ❌ WRONG: Pipe to bash
curl -fsSL "$URL/update.sh" | bash
```

---

## 🚀 Installer Checklist

Before running installer:

- [ ] Download from official GitHub release
- [ ] Verify signature with cosign
- [ ] Check file permissions (should be 0755)
- [ ] Review audit log of previous installs
- [ ] Ensure ~/.config/opencode has correct permissions (0700)
- [ ] Have backup of current config (installer creates one)

During installation:

- [ ] Review what will be installed
- [ ] Confirm RC file modifications
- [ ] Provide AITOOLINGKEY if needed
- [ ] Wait for completion message

After installation:

- [ ] Check audit log for success
- [ ] Verify opencode command works
- [ ] Test with `opencode --version`
- [ ] Review ~/.config/opencode permissions

---

## 🔍 Verification Commands

### Check Installer Signature

```bash
cosign verify-blob \
  --signature install.sig \
  --certificate install.crt \
  --certificate-identity "https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/v1.0.0" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  install && echo "✓ Signature valid"
```

### Check File Permissions

```bash
stat -c "%a %n" ~/.config/opencode
# Should show: 700 /home/user/.config/opencode
```

### Check Audit Log

```bash
tail -5 ~/.config/opencode/.install-audit.log
```

### Check for Secrets

```bash
grep -E "AITOOLINGKEY=|api_key=|secret_key=" ~/.config/opencode/opencode.json
# Should return nothing
```

### Check Backup

```bash
ls -la ~/.config/opencode.backups/
# Should show timestamped backups
```

---

## 🆘 Troubleshooting

### Signature Verification Failed

```
[X] ERROR: Signature verification failed for install
    Possible tampering detected. Do not proceed.
```

**Solution:**

1. Delete downloaded files
2. Download fresh from official GitHub release
3. Verify signature again
4. If still fails, report to security team

### Permission Denied

```
[X] ERROR: ~/.config/opencode has unsafe permissions: 755
    (expected 700)
```

**Solution:**

```bash
chmod 700 ~/.config/opencode
./install
```

### RC File Not Found

```
[X] ERROR: RC_FILE is outside $HOME
    Rejecting for security.
```

**Solution:**

1. Check your shell: `echo $SHELL`
2. Ensure RC file is in home directory
3. Run installer again

### Timeout During Update

```
[!] WARNING: Operation timed out after 30s
    Network may be slow. Retrying...
```

**Solution:**

1. Check internet connection
2. Try again
3. If persistent, check GitHub status

### Audit Log Permission Error

```
[X] ERROR: Cannot write to audit log
    Permission denied: ~/.config/opencode/.install-audit.log
```

**Solution:**

```bash
chmod 0600 ~/.config/opencode/.install-audit.log
./install
```

---

## 📚 Related Documentation

- **SECURITY_HARDENING_PLAN.md** - Full threat model and mitigations
- **SECURITY_IMPLEMENTATION_CHECKLIST.md** - Implementation tracking
- **README.md** - Installation instructions
- **SECURITY.md** - Vulnerability reporting and policy

---

## 🔗 External Resources

- **Cosign Documentation:** https://docs.sigstore.dev/cosign/overview/
- **GitHub OIDC:** https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- **NIST SP 800-53:** https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

**Last Updated:** January 29, 2026  
**Status:** Active  
**Feedback:** Report issues to security team
