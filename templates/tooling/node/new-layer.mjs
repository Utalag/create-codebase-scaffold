#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  expandTokens,
  layerSlug,
  layerTitle,
  parseArgs,
  projectRoot,
  readJson,
  readProjectConfig,
  readText,
  toPascalCase,
  walkFiles,
  writeText,
} from './lib/util.mjs';

/**
 * Založí novou architektonickou vrstvu v src/.
 *
 * Vygeneruje anatomii vrstvy ze šablony scripts/layer-template/. Guardrails
 * a směr závislostí bere z archetypu vrstvy (scripts/layer-presets.json).
 *
 * Skript je nedestruktivní: existující soubor nikdy nepřepíše. Přepsání
 * vynutíš přepínačem --force. Existující soubory projektu (src/AGENTS.md,
 * docs/layers.md) needituje — jen vypíše upozornění.
 *
 * Použití: node scripts/new-layer.mjs --name Billing
 */
const args = parseArgs(process.argv.slice(2));
const inputName = typeof args.name === 'string' ? args.name : args._[0];
const force = Boolean(args.force);

if (!inputName) {
  console.error('Chyba: chybí název vrstvy. Použití: node scripts/new-layer.mjs --name Billing');
  process.exit(1);
}

const layer = toPascalCase(inputName);
if (!/^[A-Z][A-Za-z0-9]*$/.test(layer)) {
  console.error(
    `Chyba: neplatný název vrstvy '${inputName}'. Povoleno je PascalCase z písmen a číslic, ` +
      "např. 'Billing' nebo 'AntiFraud'.",
  );
  process.exit(1);
}

const scriptsDir = path.join(projectRoot, 'scripts');
const presetsPath = path.join(scriptsDir, 'layer-presets.json');
const templateDir = path.join(scriptsDir, 'layer-template');

if (!fs.existsSync(presetsPath)) {
  console.error(`Chyba: chybí ${presetsPath} — nelze zjistit guardrails vrstvy.`);
  process.exit(1);
}

if (!fs.existsSync(templateDir)) {
  console.error(`Chyba: chybí ${templateDir} — nelze vygenerovat vrstvu.`);
  process.exit(1);
}

const slug = layerSlug(layer);
const presets = readJson(presetsPath);
const archetype = presets.archetypes[slug] ?? presets.archetypes.default;

const srcRoot = path.join(projectRoot, 'src');
const existingLayers = fs.existsSync(srcRoot)
  ? fs.readdirSync(srcRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];

const knownArchetype = archetype.canonicalDeps !== null && archetype.canonicalDeps !== undefined;

const allowedDeps = knownArchetype
  ? (archetype.canonicalDeps ?? []).filter((dep) => dep !== layer && existingLayers.includes(dep))
  : [];

let dependsOn;
if (!knownArchetype) {
  dependsOn =
    'DOPLŇ: Vyjmenuj, které vrstvy smí tato vrstva importovat a které nikdy. ' +
    'Odvoď to od směru závislostí v `src/AGENTS.md`.';
} else if (allowedDeps.length === 0) {
  dependsOn = 'Nesmí záviset na žádné jiné vrstvě.';
} else {
  dependsOn = `Smí záviset pouze na ${allowedDeps.map((name) => `\`${name}\``).join(', ')}.`;
}

const tokens = {
  LAYER: layer,
  LAYER_SLUG: slug,
  LAYER_TITLE: layerTitle(layer),
  RESPONSIBILITY: archetype.responsibility,
  GUARDRAILS: archetype.guardrails.map((item) => `- ${item}`).join('\n'),
  DEPENDS_ON: dependsOn,
  YEAR: String(new Date().getFullYear()),
};

const layerDir = path.join(srcRoot, layer);
const created = [];
const skipped = [];

/** Vyrenderuje obsah šablony: tokeny vrstvy a zástupný symbol <Layer>. */
function render(text) {
  return expandTokens(text, tokens).replaceAll('<Layer>', layer);
}

function write(target, content) {
  if (fs.existsSync(target) && !force) {
    skipped.push(target);
    return;
  }

  writeText(target, content);
  created.push(target);
}

for (const relative of walkFiles(templateDir)) {
  const targetRelative = render(relative);
  const target = targetRelative.startsWith('__root__/')
    ? path.join(projectRoot, targetRelative.slice('__root__/'.length))
    : path.join(layerDir, targetRelative);

  write(target, render(readText(path.join(templateDir, relative))));
}

for (const placeholder of ['src', 'tests/unit', 'tests/integration']) {
  const dir = path.join(layerDir, placeholder);
  fs.mkdirSync(dir, { recursive: true });

  const hasContent = fs.readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isFile());
  if (!hasContent) {
    const gitkeep = path.join(dir, '.gitkeep');
    if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '', 'utf8');
  }
}

console.log('');
console.log(`Vrstva '${layer}' byla založena: src/${layer}`);

if (skipped.length > 0) {
  console.log(`Přeskočeno existujících souborů: ${skipped.length} (přepíše jen --force).`);
}

if (!knownArchetype) {
  console.log('');
  console.log(`Pozor: použit obecný archetyp. Nahraď markery DOPLŇ: v src/${layer}/AGENTS.md.`);
}

console.log('');
console.log('Další kroky:');

const steps = [
  `Uprav guardrails:          src/${layer}/AGENTS.md`,
  'Doplň vrstvu do pravidel:  src/AGENTS.md a docs/layers.md (skript je needituje)',
];

if (readProjectConfig().machinery === 'full') {
  steps.push('Synchronizuj konfiguraci:  node scripts/sync-agent-config.mjs');
}

steps.push(`Ověř strukturu:            node scripts/verify-layer.mjs --layer ${layer}`);
steps.push(`Spusť testy:               node scripts/test-layer.mjs --layer ${layer}`);

steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
console.log('');
