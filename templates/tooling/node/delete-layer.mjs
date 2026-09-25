#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, projectRoot, readProjectConfig, toPascalCase } from './lib/util.mjs';
import { applyDelete, describeDelete, findActiveLayerDir } from './lib/layer-map.mjs';

/**
 * Vyřadí vrstvu z živé mapy (soft retire).
 *
 * Skript NEMAŽE obsah složky. Místo toho:
 *   1. přejmenuje `src/<Layer>` na `src/_retired-<Layer>`,
 *   takže ji sync, verify ani CI neberou jako aktivní vrstvu,
 *   2. zapíše do ní `RETIRED.md` s vysvětlením,
 *   3. odebere vrstvu z `.scaffold.json` a z odkazů v instrukcích a dokumentaci,
 *   4. odstraní její agentní artefakty z root `.cursor/` a u plné konfigurace
 *   spustí sync (stejná smyčka jako u new-layer).
 *
 * Hard delete (smazání složky) zůstává na uživateli — skript ho nikdy neudělá.
 *
 * Nedestruktivní výchozí chování: bez `--yes` (nebo s `--dry-run`) jen vypíše
 * plán a nic nezmění.
 *
 * Použití:
 *   node scripts/delete-layer.mjs --name Billing --dry-run
 *   node scripts/delete-layer.mjs --name Billing --yes
 */
const args = parseArgs(process.argv.slice(2));
const inputName = typeof args.name === 'string' ? args.name : args._[0];
const dryRun = args['dry-run'] === true || !(args.yes === true || args.y === true);

if (!inputName) {
  console.error('Chyba: chybí název vrstvy. Použití: node scripts/delete-layer.mjs --name Billing --yes');
  process.exit(1);
}

const layer = toPascalCase(inputName);

if (!findActiveLayerDir(layer)) {
  console.error(`Chyba: vrstva '${layer}' není aktivní v src/.`);
  process.exit(1);
}

if (dryRun) {
  console.log('');
  console.log(`Plán (dry-run) — vyřazení vrstvy '${layer}':`);
  for (const line of describeDelete(projectRoot, layer)) console.log(`  - ${line}`);
  console.log('');
  console.log('Nic se nezměnilo. Spusť s --yes pro provedení (obsah složky zůstane).');
  process.exit(0);
}

let result;
try {
  result = applyDelete(projectRoot, layer);
} catch (error) {
  console.error(`Chyba: ${error.message}`);
  process.exit(1);
}

runSyncIfFull();

console.log('');
console.log(`Vrstva '${result.layer}' byla vyřazena (soft retire):`);
console.log(`  Složka:      ${result.retiredDir} (obsah zachován)`);
console.log(`  Poznámka:    ${result.retiredDir}/RETIRED.md`);
console.log(`  Mapa:        .scaffold.json ${result.configUpdated ? 'aktualizováno' : 'bez změny'}`);
console.log(`  Artefakty:   odstraněno ${result.removedArtifacts.length} z root .cursor/`);
console.log('');
console.log('Vrstva už není aktivní. Hard delete (smazání složky) proveď ručně, pokud ji nechceš archivovat.');
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
