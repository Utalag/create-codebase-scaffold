/**
 * Lokalizace generátoru.
 *
 * Generátor má dva jazyky: `cs` (výchozí) a `en`. Jazyk se vybírá jako první
 * otázka průvodce, nebo přes `--lang <cs|en>`. Řídí:
 *   - jazyk průvodce a CLI výstupu,
 *   - jazyk vygenerovaného scaffoldu (šablony, archetypy, skripty, README).
 *
 * Texty jsou v `MESSAGES`; `createTranslator` vrátí funkci `t(key, params)`,
 * která neznámý klíč vrátí beze změny (aby chyba byla vidět, ne tichá).
 */

export const LANGS = ['cs', 'en'];
export const DEFAULT_LANG = 'cs';

/** Normalizuje vstup na podporovaný jazyk; neznámý spadne na výchozí. */
export function normalizeLang(value) {
  return LANGS.includes(value) ? value : DEFAULT_LANG;
}

const MESSAGES = {
  cs: {
    // Průvodce
    'lang.question': 'Jazyk scaffoldu i průvodce',
    'lang.cs': 'Čeština',
    'lang.en': 'English',
    'prompt.select': 'Vyber 1-{count} [{default}]: ',
    'prompt.multiselectHint': '  (čísla oddělená čárkou, "all" = vše, Enter = výchozí)',
    'prompt.multiselectPrompt': 'Vyber [{defaults}]: ',
    'prompt.confirmYes': '[Y/n]',
    'prompt.confirmNo': '[y/N]',
    'prompt.invalidChoice': 'Neplatná volba, používám výchozí.',
    'prompt.defaultMark': ' (výchozí)',
    'target.question': 'Cílová složka',
    'arch.question': 'Architektura projektu',
    'arch.custom': 'Vlastní seznam vrstev (PascalCase)',
    'layers.question': 'Seznam vrstev (např. Domain,Application,Adapters,Shared)',
    'tooling.question': 'Skripty projektu',
    'tooling.node': 'Node.js (mjs)',
    'tooling.pwsh': 'PowerShell (pwsh)',
    'machinery.question': 'Rozsah agentní konfigurace',
    'machinery.full': 'Plná — vlastní .cursor vrstvy, sync zrcadlo, hooky',
    'machinery.lean': 'Odlehčená — jen root .cursor bez zrcadla',
    'agents.question': 'Agentní ekosystémy (Enter = výchozí)',
    'agents.cursor': 'Cursor (.cursor/rules, .cursor/agents)',
    'agents.copilot': 'GitHub Copilot (.github/copilot-instructions.md)',
    'agents.codex': 'Codex (AGENTS.md)',
    'agents.claude': 'Claude (CLAUDE.md, .claude/skills)',

    // Chyby
    'error.unknownOption': "Neznámá volba: '{token}'. Zkus --help.",
    'error.invalidValue': "Neplatná hodnota pro {label}: '{value}'. Povoleno: {allowed}.",
    'error.unknownEcosystem':
      'Neznámý ekosystém: {invalid}. Povoleno: {allowed} nebo "all".',
    'error.targetNotDirectory': "Cíl '{target}' existuje a není to složka.",
    'error.invalidLayerName':
      "Neplatný název vrstvy '{value}'. Povoleno je PascalCase z písmen a číslic, např. 'Domain' nebo 'AntiFraud'.",
    'error.emptyLayerList':
      'Seznam vrstev je prázdný. Zadej alespoň jednu vrstvu, např. --layers Domain,Application.',
    'error.unbalancedEndif': '<!--#endif--> bez odpovídajícího <!--#if-->.',
    'error.unclosedIf': 'Neuzavřený blok <!--#if-->: chybí <!--#endif-->.',
    'error.template': 'Šablona {path}: {message}',

    // Nápověda
    'help.body': `
create-codebase-scaffold {version}

Vygeneruje do cílové složky vrstvený projekt připravený pro AI agenty.

Balíček zatím NENÍ publikovaný v npm registru, proto se generátor spouští
ze zdrojů (klon repozitáře). Až bude publikovaný, půjde i přes npx.

Použití:
  node bin/create.js <slozka> [volby]
  npx create-codebase-scaffold <slozka> [volby]   # až po publikaci na npm

Volby:
  --target <dir>          Cílová složka (totéž jako poziční argument).
  --name <nazev>          Název projektu (výchozí: název cílové složky).
  --lang <cs|en>          Jazyk scaffoldu i průvodce (výchozí: cs).
  --preset <id>           Architektura: {presets}.
  --layers <A,B,C>        Volný seznam vrstev (PascalCase); přebíjí preset.
  --tooling <id>          Skripty projektu: {toolings} (výchozí: node).
  --machinery <id>        Rozsah agentní konfigurace: {machineries}.
                          full = vlastní .cursor vrstvy + sync zrcadlo + hooky
                          lean = jen root .cursor bez zrcadla
  --agents <a,b>          Ekosystémy instrukcí: {ecosystems}, nebo "all".
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
  node bin/create.js app --lang en --layers Domain,Application,Adapters,Shared
`,
    'list.title': 'Dostupné presety:',
    'list.customLayers': '(vlastní seznam vrstev)',
    'errorPrefix': 'Chyba',

    // Report
    'report.generating': 'Generuji projekt...',
    'report.planned': 'Plán (dry-run)',
    'report.done': 'Hotovo',
    'report.target': 'Cíl',
    'report.architecture': 'Architektura',
    'report.tooling': 'Tooling',
    'report.machinery': 'Konfigurace',
    'report.agents': 'Agenti',
    'report.ci': 'CI',
    'report.language': 'Jazyk',
    'report.yes': 'ano',
    'report.no': 'ne',
    'report.created': 'Vytvořeno',
    'report.skipped': 'Přeskočeno',
    'report.overwritten': 'Přepsáno',
    'report.files': 'souborů',
    'report.nextSteps': 'Další kroky:',
    'report.detailsHint': 'Podrobnosti najdeš v README.md a scripts/README.md',
    'report.gitInitDone': 'git init: hotovo',
    'report.gitInitFailed': 'git init: nepodařilo se (git není dostupný?)',
  },

  en: {
    // Wizard
    'lang.question': 'Language of the scaffold and the wizard',
    'lang.cs': 'Čeština',
    'lang.en': 'English',
    'prompt.select': 'Choose 1-{count} [{default}]: ',
    'prompt.multiselectHint': '  (comma-separated numbers, "all" = everything, Enter = default)',
    'prompt.multiselectPrompt': 'Choose [{defaults}]: ',
    'prompt.confirmYes': '[Y/n]',
    'prompt.confirmNo': '[y/N]',
    'prompt.invalidChoice': 'Invalid choice, using the default.',
    'prompt.defaultMark': ' (default)',
    'target.question': 'Target folder',
    'arch.question': 'Project architecture',
    'arch.custom': 'Custom layer list (PascalCase)',
    'layers.question': 'Layer list (e.g. Domain,Application,Adapters,Shared)',
    'tooling.question': 'Project scripts',
    'tooling.node': 'Node.js (mjs)',
    'tooling.pwsh': 'PowerShell (pwsh)',
    'machinery.question': 'Agent configuration scope',
    'machinery.full': 'Full — per-layer .cursor, sync mirror, hooks',
    'machinery.lean': 'Lean — root .cursor only, no mirror',
    'agents.question': 'Agent ecosystems (Enter = default)',
    'agents.cursor': 'Cursor (.cursor/rules, .cursor/agents)',
    'agents.copilot': 'GitHub Copilot (.github/copilot-instructions.md)',
    'agents.codex': 'Codex (AGENTS.md)',
    'agents.claude': 'Claude (CLAUDE.md, .claude/skills)',

    // Errors
    'error.unknownOption': "Unknown option: '{token}'. Try --help.",
    'error.invalidValue': "Invalid value for {label}: '{value}'. Allowed: {allowed}.",
    'error.unknownEcosystem':
      'Unknown ecosystem: {invalid}. Allowed: {allowed} or "all".',
    'error.targetNotDirectory': "Target '{target}' exists and is not a directory.",
    'error.invalidLayerName':
      "Invalid layer name '{value}'. Use PascalCase letters and digits, e.g. 'Domain' or 'AntiFraud'.",
    'error.emptyLayerList':
      'The layer list is empty. Enter at least one layer, e.g. --layers Domain,Application.',
    'error.unbalancedEndif': '<!--#endif--> without a matching <!--#if-->.',
    'error.unclosedIf': 'Unclosed <!--#if--> block: missing <!--#endif-->.',
    'error.template': 'Template {path}: {message}',

    // Help
    'help.body': `
create-codebase-scaffold {version}

Generates a layered project ready for AI agents into the target folder.

The package is NOT published to the npm registry yet, so the generator runs
from source (a clone of the repository). Once published, npx will work too.

Usage:
  node bin/create.js <folder> [options]
  npx create-codebase-scaffold <folder> [options]   # after npm publish

Options:
  --target <dir>          Target folder (same as the positional argument).
  --name <name>           Project name (default: target folder name).
  --lang <cs|en>          Language of the scaffold and wizard (default: cs).
  --preset <id>           Architecture: {presets}.
  --layers <A,B,C>        Custom layer list (PascalCase); overrides the preset.
  --tooling <id>          Project scripts: {toolings} (default: node).
  --machinery <id>        Agent configuration scope: {machineries}.
                          full = per-layer .cursor + sync mirror + hooks
                          lean = root .cursor only, no mirror
  --agents <a,b>          Instruction ecosystems: {ecosystems}, or "all".
                          codex uses AGENTS.md, which is always generated.
  --ci / --no-ci          Generate the CI workflow (default: yes).
  --dry-run               Only print what would be written.
  --force, --overwrite    Overwrite existing files (default: never).
  --git-init              Run "git init" after generating.
  -y, --yes               Do not ask, use defaults.
  --list                  List available presets and exit.
  -h, --help              This help.
  -v, --version           Version.

Non-destructive:
  An existing file is never overwritten unless you pass --force. The project's
  verify and test scripts never write anything.

Examples:
  node bin/create.js my-app
  node bin/create.js my-api --preset hexagonal --tooling pwsh
  node bin/create.js app --lang en --layers Domain,Application,Adapters,Shared
`,
    'list.title': 'Available presets:',
    'list.customLayers': '(custom layer list)',
    'errorPrefix': 'Error',

    // Report
    'report.generating': 'Generating project...',
    'report.planned': 'Plan (dry-run)',
    'report.done': 'Done',
    'report.target': 'Target',
    'report.architecture': 'Architecture',
    'report.tooling': 'Tooling',
    'report.machinery': 'Configuration',
    'report.agents': 'Agents',
    'report.ci': 'CI',
    'report.language': 'Language',
    'report.yes': 'yes',
    'report.no': 'no',
    'report.created': 'Created',
    'report.skipped': 'Skipped',
    'report.overwritten': 'Overwritten',
    'report.files': 'files',
    'report.nextSteps': 'Next steps:',
    'report.detailsHint': 'See README.md and scripts/README.md for details',
    'report.gitInitDone': 'git init: done',
    'report.gitInitFailed': 'git init: failed (is git available?)',
  },
};

/** Vytvoří překladatel pro daný jazyk. Neznámý klíč vrátí beze změny. */
export function createTranslator(lang = DEFAULT_LANG) {
  const table = MESSAGES[normalizeLang(lang)];

  return function t(key, params = {}) {
    const template = Object.prototype.hasOwnProperty.call(table, key)
      ? table[key]
      : MESSAGES[DEFAULT_LANG][key];

    if (template === undefined) return key;

    return String(template).replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  };
}

/** True, pokud jazyk známe. */
export function isKnownLang(value) {
  return LANGS.includes(value);
}
