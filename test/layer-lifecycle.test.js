import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

import { exists, generate, readText } from './helpers.js';

const HAS_PWSH = (() => {
  const result = spawnSync('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'], {
    encoding: 'utf8',
  });
  return result.status === 0;
})();

function runNode(target, script, args = []) {
  return spawnSync(process.execPath, [path.join(target, script), ...args], {
    cwd: target,
    encoding: 'utf8',
  });
}

function runPwsh(target, script, args = []) {
  return spawnSync('pwsh', ['-NoProfile', '-File', path.join(target, script), ...args], {
    cwd: target,
    encoding: 'utf8',
  });
}

function readConfig(target) {
  return JSON.parse(readText(target, '.scaffold.json'));
}

/** Strukturální tvrzení společná pro node i pwsh provedení. */
function assertSoftRetired(target, layer) {
  assert.ok(!exists(target, `src/${layer}`), `aktivní src/${layer} mělo zmizet`);
  assert.ok(exists(target, `src/_retired-${layer}/AGENTS.md`), 'vyřazená složka má zůstat');
  assert.ok(exists(target, `src/_retired-${layer}/RETIRED.md`), 'chybí RETIRED.md');
  assert.ok(!readConfig(target).layers.includes(layer), 'vrstva zůstala v .scaffold.json');
}

function assertRenamed(target, oldLayer, newLayer) {
  assert.ok(!exists(target, `src/${oldLayer}`), `src/${oldLayer} mělo zmizet`);
  assert.ok(exists(target, `src/${newLayer}/AGENTS.md`), `chybí src/${newLayer}`);
  assert.ok(readConfig(target).layers.includes(newLayer), 'nová vrstva chybí v .scaffold.json');
  assert.ok(!readConfig(target).layers.includes(oldLayer), 'stará vrstva zůstala v .scaffold.json');
}

