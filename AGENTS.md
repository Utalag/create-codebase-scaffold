# AGENTS.md — instrukce pro práci na generátoru

Tento repozitář je **generátor** scaffoldu (`create-codebase-scaffold`), ne
scaffold samotný. Nezakládej v něm vrstvy ani negeneruj strukturu projektu.

## Orientace

| Cesta | Význam |
| --- | --- |
| `bin/create.js` | CLI vstup, tenký wrapper nad `lib/cli.js` |
| `lib/` | logika generátoru (CLI, presety, render, zápis) |
| `templates/` | **šablony vygenerovaného projektu** — tady se píše jeho obsah |
| `test/` | testy generátoru (`npm test`) |
| `examples/` | referenční vygenerované projekty |
| `docs/` | dokumentace generátoru |
| `.cursor/` | agentní konfigurace pro vývoj generátoru |

V tomto repu **není** `src/` s vrstvami. Vrstvy existují jen jako šablony
v `templates/layer/` a jako data v `lib/presets.js`.

## Pravidla

- Do `templates/` nepiš nic, co nepatří vygenerovanému projektu. Meta-informace
  o generátoru patří do `docs/`, ne do šablon.
- Obsah vygenerovaného projektu se mění pouze v `templates/` a v `lib/generator.js`.
- Zachovej nedestruktivní sémantiku: existující soubor se nikdy nepřepíše bez
  `--force`; `verify-layer` a `test-layer` nikdy nezapisují.
- Názvy vrstev jsou vždy PascalCase. Kebab-case slug se používá jen pro názvy
  artefaktů (`.cursor` soubory, CI joby).
- Udržuj obě tooling varianty (`templates/tooling/pwsh` a `templates/tooling/node`)
  funkčně shodné a obě dokumentované (EN i CZ).
- Udržuj shodné chování pro `machinery=full` i `lean`.
- Nová funkce bez testu se nepovažuje za hotovou.

## Než začneš

Přečti si `docs/generator.md`, `docs/templates.md` a `docs/agent-config.md`.

## Před dokončením práce

- `npm test` prochází.
- Vygenerovaný projekt projde `sync-agent-config --check` i `verify-layer`
  pro každou vrstvu, a to pro `pwsh` i `node`.
- Ve výstupu nezůstaly nerozřešené tokeny `__TOKEN__` (výjimkou je záměrně
  `scripts/layer-template/**`).
- Změna je popsaná v `docs/`, pokud mění chování generátoru.
