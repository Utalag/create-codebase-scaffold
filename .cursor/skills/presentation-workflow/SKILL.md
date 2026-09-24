---
name: presentation-workflow
description: "[presentation] Pracovní postup pro vrstvu Presentation. Použij při implementaci, testování nebo kontrole změn v src/presentation/."
disable-model-invocation: true
---

# Pracovní postup vrstvy Presentation

## Než začneš

Přečti instrukce všech tří úrovní: `AGENTS.md` (root), `src/AGENTS.md`
a `src/presentation/AGENTS.md`. Konkrétnější instrukce má přednost.

## Odpovědnost vrstvy

Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti zpráv. Překládá vnější vstup na volání use-case.

## Guardrails

- Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.
- Neobsahuje business logiku ani přímý přístup k datům.
- Volá výhradně use-casy z `application`.
- Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.
- Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.

## Postup

1. Ověř, že požadavek patří do této vrstvy.
2. Proveď nejmenší možnou změnu v `src/`.
3. Přidej nebo uprav testy v `tests/unit/` nebo `tests/integration/`.
4. Spusť `pwsh -File scripts/test-layer.ps1 -Layer presentation`.
5. Při změně `.cursor/` spusť `pwsh -File scripts/sync-agent-config.ps1`.
6. Netriviální rozhodnutí zapiš jako ADR do `docs/decisions/`.
