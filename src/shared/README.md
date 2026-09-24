# Vrstva Shared (`src/shared`)

## Účel

Průřezové primitivy bez závislostí: výsledkové typy, chybová hierarchie, hodnotové utility, společné typy.

## Role v architektuře

Nesmí záviset na žádné jiné vrstvě.

## Guardrails

Viz [`AGENTS.md`](AGENTS.md). Souhrn:

- Nesmí záviset na žádné jiné vrstvě.
- Nesmí obsahovat business logiku konkrétní domény.
- Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.
- Bez stavu, bez I/O, bez konfigurace.
- Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.

## Jak pracovat s vrstvou

- Pravidla a guardrails: [`AGENTS.md`](AGENTS.md)
- Zdroj pravdy agentní konfigurace: [`.cursor/`](.cursor/)
- Produkční kód: [`src/`](src/)
- Testy: `pwsh -File scripts/test-layer.ps1 -Layer shared`
- Rozhodnutí a ADR: [`docs/`](docs/)

## Související pravidla

- Globální pravidla repozitáře: `AGENTS.md` (root)
- Společná pravidla všech vrstev: `src/AGENTS.md`
