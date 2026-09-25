# Skripty

Node.js skripty pro správu vrstev v tomto projektu. Jsou jediný podporovaný
způsob, jak vrstvu založit, přejmenovat a vyřadit — díky tomu má každá vrstva
stejnou anatomii a stejný směr závislostí. Bez závislostí a bez buildu.

Požadavky: Node.js 18+.

## new-layer.mjs — založení vrstvy

```bash
node scripts/new-layer.mjs --name Billing
```

- `--name` je název vrstvy v PascalCase (`Billing`, `AntiFraud`).
- Vrstva vznikne v `src/<Name>/` s celou anatomií.
- Guardrails a směr závislostí se berou z archetypu vrstvy v
  `scripts/layer-presets.json`. Známý archetyp dostane konkrétní guardrails;
  neznámý dostane obecnou sadu s markery `DOPLŇ:`, které musíš nahradit.
- Vrstva se doplní do mapy vrstev v `.scaffold.json`.
- `--force` přepíše existující soubory. Bez něj se existující soubory nikdy
  nemění — skript jen doplní, co chybí.

Skript nikdy needituje existující soubory projektu. Po spuštění doplň novou
vrstvu do `src/AGENTS.md` a `docs/layers.md` ručně; skript na to jen upozorní.
<!--#if full-->
U plné konfigurace navíc sám spustí `sync-agent-config.mjs`, takže root
`.cursor/` je hned v souladu a `--check` projde bez ručního mezikroku.
<!--#endif-->

## rename-layer.mjs — přejmenování vrstvy

```bash
node scripts/rename-layer.mjs --name Billing --to Invoicing           # dry-run
node scripts/rename-layer.mjs --name Billing --to Invoicing --yes     # provedení
```

Atomicky přejmenuje `src/<Stara>` na `src/<Nova>` a přepíše všechny odkazy:
mapu v `.scaffold.json`, instrukce, dokumentaci i vlastní soubory vrstvy
(PascalCase název, kebab-case slug i titulek). Nejde o delete + create, obsah
vrstvy zůstává.
<!--#if full-->
Následně spustí sync (stejná smyčka jako u `new-layer`), takže root `.cursor/`
zrcadlo používá nový slug.
<!--#endif-->
Bez `--yes` (nebo s `--dry-run`) jen vypíše plán a nic nezmění.

## delete-layer.mjs — soft retire vrstvy

```bash
node scripts/delete-layer.mjs --name Billing          # dry-run
node scripts/delete-layer.mjs --name Billing --yes    # provedení
```

Vyřadí vrstvu **bez smazání obsahu**:

- přejmenuje `src/<Layer>` na `src/_retired-<Layer>` a zapíše `RETIRED.md`,
- odebere vrstvu z `.scaffold.json` a z odkazů v instrukcích a dokumentaci,
- odstraní její agentní artefakty z root `.cursor/`,
<!--#if full-->
- spustí sync (stejná smyčka jako u `new-layer`),
<!--#endif-->
- udrží vyřazenou složku mimo živou mapu: `sync`, `verify-layer` i CI složky
  `_retired-*` ignorují.

Hard delete — skutečné smazání složky — je na uživateli; skript ho nikdy
neprovede. Bez `--yes` (nebo s `--dry-run`) jen vypíše plán.

## verify-layer.mjs — kontrola vrstvy

```bash
node scripts/verify-layer.mjs --layer Billing
```

Pouze čte. Ověří anatomii vrstvy, že `AGENTS.md` odkazuje na `src/AGENTS.md`,
má sekci `## Guardrails` a neobsahuje nevyplněné markery `DOPLŇ:`. Při problému
skončí nenulovým kódem. Když `.scaffold.json` říká `full`, ověří i `.cursor/`
a `.github/` vrstvy. Vyřazené vrstvy (`_retired-*`) se nikdy neberou jako aktivní.

## test-layer.mjs — testy vrstvy

```bash
node scripts/test-layer.mjs --layer Billing
```

Runner nezávislý na stacku. Vrstva si definuje vlastní vstupní bod
`src/<Layer>/tests/run.mjs`, který dostane `--layer`. Pokud runner neexistuje,
vrstva se přeskočí s hlášením a kódem 0, aby CI nepadalo na vrstvách bez testů.

<!--#if full-->
## sync-agent-config.mjs — zrcadlení agentní konfigurace

```bash
node scripts/sync-agent-config.mjs
node scripts/sync-agent-config.mjs --check
```

Každá vrstva vlastní svou agentní konfiguraci v `src/<Layer>/.cursor/`. Tento
skript ji zrcadlí do root `.cursor/`:

| Zdroj | Cíl |
| --- | --- |
| `rules/*.mdc` | `.cursor/rules/generated/<slug>/*.mdc` |
| `agents/*.md` | `.cursor/agents/<slug>-*.md` |
| `skills/<x>/**` | `.cursor/skills/<slug>-<x>/**` |

`--check` nic nezapisuje a skončí nenulovým kódem, když zrcadlo chybí, je
zastaralé nebo obsahuje osiřelé soubory. Používej před commitem a v CI.

Skript zapisuje pouze do root `.cursor/`, a to jen u souborů vedených v
`.cursor/.generated-manifest.json`. Zdroje v `src/<Layer>/.cursor/` nikdy nemění.
<!--#endif-->

## Konvence

<!--#if full-->
- Nikdy needituj `.cursor/rules/generated/**` — je generováno.
- Po změně `src/<Layer>/.cursor/` spusť sync.
<!--#endif-->
- Názvy vrstev jsou PascalCase; názvy artefaktů používají kebab-case slug
  (`AntiFraud` -> `anti-fraud`).
- Vyřazené vrstvy žijí v `src/_retired-*` a sync, verify ani CI je neberou.
