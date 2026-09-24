---
name: layer-presets
description: Přidává a ověřuje archetypy vrstev a architektonické presety v generátoru. Použij, když má vzniknout nový typ vrstvy, nový preset, nebo když je potřeba ověřit, že vygenerovaná vrstva projde verify-layer.
disable-model-invocation: true
---

# Archetypy vrstev a presety v generátoru

Generátor negeneruje vrstvy jen tak — každá vrstva má **archetyp**, který určuje
její odpovědnost, guardrails a výchozí směr závislostí. Archetypy a presety žijí
v `lib/presets.js`.

## Přidání archetypu

1. Doplň záznam do `ARCHETYPES` v `lib/presets.js`:
   - `responsibility` — jedna konkrétní věta o tom, co vrstva vlastní,
   - `guardrails` — 4-6 kontrolovatelných pravidel,
   - `canonicalDeps` — názvy vrstev, na kterých smí vrstva záviset
     (`null` znamená „neznámý archetyp“ a vede na markery `DOPLŇ:`).
2. Pokud má mít nový archetyp vlastní výchozí závislosti, ověř, že je mají
   i presety, které ho používají.

## Přidání presetu

1. Doplň záznam do `PRESETS` v `lib/presets.js`:
   - `layers` — pořadí vrstev v PascalCase,
   - `dependencies` — explicitní mapa „vrstva -> seznam povolených závislostí“.
2. Ověř, že každá závislost odkazuje na vrstvu, která v presetu existuje.

## Ověření

1. Spusť `npm test`. Testy generují projekt pro každý preset a kontrolují, že
   v souborech nezůstaly nerozřešené tokeny a že vrstvy projdou `verify-layer`.
2. Vygeneruj projekt ručně a projdi kontroly jako v reálném projektu:

   ```bash
   node bin/create.js .tmp/skill-check --preset <preset> --tooling node --yes
   cd .tmp/skill-check
   node scripts/sync-agent-config.mjs
   node scripts/sync-agent-config.mjs --check
   node scripts/verify-layer.mjs --layer <Layer>
   ```

3. Zkontroluj i variantu `--machinery lean` a `--tooling pwsh`.

## Pravidla

- Názvy vrstev jsou vždy PascalCase. Slug (kebab-case) se nikdy nezadává ručně,
  odvozuje se z názvu.
- Neznámý archetyp nesmí tiše projít: musí skončit u markerů `DOPLŇ:` a vrstva
  pak nesmí projít `verify-layer`.
- Nedestruktivnost generátoru neporušuj: nová funkce nesmí začít přepisovat
  existující soubory bez `--force`.
- Po změně chování aktualizuj `docs/generator.md`, `docs/templates.md`
  a `README.md`.
