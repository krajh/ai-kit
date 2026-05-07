<#
.SYNOPSIS
Installs or updates ai-kit on native Windows.

.DESCRIPTION
Downloads ai-kit release artifacts, verifies integrity with SHA256 + cosign,
extracts into %APPDATA%\opencode\versions, atomically swaps the current
version pointer, manages root links, persists user-scoped environment
variables, and updates the PowerShell profile with a managed block.

.PARAMETER Command
Installer command: install, update, status, bootstrap, or dry-run.

.PARAMETER Tag
Release tag to install. Defaults to latest.

.PARAMETER ForceCopy
Allow copy fallback for managed assets that would normally fail when links
cannot be created. Warning: copied config assets do not auto-update.

.PARAMETER DryRun
Print planned actions without changing disk or user environment.

.PARAMETER InstallDir
Install root. Defaults to $env:APPDATA\opencode.

.PARAMETER FrierenRepo
Frieren git remote. Defaults to krajh/frieren.

.PARAMETER Frieren
Install or refresh Frieren and wire OpenCode MCP config.

.PARAMETER Shade
Install or refresh Shade. Implies -Frieren.

.EXAMPLE
.\ai-kit-install.ps1

.EXAMPLE
.\ai-kit-install.ps1 -Command update -Tag v0.4.0

.EXAMPLE
.\ai-kit-install.ps1 -DryRun -ForceCopy

.EXAMPLE
.\ai-kit-install.ps1 -Command install -Frieren

.EXAMPLE
.\ai-kit-install.ps1 -Command install -Shade
#>
[CmdletBinding()]
param(
    [ValidateSet('install', 'update', 'status', 'bootstrap', 'dry-run')]
    [string]$Command = 'install',

    [ValidatePattern('^(latest|v?\d+\.\d+(\.\d+)?(-\S+)?)$')]
    [string]$Tag = 'latest',

    [switch]$ForceCopy,

    [switch]$DryRun,

    [switch]$Frieren,

    [switch]$Shade,

    [string]$InstallDir = [System.IO.Path]::Combine($env:APPDATA, 'opencode'),

    [string]$FrierenRepo = 'https://github.com/krajh/frieren.git'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Script:Repo = 'krajh/ai-kit'
$Script:OpenCodeRepo = 'anomalyco/opencode'
$Script:CosignVersion = 'v2.4.1'
$Script:CosignSha256 = '8D57F8A42A981D27290C4227271FA9F0F62CA6630EB4A21D316BD6B01405B87C'
$Script:CosignOidcIssuer = 'https://token.actions.githubusercontent.com'
$Script:CosignIdentityPrefix = 'https://github.com/krajh/ai-kit/.github/workflows/release.yml@refs/tags/'
$Script:ManagedBlockStart = '# --- opencode ai-kit (managed block) ---'
$Script:ManagedBlockEnd = '# --- end opencode ai-kit ---'
$Script:CurrentName = 'current'
$Script:CurrentNewName = 'current.new'
$Script:CurrentBakName = 'current.bak'
$Script:VersionsDir = Join-Path $InstallDir 'versions'
$Script:BinDir = Join-Path $InstallDir '.bin'
$Script:CosignPath = Join-Path $Script:BinDir 'cosign-windows-amd64.exe'
$Script:ManagedItems = @(
    'opencode.json',
    'AGENTS.md',
    'bunfig.toml',
    'agents',
    'plugins',
    'protocols',
    'skills',
    'commands'
)
$Script:ConfigManagedItems = @(
    'opencode.json',
    'agents',
    'plugins',
    'skills'
)

function Write-Info {
    param([string]$Message)
    Write-Host "[ai-kit] $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnMsg {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Fail {
    param([string]$Message)
    throw $Message
}

function Invoke-DryAware {
    param(
        [string]$Description,
        [scriptblock]$Action
    )

    if ($DryRun) {
        Write-Info "Dry run: $Description"
        return
    }

    & $Action
}

function Ensure-Directory {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    Invoke-DryAware "ensure directory $Path" {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        }
    }
}

function Assert-CommandAvailable {
    param(
        [string]$CommandName,
        [string]$InstallHint
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        Fail "$CommandName is required. $InstallHint"
    }
}

function Remove-PathIfExists {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Invoke-DryAware "remove $Path" {
        Remove-Item -LiteralPath $Path -Force -Recurse
    }
}

function Invoke-NativeCommand {
    param(
        [string]$Description,
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [string]$WorkingDirectory
    )

    if ($DryRun) {
        $argText = if ($Arguments.Count -gt 0) { " $($Arguments -join ' ')" } else { '' }
        $location = if ($WorkingDirectory) { " (cwd: $WorkingDirectory)" } else { '' }
        Write-Info "Dry run: would run $FilePath$argText$location"
        return
    }

    $previous = Get-Location
    try {
        if ($WorkingDirectory) {
            Set-Location -LiteralPath $WorkingDirectory
        }

        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            Fail "$Description failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Set-Location -LiteralPath $previous
    }
}

