# src/AGENTS.md — společná pravidla všech vrstev

Tento soubor doplňuje globální [AGENTS.md](../AGENTS.md) a platí pro všechny
vrstvy v `src/`. Každá vrstva má vlastní `AGENTS.md`, který tato pravidla
zpřesňuje — konkrétnější instrukce má přednost.

## Povinná anatomie vrstvy

```text
src/<Layer>/
  AGENTS.md        # guardrails vrstvy + odkazy na rodiče
  README.md        # účel vrstvy, jak ji spustit a testovat
  src/             # produkční kód vrstvy
  tests/           # unit/ a integration/
  docs/            # README.md a decisions/ (ADR)
<!--#if full-->
  .cursor/         # ZDROJ PRAVDY agentní konfigurace vrstvy
  .github/         # lokální composite action a definice pipeline vrstvy
<!--#endif-->
```

## Směr závislostí

Závislosti smějí směřovat pouze dovnitř. Vrstva smí importovat jen vrstvy,
které jsou vůči ní vnitřnější.

__LAYER_TABLE__

Zakázané je zejména:

__DEPENDENCY_RULES__

## Role vrstev

__LAYER_ROLES__

## Zakázané praktiky

- Křížové importy mezi sourozenými vrstvami proti směru závislostí.
- Business logika v adaptérech, datech nebo vstupní vrstvě.
- Přímý přístup k databázi, síti nebo filesystemu z domény či aplikační vrstvy.
- Ruční vytváření nové vrstvy bez skriptu `__NEW_LAYER_CMD__`.
<!--#if full-->
- Editace generovaných souborů v `.cursor/rules/generated/**`.
<!--#endif-->
