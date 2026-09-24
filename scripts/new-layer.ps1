#Requires -Version 5.1
<#
.SYNOPSIS
    Vygeneruje novou architektonickou vrstvu v src/ ze šablony.

.DESCRIPTION
    Založí kompletní anatomii vrstvy: AGENTS.md s guardrails a odkazy na rodiče,
    README.md, zdroj agentní konfigurace (.cursor/), .github/, src/, tests/ a docs/.

    Pro známé vrstvy (domain, application, infrastructure, presentation, shared)
    použije konkrétní guardrails. Pro neznámé vrstvy použije obecnou sadu, kterou
    je nutné doplnit.

.PARAMETER Name
    Název vrstvy. Lowercase, pomlčky, např. billing nebo anti-fraud.

.PARAMETER Force
    Přepíše existující vrstvu.

.EXAMPLE
    pwsh -File scripts/new-layer.ps1 -Name billing
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Name,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Validace a příprava
# ---------------------------------------------------------------------------

$layer = $Name.Trim().ToLowerInvariant()

if ($layer -notmatch '^[a-z][a-z0-9]*(-[a-z0-9]+)*$') {
    throw "Neplatný název vrstvy '$Name'. Povoleno: lowercase písmena, číslice a pomlčky, např. 'billing' nebo 'anti-fraud'."
}

$title = ($layer -split '-' | Where-Object { $_.Length -gt 0 } | ForEach-Object {
    $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1)
}) -join ' '

$scriptDir = $PSScriptRoot
$root = Split-Path -Parent $scriptDir
$srcRoot = Join-Path $root 'src'
$layerDir = Join-Path $srcRoot $layer

if ((Test-Path -LiteralPath $layerDir) -and -not $Force) {
    throw "Vrstva '$layer' už existuje v $layerDir. Použij -Force pro přepsání."
}

# ---------------------------------------------------------------------------
# Presety guardrails
# ---------------------------------------------------------------------------

$presets = @{}

$presets['domain'] = @{
    Responsibility = 'Čistá business logika. Entita, value object, doménová služba a invarianty. Vrstva neví nic o tom, jak je aplikace spuštěna ani odkud přicházejí data.'
    DependsOn      = 'Smí záviset pouze na `shared`. Nikdy nesmí importovat `application`, `infrastructure` ani `presentation`.'
    Guardrails     = @'
- Žádné I/O: nesmí sahat na databázi, síť, filesystem, systémový čas ani náhodu.
- Žádné frameworky, anotace ani serializace závislé na infrastruktuře.
- Veškerá logika je deterministická a testovatelná bez mocků a bez běžícího prostředí.
- Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry, nikdy jako volání uvnitř.
- Entita chrání své invarianty: neplatný stav nesmí být možné vytvořit.
- Doménové chyby jsou explicitní typy, ne obecné výjimky ani návratové kódy.
'@
}

$presets['application'] = @{
    Responsibility = 'Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět a řídí tok mezi doménou a adaptéry.'
    DependsOn      = 'Smí záviset na `domain` a `shared`. Nesmí záviset na `infrastructure` ani `presentation`.'
    Guardrails     = @'
- Neobsahuje business pravidla — ta patří do `domain`.
- Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.
- Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.
- Transakční hranice, idempotence a řazení kroků patří sem.
- Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.
- Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.
'@
}