function Set-ObjectProperty {
    param(
        [object]$InputObject,
        [string]$Name,
        [object]$Value
    )

    if ($InputObject.PSObject.Properties.Name -contains $Name) {
        $InputObject.$Name = $Value
        return
    }

    $InputObject | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
}

function Get-OrCreateObjectProperty {
    param(
        [object]$InputObject,
        [string]$Name
    )

    if ($InputObject.PSObject.Properties.Name -contains $Name -and $null -ne $InputObject.$Name) {
        return $InputObject.$Name
    }

    $child = [pscustomobject]@{}
    Set-ObjectProperty -InputObject $InputObject -Name $Name -Value $child
    return $child
}

function Convert-ToJsonPath {
    param([string]$Path)

    return ($Path -replace '\\', '/')
}

function Get-FrierenRootPath {
    return [System.IO.Path]::Combine($env:USERPROFILE, 'dev', 'frieren')
}

function Get-ShadeSourcePath {
    return (Join-Path $PSScriptRoot 'shade')
}

function Get-ShadeInstallPath {
    return (Join-Path $InstallDir 'shade-pico')
}

function Install-Frieren {
    Assert-CommandAvailable -CommandName 'git' -InstallHint 'Install Git and ensure it is on PATH.'
    Assert-CommandAvailable -CommandName 'bun' -InstallHint 'Install Bun and ensure it is on PATH.'

    $frierenRoot = Get-FrierenRootPath
    $frierenParent = Split-Path -Path $frierenRoot -Parent
    $frierenLink = Join-Path $InstallDir 'frieren'

    Ensure-Directory -Path $frierenParent

    if (Test-Path -LiteralPath $frierenRoot) {
        if (-not (Test-Path -LiteralPath (Join-Path $frierenRoot '.git'))) {
            Fail "Frieren target path already exists but is not a git clone: $frierenRoot"
        }

        Write-Info "Frieren repo already present at $frierenRoot"
    }
    else {
        Invoke-NativeCommand -Description 'Frieren clone' -FilePath 'git' -Arguments @('clone', $FrierenRepo, $frierenRoot) -WorkingDirectory $frierenParent
        Write-Ok "Cloned Frieren to $frierenRoot"
    }

    Invoke-NativeCommand -Description 'Frieren dependency install' -FilePath 'bun' -Arguments @('install') -WorkingDirectory $frierenRoot

    $canDirectorySymlink = Test-SymlinkCapability -Type Directory
    New-DirectoryLink -Path $frierenLink -Target $frierenRoot -CanCreateSymlink:$canDirectorySymlink

    Write-Ok "Frieren ready at $frierenRoot"
}

function Install-Shade {
    $source = Get-ShadeSourcePath
    $destination = Get-ShadeInstallPath
    $destinationParent = Split-Path -Path $destination -Parent

    if (-not (Test-Path -LiteralPath $source)) {
        Fail "Shade source directory not found: $source"
    }

    Ensure-Directory -Path $destinationParent
    Remove-PathIfExists -Path $destination

    Invoke-DryAware "copy Shade files to $destination" {
        Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
    }

    Write-WarnMsg 'Shade installs on Windows, but shade-tmux.sh requires tmux and is not supported on native Windows. Use WSL/tmux for the full background executor.'
    Write-Ok "Shade files installed to $destination"
}

