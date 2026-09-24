# Vrstva Presentation (`src/presentation`)

## Účel

Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti zpráv. Překládá vnější vstup na volání use-case.

## Role v architektuře

Smí záviset na `application` a `shared`. Nikdy nesmí záviset na `infrastructure` ani na `domain` přímo.

## Guardrails

Viz [`AGENTS.md`](AGENTS.md). Souhrn:

- Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.
- Neobsahuje business logiku ani přímý přístup k datům.
- Volá výhradně use-casy z `application`.
- Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.
- Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.

## Jak pracovat s vrstvou

- Pravidla a guardrails: [`AGENTS.md`](AGENTS.md)
- Zdroj pravdy agentní konfigurace: [`.cursor/`](.cursor/)
- Produkční kód: [`src/`](src/)
- Testy: `pwsh -File scripts/test-layer.ps1 -Layer presentation`
- Rozhodnutí a ADR: [`docs/`](docs/)

## Související pravidla

- Globální pravidla repozitáře: `AGENTS.md` (root)
- Společná pravidla všech vrstev: `src/AGENTS.md`
