#Requires -Version 5.1
<#
.SYNOPSIS
    Založí novou architektonickou vrstvu v src/.

.DESCRIPTION
    Vygeneruje anatomii vrstvy ze šablony scripts/layer-template/. Guardrails
    a směr závislostí bere z archetypu vrstvy (scripts/layer-presets.json).
    Pro známé vrstvy vloží konkrétní guardrails, pro neznámé obecnou sadu
    s markery DOPLŇ:, které je nutné nahradit.

    Skript je nedestruktivní: existující soubor nikdy nepřepíše. Přepsání
    vynutíš přepínačem -Force.

    U plné konfigurace (machinery=full) skript po založení vrstvy sám spustí
    sync-agent-config, aby root .cursor/ nezůstalo zastaralé a -Check prošlo.

    Skript nikdy needituje existující soubory projektu — pokud je potřeba
    doplnit novou vrstvu do src/AGENTS.md nebo docs/layers.md, vypíše upozornění.

.PARAMETER Name
    Název vrstvy v PascalCase, např. Billing nebo AntiFraud.

.PARAMETER Force
    Přepíše i existující soubory.

.EXAMPLE
    pwsh -File scripts/new-layer.ps1 -Name Billing
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/i18n.ps1')

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
$srcRoot = Join-Path $root 'src'

# ---------------------------------------------------------------------------
# Názvy
# ---------------------------------------------------------------------------

function ConvertTo-PascalCase {
    param([string]$Value)

    $words = $Value.Trim() -split '[^A-Za-z0-9]+' | Where-Object { $_.Length -gt 0 }
    return ($words | ForEach-Object {
        $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1)
    }) -join ''
}

function Get-LayerSlug {
    param([string]$Value)

    $step1 = [regex]::Replace($Value, '([a-z0-9])([A-Z])', '$1-$2')
    $step2 = [regex]::Replace($step1, '([A-Z]+)([A-Z][a-z])', '$1-$2')
    return $step2.ToLowerInvariant()
}

function Get-LayerTitle {
    param([string]$Value)

    $step1 = [regex]::Replace($Value, '([a-z0-9])([A-Z])', '$1 $2')
    return [regex]::Replace($step1, '([A-Z]+)([A-Z][a-z])', '$1 $2')
}

$layer = ConvertTo-PascalCase -Value $Name

if ($layer -notmatch '^[A-Z][A-Za-z0-9]*$') {
    throw (Get-Text 'new.invalidName' @{ name = $Name })
}

$layerSlug = Get-LayerSlug -Value $layer
$layerTitle = Get-LayerTitle -Value $layer
$layerDir = Join-Path $srcRoot $layer

# ---------------------------------------------------------------------------
# Archetyp a směr závislostí
# ---------------------------------------------------------------------------

$presetsPath = Join-Path $scriptDir 'layer-presets.json'
if (-not (Test-Path -LiteralPath $presetsPath)) {
    throw (Get-Text 'new.presetsMissing' @{ path = $presetsPath })
}

$presets = Get-Content -LiteralPath $presetsPath -Raw | ConvertFrom-Json

$archetype = $presets.archetypes.$layerSlug
if (-not $archetype) { $archetype = $presets.archetypes.default }

$existingLayers = @()
if (Test-Path -LiteralPath $srcRoot) {
    $existingLayers = @(Get-ChildItem -LiteralPath $srcRoot -Directory |
        Where-Object { $_.Name -match '^[A-Z][A-Za-z0-9]*$' } |
        Select-Object -ExpandProperty Name)
}

$knownArchetype = $null -ne $archetype.canonicalDeps

$allowedDeps = @()
if ($knownArchetype) {
    $allowedDeps = @($archetype.canonicalDeps | Where-Object { $_ -ne $layer -and $existingLayers -contains $_ })
}

if (-not $knownArchetype) {
    $dependsOn = Get-Text 'new.dependsUnknown'
}
elseif ($allowedDeps.Count -eq 0) {
    $dependsOn = Get-Text 'new.dependsNone'
}
else {
    $dependsOn = Get-Text 'new.dependsOnly' @{ deps = (($allowedDeps | ForEach-Object { "``$_``" }) -join ', ') }
}

$guardrails = ($archetype.guardrails | ForEach-Object { "- $_" }) -join "`n"

$tokens = @{
    'LAYER'          = $layer
    'LAYER_SLUG'     = $layerSlug
    'LAYER_TITLE'    = $layerTitle
    'RESPONSIBILITY' = $archetype.responsibility
    'GUARDRAILS'     = $guardrails
    'DEPENDS_ON'     = $dependsOn
    'YEAR'           = (Get-Date).ToString('yyyy')
}

function Expand-Tokens {
    param([string]$Text, [hashtable]$Map)

    $result = $Text
    foreach ($key in $Map.Keys) {
        $result = $result.Replace("__${key}__", [string]$Map[$key])
    }
    if ($Map.ContainsKey('LAYER')) {
        $result = $result.Replace('<Layer>', [string]$Map['LAYER'])
    }
    return $result
}

