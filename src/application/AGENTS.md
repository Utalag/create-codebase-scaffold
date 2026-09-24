# AGENTS.md — vrstva application

Tento soubor je guardrail pro vrstvu `application`. Doplňuje rodičovské instrukce,
proto vždy čti všechny tři úrovně:

- `AGENTS.md` (root) — globální pravidla repozitáře
- `src/AGENTS.md` — společná pravidla všech vrstev
- `src/application/AGENTS.md` — tento soubor

Konkrétnější instrukce má přednost. Pokud je tento soubor v rozporu s globálními
pravidly v rootu, zastav práci a vyžádej rozhodnutí uživatele.

## Odpovědnost vrstvy

Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět a řídí tok mezi doménou a adaptéry.

## Guardrails

- Neobsahuje business pravidla — ta patří do `domain`.
- Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.
- Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.
- Transakční hranice, idempotence a řazení kroků patří sem.
- Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.
- Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.

## Směr závislostí

Smí záviset na `domain` a `shared`. Nesmí záviset na `infrastructure` ani `presentation`.

## Struktura vrstvy

```text
src/application/
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
- [ ] Testy procházejí: `pwsh -File scripts/test-layer.ps1 -Layer application`
- [ ] Agentní konfigurace je synchronizovaná: `pwsh -File scripts/sync-agent-config.ps1 -Check`
- [ ] Netriviální rozhodnutí zapsáno jako ADR v `docs/decisions/`.
