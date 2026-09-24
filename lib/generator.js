import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARCHETYPES, buildArchitecture } from './presets.js';
import {
  applyConditionals,
  bulletList,
  buildCommands,
  dependencyMermaid,
  forbiddenRules,
  layerRoles,
  layerTable,
  renderTemplate,
  withLayer,
} from './render.js';
import { createWriter, readText } from './fs-utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.join(here, '..', 'templates');
const packageJson = JSON.parse(readText(path.join(here, '..', 'package.json')));

/** Soubory, které má každá vrstva bez ohledu na konfiguraci. */
const LAYER_CORE_FILES = [
  'AGENTS.md',
  'README.md',
  'docs/README.md',
  'docs/decisions/0001-record-architecture-decisions.md',
];

/** Soubory navíc u plné konfigurace (vlastní zdroj agentní konfigurace vrstvy). */
const LAYER_FULL_FILES = [
  '.cursor/rules/standards.mdc',
  '.cursor/agents/dev.md',
  '.cursor/skills/workflow/SKILL.md',
  '.github/actions/setup-layer/action.yml',
  '.github/workflows/layer.yml',
];

/**
 * Cílový soubor -> název šablony, když se oba liší.
 *
 * npm při balení vynechává soubory `.gitignore`, takže šablona je uložená bez
 * tečky a teprve generátor ji zapíše pod správným jménem. Bez toho by balíček
 * žádný `.gitignore` nevygeneroval.
 */
const TEMPLATE_ALIASES = new Map([['.gitignore', 'gitignore']]);

/** Cesta k šabloně v `templates/project/` pro daný cílový soubor. */
function projectTemplateSource(relative) {
  return TEMPLATE_ALIASES.get(relative) ?? relative;
}

/** Zkrácený popis odpovědnosti pro stromovou strukturu v README. */
function shortResponsibility(text, max = 58) {
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  const firstClause = cleaned.split(/[.:,]/)[0].trim();
  const candidate = firstClause.length >= 12 ? firstClause : cleaned;

  return candidate.length > max ? `${candidate.slice(0, max - 1).trimEnd()}…` : candidate;
}

function buildProjectTree(architecture, flags) {
  const pad = (value, width) => value.padEnd(width, ' ');
  const lines = [
    pad('AGENTS.md', 23) + '# instrukce pro agenty',
    pad('README.md', 23) + '# tento soubor',
    pad('.editorconfig', 23) + '# konvence formátování',
    pad('.gitignore', 23) + '# co se necommituje',
    pad('.scaffold.json', 23) + '# konfigurace projektu',
    'src/',
    pad('  AGENTS.md', 23) + '# společná pravidla všech vrstev',
  ];

  for (const layer of architecture.layers) {
    lines.push(pad(`  ${layer.name}/`, 23) + `# ${shortResponsibility(layer.responsibility)}`);
  }

  lines.push(pad('scripts/', 23) + '# skripty pro správu vrstev');
  lines.push(pad('docs/', 23) + '# projektová dokumentace');

  if (flags.cursor) lines.push(pad('.cursor/', 23) + '# agentní konfigurace');
  if (flags.ci) lines.push(pad('.github/workflows/', 23) + '# CI');

  return lines.join('\n');
}

function buildGlobalContext({ projectName, architecture, flags, commands, tooling, year }) {
  return {
    PROJECT_NAME: projectName,
    YEAR: String(year),
    ARCH_LABEL: architecture.label,
    ARCH_DESCRIPTION: architecture.description,
    LAYER_LIST: architecture.layerNames.map((name) => `\`${name}\``).join(', '),
    LAYER_TABLE: layerTable(architecture),
    LAYER_ROLES: layerRoles(architecture),
    DEPENDENCY_MERMAID: dependencyMermaid(architecture),
    DEPENDENCY_RULES: forbiddenRules(architecture),
    NEW_LAYER_CMD: commands.newLayer,
    VERIFY_CMD: commands.verifyLayer,
    TEST_CMD: commands.testLayer,
    SYNC_CMD: commands.syncConfig,
    SYNC_CHECK_CMD: commands.syncConfigCheck,
    SCRIPT_EXT: tooling === 'node' ? 'mjs' : 'ps1',
    PROJECT_TREE: buildProjectTree(architecture, flags),
    EXAMPLE_LAYER_1: architecture.layerNames[0] ?? 'Domain',
    EXAMPLE_LAYER_2: architecture.layerNames[1] ?? architecture.layerNames[0] ?? 'Shared',
    HOOK_COMMAND:
      tooling === 'node'
        ? 'node .cursor/hooks/sync-on-edit.mjs'
        : 'pwsh -NoProfile -File .cursor/hooks/sync-on-edit.ps1',
  };
}

