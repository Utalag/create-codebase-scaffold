# Agentní konfigurace ve vygenerovaném projektu

Tento dokument vysvětluje, proč je agentní konfigurace v projektu uspořádaná
takto, a jaký je rozdíl mezi `--machinery full` a `--machinery lean`.

## Proč vůbec dva režimy

Cursor načítá vnořené `.cursor/rules` v podsložkách nespolehlivě. Spolehlivě
funguje, jen když je vrstva otevřena jako samostatný workspace. Proto má smysl
držet konfiguraci jednak u vrstvy (aby fungovala samostatně) a jednak v rootu
(aby fungovala při otevření celého repozitáře).

Některé projekty ale vrstvy samostatně neotvírají a zrcadlo nepotřebují. Pro ně
je tu `lean`.

## `full` — vlastnictví vrstvou, aktivace v rootu

Každá vrstva vlastní svou konfiguraci v `src/<Layer>/.cursor/`. To je **zdroj
pravdy**. Root `.cursor/` je **generované zrcadlo**:

| Zdroj | Cíl |
| --- | --- |
| `rules/*.mdc` | `.cursor/rules/generated/<slug>/*.mdc` (globs zúžen na `src/<Layer>/**`) |
| `agents/*.md` | `.cursor/agents/<slug>-*.md` |
| `skills/<x>/**` | `.cursor/skills/<slug>-<x>/**` |
| — | `.cursor/.generated-manifest.json` (evidence generovaných souborů) |

Konfigurace tak funguje ve dvou režimech:

| Režim otevření | Aktivní konfigurace |
| --- | --- |
| Celý repozitář | root `.cursor/` (generované zrcadlo) |
| Samotná vrstva | `src/<Layer>/.cursor/` (globs `**/*`) |

Root `.cursor/` se udržuje v souladu skriptem `sync-agent-config` a hookem
`afterFileEdit`, který sync spustí po editaci zdroje. Hook je fail-open.

Ruční soubory v root `.cursor/` (`rules/00-project.mdc`, `agents/architect.md`,
`skills/layer-management/`) **nejsou** součástí zrcadla a sync je nikdy
nemaže — orphan cleanup se řídí manifestem, ne obsahem složky.

## `lean` — jen root

Vrstvy nemají vlastní `.cursor/`. Generátor zapíše konfiguraci přímo do root
`.cursor/`:

- `.cursor/rules/00-project.mdc` — globální pravidla projektu,
- `.cursor/rules/<slug>.mdc` pro každou vrstvu (globs `src/<Layer>/**`),
- `.cursor/agents/<slug>-dev.md` pro každou vrstvu,
- `.cursor/agents/architect.md` a `.cursor/skills/layer-management/`.

Nevzniká žádné zrcadlo, žádný sync skript, žádný manifest a žádné hooky.
Přidání nové vrstvy v `lean` režimu proto rovnou zapisuje i její root pravidlo
a subagenta (viz `__root__/` v `scripts/layer-template/`).

## Co je společné

- Instrukce se dědí třemi úrovněmi: `AGENTS.md` (root) -> `src/AGENTS.md` ->
  `src/<Layer>/AGENTS.md`. Každá úroveň na rodiče explicitně odkazuje, aby to
  fungovalo i pro nástroje, které vnořené instrukce neslévají.
- `AGENTS.md` je zároveň instrukční formát pro Codex; proto se generuje vždy,
  bez ohledu na `--agents`.
- Skill `layer-management` učí agenta zakládat a kontrolovat vrstvy výhradně
  přes skript a nikdy nepřepisovat ruční úpravy.

## Nedestruktivnost

- Sync zapisuje jen do root `.cursor/` a jen u souborů vedených v manifestu.
- `verify-layer` a `test-layer` nikdy nezapisují.
- `new-layer` nikdy nepřepíše existující soubor; existující soubory projektu
  (`src/AGENTS.md`, `docs/layers.md`) needituje a jen upozorní, co doplnit ručně.
  U `machinery=full` po založení vrstvy sám spustí `sync-agent-config`.
- `rename-layer` mění mapu atomicky (složka, `.scaffold.json`, odkazy, zrcadla)
  a u `full` končí stejným syncem. `delete-layer` je **soft retire** — přesune
  vrstvu na `src/_retired-<Layer>/` a vyřadí ji z mapy; obsah složky zůstává.
- Sync i `verify-layer` ignorují složky s prefixem `_retired-`/`_*`, takže
  vyřazená vrstva se nikdy neobjeví v root `.cursor/` ani v CI matici.
- Aktivní vrstvy se poznají podle PascalCase názvu složky v `src/`; skript
  `delete-layer` je nedestruktivní defaultně (`--dry-run`) a ostrý běh chce
  potvrzení (`--yes`/`-Yes`).
