# create-codebase-scaffold

[![CI](https://github.com/Utalag/create-codebase-scaffold/actions/workflows/ci.yml/badge.svg)](https://github.com/Utalag/create-codebase-scaffold/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Není publikováno v npm registru.** `npx create-codebase-scaffold` proto zatím
> skončí chybou `404`. Primární cesta je klon repozitáře a spuštění ze zdrojů
> (`node bin/create.js`). Viz [Instalace](#instalace). Stav publikace: `0.1.0`
> zatím není vydaná.

Generátor jazykově neutrálního, vrstveného scaffoldu připraveného pro vývoj
řízený AI agenty. Scaffold se generuje ve zvoleném jazyce — `cs` (výchozí) nebo
`en` — a to včetně README, instrukcí pro agenty, skills, dokumentace i výstupu
skriptů projektu.

Do zvolené složky vygeneruje **čistý projekt**: vrstvy v `src/`, guardrails pro
agenty (`AGENTS.md`, `.cursor/`), skripty pro správu vrstev, dokumentaci a CI.
Vygenerovaný projekt neobsahuje žádné informace o tom, jak generátor funguje —
jen to, co patří reálnému projektu.

## Instalace

Generátor nemá žádné závislosti — stačí Node.js >= 20. Balíček zatím není
publikovaný v npm registru, takže se spouští ze zdrojů:

```bash
git clone https://github.com/Utalag/create-codebase-scaffold.git create-codebase-scaffold && cd create-codebase-scaffold
node bin/create.js my-app
```

Podrobný postup (včetně `npx`, globální instalace, ověření a odinstalace):
[`docs/install.md`](docs/install.md).

## Použití

```bash
# interaktivní průvodce (první otázka je jazyk scaffoldu)
node bin/create.js my-app

# neinteraktivně
node bin/create.js my-api --preset hexagonal --tooling node
node bin/create.js app --layers Domain,Application,Adapters,Shared \
  --machinery full --agents cursor,copilot,claude

# anglický scaffold i průvodce
node bin/create.js my-app --lang en --preset clean
```

Až bude balíček publikovaný, bude fungovat i `npx create-codebase-scaffold my-app`
se stejnými volbami.

## Volby

| Volba | Hodnoty | Výchozí |
| --- | --- | --- |
| `--lang` | `cs`, `en` | `cs` (interaktivně se ptá jako první) |
| `--preset` | `clean`, `hexagonal`, `layered`, `vertical-slice`, `custom` | `clean` |
| `--layers` | volný seznam PascalCase vrstev, přebíjí preset | — |
| `--tooling` | `node`, `pwsh` | `node` |
| `--machinery` | `full`, `lean` | `full` |
| `--agents` | `cursor`, `copilot`, `codex`, `claude`, nebo `all` | `cursor,codex` |
| `--ci` / `--no-ci` | vygenerovat CI workflow | `--ci` |
| `--dry-run` | jen vypsat, co by se zapsalo | — |
| `--force`, `--overwrite` | přepsat i existující soubory | nikdy nepřepisovat |
| `--git-init` | po vygenerování spustit `git init` | — |
| `-y`, `--yes` | neptat se, použít výchozí hodnoty | — |

## Architektonické presety

| Preset | Vrstvy |
| --- | --- |
| `clean` | Domain, Application, Infrastructure, Presentation, Shared |
| `hexagonal` | Domain, Application, Adapters, Shared |
| `layered` | Presentation, Business, Data, Shared |
| `vertical-slice` | Features, Infrastructure, Shared |
| `custom` | cokoli přes `--layers` |

Směr závislostí je součástí presetu a promítá se do `AGENTS.md`, `src/AGENTS.md`
a `docs/layers.md` vygenerovaného projektu.

## Rozsah agentní konfigurace

- `machinery=full` — každá vrstva vlastní svou agentní konfiguraci v
  `src/<Layer>/.cursor/`; root `.cursor/` je její generované zrcadlo a drží se
  v souladu skriptem (`sync-agent-config`) a hookem.
- `machinery=lean` — agentní konfigurace žije jen v root `.cursor/`, bez zrcadla,
  bez sync skriptu a bez hooků.

Podrobnosti: [`docs/agent-config.md`](docs/agent-config.md).

## Nedestruktivnost

Generátor nikdy nepřepíše existující soubor. Opakované spuštění nad hotovým
projektem je bezpečné a nic nezmění; přepsání vynutíš jen `--force`. Verifikační
a testovací skripty vygenerovaného projektu jsou striktně read-only.

## Co vygenerovaný projekt dostane

- `AGENTS.md`, `src/AGENTS.md` a `AGENTS.md` v každé vrstvě — instrukce pro agenty.
- `src/<Layer>/` s `README.md`, `docs/`, `src/`, `tests/` a (u `full`) `.cursor/`
  a `.github/`.
- `scripts/` — `new-layer`, `verify-layer`, `test-layer`, `delete-layer`,
  `rename-layer`, `sync-agent-config` (u `full`), šablona vrstvy a guardrails;
  plus `README.md` a `locales/<lang>.json` ve zvoleném jazyce.
- Životní cyklus vrstev: `new-layer` založí vrstvu a sám synchronizuje mapu
  (u `full`); `rename-layer` vrstvu přejmenuje včetně odkazů a zrcadel;
  `delete-layer` ji **nedestruktivně vyřadí** (prefix `_retired-`, obsah zůstává).
- `.cursor/` podle zvolených ekosystémů, `CLAUDE.md`, `.github/copilot-instructions.md`.
- `docs/`, `.editorconfig`, `.gitignore`, `.scaffold.json` a CI workflow.

## Vývoj generátoru

```bash
npm test                 # testy generátoru
node bin/create.js .tmp  # ruční vygenerování do .tmp
```

Rozložení repa:

```text
bin/create.js      # CLI vstup
lib/               # logika generátoru (CLI, presety, šablony, zápis)
templates/         # šablony generovaného projektu
test/              # testy generátoru
examples/          # referenční vygenerované projekty
docs/              # dokumentace generátoru
```

Viz [`docs/`](docs/README.md).