function buildLayerContext(layer, commands, globalContext) {
  return {
    ...globalContext,
    LAYER: layer.name,
    LAYER_SLUG: layer.slug,
    LAYER_TITLE: layer.title,
    RESPONSIBILITY: layer.responsibility,
    GUARDRAILS: bulletList(layer.guardrails),
    DEPENDS_ON: layer.dependsOnProse,
    TEST_CMD: withLayer(commands.testLayer, layer.name),
    VERIFY_CMD: withLayer(commands.verifyLayer, layer.name),
  };
}

/** Vyrenderuje šablonu: nejdřív podmínky, pak tokeny. */
function renderTemplateFile(relativeTemplatePath, context, flags) {
  const absolute = path.join(templatesRoot, relativeTemplatePath);
  const text = readText(absolute);

  try {
    return renderTemplate(applyConditionals(text, flags), context);
  } catch (error) {
    error.message = `Šablona ${relativeTemplatePath}: ${error.message}`;
    throw error;
  }
}

function buildPresetsJson() {
  const archetypes = {};

  for (const [key, value] of Object.entries(ARCHETYPES)) {
    archetypes[key] = {
      responsibility: value.responsibility,
      canonicalDeps: value.canonicalDeps,
      guardrails: [...value.guardrails],
    };
  }

  return `${JSON.stringify({ archetypes }, null, 2)}\n`;
}

/**
 * Vygeneruje projekt do cílové složky.
 *
 * @param {{
 *   target: string, projectName: string, presetId: string, layers?: string[],
 *   tooling: 'pwsh'|'node', machinery: 'full'|'lean', agents: string[],
 *   ci: boolean, force?: boolean, dryRun?: boolean, year?: number
 * }} options
 * @param {{ log?: (message: string) => void }} [io]
 */
