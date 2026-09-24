import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { ARCHETYPES, PRESETS, PRESET_IDS } from '../lib/presets.js';
import { readText } from './helpers.js';

/**
 * `docs/layers.md` opisuje data z `lib/presets.js`. Tenhle test hlídá, že
 * dokument nezůstane pozadu, když se archetyp nebo preset změní.
 */

const docsRoot = path.join(process.cwd(), 'docs');
const layersDoc = readText(docsRoot, 'layers.md');

/** Sjednotí bílé znaky, aby šlo porovnávat i text zalamovaný po řádcích. */
function flatten(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

const flatDoc = flatten(layersDoc);

/** Najde řádek tabulky podle buněk; prázdná první buňka = pokračování presetu. */
function hasTableRow(cells, { firstCellOptional = false } = {}) {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const head = firstCellOptional
    ? String.raw`\|\s*(?:\`[^\`]+\`)?\s*\|`
    : String.raw`\|\s*\`${escape(cells[0])}\`\s*\|`;
  // Řádky mají i další buňky (popis, archetypy), proto se zbytek neanchoruje na konec.
  const rest = cells
    .slice(firstCellOptional ? 0 : 1)
    .map((value) => String.raw`\s*${escape(value)}\s*\|`)
    .join('');

  return new RegExp(`^${head}${rest}`, 'm').test(layersDoc);
}

test('docs/layers.md obsahuje hlavičku pro každý archetyp', () => {
  for (const key of Object.keys(ARCHETYPES)) {
    assert.ok(
      layersDoc.includes(`### \`${key}\``),
      `docs/layers.md nemá sekci pro archetyp ${key}`,
    );
  }
});

test('docs/layers.md opisuje odpovědnost a guardrails každého archetypu', () => {
  for (const [key, archetype] of Object.entries(ARCHETYPES)) {
    // `default` je záměrně skeleton s markery `DOPLŇ:`, ne hotová odpovědnost —
    // dokument ho popisuje vlastními slovy, opsané markery by neměly smysl.
    if (key === 'default') continue;

    assert.ok(
      flatDoc.includes(flatten(archetype.responsibility)),
      `docs/layers.md neopisuje odpovědnost archetypu ${key}`,
    );

    for (const guardrail of archetype.guardrails) {
      assert.ok(
        flatDoc.includes(flatten(guardrail)),
        `docs/layers.md neopisuje guardrail archetypu ${key}: ${flatten(guardrail)}`,
      );
    }
  }
});

test('docs/layers.md uvádí canonicalDeps u každého archetypu', () => {
  for (const [key, archetype] of Object.entries(ARCHETYPES)) {
    const deps =
      archetype.canonicalDeps === null
        ? '`null` (nutno doplnit)'
        : archetype.canonicalDeps.length > 0
          ? archetype.canonicalDeps.join(', ')
          : '—';
    assert.ok(
      hasTableRow([key, deps]),
      `řádek archetypu ${key} v tabulce nesedí (očekáváno: ${deps})`,
    );
  }
});

test('docs/layers.md uvádí vrstvy každého presetu', () => {
  for (const id of PRESET_IDS) {
    const preset = PRESETS[id];
    const layers = preset.layers ? preset.layers.join(', ') : 'podle `--layers`';
    assert.ok(hasTableRow([id, layers]), `řádek presetu ${id} v tabulce nesedí`);
  }
});

test('docs/layers.md uvádí směr závislostí každého presetu', () => {
  for (const id of PRESET_IDS) {
    const dependencies = PRESETS[id].dependencies;

    for (const [layer, deps] of Object.entries(dependencies ?? {})) {
      const cell = deps.length > 0 ? deps.join(', ') : '—';
      assert.ok(
        hasTableRow([layer, cell], { firstCellOptional: true }),
        `směr závislostí presetu ${id} pro ${layer} nesedí (očekáváno: ${cell})`,
      );
    }
  }
});
