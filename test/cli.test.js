import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { run } from '../lib/cli.js';
import { makeTempDir, readText } from './helpers.js';

/** Zachytí stdout během volání a vrátí ho. */
async function capture(argv) {
  const original = process.stdout.write;
  let output = '';

  process.stdout.write = (chunk) => {
    output += String(chunk);
    return true;
  };

  try {
    await run(argv);
  } finally {
    process.stdout.write = original;
  }

  return output;
}

test('--version vypíše verzi', async () => {
  const output = await capture(['--version']);
  assert.match(output.trim(), /^\d+\.\d+\.\d+$/);
});

test('--list vypíše všechny presety', async () => {
  const output = await capture(['--list']);
  for (const id of ['clean', 'hexagonal', 'layered', 'vertical-slice', 'custom']) {
    assert.ok(output.includes(id), `chybí preset ${id}`);
  }
});

test('--help vypíše volby a zásadu nedestruktivnosti', async () => {
  const output = await capture(['--help']);
  assert.ok(output.includes('--preset'));
  assert.ok(output.includes('--machinery'));
  assert.ok(output.includes('--agents'));
  assert.ok(output.toLowerCase().includes('nedestruktivnost'));
});

test('neinteraktivní generování s -y projde', async () => {
  const target = path.join(makeTempDir('scaffold-cli-'), 'app');
  const output = await capture([
    target,
    '--preset',
    'hexagonal',
    '--tooling',
    'node',
    '--machinery',
    'full',
    '--agents',
    'cursor,copilot',
    '-y',
  ]);

  assert.ok(output.includes('Hotovo'));
  assert.ok(fs.existsSync(path.join(target, 'AGENTS.md')));
  assert.ok(readText(target, 'AGENTS.md').includes('Hexagonal'));

  const config = JSON.parse(readText(target, '.scaffold.json'));
  assert.deepEqual(config.agents, ['cursor', 'copilot']);
});

test('--agents all zapne všechny ekosystémy', async () => {
  const target = path.join(makeTempDir('scaffold-cli-'), 'all');
  await capture([target, '--agents', 'all', '-y']);

  const config = JSON.parse(readText(target, '.scaffold.json'));
  assert.deepEqual(config.agents.sort(), ['claude', 'codex', 'copilot', 'cursor']);
});

test('neplatné hodnoty skončí chybou', async () => {
  await assert.rejects(() => capture(['x', '--preset', 'neexistuje', '-y']), /Neplatná hodnota/);
  await assert.rejects(() => capture(['x', '--tooling', 'python', '-y']), /Neplatná hodnota/);
  await assert.rejects(() => capture(['x', '--machinery', 'stredni', '-y']), /Neplatná hodnota/);
  await assert.rejects(() => capture(['x', '--agents', 'vscode', '-y']), /Neznámý ekosystém/);
  await assert.rejects(() => capture(['x', '--layers', '---', '-y']), /Neplatný název vrstvy/);
});

test('neznámá volba skončí chybou místo tichého ignorování', async () => {
  await assert.rejects(() => capture(['x', '--agets', 'cursor', '-y']), /Neznámá volba: '--agets'/);
  await assert.rejects(() => capture(['x', '-z']), /Neznámá volba: '-z'/);
  // Známe volby musí projít — chyba nesmí být přehnaná.
  const target = path.join(makeTempDir('scaffold-cli-'), 'znama');
  await capture([
    target,
    '--preset',
    'clean',
    '--tooling',
    'node',
    '--machinery',
    'lean',
    '--agents',
    'cursor',
    '--no-ci',
    '--name',
    'Známa',
    '-y',
  ]);
  assert.ok(fs.existsSync(path.join(target, 'AGENTS.md')));
});

test('--dry-run nevytvoří cílovou složku', async () => {
  const target = path.join(makeTempDir('scaffold-cli-'), 'dry');
  const output = await capture([target, '--dry-run', '-y']);

  assert.ok(output.includes('Plán (dry-run)'));
  assert.ok(!fs.existsSync(target));
});
