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

. (Join-Path $PSScriptRoot 'lib/i18n.ps1')
. (Join-Path $PSScriptRoot 'lib/layer-map.ps1')

$root = Split-Path -Parent $PSScriptRoot
$layer = ConvertTo-PascalCase -Value $Name

if (-not (Get-ActiveLayerDir -Root $root -Name $layer)) {
    Write-Error (Get-Text 'common.error' @{ message = (Get-Text 'delete.notActive' @{ layer = $layer }) })
    exit 1
}

$apply = $Yes -and -not $DryRun

if (-not $apply) {
    $slug = Get-LayerSlug -Value $layer
    Write-Host ""
    Write-Host (Get-Text 'delete.planHeader' @{ layer = $layer })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.delete.planRename' @{ old = $layer; retired = ($RetiredPrefix + $layer) })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.delete.planNote' @{ retired = ($RetiredPrefix + $layer) })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.delete.planConfig')
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.delete.planArtifacts' @{ slug = $slug })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.delete.planCleanup' @{ files = ($MapFiles -join ', ') })
    Write-Host ""
    Write-Host (Get-Text 'delete.planFooter')
    exit 0
}

try {
    $result = Invoke-DeleteLayer -Root $root -Layer $layer
}
catch {
    Write-Error (Get-Text 'common.error' @{ message = $_.Exception.Message })
    exit 1
}

if ((Read-ScaffoldConfig -Root $root).machinery -eq 'full') {
    $syncScript = Join-Path $PSScriptRoot 'sync-agent-config.ps1'
    if (Test-Path -LiteralPath $syncScript) {
        Write-Host ""
        Write-Host (Get-Text 'delete.syncing')
        & $syncScript
        if (-not $?) { Write-Error (Get-Text 'delete.syncFailed' @{ code = $LASTEXITCODE }); exit 1 }
    }
}

Write-Host ""
Write-Host (Get-Text 'delete.resultHeader' @{ layer = $result.Layer })
Write-Host (Get-Text 'delete.resultFolder' @{ dir = "src/$($result.RetiredDir)" })
Write-Host (Get-Text 'delete.resultNote' @{ dir = "src/$($result.RetiredDir)" })
$mapNote = if ($result.ConfigUpdated) { Get-Text 'config.updated' } else { Get-Text 'config.unchanged' }
Write-Host (Get-Text 'delete.resultConfig' @{ state = $mapNote })
Write-Host (Get-Text 'delete.resultArtifacts' @{ count = $result.RemovedArtifacts.Count })
Write-Host ""
Write-Host (Get-Text 'delete.footer')
Write-Host ""
