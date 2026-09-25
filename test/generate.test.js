import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

import { PRESET_IDS, buildArchitecture } from '../lib/presets.js';
import { exists, generate, listDir, makeTempDir, readText, unresolvedTokenFiles, walkFiles } from './helpers.js';

const TOOLINGS = ['pwsh', 'node'];
const MACHINERIES = ['full', 'lean'];
const PRESETS_WITH_LAYERS = PRESET_IDS.filter((id) => id !== 'custom');

function scriptsFor(tooling) {
  return tooling === 'node'
    ? {
        newLayer: 'scripts/new-layer.mjs',
        verifyLayer: 'scripts/verify-layer.mjs',
        testLayer: 'scripts/test-layer.mjs',
        sync: 'scripts/sync-agent-config.mjs',
      }
    : {
        newLayer: 'scripts/new-layer.ps1',
        verifyLayer: 'scripts/verify-layer.ps1',
        testLayer: 'scripts/test-layer.ps1',
        sync: 'scripts/sync-agent-config.ps1',
      };
}

test('matice preset × tooling × machinery generuje konzistentní projekt', () => {
  for (const presetId of PRESETS_WITH_LAYERS) {
    for (const tooling of TOOLINGS) {
      for (const machinery of MACHINERIES) {
        const label = `${presetId}/${tooling}/${machinery}`;
        const { target, result } = generate({ presetId, tooling, machinery });
        const architecture = buildArchitecture({ presetId });
        const scripts = scriptsFor(tooling);

        // Základní soubory projektu.
        for (const relative of [
          'AGENTS.md',
          'README.md',
          '.editorconfig',
          '.gitignore',
          '.scaffold.json',
          'src/AGENTS.md',
          'docs/README.md',
          'docs/layers.md',
          'scripts/README.md',
          'scripts/README.cs.md',
          'scripts/layer-presets.json',
          scripts.newLayer,
          scripts.verifyLayer,
          scripts.testLayer,
        ]) {
          assert.ok(exists(target, relative), `${label}: chybí ${relative}`);
        }

        // Sync zrcadlo a jeho skript existují jen u plné konfigurace.
        assert.equal(
          exists(target, scripts.sync),
          machinery === 'full',
          `${label}: sync skript vs machinery`,
        );
        assert.equal(
          exists(target, 'docs/agent-config.md'),
          machinery === 'full',
          `${label}: docs/agent-config.md vs machinery`,
        );

        const firstLayer = architecture.layerNames[0];
        assert.equal(
          exists(target, `src/${firstLayer}/.cursor/rules/standards.mdc`),
          machinery === 'full',
          `${label}: per-vrstva .cursor vs machinery`,
        );

        // Anatomie každé vrstvy.
        for (const layer of architecture.layers) {
          const base = `src/${layer.name}`;

          for (const relative of [
            'AGENTS.md',
            'README.md',
            'docs/README.md',
            'src/.gitkeep',
            'tests/unit/.gitkeep',
            'tests/integration/.gitkeep',
          ]) {
            assert.ok(exists(target, `${base}/${relative}`), `${label}: chybí ${base}/${relative}`);
          }

          assert.ok(
            walkFiles(target).some((file) => file.startsWith(`${base}/docs/decisions/`)),
            `${label}: ${base} nemá ADR`,
          );

          const agents = readText(target, `${base}/AGENTS.md`);
          assert.ok(agents.includes('## Guardrails'), `${label}: ${base}/AGENTS.md bez guardrails`);
          assert.ok(!agents.includes('DOPLŇ:'), `${label}: ${base}/AGENTS.md má DOPLŇ`);
        }

        // Tokeny nesmí zůstat nikde mimo šablonu vrstvy.
        assert.deepEqual(unresolvedTokenFiles(target), [], `${label}: nerozřešené tokeny`);

        // Složka scripts/ se commituje — nesmí být v .gitignore.
        assert.ok(!readText(target, '.gitignore').includes('scripts/'), `${label}: scripts/ v .gitignore`);

        assert.equal(result.architecture.layerNames.length, architecture.layerNames.length);
      }
    }
  }
});

test('lean režim zapisuje konfiguraci vrstvy přímo do root .cursor', () => {
  const { target } = generate({ presetId: 'clean', machinery: 'lean', agents: ['cursor'] });

  assert.ok(exists(target, '.cursor/rules/00-project.mdc'));
  assert.ok(exists(target, '.cursor/rules/domain.mdc'));
  assert.ok(exists(target, '.cursor/agents/domain-dev.md'));
  assert.ok(exists(target, '.cursor/skills/layer-management/SKILL.md'));
  assert.ok(!exists(target, 'src/Domain/.cursor'));
  assert.ok(!exists(target, '.cursor/hooks.json'));

  const rule = readText(target, '.cursor/rules/domain.mdc');
  assert.ok(rule.includes('globs: ["src/Domain/**"]'));
});

