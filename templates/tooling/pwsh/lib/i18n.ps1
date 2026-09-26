#Requires -Version 5.1
<#
.SYNOPSIS
    Lokalizace skriptů vygenerovaného projektu (PowerShell varianta).

.DESCRIPTION
    Jazyk se čte z .scaffold.json (lang). Texty jsou v scripts/locales/, kam
    generátor zapsal katalog pro zvolený jazyk. Když katalog chybí, vrátí
    Get-Text klíč beze změny (chyba je vidět, ne tichá).
#>

$script:I18nProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Get-ProjectLang {
    $configPath = Join-Path $script:I18nProjectRoot '.scaffold.json'
    if (-not (Test-Path -LiteralPath $configPath)) { return 'cs' }

    try {
        $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
        if ($config.lang -eq 'en') { return 'en' }
    }
    catch { }

    return 'cs'
}

$script:I18nCatalog = $null

function Get-I18nCatalog {
    if ($null -ne $script:I18nCatalog) { return $script:I18nCatalog }

    $file = Join-Path $script:I18nProjectRoot ("scripts/locales/{0}.json" -f (Get-ProjectLang))
    if (Test-Path -LiteralPath $file) {
        try { $script:I18nCatalog = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json }
        catch { $script:I18nCatalog = $null }
    }

    if ($null -eq $script:I18nCatalog) { $script:I18nCatalog = [pscustomobject]@{} }
    return $script:I18nCatalog
}

function Get-Text {
    param(
        [string]$Key,
        [hashtable]$Params = @{}
    )

    $catalog = Get-I18nCatalog
    $template = $catalog.$Key
    if ($null -eq $template) { return $Key }

    $result = [string]$template
    foreach ($name in @($Params.Keys)) {
        $result = $result.Replace('{' + $name + '}', [string]$Params[$name])
    }

    return $result
}

function Get-PlaceholderMarker {
    if ((Get-ProjectLang) -eq 'en') { return 'TODO:' }
    return 'DOPLŇ:'
}
