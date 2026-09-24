import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { generate } from './helpers.js';

const templatesRoot = path.join(process.cwd(), 'templates');

/**
 * Cesty, které npm při balení vynechává bez ohledu na `files` v `package.json`.
 * Když je šablona takto pojmenovaná, v publikovaném balíčku chybí — a generátor
 * na to spadne až u uživatele, ne v testech.
 */
const NPM_ALWAYS_IGNORED = new Set(['.gitignore', '.npmignore', '.npmrc', 'node_modules', '.git']);

function walk(directory, base = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    const relative = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(absolute, relative) : [relative];
  });
}

test('žádná šablona nemá název, který npm při balení vynechává', () => {
  const offenders = walk(templatesRoot).filter((relative) =>
    relative.split('/').some((segment) => NPM_ALWAYS_IGNORED.has(segment)),
  );

  assert.deepEqual(
    offenders,
    [],
    'Tyto šablony by v npm balíčku chyběly. Přejmenuj je a namapuj v TEMPLATE_ALIASES.',
  );
});

test('gitignore šablona se generuje pod správným jménem', () => {
  const { target } = generate({ presetId: 'clean', tooling: 'node', machinery: 'lean' });

  assert.ok(fs.existsSync(path.join(target, '.gitignore')), 'chybí .gitignore v projektu');
  assert.ok(
    !fs.existsSync(path.join(target, 'gitignore')),
    'v projektu zůstala šablona pod názvem bez tečky',
  );

  const content = fs.readFileSync(path.join(target, '.gitignore'), 'utf8');
  assert.ok(content.includes('node_modules/'), 'gitignore neobsahuje node_modules');
  assert.ok(!content.includes('scripts/'), 'gitignore nesmí ignorovat scripts/');
});