function Update-McpConfig {
    $configPath = Join-Path $InstallDir 'opencode.json'
    $frierenRoot = Get-FrierenRootPath
    $bridgePath = Convert-ToJsonPath -Path (Join-Path $frierenRoot 'bridge')
    $entryPath = Convert-ToJsonPath -Path (Join-Path $frierenRoot 'src\index.ts')

    if (-not (Test-Path -LiteralPath $configPath)) {
        Fail "Cannot update MCP config because opencode.json was not found at $configPath"
    }

    Invoke-DryAware "patch Frieren MCP config in $configPath" {
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json

        $plugins = @()
        if ($config.PSObject.Properties.Name -contains 'plugin' -and $null -ne $config.plugin) {
            $plugins = @($config.plugin)
        }

        if ($bridgePath -notin $plugins) {
            $plugins = @($plugins + $bridgePath)
        }

        Set-ObjectProperty -InputObject $config -Name 'plugin' -Value $plugins

        $mcp = Get-OrCreateObjectProperty -InputObject $config -Name 'mcp'
        Set-ObjectProperty -InputObject $mcp -Name 'frieren' -Value ([pscustomobject]@{
            type = 'local'
            command = @('bun', $entryPath)
            enabled = $true
        })

        $json = $config | ConvertTo-Json -Depth 100
        [System.IO.File]::WriteAllText($configPath, ($json + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
    }

    Write-Ok "Updated Frieren MCP config in $configPath"
}

function Invoke-Download {
    param(
        [string]$Uri,
        [string]$OutFile
    )

    Ensure-Directory -Path (Split-Path -Path $OutFile -Parent)

    Invoke-DryAware "download $Uri -> $OutFile" {
        try {
            Invoke-WebRequest -Uri $Uri -OutFile $OutFile -MaximumRedirection 5 -UseBasicParsing | Out-Null
        }
        catch {
            Fail "Download failed: $Uri`n$($_.Exception.Message)"
        }
    }
}

function Get-FileSha256 {
    param([string]$Path)

    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Assert-Sha256Hex {
    param(
        [string]$Value,
        [string]$Label
    )

    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -notmatch '^[0-9A-Fa-f]{64}$') {
        Fail "$Label must be a 64-character SHA256 hex string. Got '$Value'."
    }

    return $Value.ToUpperInvariant()
}

function Get-LatestReleaseTag {
    param([string]$Repository)

    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -UseBasicParsing
    }
    catch {
        Fail "Failed to resolve latest release for $Repository: $($_.Exception.Message)"
    }

    if (-not $release.tag_name) {
        Fail "GitHub latest release response for $Repository did not include tag_name."
    }

    return [string]$release.tag_name
}

function Resolve-ReleaseTag {
    param(
        [string]$RequestedTag,
        [string]$Repository = $Script:Repo
    )

    if ([string]::IsNullOrWhiteSpace($RequestedTag) -or $RequestedTag -eq 'latest') {
        return Get-LatestReleaseTag -Repository $Repository
    }

    if ($RequestedTag -match '^v') {
        return $RequestedTag
    }

    return "v$RequestedTag"
}

function Get-ReleaseAssetSha256 {
    param(
        [string]$Repository,
        [string]$ResolvedTag,
        [string]$AssetName
    )

    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/tags/$ResolvedTag" -UseBasicParsing
    }
    catch {
        Fail "Failed to resolve release metadata for $Repository $ResolvedTag: $($_.Exception.Message)"
    }

    $asset = $release.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
    if (-not $asset) {
        Fail "Release $ResolvedTag for $Repository did not include asset $AssetName."
    }

    $digest = [string]$asset.digest
    if ([string]::IsNullOrWhiteSpace($digest)) {
        Fail "Release asset $AssetName for $Repository $ResolvedTag did not include a digest."
    }

    if ($digest -notmatch '^sha256:(?<hash>[0-9A-Fa-f]{64})$') {
        Fail "Release asset $AssetName for $Repository $ResolvedTag returned unsupported digest '$digest'."
    }

    return $Matches.hash.ToUpperInvariant()
}

function Test-TarAvailable {
    $tar = Get-Command tar.exe -ErrorAction SilentlyContinue
    if (-not $tar) {
        Fail 'tar.exe is required on Windows to extract ai-kit release tarballs.'
    }
}

function Test-TarballEntriesSafe {
    param([string]$TarballPath)

    if ($DryRun) {
        Write-Info "Dry run: would inspect tarball entries in $TarballPath"
        return
    }

    Test-TarAvailable
    $entries = & tar.exe -tzf $TarballPath 2>$null
    foreach ($entry in $entries) {
        if ($entry -match '^(?:[A-Za-z]:|\\|/)' -or $entry -match '(^|[\\/])\.\.([\\/]|$)') {
            Fail "Tarball contains unsafe entry: $entry"
        }
    }
}

function Test-IsDeveloperModeEnabled {
    try {
        $unlock = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -Name 'AllowDevelopmentWithoutDevLicense' -ErrorAction Stop
        return ($unlock.AllowDevelopmentWithoutDevLicense -eq 1)
    }
    catch {
        return $false
    }
}

function Test-SymlinkCapability {
    param([ValidateSet('File', 'Directory')] [string]$Type)

    $probeRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-kit-link-probe-$PID-$Type")
    $target = Join-Path $probeRoot 'target'
    $link = Join-Path $probeRoot 'link'

    try {
        if (Test-Path -LiteralPath $probeRoot) {
            Remove-Item -LiteralPath $probeRoot -Force -Recurse
        }

        New-Item -ItemType Directory -Path $probeRoot -Force | Out-Null
        if ($Type -eq 'Directory') {
            New-Item -ItemType Directory -Path $target -Force | Out-Null
            New-Item -ItemType SymbolicLink -Path $link -Target $target -ErrorAction Stop | Out-Null
        }
        else {
            Set-Content -LiteralPath $target -Value 'probe' -NoNewline -Encoding UTF8
            New-Item -ItemType SymbolicLink -Path $link -Target $target -ErrorAction Stop | Out-Null
        }

        return $true
    }
    catch {
        return $false
    }
    finally {
        if (Test-Path -LiteralPath $probeRoot) {
            Remove-Item -LiteralPath $probeRoot -Force -Recurse -ErrorAction SilentlyContinue
        }
    }
}