$presets['infrastructure'] = @{
    Responsibility = 'Implementace portů a veškerý přístup k vnějšímu světu: databáze, HTTP klienti, filesystem, fronty, cache, e-maily.'
    DependsOn      = 'Smí záviset na `application`, `domain` a `shared`. Nikdy nesmí záviset na `presentation`.'
    Guardrails     = @'
- Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.
- Implementuje porty definované v `application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Chyby adaptérů překládá na explicitní chyby doménového typu.
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.
- Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).
'@
}

$presets['presentation'] = @{
    Responsibility = 'Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti zpráv. Překládá vnější vstup na volání use-case.'
    DependsOn      = 'Smí záviset na `application` a `shared`. Nikdy nesmí záviset na `infrastructure` ani na `domain` přímo.'
    Guardrails     = @'
- Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.
- Neobsahuje business logiku ani přímý přístup k datům.
- Volá výhradně use-casy z `application`.
- Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.
- Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.
'@
}

$presets['shared'] = @{
    Responsibility = 'Průřezové primitivy bez závislostí: výsledkové typy, chybová hierarchie, hodnotové utility, společné typy.'
    DependsOn      = 'Nesmí záviset na žádné jiné vrstvě.'
    Guardrails     = @'
- Nesmí záviset na žádné jiné vrstvě.
- Nesmí obsahovat business logiku konkrétní domény.
- Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.
- Bez stavu, bez I/O, bez konfigurace.
- Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.
'@
}

$presets['default'] = @{
    Responsibility = 'DOPLŇ: Popiš odpovědnost vrstvy jednou konkrétní větou. Co je jejím výhradním vlastnictvím a co do ní naopak nepatří?'
    DependsOn      = 'DOPLŇ: Vyjmenuj, které vrstvy smí tato vrstva importovat a které nikdy. Odvoď to od směru závislostí v AGENTS.md.'
    Guardrails     = @'
- DOPLŇ: Formuluj 4-6 konkrétních, kontrolovatelných zákazů a povinností.
- DOPLŇ: Uveď, co do vrstvy nepatří, i když to na první pohled souvisí.
- DOPLŇ: Uveď, jak se vrstva testuje a co musí být v testech zakázané.
- Výchozí: dodrž směr závislostí z AGENTS.md a nevytvářej nové křížové závislosti.
'@
}

$preset = if ($presets.ContainsKey($layer)) { $presets[$layer] } else { $presets['default'] }

# ---------------------------------------------------------------------------
# Šablony
# ---------------------------------------------------------------------------

$tplAgents = @'
# AGENTS.md — vrstva __LAYER__

Tento soubor je guardrail pro vrstvu `__LAYER__`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/__LAYER__/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Směr závislostí

__DEPENDS_ON__

## Struktura vrstvy

```text
src/__LAYER__/
  AGENTS.md        # tento soubor — guardrails vrstvy
  README.md        # účel vrstvy a jak ji spustit
  .cursor/         # ZDROJ PRAVDY agentní konfigurace vrstvy
  .github/         # composite action a definice pipeline vrstvy
  src/             # produkční kód vrstvy
  tests/           # unit/ a integration/
  docs/            # dokumentace a decisions/ (ADR)
```

## Agentní konfigurace vrstvy

- Zdroj pravdy je `.cursor/` v této vrstvě. Root `.cursor/` je generované zrcadlo.
- Po každé změně `.cursor/` spusť: `pwsh -File scripts/sync-agent-config.ps1`
- Nikdy needituj `.cursor/rules/generated/**` — je přepsáno syncem.

## Před dokončením práce

- [ ] Změna dodržuje směr závislostí.
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer __LAYER__`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
'@

$tplReadme = @'
# Vrstva __LAYER_TITLE__ (`src/__LAYER__`)

## Účel

__RESPONSIBILITY__

## Role v architektuře

__DEPENDS_ON__

## Guardrails

Viz [`AGENTS.md`](AGENTS.md). Souhrn:

__GUARDRAILS__

## Jak pracovat s vrstvou

- Pravidla a guardrails: [`AGENTS.md`](AGENTS.md)
- Zdroj pravdy agentní konfigurace: [`.cursor/`](.cursor/)
- Produkční kód: [`src/`](src/)
- Testy: `pwsh -File scripts/test-layer.ps1 -Layer __LAYER__`
- Rozhodnutí a ADR: [`docs/`](docs/)

## Související pravidla

- Globální pravidla repozitáře: `AGENTS.md` (root)
- Společná pravidla všech vrstev: `src/AGENTS.md`
'@

$tplRule = @'
---
description: "__LAYER_TITLE__ layer - guardrails a konvence vrstvy"
globs: ["**/*"]
alwaysApply: false
---

# __LAYER_TITLE__ — standardy vrstvy

## Odpovědnost

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Směr závislostí

__DEPENDS_ON__

## Kontext

Úplná pravidla jsou v `AGENTS.md` (root), `src/AGENTS.md` a `src/__LAYER__/AGENTS.md`.
Při práci ve vrstvě čti všechny tři úrovně; konkrétnější má přednost.
'@

$tplAgent = @'
---
name: __LAYER__-dev
description: Specialista na vrstvu __LAYER_TITLE__. Použij při implementaci, úpravách nebo kontrole kódu v src/__LAYER__/.
model: inherit
readonly: false
is_background: false
---

Pracuješ výhradně ve vrstvě `__LAYER__` (`src/__LAYER__/`).

Než začneš, přečti si v tomto pořadí:

1. `AGENTS.md` (root) — globální pravidla repozitáře.
2. `src/AGENTS.md` — společná pravidla všech vrstev.
3. `src/__LAYER__/AGENTS.md` — guardrails této vrstvy.

## Odpovědnost vrstvy

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Směr závislostí

__DEPENDS_ON__

## Postup

1. Ověř, že požadavek skutečně patří do této vrstvy. Pokud ne, řekni to a doporuč správnou vrstvu.
2. Implementuj nejmenší změnu, která respektuje guardrails a směr závislostí.
3. Dopiš nebo uprav testy v `tests/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer __LAYER__`.
5. Pokud jsi měnil `.cursor/`, spusť `pwsh -File scripts/sync-agent-config.ps1`.

Nikdy neporušuj směr závislostí. Pokud to zadání vyžaduje, zastav se a vysvětli proč.
'@

$tplSkill = @'
---
name: __LAYER__-workflow
description: Pracovní postup pro vrstvu __LAYER_TITLE__. Použij při implementaci, testování nebo kontrole změn v src/__LAYER__/.
---

# Pracovní postup vrstvy __LAYER_TITLE__

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/__LAYER__/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer __LAYER__`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
'@

$tplAction = @'
name: Setup __LAYER_TITLE__ layer
description: Ověří strukturu a agentní konfiguraci vrstvy __LAYER__.

runs:
  using: composite
  steps:
    - name: Ověř strukturu a agentní konfiguraci vrstvy
      shell: pwsh
      run: |
        $ErrorActionPreference = 'Stop'
        $verify = Join-Path $env:GITHUB_WORKSPACE 'scripts/verify-layer.ps1'
        if (Test-Path -LiteralPath $verify) {
          & $verify -Layer '__LAYER__'
        }
        else {
          Write-Host "scripts/verify-layer.ps1 není k dispozici (standalone vrstva) - přeskakuji strukturální kontrolu."
        }
'@

$tplWorkflow = @'
# Definice pipeline vrstvy __LAYER__.
#
# POZOR: GitHub Actions načítá workflows výhradně z root .github/workflows/.
# Tento soubor je zdroj pravdy pro vrstvu a konzumuje ho root ci.yml.
# Spustitelný je pouze tehdy, je-li vrstva otevřena jako samostatný repozitář.

name: __LAYER__

on:
  workflow_dispatch:

jobs:
  layer:
    name: Layer __LAYER__
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Ověř strukturu a konfiguraci vrstvy
        uses: ./src/__LAYER__/.github/actions/setup-layer

      - name: Testy vrstvy
        shell: pwsh
        run: ./scripts/test-layer.ps1 -Layer __LAYER__
'@

$tplDocsReadme = @'
# Dokumentace vrstvy __LAYER_TITLE__

Tato složka obsahuje dokumentaci specifickou pro vrstvu `__LAYER__`.

## Obsah

- `decisions/` — Architecture Decision Records (ADR) vrstvy.

## ADR

Každé netriviální rozhodnutí vrstvy zapiš jako nové ADR. Pojmenování:
`NNNN-kratky-nazev.md`, číslováno vzestupně od `0001`.

Šablona je v `decisions/0001-adopt-layer-template.md`.

## Související dokumentace

- Účel a spuštění vrstvy: `../README.md`
- Guardrails vrstvy: `../AGENTS.md`
- Společná pravidla vrstev: `../../AGENTS.md`
- Globální pravidla repozitáře: `../../../AGENTS.md`
'@

$tplAdr = @'
# 0001 — Přijetí jednotné šablony vrstvy

- Status: accepted
- Datum: DOPLŇ (YYYY-MM-DD)

## Kontext

Vrstva `__LAYER__` byla založena z jednotné šablony repozitáře, aby všechny vrstvy
měly stejnou anatomii: guardrails pro agenty, testy, dokumentaci a zdroj agentní
konfigurace. Bez toho se vrstvy rozcházejí a agenti ztrácejí kontext.

## Rozhodnutí

Vrstva používá tuto strukturu:

- `AGENTS.md` — guardrails vrstvy s odkazy na rodičovské instrukce
- `.cursor/` — zdroj pravdy agentní konfigurace vrstvy
- `.github/` — composite action a definice pipeline vrstvy
- `src/` — produkční kód vrstvy
- `tests/` — `unit/` a `integration/`
- `docs/` — dokumentace a ADR

## Důsledky

- Pozitivní: konzistence napříč vrstvami, snadná orientace agentů, vlastnictví
  konfigurace vrstvou.
- Pozitivní: vrstvu lze otevřít jako samostatný workspace a konfigurace funguje.
- Negativní: zdroj v `.cursor/` musí být synchronizován do root `.cursor/`
  skriptem `scripts/sync-agent-config.ps1`.
- Negativní: přidání vrstvy znamená nový záznam v CI matici.

## Alternativy

- Ruční kopírování složek — zamítnuto, vede k rozpadu konvence.
- Veškerá konfigurace pouze v root `.cursor/` bez zdrojů ve vrstvách — zamítnuto,
  ztrácí se vlastnictví vrstvy a nefunguje při otevření vrstvy samostatně.
'@

# ---------------------------------------------------------------------------
# Zápis souborů
# ---------------------------------------------------------------------------

function Expand-LayerTemplate {
    param(
        [string]$Template,
        [hashtable]$Preset,
        [string]$Layer,
        [string]$LayerTitle
    )

    return $Template.
        Replace('__LAYER_TITLE__', $LayerTitle).
        Replace('__LAYER__', $Layer).
        Replace('__RESPONSIBILITY__', $Preset.Responsibility).
        Replace('__DEPENDS_ON__', $Preset.DependsOn).
        Replace('__GUARDRAILS__', $Preset.Guardrails)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-LayerFile {
    param([string]$Path, [string]$Content)

    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $normalized = ($Content -replace "`r`n", "`n")
    if (-not $normalized.EndsWith("`n")) { $normalized += "`n" }

    [System.IO.File]::WriteAllText($Path, $normalized, $utf8NoBom)
}

