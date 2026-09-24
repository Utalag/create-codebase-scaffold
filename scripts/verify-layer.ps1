#Requires -Version 5.1
<#
.SYNOPSIS
    Ověří, že vrstva má povinnou strukturu a správně propojené instrukce.

.DESCRIPTION
    Kontroluje anatomii vrstvy (AGENTS.md, README.md, .cursor/, .github/, src/,
    tests/, docs/) a ověřuje, že AGENTS.md vrstvy odkazuje na rodičovská pravidla
    v src/AGENTS.md. Používá CI, lokální composite action vrstvy i vývojář ručně.

.PARAMETER Layer
    Název vrstvy v src/, např. infrastructure.

.EXAMPLE
    pwsh -File scripts/verify-layer.ps1 -Layer infrastructure
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Layer
)

$ErrorActionPreference = 'Stop'

$layerName = $Layer.Trim().ToLowerInvariant()

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
$layerDir = Join-Path (Join-Path $root 'src') $layerName

if (-not (Test-Path -LiteralPath $layerDir)) {
    throw "Vrstva '$layerName' neexistuje: src/$layerName"
}

$required = @(
    'AGENTS.md',
    'README.md',
    '.cursor',
    '.cursor/rules',
    '.cursor/agents',
    '.cursor/skills',
    '.github',
    'src',
    'tests',
    'tests/unit',
    'tests/integration',
    'docs',
    'docs/decisions'
)

$problems = New-Object System.Collections.Generic.List[string]

foreach ($item in $required) {
    $path = Join-Path $layerDir ($item -replace '/', '\')
    if (-not (Test-Path -LiteralPath $path)) {
        $problems.Add("chybí povinná položka: $item")
    }
}

# AGENTS.md vrstvy musí odkazovat na rodičovská pravidla
$agentsFile = Join-Path $layerDir 'AGENTS.md'
if (Test-Path -LiteralPath $agentsFile) {
    $agentsText = [System.IO.File]::ReadAllText($agentsFile)

    if ($agentsText -notmatch [regex]::Escape('src/AGENTS.md')) {
        $problems.Add("AGENTS.md neodkazuje na rodičovská pravidla (src/AGENTS.md)")
    }

    if ($agentsText -notmatch '(?m)^##\s+Guardrails') {
        $problems.Add("AGENTS.md neobsahuje sekci '## Guardrails'")
    }

    # Nevyplněný token šablony má tvar __NAZEV__ nebo explicitní marker "DOPLŇ:".
    if ($agentsText -match '__[A-Z][A-Z_]*__' -or $agentsText -cmatch 'DOPLŇ:') {
        $problems.Add("AGENTS.md obsahuje nevyplněné placeholdery šablony (__TOKEN__ nebo DOPLŇ:)")
    }
}

# Vrstva musí mít alespoň jedno pravidlo a jednoho agenta jako zdroj pravdy
$rulesDir = Join-Path $layerDir '.cursor/rules'
if (Test-Path -LiteralPath $rulesDir) {
    $ruleCount = @(Get-ChildItem -LiteralPath $rulesDir -Filter '*.mdc' -File).Count
    if ($ruleCount -eq 0) {
        $problems.Add("'.cursor/rules' neobsahuje žádné .mdc pravidlo")
    }
}

$agentsDir = Join-Path $layerDir '.cursor/agents'
if (Test-Path -LiteralPath $agentsDir) {
    $agentCount = @(Get-ChildItem -LiteralPath $agentsDir -Filter '*.md' -File).Count
    if ($agentCount -eq 0) {
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
