#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, projectRoot, resolveLayerDir } from './lib/util.mjs';

/**
 * Spustí testy dané vrstvy.
 *
 * Neutrální runner, který nezná konkrétní stack. Vrstva si definuje vlastní
 * vstupní bod tests/run.mjs. Pokud runner neexistuje, vrstva se přeskočí
 * s hlášením (exit 0), aby CI nepadalo na vrstvách bez testů.
 *
 * Smlouva pro tests/run.mjs:
 *   - přijímá argument --layer <Layer>
 *   - ukončí se kódem 0 při úspěchu a nenulovým kódem při selhání
 *
 * Použití: node scripts/test-layer.mjs --layer Domain
 */
const args = parseArgs(process.argv.slice(2));
const layerName = typeof args.layer === 'string' ? args.layer : args._[0];

if (!layerName) {
  console.error('Chyba: chybí název vrstvy. Použití: node scripts/test-layer.mjs --layer Domain');
  process.exit(1);
}

const layerDir = resolveLayerDir(layerName);
if (!layerDir) {
  console.error(`Chyba: vrstva '${layerName}' neexistuje v src/.`);
  process.exit(1);
}

const resolvedName = path.basename(layerDir);
const runner = path.join(layerDir, 'tests', 'run.mjs');

if (!fs.existsSync(runner)) {
  console.log(
    `Vrstva '${resolvedName}' nemá testovací runner (src/${resolvedName}/tests/run.mjs). Přeskakuji.`,
  );
  process.exit(0);
}

console.log(`Testuji vrstvu '${resolvedName}'...`);

const result = spawnSync(process.execPath, [runner, '--layer', resolvedName], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error(`Testy vrstvy '${resolvedName}' selhaly (exit ${result.status ?? 1}).`);
  process.exit(result.status ?? 1);
}

console.log(`Testy vrstvy '${resolvedName}' prošly.`);
process.exit(0);
