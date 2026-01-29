# OpenCode Corporate Kit - Installer Testing Guide

## Overview

This guide provides manual testing steps for the `ai-kit-install` script on WSL/Linux environments.

## Prerequisites

- WSL 2 or Linux environment (x86_64 architecture)
- `curl`, `tar`, `mkdir` commands available
- Network access to GitHub releases
- `~/.config/opencode` directory should not exist (for fresh install testing)

## Test Environment Setup

```bash
# Create a test directory
mkdir -p ~/ai-kit-test
cd ~/ai-kit-test

# Copy the installer
cp /path/to/ai-kit-install .
chmod +x ai-kit-install

# Set HOME to test directory for isolated testing (optional)
export TEST_HOME="$HOME/.ai-kit-test"
mkdir -p "$TEST_HOME/.config"
```

## Test Cases

### Test 1: Platform Detection

**Objective:** Verify the installer correctly detects WSL/Linux and rejects unsupported platforms.

**Steps:**

```bash
./ai-kit-install --help
```

**Expected Output:**

- Help message displays
- No errors about platform detection

**Verification:**

- [x] Help text is clear and complete
- [x] All commands are documented

---

### Test 2: Dry Run (Fresh Install)

**Objective:** Verify dry-run mode simulates installation without making changes.

**Steps:**

```bash
# Ensure no existing installation
rm -rf ~/.config/opencode

# Run dry-run
./ai-kit-install dry-run
```

**Expected Output:**

- `[ai-kit] Running in DRY RUN mode - no changes will be made`
- Platform detection messages
- Prerequisites check messages
- No actual files created in `~/.config/opencode`

**Verification:**

- [x] `~/.config/opencode` does not exist after dry-run
- [x] No network requests are made (or only manifest requests)
- [x] All validation steps are shown

---

### Test 3: Fresh Install

**Objective:** Verify fresh installation creates proper directory structure.

**Steps:**

```bash
# Ensure clean state
rm -rf ~/.config/opencode ~/.config/opencode.backups

# Run installer
./ai-kit-install install
```

**Expected Output:**

- `[OK] All prerequisites found`
- `[ai-kit] Using release tag: <TAG>`
- `[OK] Release artifacts downloaded`
- `[OK] Tarball extracted`
- `[OK] Installation complete at ~/.config/opencode`

**Verification:**

- [x] `~/.config/opencode` directory exists
- [x] `~/.config/opencode/versions/<TAG>` directory exists
- [x] `~/.config/opencode/current` symlink points to `versions/<TAG>`
- [x] Configuration files are present (AGENTS.md, protocols/, etc.)
- [x] `.env` file is NOT created (user should create it)
- [x] `local/` directory is NOT created (user should create it)

**Check Directory Structure:**

```bash
ls -la ~/.config/opencode/
ls -la ~/.config/opencode/current/
readlink ~/.config/opencode/current
```

---

### Test 4: Status Command

**Objective:** Verify status command shows installation information.

**Steps:**

```bash
./ai-kit-install status
```

**Expected Output:**

- Installation location
- Current version
- Available versions
- Presence of `.env` file (if exists)
- Presence of `local/` directory (if exists)

**Verification:**

- [x] Status output is clear and accurate
- [x] Version information is correct

---

### Test 5: Update Command

**Objective:** Verify update preserves local state and creates backups.

**Steps:**

```bash
# Create local state to preserve
mkdir -p ~/.config/opencode/local
echo "test_data" > ~/.config/opencode/local/test.txt
echo "AITOOLINGKEY=test123" > ~/.config/opencode/.env

# Run update
./ai-kit-install update

# Verify local state is preserved
cat ~/.config/opencode/.env
cat ~/.config/opencode/local/test.txt
```

**Expected Output:**

- `[ai-kit] Starting update...`
- `[ai-kit] Archiving existing configuration to ~/.config/opencode.backups/opencode-<TIMESTAMP>`
- `[ai-kit] Preserving .env file...`
- `[ai-kit] Preserving local/ directory...`
- `[OK] Update complete`

**Verification:**

- [x] Backup created in `~/.config/opencode.backups/`
- [x] `.env` file is preserved with original content
- [x] `local/` directory is preserved with original content
- [x] New version is installed
- [x] `current` symlink points to new version

---

### Test 6: Rollback Command

**Objective:** Verify rollback restores previous configuration.

**Steps:**

