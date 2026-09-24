# AGENTS.md — vrstva shared

Tento soubor je guardrail pro vrstvu `shared`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/shared/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

Průřezové primitivy bez závislostí: výsledkové typy, chybová hierarchie, hodnotové utility, společné typy.

## Guardrails

- Nesmí záviset na žádné jiné vrstvě.
- Nesmí obsahovat business logiku konkrétní domény.
- Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.
- Bez stavu, bez I/O, bez konfigurace.
- Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.

## Směr závislostí

Nesmí záviset na žádné jiné vrstvě.

## Struktura vrstvy

```text
src/shared/
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
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer shared`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
