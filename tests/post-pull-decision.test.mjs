import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChangedFiles } from '../scripts/post-pull-decision.mjs';

test('classifies application changes as build, browser smoke and desktop update work', () => {
  const decision = classifyChangedFiles([
    'app/planner/page.tsx',
    'public/planner-assets/manifest.json',
  ]);

  assert.equal(decision.buildRequired, true);
  assert.equal(decision.browserSmokeRequired, true);
  assert.equal(decision.desktopRunRequired, true);
  assert.equal(decision.desktopAssetsRequired, false);
  assert.equal(decision.extensionRefreshRequired, false);
  assert.deepEqual(decision.actions, ['build', 'browser-smoke', 'desktop-update-and-run']);
});

test('classifies desktop launcher changes as generated asset refresh work', () => {
  const decision = classifyChangedFiles([
    'scripts/desktop-icons.ps1',
    'Wohnungsplaner starten.cmd',
  ]);

  assert.equal(decision.buildRequired, false);
  assert.equal(decision.desktopAssetsRequired, true);
  assert.equal(decision.desktopRunRequired, true);
  assert.deepEqual(decision.actions, ['desktop-assets', 'desktop-update-and-run']);
});

test('recognizes browser extension changes without inventing an extension build', () => {
  const decision = classifyChangedFiles(['extensions/planner/manifest.json']);

  assert.equal(decision.extensionRefreshRequired, true);
  assert.equal(decision.buildRequired, true);
  assert.deepEqual(decision.actions, ['build', 'extension-refresh']);
});

test('does not schedule work for documentation-only pulls', () => {
  const decision = classifyChangedFiles(['README.md', 'docs/usage.md']);

  assert.equal(decision.buildRequired, false);
  assert.equal(decision.desktopRunRequired, false);
  assert.deepEqual(decision.actions, []);
});
