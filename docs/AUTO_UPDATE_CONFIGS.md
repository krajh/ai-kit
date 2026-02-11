# Auto-Update Configs Plugin (EXPERIMENTAL)

**Status:** 🧪 Experimental - Disabled by default

Automatically checks for and pulls updates from configured git repositories once per day.

## Features

- **Opt-in only**: Disabled by default (file named `.auto-update-configs.ts`)
- **Non-destructive**: Skips repositories with uncommitted changes
- **Safe pulls**: Fast-forward only, never force-pushes or rebases
- **Configurable**: Environment variables for repos and check interval
- **Silent operation**: Only reports when updates occur or errors happen
- **State persistence**: Tracks last check time in `~/.config/opencode/.state/`

## Enable/Disable

### Enable (Opt-In)

```bash
cd ~/ai-kit/plugins
mv .auto-update-configs.ts auto-update-configs.ts
# Restart OpenCode
```

### Disable

```bash
cd ~/ai-kit/plugins
mv auto-update-configs.ts .auto-update-configs.ts
# Restart OpenCode
```

## Configuration

### Environment Variables

```bash
# Comma-separated list of repo paths to update (supports ~)
export AUTO_UPDATE_REPOS="~/.config/opencode,~/ai-kit"

# Hours between update checks (default: 24)
export AUTO_UPDATE_INTERVAL_HOURS="24"
```

### Defaults

- **Repos**: `~/.config/opencode`, `~/ai-kit`
- **Interval**: 24 hours
- **State file**: `~/.config/opencode/.state/auto-update-last-check.json`

## How It Works

1. **On first chat message** of each OpenCode session:
   - Check if 24 hours have passed since last check
   - If yes, proceed; if no, skip

2. **For each configured repo**:
   - Verify it's a valid git repository
   - Check for uncommitted changes
   - If clean: fetch latest and pull (fast-forward only)
   - If dirty: skip with message

3. **Report**:
   - Silent if all repos are up-to-date
   - Reports updates/skips/errors to console

4. **Save state**:
   - Update last-check timestamp

## Safety Guarantees

✅ **Never overwrites uncommitted work** (skips dirty repos)  
✅ **Fast-forward only** (never force or rebase)  
✅ **Fails gracefully** (errors logged, doesn't crash)  
✅ **No automatic commits** (only pulls)  
✅ **Respects git config** (uses your credentials/ssh keys)

## Example Output

### When updates are pulled

```
[auto-update-configs]
[UPDATE] /home/user/.config/opencode: pulled latest changes
[UPDATE] /home/user/ai-kit: pulled latest changes
```

### When repos have uncommitted changes

```
[auto-update-configs]
[SKIP] /home/user/.config/opencode: uncommitted changes
```

### When repos are up-to-date

```
(no output - silent)
```

## Troubleshooting

### Plugin not running

- Check that file is named `auto-update-configs.ts` (no leading dot)
- Restart OpenCode after renaming
- Verify it appears in plugin list

### Updates not pulling

- Check that 24 hours have passed since last check
- Verify repos are clean (`git status`)
- Check git credentials/ssh keys work
- Look for error messages in console

### Force immediate check

```bash
rm ~/.config/opencode/.state/auto-update-last-check.json
# Restart OpenCode - will check on first message
```

## Customization

### Update only specific repos

```bash
export AUTO_UPDATE_REPOS="~/my-custom-repo,~/another-repo"
```

### Check every 12 hours

```bash
export AUTO_UPDATE_INTERVAL_HOURS="12"
```

### Check every startup (not recommended)

```bash
export AUTO_UPDATE_INTERVAL_HOURS="0"
```

## Limitations

- Only supports git repositories
- Only supports fast-forward pulls
- No support for merge conflicts (skips)
- No support for submodules (yet)
- No support for private repos without pre-configured credentials

## Future Enhancements (Maybe)

- [ ] Support for custom git commands
- [ ] Support for submodule updates
- [ ] Configurable update strategies (merge, rebase)
- [ ] Notification system for updates
- [ ] Web UI for configuration

## Disclaimer

⚠️ **This plugin is experimental.** Use at your own risk. Always commit your work before enabling auto-updates.

The plugin respects git safety: it will never overwrite uncommitted changes or force-push. However, it's your responsibility to:

- Keep your repos in a clean state
- Review pulled changes
- Have backups of important work
