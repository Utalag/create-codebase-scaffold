---
name: domain-workflow
description: "[domain] Pracovní postup pro vrstvu Domain. Použij při implementaci, testování nebo kontrole změn v src/domain/."
disable-model-invocation: true
---

# Pracovní postup vrstvy Domain

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/domain/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

Čistá business logika. Entita, value object, doménová služba a invarianty. Vrstva neví nic o tom, jak je aplikace spuštěna ani odkud přicházejí data.

## Guardrails

- Žádné I/O: nesmí sahat na databázi, síť, filesystem, systémový čas ani náhodu.
- Žádné frameworky, anotace ani serializace závislé na infrastruktuře.
- Veškerá logika je deterministická a testovatelná bez mocků a bez běžícího prostředí.
- Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry, nikdy jako volání uvnitř.
- Entita chrání své invarianty: neplatný stav nesmí být možné vytvořit.
- Doménové chyby jsou explicitní typy, ne obecné výjimky ani návratové kódy.

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer domain`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
