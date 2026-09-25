import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { generateProject } from '../lib/generator.js';
import { findUnresolvedTokens } from '../lib/render.js';

export function makeTempDir(prefix = 'scaffold-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Vygeneruje projekt do dočasné složky a vrátí cestu i výsledek. */
export function generate(options = {}) {
  const target = options.target ?? makeTempDir();

  const result = generateProject(
    {
      target,
      projectName: 'TestApp',
      presetId: 'clean',
      tooling: 'node',
      machinery: 'full',
      agents: ['cursor', 'codex'],
      ci: true,
      year: 2026,
      ...options,
    },
    { log: () => {} },
  );

  return { target, result };
}

/** Rekurzivně vypíše relativní cesty souborů. */
export function walkFiles(root) {
  const result = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) result.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }

  return result.sort();
}

export function readText(root, relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

export function exists(root, relative) {
  return fs.existsSync(path.join(root, relative));
}

export function listDir(root, relative) {
  return fs.readdirSync(path.join(root, relative)).sort();
}

/**
 * Vrátí soubory, ve kterých zůstal nerozřešený token `__TOKEN__`.
 * Šablona vrstvy pro `new-layer` tokeny obsahuje záměrně.
 */
export function unresolvedTokenFiles(root) {
  const offenders = [];

  for (const relative of walkFiles(root)) {
    if (relative.startsWith('scripts/layer-template/')) continue;

    const tokens = findUnresolvedTokens(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (tokens.length > 0) offenders.push(`${relative} [${tokens.join(', ')}]`);
  }

  return offenders;
}
