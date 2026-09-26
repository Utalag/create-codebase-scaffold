# Dokumentace generátoru

Tato složka dokumentuje **generátor** (`create-codebase-scaffold`). Není součástí
vygenerovaných projektů — ty mají vlastní `docs/`.

Rovněž root [`AGENTS.md`](../AGENTS.md) popisuje **vývoj generátoru**, ne obsah
vygenerovaného scaffoldu. Instrukce pro agenty pracující ve vygenerovaném
projektu jsou v `templates/project/AGENTS.md` a `templates/layer/AGENTS.md`,
které se do projektu teprve zapíšou.

## Obsah

- [`install.md`](install.md) — požadavky, instalace generátoru a ověření, že běží.
- [`generator.md`](generator.md) — jak generátor funguje, CLI volby a tok generování.
- [`layers.md`](layers.md) — presety, archetypy vrstev a jejich guardrails.
- [`templates.md`](templates.md) — rozložení šablon, jazykový overlay `i18n/en/`,
  placeholdery, podmínky, jak přidat preset, archetyp, ekosystém nebo šablonu.
- [`agent-config.md`](agent-config.md) — návrh agentní konfigurace ve vygenerovaném
  projektu a rozdíl mezi `full` a `lean`.

## Kam co patří

| Typ dokumentu | Umístění |
| --- | --- |
| Návod pro agenty vyvíjející generátor | `AGENTS.md` (root) |
| Dokumentace generátoru | `docs/` |
| Šablony vygenerovaného projektu | `templates/` |
| Instrukce pro agenty vygenerovaného projektu | `templates/project/AGENTS.md` a spol. |
| Testy generátoru | `test/` |
