# Vrstvy projektu

Projekt používá architekturu **__ARCH_LABEL__**: __ARCH_DESCRIPTION__

Každá vrstva je samostatná složka v `src/` s vlastními guardrails, testy a
dokumentací.

## Přehled

__LAYER_TABLE__

## Role vrstev

__LAYER_ROLES__

## Směr závislostí

__DEPENDENCY_MERMAID__

Zakázané je zejména:

__DEPENDENCY_RULES__

## Anatomie vrstvy

Každá vrstva má shodnou strukturu:

```text
src/<Layer>/
  AGENTS.md        # guardrails vrstvy + odkazy na rodičovské instrukce
  README.md        # účel vrstvy, jak ji spustit a testovat
  src/             # produkční kód vrstvy
  tests/           # unit/ a integration/
  docs/            # README.md a decisions/ (ADR)
<!--#if full-->
  .cursor/         # ZDROJ PRAVDY agentní konfigurace vrstvy
  .github/         # composite action a definice pipeline vrstvy
<!--#endif-->
```

Strukturu vynucuje `scripts/verify-layer.__SCRIPT_EXT__`.

## Založení nové vrstvy

```text
__NEW_LAYER_CMD__
```

Pro známé vrstvy generátor vloží konkrétní guardrails; pro neznámé vloží obecnou
sadu s markery `DOPLŇ:`, které je nutné nahradit. Dokud v `AGENTS.md` zůstanou
markery `DOPLŇ:`, vrstva neprojde kontrolou `scripts/verify-layer.__SCRIPT_EXT__`.
