import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isForbiddenTrackedPath, validateGitIndex } from '../scripts/git-guard.mjs';

test('permanent sources and metadata remain versionable', () => {
  for (const p of ['app/planner/page.tsx', 'models/products/chair/manifest.json',
    'public/planner-assets/model.glb', 'package-lock.json', 'AGENTS.md', '.env.example']) {
    assert.equal(isForbiddenTrackedPath(p), false, p);
  }
});

test('generated folders, caches and secrets are never tracked', () => {
  for (const p of ['node_modules/react/index.js', 'dist/client/a.js', '.vinext/state',
    'graphify-out/graph.json', 'build/dist/a.js', 'reports/coverage/index.html',
    'playwright-report/index.html', 'scripts/node_modules/a.js', '.env.local',
    'app/.env.production', 'runtime.log', 'app/cache.tsbuildinfo', 'Desktop-Link.lnk']) {
    assert.equal(isForbiddenTrackedPath(p), true, p);
  }
});

test('Git index entries reject symlinks, submodules and generated files', () => {
  const sha = 'a'.repeat(40);
  assert.deepEqual(validateGitIndex('100644 ' + sha + ' 0\tapp/page.tsx\0'), []);
  const issues = validateGitIndex('120000 ' + sha + ' 0\tapp/symlink\0' +
    '160000 ' + sha + ' 0\tapp/other-repository\0' +
    '100644 ' + sha + ' 0\tdist/app.js\0');
  assert.equal(issues.length, 3);
  assert.match(issues[0], /symlink/);
  assert.match(issues[1], /submodule/);
  assert.match(issues[2], /generated/);
});

test('GitHub sync cannot merge PRs automatically or use a non-FF merge', () => {
  const script = readFileSync(new URL('../scripts/github-workflow.mjs', import.meta.url), 'utf8');
  assert.equal(script.includes("gh('pr','merge'"), false);
  assert.ok(script.includes("'--ff-only'"));
  assert.ok(script.includes('--apply is disabled'));
});