# ---------------------------------------------------------------------------
# Zápis souborů
# ---------------------------------------------------------------------------

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$created = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

function Write-NewFile {
    param([string]$Path, [string]$Content)

    if ((Test-Path -LiteralPath $Path) -and -not $Force) {
        $script:skipped.Add($Path)
        return
    }

    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $normalized = ($Content -replace "`r`n", "`n")
    if ($normalized.Length -gt 0 -and -not $normalized.EndsWith("`n")) { $normalized += "`n" }

    [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
    $script:created.Add($Path)
}

$templateDir = Join-Path $scriptDir 'layer-template'
if (-not (Test-Path -LiteralPath $templateDir)) {
    throw (Get-Text 'new.templateMissing' @{ path = $templateDir })
}

foreach ($file in @(Get-ChildItem -LiteralPath $templateDir -Recurse -File -Force)) {
    $relative = $file.FullName.Substring($templateDir.Length).TrimStart('\', '/')
    $relative = Expand-Tokens -Text ($relative -replace '\\', '/') -Map $tokens

    $target = if ($relative.StartsWith('__root__/')) {
        Join-Path $root ($relative.Substring('__root__/'.Length) -replace '/', '\')
    }
    else {
        Join-Path $layerDir ($relative -replace '/', '\')
    }

    Write-NewFile -Path $target -Content (Expand-Tokens -Text ([System.IO.File]::ReadAllText($file.FullName)) -Map $tokens)
}

foreach ($placeholder in @('src', 'tests/unit', 'tests/integration')) {
    $dir = Join-Path $layerDir ($placeholder -replace '/', '\')
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $hasContent = @(Get-ChildItem -LiteralPath $dir -File -Force).Count -gt 0
    if (-not $hasContent) {
        $gitkeep = Join-Path $dir '.gitkeep'
        if (-not (Test-Path -LiteralPath $gitkeep)) { New-Item -ItemType File -Path $gitkeep | Out-Null }
    }
}

# ---------------------------------------------------------------------------
# Konfigurace projektu a automatický sync mapy
# ---------------------------------------------------------------------------

$machinery = 'lean'
$configPath = Join-Path $root '.scaffold.json'
if (Test-Path -LiteralPath $configPath) {
    try {
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        $machinery = [string]$config.machinery

        # Doplň vrstvu do mapy vrstev, pokud tam ještě není.
        if ($config.layers -is [array] -and ($config.layers -notcontains $layer)) {
            $config.layers = @($config.layers) + $layer
            [System.IO.File]::WriteAllText(
                $configPath,
                (($config | ConvertTo-Json -Depth 6) + "`n"),
                $utf8NoBom
            )
        }
    }
    catch {
        $machinery = 'lean'
    }
}

# U plné konfigurace se root .cursor/ udržuje jako zrcadlo zdrojů ve vrstvách.
# Bez tohoto kroku by hned po založení vrstvy selhal `sync-agent-config -Check`
# (a tím i CI), proto ho skript spouští sám.
function Invoke-AgentConfigSync {
    $syncScript = Join-Path $scriptDir 'sync-agent-config.ps1'
    if (-not (Test-Path -LiteralPath $syncScript)) { return }

    Write-Host ""
    Write-Host (Get-Text 'new.syncing')
    & $syncScript
    if (-not $?) {
        throw (Get-Text 'new.syncFailed' @{ code = $LASTEXITCODE })
    }
}

# ---------------------------------------------------------------------------
# Souhrn
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host (Get-Text 'new.created' @{ layer = $layer }) -ForegroundColor Green
$skippedCount = $skipped.Count
if ($skippedCount -gt 0) {
    Write-Host (Get-Text 'new.skipped' @{ count = $skippedCount }) -ForegroundColor Yellow
}

if (-not $knownArchetype) {
    Write-Host ""
    Write-Host (Get-Text 'new.genericArchetype' @{ marker = (Get-Text 'common.marker'); layer = $layer }) -ForegroundColor Yellow
}

if ($machinery -eq 'full') {
    Invoke-AgentConfigSync
}

Write-Host ""
Write-Host (Get-Text 'new.nextSteps')

$steps = New-Object System.Collections.Generic.List[string]
$steps.Add((Get-Text 'new.step.guardrails' @{ layer = $layer }))
$steps.Add((Get-Text 'new.step.rules'))
if ($machinery -eq 'full') {
    $steps.Add((Get-Text 'new.step.sync' @{ cmd = 'pwsh -File scripts/sync-agent-config.ps1 -Check' }))
}
$steps.Add((Get-Text 'new.step.verify' @{ cmd = "pwsh -File scripts/verify-layer.ps1 -Layer $layer" }))
$steps.Add((Get-Text 'new.step.test' @{ cmd = "pwsh -File scripts/test-layer.ps1 -Layer $layer" }))

for ($i = 0; $i -lt $steps.Count; $i++) {
    Write-Host ("  {0}. {1}" -f ($i + 1), $steps[$i])
}

Write-Host ""