function New-DirectoryJunction {
    param(
        [string]$Path,
        [string]$Target
    )

    New-Item -ItemType Junction -Path $Path -Target $Target -ErrorAction Stop | Out-Null
}

function New-DirectoryLink {
    param(
        [string]$Path,
        [string]$Target,
        [switch]$AllowCopyFallback,
        [switch]$IsConfigAsset,
        [bool]$CanCreateSymlink
    )

    Remove-PathIfExists -Path $Path

    Invoke-DryAware "link directory $Path -> $Target" {
        try {
            if ($CanCreateSymlink) {
                New-Item -ItemType SymbolicLink -Path $Path -Target $Target -ErrorAction Stop | Out-Null
                return
            }

            New-DirectoryJunction -Path $Path -Target $Target
        }
        catch {
            if ($ForceCopy -or ($AllowCopyFallback -and -not $IsConfigAsset)) {
                $reason = if ($ForceCopy) { 'ForceCopy enabled' } else { 'copy fallback allowed' }
                Write-WarnMsg "Falling back to directory copy for $Path ($reason). Auto-updates will not flow through this copy."
                Copy-Item -LiteralPath $Target -Destination $Path -Recurse -Force
                return
            }

            if ($IsConfigAsset) {
                Fail "Failed to create link for config asset '$Path'. Config assets never copy by default. Enable Developer Mode, run elevated, or use -ForceCopy intentionally. Underlying error: $($_.Exception.Message)"
            }

            Fail "Failed to create directory link '$Path' -> '$Target': $($_.Exception.Message)"
        }
    }
}

function New-FileLink {
    param(
        [string]$Path,
        [string]$Target,
        [switch]$AllowCopyFallback,
        [switch]$IsConfigAsset,
        [bool]$CanCreateSymlink
    )

    Remove-PathIfExists -Path $Path

    Invoke-DryAware "link file $Path -> $Target" {
        try {
            if (-not $CanCreateSymlink) {
                throw 'File symbolic links unavailable on this machine.'
            }

            New-Item -ItemType SymbolicLink -Path $Path -Target $Target -ErrorAction Stop | Out-Null
        }
        catch {
            if ($ForceCopy -or ($AllowCopyFallback -and -not $IsConfigAsset)) {
                $reason = if ($ForceCopy) { 'ForceCopy enabled' } else { 'copy fallback allowed' }
                Write-WarnMsg "Falling back to file copy for $Path ($reason). Auto-updates will not flow through this copy."
                Copy-Item -LiteralPath $Target -Destination $Path -Force
                return
            }

            if ($IsConfigAsset) {
                Fail "Failed to create link for config asset '$Path'. Config assets never copy by default. Enable Developer Mode, run elevated, or use -ForceCopy intentionally. Underlying error: $($_.Exception.Message)"
            }

            Fail "Failed to create file link '$Path' -> '$Target': $($_.Exception.Message)"
        }
    }
}

function Update-CurrentPointer {
    param(
        [string]$NewVersionPath,
        [bool]$CanCreateDirectorySymlink
    )

    $current = Join-Path $InstallDir $Script:CurrentName
    $currentNew = Join-Path $InstallDir $Script:CurrentNewName
    $currentBak = Join-Path $InstallDir $Script:CurrentBakName

    Remove-PathIfExists -Path $currentNew
    Remove-PathIfExists -Path $currentBak

    Invoke-DryAware "atomically update current pointer to $NewVersionPath" {
        try {
            if ($CanCreateDirectorySymlink) {
                New-Item -ItemType SymbolicLink -Path $currentNew -Target $NewVersionPath -ErrorAction Stop | Out-Null
            }
            else {
                New-DirectoryJunction -Path $currentNew -Target $NewVersionPath
            }

            if (Test-Path -LiteralPath $current) {
                [System.IO.Directory]::Move($current, $currentBak)
            }

            try {
                [System.IO.Directory]::Move($currentNew, $current)
            }
            catch {
                if (Test-Path -LiteralPath $currentBak) {
                    [System.IO.Directory]::Move($currentBak, $current)
                }
                throw
            }

            if (Test-Path -LiteralPath $currentBak) {
                Remove-Item -LiteralPath $currentBak -Force -Recurse -ErrorAction SilentlyContinue
            }
        }
        catch {
            if (Test-Path -LiteralPath $currentNew) {
                Remove-Item -LiteralPath $currentNew -Force -Recurse -ErrorAction SilentlyContinue
            }
            Fail "Failed to update current pointer atomically: $($_.Exception.Message)"
        }
    }
}

