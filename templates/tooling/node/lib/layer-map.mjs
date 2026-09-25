import fs from 'node:fs';
import path from 'node:path';

import {
  RETIRED_PREFIX,
  isActiveLayerName,
  layerSlug,
  layerTitle,
  projectRoot,
  readJson,
  readText,
  toPascalCase,
  writeText,
} from './util.mjs';

export { RETIRED_PREFIX };

/**
 * Práce s "živou mapou vrstev" pro `delete-layer` a `rename-layer`.
 *
 * Mapa vrstev je tvořena:
 *   - složkami `src/<Layer>/` (aktivní vrstvy; vyřazené mají prefix `_retired-`),
 *   - polem `layers` v `.scaffold.json`,
 *   - vygenerovanými instrukcemi a dokumentací (`AGENTS.md`, `src/AGENTS.md`,
 *     `docs/layers.md`, `README.md`, `docs/agent-config.md`),
 *   - zmínkami v `AGENTS.md` ostatních vrstev,
 *   - agentními artefakty v root `.cursor/` (zrcadlo u `full`).
 *
 * Oba skripty jsou nedestruktivní: obsah vyřazené složky zůstává na disku.
 */

/** Soubory, které nesou mapu vrstev nebo na vrstvy odkazují. */
const MAP_FILES = ['AGENTS.md', 'README.md', 'src/AGENTS.md', 'docs/layers.md', 'docs/agent-config.md'];

/** Adresáře, které se při plošném přepisu jmen nikdy needitují. */
const SKIP_DIRS = new Set(['.git', 'node_modules', 'scripts']);

/** Přípony (a jména) textových souborů, které se smějí přepsat při rename. */
const TEXT_EXTENSIONS = new Set(['.md', '.mdc', '.json', '.yml', '.yaml', '.txt', '.toml', '.xml']);
const TEXT_NAMES = new Set(['.editorconfig', '.gitattributes', '.gitignore']);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRetiredName(name) {
  return String(name).startsWith(RETIRED_PREFIX);
}

/** Názvy aktivních vrstev v `src/` daného kořene. */
function activeLayerNames(targetRoot) {
  const srcRoot = path.join(targetRoot, 'src');
  if (!fs.existsSync(srcRoot)) return [];

  return fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isActiveLayerName(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function isTextCandidate(relative) {
  const base = path.basename(relative);
  if (TEXT_NAMES.has(base)) return true;
  return TEXT_EXTENSIONS.has(path.extname(base).toLowerCase());
}

/** Kořen projektu, do kterého skripty patří. */
export function root() {
  return projectRoot;
}

/** Načte `.scaffold.json`, nebo `null`. */
export function readConfig(targetRoot = projectRoot) {
  const configPath = path.join(targetRoot, '.scaffold.json');
  if (!fs.existsSync(configPath)) return null;

  try {
    return readJson(configPath);
  } catch {
    return null;
  }
}

function writeConfig(targetRoot, config) {
  writeText(path.join(targetRoot, '.scaffold.json'), `${JSON.stringify(config, null, 2)}\n`);
}

/** Najde aktivní složku vrstvy `src/<Layer>/`, nebo `null`. */
export function findActiveLayerDir(name, targetRoot = projectRoot) {
  const srcRoot = path.join(targetRoot, 'src');
  if (!fs.existsSync(srcRoot)) return null;

  const exact = path.join(srcRoot, name);
  if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) return exact;

  const match = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isActiveLayerName(entry.name))
    .map((entry) => path.join(srcRoot, entry.name))
    .find((dir) => path.basename(dir).toLowerCase() === String(name).toLowerCase());

  return match ?? null;
}

/** Vrátí relativní cesty všech textových souborů projektu (bez vyřazených a skriptů). */
export function listTextFiles(targetRoot = projectRoot) {
  const result = [];
  const stack = [targetRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || isRetiredName(entry.name)) continue;
        stack.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      const relative = path.relative(targetRoot, full).split(path.sep).join('/');
      if (relative === '.scaffold.json') continue;
      if (isTextCandidate(relative)) result.push(relative);
    }
  }

  return result.sort();
}

/**
 * Vyřadí vrstvu z textu řízeným způsobem:
 * odstraní řádky tabulek, odrážky rolí, hrany mermaid diagramu, řádky stromu
 * a zmínky v inline seznamech a v pravidlech závislostí. Ostatní text nechá být.
 */
