import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { PRESETS, PRESET_IDS } from './presets.js';
import { parseLayerList } from './naming.js';
import { generateProject } from './generator.js';
import { createPrompt } from './prompts.js';
import { readText } from './fs-utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readText(path.join(here, '..', 'package.json')));

const TOOLINGS = ['pwsh', 'node'];
const MACHINERIES = ['full', 'lean'];
const ECOSYSTEMS = ['cursor', 'copilot', 'codex', 'claude'];

const DEFAULTS = {
  preset: 'clean',
  tooling: 'node',
  machinery: 'full',
  agents: ['cursor', 'codex'],
  ci: true,
};

/** Volby, které vždy očekávají hodnotu, i kdyby začínala pomlčkou. */
const VALUE_OPTIONS = new Set(['target', 'name', 'preset', 'layers', 'tooling', 'machinery', 'agents']);

/** Všechny volby, které CLI zná. Cokoli jiného je překlep a skončí chybou. */
const KNOWN_OPTIONS = new Set([
  ...VALUE_OPTIONS,
  'ci',
  'no-ci',
  'dry-run',
  'force',
  'overwrite',
  'git-init',
  'y',
  'yes',
  'list',
  'help',
  'h',
  'version',
  'v',
]);

function parseArgv(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      args._.push(token);
      continue;
    }

    const bare = token.replace(/^--?/, '');
    const [key, inline] = bare.split('=');

    if (!KNOWN_OPTIONS.has(key)) {
      throw new Error(`Neznámá volba: '${token}'. Zkus --help.`);
    }

    if (inline !== undefined) {
      args[key] = inline;
      continue;
    }

    const next = argv[index + 1];
    const consumesValue = VALUE_OPTIONS.has(key)
      ? next !== undefined
      : next !== undefined && !next.startsWith('-');

    if (consumesValue) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write(`
create-codebase-scaffold ${packageJson.version}

Vygeneruje do cílové složky vrstvený projekt připravený pro AI agenty.

Balíček zatím NENÍ publikovaný v npm registru, proto se generátor spouští
ze zdrojů (klon repozitáře). Až bude publikovaný, půjde i přes npx.

Použití:
  node bin/create.js <slozka> [volby]
  npx create-codebase-scaffold <slozka> [volby]   # až po publikaci na npm

Volby:
  --target <dir>          Cílová složka (totéž jako poziční argument).
  --name <nazev>          Název projektu (výchozí: název cílové složky).
  --preset <id>           Architektura: ${PRESET_IDS.join(', ')}.
  --layers <A,B,C>        Volný seznam vrstev (PascalCase); přebíjí preset.
  --tooling <id>          Skripty projektu: ${TOOLINGS.join(' | ')} (výchozí: node).
  --machinery <id>        Rozsah agentní konfigurace: ${MACHINERIES.join(' | ')}.
                          full = vlastní .cursor vrstvy + sync zrcadlo + hooky
                          lean = jen root .cursor bez zrcadla
  --agents <a,b>          Ekosystémy instrukcí: ${ECOSYSTEMS.join(', ')}, nebo "all".
                          codex používá AGENTS.md, který se generuje vždy.
  --ci / --no-ci          Vygenerovat CI workflow (výchozí: ano).
  --dry-run               Jen vypsat, co by se zapsalo.
  --force, --overwrite    Přepsat i existující soubory (výchozí: nikdy).
  --git-init              Po vygenerování spustit "git init".
  -y, --yes               Neptat se, použít výchozí hodnoty.
  --list                  Vypsat dostupné presety a skončit.
  -h, --help              Tato nápověda.
  -v, --version           Verze.

Nedestruktivnost:
  Existující soubor se nikdy nepřepíše, dokud nezadáš --force. Verifikační
  a testovací skripty projektu nikdy nezapisují.

Příklady:
  node bin/create.js my-app
  node bin/create.js my-api --preset hexagonal --tooling pwsh
  node bin/create.js app --layers Domain,Application,Adapters,Shared
`);
}