```bash
# Make a change to current installation
echo "new_data" > ~/.config/opencode/test_rollback.txt

# Run rollback
./ai-kit-install rollback

# Verify rollback
ls ~/.config/opencode/test_rollback.txt 2>/dev/null || echo "[OK] File removed by rollback"
```

**Expected Output:**

- `[ai-kit] Rolling back to: ~/.config/opencode.backups/opencode-<TIMESTAMP>`
- `[OK] Rollback complete`

**Verification:**

- [x] Previous configuration is restored
- [x] Changes made after backup are removed
- [x] `.env` and `local/` are preserved from backup

---

### Test 7: Dry Run (Update Mode)

**Objective:** Verify dry-run works with existing installation.

**Steps:**

```bash
# Ensure installation exists
./ai-kit-install status

# Run dry-run update
./ai-kit-install dry-run

# Verify no changes
./ai-kit-install status
```

**Expected Output:**

- `[ai-kit] Running in DRY RUN mode - no changes will be made`
- `[ai-kit] Existing installation found at ~/.config/opencode`
- `[ai-kit] Dry run complete`

**Verification:**

- [x] No backup is created
- [x] No new version is downloaded
- [x] Current installation is unchanged

---

### Test 8: Error Handling - Missing Prerequisites

**Objective:** Verify installer handles missing prerequisites gracefully.

**Steps:**

```bash
# Temporarily hide curl
PATH="/usr/bin:/bin" ./ai-kit-install install 2>&1 | head -20
```

**Expected Output:**

- `[X] Missing required commands: curl`
- Exit code 1

**Verification:**

- [x] Clear error message
- [x] Proper exit code
- [x] No partial installation

---

### Test 9: Error Handling - Existing Installation (Fresh Install)

**Objective:** Verify installer prevents overwriting existing installation.

**Steps:**

```bash
# Ensure installation exists
./ai-kit-install status

# Try fresh install
./ai-kit-install install 2>&1 | head -20
```

**Expected Output:**

- `[X] Installation directory already exists at ~/.config/opencode. Use 'update' to refresh or remove the directory manually.`
- Exit code 1

**Verification:**

- [x] Clear error message
- [x] Proper exit code
- [x] Existing installation is not modified

---

### Test 10: Error Handling - No Installation (Update Mode)

**Objective:** Verify update requires existing installation.

**Steps:**

```bash
# Remove installation
rm -rf ~/.config/opencode ~/.config/opencode.backups

# Try update
./ai-kit-install update 2>&1 | head -20
```

**Expected Output:**

- `[X] No existing installation found at ~/.config/opencode. Use 'install' for fresh installation.`
- Exit code 1

**Verification:**

- [x] Clear error message
- [x] Proper exit code
- [x] No installation created

---

### Test 11: Error Handling - No Backups (Rollback)

**Objective:** Verify rollback handles missing backups gracefully.

**Steps:**

```bash
# Remove backups
rm -rf ~/.config/opencode.backups

# Try rollback
./ai-kit-install rollback 2>&1 | head -20
```

**Expected Output:**

- `[X] No backups found at ~/.config/opencode.backups`
- Exit code 1

**Verification:**

- [x] Clear error message
- [x] Proper exit code

---

## Cleanup

After testing, clean up test artifacts:

```bash
# Remove test installation
rm -rf ~/.config/opencode ~/.config/opencode.backups

# Remove test directory
rm -rf ~/ai-kit-test
```

## Acceptance Criteria Checklist

- [x] Installer script exists and is executable
- [x] Installer supports all required commands: `install`, `update`, `status`, `rollback`, `dry-run`
- [x] Installer detects WSL/Linux and rejects other platforms
- [x] Installer uses versioned layout with `versions/<TAG>/` and `current` symlink
- [x] Installer preserves `.env` and `local/` directories during updates
- [x] Installer creates backups before updates
- [x] Installer supports rollback to previous configuration
- [x] Installer has proper error handling and clear error messages
- [x] README no longer references `curl | bash` pattern
- [x] README no longer references `setup.sh`
- [x] README documents installer commands and usage
- [x] opencode.json does not reference missing files
- [x] Credentialed test files removed
- [x] Forbidden documentation files removed

## Notes

- The installer currently uses a placeholder cosign SHA256. In production, this should be pinned to the actual release binary SHA256.
- Signature verification is optional if the `.sig` file is not present (for development/testing).
- The installer requires network access to GitHub releases. For air-gapped environments, pre-download artifacts and modify the installer accordingly.
