# AGENTS.md — vrstva infrastructure

Tento soubor je guardrail pro vrstvu `infrastructure`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/infrastructure/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

Implementace portů a veškerý přístup k vnějšímu světu: databáze, HTTP klienti, filesystem, fronty, cache, e-maily.

## Guardrails

- Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.
- Implementuje porty definované v `application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Chyby adaptérů překládá na explicitní chyby doménového typu.
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.
- Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).

## Směr závislostí

Smí záviset na `application`, `domain` a `shared`. Nikdy nesmí záviset na `presentation`.

## Struktura vrstvy

```text
src/infrastructure/
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
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer infrastructure`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
