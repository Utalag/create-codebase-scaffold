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

. (Join-Path $PSScriptRoot 'lib/i18n.ps1')
. (Join-Path $PSScriptRoot 'lib/layer-map.ps1')

$root = Split-Path -Parent $PSScriptRoot
$oldLayer = ConvertTo-PascalCase -Value $Name
$newLayer = ConvertTo-PascalCase -Value $To

if (-not (Get-ActiveLayerDir -Root $root -Name $oldLayer)) {
    Write-Error (Get-Text 'common.error' @{ message = (Get-Text 'rename.notActive' @{ layer = $oldLayer }) })
    exit 1
}

$apply = $Yes -and -not $DryRun

if (-not $apply) {
    Write-Host ""
    Write-Host (Get-Text 'rename.planHeader' @{ old = $oldLayer; new = $newLayer })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.rename.planRename' @{ old = $oldLayer; new = $newLayer })
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.rename.planConfig')
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.rename.planMentions')
    Write-Host "  - " -NoNewline; Write-Host (Get-Text 'map.rename.planArtifacts')
    Write-Host ""
    Write-Host (Get-Text 'rename.planFooter')
    exit 0
}

try {
    $result = Invoke-RenameLayer -Root $root -OldName $oldLayer -NewName $newLayer
}
catch {
    Write-Error (Get-Text 'common.error' @{ message = $_.Exception.Message })
    exit 1
}

if ((Read-ScaffoldConfig -Root $root).machinery -eq 'full') {
    $syncScript = Join-Path $PSScriptRoot 'sync-agent-config.ps1'
    if (Test-Path -LiteralPath $syncScript) {
        Write-Host ""
        Write-Host (Get-Text 'rename.syncing')
        & $syncScript
        if (-not $?) { Write-Error (Get-Text 'rename.syncFailed' @{ code = $LASTEXITCODE }); exit 1 }
    }
}

Write-Host ""
Write-Host (Get-Text 'rename.resultHeader' @{ old = $result.OldLayer; new = $result.NewLayer })
Write-Host (Get-Text 'rename.resultFolder' @{ old = $result.OldLayer; new = $result.NewLayer })
$mapNote = if ($result.ConfigUpdated) { Get-Text 'config.updated' } else { Get-Text 'config.unchanged' }
Write-Host (Get-Text 'rename.resultConfig' @{ state = $mapNote })
Write-Host (Get-Text 'rename.resultMentions' @{ count = $result.TouchedFiles })
Write-Host (Get-Text 'rename.resultArtifacts' @{ count = $result.RenamedArtifacts.Count })
Write-Host ""
Write-Host (Get-Text 'rename.footer')
Write-Host ""
