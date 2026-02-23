# Troubleshooting

## BunInstallFailedError: opencode-mem

**Error message:** `BunInstallFailedError` when installing `@brisingr-kr/core`, mentioning `protobufjs`

**Cause:** Bun's security policy blocks package postinstall scripts by default. The `opencode-mem` dependency uses protobufjs, which has a postinstall script that fails without explicit permission.

**Fix:** The `bunfig.toml` shipped with ai-kit includes `trustedDependencies = ["protobufjs"]` to allow this. Make sure it has been applied:

```bash
# Check that bunfig.toml exists
cat ~/.config/opencode/bunfig.toml | grep trustedDependencies

# Should output:
# trustedDependencies = ["protobufjs"]
```

If missing or incorrect, reinstall ai-kit:

```bash
npm install -g @brisingr-kr/core
```

## opencode.json lost custom settings after update

**Problem:** Your custom settings in `~/.config/opencode/opencode.json` disappeared after running an update.

**Why:** This should not happen with ai-kit v0.6.0+. The postinstall script now **deep-merges** `opencode.json` instead of overwriting it, so your customisations are preserved.

**If this happened anyway:** You were likely running an older version (pre-v0.6.0) that used symlinks instead of file-copy. The old mechanism didn't support merge.

**Fix:** Reinstall to get the new behavior:

```bash
npm install -g @brisingr-kr/core
```

Your custom settings will be merged going forward.

## Conflicts after update: files in `.ai-kit-incoming/`

**What is `.ai-kit-incoming/`?** When ai-kit detects that you've modified a file it also manages, it stages the new upstream version in `.ai-kit-incoming/` instead of overwriting your version. This gives you a chance to review and decide.

**Why did this happen?** The updater compared your files against the checksum manifest and found that you've edited a file that ai-kit also provides (e.g., `agents/implementer.md`, `protocols/DELEGATION_PROTOCOLS.md`).

**Check what's pending:**

```bash
ai-kit-install status
```

You'll see a list of files in `.ai-kit-incoming/` that have conflicts.

**Resolve:**

```bash
# Accept the new upstream version (overwrite your changes)
ai-kit-install resolve --accept-incoming

# OR keep your version (reject the upstream changes)
ai-kit-install resolve --keep-mine
```

Your files are never lost — you decide which version to keep.

## Plugin fails to load after install

**Error message:** Plugin not found, or "plugin X not initialized" in logs

**Cause:** Plugin files were not copied during install, or the OpenCode session hasn't picked them up yet.

**Check installation:**

```bash
# List plugin files in opencode config
ls -la ~/.config/opencode/plugins/

# You should see at least:
# - ai-kit-updater.ts
# - (other plugin files)
```

**Fix:**

1. **Reinstall ai-kit:**

   ```bash
   npm install -g @brisingr-kr/core
   ```

2. **Restart OpenCode** (close and reopen your session, or exit and restart the process).

3. **Verify plugins are loaded:**
   ```bash
   # In an OpenCode session, check available plugins via the runtime
   # The log should show plugin initialization
   ```

## Auto-updater not checking for updates

**Problem:** The auto-updater plugin hasn't checked GitHub for new releases recently.

**Why:** The auto-updater checks **at most once per 24 hours** to avoid hammering GitHub. If you've already checked recently, it won't re-check until the 24h window expires.

**Check last check time:**

```bash
cat ~/.config/opencode/state/ai-kit-update.json
```

You'll see:

- `lastCheckTime` — Unix timestamp of last check
- `stagedTag` — Version staged for next install (if any)

**Force an immediate check:**

```bash
# Delete the state file to reset the timer
rm ~/.config/opencode/state/ai-kit-update.json

# Restart OpenCode — the updater will check immediately on next session start
```

## `npm install -g @brisingr-kr/core` hangs or fails

**Problem:** npm install seems stuck or exits with an error.

**Possible causes:**

1. **Network issue** — npm registry is unreachable
   - Check: `npm ping` (should respond with `{Pinging registry...}`)
   - Retry: `npm install -g @brisingr-kr/core --verbose`

2. **Disk space** — Not enough space for node_modules
   - Check: `df -h` on your home directory
   - Need ~500MB free

3. **Package missing or unpublished** — ai-kit package is not available yet
   - Check: `npm search @brisingr-kr/core` (should list the package)

**Fix:**

```bash
# Clear npm cache
npm cache clean --force

# Retry install with verbose logging
npm install -g @brisingr-kr/core --verbose

# If still failing, check npm logs
npm logs errors
```

## Bash installer command not found: `ai-kit-install`

**Problem:** After running the bash installer, you can't run `ai-kit-install` from the shell.

**Why:** The installer is only added to `PATH` if you used npm install. For the bash installer, you need to reference the full path or make sure it's in `PATH`.

**Fix:**

```bash
# Full path (always works)
~/.config/opencode/ai-kit-install status

# OR add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.config/opencode:$PATH"

# Then source the file or open a new terminal
source ~/.bashrc
ai-kit-install status  # Now works
```

## Environment variable AITOOLINGKEY not found

**Problem:** During install, the script asks for `AITOOLINGKEY` and won't proceed without it.

**Why:** ai-kit requires this API key to configure the aitooling provider in `opencode.json`.

**Fix:**

1. **Set the environment variable before installing:**

   ```bash
   export AITOOLINGKEY="your-api-key-here"
   npm install -g @brisingr-kr/core
   ```

2. **Or use `--no-prompt` mode (CI/scripts):**

   ```bash
   # If AITOOLINGKEY is already set, this won't prompt
   npm install -g @brisingr-kr/core
   ```

3. **If install already completed without the key:**
   ```bash
   # Add it to the .env file
   echo 'AITOOLINGKEY=your-key' >> ~/.config/opencode/.env
   ```

The key is stored in `~/.config/opencode/.env` and is preserved across updates.

## WSL path issues: ai-kit installs to Windows instead of WSL

**Problem:** Files end up in `C:\Users\...` (Windows) instead of `/home/user/` (WSL).

**Why:** OpenCode or npm is reading the Windows `%USERPROFILE%` instead of the WSL home.

**Fix:**

```bash
# In your WSL terminal, verify you're using WSL paths
echo $HOME
# Should output: /home/username (not /mnt/c/Users/...)

# Unset any Windows USERPROFILE that may be bleeding through
unset USERPROFILE

# Reinstall
npm install -g @brisingr-kr/core
```

## Further help

- **GitHub Issues**: [github.com/krajh/ai-kit/issues](https://github.com/krajh/ai-kit/issues)
- **Documentation**: Check `README.md` for install methods and workflow
- **Installation Guide**: See "Installation" and "Updates" sections in README
