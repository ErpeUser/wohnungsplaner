import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true }).trim();
async function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'planner-desktop-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'Launcher test');
  writeFileSync(path.join(root, 'plan.txt'), 'original');
  git(root, 'add', '.'); git(root, 'commit', '-m', 'initial');
  const { synchronizeRepository } = await import('../scripts/desktop-runtime.mjs');
  return { root, synchronizeRepository };
}
test('local edits survive automatic update without a pull', async t => {
  const { root, synchronizeRepository } = await fixture(t);
  writeFileSync(path.join(root, 'plan.txt'), 'my saved changes');
  const result = synchronizeRepository(root);
  assert.equal(result.skipped, true);
  assert.match(result.warning, /Lokale/);
  assert.equal(readFileSync(path.join(root, 'plan.txt'), 'utf8'), 'my saved changes');
});
test('automatic updates never switch an active branch', async t => {
  const { root, synchronizeRepository } = await fixture(t);
  git(root, 'checkout', '-b', 'existing-work');
  const result = synchronizeRepository(root);
  assert.equal(result.skipped, true);
  assert.equal(git(root, 'branch', '--show-current'), 'existing-work');
});
test('offline update keeps the existing working version usable', async t => {
  const { root, synchronizeRepository } = await fixture(t);
  git(root, 'remote', 'add', 'origin', path.join(root, 'missing-remote'));
  const before = git(root, 'rev-parse', 'HEAD');
  const result = synchronizeRepository(root);
  assert.equal(result.changed, false);
  assert.match(result.warning, /GitHub/);
  assert.equal(git(root, 'rev-parse', 'HEAD'), before);
});
test('clean checkout fast-forwards to the new remote commit', async t => {
  const { root, synchronizeRepository } = await fixture(t);
  const remote = mkdtempSync(path.join(tmpdir(), 'planner-remote-'));
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  execFileSync('git', ['clone', '--bare', root, remote], { windowsHide: true, stdio: 'pipe' });
  git(root, 'remote', 'add', 'origin', remote);
  const author = mkdtempSync(path.join(tmpdir(), 'planner-author-'));
  t.after(() => rmSync(author, { recursive: true, force: true }));
  execFileSync('git', ['clone', remote, author], { windowsHide: true, stdio: 'pipe' });
  git(author, 'config', 'user.email', 'test@example.invalid'); git(author, 'config', 'user.name', 'Test');
  writeFileSync(path.join(author, 'plan.txt'), 'new remote version');
  git(author, 'add', '.'); git(author, 'commit', '-m', 'update'); git(author, 'push', 'origin', 'main');
  const result = synchronizeRepository(root);
  assert.equal(result.changed, true);
  assert.equal(result.warning, '');
  assert.equal(readFileSync(path.join(root, 'plan.txt'), 'utf8'), 'new remote version');
});
test('a stale lock reused by an unrelated live process does not block startup', async t => {
  const folder = mkdtempSync(path.join(tmpdir(), 'planner-lock-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const lockPath = path.join(folder, 'desktop-worker.lock');
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid }));
  const { acquireWorkerLock } = await import('../scripts/desktop-runtime.mjs');
  const release = acquireWorkerLock(folder);
  assert.equal(typeof release, 'function');
  release();
  assert.equal(existsSync(lockPath), false);
});
