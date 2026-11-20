import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { classifyDeployment } from '../scripts/cloudbuild-plan.mjs';

const manifest = (overrides = {}) => ({
  version: 1,
  generatedBy: 'scripts/generate-planner-assets.mjs',
  units: 'metres',
  assets: [{
    id: 'model-chair',
    type: 'model',
    path: '/planner-assets/models/chair.glb',
    catalogIds: ['chair-office'],
    meterScale: 1,
    sha256: 'old',
    byteLength: 100,
    ...overrides,
  }],
});

test('skips documentation-only commits', () => {
  const plan = classifyDeployment({ changedFiles: ['README.md', 'docs/usage.md'] });
  assert.equal(plan.mode, 'skip');
  assert.equal(plan.requiresAssetCheck, false);
});

test('publishes replacement bytes through the live asset lane', () => {
  const plan = classifyDeployment({
    changedFiles: [
      'public/planner-assets/models/chair.glb',
      'public/planner-assets/manifest.json',
    ],
    previousManifest: manifest(),
    currentManifest: manifest({ sha256: 'new', byteLength: 120 }),
    previousImageAvailable: true,
  });
  assert.equal(plan.mode, 'asset-live');
  assert.equal(plan.requiresAssetCheck, true);
});

test('publishes a new model identity through the live asset lane', () => {
  const plan = classifyDeployment({
    changedFiles: [
      'public/planner-assets/models/new-chair.glb',
      'public/planner-assets/manifest.json',
    ],
    previousManifest: manifest(),
    currentManifest: {
      ...manifest(),
      assets: [...manifest().assets, {
        id: 'model-new-chair',
        type: 'model',
        path: '/planner-assets/models/new-chair.glb',
        catalogIds: ['chair-new'],
        meterScale: 1,
        sha256: 'new',
        byteLength: 120,
      }],
    },
    previousImageAvailable: true,
  });
  assert.equal(plan.mode, 'asset-live');
});

test('requires a full build for application or geometry changes', () => {
  for (const changedFile of ['app/planner/page.tsx', 'models/products/chair/manifest.json', 'package.json']) {
    assert.equal(classifyDeployment({ changedFiles: [changedFile] }).mode, 'full', changedFile);
  }
});

test('uses the runtime overlay for server-only changes', () => {
  assert.equal(classifyDeployment({ changedFiles: ['serve-local.mjs'] }).mode, 'runtime');
  assert.equal(classifyDeployment({ changedFiles: ['scripts/resolve-dependencies.mjs'] }).mode, 'runtime');
});

test('publishes assets without depending on a container base image', () => {
  const plan = classifyDeployment({
    changedFiles: ['public/planner-assets/textures/fabric/rug.svg'],
    previousManifest: manifest(),
    currentManifest: manifest(),
    previousImageAvailable: false,
  });
  assert.equal(plan.mode, 'asset-live');
});

test('CLI creates the generated report directory before writing its plan', () => {
  const directory = mkdtempSync(path.join(process.cwd(), '..', 'Wohnungsplaner_Generated', 'tmp', 'cloudbuild-plan-'));
  const output = path.join(directory, 'nested', 'plan.json');
  try {
    const result = spawnSync(process.execPath, ['scripts/cloudbuild-plan.mjs', 'HEAD', output], {
      cwd: process.cwd(), encoding: 'utf8', windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(['full', 'runtime'].includes(JSON.parse(readFileSync(output, 'utf8')).mode));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