function printList() {
  process.stdout.write('\nDostupné presety:\n\n');
  for (const id of PRESET_IDS) {
    const preset = PRESETS[id];
    const layers = preset.layers ? preset.layers.join(', ') : '(vlastní seznam vrstev)';
    process.stdout.write(`  ${id.padEnd(16)} ${preset.label}\n`);
    process.stdout.write(`  ${''.padEnd(16)} ${layers}\n\n`);
  }
}

function parseAgents(value) {
  if (!value || value === true) return [...DEFAULTS.agents];
  if (String(value).toLowerCase() === 'all') return [...ECOSYSTEMS];

  const requested = String(value)
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  const invalid = requested.filter((item) => !ECOSYSTEMS.includes(item));
  if (invalid.length > 0) {
    throw new Error(
      `Neznámý ekosystém: ${invalid.join(', ')}. Povoleno: ${ECOSYSTEMS.join(', ')} nebo "all".`,
    );
  }

  return [...new Set(requested)];
}

function assertExists(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new Error(`Neplatná hodnota pro ${label}: '${value}'. Povoleno: ${allowed.join(', ')}.`);
  }
}

/**
 * Vstupní bod CLI.
 *
 * @param {string[]} argv
 */
export async function run(argv) {
  const args = parseArgv(argv);

  if (args.help || args.h === true) {
    printHelp();
    return;
  }

  if (args.version || args.v === true) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }

  if (args.list === true) {
    printList();
    return;
  }

  const yes = Boolean(args.y) || Boolean(args.yes);
  let target = typeof args.target === 'string' ? args.target : args._[0];
  let presetId = typeof args.preset === 'string' ? args.preset : undefined;
  let layers = typeof args.layers === 'string' ? args.layers : undefined;
  let tooling = typeof args.tooling === 'string' ? args.tooling : undefined;
  let machinery = typeof args.machinery === 'string' ? args.machinery : undefined;
  let agents = args.agents !== undefined ? parseAgents(args.agents) : undefined;

  const interactive = !yes && process.stdin.isTTY;
  const missing = !target || (!presetId && !layers) || !tooling || !machinery || !agents;

  if (interactive && missing) {
    const prompt = createPrompt();
    try {
      if (!target) {
        target = await prompt.text('Cílová složka', '.');
      }

      if (!presetId && !layers) {
        const choice = await prompt.select(
          'Architektura projektu',
          [
            ...PRESET_IDS.filter((id) => id !== 'custom').map((id) => ({
              id,
              label: `${PRESETS[id].label} — ${PRESETS[id].layers.join(', ')}`,
            })),
            { id: 'custom', label: 'Vlastní seznam vrstev (PascalCase)' },
          ],
          DEFAULTS.preset,
        );

        if (choice === 'custom') {
          layers = await prompt.text('Seznam vrstev (např. Domain,Application,Adapters,Shared)', '');
        } else {
          presetId = choice;
        }
      }

      if (!tooling) {
        tooling = await prompt.select(
          'Skripty projektu',
          [
            { id: 'node', label: 'Node.js (mjs)' },
            { id: 'pwsh', label: 'PowerShell (pwsh)' },
          ],
          DEFAULTS.tooling,
        );
      }

      if (!machinery) {
        machinery = await prompt.select(
          'Rozsah agentní konfigurace',
          [
            { id: 'full', label: 'Plná — vlastní .cursor vrstvy, sync zrcadlo, hooky' },
            { id: 'lean', label: 'Odlehčená — jen root .cursor bez zrcadla' },
          ],
          DEFAULTS.machinery,
        );
      }

      if (!agents) {
        agents = await prompt.multiSelect(
          'Agentní ekosystémy (Enter = výchozí)',
          [
            { id: 'cursor', label: 'Cursor (.cursor/rules, .cursor/agents)' },
            { id: 'copilot', label: 'GitHub Copilot (.github/copilot-instructions.md)' },
            { id: 'codex', label: 'Codex (AGENTS.md)' },
            { id: 'claude', label: 'Claude (CLAUDE.md, .claude/skills)' },
          ],
          DEFAULTS.agents,
        );
      }
    } finally {
      prompt.close();
    }
  }

  target = target || '.';
  tooling = tooling || DEFAULTS.tooling;
  machinery = machinery || DEFAULTS.machinery;
  agents = agents || [...DEFAULTS.agents];
  presetId = presetId || (layers ? 'custom' : DEFAULTS.preset);

  assertExists(tooling, TOOLINGS, '--tooling');
  assertExists(machinery, MACHINERIES, '--machinery');
  assertExists(presetId, PRESET_IDS, '--preset');

  const parsedLayers = layers ? parseLayerList(layers) : undefined;
  const resolvedTarget = path.resolve(process.cwd(), target);

  if (fs.existsSync(resolvedTarget) && !fs.statSync(resolvedTarget).isDirectory()) {
    throw new Error(`Cíl '${resolvedTarget}' existuje a není to složka.`);
  }

  const projectName =
    (typeof args.name === 'string' ? args.name : undefined) ||
    path.basename(resolvedTarget) ||
    'my-project';

  const ci = args['no-ci'] === true ? false : args.ci === true ? true : DEFAULTS.ci;
  const dryRun = args['dry-run'] === true;
  const force = args.force === true || args.overwrite === true;

  process.stdout.write('\nGeneruji projekt...\n\n');

  const result = generateProject(
    {
      target: resolvedTarget,
      projectName,
      presetId,
      layers: parsedLayers,
      tooling,
      machinery,
      agents,
      ci,
      force,
      dryRun,
    },
    { log: (message) => process.stdout.write(`${message}\n`) },
  );

  if (args['git-init'] === true && !dryRun) {
    const gitResult = spawnSync('git', ['init'], { cwd: resolvedTarget, stdio: 'ignore' });
    if (gitResult.status === 0) {
      process.stdout.write('\n  git init: hotovo\n');
    } else {
      process.stdout.write('\n  git init: nepodařilo se (git není dostupný?)\n');
    }
  }

  const { report } = result;
  const layerList = result.architecture.layerNames.join(', ');

  process.stdout.write(`\n${dryRun ? 'Plán (dry-run)' : 'Hotovo'}\n`);
  process.stdout.write(`  Cíl:           ${resolvedTarget}\n`);
  process.stdout.write(`  Architektura:  ${result.architecture.label} (${layerList})\n`);
  process.stdout.write(`  Tooling:       ${result.tooling}\n`);
  process.stdout.write(`  Konfigurace:   ${result.machinery}\n`);
  process.stdout.write(`  Agenti:        ${result.agents.join(', ')}\n`);
  process.stdout.write(`  CI:            ${result.ci ? 'ano' : 'ne'}\n`);
  process.stdout.write('\n');
  process.stdout.write(`  Vytvořeno:     ${report.created.length} souborů\n`);
  process.stdout.write(`  Přeskočeno:    ${report.skipped.length} souborů\n`);
  process.stdout.write(`  Přepsáno:      ${report.overwritten.length} souborů\n`);

  const newLayerCommand =
    tooling === 'node'
      ? 'node scripts/new-layer.mjs --name Billing'
      : 'pwsh -File scripts/new-layer.ps1 -Name Billing';

  process.stdout.write('\nDalší kroky:\n');
  process.stdout.write(`  cd ${path.relative(process.cwd(), resolvedTarget) || '.'}\n`);
  process.stdout.write(`  ${newLayerCommand}\n`);
  process.stdout.write('  Podrobnosti najdeš v README.md a scripts/README.md\n\n');
}
