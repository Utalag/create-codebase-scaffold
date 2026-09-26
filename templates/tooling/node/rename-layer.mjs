#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, projectRoot, readProjectConfig, toPascalCase } from './lib/util.mjs';
import { applyRename, describeRename, findActiveLayerDir } from './lib/layer-map.mjs';
import { t } from './lib/i18n.mjs';

/**
 * Přejmenuje aktivní vrstvu atomicky: složku na disku i všechny odkazy v mapě.
 *
 * Nejde o delete + create. Skript:
 *   1. přejmenuje `src/<Stara>` na `src/<Nova>` (obsah zůstává),
 *   2. aktualizuje `.scaffold.json`,
 *   3. přepíše zmínky o vrstvě (PascalCase název, kebab-case slug i titulek)
 *   v projektových instrukcích, dokumentaci a souborech vrstvy,
 *   4. přejmenuje agentní artefakty v root `.cursor/`,
 *   5. u plné konfigurace spustí sync (stejná smyčka jako u new-layer).
 *
 * Nedestruktivní výchozí chování: bez `--yes` (nebo s `--dry-run`) jen vypíše
 * plán a nic nezmění.
 *
 * Použití:
 *   node scripts/rename-layer.mjs --name Billing --to Invoicing --dry-run
 *   node scripts/rename-layer.mjs --name Billing --to Invoicing --yes
 */
const USAGE = 'node scripts/rename-layer.mjs --name Billing --to Invoicing --yes';

const args = parseArgs(process.argv.slice(2));
const inputName = typeof args.name === 'string' ? args.name : args._[0];
const inputTarget = typeof args.to === 'string' ? args.to : args._[1];
const dryRun = args['dry-run'] === true || !(args.yes === true || args.y === true);

if (!inputName || !inputTarget) {
  console.error(t('rename.argsMissing', { usage: USAGE }));
  process.exit(1);
}

const oldLayer = toPascalCase(inputName);
const newLayer = toPascalCase(inputTarget);

if (!findActiveLayerDir(oldLayer)) {
  console.error(t('rename.notActive', { layer: oldLayer }));
  process.exit(1);
}

if (dryRun) {
  let plan;
  try {
    plan = describeRename(projectRoot, oldLayer, newLayer);
  } catch (error) {
    console.error(t('common.error', { message: error.message }));
    process.exit(1);
  }

  console.log('');
  console.log(t('rename.planHeader', { old: oldLayer, new: newLayer }));
  for (const line of plan) console.log(`  - ${line}`);
  console.log('');
  console.log(t('rename.planFooter'));
  process.exit(0);
}

let result;
try {
  result = applyRename(projectRoot, oldLayer, newLayer);
} catch (error) {
  console.error(t('common.error', { message: error.message }));
  process.exit(1);
}

runSyncIfFull();

const configState = t(result.configUpdated ? 'config.updated' : 'config.unchanged');

console.log('');
console.log(t('rename.resultHeader', { old: result.oldLayer, new: result.newLayer }));
console.log(t('rename.resultFolder', { old: result.oldLayer, new: result.newLayer }));
console.log(t('rename.resultConfig', { state: configState }));
console.log(t('rename.resultMentions', { count: result.touchedFiles }));
console.log(t('rename.resultArtifacts', { count: result.renamedArtifacts.length }));
console.log('');
console.log(t('rename.footer'));
console.log('');

function runSyncIfFull() {
  if (readProjectConfig().machinery !== 'full') return;

  const syncScript = path.join(projectRoot, 'scripts', 'sync-agent-config.mjs');
  if (!fs.existsSync(syncScript)) return;

  console.log('');
  console.log(t('rename.syncing'));
  const sync = spawnSync(process.execPath, [syncScript], { cwd: projectRoot, stdio: 'inherit' });
  if (sync.status !== 0) {
    console.error(t('rename.syncFailed', { code: sync.status ?? 1 }));
    process.exit(sync.status ?? 1);
  }
}
