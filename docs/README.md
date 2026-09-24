# Dokumentace generátoru

Tato složka dokumentuje **generátor** (`create-codebase-scaffold`). Není součástí
vygenerovaných projektů — ty mají vlastní `docs/`.

## Obsah

- [`install.md`](install.md) — požadavky, instalace generátoru a ověření, že běží.
- [`generator.md`](generator.md) — jak generátor funguje, CLI volby a tok generování.
- [`layers.md`](layers.md) — presety, archetypy vrstev a jejich guardrails.
- [`templates.md`](templates.md) — rozložení šablon, placeholdery, podmínky,
  jak přidat preset, archetyp, ekosystém nebo šablonu.
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
