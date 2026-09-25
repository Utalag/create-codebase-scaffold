#Requires -Version 5.1
<#
.SYNOPSIS
    Sdílená logika pro delete-layer a rename-layer (parita s node layer-map.mjs).

.DESCRIPTION
    Pracuje s "živou mapou vrstev": složky src/<Layer>/, pole layers v
    .scaffold.json, vygenerované instrukce a dokumentace a agentní artefakty
    v root .cursor/.

    Vyřazené vrstvy mají na disku prefix _retired- a nikdy se neberou jako
    aktivní. Funkce nic nemažou z obsahu vyřazené složky.
#>

$RetiredPrefix = '_retired-'

# Soubory, které nesou mapu vrstev nebo na vrstvy odkazují.
$MapFiles = @('AGENTS.md', 'README.md', 'src/AGENTS.md', 'docs/layers.md', 'docs/agent-config.md')

# Adresáře, které se při plošném přepisu jmen nikdy needitují.
$SkipDirs = @('.git', 'node_modules', 'scripts')

$TextExtensions = @('.md', '.mdc', '.json', '.yml', '.yaml', '.txt', '.toml', '.xml')
$TextNames = @('.editorconfig', '.gitattributes', '.gitignore')

function Get-LayerSlug {
    param([string]$Value)

    $step1 = [regex]::Replace($Value, '([a-z0-9])([A-Z])', '$1-$2')
    $step2 = [regex]::Replace($step1, '([A-Z]+)([A-Z][a-z])', '$1-$2')
    return $step2.ToLowerInvariant()
}

function ConvertTo-PascalCase {
    param([string]$Value)

    $words = $Value.Trim() -split '[^A-Za-z0-9]+' | Where-Object { $_.Length -gt 0 }
    return ($words | ForEach-Object {
        $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1)
    }) -join ''
}

function Get-LayerTitle {
    param([string]$Value)

    $step1 = [regex]::Replace($Value, '([a-z0-9])([A-Z])', '$1 $2')
    return [regex]::Replace($step1, '([A-Z]+)([A-Z][a-z])', '$1 $2')
}

function Test-ActiveLayerName {
    param([string]$Name)
    return ($Name -match '^[A-Z][A-Za-z0-9]*$')
}

function Get-ActiveLayerNames {
    param([string]$Root)

    $srcRoot = Join-Path $Root 'src'
    if (-not (Test-Path -LiteralPath $srcRoot)) { return @() }

    return @(Get-ChildItem -LiteralPath $srcRoot -Directory |
        Where-Object { Test-ActiveLayerName $_.Name } |
        Select-Object -ExpandProperty Name |
        Sort-Object)
}

function Get-ActiveLayerDir {
    param([string]$Root, [string]$Name)

    $srcRoot = Join-Path $Root 'src'
    if (-not (Test-Path -LiteralPath $srcRoot)) { return $null }

    $exact = Join-Path $srcRoot $Name
    if (Test-Path -LiteralPath $exact) {
        if ((Get-Item -LiteralPath $exact).PSIsContainer) { return $exact }
    }

    $match = Get-ChildItem -LiteralPath $srcRoot -Directory |
        Where-Object { (Test-ActiveLayerName $_.Name) -and ($_.Name -ieq $Name) } |
        Select-Object -First 1

    if ($match) { return $match.FullName }
    return $null
}

function Read-ScaffoldConfig {
    param([string]$Root)

    $configPath = Join-Path $Root '.scaffold.json'
    if (-not (Test-Path -LiteralPath $configPath)) { return $null }

    try { return (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json) }
    catch { return $null }
}

function Write-ScaffoldConfig {
    param([string]$Root, $Config)

    $configPath = Join-Path $Root '.scaffold.json'
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($configPath, (($Config | ConvertTo-Json -Depth 6) + "`n"), $utf8NoBom)
}

function Write-Utf8Lf {
    param([string]$Path, [string]$Content)

    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $normalized = ($Content -replace "`r`n", "`n").TrimEnd("`n") + "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
}

