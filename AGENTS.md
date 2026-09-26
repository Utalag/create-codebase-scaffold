# AGENTS.md — instrukce pro práci na generátoru

Tento repozitář je **generátor** scaffoldu (`create-codebase-scaffold`), ne
scaffold samotný. Nezakládej v něm vrstvy ani negeneruj strukturu projektu.

## Orientace

| Cesta | Význam |
| --- | --- |
| `bin/create.js` | CLI vstup, tenký wrapper nad `lib/cli.js` |
| `lib/` | logika generátoru (`cli.js`, `generator.js`, `presets.js`, `render.js`, `naming.js`, `fs-utils.js`, `prompts.js`) |
| `templates/` | **šablony vygenerovaného projektu** — tady se píše jeho obsah |
| `templates/i18n/en/` | anglický overlay šablon (stejné relativní cesty jako `templates/`); chybějící soubor se bere ze základu (cs) |
| `templates/locales/{cs,en}.json` | texty skriptů vygenerovaného projektu pro runtime i18n |
| `templates/tooling/node/` | skripty projektu ve variantě Node (`.mjs` + `lib/*.mjs`) |
| `templates/tooling/pwsh/` | skripty projektu ve variantě PowerShell (`.ps1` + `lib/*.ps1`) |
| `test/` | testy generátoru (`npm test`) |
| `examples/` | referenční vygenerované projekty (`examples/generate.mjs`) |
| `tools/check-package.mjs` | ověří, že tarball balíčku nevynechává žádnou šablonu |
| `docs/` | dokumentace generátoru |
| `.cursor/` | agentní konfigurace pro vývoj generátoru |

V tomto repu **není** `src/` s vrstvami. Vrstvy existují jen jako šablony
v `templates/layer/` a jako data v `lib/presets.js`. Tento soubor popisuje
**generátor**, ne vygenerovaný scaffold.

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
- Udržuj oba jazyky scaffoldu (`--lang cs|en`). Texty šablon drž v obou
 variantách (`templates/` + `templates/i18n/en/`), texty skriptů v
 `templates/locales/{cs,en}.json` a dynamické texty v `lib/presets.js`/`lib/render.js`.
- Nová funkce bez testu se nepovažuje za hotovou.

## Než začneš

Přečti si `docs/generator.md`, `docs/templates.md` a `docs/agent-config.md`.

## Vygenerované skripty projektu

`templates/tooling/{node,pwsh}/` obsahuje skripty, které dostane každý
vygenerovaný projekt: `new-layer`, `rename-layer`, `delete-layer`,
`verify-layer`, `test-layer` a `sync-agent-config` (jen `full`) plus sdílenou
logiku v `lib/`. `delete-layer` je soft retire (`_retired-`), `rename-layer`
mění mapu atomicky; oba u `full` končí syncem. Všechny změny struktury musí
skončit stejnou sync smyčkou.

## Před dokončením práce

- `npm test` prochází.
- Vygenerovaný projekt projde `sync-agent-config --check` i `verify-layer`
 pro každou vrstvu, a to pro obě tooling varianty (`node` i `pwsh`), oba
 režimy (`full` i `lean`) i oba jazyky (`cs` i `en`). Rychlá kontrola: `node examples/generate.mjs --force --verify`.
- `new-layer`, `rename-layer` i `delete-layer` fungují shodně v `node` i `pwsh`
  (test `test/layer-lifecycle.test.js`; pwsh část se přeskočí, když `pwsh` není).
- Ve výstupu nezůstaly nerozřešené tokeny `__TOKEN__` (výjimkou je záměrně
  `scripts/layer-template/**`).
- Změna je popsaná v `docs/`, pokud mění chování generátoru.
