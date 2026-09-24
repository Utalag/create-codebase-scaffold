---
name: __LAYER_SLUG__-workflow
description: Pracovní postup pro vrstvu __LAYER_TITLE__. Použij při implementaci, testování nebo kontrole změn v src/__LAYER__/.
---

# Pracovní postup vrstvy __LAYER_TITLE__

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/__LAYER__/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `__TEST_CMD__`.
5. Ověř strukturu vrstvy: `__VERIFY_CMD__`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
<!--#if full-->
7. Při změně `.cursor/` spusť `__SYNC_CMD__`.
<!--#endif-->