test('full režim generuje hooky a zdroje konfigurace ve vrstvách', () => {
  const { target } = generate({ presetId: 'clean', machinery: 'full', agents: ['cursor'] });

  assert.ok(exists(target, '.cursor/hooks.json'));
  assert.ok(exists(target, 'src/Domain/.cursor/rules/standards.mdc'));
  assert.ok(exists(target, 'src/Domain/.cursor/agents/dev.md'));
  assert.ok(exists(target, 'src/Domain/.github/actions/setup-layer/action.yml'));
  assert.ok(exists(target, 'src/Domain/.github/workflows/domain.yml'));

  const hooks = JSON.parse(readText(target, '.cursor/hooks.json'));
  assert.ok(hooks.hooks.afterFileEdit.length > 0);
});

test('ekosystémy přidávají právě svoje soubory', () => {
  const { target } = generate({ presetId: 'clean', agents: ['cursor', 'copilot', 'claude'] });

  assert.ok(exists(target, '.cursor/rules/00-project.mdc'));
  assert.ok(exists(target, '.github/copilot-instructions.md'));
  assert.ok(exists(target, 'CLAUDE.md'));
  assert.ok(exists(target, '.claude/skills/layer-management/SKILL.md'));
});

test('codex používá AGENTS.md, který se generuje vždy', () => {
  const { target } = generate({ presetId: 'clean', agents: ['codex'] });

  assert.ok(exists(target, 'AGENTS.md'));
  assert.ok(!exists(target, '.cursor'));
  assert.ok(!exists(target, 'CLAUDE.md'));
  assert.ok(!exists(target, '.github/copilot-instructions.md'));
});

test('--no-ci vynechá CI workflow', () => {
  const { target } = generate({ presetId: 'clean', ci: false });
  assert.ok(!exists(target, '.github/workflows/ci.yml'));
});

test('lean režim nikde neodkazuje na sync zrcadlo', () => {
  const { target } = generate({
    presetId: 'clean',
    tooling: 'node',
    machinery: 'lean',
    agents: ['cursor', 'claude'],
  });

  // Implementace skriptů samozřejmě obsahují názvy příkazů — jde o obsah dokumentace.
  const isScriptImplementation = (relative) =>
    /^scripts\/[^/]+\.(mjs|ps1)$/.test(relative) || relative.startsWith('scripts/lib/');

  for (const relative of walkFiles(target)) {
    if (isScriptImplementation(relative)) continue;

    const text = readText(target, relative);
    assert.ok(!text.includes('sync-agent-config'), `${relative} odkazuje na sync v lean režimu`);
    assert.ok(!text.includes('rules/generated'), `${relative} odkazuje na zrcadlo v lean režimu`);
  }
});

test('.scaffold.json popisuje konfiguraci projektu', () => {
  const { target } = generate({
    presetId: 'hexagonal',
    tooling: 'node',
    machinery: 'lean',
    agents: ['cursor', 'claude'],
    ci: false,
  });

  const config = JSON.parse(readText(target, '.scaffold.json'));
  assert.equal(config.architecture, 'hexagonal');
  assert.equal(config.tooling, 'node');
  assert.equal(config.machinery, 'lean');
  assert.deepEqual(config.agents, ['cursor', 'claude']);
  assert.equal(config.ci, false);
  assert.deepEqual(config.layers, ['Domain', 'Application', 'Adapters', 'Shared']);
});

test('generátor je nedestruktivní a --force přepisuje', () => {
  const { target } = generate({ presetId: 'clean' });

  fs.writeFileSync(path.join(target, 'src/Domain/README.md'), 'RUCNI UPRAAVA\n', 'utf8');

  const second = generate({ presetId: 'clean', target });
  assert.equal(second.result.report.created.length, 0);
  assert.equal(second.result.report.overwritten.length, 0);
  assert.ok(second.result.report.skipped.length > 0);
  assert.equal(readText(target, 'src/Domain/README.md'), 'RUCNI UPRAAVA\n');

  const third = generate({ presetId: 'clean', target, force: true });
  assert.equal(third.result.report.created.length, 0);
  assert.ok(third.result.report.overwritten.length > 0);
  assert.ok(readText(target, 'src/Domain/README.md').includes('# Vrstva Domain'));
});

