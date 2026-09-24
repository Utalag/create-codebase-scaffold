import assert from 'node:assert/strict';
import test from 'node:test';

import { ARCHETYPES, PRESETS, PRESET_IDS, buildArchitecture } from '../lib/presets.js';

test('každý preset sestaví architekturu s neprázdnými vrstvami', () => {
  for (const id of PRESET_IDS) {
    if (id === 'custom') continue;

    const architecture = buildArchitecture({ presetId: id });
    assert.ok(architecture.layerNames.length > 0, `preset ${id} nemá vrstvy`);
    assert.equal(architecture.layers.length, architecture.layerNames.length);
  }
});

test('závislosti odkazují jen na existující vrstvy a nikdy na sebe', () => {
  for (const id of PRESET_IDS) {
    if (id === 'custom') continue;

    const architecture = buildArchitecture({ presetId: id });
    const names = new Set(architecture.layerNames);

    for (const layer of architecture.layers) {
      for (const dep of layer.allowedDeps) {
        assert.ok(names.has(dep), `${layer.name} závisí na neexistující vrstvě ${dep}`);
        assert.notEqual(dep, layer.name, `${layer.name} závisí sám na sobě`);
      }
    }
  }
});

test('clean preset má očekávaný směr závislostí', () => {
  const { layers } = buildArchitecture({ presetId: 'clean' });
  const byName = Object.fromEntries(layers.map((layer) => [layer.name, layer]));

  assert.deepEqual(byName.Domain.allowedDeps, ['Shared']);
  assert.deepEqual(byName.Application.allowedDeps, ['Domain', 'Shared']);
  assert.deepEqual(byName.Infrastructure.allowedDeps, ['Application', 'Domain', 'Shared']);
  assert.deepEqual(byName.Presentation.allowedDeps, ['Application', 'Shared']);
  assert.deepEqual(byName.Shared.allowedDeps, []);
});

test('layered preset vede Presentation -> Business -> Data', () => {
  const { layers } = buildArchitecture({ presetId: 'layered' });
  const byName = Object.fromEntries(layers.map((layer) => [layer.name, layer]));

  assert.deepEqual(byName.Presentation.allowedDeps, ['Business', 'Shared']);
  assert.deepEqual(byName.Business.allowedDeps, ['Data', 'Shared']);
  assert.deepEqual(byName.Data.allowedDeps, ['Shared']);
});

test('volný seznam vrstev odvodí archetypy ze slugu', () => {
  const { layers } = buildArchitecture({
    layers: ['Domain', 'Application', 'Adapters', 'Shared'],
  });
  const byName = Object.fromEntries(layers.map((layer) => [layer.name, layer]));

  assert.equal(byName.Domain.archetype, 'domain');
  assert.equal(byName.Adapters.archetype, 'adapters');
  assert.equal(byName.Adapters.known, true);
  assert.deepEqual(byName.Adapters.allowedDeps, ['Application', 'Domain', 'Shared']);
});

test('neznámá vrstva dostane obecný archetyp s markery DOPLŇ', () => {
  const { layers } = buildArchitecture({ layers: ['Domain', 'Billing', 'Shared'] });
  const billing = layers.find((layer) => layer.name === 'Billing');

  assert.equal(billing.archetype, 'default');
  assert.equal(billing.known, false);
  assert.ok(billing.dependsOnProse.includes('DOPLŇ:'));
  assert.ok(billing.guardrails.some((item) => item.includes('DOPLŇ:')));
});

test('známý archetyp v obecném zápisu neobsahuje markery DOPLŇ', () => {
  const { layers } = buildArchitecture({ layers: ['Domain', 'Business', 'Data', 'Shared'] });
  const business = layers.find((layer) => layer.name === 'Business');

  assert.equal(business.known, true);
  assert.ok(!business.dependsOnProse.includes('DOPLŇ:'));
  assert.ok(!business.guardrails.some((item) => item.includes('DOPLŇ:')));
});

test('zakázané závislosti vyjmenují všechny ostatní vrstvy', () => {
  const { layers } = buildArchitecture({ presetId: 'clean' });
  const domain = layers.find((layer) => layer.name === 'Domain');

  assert.deepEqual(domain.forbiddenDeps.sort(), ['Application', 'Infrastructure', 'Presentation']);
});

test('každý archetyp má odpovědnost a alespoň čtyři guardrails', () => {
  for (const [name, archetype] of Object.entries(ARCHETYPES)) {
    assert.ok(archetype.responsibility.length > 0, `archetyp ${name} nemá odpovědnost`);
    assert.ok(archetype.guardrails.length >= 4, `archetyp ${name} má málo guardrails`);
  }
});

test('presety odkazují jen na definované vrstvy', () => {
  for (const id of PRESET_IDS) {
    const preset = PRESETS[id];
    if (!preset.dependencies) continue;

    for (const [layer, deps] of Object.entries(preset.dependencies)) {
      assert.ok(preset.layers.includes(layer), `preset ${id}: neznámá vrstva ${layer}`);
      for (const dep of deps) {
        assert.ok(preset.layers.includes(dep), `preset ${id}: neznámá závislost ${dep}`);
      }
    }
  }
});
