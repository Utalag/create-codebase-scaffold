# AGENTS.md — vrstva presentation

Tento soubor je guardrail pro vrstvu `presentation`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/presentation/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti zpráv. Překládá vnější vstup na volání use-case.

## Guardrails

- Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.
- Neobsahuje business logiku ani přímý přístup k datům.
- Volá výhradně use-casy z `application`.
- Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.
- Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.

## Směr závislostí

Smí záviset na `application` a `shared`. Nikdy nesmí záviset na `infrastructure` ani na `domain` přímo.

## Struktura vrstvy

```text
src/presentation/
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
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer presentation`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
