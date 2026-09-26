import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Lokalizace skriptů vygenerovaného projektu (Node varianta).
 *
 * Jazyk se čte z `.scaffold.json` (`lang`). Texty jsou v `scripts/locales/`,
 * kam generátor zapsal katalog pro zvolený jazyk. Když katalog chybí, použije
 * se klíč beze změny (chyba je vidět, ne tichá).
 */

const projectRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

/** Zjistí jazyk projektu z `.scaffold.json`; neznámý nebo chybějící je `cs`. */
export function projectLang() {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.scaffold.json'), 'utf8'));
    return config.lang === 'en' ? 'en' : 'cs';
  } catch {
    return 'cs';
  }
}

/** Značka nevyplněného placeholderu v archetypu vrstvy. */
export function placeholderMarker() {
  return projectLang() === 'en' ? 'TODO:' : 'DOPLŇ:';
}

let catalog = null;

function load() {
  if (catalog) return catalog;

  const file = path.join(projectRoot, 'scripts', 'locales', `${projectLang()}.json`);
  try {
    catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    catalog = {};
  }

  return catalog;
}

/** Přeloží klíč a doplní `{placeholders}`. Neznámý klíč vrátí beze změny. */
export function t(key, params = {}) {
  const template = load()[key];
  if (template === undefined) return key;

  return String(template).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
