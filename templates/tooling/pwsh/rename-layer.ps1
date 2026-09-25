#Requires -Version 5.1
<#
.SYNOPSIS
    Přejmenuje aktivní vrstvu atomicky. Parita s rename-layer.mjs.

.DESCRIPTION
    Nejde o delete + create. Skript:

      1. přejmenuje src/<Stara> na src/<Nova> (obsah zůstává),
      2. aktualizuje .scaffold.json,
      3. přepíše zmínky o vrstvě (PascalCase název, kebab-case slug i titulek)
         v projektových instrukcích, dokumentaci a souborech vrstvy,
      4. přejmenuje agentní artefakty v root .cursor/,
      5. u plné konfigurace spustí sync (stejná smyčka jako u new-layer).

    Nedestruktivní výchozí chování: bez -Yes (nebo s -DryRun) jen vypíše plán
    a nic nezmění.

.PARAMETER Name
    Současný název vrstvy v PascalCase.

.PARAMETER To
    Nový název vrstvy v PascalCase.

.PARAMETER Yes
    Provede změnu. Bez něj skript jen vypíše plán.

.PARAMETER DryRun
    Vynutí pouze vypsání plánu, i kdyby bylo zadáno -Yes.

.EXAMPLE
    pwsh -File scripts/rename-layer.ps1 -Name Billing -To Invoicing -DryRun
    pwsh -File scripts/rename-layer.ps1 -Name Billing -To Invoicing -Yes
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$To,

    [switch]$Yes,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/layer-map.ps1')

$root = Split-Path -Parent $PSScriptRoot
$oldLayer = ConvertTo-PascalCase -Value $Name
$newLayer = ConvertTo-PascalCase -Value $To

if (-not (Get-ActiveLayerDir -Root $root -Name $oldLayer)) {
    Write-Error "Vrstva '$oldLayer' není aktivní v src/."
    exit 1
}

$apply = $Yes -and -not $DryRun

if (-not $apply) {
    Write-Host ""
    Write-Host "Plán (dry-run) — přejmenování vrstvy '$oldLayer' na '$newLayer':"
    Write-Host "  - Přejmenovat složku:  src/$oldLayer -> src/$newLayer"
    Write-Host '  - Aktualizovat mapu:   .scaffold.json (layers)'
    Write-Host '  - Přepsat zmínky:      všechny projektové soubory (název, slug i titulek)'
    Write-Host '  - Přejmenovat artefakty: .cursor/rules/<slug>.mdc, .cursor/agents/<slug>-*, .cursor/skills/<slug>-*'
    Write-Host ""
    Write-Host 'Nic se nezměnilo. Spusť s -Yes pro provedení.'
    exit 0
}

try {
    $result = Invoke-RenameLayer -Root $root -OldName $oldLayer -NewName $newLayer
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}

if ((Read-ScaffoldConfig -Root $root).machinery -eq 'full') {
    $syncScript = Join-Path $PSScriptRoot 'sync-agent-config.ps1'
    if (Test-Path -LiteralPath $syncScript) {
        Write-Host ""
        Write-Host 'Synchronizuji agentní konfiguraci do root .cursor/...'
        & $syncScript
        if (-not $?) { Write-Error 'Synchronizace selhala.'; exit 1 }
    }
}

Write-Host ""
Write-Host "Vrstva '$($result.OldLayer)' byla přejmenována na '$($result.NewLayer)':"
Write-Host "  Složka:      src/$($result.OldLayer) -> src/$($result.NewLayer)"
$mapNote = if ($result.ConfigUpdated) { 'aktualizováno' } else { 'bez změny' }
Write-Host "  Mapa:        .scaffold.json $mapNote"
Write-Host "  Zmínky:      přepsáno v $($result.TouchedFiles) souborech"
Write-Host "  Artefakty:   přejmenováno $($result.RenamedArtifacts.Count) v root .cursor/"
Write-Host ""
Write-Host 'Zkontroluj `src/AGENTS.md` a `docs/layers.md`, že nový název sedí i v ručních úpravách.'
Write-Host ""
