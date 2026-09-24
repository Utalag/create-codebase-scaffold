# Vrstva Infrastructure (`src/infrastructure`)

## Účel

Implementace portů a veškerý přístup k vnějšímu světu: databáze, HTTP klienti, filesystem, fronty, cache, e-maily.

## Role v architektuře

Smí záviset na `application`, `domain` a `shared`. Nikdy nesmí záviset na `presentation`.

## Guardrails

Viz [`AGENTS.md`](AGENTS.md). Souhrn:

- Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.
- Implementuje porty definované v `application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Chyby adaptérů překládá na explicitní chyby doménového typu.
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.
- Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).

## Jak pracovat s vrstvou

- Pravidla a guardrails: [`AGENTS.md`](AGENTS.md)
- Zdroj pravdy agentní konfigurace: [`.cursor/`](.cursor/)
- Produkční kód: [`src/`](src/)
- Testy: `pwsh -File scripts/test-layer.ps1 -Layer infrastructure`
- Rozhodnutí a ADR: [`docs/`](docs/)

## Související pravidla

- Globální pravidla repozitáře: `AGENTS.md` (root)
- Společná pravidla všech vrstev: `src/AGENTS.md`
