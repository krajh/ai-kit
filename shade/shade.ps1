<#
.SYNOPSIS
Native Windows wrapper for installed Shade assets.

.DESCRIPTION
Shade's full runtime depends on tmux and the Unix shell scripts shipped with ai-kit.
On native Windows this wrapper documents the limitation and points to the installed files.
#>
[CmdletBinding()]
param(
    [ValidateSet('help', 'status', 'start', 'attach', 'stop')]
    [string]$Command = 'help'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$shadeRoot = Split-Path -Path $PSCommandPath -Parent
$launcher = Join-Path $shadeRoot 'shade-launcher.sh'
$tmuxScript = Join-Path $shadeRoot 'shade-tmux.sh'

function Write-Info {
    param([string]$Message)
    Write-Host "[shade] $Message" -ForegroundColor Cyan
}

function Write-WarnMsg {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

Write-WarnMsg 'Shade tmux management is not supported on native Windows.'

switch ($Command) {
    'help' {
        Write-Info 'Installed files:'
        Write-Host "  launcher: $launcher"
        Write-Host "  tmux script: $tmuxScript"
        Write-Info 'Run Shade from WSL or another tmux-capable environment if you need the background executor.'
    }
    default {
        Write-Info "'$Command' is unavailable on native Windows because shade-tmux.sh requires tmux."
        Write-Info 'Use WSL/tmux, or inspect the installed scripts directly.'
    }
}
