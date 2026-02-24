# Troubleshooting

This guide covers common issues with ai-kit installation and usage.

## BunInstallFailedError: opencode-mem

**Cause:** The `protobufjs` package postinstall script is blocked by Bun's security policy.

**Fix:** ai-kit ships a `bunfig.toml` that includes `trustedDependencies = ["protobufjs"]`. Make sure `~/.config/opencode/bunfig.toml` exists. If not, re-run installation:

```bash
./ai-kit-install install
```

## opencode.json Customizations Lost After Update

This shouldn't happen in v0.6+. The installer uses file-copy with deep-merge for `opencode.json` — your keys always win.

If customizations were lost:
1. Restore from `~/.config/opencode/opencode.json.user-backup` if a backup exists
2. Re-run installation: `./ai-kit-install install`

## Conflicts After Update: Files in `.ai-kit-incoming/`

When you update, if you've modified files that ai-kit also ships, the new versions are staged to `.ai-kit-incoming/` instead of overwriting your changes.

**Resolve conflicts:**

```bash
# See pending conflicts
./ai-kit-install status

# Accept new version (overwrites your file)
./ai-kit-install resolve --accept-incoming

# Keep your version (discards incoming)
./ai-kit-install resolve --keep-mine
```

## Plugin Fails to Load After Install

**Check:** List installed plugins:
```bash
ls ~/.config/opencode/plugins/
```

**Fix:** Re-run installation:
```bash
./ai-kit-install install
```

## Auto-updater Not Checking for Updates

The updater checks at most once every 24 hours.

**Force a check:**
```bash
rm ~/.config/opencode/state/ai-kit-update.json
# Restart OpenCode
```

## npm install -g Hangs or Fails

This is expected — npm installation is not the recommended path.

**Use curl | bash instead:**
```bash
curl -fsSL "https://github.com/krajh/ai-kit/releases/latest/download/install" | bash
```

## Bash Installer Command Not Found

Ensure the installer is in your PATH, or use the full path:
```bash
~/.config/opencode/current/ai-kit-install install
```

## AITOOLINGKEY / OPENCODE_API_KEY Not Found

Set the environment variable before running OpenCode:

```bash
export AITOOLINGKEY="your-key-here"
# or
export OPENCODE_API_KEY="your-key-here"
```

## WSL Path Issues

If running on WSL and seeing path errors, ensure your home directory is correctly set:

```bash
echo $HOME
ls -la ~/
```

The installer expects standard WSL paths. If your Windows user folder is mounted at `/mnt/c/Users/`, consider setting up a Linux home directory.

## Further Help

- GitHub Issues: https://github.com/krajh/ai-kit/issues
- Discussions: https://github.com/krajh/ai-kit/discussions