$files = [ordered]@{
    'AGENTS.md'                                     = (Expand-LayerTemplate $tplAgents $preset $layer $title)
    'README.md'                                     = (Expand-LayerTemplate $tplReadme $preset $layer $title)
    '.cursor/rules/standards.mdc'                   = (Expand-LayerTemplate $tplRule $preset $layer $title)
    '.cursor/agents/dev.md'                         = (Expand-LayerTemplate $tplAgent $preset $layer $title)
    '.cursor/skills/workflow/SKILL.md'              = (Expand-LayerTemplate $tplSkill $preset $layer $title)
    '.github/actions/setup-layer/action.yml'        = (Expand-LayerTemplate $tplAction $preset $layer $title)
    '.github/workflows/__LAYER__.yml'               = (Expand-LayerTemplate $tplWorkflow $preset $layer $title)
    'docs/README.md'                                = (Expand-LayerTemplate $tplDocsReadme $preset $layer $title)
    'docs/decisions/0001-adopt-layer-template.md'   = (Expand-LayerTemplate $tplAdr $preset $layer $title)
}

foreach ($relative in $files.Keys) {
    $target = Join-Path $layerDir ($relative.Replace('__LAYER__', $layer) -replace '/', '\')
    Write-LayerFile -Path $target -Content $files[$relative]
}

foreach ($placeholder in @('src/.gitkeep', 'tests/unit/.gitkeep', 'tests/integration/.gitkeep')) {
    $target = Join-Path $layerDir ($placeholder -replace '/', '\')
    $dir = Split-Path -Parent $target
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    if (-not (Test-Path -LiteralPath $target)) { New-Item -ItemType File -Path $target | Out-Null }
}

# ---------------------------------------------------------------------------
# Souhrn
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "Vrstva '$layer' byla vytvořena: src/$layer" -ForegroundColor Green
Write-Host ""
Write-Host "Další kroky:"
Write-Host "  1. Uprav guardrails:      src/$layer/AGENTS.md"

if (-not $presets.ContainsKey($layer) -or $layer -eq 'default') {
    Write-Host "     (Pozor: použit OBECNÝ preset s tokeny DOPLŇ — musíš je nahradit.)" -ForegroundColor Yellow
}

Write-Host "  2. Synchronizuj konfig:   pwsh -File scripts/sync-agent-config.ps1"
Write-Host "  3. Ověř konfiguraci:      pwsh -File scripts/sync-agent-config.ps1 -Check"
Write-Host "  4. Spusť testy:           pwsh -File scripts/test-layer.ps1 -Layer $layer"
Write-Host ""
