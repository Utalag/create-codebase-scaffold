import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { PRESETS, PRESET_IDS, presetInfo } from './presets.js';
import { parseLayerList } from './naming.js';
import { generateProject } from './generator.js';
import { createPrompt } from './prompts.js';
import { DEFAULT_LANG, LANGS, createTranslator, normalizeLang } from './i18n.js';
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
const VALUE_OPTIONS = new Set([
  'target',
  'name',
  'lang',
  'preset',
  'layers',
  'tooling',
  'machinery',
  'agents',
]);

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

/** Přečte hodnotu `--lang` z argv ještě před plným parsováním (pro jazyk chyb). */
function peekLang(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const match = /^--?lang=(.*)$/.exec(token);
    if (match) return match[1];
    if (token === '--lang' || token === '-lang') return argv[index + 1];
  }
  return DEFAULT_LANG;
}

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
      const t = createTranslator(normalizeLang(peekLang(argv)));
      throw new Error(t('error.unknownOption', { token }));
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

function printHelp(lang) {
  const t = createTranslator(lang);
  process.stdout.write(
    t('help.body', {
      version: packageJson.version,
      presets: PRESET_IDS.join(', '),
      toolings: TOOLINGS.join(' | '),
      machineries: MACHINERIES.join(' | '),
      ecosystems: ECOSYSTEMS.join(', '),
    }),
  );
}

function printList(lang) {
  const t = createTranslator(lang);
  process.stdout.write(`\n${t('list.title')}\n\n`);
  for (const id of PRESET_IDS) {
    const preset = PRESETS[id];
    const label = presetInfo(preset, lang).label;
    const layers = preset.layers ? preset.layers.join(', ') : t('list.customLayers');
    process.stdout.write(`  ${id.padEnd(16)} ${label}\n`);
    process.stdout.write(`  ${''.padEnd(16)} ${layers}\n\n`);
  }
}

function parseAgents(value, t) {
  if (!value || value === true) return [...DEFAULTS.agents];
  if (String(value).toLowerCase() === 'all') return [...ECOSYSTEMS];

  const requested = String(value)
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  const invalid = requested.filter((item) => !ECOSYSTEMS.includes(item));
  if (invalid.length > 0) {
    throw new Error(
      t('error.unknownEcosystem', { invalid: invalid.join(', '), allowed: ECOSYSTEMS.join(', ') }),
    );
  }

  return [...new Set(requested)];
}

function assertExists(value, allowed, label, t) {
  if (!allowed.includes(value)) {
    throw new Error(
      t('error.invalidValue', { label, value, allowed: allowed.join(', ') }),
    );
  }
}

/**
 * Vstupní bod CLI.
 *
 * @param {string[]} argv
 */
