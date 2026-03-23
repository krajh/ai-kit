#!/usr/bin/env bash
# Shade Pico Launcher
# Starts pi with the reaper extension for background task execution.
#
# Usage:
#   ./shade-launcher.sh              # Process one batch, exit
#   ./shade-launcher.sh --persist    # Keep polling every 30s (for tmux)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION="${SCRIPT_DIR}/extensions/reaper.ts"
PEERAGE_EXT="${SCRIPT_DIR}/extensions/peerage/peerage.ts"
QUEUE_DB="${FRIEREN_QUEUE_DB:-$HOME/.frieren/queue.db}"

PERSIST=false
if [[ "${1:-}" == "--persist" ]]; then
	PERSIST=true
fi

if [[ ! -f "$EXTENSION" ]]; then
	echo "[X] Reaper extension not found: $EXTENSION" >&2
	exit 1
fi

if [[ ! -f "$PEERAGE_EXT" ]]; then
	echo "[X] Peerage extension not found: $PEERAGE_EXT" >&2
	exit 1
fi

if ! command -v pi &>/dev/null; then
	echo "[X] pi not found. Install: npm install -g @mariozechner/pi-coding-agent" >&2
	exit 1
fi

count_pending() {
	bun -e "
    const {Database} = require('bun:sqlite');
    try {
      const db = new Database('$QUEUE_DB');
      const r = db.query(\"SELECT COUNT(*) as c FROM reaper_realm_queue WHERE status='pending'\").get();
      console.log(r?.c ?? 0);
      db.close();
    } catch { console.log(0); }
  " 2>/dev/null || echo "0"
}

# All aitooling models available for cycling (Ctrl+P in interactive mode)
SHADE_MODELS=(
	"github-copilot/claude-sonnet-4.6"
	"github-copilot/claude-sonnet-4.5"
	"github-copilot/claude-haiku-4.5"
	"github-copilot/claude-opus-4.6"
	"github-copilot/gpt-5.4"
	"github-copilot/gpt-5.3-codex"
	"github-copilot/gpt-5.2-codex"
	"github-copilot/gpt-5.2"
	"github-copilot/gpt-5.1-codex"
	"github-copilot/gpt-5.1-codex-mini"
	"github-copilot/gpt-5.1"
	"github-copilot/gpt-4.1"
	"github-copilot/grok-code-fast-1"
)
MODELS_LIST=$(
	IFS=,
	echo "${SHADE_MODELS[*]}"
)

PI_ARGS=(
	--mode print
	--no-extensions
	-e "$EXTENSION"
	-e "$PEERAGE_EXT"
	--no-skills
	--no-prompt-templates
	--provider github-copilot
	--model claude-sonnet-4.6
	--models "$MODELS_LIST"
)

if [[ "$PERSIST" == "true" ]]; then
	echo "========================================="
	echo " Shade — Reaper Realm Executor"
	echo " Polling every 30s | Ctrl+C to stop"
	echo "========================================="
	echo ""

	while true; do
		PENDING=$(count_pending)
		if [[ "$PENDING" -gt 0 ]]; then
			echo "[$(date '+%H:%M:%S')] $PENDING pending task(s). Processing..."
			echo "Check the Reaper Realm queue. Dequeue and execute all pending tasks. Report results." |
				pi "${PI_ARGS[@]}" 2>/dev/null
			echo "[$(date '+%H:%M:%S')] Batch complete."
			echo ""
		fi
		sleep 30
	done
else
	PENDING=$(count_pending)
	if [[ "$PENDING" == "0" ]]; then
		echo "[OK] No pending tasks. Nothing to do."
		exit 0
	fi
	echo "[OK] Found $PENDING pending task(s). Starting Shade..."
	echo "Check the Reaper Realm queue. If there are pending tasks, dequeue and execute them." |
		exec pi "${PI_ARGS[@]}"
fi