export function generateProject(options, io = {}) {
  const log = io.log ?? (() => {});

  const {
    target,
    projectName,
    presetId,
    layers,
    tooling,
    machinery,
    agents,
    ci,
    force = false,
    dryRun = false,
    year = new Date().getFullYear(),
  } = options;

  const architecture = buildArchitecture({ presetId, layers });
  const commands = buildCommands(tooling);

  const flags = {
    full: machinery === 'full',
    tooling_pwsh: tooling === 'pwsh',
    tooling_node: tooling === 'node',
    cursor: agents.includes('cursor'),
    copilot: agents.includes('copilot'),
    claude: agents.includes('claude'),
    codex: agents.includes('codex'),
    ci: Boolean(ci),
  };

  const globalContext = buildGlobalContext({
    projectName,
    architecture,
    flags,
    commands,
    tooling,
    year,
  });

  const writer = createWriter({ targetRoot: target, dryRun, overwrite: force, log });

  // --- A. Kořenové soubory projektu -----------------------------------------
  const rootFiles = [
    'AGENTS.md',
    'README.md',
    '.editorconfig',
    '.gitignore',
    'src/AGENTS.md',
    'docs/README.md',
    'docs/layers.md',
  ];

  if (flags.full) rootFiles.push('docs/agent-config.md');

  for (const relative of rootFiles) {
    writer.write(
      relative,
      renderTemplateFile(`project/${projectTemplateSource(relative)}`, globalContext, flags),
    );
  }

  const scaffoldConfig = {
    generator: 'create-codebase-scaffold',
    version: packageJson.version,
    projectName,
    architecture: architecture.id,
    layers: architecture.layerNames,
    tooling,
    machinery,
    agents,
    ci: Boolean(ci),
  };

  writer.write('.scaffold.json', `${JSON.stringify(scaffoldConfig, null, 2)}\n`);

  // --- B. Skripty -----------------------------------------------------------
  const toolingDir = `tooling/${tooling}`;
  const readmeNames = { 'README.md': 'README.md', 'README.cs.md': 'README.cs.md' };

  for (const [source, targetName] of Object.entries(readmeNames)) {
    writer.write(
      `scripts/${targetName}`,
      renderTemplateFile(`${toolingDir}/${source}`, globalContext, flags),
    );
  }

  const scriptFiles = fs
    .readdirSync(path.join(templatesRoot, toolingDir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(tooling === 'node' ? '.mjs' : '.ps1'))
    .map((entry) => entry.name)
    // Sync zrcadlo existuje jen u plné konfigurace — bez něj nemá smysl.
    .filter((name) => machinery === 'full' || !name.startsWith('sync-agent-config'));

  for (const name of scriptFiles) {
    writer.write(
      `scripts/${name}`,
      renderTemplateFile(`${toolingDir}/${name}`, globalContext, flags),
    );
  }

  if (tooling === 'node') {
    for (const relative of walkTemplateFiles(path.join(templatesRoot, toolingDir, 'lib'))) {
      writer.write(
        `scripts/lib/${relative}`,
        renderTemplateFile(`${toolingDir}/lib/${relative}`, globalContext, flags),
      );
    }
  }

  writer.write('scripts/layer-presets.json', buildPresetsJson());

  // --- C. Šablona vrstvy pro skript new-layer --------------------------------
  for (const [source, target] of layerTemplatePlan(flags)) {
    writer.write(
      `scripts/layer-template/${target}`,
      renderTemplateFile(source, globalContext, flags),
    );
  }

  // --- D. Vrstvy ------------------------------------------------------------
  for (const layer of architecture.layers) {
    const context = buildLayerContext(layer, commands, globalContext);

    for (const relative of LAYER_CORE_FILES) {
      writer.write(
        `src/${layer.name}/${relative}`,
        renderTemplateFile(`layer/${relative}`, context, flags),
      );
    }

    if (flags.full) {
      for (const relative of LAYER_FULL_FILES) {
        const targetRelative = relative.endsWith('layer.yml')
          ? `.github/workflows/${layer.slug}.yml`
          : relative;

        writer.write(
          `src/${layer.name}/${targetRelative}`,
          renderTemplateFile(`layer/${relative}`, context, flags),
        );
      }
    } else if (flags.cursor) {
      writer.write(
        `.cursor/rules/${layer.slug}.mdc`,
        renderTemplateFile('ecosystems/cursor/rules/layer.mdc', context, flags),
      );
      writer.write(
        `.cursor/agents/${layer.slug}-dev.md`,
        renderTemplateFile('layer/.cursor/agents/dev.md', context, flags),
      );
    }

    writer.write(`src/${layer.name}/src/.gitkeep`, '');
    writer.write(`src/${layer.name}/tests/unit/.gitkeep`, '');
    writer.write(`src/${layer.name}/tests/integration/.gitkeep`, '');
  }

  // --- E. Cursor ------------------------------------------------------------
  if (flags.cursor) {
    writer.write(
      '.cursor/rules/00-project.mdc',
      renderTemplateFile('ecosystems/cursor/rules/00-project.mdc', globalContext, flags),
    );
    writer.write(
      '.cursor/agents/architect.md',
      renderTemplateFile('ecosystems/cursor/agents/architect.md', globalContext, flags),
    );
    writer.write(
      '.cursor/skills/layer-management/SKILL.md',
      renderTemplateFile('skills/layer-management/SKILL.md', globalContext, flags),
    );
  }

  // --- F. Copilot -----------------------------------------------------------
  if (flags.copilot) {
    writer.write(
      '.github/copilot-instructions.md',
      renderTemplateFile('ecosystems/copilot/copilot-instructions.md', globalContext, flags),
    );
  }

  // --- G. Claude ------------------------------------------------------------
  if (flags.claude) {
    writer.write('CLAUDE.md', renderTemplateFile('ecosystems/claude/CLAUDE.md', globalContext, flags));
    writer.write(
      '.claude/skills/layer-management/SKILL.md',
      renderTemplateFile('skills/layer-management/SKILL.md', globalContext, flags),
    );
  }

  // --- H. Hooks (jen plná konfigurace s Cursorem) ---------------------------
  if (flags.full && flags.cursor) {
    const hookExtension = tooling === 'node' ? 'mjs' : 'ps1';

    writer.write('.cursor/hooks.json', renderTemplateFile('hooks/hooks.json', globalContext, flags));
    writer.write(
      `.cursor/hooks/sync-on-edit.${hookExtension}`,
      renderTemplateFile(`hooks/sync-on-edit.${hookExtension}`, globalContext, flags),
    );
  }

  // --- I. CI ----------------------------------------------------------------
  if (flags.ci) {
    writer.write(
      '.github/workflows/ci.yml',
      renderTemplateFile('project/.github/workflows/ci.yml', globalContext, flags),
    );
  }

  return {
    target,
    architecture,
    tooling,
    machinery,
    agents,
    ci: Boolean(ci),
    report: writer.report,
  };
}

/** Rekurzivně vypíše relativní cesty souborů v adresáři šablony. */
function walkTemplateFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) result.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  }

  return result.sort();
}

/**
 * Sestaví seznam souborů šablony vrstvy pro scripts/layer-template/.
 * Cílové cesty obsahují tokeny, které new-layer doplní za konkrétní vrstvu.
 */
function layerTemplatePlan(flags) {
  const plan = [];

  for (const relative of LAYER_CORE_FILES) {
    plan.push([`layer/${relative}`, relative]);
  }

  if (flags.full) {
    for (const relative of LAYER_FULL_FILES) {
      const target = relative.endsWith('layer.yml')
        ? '.github/workflows/__LAYER_SLUG__.yml'
        : relative;
      plan.push([`layer/${relative}`, target]);
    }
  } else if (flags.cursor) {
    plan.push([
      'ecosystems/cursor/rules/layer.mdc',
      '__root__/.cursor/rules/__LAYER_SLUG__.mdc',
    ]);
    plan.push(['layer/.cursor/agents/dev.md', '__root__/.cursor/agents/__LAYER_SLUG__-dev.md']);
  }

  return plan;
}
