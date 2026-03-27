---
description: Check for ai-kit updates and install latest version
agent: general
model: auto
---

Check for ai-kit updates and install if a newer version is available.

!`

# Caveat: This command runs the installer which may prompt for conflict resolution.

# After update completes, you must RESTART OpenCode to pick up new config/skills.

# Get latest version from GitHub

LATEST=$(curl -s https://api.github.com/repos/krajh/ai-kit/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
echo "Latest ai-kit version: $LATEST"

# Get current installed version from manifest

CURRENT=$(cat ~/.config/opencode/versions/*/.ai-kit-manifest.json 2>/dev/null | grep '"version"' | head -1 | cut -d'"' -f4 || echo "unknown")
echo "Current ai-kit version: $CURRENT"

# Compare versions

if [ "$LATEST" != "$CURRENT" ] && [ "$CURRENT" != "unknown" ]; then
echo ""
echo "=== Updating ai-kit from $CURRENT to $LATEST ==="
  TAG=$LATEST curl -fsSL -o /tmp/ai-kit-install "https://github.com/krajh/ai-kit/releases/download/${TAG}/ai-kit-install"
chmod +x /tmp/ai-kit-install
/tmp/ai-kit-install update
echo ""
echo "=== Update complete ==="
echo "IMPORTANT: Restart OpenCode to pick up the new config, skills, and agent definitions."
elif [ "$CURRENT" = "unknown" ]; then
echo "Could not determine current version. Run '~/.config/opencode/versions/*/ai-kit-install status' to check."
else
echo "ai-kit is already up to date ($CURRENT)"
fi
`
