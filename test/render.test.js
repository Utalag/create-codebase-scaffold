import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyConditionals,
  bulletList,
  buildCommands,
  dependencyMermaid,
  findUnresolvedTokens,
  forbiddenRules,
  layerTable,
  renderTemplate,
  withLayer,
} from '../lib/render.js';
import { buildArchitecture } from '../lib/presets.js';

test('renderTemplate nahradí známé tokeny a nechá neznámé', () => {
  const output = renderTemplate('A __FOO__ B __BAR__', { FOO: 'x' });
  assert.equal(output, 'A x B __BAR__');
});

test('findUnresolvedTokens najde jen nerozřešené tokeny', () => {
  assert.deepEqual(findUnresolvedTokens('__A__ __b__ __C_D__'), ['A', 'C_D']);
  assert.deepEqual(findUnresolvedTokens('__pycache__'), []);
});

test('applyConditionals vyhodnotí kladnou i zápornou podmínku', () => {
  const template = [
    'start',
    '<!--#if full-->',
    'plna',
    '<!--#endif-->',
    '<!--#if !full-->',
    'lehka',
    '<!--#endif-->',
    'end',
  ].join('\n');

  const full = applyConditionals(template, { full: true });
  assert.ok(full.includes('plna'));
  assert.ok(!full.includes('lehka'));

  const lean = applyConditionals(template, { full: false });
  assert.ok(lean.includes('lehka'));
  assert.ok(!lean.includes('plna'));
  assert.ok(!lean.includes('<!--#if'));
});

test('applyConditionals sjednotí prázdné řádky', () => {
  const template = 'a\n\n<!--#if x-->\n<!--#endif-->\n\nb';
  assert.equal(applyConditionals(template, { x: false }), 'a\n\nb');
});

test('applyConditionals zvládne vnořené bloky', () => {
  const template = [
    'a',
    '<!--#if full-->',
    'full-start',
    '<!--#if node-->',
    'full-node',
    '<!--#endif-->',
    '<!--#if pwsh-->',
    'full-pwsh',
    '<!--#endif-->',
    'full-end',
    '<!--#endif-->',
    'z',
  ].join('\n');

  const lean = applyConditionals(template, { full: false, node: true, pwsh: false });
  assert.equal(lean, 'a\nz');

  const fullNode = applyConditionals(template, { full: true, node: true, pwsh: false });
  assert.equal(fullNode, 'a\nfull-start\nfull-node\nfull-end\nz');

  const fullPwsh = applyConditionals(template, { full: true, node: false, pwsh: true });
  assert.equal(fullPwsh, 'a\nfull-start\nfull-pwsh\nfull-end\nz');
});

test('applyConditionals odmítne nevyvážené direktivy', () => {
  assert.throws(() => applyConditionals('<!--#if x-->\na', { x: true }), /Neuzavřený blok/);
  assert.throws(() => applyConditionals('a\n<!--#endif-->', {}), /bez odpovídajícího/);
});

test('bulletList formátuje odrážky', () => {
  assert.equal(bulletList(['a', 'b']), '- a\n- b');
});

test('tabulka vrstev a mermaid odpovídají modelu', () => {
  const architecture = buildArchitecture({ presetId: 'vertical-slice' });

  const table = layerTable(architecture);
  assert.ok(table.includes('| `Features` | `Shared` |'));
  assert.ok(table.includes('| `Infrastructure` | `Shared` |'));
  assert.ok(table.includes('| `Shared` | — |'));

  const mermaid = dependencyMermaid(architecture);
  assert.ok(mermaid.startsWith('```mermaid'));
  assert.ok(mermaid.includes('  Features --> Shared'));
  assert.ok(mermaid.endsWith('```'));

  const rules = forbiddenRules(architecture);
  assert.ok(rules.includes('`Features` nesmí importovat `Infrastructure`.'));
});

test('buildCommands vrací příkazy podle toolingu', () => {
  assert.ok(buildCommands('pwsh').testLayer.includes('pwsh -File'));
  assert.ok(buildCommands('node').testLayer.includes('node scripts/'));
  assert.equal(buildCommands('pwsh').syncConfigCheck, 'pwsh -File scripts/sync-agent-config.ps1 -Check');
  assert.equal(buildCommands('node').syncConfigCheck, 'node scripts/sync-agent-config.mjs --check');
});

test('withLayer doplní konkrétní vrstvu', () => {
  assert.equal(withLayer('pwsh -File scripts/test-layer.ps1 -Layer <Layer>', 'AntiFraud'), 'pwsh -File scripts/test-layer.ps1 -Layer AntiFraud');
});
