import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidLayerName,
  layerSlug,
  layerTitle,
  normalizeLayerName,
  parseLayerList,
  toPascalCase,
} from '../lib/naming.js';

test('toPascalCase normalizuje různé zápisy', () => {
  assert.equal(toPascalCase('domain'), 'Domain');
  assert.equal(toPascalCase('anti-fraud'), 'AntiFraud');
  assert.equal(toPascalCase('anti_fraud'), 'AntiFraud');
  assert.equal(toPascalCase('antiFraud'), 'AntiFraud');
  assert.equal(toPascalCase('  AntiFraud  '), 'AntiFraud');
});

test('isValidLayerName přijímá jen PascalCase', () => {
  assert.equal(isValidLayerName('Domain'), true);
  assert.equal(isValidLayerName('AntiFraud2'), true);
  assert.equal(isValidLayerName('domain'), false);
  assert.equal(isValidLayerName('anti-fraud'), false);
  assert.equal(isValidLayerName('2Domain'), false);
  assert.equal(isValidLayerName(''), false);
});

test('normalizeLayerName vrací PascalCase a jinak vyhodí chybu', () => {
  assert.equal(normalizeLayerName('domain'), 'Domain');
  assert.equal(normalizeLayerName('anti-fraud'), 'AntiFraud');
  assert.throws(() => normalizeLayerName('___'));
});

test('layerSlug převádí PascalCase na kebab-case', () => {
  assert.equal(layerSlug('Domain'), 'domain');
  assert.equal(layerSlug('AntiFraud'), 'anti-fraud');
  assert.equal(layerSlug('SQLRepo'), 'sql-repo');
});

test('layerTitle odděluje slova', () => {
  assert.equal(layerTitle('Domain'), 'Domain');
  assert.equal(layerTitle('AntiFraud'), 'Anti Fraud');
});

test('parseLayerList normalizuje, deduplikuje a drží pořadí', () => {
  assert.deepEqual(parseLayerList('domain, application,domain'), ['Domain', 'Application']);
  assert.deepEqual(parseLayerList('domain application'), ['Domain', 'Application']);
  assert.throws(() => parseLayerList('   '));
});
