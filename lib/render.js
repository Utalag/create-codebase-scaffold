/**
 * Renderování šablon.
 *
 * Šablony používají placeholdery ve tvaru `__TOKEN__`. `renderTemplate` nahradí
 * známé tokeny a neznámé ponechá beze změny, aby šly v testech dohledat.
 */

const TOKEN_PATTERN = /__([A-Z0-9_]+)__/g;

/** Nahradí známé `__TOKEN__` hodnotami z kontextu. Neznámé tokeny ponechá. */
export function renderTemplate(text, context) {
  return String(text).replace(TOKEN_PATTERN, (match, key) =>
    Object.prototype.hasOwnProperty.call(context, key) ? String(context[key]) : match,
  );
}

/** Vrátí seznam tokenů, které v textu zůstaly nenahrazené. */
export function findUnresolvedTokens(text) {
  const found = new Set();
  for (const match of String(text).matchAll(TOKEN_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}

/** Odrážkový seznam. */
export function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

import { DEFAULT_LANG, createTranslator, normalizeLang } from './i18n.js';

/** Kompaktní tabulka vrstev a povolených závislostí. */
export function layerTable(architecture, lang = DEFAULT_LANG) {
  const english = normalizeLang(lang) === 'en';
  const header = english ? '| Layer | May depend on |' : '| Vrstva | Smí záviset na |';

  const rows = architecture.layers.map((layer) => {
    const deps = layer.allowedDeps.length
      ? layer.allowedDeps.map((name) => `\`${name}\``).join(', ')
      : '—';
    return `| \`${layer.name}\` | ${deps} |`;
  });

  return [header, '| --- | --- |', ...rows].join('\n');
}

/** Odrážkový seznam odpovědností jednotlivých vrstev. */
export function layerRoles(architecture) {
  return bulletList(architecture.layers.map((layer) => `\`${layer.name}\` — ${layer.responsibility}`));
}

/** Mermaid diagram směru závislostí. */
export function dependencyMermaid(architecture) {
  const lines = architecture.edges.map((edge) => `  ${edge.from} --> ${edge.to}`);
  return ['```mermaid', 'flowchart LR', ...lines, '```'].join('\n');
}

/** Odrážkový seznam zakázaných směrů závislostí. */
export function forbiddenRules(architecture, lang = DEFAULT_LANG) {
  const english = normalizeLang(lang) === 'en';

  const rules = architecture.layers
    .filter((layer) => layer.forbiddenDeps.length > 0)
    .map((layer) => {
      const forbidden = layer.forbiddenDeps.map((name) => `\`${name}\``).join(', ');
      return english
        ? `\`${layer.name}\` must not import ${forbidden}.`
        : `\`${layer.name}\` nesmí importovat ${forbidden}.`;
    });

  return bulletList(rules);
}

/**
 * Vyhodnotí podmíněné bloky šablony.
 *
 *   <!--#if full-->
 *   ...obsah jen pro plnou konfiguraci...
 *   <!--#endif-->
 *
 * Podporuje i negaci: `<!--#if !full-->`. Bloky se smějí vnořovat — direktivy
 * musí stát na samostatném řádku. Bloky s neplatnou podmínkou se odstraní
 * a výsledné vícenásobné prázdné řádky se sjednotí na jeden.
 */
export function applyConditionals(text, flags, lang = DEFAULT_LANG) {
  const t = createTranslator(lang);
  const opening = /^[ \t]*<!--#if\s+(!?[A-Za-z0-9_-]+)\s*-->[ \t]*$/;
  const closing = /^[ \t]*<!--#endif-->[ \t]*$/;
  const stack = [];
  const kept = [];

  const isActive = () => stack.every((entry) => entry.keep);

  for (const line of String(text).split('\n')) {
    const open = opening.exec(line);

    if (open) {
      const condition = open[1];
      const negated = condition.startsWith('!');
      const value = Boolean(flags[negated ? condition.slice(1) : condition]);
      stack.push({ keep: negated ? !value : value });
      continue;
    }

    if (closing.test(line)) {
      if (stack.length === 0) {
        throw new Error(t('error.unbalancedEndif'));
      }

      stack.pop();
      continue;
    }

    if (isActive()) kept.push(line);
  }

  if (stack.length > 0) {
    throw new Error(t('error.unclosedIf'));
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Příkazy toolingu vygenerovaného projektu. Řídí se volbou `--tooling`.
 */
export function buildCommands(tooling) {
  if (tooling === 'node') {
    return {
      newLayer: 'node scripts/new-layer.mjs --name <Layer>',
      verifyLayer: 'node scripts/verify-layer.mjs --layer <Layer>',
      testLayer: 'node scripts/test-layer.mjs --layer <Layer>',
      syncConfig: 'node scripts/sync-agent-config.mjs',
      syncConfigCheck: 'node scripts/sync-agent-config.mjs --check',
      runner: 'node',
    };
  }

  return {
    newLayer: 'pwsh -File scripts/new-layer.ps1 -Name <Layer>',
    verifyLayer: 'pwsh -File scripts/verify-layer.ps1 -Layer <Layer>',
    testLayer: 'pwsh -File scripts/test-layer.ps1 -Layer <Layer>',
    syncConfig: 'pwsh -File scripts/sync-agent-config.ps1',
    syncConfigCheck: 'pwsh -File scripts/sync-agent-config.ps1 -Check',
    runner: 'pwsh',
  };
}

/** Nahradí `<Layer>` konkrétním názvem vrstvy. */
export function withLayer(command, layerName) {
  return command.replace(/<Layer>/g, layerName);
}
