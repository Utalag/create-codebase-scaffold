# AGENTS.md — vrstva __LAYER__

Tento soubor je guardrail pro vrstvu `__LAYER__`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla projektu
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
  src/             # produkční kód vrstvy
  tests/           # unit/ a integration/
  docs/            # dokumentace a decisions/ (ADR)
<!--#if full-->
  .cursor/         # ZDROJ PRAVDY agentní konfigurace vrstvy
  .github/         # composite action a definice pipeline vrstvy
<!--#endif-->
```
<!--#if full-->

## Agentní konfigurace vrstvy

- Zdroj pravdy je `.cursor/` v této vrstvě. Root `.cursor/` je generované zrcadlo.
- Po každé změně `.cursor/` spusť: `__SYNC_CMD__`
- Nikdy needituj `.cursor/rules/generated/**` — je přepsáno syncem.
<!--#endif-->

## Před dokončením práce

- [ ] Změna dodržuje směr závislostí.
- [ ] Struktura vrstvy je v pořádku: `__VERIFY_CMD__`
- [ ] Testy procházejí: `__TEST_CMD__`
<!--#if full-->
- [ ] Agentní konfigurace je synchronizovaná: `__SYNC_CHECK_CMD__`
<!--#endif-->
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
