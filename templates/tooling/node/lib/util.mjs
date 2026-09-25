import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Kořen projektu (o dvě úrovně výš než scripts/lib/). */
export const projectRoot = path.dirname(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
);

export function toLf(text) {
  return String(text).replace(/\r\n/g, '\n');
}

export function readText(filePath) {
  return toLf(fs.readFileSync(filePath, 'utf8'));
}

export function writeText(filePath, content) {
  const normalized = toLf(content);
  const paid = normalized.length > 0 && !normalized.endsWith('\n') ? `${normalized}\n` : normalized;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, paid, 'utf8');
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

/** Prefix, kterým se označí vyřazená (retired) vrstva na disku. */
export const RETIRED_PREFIX = '_retired-';

/**
 * True, pokud je název aktivní vrstvy: PascalCase a nezačíná `_`.
 * Vyřazené vrstvy mají na disku prefix `_retired-`, takže se sem nevejdou.
 */
export function isActiveLayerName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(String(name));
}

/** `Domain` -> `domain`, `AntiFraud` -> `anti-fraud`. */
export function layerSlug(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/** `Domain` -> `Domain`, `AntiFraud` -> `Anti Fraud`. */
export function layerTitle(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/** `anti-fraud` -> `AntiFraud`. */
export function toPascalCase(value) {
  return String(value)
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** Najde složku vrstvy v src/ (přesně, jinak case-insensitive). */
export function resolveLayerDir(name) {
  const srcRoot = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcRoot)) return null;

  const exact = path.join(srcRoot, name);
  if (fs.existsSync(exact)) return exact;

  const match = fs
    .readdirSync(srcRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase() === String(name).toLowerCase())
    .map((entry) => path.join(srcRoot, entry.name))[0];

  return match ?? null;
}

/** Přečte konfiguraci projektu vygenerovanou generátorem. */
export function readProjectConfig() {
  const configPath = path.join(projectRoot, '.scaffold.json');
  if (!fs.existsSync(configPath)) {
    return { machinery: 'lean', tooling: 'node' };
  }

  try {
    return readJson(configPath);
  } catch {
    return { machinery: 'lean', tooling: 'node' };
  }
}

/** Nahradí tokeny šablony hodnotami z mapy; neznámé tokeny ponechá. */
export function expandTokens(text, tokens) {
  return String(text).replace(/__([A-Z0-9_]+)__/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? String(tokens[key]) : match,
  );
}

/** Volby, které vždy očekávají hodnotu, i kdyby začínala pomlčkou. */
const VALUE_OPTIONS = new Set(['name', 'layer', 'to']);

/** Jednoduchý parser `--flag`, `--key value` a `--key=value`. */
export function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const [key, inline] = token.slice(2).split('=');
    if (inline !== undefined) {
      args[key] = inline;
      continue;
    }

    const next = argv[index + 1];
    const consumesValue = VALUE_OPTIONS.has(key)
      ? next !== undefined
      : next !== undefined && !next.startsWith('--');

    if (consumesValue) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

/** Rekurzivně vypíše relativní cesty souborů v adresáři. */
export function walkFiles(dir) {
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
