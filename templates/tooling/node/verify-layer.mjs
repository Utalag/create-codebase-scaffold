#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { isActiveLayerName, parseArgs, readProjectConfig, resolveLayerDir } from './lib/util.mjs';
import { t } from './lib/i18n.mjs';

/**
 * Ověří, že vrstva má povinnou strukturu a správně propojené instrukce.
 * Skript nic nezapisuje.
 *
 * Použití: node scripts/verify-layer.mjs --layer Domain
 */
const USAGE = 'node scripts/verify-layer.mjs --layer Domain';

const args = parseArgs(process.argv.slice(2));
const layerName = typeof args.layer === 'string' ? args.layer : args._[0];

if (!layerName) {
  console.error(t('verify.nameMissing', { usage: USAGE }));
  process.exit(1);
}

const layerDir = resolveLayerDir(layerName);
if (!layerDir) {
  console.error(t('verify.layerMissing', { layer: layerName }));
  process.exit(1);
}

const resolvedName = path.basename(layerDir);

if (!isActiveLayerName(resolvedName)) {
  console.error(t('verify.notActive', { layer: resolvedName }));
  process.exit(1);
}

const { machinery } = readProjectConfig();

const required = [
  'AGENTS.md',
  'README.md',
  'src',
  'tests',
  'tests/unit',
  'tests/integration',
  'docs',
  'docs/decisions',
];

if (machinery === 'full') {
  required.push('.cursor', '.cursor/rules', '.cursor/agents', '.cursor/skills', '.github');
}

const problems = [];

for (const item of required) {
  if (!fs.existsSync(path.join(layerDir, item))) {
    problems.push(t('verify.missingItem', { item }));
  }
}

const agentsFile = path.join(layerDir, 'AGENTS.md');
if (fs.existsSync(agentsFile)) {
  const text = fs.readFileSync(agentsFile, 'utf8');

  if (!text.includes('src/AGENTS.md')) {
    problems.push(t('verify.noParentLink'));
  }

  if (!/^##\s+Guardrails/m.test(text)) {
    problems.push(t('verify.noGuardrails'));
  }

  if (/__[A-Z][A-Z_]*__/.test(text) || text.includes('DOPLŇ:') || text.includes('TODO:')) {
    problems.push(t('verify.placeholders'));
  }
}

const rulesDir = path.join(layerDir, '.cursor/rules');
if (fs.existsSync(rulesDir)) {
  const rules = fs.readdirSync(rulesDir).filter((name) => name.endsWith('.mdc'));
  if (rules.length === 0) problems.push(t('verify.noRules'));
}

const agentsDir = path.join(layerDir, '.cursor/agents');
if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir).filter((name) => name.endsWith('.md'));
  if (agents.length === 0) problems.push(t('verify.noAgents'));
}

if (problems.length > 0) {
  console.error(t('verify.failed', { layer: resolvedName }));
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(t('verify.ok', { layer: resolvedName }));
process.exit(0);
