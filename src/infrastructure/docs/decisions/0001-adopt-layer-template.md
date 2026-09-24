# 0001 — Přijetí jednotné šablony vrstvy

- Status: accepted
- Datum: DOPLŇ (YYYY-MM-DD)

## Kontext

Vrstva `infrastructure` byla založena z jednotné šablony repozitáře, aby všechny vrstvy
měly stejnou anatomii: guardrails pro agenty, testy, dokumentaci a zdroj agentní
konfigurace. Bez toho se vrstvy rozcházejí a agenti ztrácejí kontext.

## Rozhodnutí

Vrstva používá tuto strukturu:

- `AGENTS.md` — guardrails vrstvy s odkazy na rodičovské instrukce
- `.cursor/` — zdroj pravdy agentní konfigurace vrstvy
- `.github/` — composite action a definice pipeline vrstvy
- `src/` — produkční kód vrstvy
- `tests/` — `unit/` a `integration/`
- `docs/` — dokumentace a ADR

## Důsledky

- Pozitivní: konzistence napříč vrstvami, snadná orientace agentů, vlastnictví
  konfigurace vrstvou.
- Pozitivní: vrstvu lze otevřít jako samostatný workspace a konfigurace funguje.
- Negativní: zdroj v `.cursor/` musí být synchronizován do root `.cursor/`
  skriptem `scripts/sync-agent-config.ps1`.
- Negativní: přidání vrstvy znamená nový záznam v CI matici.

## Alternativy

- Ruční kopírování složek — zamítnuto, vede k rozpadu konvence.
- Veškerá konfigurace pouze v root `.cursor/` bez zdrojů ve vrstvách — zamítnuto,
  ztrácí se vlastnictví vrstvy a nefunguje při otevření vrstvy samostatně.