export function pruneLayerReferences(text, layerName, layerSlugValue) {
  const nameToken = `\`${layerName}\``;
  const nameRe = escapeRegExp(layerName);

  const lines = String(text).split('\n');
  const kept = [];
  let section = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Sledujeme sekci, abychom uměli cíleně vyřadit guardrails odkazující
    // na vyřazenou vrstvu (např. "ta patří do `Domain`.").
    const header = /^#{1,6}\s+(.+?)\s*$/.exec(trimmed);
    if (header) {
      section = header[1];
      kept.push(line);
      continue;
    }

    // Guardrail jiné vrstvy, který už ukazuje na neexistující vrstvu.
    if (section === 'Guardrails' && line.includes(nameToken)) continue;

    // Řádek tabulky vrstev: | `Layer` | deps |
    const tableRow = /^\| (`[^`]+`) \| (.+) \|$/.exec(trimmed);
    if (tableRow) {
      const subject = tableRow[1];
      if (subject === nameToken) continue; // řádek vyřazené vrstvy zaniká
      if (line.includes(nameToken)) {
        const deps = tableRow[2]
          .split(/,\s*/)
          .map((item) => item.trim())
          .filter((item) => item && item !== nameToken && item !== '—');
        kept.push(`| ${subject} | ${deps.length > 0 ? deps.join(', ') : '—'} |`);
        continue;
      }
    }

    // Odrážka s rolí vrstvy: - `Layer` — ...
    if (new RegExp(`^-\\s*${nameToken}\\s*[—–-]`).test(trimmed)) continue;

    // Řádek stromu projektu: "  Layer/  # ..."
    if (new RegExp(`^\\s{2}${nameRe}/\\s`).test(line)) continue;

    // Hrany mermaid diagramu: "  Layer --> X" nebo "  X --> Layer"
    if (new RegExp(`^\\s*${nameRe}\\s*-->`).test(line)) continue;
    if (new RegExp(`-->\\s*${nameRe}\\s*$`).test(line)) continue;

    // Ukázkový mermaid v docs/agent-config.md míří na src/<Layer>/.
    if (line.includes(`src/${layerName}/`)) continue;

    // Popis architektury vyjmenovává vrstvy bez backticků. V AGENTS.md a
    // docs/layers.md začíná "Projekt používá architekturu", v README.md je to
    // řádek "**Label** — Domain, Application, Layer.".
    if (/^Projekt používá architekturu/.test(trimmed) || /^\*\*[^*]+\*\*\s+[—–-]\s+/.test(trimmed)) {
      const cleaned = line
        .replace(new RegExp(`\\s*,\\s*${nameRe}(?=\\s*[.,])`), '')
        .replace(new RegExp(`${nameRe},\\s*`), '');
      kept.push(cleaned);
      continue;
    }

    // Inline seznam vrstev: "Vrstvy: `A`, `B`, ..."
    if (/^Vrstvy:\s/.test(trimmed)) {
      const cleaned = line
        .replace(new RegExp(`\\s*${nameToken},\\s*`), ' ')
        .replace(new RegExp(`\\s*,\\s*${nameToken}`), '')
        .replace(new RegExp(nameToken), '')
        .replace(/\s+$/, '');
      kept.push(cleaned);
      continue;
    }

    // Pravidlo závislostí: "- `X` nesmí importovat `A`, `Layer`."
    const forbidden = /^- `([^`]+)` nesmí importovat (.+)\.$/.exec(trimmed);
    if (forbidden) {
      const subject = forbidden[1];
      if (subject === layerName) continue; // pravidlo o vyřazené vrstvě zaniká
      if (line.includes(nameToken)) {
        const deps = forbidden[2]
          .split(/,\s*/)
          .map((item) => item.trim())
          .filter((item) => item && item !== nameToken);
        if (deps.length === 0) continue;
        kept.push(`- \`${subject}\` nesmí importovat ${deps.join(', ')}.`);
        continue;
      }
    }

    // Věta o povolených závislostech v AGENTS.md ostatních vrstev.
    const allowed = /^Smí záviset pouze na (.+)\.$/.exec(trimmed);
    if (allowed && line.includes(nameToken)) {
      const deps = allowed[1]
        .split(/,\s*/)
        .map((item) => item.trim())
        .filter((item) => item && item !== nameToken);
      if (deps.length === 0) kept.push('Nesmí záviset na žádné jiné vrstvě.');
      else kept.push(`Smí záviset pouze na ${deps.join(', ')}.`);
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n');
}

/** Přepíše zmínky o vrstvě (název, slug, titulek) na nové hodnoty. */
export function renameLayerReferences(text, oldName, newName) {
  const oldSlug = layerSlug(oldName);
  const newSlug = layerSlug(newName);
  const oldTitle = layerTitle(oldName);
  const newTitle = layerTitle(newName);

  let result = String(text);

  if (oldTitle !== oldName) {
    result = result.replace(new RegExp(`\\b${escapeRegExp(oldTitle)}\\b`, 'g'), newTitle);
  }

  result = result.replace(new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g'), newName);

  if (oldSlug !== newSlug) {
    result = result.replace(
      new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(oldSlug)}(?![A-Za-z0-9])`, 'g'),
      newSlug,
    );
  }

  return result;
}

function replaceInFile(filePath, transform) {
  const before = readText(filePath);
  const after = transform(before);
  if (after !== before) writeText(filePath, after);
  return after !== before;
}

function updateConfigLayers(targetRoot, transform) {
  const config = readConfig(targetRoot);
  if (!config || !Array.isArray(config.layers)) return false;

  const updated = transform([...config.layers]);
  if (JSON.stringify(updated) === JSON.stringify(config.layers)) return false;

  config.layers = updated;
  writeConfig(targetRoot, config);
  return true;
}

/** Odstraní příslušné agentní artefakty z root `.cursor/`. */
function removeRootArtifacts(targetRoot, slug) {
  const removed = [];
  const cursorRoot = path.join(targetRoot, '.cursor');

  const removeEntry = (full) => {
    if (!fs.existsSync(full)) return;
    fs.rmSync(full, { recursive: true, force: true });
    removed.push(path.relative(targetRoot, full).split(path.sep).join('/'));
  };

  removeEntry(path.join(cursorRoot, 'rules', `${slug}.mdc`));
  removeEntry(path.join(cursorRoot, 'rules', 'generated', slug));

  for (const base of [path.join(cursorRoot, 'agents'), path.join(cursorRoot, 'skills')]) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      if (entry === slug || entry.startsWith(`${slug}-`)) removeEntry(path.join(base, entry));
    }
  }

  return removed;
}

/** Přejmenuje agentní artefakty v root `.cursor/` z oldSlug na newSlug. */
function renameRootArtifacts(targetRoot, oldSlug, newSlug) {
  const cursorRoot = path.join(targetRoot, '.cursor');
  const renamed = [];

  const renameEntry = (full, targetName) => {
    if (!fs.existsSync(full)) return;
    const target = path.join(path.dirname(full), targetName);
    if (fs.existsSync(target) || target === full) return;
    fs.renameSync(full, target);
    renamed.push(path.relative(targetRoot, target).split(path.sep).join('/'));
  };

  renameEntry(path.join(cursorRoot, 'rules', `${oldSlug}.mdc`), `${newSlug}.mdc`);

  const generatedRoot = path.join(cursorRoot, 'rules', 'generated');
  renameEntry(path.join(generatedRoot, oldSlug), newSlug);

  for (const base of [path.join(cursorRoot, 'agents'), path.join(cursorRoot, 'skills')]) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      if (entry === oldSlug || entry.startsWith(`${oldSlug}-`)) {
        renameEntry(path.join(base, entry), entry.replace(oldSlug, newSlug));
      }
    }
  }

  return renamed;
}

/** Lidsky čitelný plán operace pro `--dry-run`. */
export function describeDelete(targetRoot, layerName) {
  const layerDir = findActiveLayerDir(layerName, targetRoot);
  if (!layerDir) throw new Error(`Vrstva '${layerName}' není aktivní v src/.`);

  const slug = layerSlug(layerName);
  const retired = `${RETIRED_PREFIX}${path.basename(layerDir)}`;
  const lines = [
    `Přejmenovat složku:  src/${path.basename(layerDir)} -> src/${retired}`,
    `Zapsat poznámku:     src/${retired}/RETIRED.md`,
    `Odebrat z mapy:      .scaffold.json (layers)`,
    `Odstranit artefakty: .cursor/rules/${slug}.mdc, .cursor/agents/${slug}-*, .cursor/skills/${slug}-*, .cursor/rules/generated/${slug}`,
    `Vyčistit zmínky:     ${MAP_FILES.join(', ')} a AGENTS.md ostatních vrstev`,
  ];

  return lines;
}

/** Provede soft retire vrstvy. Vrací přehled o změnách. */
export function applyDelete(targetRoot, layerName) {
  const layerDir = findActiveLayerDir(layerName, targetRoot);
  if (!layerDir) throw new Error(`Vrstva '${layerName}' není aktivní v src/.`);

  const resolved = path.basename(layerDir);
  const slug = layerSlug(resolved);
  const retiredDir = path.join(path.dirname(layerDir), `${RETIRED_PREFIX}${resolved}`);

  if (fs.existsSync(retiredDir)) {
    throw new Error(`Vyřazená složka už existuje: ${path.relative(targetRoot, retiredDir)}.`);
  }

  fs.renameSync(layerDir, retiredDir);

  const note = [
    `# Vyřazená vrstva: ${resolved}`,
    '',
    'Tato vrstva byla vyřazena skriptem `delete-layer` (soft retire).',
    'Obsah složky je záměrně zachovaný, ale vrstva už není součástí živé mapy:',
    '',
    '- startuje prefixem `_retired-`, takže ji sync, verify ani CI neberou jako aktivní,',
    '- byla odebrána z `.scaffold.json` a z odkazů v instrukcích.',
    '',
    'Pokud ji chceš opravdu smazat, smaž celou tuto složku ručně (hard delete).',
    '',
  ].join('\n');

  const notePath = path.join(retiredDir, 'RETIRED.md');
  if (!fs.existsSync(notePath)) writeText(notePath, note);

  const configUpdated = updateConfigLayers(targetRoot, (layers) => layers.filter((item) => item !== resolved));

  for (const relative of MAP_FILES) {
    const file = path.join(targetRoot, relative);
    if (fs.existsSync(file)) replaceInFile(file, (text) => pruneLayerReferences(text, resolved, slug));
  }

  for (const other of activeLayerNames(targetRoot)) {
    const file = path.join(targetRoot, 'src', other, 'AGENTS.md');
    if (fs.existsSync(file)) replaceInFile(file, (text) => pruneLayerReferences(text, resolved, slug));
  }

  const removedArtifacts = removeRootArtifacts(targetRoot, slug);

  return { layer: resolved, retiredDir: path.relative(targetRoot, retiredDir).split(path.sep).join('/'), configUpdated, removedArtifacts };
}

/** Lidsky čitelný plán rename operace pro `--dry-run`. */
export function describeRename(targetRoot, oldName, newName) {
  const layerDir = findActiveLayerDir(oldName, targetRoot);
  if (!layerDir) throw new Error(`Vrstva '${oldName}' není aktivní v src/.`);

  const resolvedOld = path.basename(layerDir);
  const resolvedNew = toPascalCase(newName);

  return [
    `Přejmenovat složku:  src/${resolvedOld} -> src/${resolvedNew}`,
    `Aktualizovat mapu:   .scaffold.json (layers)`,
    `Přepsat zmínky:      všechny projektové soubory (název, slug i titulek)`,
    `Přejmenovat artefakty: .cursor/rules/<slug>.mdc, .cursor/agents/<slug>-*, .cursor/skills/<slug>-*`,
  ];
}

/** Provede rename vrstvy. Vrací přehled o změnách. */
export function applyRename(targetRoot, oldName, newName) {
  const layerDir = findActiveLayerDir(oldName, targetRoot);
  if (!layerDir) throw new Error(`Vrstva '${oldName}' není aktivní v src/.`);

  const resolvedOld = path.basename(layerDir);
  const resolvedNew = toPascalCase(newName);

  if (!isActiveLayerName(resolvedNew)) {
    throw new Error(`Neplatný název vrstvy '${newName}'. Povoleno je PascalCase z písmen a číslic.`);
  }

  if (resolvedNew === resolvedOld) {
    throw new Error(`Nová vrstva je stejná jako původní ('${resolvedOld}').`);
  }

  const target = path.join(path.dirname(layerDir), resolvedNew);
  if (fs.existsSync(target)) throw new Error(`Cílová složka už existuje: src/${resolvedNew}.`);

  const oldSlug = layerSlug(resolvedOld);
  const newSlug = layerSlug(resolvedNew);

  fs.renameSync(layerDir, target);

  const configUpdated = updateConfigLayers(targetRoot, (layers) =>
    layers.map((item) => (item === resolvedOld ? resolvedNew : item)),
  );

  let touchedFiles = 0;
  for (const relative of listTextFiles(targetRoot)) {
    const file = path.join(targetRoot, relative);
    if (replaceInFile(file, (text) => renameLayerReferences(text, resolvedOld, resolvedNew))) {
      touchedFiles += 1;
    }
  }

  const renamedArtifacts = renameRootArtifacts(targetRoot, oldSlug, newSlug);

  return { oldLayer: resolvedOld, newLayer: resolvedNew, configUpdated, touchedFiles, renamedArtifacts };
}
