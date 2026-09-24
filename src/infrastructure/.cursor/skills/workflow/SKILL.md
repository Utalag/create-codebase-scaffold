---
name: infrastructure-workflow
description: Pracovní postup pro vrstvu Infrastructure. Použij při implementaci, testování nebo kontrole změn v src/infrastructure/.
---

# Pracovní postup vrstvy Infrastructure

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/infrastructure/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

Implementace portů a veškerý přístup k vnějšímu světu: databáze, HTTP klienti, filesystem, fronty, cache, e-maily.

## Guardrails

- Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.
- Implementuje porty definované v `application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Chyby adaptérů překládá na explicitní chyby doménového typu.
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.
- Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer infrastructure`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
