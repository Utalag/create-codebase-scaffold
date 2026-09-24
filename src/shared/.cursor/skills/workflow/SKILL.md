---
name: shared-workflow
description: Pracovní postup pro vrstvu Shared. Použij při implementaci, testování nebo kontrole změn v src/shared/.
---

# Pracovní postup vrstvy Shared

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/shared/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

Průřezové primitivy bez závislostí: výsledkové typy, chybová hierarchie, hodnotové utility, společné typy.

## Guardrails

- Nesmí záviset na žádné jiné vrstvě.
- Nesmí obsahovat business logiku konkrétní domény.
- Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.
- Bez stavu, bez I/O, bez konfigurace.
- Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer shared`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
