# ai-kit Installer Testing Guide

Manual testing steps for `ai-kit-install` on WSL/Linux environments.

## Prerequisites

- WSL 2 or Linux (x86_64)
- `curl`, `tar`, `mkdir` available
- Network access to GitHub releases
- `~/.config/opencode` should not exist for fresh install testing

## Test Environment Setup

```bash
mkdir -p ~/ai-kit-test
cp /path/to/ai-kit-install ~/ai-kit-test/
chmod +x ~/ai-kit-test/ai-kit-install
```

---

## Test Cases

### Test 1: Platform Detection

```bash
./ai-kit-install --help
```

Expected: help message displays, no platform errors. ✓ Help text clear and complete.

---

### Test 2: Dry Run (Fresh Install)

```bash
rm -rf ~/.config/opencode
./ai-kit-install dry-run
```

Expected: `[ai-kit] Running in DRY RUN mode`, no files created in `~/.config/opencode`. ✓ No network changes made.

---

### Test 3: Fresh Install

```bash
rm -rf ~/.config/opencode ~/.config/opencode.backups
./ai-kit-install install
```

Expected: `[OK] All prerequisites found` · `[OK] Release artifacts downloaded` · `[OK] Installation complete at ~/.config/opencode`

Verify:

```bash
ls -la ~/.config/opencode/
readlink ~/.config/opencode/current
```

✓ `versions/<TAG>/` exists · `current` symlink correct · config files present · `.env` and `local/` NOT created.

---

### Test 4: Status Command

```bash
./ai-kit-install status
```

Expected: installation location, current version, available versions. ✓ Output clear and accurate.

---

### Test 5: Update Command

```bash
mkdir -p ~/.config/opencode/local
echo "test_data" > ~/.config/opencode/local/test.txt
echo "AITOOLINGKEY=test123" > ~/.config/opencode/.env
./ai-kit-install update
cat ~/.config/opencode/.env
cat ~/.config/opencode/local/test.txt
```

Expected: backup created, `.env` and `local/` preserved, new version installed.

---

### Test 6: Rollback Command

```bash
echo "new_data" > ~/.config/opencode/test_rollback.txt
./ai-kit-install rollback
ls ~/.config/opencode/test_rollback.txt 2>/dev/null || echo "[OK] File removed by rollback"
```

Expected: previous configuration restored, `.env` and `local/` preserved.

---

### Test 7: Dry Run (Update Mode)

```bash
./ai-kit-install status
./ai-kit-install dry-run
./ai-kit-install status
```

Expected: `[ai-kit] Running in DRY RUN mode` · no backup created · installation unchanged.

---

### Test 8: Missing Prerequisites

```bash
PATH="/usr/bin:/bin" ./ai-kit-install install 2>&1 | head -20
```

Expected: `[X] Missing required commands: curl` · exit code 1 · no partial installation.

---

### Test 9: Existing Installation (Fresh Install Blocked)

```bash
./ai-kit-install status
./ai-kit-install install 2>&1 | head -20
```

Expected: `[X] Installation directory already exists at ~/.config/opencode. Use 'update' to refresh or remove the directory manually.` · exit code 1.

---

### Test 10: No Installation (Update Blocked)

```bash
rm -rf ~/.config/opencode ~/.config/opencode.backups
./ai-kit-install update 2>&1 | head -20
```

Expected: `[X] No existing installation found at ~/.config/opencode. Use 'install' for fresh installation.` · exit code 1.

---

### Test 11: No Backups (Rollback Blocked)

```bash
rm -rf ~/.config/opencode.backups
./ai-kit-install rollback 2>&1 | head -20
```

Expected: `[X] No backups found at ~/.config/opencode.backups` · exit code 1.

---

## Cleanup

```bash
rm -rf ~/.config/opencode ~/.config/opencode.backups ~/ai-kit-test
```

---

## Acceptance Criteria

- [x] Installer supports: `install`, `update`, `status`, `rollback`, `dry-run`
- [x] Detects WSL/Linux; rejects unsupported platforms
- [x] Versioned layout: `versions/<TAG>/` + `current` symlink
- [x] Preserves `.env` and `local/` during updates
- [x] Creates backups before updates; supports rollback
- [x] Clear error messages with proper exit codes
- [x] README documents installer commands

## Notes

- The installer uses a placeholder cosign SHA256. In production, pin to the actual release binary SHA256.
- Signature verification is optional if `.sig` is absent (dev/testing).
- For air-gapped environments, pre-download artifacts and modify the installer.
