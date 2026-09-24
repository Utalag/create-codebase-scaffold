#!/usr/bin/env node
/**
 * Ověří, že balíček obsahuje všechno, co generátor potřebuje.
 *
 * npm umí tiše vynechat cesty (`.gitignore`, `node_modules`) bez ohledu na
 * `files` v `package.json` — a chybějící šablona se projeví až u uživatele.
 * Proto se obsah tarballu porovnává se skutečným stromem `templates/`.
 *
 * Použití:
 *   npm run check:package
 *   node tools/check-package.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isWindows = process.platform === 'win32';

function walk(directory, base = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    const relative = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(absolute, relative) : [relative];
  });
}

/** Režim souboru, jak ho eviduje git (`100644` / `100755`); `null` = netrackován. */
function gitMode(relative) {
  const result = spawnSync('git', ['ls-files', '-s', '--', relative], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) return null; // není git repozitář
  const line = result.stdout.trim();
  return line ? line.split(/\s+/)[0] : null;
}

// `--ignore-scripts` je nutné: `npm pack` spouští `prepack`, který volá tenhle
// skript — bez přepínače by se volání rekurzivně zacyklilo. Příkaz je jeden
// řetězec záměrně: na Windows Node nespustí `npm.cmd` bez shellu a předávání
// pole argumentů se shellem vyvolává varování DEP0190.
const packed = spawnSync('npm pack --dry-run --json --ignore-scripts', {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

if (packed.error) {
  console.error(`CHYBA: nepodařilo se spustit npm: ${packed.error.message}`);
  process.exit(1);
}

if (packed.status !== 0) {
  process.stderr.write(packed.stderr ?? 'npm pack selhal bez výstupu.\n');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(packed.stdout)[0];
} catch {
  console.error('CHYBA: z `npm pack --json` se nepodařilo přečíst JSON.');
  console.error(packed.stdout.slice(0, 400));
  process.exit(1);
}
const packedPaths = new Set(manifest.files.map((file) => file.path.replace(/\\/g, '/')));

const problems = [];
const notes = [];

// 1. Všechny šablony musí být v balíčku — ze šablon se generuje obsah projektu.
const templateFiles = walk(path.join(root, 'templates'), 'templates');
const missingTemplates = templateFiles.filter((file) => !packedPaths.has(file));

if (missingTemplates.length > 0) {
  problems.push(
    `v balíčku chybí ${missingTemplates.length} šablon:\n` +
      missingTemplates.map((file) => `    - ${file}`).join('\n'),
  );
}

// 2. Vstupní bod a logika generátoru musí být v balíčku také.
const required = ['bin/create.js', 'lib/cli.js', 'lib/generator.js', 'package.json', 'README.md'];

for (const relative of required) {
  if (!packedPaths.has(relative)) problems.push(`v balíčku chybí ${relative}`);
}

// 3. Spustitelný soubor musí mít v gitu evidované právo spuštění. Ověřuje se
//    režim v gitu, ne na disku — Windows ten bit neumí reprezentovat.
const binPath = 'bin/create.js';
const recordedMode = gitMode(binPath);

if (recordedMode === null) {
  notes.push(
    `${binPath} zatím není v gitu (netrackováno) — právo spuštění se ověří po commitu.`,
  );
} else if (recordedMode !== '100755') {
  problems.push(
    `git eviduje ${binPath} jako ${recordedMode}, očekáváno 100755.\n` +
      `    Sprav: git add --chmod=+x ${binPath}`,
  );
}

// 4. Mimo Windows musí právo spuštění prosáknout i do tarballu.
if (!isWindows) {
  const packedBin = manifest.files.find((file) => file.path === binPath);

  if (packedBin && (packedBin.mode & 0o111) === 0) {
    problems.push(`${binPath} nemá v tarballu právo spuštění (mode ${packedBin.mode.toString(8)}).`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`CHYBA: ${problem}`);
  process.exit(1);
}

for (const note of notes) console.log(`POZNÁMKA: ${note}`);

console.log(
  `Balíček OK: ${manifest.entryCount} souborů, ${(manifest.size / 1024).toFixed(1)} kB, ` +
    `${templateFiles.length} šablon (včetně skrytých cest).`,
);
