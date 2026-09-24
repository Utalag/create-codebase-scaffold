#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readProjectConfig, resolveLayerDir } from './lib/util.mjs';

/**
 * Ověří, že vrstva má povinnou strukturu a správně propojené instrukce.
 * Skript nic nezapisuje.
 *
 * Použití: node scripts/verify-layer.mjs --layer Domain
 */
const args = parseArgs(process.argv.slice(2));
const layerName = typeof args.layer === 'string' ? args.layer : args._[0];

if (!layerName) {
  console.error('Chyba: chybí název vrstvy. Použití: node scripts/verify-layer.mjs --layer Domain');
  process.exit(1);
}

const layerDir = resolveLayerDir(layerName);
if (!layerDir) {
  console.error(`Chyba: vrstva '${layerName}' neexistuje v src/.`);
  process.exit(1);
}

const resolvedName = path.basename(layerDir);
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
    problems.push(`chybí povinná položka: ${item}`);
  }
}

const agentsFile = path.join(layerDir, 'AGENTS.md');
if (fs.existsSync(agentsFile)) {
  const text = fs.readFileSync(agentsFile, 'utf8');

  if (!text.includes('src/AGENTS.md')) {
    problems.push('AGENTS.md neodkazuje na rodičovská pravidla (src/AGENTS.md)');
  }

  if (!/^##\s+Guardrails/m.test(text)) {
    problems.push("AGENTS.md neobsahuje sekci '## Guardrails'");
  }

  if (/__[A-Z][A-Z_]*__/.test(text) || text.includes('DOPLŇ:')) {
    problems.push('AGENTS.md obsahuje nevyplněné placeholdery šablony');
  }
}

const rulesDir = path.join(layerDir, '.cursor/rules');
if (fs.existsSync(rulesDir)) {
  const rules = fs.readdirSync(rulesDir).filter((name) => name.endsWith('.mdc'));
  if (rules.length === 0) problems.push("'.cursor/rules' neobsahuje žádné .mdc pravidlo");
}

const agentsDir = path.join(layerDir, '.cursor/agents');
if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir).filter((name) => name.endsWith('.md'));
  if (agents.length === 0) problems.push("'.cursor/agents' neobsahuje žádného subagenta");
}

if (problems.length > 0) {
  console.error(`Vrstva '${resolvedName}' neprošla kontrolou:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Vrstva '${resolvedName}' je v pořádku (struktura i propojení instrukcí).`);
process.exit(0);
