#Requires -Version 5.1
<#
.SYNOPSIS
    Vyřadí vrstvu z živé mapy (soft retire). Parita s delete-layer.mjs.

.DESCRIPTION
    Skript NEMAŽE obsah složky. Místo toho:

      1. přejmenuje src/<Layer> na src/_retired-<Layer>, takže ji sync, verify
         ani CI neberou jako aktivní vrstvu,
      2. zapíše do ní RETIRED.md s vysvětlením,
      3. odebere vrstvu z .scaffold.json a z odkazů v instrukcích a dokumentaci,
      4. odstraní její agentní artefakty z root .cursor/ a u plné konfigurace
         spustí sync (stejná smyčka jako u new-layer).

    Hard delete (smazání složky) zůstává na uživateli — skript ho nikdy neudělá.

    Nedestruktivní výchozí chování: bez -Yes (nebo s -DryRun) jen vypíše plán
    a nic nezmění.

.PARAMETER Name
    Název vrstvy v PascalCase, např. Billing.

.PARAMETER Yes
    Provede změnu. Bez něj skript jen vypíše plán.

.PARAMETER DryRun
    Vynutí pouze vypsání plánu, i kdyby bylo zadáno -Yes.

.EXAMPLE
    pwsh -File scripts/delete-layer.ps1 -Name Billing -DryRun
    pwsh -File scripts/delete-layer.ps1 -Name Billing -Yes
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [switch]$Yes,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/layer-map.ps1')

$root = Split-Path -Parent $PSScriptRoot
$layer = ConvertTo-PascalCase -Value $Name

if (-not (Get-ActiveLayerDir -Root $root -Name $layer)) {
    Write-Error "Vrstva '$layer' není aktivní v src/."
    exit 1
}

$apply = $Yes -and -not $DryRun

if (-not $apply) {
    $slug = Get-LayerSlug -Value $layer
    Write-Host ""
    Write-Host "Plán (dry-run) — vyřazení vrstvy '$layer':"
    Write-Host "  - Přejmenovat složku:  src/$layer -> src/$($RetiredPrefix)$layer"
    Write-Host "  - Zapsat poznámku:     src/$($RetiredPrefix)$layer/RETIRED.md"
    Write-Host '  - Odebrat z mapy:      .scaffold.json (layers)'
    Write-Host "  - Odstranit artefakty: .cursor/rules/$slug.mdc, .cursor/agents/$slug-*, .cursor/skills/$slug-*, .cursor/rules/generated/$slug"
    Write-Host "  - Vyčistit zmínky:     $($MapFiles -join ', ') a AGENTS.md ostatních vrstev"
    Write-Host ""
    Write-Host 'Nic se nezměnilo. Spusť s -Yes pro provedení (obsah složky zůstane).'
    exit 0
}

try {
    $result = Invoke-DeleteLayer -Root $root -Layer $layer
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
Write-Host "Vrstva '$($result.Layer)' byla vyřazena (soft retire):"
Write-Host "  Složka:      src/$($result.RetiredDir) (obsah zachován)"
Write-Host "  Poznámka:    src/$($result.RetiredDir)/RETIRED.md"
$mapNote = if ($result.ConfigUpdated) { 'aktualizováno' } else { 'bez změny' }
Write-Host "  Mapa:        .scaffold.json $mapNote"
Write-Host "  Artefakty:   odstraněno $($result.RemovedArtifacts.Count) z root .cursor/"
Write-Host ""
Write-Host 'Vrstva už není aktivní. Hard delete (smazání složky) proveď ručně, pokud ji nechceš archivovat.'
Write-Host ""
