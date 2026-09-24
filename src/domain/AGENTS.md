# AGENTS.md — vrstva domain

Tento soubor je guardrail pro vrstvu `domain`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/domain/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

Čistá business logika. Entita, value object, doménová služba a invarianty. Vrstva neví nic o tom, jak je aplikace spuštěna ani odkud přicházejí data.

## Guardrails

- Žádné I/O: nesmí sahat na databázi, síť, filesystem, systémový čas ani náhodu.
- Žádné frameworky, anotace ani serializace závislé na infrastruktuře.
- Veškerá logika je deterministická a testovatelná bez mocků a bez běžícího prostředí.
- Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry, nikdy jako volání uvnitř.
- Entita chrání své invarianty: neplatný stav nesmí být možné vytvořit.
- Doménové chyby jsou explicitní typy, ne obecné výjimky ani návratové kódy.

## Směr závislostí

Smí záviset pouze na `shared`. Nikdy nesmí importovat `application`, `infrastructure` ani `presentation`.

## Struktura vrstvy

```text
src/domain/
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
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer domain`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
