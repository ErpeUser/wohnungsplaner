import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLocalPush } from '../scripts/pre-push-check.mjs';

test('runtime-only changes use the targeted pre-push checks', () => {
  assert.equal(classifyLocalPush(['serve-local.mjs']).mode, 'runtime');
  assert.equal(classifyLocalPush(['scripts/resolve-dependencies.mjs']).mode, 'runtime');
});

test('documentation-only changes skip local production checks', () => {
  assert.equal(classifyLocalPush(['README.md', 'docs/deployment.md']).mode, 'skip');
});

test('mixed runtime and application changes require the full pre-push checks', () => {
  assert.equal(classifyLocalPush(['serve-local.mjs', 'app/page.tsx']).mode, 'full');
});

test('asset-only changes use the asset checks', () => {
  assert.equal(classifyLocalPush(['public/planner-assets/models/chair.glb']).mode, 'assets');
});
