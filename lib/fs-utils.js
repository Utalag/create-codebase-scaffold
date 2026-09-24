import fs from 'node:fs';
import path from 'node:path';

/** Převede CRLF na LF, aby byl výstup na Windows i Linuxu bajtově shodný. */
export function toLf(text) {
  return String(text).replace(/\r\n/g, '\n');
}

/** Načte soubor jako UTF-8 a normalizuje konce řádků na LF. */
export function readText(filePath) {
  return toLf(fs.readFileSync(filePath, 'utf8'));
}

/** Rekurzivně vypíše relativní cesty všech souborů v adresáři (bez adresářů). */
export function walkFiles(dir) {
  const result = [];

  if (!fs.existsSync(dir)) {
    return result;
  }

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        result.push(path.relative(dir, full).split(path.sep).join('/'));
      }
    }
  }

  return result.sort();
}

/**
 * Zapisovač, který je nedestruktivní: existující soubor ve výchozím stavu
 * nikdy nepřepíše. Přepsání je možné jen s `overwrite: true` (přepínač --force).
 *
 * Sleduje, co se stalo, aby generátor mohl vydat přehledný report.
 */
export function createWriter({ targetRoot, dryRun = false, overwrite = false, log = () => {} }) {
  const report = { created: [], skipped: [], overwritten: [] };

  function write(relativePath, content) {
    const normalizedRelative = relativePath.split(path.sep).join('/');
    const fullPath = path.join(targetRoot, normalizedRelative);
    const existed = fs.existsSync(fullPath);

    if (existed && !overwrite) {
      report.skipped.push(normalizedRelative);
      log(`  skip    ${normalizedRelative}`);
      return 'skip';
    }

    const text = toLf(content);
    const paid = text.length > 0 && !text.endsWith('\n') ? `${text}\n` : text;

    if (!dryRun) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, paid, 'utf8');
    }

    const action = existed ? 'overwrite' : 'create';
    report[action === 'overwrite' ? 'overwritten' : 'created'].push(normalizedRelative);
    log(`  ${action === 'overwrite' ? 'overwrite' : 'create'} ${normalizedRelative}`);
    return action;
  }

  /** Zkopíruje strom souborů ze šablony, volitelně s transformací obsahu. */
  function copyDir(sourceDir, destinationPrefix, transform = (content) => content) {
    for (const relative of walkFiles(sourceDir)) {
      const content = readText(path.join(sourceDir, relative));
      const target = destinationPrefix ? `${destinationPrefix}/${relative}` : relative;
      write(target, transform(content, relative));
    }
  }

  const total = () => report.created.length + report.overwritten.length + report.skipped.length;

  return { write, copyDir, report, total };
}