function Read-Utf8Lf {
    param([string]$Path)
    return ([System.IO.File]::ReadAllText($Path) -replace "`r`n", "`n")
}

function Get-TextFiles {
    param([string]$Root)

    $result = New-Object System.Collections.Generic.List[string]
    $stack = New-Object System.Collections.Generic.Stack[string]
    $stack.Push($Root)

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()

        foreach ($entry in @(Get-ChildItem -LiteralPath $current -Force)) {
            if ($entry.PSIsContainer) {
                if ($SkipDirs -contains $entry.Name) { continue }
                if ($entry.Name.StartsWith($RetiredPrefix)) { continue }
                $stack.Push($entry.FullName)
                continue
            }

            $relative = $entry.FullName.Substring($Root.Length).TrimStart('\', '/') -replace '\\', '/'
            if ($relative -eq '.scaffold.json') { continue }

            $base = $entry.Name
            $ext = [System.IO.Path]::GetExtension($base).ToLowerInvariant()
            if (($TextNames -contains $base) -or ($TextExtensions -contains $ext)) {
                $result.Add($relative)
            }
        }
    }

    return @($result | Sort-Object)
}

<#
    Vyřadí vrstvu z textu řízeným způsobem. Odpovídá node pruneLayerReferences.
#>
function Remove-LayerReferences {
    param([string]$Text, [string]$Layer)

    $nameToken = '`' + $Layer + '`'
    $nameEsc = [regex]::Escape($Layer)
    $tokenEsc = [regex]::Escape($nameToken)

    $lines = ($Text -replace "`r`n", "`n").Split("`n")
    $kept = New-Object System.Collections.Generic.List[string]
    $section = ''

    foreach ($line in $lines) {
        $trimmed = $line.Trim()

        # Sledujeme sekci, abychom cíleně vyřadili guardrails odkazující na
        # vyřazenou vrstvu (např. "ta patří do `Domain`.").
        $header = [regex]::Match($trimmed, '^#{1,6}\s+(.+?)\s*$')
        if ($header.Success) {
            $section = $header.Groups[1].Value
            $kept.Add($line)
            continue
        }

        if ($section -eq 'Guardrails' -and $line.Contains($nameToken)) { continue }

        # Tabulka vrstev: | `Layer` | deps |
        $table = [regex]::Match($trimmed, '^\| (`[^`]+`) \| (.+) \|$')
        if ($table.Success) {
            $subject = $table.Groups[1].Value
            if ($subject -eq $nameToken) { continue }
            if ($line.Contains($nameToken)) {
                $deps = @($table.Groups[2].Value -split ',\s*' |
                    ForEach-Object { $_.Trim() } |
                    Where-Object { $_ -and $_ -ne $nameToken -and $_ -ne '—' })
                $depText = if ($deps.Count -gt 0) { $deps -join ', ' } else { '—' }
                $kept.Add("| $subject | $depText |")
                continue
            }
        }

        # Odrážka s rolí vrstvy.
        if ($trimmed -match ('^-\s*' + $tokenEsc + '\s*[—–-]')) { continue }

        # Řádek stromu projektu.
        if ($line -match ('^\s{2}' + $nameEsc + '/\s')) { continue }

        # Hrany mermaid diagramu.
        if ($line -match ('^\s*' + $nameEsc + '\s*-->')) { continue }
        if ($line -match ('-->\s*' + $nameEsc + '\s*$')) { continue }

        # Ukázkový mermaid v docs/agent-config.md.
        if ($line.Contains("src/$Layer/")) { continue }

        # Popis architektury (AGENTS.md, docs/layers.md, README.md).
        if (($trimmed -match '^Projekt používá architekturu') -or ($trimmed -match '^\*\*[^*]+\*\*\s+[—–-]\s+')) {
            $cleaned = $line -replace ('\s*,\s*' + $nameEsc + '(?=\s*[.,])'), ''
            $cleaned = $cleaned -replace ($nameEsc + ',\s*'), ''
            $kept.Add($cleaned)
            continue
        }

        # Inline seznam vrstev: "Vrstvy: `A`, `B`, ..."
        if ($trimmed -match '^Vrstvy:\s') {
            $cleaned = $line -replace ('\s*' + $tokenEsc + ',\s*'), ' '
            $cleaned = $cleaned -replace ('\s*,\s*' + $tokenEsc), ''
            $cleaned = $cleaned -replace $tokenEsc, ''
            $kept.Add($cleaned.TrimEnd())
            continue
        }

        # Pravidlo závislostí: "- `X` nesmí importovat `A`, `Layer`."
        $forbidden = [regex]::Match($trimmed, '^- (`[^`]+`) nesmí importovat (.+)\.$')
        if ($forbidden.Success) {
            $subject = $forbidden.Groups[1].Value
            if ($subject -eq $nameToken) { continue }
            if ($line.Contains($nameToken)) {
                $deps = @($forbidden.Groups[2].Value -split ',\s*' |
                    ForEach-Object { $_.Trim() } |
                    Where-Object { $_ -and $_ -ne $nameToken })
                if ($deps.Count -eq 0) { continue }
                $kept.Add("- $subject nesmí importovat $($deps -join ', ').")
                continue
            }
        }

        # Věta o povolených závislostech.
        $allowed = [regex]::Match($trimmed, '^Smí záviset pouze na (.+)\.$')
        if ($allowed.Success -and $line.Contains($nameToken)) {
            $deps = @($allowed.Groups[1].Value -split ',\s*' |
                ForEach-Object { $_.Trim() } |
                Where-Object { $_ -and $_ -ne $nameToken })
            if ($deps.Count -eq 0) { $kept.Add('Nesmí záviset na žádné jiné vrstvě.') }
            else { $kept.Add("Smí záviset pouze na $($deps -join ', ').") }
            continue
        }

        $kept.Add($line)
    }

    return ($kept -join "`n")
}