test('delete-layer: dry-run nic nezmění, --yes vyřadí vrstvu z mapy', () => {
  const { target } = generate({ presetId: 'clean', tooling: 'node', machinery: 'full', agents: ['cursor'] });
  assert.equal(runNode(target, 'scripts/sync-agent-config.mjs').status, 0);

  const dry = runNode(target, 'scripts/delete-layer.mjs', ['--name', 'Domain']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /dry-run/);
  assert.ok(exists(target, 'src/Domain/AGENTS.md'), 'dry-run neměl nic změnit');
  assert.ok(!exists(target, 'src/_retired-Domain'), 'dry-run neměl vytvořit vyřazenou složku');

  const apply = runNode(target, 'scripts/delete-layer.mjs', ['--name', 'Domain', '--yes']);
  assert.equal(apply.status, 0, apply.stdout + apply.stderr);

  assertSoftRetired(target, 'Domain');

  const check = runNode(target, 'scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);

  assert.ok(!exists(target, '.cursor/agents/domain-dev.md'), 'zrcadlo subagenta mělo zmizet');
  assert.ok(!exists(target, '.cursor/rules/generated/domain'), 'zrcadlo pravidel mělo zmizet');

  for (const relative of ['AGENTS.md', 'src/AGENTS.md', 'docs/layers.md']) {
    assert.ok(!readText(target, relative).includes('`Domain`'), `${relative} stále zmiňuje Domain`);
  }

  for (const layer of ['Application', 'Infrastructure', 'Presentation', 'Shared']) {
    const agents = readText(target, `src/${layer}/AGENTS.md`);
    assert.ok(!agents.includes('`Domain`'), `src/${layer}/AGENTS.md stále zmiňuje Domain`);
  }

  const verify = runNode(target, 'scripts/verify-layer.mjs', ['--layer', 'Application']);
  assert.equal(verify.status, 0, verify.stdout + verify.stderr);
});

test('delete-layer: vyřazená složka se nebere jako aktivní vrstva', () => {
  const { target } = generate({ presetId: 'clean', tooling: 'node', machinery: 'full', agents: ['cursor'] });
  runNode(target, 'scripts/sync-agent-config.mjs');
  runNode(target, 'scripts/delete-layer.mjs', ['--name', 'Shared', '--yes']);

  // Vyřazená vrstva má na disku i .cursor, ale sync ji nesmí zrcadlit.
  assert.ok(exists(target, 'src/_retired-Shared/.cursor/rules/standards.mdc'));
  assert.ok(!exists(target, '.cursor/agents/shared-dev.md'));
  assert.ok(!exists(target, '.cursor/rules/generated/shared'));

  const check = runNode(target, 'scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);

  // Nová vrstva vedle vyřazené se musí chovat normálně.
  const created = runNode(target, 'scripts/new-layer.mjs', ['--name', 'Billing']);
  assert.equal(created.status, 0, created.stdout + created.stderr);
  const after = runNode(target, 'scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(after.status, 0, after.stdout + after.stderr);
  assert.ok(readConfig(target).layers.includes('Billing'));
});

test('rename-layer: dry-run nic nezmění, --yes přepíše mapu i artefakty', () => {
  const { target } = generate({ presetId: 'hexagonal', tooling: 'node', machinery: 'full', agents: ['cursor'] });
  assert.equal(runNode(target, 'scripts/sync-agent-config.mjs').status, 0);

  const dry = runNode(target, 'scripts/rename-layer.mjs', ['--name', 'Domain', '--to', 'Core']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /dry-run/);
  assert.ok(exists(target, 'src/Domain/AGENTS.md'), 'dry-run neměl nic změnit');
  assert.ok(!exists(target, 'src/Core'));

  const apply = runNode(target, 'scripts/rename-layer.mjs', ['--name', 'Domain', '--to', 'Core', '--yes']);
  assert.equal(apply.status, 0, apply.stdout + apply.stderr);

  assertRenamed(target, 'Domain', 'Core');

  const check = runNode(target, 'scripts/sync-agent-config.mjs', ['--check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);

  assert.ok(exists(target, '.cursor/agents/core-dev.md'), 'chybí nové zrcadlo subagenta');
  assert.ok(!exists(target, '.cursor/agents/domain-dev.md'), 'zůstalo staré zrcadlo subagenta');
  assert.ok(exists(target, '.cursor/rules/generated/core/standards.mdc'));
  assert.ok(!exists(target, '.cursor/rules/generated/domain'));

  for (const relative of ['AGENTS.md', 'src/AGENTS.md', 'docs/layers.md']) {
    const text = readText(target, relative);
    assert.ok(!text.includes('`Domain`'), `${relative} stále zmiňuje Domain`);
    assert.ok(text.includes('`Core`'), `${relative} neobsahuje Core`);
  }

  const rule = readText(target, '.cursor/rules/generated/core/standards.mdc');
  assert.ok(rule.includes('src/Core/**'), 'zrcadlo pravidla nemá nový globs');
});

test('rename-layer a delete-layer fungují i v lean režimu (node)', () => {
  const { target } = generate({ presetId: 'clean', tooling: 'node', machinery: 'lean', agents: ['cursor'] });

  assert.ok(exists(target, '.cursor/rules/domain.mdc'));
  const renamed = runNode(target, 'scripts/rename-layer.mjs', ['--name', 'Domain', '--to', 'Core', '--yes']);
  assert.equal(renamed.status, 0, renamed.stdout + renamed.stderr);
  assertRenamed(target, 'Domain', 'Core');
  assert.ok(exists(target, '.cursor/rules/core.mdc'));
  assert.ok(!exists(target, '.cursor/rules/domain.mdc'));
  assert.ok(exists(target, '.cursor/agents/core-dev.md'));
  assert.ok(!exists(target, '.cursor/agents/domain-dev.md'));

  const deleted = runNode(target, 'scripts/delete-layer.mjs', ['--name', 'Shared', '--yes']);
  assert.equal(deleted.status, 0, deleted.stdout + deleted.stderr);
  assertSoftRetired(target, 'Shared');
  assert.ok(!exists(target, '.cursor/rules/shared.mdc'));
  assert.ok(!exists(target, '.cursor/agents/shared-dev.md'));
});

test('pwsh delete-layer a rename-layer jsou funkční parita node variant', { skip: !HAS_PWSH }, () => {
  const { target } = generate({ presetId: 'clean', tooling: 'pwsh', machinery: 'full', agents: ['cursor'] });
  assert.equal(runPwsh(target, 'scripts/sync-agent-config.ps1').status, 0);

  const dry = runPwsh(target, 'scripts/rename-layer.ps1', ['-Name', 'Domain', '-To', 'Core', '-DryRun']);
  assert.equal(dry.status, 0, dry.stdout + dry.stderr);
  assert.ok(exists(target, 'src/Domain/AGENTS.md'), 'pwsh dry-run neměl nic změnit');

  const rename = runPwsh(target, 'scripts/rename-layer.ps1', ['-Name', 'Domain', '-To', 'Core', '-Yes']);
  assert.equal(rename.status, 0, rename.stdout + rename.stderr);
  assertRenamed(target, 'Domain', 'Core');

  const check = runPwsh(target, 'scripts/sync-agent-config.ps1', ['-Check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.ok(exists(target, '.cursor/agents/core-dev.md'));
  assert.ok(!exists(target, '.cursor/agents/domain-dev.md'));
  assert.ok(!readText(target, 'docs/layers.md').includes('`Domain`'));

  const del = runPwsh(target, 'scripts/delete-layer.ps1', ['-Name', 'Application', '-Yes']);
  assert.equal(del.status, 0, del.stdout + del.stderr);
  assertSoftRetired(target, 'Application');

  const check2 = runPwsh(target, 'scripts/sync-agent-config.ps1', ['-Check']);
  assert.equal(check2.status, 0, check2.stdout + check2.stderr);
});

test('pwsh new-layer sám synchronizuje (parita s node)', { skip: !HAS_PWSH }, () => {
  const { target } = generate({ presetId: 'clean', tooling: 'pwsh', machinery: 'full', agents: ['cursor'] });
  assert.equal(runPwsh(target, 'scripts/sync-agent-config.ps1').status, 0);

  const created = runPwsh(target, 'scripts/new-layer.ps1', ['-Name', 'Billing']);
  assert.equal(created.status, 0, created.stdout + created.stderr);

  const check = runPwsh(target, 'scripts/sync-agent-config.ps1', ['-Check']);
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.ok(exists(target, '.cursor/agents/billing-dev.md'));
});