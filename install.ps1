<#
.SYNOPSIS
Bootstrap stub for ai-kit Windows installation.

.DESCRIPTION
Downloads ai-kit-install.ps1 to a temporary file, verifies Authenticode
signature first, then falls back to an embedded SHA256 check if needed,
and only then executes the installer.
#>
[CmdletBinding()]
param(
    [string]$Version = 'latest',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$InstallerArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repo = 'krajh/ai-kit'
$resolvedVersion = if ($Version -and $Version -ne 'latest' -and $Version -notmatch '^v') { "v$Version" } else { $Version }
$downloadUrl = if ($resolvedVersion -eq 'latest') {
    "https://github.com/$repo/releases/latest/download/ai-kit-install.ps1"
} else {
    "https://github.com/$repo/releases/download/$resolvedVersion/ai-kit-install.ps1"
}

# Release automation must replace this token with the matching installer SHA256.
$expectedInstallerHash = '__AI_KIT_INSTALL_SHA256__'
$installerPath = Join-Path $env:TEMP "ai-kit-install-$PID.ps1"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -MaximumRedirection 5 -UseBasicParsing | Out-Null

    $signature = Get-AuthenticodeSignature -FilePath $installerPath
    $signatureValid = $signature.Status -eq 'Valid'

    if (-not $signatureValid) {
        if ($expectedInstallerHash -like '__*__') {
            throw "Installer signature invalid ($($signature.Status)). Embedded SHA256 fallback token not replaced in install.ps1."
        }

        $actualHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToUpperInvariant()
        if ($actualHash -ne $expectedInstallerHash.ToUpperInvariant()) {
            throw "Installer hash mismatch. Expected $expectedInstallerHash, got $actualHash. Signature status: $($signature.Status)."
        }
    }

    & $installerPath @InstallerArgs
}
finally {
    if (Test-Path -LiteralPath $installerPath) {
        Remove-Item -LiteralPath $installerPath -Force -ErrorAction SilentlyContinue
    }
}
