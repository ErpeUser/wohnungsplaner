// Canonical-worktree and Git-index guard. No installs, links or cleanup.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const generatedRoot = path.join(path.dirname(projectRoot), 'Wohnungsplaner_Generated');
const forbiddenDirs = new Set([
  'node_modules', 'dist', '.next', '.vinext', '.wrangler', '.local', 'artifacts',
  'coverage', 'test-results', 'playwright-report', 'graphify-out',
]);
const forbiddenRootDirs = new Set(['build', 'cache', 'logs', 'downloads', 'tmp', 'temp', 'reports']);
const required = [
  'AGENTS.md', 'README.md', 'package.json', 'package-lock.json',
  'scripts/github-workflow.mjs', 'scripts/git-guard.mjs',
  'scripts/workspace-setup.mjs', 'tests/workspace-layout.test.mjs',
];

export function isForbiddenTrackedPath(value) {
  const p = value.replace(/\\/g, '/').replace(/^\.\//, '');
  const parts = p.split('/');
  const base = parts.at(-1);
  if (parts.some(part => forbiddenDirs.has(part))) return true;
  if (parts.length > 1 && forbiddenRootDirs.has(parts[0])) return true;
  if (base === '.env.example') return false;
  if (/^\.env(?:\..+)?$/i.test(base)) return true;
  return /(?:\.log|\.tsbuildinfo|\.tmp|\.swp|\.lnk)$/i.test(base) ||
    base === 'Thumbs.db' || base === '.DS_Store';
}

export function validateGitIndex(indexEntries) {
  const issues = [];
  for (const entry of indexEntries.split('\0')) {
    if (!entry) continue;
    const match = /^(\d{6}) [0-9a-f]+ \d+\t(.+)$/.exec(entry);
    if (!match) { issues.push('Unrecognized Git index entry'); continue; }
    const [, mode, name] = match;
    if (mode === '120000') issues.push('Tracked symlink: ' + name);
    if (mode === '160000') issues.push('Nested Git submodule: ' + name);
    if (isForbiddenTrackedPath(name)) issues.push('Tracked generated/private file: ' + name);
  }
  return issues;
}

function git(...args) {
  const result = spawnSync(process.platform === 'win32' ? 'git.exe' : 'git', args,
    { cwd: projectRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Git ' + args[0] + ': ' +
    (result.stderr || result.error?.message || 'failed').trim());
  return result.stdout.trimEnd();
}

function inspectDirectories() {
  const issues = [];
  if (path.basename(projectRoot).toLowerCase() !== 'wohnungsplaner') {
    issues.push('Canonical source directory must be named wohnungsplaner');
  }
  const generated = existsSync(generatedRoot) ? lstatSync(generatedRoot) : null;
  if (!generated?.isDirectory() || generated.isSymbolicLink()) {
    issues.push('Generated sibling must be a real directory: ' + generatedRoot);
  }
  for (const item of required) if (!existsSync(path.join(projectRoot, item))) {
    issues.push('Missing permanent project file: ' + item);
  }
  for (const name of [...forbiddenDirs, ...forbiddenRootDirs]) {
    if (existsSync(path.join(projectRoot, name))) {
      issues.push('Generated folder in source root: ' + name);
    }
  }
  const queue = ['app', 'models', 'public', 'scripts', 'tests', 'worker'];
  while (queue.length) {
    const rel = queue.pop();
    const full = path.join(projectRoot, rel);
    if (!existsSync(full)) continue;
    if (lstatSync(full).isSymbolicLink()) {
      issues.push('Linked directory: ' + rel); continue;
    }
    if (!lstatSync(full).isDirectory()) continue;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      const child = path.join(rel, entry.name);
      if (entry.isSymbolicLink()) issues.push('Symlink in project: ' + child);
      else if (entry.name === '.git') issues.push('Nested Git metadata: ' + child);
      else if (entry.isDirectory()) queue.push(child);
    }
  }
  return issues;
}

function inspectPushRefs() {
  const issues = [];
  // Git supplies local_ref local_oid remote_ref remote_oid on stdin.
  const stdin = readFileSync(0, 'utf8').trim();
  for (const line of stdin.split(/\r?\n/).filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4) { issues.push('Malformed pre-push ref line'); continue; }
    const [, localOid, remoteRef] = fields;
    if (/^0+$/.test(localOid)) issues.push('Branch deletion requires explicit manual review');
    if (remoteRef !== 'refs/heads/main' &&
        process.env.WOHNUNGSPLANER_APPROVED_BRANCH_PUSH !== '1') {
      issues.push('Unapproved branch push: ' + remoteRef);
    }
  }
  return issues;
}

function main() {
  const mode = process.argv[2] || '--verify';
  if (!['--verify', '--pre-push'].includes(mode)) throw new Error('Use --verify or --pre-push');
  const issues = inspectDirectories();
  const top = path.resolve(git('rev-parse', '--show-toplevel'));
  if (top.toLowerCase() !== projectRoot.toLowerCase()) {
    issues.push('Unexpected Git root: ' + top);
  }
  const remote = git('remote', 'get-url', 'origin').replace(/\.git$/, '');
  if (remote !== 'https://github.com/ErpeUser/wohnungsplaner') {
    issues.push('Unexpected origin remote: ' + remote);
  }
  issues.push(...validateGitIndex(git('ls-files', '--stage', '-z')));
  if (mode === '--pre-push') {
    if (git('branch', '--show-current') !== 'main') {
      issues.push('Integration branch must be main');
    }
    issues.push(...inspectPushRefs());
  }
  if (issues.length) {
    console.error('GIT_POLICY_FAILED\n' + issues.map(x => ' - ' + x).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('GIT_POLICY_OK: canonical project, real folders, safe index and origin');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