test('dry-run nic nezapíše', () => {
  const target = path.join(makeTempDir('scaffold-dry-'), 'out');
  generate({ presetId: 'clean', target, dryRun: true });

  assert.ok(!fs.existsSync(target));
});

test('custom seznam vrstev se promítne do projektu', () => {
  const { target } = generate({ presetId: 'custom', layers: ['Domain', 'Business', 'Data', 'Shared'] });

  assert.deepEqual(listDir(target, 'src'), ['AGENTS.md', 'Business', 'Data', 'Domain', 'Shared']);
  assert.ok(readText(target, 'src/AGENTS.md').includes('`Business`'));
  assert.ok(readText(target, 'AGENTS.md').includes('Business'));
});

test('neznámá vrstva v custom seznamu skončí s markery DOPLŇ', () => {
  const { target } = generate({ presetId: 'custom', layers: ['Domain', 'Audit', 'Shared'] });
  const agents = readText(target, 'src/Audit/AGENTS.md');

  assert.ok(agents.includes('DOPLŇ:'));
});

test('node tooling: sync, verify, test i new-layer fungují end to end', () => {
  const { target } = generate({
    presetId: 'vertical-slice',
    tooling: 'node',
    machinery: 'full',
    agents: ['cursor'],
  });

  const run = (script, args = []) =>
    spawnSync(process.execPath, [path.join(target, script), ...args], {
      cwd: target,
      encoding: 'utf8',
    });

  // Sync zrcadlo vznikne a je v souladu.
  const initial = run('scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(initial.status, 1, 'před syncem má --check selhat');

  const sync = run('scripts/sync-agent-config.mjs');
  assert.equal(sync.status, 0, sync.stderr);

  const check = run('scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);

  // Každá vrstva projde kontrolou struktury.
  for (const layer of ['Features', 'Infrastructure', 'Shared']) {
    const verify = run('scripts/verify-layer.mjs', ['--layer', layer]);
    assert.equal(verify.status, 0, `${layer}: ${verify.stdout}${verify.stderr}`);
  }

  // Vrstva bez runneru se přeskočí.
  const layerTest = run('scripts/test-layer.mjs', ['--layer', 'Shared']);
  assert.equal(layerTest.status, 0);

  // Nová vrstva se známým archetypem projde kontrolou.
  const known = run('scripts/new-layer.mjs', ['--name', 'Adapters']);
  assert.equal(known.status, 0, known.stderr);
  assert.ok(exists(target, 'src/Adapters/AGENTS.md'));
  assert.ok(!readText(target, 'src/Adapters/AGENTS.md').includes('DOPLŇ:'));

  // new-layer sám spustil sync, takže zrcadlo je hned v souladu.
  const afterNewLayer = run('scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(afterNewLayer.status, 0, afterNewLayer.stdout + afterNewLayer.stderr);
  assert.ok(exists(target, '.cursor/agents/adapters-dev.md'));

  const verifyKnown = run('scripts/verify-layer.mjs', ['--layer', 'Adapters']);
  assert.equal(verifyKnown.status, 0, verifyKnown.stdout + verifyKnown.stderr);

  // Opakované spuštění nesmí nic přepsat.
  const rerun = run('scripts/new-layer.mjs', ['--name', 'Adapters']);
  assert.equal(rerun.status, 0);
  assert.ok(rerun.stdout.includes('Přeskočeno'));

  // Neznámá vrstva dostane markery DOPLŇ a kontrolou neprojde.
  const unknown = run('scripts/new-layer.mjs', ['--name', 'Audit']);
  assert.equal(unknown.status, 0, unknown.stderr);
  assert.ok(readText(target, 'src/Audit/AGENTS.md').includes('DOPLŇ:'));

  const verifyUnknown = run('scripts/verify-layer.mjs', ['--layer', 'Audit']);
  assert.equal(verifyUnknown.status, 1);

  // Sync po přidání vrstvy musí zrcadlit i novou konfiguraci.
  assert.equal(run('scripts/sync-agent-config.mjs').status, 0);
  assert.equal(run('scripts/sync-agent-config.mjs', ['--check']).status, 0);
});

test('generate je deterministický pro stejné zadání', () => {
  const first = generate({ presetId: 'clean', tooling: 'node', agents: ['cursor', 'claude'] });
  const second = generate({ presetId: 'clean', tooling: 'node', agents: ['cursor', 'claude'] });

  const firstFiles = walkFiles(first.target).map((relative) => [
    relative,
    readText(first.target, relative),
  ]);
  const secondFiles = walkFiles(second.target).map((relative) => [
    relative,
    readText(second.target, relative),
  ]);

  assert.deepEqual(firstFiles, secondFiles);
});
