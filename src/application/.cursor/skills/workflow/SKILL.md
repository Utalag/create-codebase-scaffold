---
name: application-workflow
description: Pracovní postup pro vrstvu Application. Použij při implementaci, testování nebo kontrole změn v src/application/.
---

# Pracovní postup vrstvy Application

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/application/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět a řídí tok mezi doménou a adaptéry.

## Guardrails

- Neobsahuje business pravidla — ta patří do `domain`.
- Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.
- Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.
- Transakční hranice, idempotence a řazení kroků patří sem.
- Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.
- Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer application`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
