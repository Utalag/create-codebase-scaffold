#Requires -Version 5.1
<#
.SYNOPSIS
    Ověří, že vrstva má povinnou strukturu a správně propojené instrukce.

.DESCRIPTION
    Kontroluje anatomii vrstvy a ověřuje, že AGENTS.md vrstvy odkazuje na
    rodičovská pravidla. Skript nic nezapisuje — je bezpečné ho spouštět
    opakovaně a na cizím repozitáři.

    Rozsah kontroly se řídí konfigurací projektu (.scaffold.json): u plné
    konfigurace (full) se ověřuje i .cursor/ a .github/ vrstvy.

.PARAMETER Layer
    Název vrstvy v PascalCase, např. Domain nebo AntiFraud.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Layer
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir

function Resolve-LayerDirectory {
    param([string]$Root, [string]$Name)

    $srcRoot = Join-Path $Root 'src'
    if (-not (Test-Path -LiteralPath $srcRoot)) { return $null }

    $exact = Join-Path $srcRoot $Name
    if (Test-Path -LiteralPath $exact) { return $exact }

    $match = Get-ChildItem -LiteralPath $srcRoot -Directory |
        Where-Object { $_.Name -ieq $Name } |
        Select-Object -First 1

    if ($match) { return $match.FullName }
    return $null
}

function Get-ProjectMachinery {
    param([string]$Root)

    $configPath = Join-Path $Root '.scaffold.json'
    if (-not (Test-Path -LiteralPath $configPath)) { return 'lean' }

    try {
        return [string](Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).machinery
    }
    catch {
        return 'lean'
    }
}

$layerDir = Resolve-LayerDirectory -Root $root -Name $Layer
if (-not $layerDir) {
    throw "Vrstva '$Layer' neexistuje v src/."
}

$layerName = Split-Path -Leaf $layerDir

$required = @(
    'AGENTS.md',
    'README.md',
    'src',
    'tests',
    'tests/unit',
    'tests/integration',
    'docs',
    'docs/decisions'
)

if ((Get-ProjectMachinery -Root $root) -eq 'full') {
    $required += @('.cursor', '.cursor/rules', '.cursor/agents', '.cursor/skills', '.github')
}

$problems = New-Object System.Collections.Generic.List[string]

foreach ($item in $required) {
    $path = Join-Path $layerDir ($item -replace '/', '\')
    if (-not (Test-Path -LiteralPath $path)) {
        $problems.Add("chybí povinná položka: $item")
    }
}

$agentsFile = Join-Path $layerDir 'AGENTS.md'
if (Test-Path -LiteralPath $agentsFile) {
    $agentsText = [System.IO.File]::ReadAllText($agentsFile)

    if ($agentsText -notmatch [regex]::Escape('src/AGENTS.md')) {
        $problems.Add('AGENTS.md neodkazuje na rodičovská pravidla (src/AGENTS.md)')
    }

    if ($agentsText -notmatch '(?m)^##\s+Guardrails') {
        $problems.Add("AGENTS.md neobsahuje sekci '## Guardrails'")
    }

    if ($agentsText -match '__[A-Z][A-Z_]*__' -or $agentsText -cmatch 'DOPLŇ:') {
        $problems.Add('AGENTS.md obsahuje nevyplněné placeholdery šablony')
    }
}

$rulesDir = Join-Path $layerDir '.cursor/rules'
if (Test-Path -LiteralPath $rulesDir) {
    if (@(Get-ChildItem -LiteralPath $rulesDir -Filter '*.mdc' -File).Count -eq 0) {
        $problems.Add("'.cursor/rules' neobsahuje žádné .mdc pravidlo")
    }
}

$agentsDir = Join-Path $layerDir '.cursor/agents'
if (Test-Path -LiteralPath $agentsDir) {
    if (@(Get-ChildItem -LiteralPath $agentsDir -Filter '*.md' -File).Count -eq 0) {
        $problems.Add("'.cursor/agents' neobsahuje žádného subagenta")
    }
}

if ($problems.Count -gt 0) {
    Write-Host "Vrstva '$layerName' neprošla kontrolou:" -ForegroundColor Red
    $problems | ForEach-Object { Write-Host "  - $_" }
    exit 1
}

Write-Host "Vrstva '$layerName' je v pořádku (struktura i propojení instrukcí)." -ForegroundColor Green
exit 0
