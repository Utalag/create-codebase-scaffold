#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isActiveLayerName, parseArgs, projectRoot, resolveLayerDir } from './lib/util.mjs';
import { t } from './lib/i18n.mjs';

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
const USAGE = 'node scripts/test-layer.mjs --layer Domain';

const args = parseArgs(process.argv.slice(2));
const layerName = typeof args.layer === 'string' ? args.layer : args._[0];

if (!layerName) {
  console.error(t('test.nameMissing', { usage: USAGE }));
  process.exit(1);
}

const layerDir = resolveLayerDir(layerName);
if (!layerDir) {
  console.error(t('test.layerMissing', { layer: layerName }));
  process.exit(1);
}

const resolvedName = path.basename(layerDir);

if (!isActiveLayerName(resolvedName)) {
  console.error(t('test.notActive', { layer: resolvedName }));
  process.exit(1);
}

const runner = path.join(layerDir, 'tests', 'run.mjs');

if (!fs.existsSync(runner)) {
  console.log(t('test.noRunner', { layer: resolvedName, runner: `src/${resolvedName}/tests/run.mjs` }));
  process.exit(0);
}

console.log(t('test.testing', { layer: resolvedName }));

const result = spawnSync(process.execPath, [runner, '--layer', resolvedName], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error(t('test.failed', { layer: resolvedName, code: result.status ?? 1 }));
  process.exit(result.status ?? 1);
}

console.log(t('test.passed', { layer: resolvedName }));
process.exit(0);
