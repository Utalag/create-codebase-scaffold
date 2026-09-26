#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { generateProject } from '../lib/generator.js';

/**
 * Vygeneruje referenční vzorky do examples/<id>/.
 *
 * Vzorky jsou generované artefakty — needituj je ručně. Po změně šablon je
 * přegeneruj přes `node examples/generate.mjs --force`.
 *
 * Použití:
 *   node examples/generate.mjs            # doplní, co chybí
 *   node examples/generate.mjs --force    # přegeneruje vše
 *   node examples/generate.mjs --verify   # po generování spustí kontroly u node vzorků
 */

const here = path.dirname(fileURLToPath(import.meta.url));

const EXAMPLES = [
  {
    id: 'clean-pwsh-full',
    projectName: 'CleanPwshFull',
    options: {
      presetId: 'clean',
      tooling: 'pwsh',
      machinery: 'full',
      agents: ['cursor', 'copilot', 'claude', 'codex'],
      ci: true,
    },
  },
  {
    id: 'hexagonal-node-full',
    projectName: 'HexagonalNodeFull',
    options: {
      presetId: 'hexagonal',
      tooling: 'node',
      machinery: 'full',
      agents: ['cursor', 'claude'],
      ci: true,
    },
  },
  {
    id: 'layered-pwsh-lean',
    projectName: 'LayeredPwshLean',
    options: {
      presetId: 'layered',
      tooling: 'pwsh',
      machinery: 'lean',
      agents: ['cursor', 'copilot'],
      ci: true,
    },
  },
  {
    id: 'vertical-slice-node-lean',
    projectName: 'VerticalSliceNodeLean',
    options: {
      presetId: 'vertical-slice',
      tooling: 'node',
      machinery: 'lean',
      agents: ['cursor'],
      ci: false,
    },
  },
  {
    id: 'hexagonal-node-en',
    projectName: 'HexagonalNodeEn',
    options: {
      lang: 'en',
      presetId: 'hexagonal',
      tooling: 'node',
      machinery: 'full',
      agents: ['cursor', 'copilot', 'claude'],
      ci: true,
    },
  },
  {
    id: 'custom-four-layers',
    projectName: 'CustomFourLayers',
    options: {
      presetId: 'custom',
      layers: ['Domain', 'Business', 'Data', 'Shared'],
      tooling: 'node',
      machinery: 'full',
      agents: ['cursor', 'codex'],
      ci: true,
    },
  },
];

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const verify = argv.includes('--verify');
const year = 2026;

let failed = false;

for (const example of EXAMPLES) {
  const target = path.join(here, example.id);

  console.log(`\n=== ${example.id} ===`);

  const result = generateProject(
    {
      target,
      projectName: example.projectName,
      year,
      force,
      ...example.options,
    },
    { log: () => {} },
  );

  const { created, skipped, overwritten } = result.report;
  console.log(
    `  ${result.architecture.label}: ${created.length} vytvořeno, ` +
      `${skipped.length} přeskočeno, ${overwritten.length} přepsáno`,
  );

  if (!verify || example.options.tooling !== 'node') {
    continue;
  }

  const run = (script, args = []) =>
    spawnSync(process.execPath, [path.join(target, script), ...args], {
      cwd: target,
      encoding: 'utf8',
    });

  const steps = [];

  // Sync zrcadlo existuje jen u plné konfigurace.
  if (example.options.machinery === 'full') {
    steps.push(['scripts/sync-agent-config.mjs', []]);
    steps.push(['scripts/sync-agent-config.mjs', ['--check']]);
  }

  for (const layer of result.architecture.layerNames) {
    steps.push(['scripts/verify-layer.mjs', ['--layer', layer]]);
  }

  for (const [script, args] of steps) {
    const outcome = run(script, args);
    if (outcome.status !== 0) {
      failed = true;
      console.error(`  CHYBA: ${script} ${args.join(' ')}`);
      console.error(outcome.stdout + outcome.stderr);
    }
  }
}

console.log(failed ? '\nVzorky byly vygenerovány, ale kontroly selhaly.' : '\nHotovo.');

if (failed) {
  process.exitCode = 1;
}
