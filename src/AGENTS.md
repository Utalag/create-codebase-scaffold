# AGENTS.md — společná pravidla všech vrstev

Tento soubor doplňuje globální [AGENTS.md](../AGENTS.md) a platí pro všechny
vrstvy v `src/`. Každá vrstva má vlastní `AGENTS.md`, který tato pravidla
zpřesňuje — konkrétnější instrukce má přednost.

## Povinná anatomie vrstvy

Každá vrstva má přesně tuto strukturu:

```text
src/<vrstva>/
  AGENTS.md        # guardrails vrstvy + odkazy na rodiče (tento strom)
  README.md        # účel vrstvy, jak ji spustit a testovat
  .cursor/         # ZDROJ PRAVDY agentní konfigurace vrstvy
  .github/         # lokální composite actions, definice pipeline
  src/             # produkční kód vrstvy
  tests/           # unit/ a integration/
  docs/            # README.md a decisions/ (ADR)
```

## Směr závislostí

Závislosti smějí směřovat pouze dovnitř. Vrstva smí importovat jen vrstvy, které
jsou vůči ní vnitřnější, plus `shared`.

| Vrstva | Smí záviset na |
| --- | --- |
| `presentation` | `application`, `shared` |
| `application` | `domain`, `shared` |
| `domain` | `shared` |
| `infrastructure` | `application`, `domain`, `shared` |
| `shared` | nic |

Zakázané je zejména: `domain` -> `infrastructure`, `application` -> `infrastructure`
(kromě kompozice v testech) a jakákoli závislost na `presentation`.

## Role vrstev

- `domain` — čistá business logika a invarianty. Žádné I/O, žádné frameworky.
- `application` — orchestrace use-case, definice portů. Bez přímého přístupu k vnějšímu světu.
- `infrastructure` — implementace portů, veškerý vnější přístup. Bez business logiky.
- `presentation` — vstupní bod aplikace, validace vstupu a mapování. Bez business logiky.
- `shared` — průřezové primitivy a typy. Bez závislosti na ostatních vrstvách.

## Agentní konfigurace vrstvy

- Zdroj pravdy je `src/<vrstva>/.cursor/`. Root `.cursor/` je generované zrcadlo.
- Po každé změně zdroje spusť `pwsh -File scripts/sync-agent-config.ps1`.
- Nikdy needituj `.cursor/rules/generated/**`.

## Testy a dokumentace

- Testy patří do `src/<vrstva>/tests/` — `unit/` pro izolované, `integration/` pro
  spolupráci s reálnými adaptéry.
- Testy vrstvy spouštěj přes `pwsh -File scripts/test-layer.ps1 -Layer <vrstva>`.
- Netriviální rozhodnutí zapiš jako ADR do `src/<vrstva>/docs/decisions/`.

## Zakázané praktiky

- Křížové importy mezi sourozenými vrstvami (např. `presentation` -> `infrastructure`).
- Business logika v `infrastructure` nebo `presentation`.
- Přímý přístup k databázi, síti nebo filesystemu z `domain` či `application`.
- Ruční vytváření nové vrstvy bez `scripts/new-layer.ps1`.
- Editace generovaných souborů v `.cursor/`.
