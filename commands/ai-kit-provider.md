---
description: Switch ai-kit model provider and refresh per-agent defaults
agent: general
model: auto
---

Switch ai-kit model provider without manually editing `opencode.json`.

!`

set -e

if [ -z "${1:-}" ]; then
echo "Usage: /ai-kit-provider <aitooling|copilot> [--models]"
echo "Example: /ai-kit-provider copilot --models"
exit 1
fi

PROVIDER="$1"
shift || true

case "$PROVIDER" in
  aitooling|copilot) ;;
  *)
    echo "Invalid provider '$PROVIDER'. Use: aitooling or copilot"
exit 1
;;
esac

if [ -x "./ai-kit-install" ]; then
INSTALLER="./ai-kit-install"
elif command -v ai-kit-install >/dev/null 2>&1; then
INSTALLER="ai-kit-install"
elif [ -x "$HOME/.config/opencode/current/ai-kit-install" ]; then
INSTALLER="$HOME/.config/opencode/current/ai-kit-install"
else
echo "Could not find ai-kit-install. Run /ai-kit-update or install ai-kit first."
exit 1
fi

echo "Switching provider to: $PROVIDER"
$INSTALLER update --provider "$PROVIDER" "$@"

echo "Done. Restart OpenCode to ensure all config changes are picked up."

`
