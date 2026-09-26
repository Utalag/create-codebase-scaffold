/**
 * Práce s názvy vrstev.
 *
 * Vrstva má vždy dvě podoby názvu:
 *   - `name`  — PascalCase identita vrstvy, odpovídá názvu složky: `src/Domain/`.
 *               Jediná podoba, kterou uživatel zadává a kterou vidí v cestách.
 *   - `slug`  — kebab-case odvozený z `name`, např. `Domain` -> `domain`,
 *               `AntiFraud` -> `anti-fraud`. Používá se tam, kde jsou potřeba
 *               lowercase názvy (artefakty `.cursor/`, názvy CI jobů).
 */

import { DEFAULT_LANG, createTranslator } from './i18n.js';

const LAYER_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

/** Převede libovolný vstup na PascalCase (`anti-fraud`, `anti_fraud`, `antiFraud` -> `AntiFraud`). */
export function toPascalCase(input) {
  return String(input)
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** True, pokud je název platná PascalCase identita vrstvy. */
export function isValidLayerName(name) {
  return typeof name === 'string' && LAYER_NAME_PATTERN.test(name);
}

/** Ověří a vrátí PascalCase název vrstvy, nebo vyhodí chybu s vysvětlením. */
export function normalizeLayerName(input, lang = DEFAULT_LANG) {
  const name = toPascalCase(input);

  if (!isValidLayerName(name)) {
    throw new Error(createTranslator(lang)('error.invalidLayerName', { value: input }));
  }

  return name;
}

/** `Domain` -> `domain`, `AntiFraud` -> `anti-fraud`, `SQLRepo` -> `sql-repo`. */
export function layerSlug(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** `Domain` -> `Domain`, `AntiFraud` -> `Anti Fraud`. Používá se v lidsky čtených titulcích. */
export function layerTitle(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Rozparsuje seznam vrstev z CLI (čárkou nebo mezerou oddělený) a vrátí
 * normalizované PascalCase názvy bez duplicit, v pořadí vstupu.
 */
export function parseLayerList(input, lang = DEFAULT_LANG) {
  const parts = Array.isArray(input) ? input : String(input).split(/[,\s]+/);

  const seen = new Set();
  const result = [];

  for (const part of parts) {
    if (!part || !part.trim()) continue;
    const name = normalizeLayerName(part, lang);
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }

  if (result.length === 0) {
    throw new Error(createTranslator(lang)('error.emptyLayerList'));
  }

  return result;
}
