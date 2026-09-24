#Requires -Version 5.1
<#
.SYNOPSIS
    Spustí testy dané vrstvy.

.DESCRIPTION
    Neutrální runner, který nezná konkrétní stack. Vrstva si definuje vlastní
    vstupní bod tests/run.ps1. Pokud runner neexistuje, vrstva se přeskočí
    s hlášením (exit 0), aby CI nepadalo na vrstvách bez testů.

    Smlouva pro tests/run.ps1:
      - přijímá parametr -Layer (string)
      - ukončí se kódem 0 při úspěchu a nenulovým kódem při selhání

.PARAMETER Layer
    Název vrstvy v PascalCase, např. Domain.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Layer
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
$srcRoot = Join-Path $root 'src'

$layerDir = Join-Path $srcRoot $Layer
if (-not (Test-Path -LiteralPath $layerDir)) {
    $match = Get-ChildItem -LiteralPath $srcRoot -Directory |
        Where-Object { $_.Name -ieq $Layer } |
        Select-Object -First 1
    if ($match) { $layerDir = $match.FullName }
}

if (-not (Test-Path -LiteralPath $layerDir)) {
    throw "Vrstva '$Layer' neexistuje v src/."
}

$layerName = Split-Path -Leaf $layerDir
$runner = Join-Path $layerDir 'tests/run.ps1'

if (-not (Test-Path -LiteralPath $runner)) {
    Write-Host "Vrstva '$layerName' nemá testovací runner (src/$layerName/tests/run.ps1). Přeskakuji." -ForegroundColor Yellow
    exit 0
}

Write-Host "Testuji vrstvu '$layerName'..." -ForegroundColor Cyan
& $runner -Layer $layerName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Testy vrstvy '$layerName' selhaly (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Testy vrstvy '$layerName' prošly." -ForegroundColor Green
exit 0
