# Vrstva Application (`src/application`)

## Účel

Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět a řídí tok mezi doménou a adaptéry.

## Role v architektuře

Smí záviset na `domain` a `shared`. Nesmí záviset na `infrastructure` ani `presentation`.

## Guardrails

Viz [`AGENTS.md`](AGENTS.md). Souhrn:

- Neobsahuje business pravidla — ta patří do `domain`.
- Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.
- Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.
- Transakční hranice, idempotence a řazení kroků patří sem.
- Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.
- Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.

## Jak pracovat s vrstvou

- Pravidla a guardrails: [`AGENTS.md`](AGENTS.md)
- Zdroj pravdy agentní konfigurace: [`.cursor/`](.cursor/)
- Produkční kód: [`src/`](src/)
- Testy: `pwsh -File scripts/test-layer.ps1 -Layer application`
- Rozhodnutí a ADR: [`docs/`](docs/)

## Související pravidla

- Globální pravidla repozitáře: `AGENTS.md` (root)
- Společná pravidla všech vrstev: `src/AGENTS.md`
