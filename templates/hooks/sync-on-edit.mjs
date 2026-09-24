#!/usr/bin/env node
// Hook: sync agentní konfigurace po editaci zdroje ve vrstvě
//
// Spouští se z rootu projektu po editaci souboru. Pokud byla editace provedena
// ve zdrojové agentní konfiguraci vrstvy (src/<Layer>/.cursor/**), znovu vygeneruje
// root .cursor konfiguraci.
//
// Hook je záměrně fail-open: jakákoli chyba vrátí exit 0, aby nikdy neblokovala práci.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function extractPath(payload) {
  const candidates = [payload.file_path, payload.filePath, payload.path, payload.file];
  candidates.push(payload.tool_input?.file_path, payload.tool_input?.filePath, payload.tool_input?.path);

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}

try {
  const raw = readStdin();
  if (!raw.trim()) process.exit(0);

  const edited = extractPath(JSON.parse(raw));
  if (!edited) process.exit(0);

  const normalized = edited.replace(/\\/g, '/').replace(/^\.\//, '');

  // Pouze zdroj pravdy ve vrstvách; generované .cursor/** je vyloučeno.
  if (!/^src\/[^/]+\/\.cursor\//.test(normalized)) process.exit(0);

  const sync = path.join(process.cwd(), 'scripts', 'sync-agent-config.mjs');
  if (!fs.existsSync(sync)) process.exit(0);

  spawnSync(process.execPath, [sync], { cwd: process.cwd(), stdio: 'ignore' });
} catch {
  // fail-open
}

process.exit(0);
