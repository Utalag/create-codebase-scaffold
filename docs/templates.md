# Šablony

Šablony jsou v `templates/` a jsou to obyčejné textové soubory s placeholdery
a podmínkami. Generátor je čte, vyhodnotí a zapíše do cílové složky.

## Rozložení

```text
templates/
  project/                     # soubory do kořene vygenerovaného projektu
    AGENTS.md
    README.md
    .editorconfig
    gitignore                  # zapisuje se jako .gitignore — viz "Názvy šablon"
    src/AGENTS.md
    docs/README.md
    docs/layers.md
    docs/agent-config.md       # jen pro --machinery full
    .github/workflows/ci.yml   # jen když je CI zapnuté
  layer/                       # anatomie jedné vrstvy
    AGENTS.md
    README.md
    docs/README.md
    docs/decisions/0001-record-architecture-decisions.md
    .cursor/…                  # jen pro --machinery full
    .github/…                  # jen pro --machinery full
  ecosystems/
    cursor/rules/00-project.mdc
    cursor/rules/layer.mdc     # jen pro --machinery lean
    cursor/agents/architect.md
    copilot/copilot-instructions.md
    claude/CLAUDE.md
  skills/layer-management/SKILL.md
  tooling/pwsh/*.ps1 + lib/*.ps1 + README.md + README.cs.md
  tooling/node/*.mjs + lib/*.mjs + README.md + README.cs.md
  hooks/hooks.json + sync-on-edit.ps1 + sync-on-edit.mjs
```

## Názvy šablon

Název šablony se obvykle rovná názvu cílového souboru. Výjimkou je
**`.gitignore`**: npm při balení soubory `.gitignore` vynechává, takže šablona
je uložená jako `templates/project/gitignore` a generátor ji zapíše pod správným
jménem. Mapování drží `TEMPLATE_ALIASES` v `lib/generator.js`.

Balíček proto kontroluje `tools/check-package.mjs`, který porovná obsah tarballu
se stromem `templates/` a odhalí jakoukoli další tiše vynechanou cestu.

## Placeholdery

Placeholder má tvar `__TOKEN__`. Neznámé tokeny zůstanou v textu beze změny
(`lib/render.js`), takže se dají dohledat.

Skupiny tokenů:

| Skupina | Tokeny |
| --- | --- |
| Projekt | `PROJECT_NAME`, `YEAR`, `PROJECT_TREE`, `SCRIPT_EXT` |
| Architektura | `ARCH_LABEL`, `ARCH_DESCRIPTION`, `LAYER_LIST`, `LAYER_TABLE`, `LAYER_ROLES`, `DEPENDENCY_MERMAID`, `DEPENDENCY_RULES` |
| Příkazy | `NEW_LAYER_CMD`, `VERIFY_CMD`, `TEST_CMD`, `SYNC_CMD`, `SYNC_CHECK_CMD` |
| Vrstva | `LAYER`, `LAYER_SLUG`, `LAYER_TITLE`, `RESPONSIBILITY`, `GUARDRAILS`, `DEPENDS_ON` |
| Ostatní | `HOOK_COMMAND`, `EXAMPLE_LAYER_1`, `EXAMPLE_LAYER_2` |

Příkazy obsahují zástupný symbol `<Layer>`. V šabloně vrstvy pro `new-layer` se
nechává nedoplněný a skript ho nahradí až za konkrétní vrstvu.

## Podmínky

Bloky se vyhodnocují v `applyConditionals` (`lib/render.js`):

```text
<!--#if full-->
...jen pro plnou konfiguraci...
<!--#endif-->

<!--#if !full-->
...jen pro odlehčenou konfiguraci...
<!--#endif-->
```

Dostupné přepínače: `full`, `tooling_pwsh`, `tooling_node`, `cursor`, `copilot`,
`codex`, `claude`, `ci`.

Direktivy musí stát na vlastním řádku a bloky se smějí vnořovat — vnořený blok
se vyhodnotí jen tehdy, když platí i bloky nad ním. Nevyvážené direktivy
ukončí generování chybou s cestou k šabloně, aby v šabloně nezůstal tichý
pozůstatek.

## Šablona vrstvy pro `new-layer`

Generátor nezapisuje šablonu vrstvy jen do vygenerovaného projektu napevno.
Kopíruje ji také do `scripts/layer-template/` daného projektu, aby skript
`new-layer` uměl zakládat další vrstvy i později:

- podmínky se vyhodnotí už při generování (projekt má pevné `machinery`),
- příkazy (`TEST_CMD`, `SYNC_CMD`, …) se předvyplní,
- tokeny `LAYER*`, `RESPONSIBILITY`, `GUARDRAILS`, `DEPENDS_ON`, `YEAR` zůstanou
  a doplní je až `new-layer`,
- soubory určené do kořene projektu (u `lean` root `.cursor/`) mají v cestě
  prefix `__root__/`.

Guardrails a směr závislostí bere `new-layer` z `scripts/layer-presets.json`,
který generátor vytváří z `lib/presets.js`. Po založení vrstvu zaregistruje do
`.scaffold.json` a u `machinery=full` sám spustí `sync-agent-config`, aby
zrcadlo v root `.cursor/` nezůstalo rozbité (viz `docs/generator.md`).

## Jak přidat preset nebo archetyp

1. Archetyp přidej do `ARCHETYPES` v `lib/presets.js` (odpovědnost, guardrails,
   `canonicalDeps`).
2. Preset přidej do `PRESETS` ve stejném souboru (vrstvy + explicitní
   `dependencies`).
3. Spusť `npm test` — testy ověří, že každý preset vygeneruje projekt, který
   projde `verify-layer`, a že v souborech nezůstaly nerozřešené tokeny.

## Jak přidat ekosystém

1. Přidej šablonu do `templates/ecosystems/<nazev>/`.
2. Doplň název do `ECOSYSTEMS` v `lib/cli.js` a obsluhu v `generateProject`
   (`lib/generator.js`).
3. Přidej přepínač do `flags` v `lib/generator.js`, aby šel použít v podmínkách.
4. Doplň test a tuto dokumentaci.

## Jak přidat šablonu

1. Vytvoř soubor v `templates/` na správném místě.
2. Pokud se má generovat jen v některé konfiguraci, obal obsah podmínkou
   `<!--#if …-->` / `<!--#endif-->`, nebo soubor zařaď do seznamu v
   `lib/generator.js`.
3. Ověř `npm test` — testy kontrolují, že ve výstupu nezůstaly nerozřešené tokeny.
