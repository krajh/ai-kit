---
description: List supported ai-kit model IDs by provider
agent: general
model: auto
---

List the currently configured ai-kit model IDs from `opencode.json`.

!`

set -e

PROVIDER="${1:-all}"

case "$PROVIDER" in
all|aitooling|copilot) ;;
\*)
echo "Usage: /ai-kit-models [all|aitooling|copilot]"
exit 1
;;
esac

if [ -f "./opencode.json" ]; then
CONFIG="./opencode.json"
elif [ -f "$HOME/.config/opencode/opencode.json" ]; then
CONFIG="$HOME/.config/opencode/opencode.json"
else
echo "Could not find opencode.json in the current repo or ~/.config/opencode/."
exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
echo "jq is required for /ai-kit-models"
exit 1
fi

print_provider() {
local provider="$1"
  echo ""
  echo "[$provider]"
jq -r --arg provider "$provider" '.provider[$provider].models | keys[]' "$CONFIG"
}

if [ "$PROVIDER" = "all" ]; then
print_provider "aitooling"
print_provider "github-copilot"
elif [ "$PROVIDER" = "copilot" ]; then
print_provider "github-copilot"
else
print_provider "$PROVIDER"
fi

`
