#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, projectRoot, readProjectConfig, toPascalCase } from './lib/util.mjs';
import { applyRename, describeRename, findActiveLayerDir } from './lib/layer-map.mjs';

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
const args = parseArgs(process.argv.slice(2));
const inputName = typeof args.name === 'string' ? args.name : args._[0];
const inputTarget = typeof args.to === 'string' ? args.to : args._[1];
const dryRun = args['dry-run'] === true || !(args.yes === true || args.y === true);

if (!inputName || !inputTarget) {
  console.error(
    'Chyba: chybí název vrstvy nebo nový název. ' +
      'Použití: node scripts/rename-layer.mjs --name Billing --to Invoicing --yes',
  );
  process.exit(1);
}

const oldLayer = toPascalCase(inputName);
const newLayer = toPascalCase(inputTarget);

if (!findActiveLayerDir(oldLayer)) {
  console.error(`Chyba: vrstva '${oldLayer}' není aktivní v src/.`);
  process.exit(1);
}

if (dryRun) {
  let plan;
  try {
    plan = describeRename(projectRoot, oldLayer, newLayer);
  } catch (error) {
    console.error(`Chyba: ${error.message}`);
    process.exit(1);
  }

  console.log('');
  console.log(`Plán (dry-run) — přejmenování vrstvy '${oldLayer}' na '${newLayer}':`);
  for (const line of plan) console.log(`  - ${line}`);
  console.log('');
  console.log('Nic se nezměnilo. Spusť s --yes pro provedení.');
  process.exit(0);
}

let result;
try {
  result = applyRename(projectRoot, oldLayer, newLayer);
} catch (error) {
  console.error(`Chyba: ${error.message}`);
  process.exit(1);
}

runSyncIfFull();

console.log('');
console.log(`Vrstva '${result.oldLayer}' byla přejmenována na '${result.newLayer}':`);
console.log(`  Složka:      src/${result.oldLayer} -> src/${result.newLayer}`);
console.log(`  Mapa:        .scaffold.json ${result.configUpdated ? 'aktualizováno' : 'bez změny'}`);
console.log(`  Zmínky:      přepsáno v ${result.touchedFiles} souborech`);
console.log(`  Artefakty:   přejmenováno ${result.renamedArtifacts.length} v root .cursor/`);
console.log('');
console.log('Zkontroluj `src/AGENTS.md` a `docs/layers.md`, že nový název sedí i v ručních úpravách.');
console.log('');

function runSyncIfFull() {
  if (readProjectConfig().machinery !== 'full') return;

  const syncScript = path.join(projectRoot, 'scripts', 'sync-agent-config.mjs');
  if (!fs.existsSync(syncScript)) return;

  console.log('');
  console.log('Synchronizuji agentní konfiguraci do root .cursor/...');
  const sync = spawnSync(process.execPath, [syncScript], { cwd: projectRoot, stdio: 'inherit' });
  if (sync.status !== 0) {
    console.error(`Chyba: synchronizace selhala (exit ${sync.status ?? 1}).`);
    process.exit(sync.status ?? 1);
  }
}