function Ensure-Cosign {
    Ensure-Directory -Path $Script:BinDir
    $expectedCosignSha = Assert-Sha256Hex -Value $Script:CosignSha256 -Label 'Cosign SHA256'

    if (Test-Path -LiteralPath $Script:CosignPath) {
        if (-not $DryRun) {
            $existingHash = Get-FileSha256 -Path $Script:CosignPath
            if ($existingHash -ne $expectedCosignSha) {
                Remove-Item -LiteralPath $Script:CosignPath -Force
            }
            else {
                return $Script:CosignPath
            }
        }
        else {
            return $Script:CosignPath
        }
    }

    $uri = "https://github.com/sigstore/cosign/releases/download/$($Script:CosignVersion)/cosign-windows-amd64.exe"
    Invoke-Download -Uri $uri -OutFile $Script:CosignPath

    if (-not $DryRun) {
        $hash = Get-FileSha256 -Path $Script:CosignPath
        if ($hash -ne $expectedCosignSha) {
            Remove-Item -LiteralPath $Script:CosignPath -Force -ErrorAction SilentlyContinue
            Fail "Cosign SHA256 mismatch. Expected $expectedCosignSha, got $hash."
        }
    }

    Write-Ok "cosign ready at $Script:CosignPath"
    return $Script:CosignPath
}

function Verify-TarballSignature {
    param(
        [string]$TarballPath,
        [string]$BundlePath,
        [string]$ResolvedTag
    )

    if ($DryRun) {
        Write-Info "Dry run: would cosign-verify $TarballPath"
        return
    }

    if (-not (Test-Path -LiteralPath $BundlePath)) {
        Write-WarnMsg "No cosign bundle present for $ResolvedTag. Skipping signature verification."
        return
    }

    $cosign = Ensure-Cosign
    $expectedIdentity = "$($Script:CosignIdentityPrefix)$ResolvedTag"

    $arguments = @(
        'verify-blob',
        '--bundle', $BundlePath,
        '--certificate-identity', $expectedIdentity,
        '--certificate-oidc-issuer', $Script:CosignOidcIssuer,
        $TarballPath
    )

    & $cosign @arguments | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fail "Tarball signature verification failed for $ResolvedTag."
    }

    Write-Ok "Tarball signature verified for $ResolvedTag"
}

function Get-ExpectedTarballSha {
    param([string]$ManifestPath)

    if (-not (Test-Path -LiteralPath $ManifestPath)) {
        return $null
    }

    try {
        $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }

    if ($manifest.PSObject.Properties.Name -contains 'sha256') {
        return [string]$manifest.sha256
    }

    return $null
}

function Expand-Tarball {
    param(
        [string]$TarballPath,
        [string]$DestinationPath
    )

    if ($DryRun) {
        Write-Info "Dry run: would extract $TarballPath to $DestinationPath"
        return
    }

    Test-TarAvailable
    & tar.exe -xzf $TarballPath -C $DestinationPath
    if ($LASTEXITCODE -ne 0) {
        Fail "Failed to extract $TarballPath"
    }
}

function Get-OpenCodeAssetName {
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($arch -eq 'ARM64') {
        return 'opencode-windows-arm64.zip'
    }

    $avx2 = $false
    try {
        Add-Type -MemberDefinition '[System.Runtime.InteropServices.DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int feature);' -Name 'Kernel32Cpu' -Namespace 'AiKit' -ErrorAction Stop | Out-Null
        $avx2 = [AiKit.Kernel32Cpu]::IsProcessorFeaturePresent(40)
    }
    catch {
        $avx2 = $false
    }

    if ($avx2) {
        return 'opencode-windows-x64.zip'
    }

    return 'opencode-windows-x64-baseline.zip'
}

function Ensure-OpenCode {
    $localBinary = Join-Path $Script:BinDir 'opencode.exe'

    if (Test-Path -LiteralPath $localBinary) {
        Write-Ok "OpenCode already present at $localBinary"
        return
    }

    $asset = Get-OpenCodeAssetName
    $tmpRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-kit-opencode-$PID")
    $zipPath = Join-Path $tmpRoot $asset
    $extractDir = Join-Path $tmpRoot 'extract'
    $resolvedTag = Get-LatestReleaseTag -Repository $Script:OpenCodeRepo
    $uri = "https://github.com/$($Script:OpenCodeRepo)/releases/download/$resolvedTag/$asset"
    Ensure-Directory -Path $tmpRoot
    Ensure-Directory -Path $extractDir
    Ensure-Directory -Path $Script:BinDir

    Invoke-Download -Uri $uri -OutFile $zipPath

    if (-not $DryRun) {
        $expectedZipSha = Get-ReleaseAssetSha256 -Repository $Script:OpenCodeRepo -ResolvedTag $resolvedTag -AssetName $asset
        $actualZipSha = Get-FileSha256 -Path $zipPath
        if ($actualZipSha -ne $expectedZipSha) {
            Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
            Fail "OpenCode ZIP SHA256 mismatch for $asset ($resolvedTag). Expected $expectedZipSha, got $actualZipSha."
        }
    }

    Invoke-DryAware "extract OpenCode zip $zipPath" {
        Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
        $binary = Join-Path $extractDir 'opencode.exe'
        if (-not (Test-Path -LiteralPath $binary)) {
            Fail "Downloaded OpenCode archive did not contain opencode.exe"
        }

        Move-Item -LiteralPath $binary -Destination $localBinary -Force
    }

    if (-not $DryRun -and -not (Test-Path -LiteralPath $localBinary)) {
        Fail 'OpenCode installation did not produce opencode.exe'
    }

    if (-not $DryRun) {
        Remove-Item -LiteralPath $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Ok "Installed OpenCode to $localBinary"
}

function Set-UserEnvironmentValue {
    param(
        [string]$Name,
        [string]$Value
    )

    Invoke-DryAware "set user environment variable $Name" {
        [Environment]::SetEnvironmentVariable($Name, $Value, 'User')
    }
}

function Ensure-UserPathContains {
    param([string]$PathToAdd)

    $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
    $entries = @()
    if (-not [string]::IsNullOrWhiteSpace($currentPath)) {
        $entries = $currentPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.TrimEnd('\\') }
    }

    if ($PathToAdd.TrimEnd('\\') -in $entries) {
        return
    }

    $newPath = if ([string]::IsNullOrWhiteSpace($currentPath)) { $PathToAdd } else { "$currentPath;$PathToAdd" }
    Set-UserEnvironmentValue -Name 'PATH' -Value $newPath
}