<#
    Přepíše zmínky o vrstvě (název, slug, titulek) na nové hodnoty.
#>
function Rename-LayerReferences {
    param([string]$Text, [string]$OldName, [string]$NewName)

    $oldSlug = Get-LayerSlug -Value $OldName
    $newSlug = Get-LayerSlug -Value $NewName
    $oldTitle = Get-LayerTitle -Value $OldName
    $newTitle = Get-LayerTitle -Value $NewName

    $result = $Text

    if ($oldTitle -ne $OldName) {
        $result = $result -replace ('\b' + [regex]::Escape($oldTitle) + '\b'), $newTitle
    }

    $result = $result -replace ('\b' + [regex]::Escape($OldName) + '\b'), $NewName

    if ($oldSlug -ne $newSlug) {
        $result = $result -replace ('(?<![A-Za-z0-9-])' + [regex]::Escape($oldSlug) + '(?![A-Za-z0-9-])'), $newSlug
    }

    return $result
}

function Replace-InFile {
    param([string]$Path, [scriptblock]$Transform)

    $before = Read-Utf8Lf -Path $Path
    $after = & $Transform $before
    if ($after -ne $before) {
        Write-Utf8Lf -Path $Path -Content $after
        return $true
    }
    return $false
}

function Remove-RootEntry {
    param(
        [string]$Root,
        [string]$Path,
        [System.Collections.Generic.List[string]]$Removed
    )

    if (-not (Test-Path -LiteralPath $Path)) { return }
    Remove-Item -LiteralPath $Path -Recurse -Force
    $rel = $Path.Substring($Root.Length).TrimStart('\', '/') -replace '\\', '/'
    if (-not $Removed.Contains($rel)) { $Removed.Add($rel) }
}

function Rename-RootEntry {
    param(
        [string]$Root,
        [string]$Path,
        [string]$TargetName,
        [System.Collections.Generic.List[string]]$Renamed
    )

    if (-not (Test-Path -LiteralPath $Path)) { return }
    $target = Join-Path (Split-Path -Parent $Path) $TargetName
    if ($target -eq $Path) { return }
    if (Test-Path -LiteralPath $target) { return }

    Move-Item -LiteralPath $Path -Destination $target
    $rel = $target.Substring($Root.Length).TrimStart('\', '/') -replace '\\', '/'
    if (-not $Renamed.Contains($rel)) { $Renamed.Add($rel) }
}

function Remove-RootArtifacts {
    param([string]$Root, [string]$Slug)

    $removed = New-Object System.Collections.Generic.List[string]
    $cursorRoot = Join-Path $Root '.cursor'

    Remove-RootEntry -Root $Root -Path (Join-Path $cursorRoot "rules/$Slug.mdc") -Removed $removed
    Remove-RootEntry -Root $Root -Path (Join-Path $cursorRoot "rules/generated/$Slug") -Removed $removed

    foreach ($base in @((Join-Path $cursorRoot 'agents'), (Join-Path $cursorRoot 'skills'))) {
        if (-not (Test-Path -LiteralPath $base)) { continue }
        foreach ($entry in @(Get-ChildItem -LiteralPath $base -Force)) {
            if ($entry.Name -eq $Slug -or $entry.Name.StartsWith("$Slug-")) {
                Remove-RootEntry -Root $Root -Path $entry.FullName -Removed $removed
            }
        }
    }

    return @($removed)
}

function Rename-RootArtifacts {
    param([string]$Root, [string]$OldSlug, [string]$NewSlug)

    $renamed = New-Object System.Collections.Generic.List[string]
    $cursorRoot = Join-Path $Root '.cursor'

    Rename-RootEntry -Root $Root -Path (Join-Path $cursorRoot "rules/$OldSlug.mdc") -TargetName "$NewSlug.mdc" -Renamed $renamed
    Rename-RootEntry -Root $Root -Path (Join-Path $cursorRoot "rules/generated/$OldSlug") -TargetName $NewSlug -Renamed $renamed

    foreach ($base in @((Join-Path $cursorRoot 'agents'), (Join-Path $cursorRoot 'skills'))) {
        if (-not (Test-Path -LiteralPath $base)) { continue }
        foreach ($entry in @(Get-ChildItem -LiteralPath $base -Force)) {
            if ($entry.Name -eq $OldSlug -or $entry.Name.StartsWith("$OldSlug-")) {
                $targetName = $entry.Name -replace [regex]::Escape($OldSlug), $NewSlug
                Rename-RootEntry -Root $Root -Path $entry.FullName -TargetName $targetName -Renamed $renamed
            }
        }
    }

    return @($renamed)
}

function Invoke-DeleteLayer {
    param([string]$Root, [string]$Layer)

    $layerDir = Get-ActiveLayerDir -Root $Root -Name $Layer
    if (-not $layerDir) { throw "Vrstva '$Layer' není aktivní v src/." }

    $resolved = Split-Path -Leaf $layerDir
    $slug = Get-LayerSlug -Value $resolved
    $retiredDir = Join-Path (Split-Path -Parent $layerDir) ($RetiredPrefix + $resolved)

    if (Test-Path -LiteralPath $retiredDir) {
        throw "Vyřazená složka už existuje: $retiredDir."
    }

    Move-Item -LiteralPath $layerDir -Destination $retiredDir

    $notePath = Join-Path $retiredDir 'RETIRED.md'
    if (-not (Test-Path -LiteralPath $notePath)) {
        $note = @(
            "# Vyřazená vrstva: $resolved",
            '',
            'Tato vrstva byla vyřazena skriptem `delete-layer` (soft retire).',
            'Obsah složky je záměrně zachovaný, ale vrstva už není součástí živé mapy:',
            '',
            '- startuje prefixem `_retired-`, takže ji sync, verify ani CI neberou jako aktivní,',
            '- byla odebrána z `.scaffold.json` a z odkazů v instrukcích.',
            '',
            'Pokud ji chceš opravdu smazat, smaž celou tuto složku ručně (hard delete).',
            ''
        ) -join "`n"
        Write-Utf8Lf -Path $notePath -Content $note
    }

    $configUpdated = $false
    $config = Read-ScaffoldConfig -Root $Root
    if ($config -and $null -ne $config.layers) {
        $updated = @($config.layers | Where-Object { $_ -ne $resolved })
        if ((@($config.layers) -join "`n") -ne ($updated -join "`n")) {
            $config.layers = [object[]]$updated
            Write-ScaffoldConfig -Root $Root -Config $config
            $configUpdated = $true
        }
    }

    foreach ($relative in $MapFiles) {
        $file = Join-Path $Root ($relative -replace '/', '\')
        if (Test-Path -LiteralPath $file) {
            Replace-InFile -Path $file -Transform {
                param($text)
                return (Remove-LayerReferences -Text $text -Layer $resolved)
            } | Out-Null
        }
    }

    foreach ($other in (Get-ActiveLayerNames -Root $Root)) {
        $file = Join-Path $Root "src/$other/AGENTS.md"
        if (Test-Path -LiteralPath $file) {
            Replace-InFile -Path $file -Transform {
                param($text)
                return (Remove-LayerReferences -Text $text -Layer $resolved)
            } | Out-Null
        }
    }

    $removedArtifacts = Remove-RootArtifacts -Root $Root -Slug $slug

    return [pscustomobject]@{
        Layer            = $resolved
        RetiredDir       = $RetiredPrefix + $resolved
        ConfigUpdated    = $configUpdated
        RemovedArtifacts = $removedArtifacts
    }
}

function Invoke-RenameLayer {
    param([string]$Root, [string]$OldName, [string]$NewName)

    $layerDir = Get-ActiveLayerDir -Root $Root -Name $OldName
    if (-not $layerDir) { throw "Vrstva '$OldName' není aktivní v src/." }

    $resolvedOld = Split-Path -Leaf $layerDir
    $resolvedNew = $NewName

    if (-not (Test-ActiveLayerName $resolvedNew)) {
        throw "Neplatný název vrstvy '$NewName'. Povoleno je PascalCase z písmen a číslic."
    }
    if ($resolvedNew -eq $resolvedOld) {
        throw "Nová vrstva je stejná jako původní ('$resolvedOld')."
    }

    $target = Join-Path (Split-Path -Parent $layerDir) $resolvedNew
    if (Test-Path -LiteralPath $target) { throw "Cílová složka už existuje: src/$resolvedNew." }

    $oldSlug = Get-LayerSlug -Value $resolvedOld
    $newSlug = Get-LayerSlug -Value $resolvedNew

    Move-Item -LiteralPath $layerDir -Destination $target

    $configUpdated = $false
    $config = Read-ScaffoldConfig -Root $Root
    if ($config -and $null -ne $config.layers) {
        $updated = @($config.layers | ForEach-Object { if ($_ -eq $resolvedOld) { $resolvedNew } else { $_ } })
        if ((@($config.layers) -join "`n") -ne ($updated -join "`n")) {
            $config.layers = [object[]]$updated
            Write-ScaffoldConfig -Root $Root -Config $config
            $configUpdated = $true
        }
    }

    $touched = 0
    foreach ($relative in (Get-TextFiles -Root $Root)) {
        $file = Join-Path $Root ($relative -replace '/', '\')
        $changed = Replace-InFile -Path $file -Transform {
            param($text)
            return (Rename-LayerReferences -Text $text -OldName $resolvedOld -NewName $resolvedNew)
        }
        if ($changed) { $touched += 1 }
    }

    $renamedArtifacts = Rename-RootArtifacts -Root $Root -OldSlug $oldSlug -NewSlug $newSlug

    return [pscustomobject]@{
        OldLayer         = $resolvedOld
        NewLayer         = $resolvedNew
        ConfigUpdated    = $configUpdated
        TouchedFiles     = $touched
        RenamedArtifacts = $renamedArtifacts
    }
}
