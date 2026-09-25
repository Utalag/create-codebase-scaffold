# Vzorky vygenerovaných projektů

Vzorky jsou **generované artefakty**, ne ručně psaný kód. Needituj je — po změně
šablon je přegeneruj:

```bash
node examples/generate.mjs            # doplní, co chybí (nedestruktivně)
node examples/generate.mjs --force    # přegeneruje vše
node examples/generate.mjs --verify   # navíc spustí kontroly u node vzorků
```

Vygenerované vzorky jsou v `.gitignore`, takže se necommitují. Repozitář drží
jen tento skript a jeho dokumentaci, aby vzorky nemohly zastarat.

## Co se generuje

| Vzorek | Preset | Tooling | Machinery | Agenti | CI |
| --- | --- | --- | --- | --- | --- |
| `clean-pwsh-full` | clean | pwsh | full | cursor, copilot, claude, codex | ano |
| `hexagonal-node-full` | hexagonal | node | full | cursor, claude | ano |
| `layered-pwsh-lean` | layered | pwsh | lean | cursor, copilot | ano |
| `vertical-slice-node-lean` | vertical-slice | node | lean | cursor | ne |
| `custom-four-layers` | custom | node | full | cursor, codex | ano |

## Co si ve vzorcích prohlédnout

- `AGENTS.md`, `src/AGENTS.md` a `src/<Layer>/AGENTS.md` — řetěz instrukcí.
- `docs/layers.md` — tabulka vrstev a směr závislostí presetu.
- `scripts/` — skripty pro správu vrstev a jejich README (EN i CZ):
  `new-layer` (sám registruje vrstvu a u `full` synchronizuje),
  `rename-layer` (přejmenuje vrstvu i odkazy a zrcadla),
  `delete-layer` (soft retire přes `_retired-`), `verify-layer`, `test-layer`
  a `sync-agent-config` (jen `full`).
- `scripts/layer-template/` — šablona, ze které `new-layer` zakládá další vrstvy.
- `scripts/lib/` — sdílená logika skriptů (parita `node`/`pwsh`).
- `.cursor/` — u `full` je zrcadlo prázdné, dokud nespustíš sync; u `lean` je
  naplněné přímo.
- `.scaffold.json` — jak si projekt pamatuje svoji konfiguraci.

## Ověření

Automaticky to dělá CI (`.github/workflows/ci.yml`). Lokálně stačí:

```bash
node examples/generate.mjs --force --verify
```

Skript u node vzorků spustí `sync-agent-config --check` a `verify-layer` pro
každou vrstvu. U pwsh vzorků spusť totéž ručně s `pwsh`.