function Sync-CurrentSessionEnvironment {
    $env:OPENCODE_HOME = $InstallDir

    $sessionEntries = @()
    if (-not [string]::IsNullOrWhiteSpace($env:PATH)) {
        $sessionEntries = $env:PATH -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.TrimEnd('\\') }
    }

    if ($Script:BinDir.TrimEnd('\\') -notin $sessionEntries) {
        $env:PATH = if ([string]::IsNullOrWhiteSpace($env:PATH)) { $Script:BinDir } else { "$($Script:BinDir);$env:PATH" }
    }

    $opencodeBinary = Join-Path $Script:BinDir 'opencode.exe'
    if (Test-Path -LiteralPath $opencodeBinary) {
        Set-Alias -Name opencode -Value $opencodeBinary -Scope Global
    }

    $shadeScript = Join-Path (Get-ShadeInstallPath) 'shade.ps1'
    if (Test-Path -LiteralPath $shadeScript) {
        Set-Alias -Name shade -Value $shadeScript -Scope Global
    }
}

function Get-ProfileManagedBlock {
    $escapedInstallDir = $InstallDir.Replace("'", "''")
    $installerPath = (Join-Path (Join-Path $InstallDir $Script:CurrentName) 'ai-kit-install.ps1').Replace("'", "''")
    return @"
$($Script:ManagedBlockStart)
`$env:OPENCODE_HOME = '$escapedInstallDir'
function ai-kit-update {
    `$shell = ''
    if (`$PSVersionTable.PSEdition -eq 'Core' -and (Test-Path (Join-Path `$PSHOME 'pwsh.exe'))) {
        `$shell = (Join-Path `$PSHOME 'pwsh.exe')
    }
    elseif (Get-Command pwsh.exe -ErrorAction SilentlyContinue) {
        `$shell = 'pwsh.exe'
    }
    else {
        `$shell = 'powershell.exe'
    }

    & `$shell -NoProfile -ExecutionPolicy Bypass -File '$installerPath' -Command update @args
}
if (Test-Path (Join-Path `$env:OPENCODE_HOME '.bin\opencode.exe')) {
    Set-Alias opencode (Join-Path `$env:OPENCODE_HOME '.bin\opencode.exe')
}
if (Test-Path (Join-Path `$env:OPENCODE_HOME 'shade-pico\shade.ps1')) {
    Set-Alias shade (Join-Path `$env:OPENCODE_HOME 'shade-pico\shade.ps1')
}
$($Script:ManagedBlockEnd)
"@
}

function Update-ProfileBlock {
    $profilePath = $PROFILE.CurrentUserAllHosts
    $profileDir = Split-Path -Path $profilePath -Parent

    Ensure-Directory -Path $profileDir
    $content = if (Test-Path -LiteralPath $profilePath) { Get-Content -LiteralPath $profilePath -Raw } else { '' }
    $block = Get-ProfileManagedBlock

    if ($content -match [regex]::Escape($Script:ManagedBlockStart)) {
        $pattern = "(?s)$([regex]::Escape($Script:ManagedBlockStart)).*?$([regex]::Escape($Script:ManagedBlockEnd))"
        $content = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $block })
    }
    else {
        if ($content.Length -gt 0 -and -not $content.EndsWith([Environment]::NewLine)) {
            $content += [Environment]::NewLine
        }

        $content += [Environment]::NewLine + $block.TrimStart() + [Environment]::NewLine
    }

    $tempPath = "$profilePath.tmp.$PID"
    Invoke-DryAware "update profile $profilePath" {
        try {
            [System.IO.File]::WriteAllText($tempPath, $content, [System.Text.UTF8Encoding]::new($false))
            Move-Item -LiteralPath $tempPath -Destination $profilePath -Force
        }
        finally {
            if (Test-Path -LiteralPath $tempPath) {
                Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Get-VersionArtifacts {
    param([string]$RequestedTag)

    $resolvedTag = Resolve-ReleaseTag -RequestedTag $RequestedTag
    $versionDir = Join-Path $Script:VersionsDir $resolvedTag
    $manifestPath = Join-Path $versionDir 'manifest.json'
    $tarballPath = Join-Path $versionDir ("ai-kit-$resolvedTag.tar.gz")
    $bundlePath = Join-Path $versionDir ("ai-kit-$resolvedTag.bundle.json")

    Ensure-Directory -Path $Script:VersionsDir
    Ensure-Directory -Path $versionDir

    Invoke-Download -Uri "https://github.com/$($Script:Repo)/releases/download/$resolvedTag/manifest.json" -OutFile $manifestPath
    Invoke-Download -Uri "https://github.com/$($Script:Repo)/releases/download/$resolvedTag/ai-kit-$resolvedTag.tar.gz" -OutFile $tarballPath

    try {
        Invoke-Download -Uri "https://github.com/$($Script:Repo)/releases/download/$resolvedTag/ai-kit-$resolvedTag.bundle.json" -OutFile $bundlePath
    }
    catch {
        if (-not $DryRun) {
            Remove-Item -LiteralPath $bundlePath -Force -ErrorAction SilentlyContinue
        }
        Write-WarnMsg "No bundle found for $resolvedTag. Signature verification will be skipped."
    }

    if (-not $DryRun) {
        $expectedSha = Get-ExpectedTarballSha -ManifestPath $manifestPath
        if ($expectedSha) {
            $actualSha = Get-FileSha256 -Path $tarballPath
            if ($expectedSha.ToUpperInvariant() -ne $actualSha) {
                Fail "Tarball SHA256 mismatch for $resolvedTag. Expected $expectedSha, got $actualSha."
            }
        }

        Verify-TarballSignature -TarballPath $tarballPath -BundlePath $bundlePath -ResolvedTag $resolvedTag
        Test-TarballEntriesSafe -TarballPath $tarballPath
    }

    return [pscustomobject]@{
        Tag = $resolvedTag
        VersionDir = $versionDir
        ManifestPath = $manifestPath
        TarballPath = $tarballPath
        BundlePath = $bundlePath
    }
}

function Expand-VersionArtifacts {
    param([pscustomobject]$Artifacts)

    Expand-Tarball -TarballPath $Artifacts.TarballPath -DestinationPath $Artifacts.VersionDir

    Invoke-DryAware "remove downloaded release artifacts from $($Artifacts.VersionDir)" {
        Remove-Item -LiteralPath $Artifacts.TarballPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $Artifacts.BundlePath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $Artifacts.ManifestPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-ManagedItemType {
    param([string]$VersionDir, [string]$ItemName)

    $candidate = Join-Path $VersionDir $ItemName
    if (-not (Test-Path -LiteralPath $candidate)) {
        Fail "Expected managed asset missing from release: $ItemName"
    }

    $item = Get-Item -LiteralPath $candidate
    if ($item.PSIsContainer) {
        return 'Directory'
    }

    return 'File'
}

function Sync-ManagedItems {
    param(
        [string]$VersionDir,
        [bool]$CanFileSymlink,
        [bool]$CanDirectorySymlink
    )

    foreach ($itemName in $Script:ManagedItems) {
        $target = Join-Path (Join-Path $InstallDir $Script:CurrentName) $itemName
        $destination = Join-Path $InstallDir $itemName
        $type = Get-ManagedItemType -VersionDir $VersionDir -ItemName $itemName
        $isConfigAsset = $itemName -in $Script:ConfigManagedItems

        if ($type -eq 'Directory') {
            New-DirectoryLink -Path $destination -Target $target -AllowCopyFallback -IsConfigAsset:$isConfigAsset -CanCreateSymlink:$CanDirectorySymlink
        }
        else {
            New-FileLink -Path $destination -Target $target -AllowCopyFallback -IsConfigAsset:$isConfigAsset -CanCreateSymlink:$CanFileSymlink
        }
    }
}

function Activate-Version {
    param([string]$VersionDir)

    $canFileSymlink = Test-SymlinkCapability -Type File
    $canDirectorySymlink = Test-SymlinkCapability -Type Directory
    $previousVersionDir = Get-CurrentVersionPath

    try {
        Update-CurrentPointer -NewVersionPath $VersionDir -CanCreateDirectorySymlink:$canDirectorySymlink
        Sync-ManagedItems -VersionDir $VersionDir -CanFileSymlink:$canFileSymlink -CanDirectorySymlink:$canDirectorySymlink
    }
    catch {
        Write-WarnMsg "Activation failed. Rolling back managed links."

        foreach ($itemName in $Script:ManagedItems) {
            Remove-PathIfExists -Path (Join-Path $InstallDir $itemName)
        }

        if ($previousVersionDir) {
            try {
                Update-CurrentPointer -NewVersionPath $previousVersionDir -CanCreateDirectorySymlink:$canDirectorySymlink
                Sync-ManagedItems -VersionDir $previousVersionDir -CanFileSymlink:$canFileSymlink -CanDirectorySymlink:$canDirectorySymlink
            }
            catch {
                Fail "Failed to activate $VersionDir and rollback to $previousVersionDir: $($_.Exception.Message)"
            }
        }
        else {
            Remove-PathIfExists -Path (Join-Path $InstallDir $Script:CurrentName)
        }

        throw
    }
}

function Get-CurrentVersionPath {
    $current = Join-Path $InstallDir $Script:CurrentName
    if (-not (Test-Path -LiteralPath $current)) {
        return $null
    }

    $item = Get-Item -LiteralPath $current
    $target = $item.Target
    if ($target -is [array]) {
        $target = $target[0]
    }

    return $target
}

function Install-AiKit {
    if (Test-Path -LiteralPath $InstallDir) {
        Fail "Installation directory already exists at $InstallDir. Use -Command update instead."
    }

    Ensure-OpenCode
    Ensure-Directory -Path $InstallDir

    $artifacts = Get-VersionArtifacts -RequestedTag $Tag
    Expand-VersionArtifacts -Artifacts $artifacts
    Activate-Version -VersionDir $artifacts.VersionDir

    $installFrieren = $Frieren -or $Shade
    if ($installFrieren) {
        Install-Frieren
        Update-McpConfig
    }

    if ($Shade) {
        Install-Shade
    }

    Set-UserEnvironmentValue -Name 'OPENCODE_HOME' -Value $InstallDir
    Ensure-UserPathContains -PathToAdd $Script:BinDir
    Sync-CurrentSessionEnvironment
    Update-ProfileBlock

    Write-Ok "Installation complete at $InstallDir"
    Write-Info "Open a new PowerShell session, then run: opencode --version"
}

function Update-AiKit {
    if (-not (Test-Path -LiteralPath $InstallDir)) {
        Fail "No ai-kit installation found at $InstallDir. Use -Command install first."
    }

    Ensure-OpenCode

    $artifacts = Get-VersionArtifacts -RequestedTag $Tag
    Expand-VersionArtifacts -Artifacts $artifacts
    Activate-Version -VersionDir $artifacts.VersionDir

    $installFrieren = $Frieren -or $Shade
    if ($installFrieren) {
        Install-Frieren
        Update-McpConfig
    }

    if ($Shade) {
        Install-Shade
    }

    Set-UserEnvironmentValue -Name 'OPENCODE_HOME' -Value $InstallDir
    Ensure-UserPathContains -PathToAdd $Script:BinDir
    Sync-CurrentSessionEnvironment
    Update-ProfileBlock

    Write-Ok "Update complete. Current version now points to $($artifacts.Tag)"
}

function Show-Status {
    if (-not (Test-Path -LiteralPath $InstallDir)) {
        Write-Info "No ai-kit installation found at $InstallDir"
        return
    }

    Write-Info "Install root: $InstallDir"
    $currentVersionPath = Get-CurrentVersionPath
    if ($currentVersionPath) {
        Write-Info "Current target: $currentVersionPath"
    }

    $frierenLink = Join-Path $InstallDir 'frieren'
    if (Test-Path -LiteralPath $frierenLink) {
        Write-Info "Frieren link: $frierenLink"
    }

    $shadeInstallPath = Get-ShadeInstallPath
    if (Test-Path -LiteralPath $shadeInstallPath) {
        Write-Info "Shade path: $shadeInstallPath"
    }

    if (Test-Path -LiteralPath $Script:VersionsDir) {
        Write-Info 'Available versions:'
        Get-ChildItem -LiteralPath $Script:VersionsDir -Directory | Sort-Object Name | ForEach-Object {
            Write-Host "  - $($_.Name)"
        }
    }
}

function Show-BootstrapHint {
    $oneLiner = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "& { irm https://github.com/krajh/ai-kit/releases/latest/download/install.ps1 | iex }"'
    Write-Info 'Bootstrap one-liner target: install.ps1'
    Write-Host $oneLiner
}

function Main {
    switch ($Command) {
        'install' { Install-AiKit }
        'update' { Update-AiKit }
        'status' { Show-Status }
        'bootstrap' { Show-BootstrapHint }
        'dry-run' {
            $script:DryRun = $true
            if (Test-Path -LiteralPath $InstallDir) {
                Update-AiKit
            }
            else {
                Install-AiKit
            }
        }
        default { Fail "Unsupported command: $Command" }
    }
}

Main
