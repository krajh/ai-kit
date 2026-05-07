---
description: Check for ai-kit updates and install latest version
agent: general
model: auto
---

Check for ai-kit updates and install if a newer version is available.

!`

# Caveat: this command runs the installer and may prompt for conflict resolution.
# After update completes, restart OpenCode to pick up new config/skills.

if [[ "$OS" == "Windows_NT" ]]; then
  powershell -NoProfile -ExecutionPolicy Bypass -File "$APPDATA\\opencode\\current\\ai-kit-install.ps1" -Command update
else
  LATEST=$(curl -s https://api.github.com/repos/krajh/ai-kit/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  echo "Latest ai-kit version: $LATEST"

  CURRENT=$(cat ~/.config/opencode/versions/*/.ai-kit-manifest.json 2>/dev/null | grep '"version"' | head -1 | cut -d'"' -f4 || echo "unknown")
  echo "Current ai-kit version: $CURRENT"

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
fi
`
