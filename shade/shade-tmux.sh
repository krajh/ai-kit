#!/usr/bin/env bash
# Shade tmux session manager
# Usage:
#   shade-start    — Create tmux session running Shade in persist mode
#   shade-attach   — Attach to the Shade session
#   shade-stop     — Kill the Shade session
#   shade-status   — Check if Shade session is running

set -euo pipefail

SESSION="shade"
LAUNCHER="$HOME/.config/opencode/shade-pico/shade-launcher.sh"

case "${1:-start}" in
start)
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		echo "[OK] Shade session already running. Use 'shade-attach' to view."
		exit 0
	fi

	# Create detached session with Shade in persist mode
	tmux new-session -d -s "$SESSION" \
		-x "$(tput cols)" -y "$(tput lines)" \
		"$LAUNCHER --persist"

	# Set a nice status bar
	tmux set-option -t "$SESSION" status-style "bg=colour53,fg=white"
	tmux set-option -t "$SESSION" status-left " #S "
	tmux set-option -t "$SESSION" status-right " %H:%M "
	tmux set-option -t "$SESSION" status-interval 30

	echo "[OK] Shade session started. Use 'shade-attach' to view."
	;;

attach)
	if ! tmux has-session -t "$SESSION" 2>/dev/null; then
		echo "[!] Shade session not running. Starting..."
		"$0" start
	fi
	tmux attach -t "$SESSION"
	;;

stop)
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		tmux kill-session -t "$SESSION"
		echo "[OK] Shade session stopped."
	else
		echo "[!] Shade session not running."
	fi
	;;

status)
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		echo "[OK] Shade session running."
		tmux list-panes -t "$SESSION" -F "#{pane_pid} #{pane_current_command}"
	else
		echo "[!] Shade session not running."
	fi
	;;

*)
	echo "Usage: shade-{start|attach|stop|status}"
	exit 1
	;;
esac
