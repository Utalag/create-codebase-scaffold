# Skripty

PowerShell skripty pro správu vrstev v tomto projektu. Jsou jediný podporovaný
způsob, jak založit vrstvu — díky tomu má každá vrstva stejnou anatomii a stejný
směr závislostí.

Požadavky: PowerShell 7+ (`pwsh`). Windows PowerShell 5.1 také funguje.

## new-layer.ps1 — založení vrstvy

```powershell
pwsh -File scripts/new-layer.ps1 -Name Billing
```

- `-Name` je název vrstvy v PascalCase (`Billing`, `AntiFraud`).
- Vrstva vznikne v `src/<Name>/` s celou anatomií.
- Guardrails a směr závislostí se berou z archetypu vrstvy v
  `scripts/layer-presets.json`. Známý archetyp dostane konkrétní guardrails;
  neznámý dostane obecnou sadu s markery `DOPLŇ:`, které musíš nahradit.
- `-Force` přepíše existující soubory. Bez něj se existující soubory nikdy
  nemění — skript jen doplní, co chybí.

Skript nikdy needituje existující soubory projektu. Po spuštění doplň novou
vrstvu do `src/AGENTS.md` a `docs/layers.md` ručně; skript na to jen upozorní.

## verify-layer.ps1 — kontrola vrstvy

```powershell
pwsh -File scripts/verify-layer.ps1 -Layer Billing
```

Pouze čte. Ověří anatomii vrstvy, že `AGENTS.md` odkazuje na `src/AGENTS.md`,
má sekci `## Guardrails` a neobsahuje nevyplněné markery `DOPLŇ:`. Při problému
skončí nenulovým kódem. Když `.scaffold.json` říká `full`, ověří i `.cursor/`
a `.github/` vrstvy.

## test-layer.ps1 — testy vrstvy

```powershell
pwsh -File scripts/test-layer.ps1 -Layer Billing
```

Runner nezávislý na stacku. Vrstva si definuje vlastní vstupní bod
`src/<Layer>/tests/run.ps1`, který dostane `-Layer`. Pokud runner neexistuje,
vrstva se přeskočí s hlášením a kódem 0, aby CI nepadalo na vrstvách bez testů.

<!--#if full-->
## sync-agent-config.ps1 — zrcadlení agentní konfigurace

```powershell
pwsh -File scripts/sync-agent-config.ps1
pwsh -File scripts/sync-agent-config.ps1 -Check
```

Každá vrstva vlastní svou agentní konfiguraci v `src/<Layer>/.cursor/`. Tento
skript ji zrcadlí do root `.cursor/`:

| Zdroj | Cíl |
| --- | --- |
| `rules/*.mdc` | `.cursor/rules/generated/<slug>/*.mdc` |
| `agents/*.md` | `.cursor/agents/<slug>-*.md` |
| `skills/<x>/**` | `.cursor/skills/<slug>-<x>/**` |

`-Check` nic nezapisuje a skončí nenulovým kódem, když zrcadlo chybí, je
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