export async function run(argv) {
  const args = parseArgv(argv);

  // Jazyk se z argv vytáhne přednostně, aby i nápověda a chyby byly ve
  // zvoleném jazyce. Přesný průvodce se ptá na jazyk jako první.
  let lang = normalizeLang(typeof args.lang === 'string' ? args.lang : DEFAULT_LANG);
  const t = () => createTranslator(lang);

  if (args.help || args.h === true) {
    printHelp(lang);
    return;
  }

  if (args.version || args.v === true) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }

  if (args.list === true) {
    printList(lang);
    return;
  }

  const yes = Boolean(args.y) || Boolean(args.yes);
  let target = typeof args.target === 'string' ? args.target : args._[0];
  const explicitLang = typeof args.lang === 'string';
  let presetId = typeof args.preset === 'string' ? args.preset : undefined;
  let layers = typeof args.layers === 'string' ? args.layers : undefined;
  let tooling = typeof args.tooling === 'string' ? args.tooling : undefined;
  let machinery = typeof args.machinery === 'string' ? args.machinery : undefined;
  let agents = args.agents !== undefined ? parseAgents(args.agents, t()) : undefined;

  const interactive = !yes && process.stdin.isTTY;
  const missing =
    !target || (!presetId && !layers) || !tooling || !machinery || !agents || !explicitLang;

  if (interactive && missing) {
    // Jazyk jako úplně první otázka, aby byl celý průvodce v zvoleném jazyce.
    if (!explicitLang) {
      lang = await askLanguage();
    }

    const prompt = createPrompt(lang);
    try {
      if (!target) {
        target = await prompt.text(createTranslator(lang)('target.question'), '.');
      }

      if (!presetId && !layers) {
        const tt = createTranslator(lang);
        const choice = await prompt.select(
          tt('arch.question'),
          [
            ...PRESET_IDS.filter((id) => id !== 'custom').map((id) => ({
              id,
              label: `${presetInfo(PRESETS[id], lang).label} — ${PRESETS[id].layers.join(', ')}`,
            })),
            { id: 'custom', label: tt('arch.custom') },
          ],
          DEFAULTS.preset,
        );

        if (choice === 'custom') {
          layers = await prompt.text(tt('layers.question'), '');
        } else {
          presetId = choice;
        }
      }

      if (!tooling) {
        const tt = createTranslator(lang);
        tooling = await prompt.select(
          tt('tooling.question'),
          [
            { id: 'node', label: tt('tooling.node') },
            { id: 'pwsh', label: tt('tooling.pwsh') },
          ],
          DEFAULTS.tooling,
        );
      }

      if (!machinery) {
        const tt = createTranslator(lang);
        machinery = await prompt.select(
          tt('machinery.question'),
          [
            { id: 'full', label: tt('machinery.full') },
            { id: 'lean', label: tt('machinery.lean') },
          ],
          DEFAULTS.machinery,
        );
      }

      if (!agents) {
        const tt = createTranslator(lang);
        agents = await prompt.multiSelect(
          tt('agents.question'),
          [
            { id: 'cursor', label: tt('agents.cursor') },
            { id: 'copilot', label: tt('agents.copilot') },
            { id: 'codex', label: tt('agents.codex') },
            { id: 'claude', label: tt('agents.claude') },
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

  assertExists(tooling, TOOLINGS, '--tooling', t());
  assertExists(machinery, MACHINERIES, '--machinery', t());
  assertExists(presetId, PRESET_IDS, '--preset', t());
  if (explicitLang) assertExists(args.lang, LANGS, '--lang', t());

  const parsedLayers = layers ? parseLayerList(layers, lang) : undefined;
  const resolvedTarget = path.resolve(process.cwd(), target);

  if (fs.existsSync(resolvedTarget) && !fs.statSync(resolvedTarget).isDirectory()) {
    throw new Error(t()('error.targetNotDirectory', { target: resolvedTarget }));
  }

  const projectName =
    (typeof args.name === 'string' ? args.name : undefined) ||
    path.basename(resolvedTarget) ||
    'my-project';

  const ci = args['no-ci'] === true ? false : args.ci === true ? true : DEFAULTS.ci;
  const dryRun = args['dry-run'] === true;
  const force = args.force === true || args.overwrite === true;

  const tr = createTranslator(lang);
  process.stdout.write(`\n${tr('report.generating')}\n\n`);

  const result = generateProject(
    {
      target: resolvedTarget,
      projectName,
      presetId,
      layers: parsedLayers,
      lang,
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
    process.stdout.write(`\n  ${tr(gitResult.status === 0 ? 'report.gitInitDone' : 'report.gitInitFailed')}\n`);
  }

  const { report } = result;
  const layerList = result.architecture.layerNames.join(', ');
  const yesNo = (value) => (value ? tr('report.yes') : tr('report.no'));

  process.stdout.write(`\n${tr(dryRun ? 'report.planned' : 'report.done')}\n`);
  process.stdout.write(`  ${tr('report.target')}:           ${resolvedTarget}\n`);
  process.stdout.write(`  ${tr('report.architecture')}:  ${result.architecture.label} (${layerList})\n`);
  process.stdout.write(`  ${tr('report.tooling')}:       ${result.tooling}\n`);
  process.stdout.write(`  ${tr('report.machinery')}:   ${result.machinery}\n`);
  process.stdout.write(`  ${tr('report.agents')}:        ${result.agents.join(', ')}\n`);
  process.stdout.write(`  ${tr('report.ci')}:            ${yesNo(result.ci)}\n`);
  process.stdout.write(`  ${tr('report.language')}:      ${result.lang}\n`);
  process.stdout.write('\n');
  process.stdout.write(`  ${tr('report.created')}:     ${report.created.length} ${tr('report.files')}\n`);
  process.stdout.write(`  ${tr('report.skipped')}:    ${report.skipped.length} ${tr('report.files')}\n`);
  process.stdout.write(`  ${tr('report.overwritten')}:      ${report.overwritten.length} ${tr('report.files')}\n`);

  const newLayerCommand =
    tooling === 'node'
      ? 'node scripts/new-layer.mjs --name Billing'
      : 'pwsh -File scripts/new-layer.ps1 -Name Billing';

  process.stdout.write(`\n${tr('report.nextSteps')}\n`);
  process.stdout.write(`  cd ${path.relative(process.cwd(), resolvedTarget) || '.'}\n`);
  process.stdout.write(`  ${newLayerCommand}\n`);
  process.stdout.write(`  ${tr('report.detailsHint')}\n\n`);
}

/** Bilingvní otázka na jazyk — musí být čitelná v obou jazycích. */
async function askLanguage() {
  const cs = createTranslator('cs');
  const en = createTranslator('en');
  const prompt = createPrompt('cs');
  try {
    const choice = await prompt.select(
      `${cs('lang.question')} / ${en('lang.question')}`,
      [
        { id: 'cs', label: cs('lang.cs') },
        { id: 'en', label: en('lang.en') },
      ],
      DEFAULT_LANG,
    );
    return normalizeLang(choice);
  } finally {
    prompt.close();
  }
}
