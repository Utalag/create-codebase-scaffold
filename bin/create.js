#!/usr/bin/env node
import { run } from '../lib/cli.js';

run(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\nChyba: ${message}\n`);
  process.exitCode = 1;
});
