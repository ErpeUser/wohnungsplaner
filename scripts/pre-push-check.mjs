import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeFiles = new Set(['serve-local.mjs', 'scripts/resolve-dependencies.mjs']);

function normalize(value) {
  return String(value).trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function git(...args) {
  return execFileSync('git.exe', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim();
}

function changedFilesFromRefs(input) {
  const files = new Set();
  for (const line of String(input).split(/\r?\n/).filter(Boolean)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 4) continue;
    const [, localOid, remoteRef, remoteOid] = fields;
    if (remoteRef !== 'refs/heads/main') continue;
    const base = /^0+$/.test(remoteOid) ? `${localOid}^` : remoteOid;
    const diff = git('diff', '--name-only', base, localOid);
    for (const file of diff.split(/\r?\n/).map(normalize).filter(Boolean)) files.add(file);
  }
  return [...files];
}

function classifyLocalPush(changedFiles) {
  const files = [...new Set(changedFiles.map(normalize).filter(Boolean))];
  if (!files.length || files.every((file) => file.startsWith('docs/') || file.startsWith('.github/') || file === 'README.md' || file === 'AGENTS.md')) {
    return { mode: 'skip', changedFiles: files };
  }
  if (files.every((file) => runtimeFiles.has(file))) return { mode: 'runtime', changedFiles: files };
  if (files.every((file) => file.startsWith('public/planner-assets/') || file === 'app/planner/scene-3d/asset-revisions.json')) {
    return { mode: 'assets', changedFiles: files };
  }
  return { mode: 'full', changedFiles: files };
}

function run(command, args) {
  const program = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const result = spawnSync(program, args, { cwd: projectRoot, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}

export { changedFilesFromRefs, classifyLocalPush };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const plan = classifyLocalPush(changedFilesFromRefs(input));
  console.log(`Local pre-push mode: ${plan.mode}`);
  if (plan.mode === 'skip') process.exit(0);
  run('npm', ['run', 'workspace:doctor']);
  if (plan.mode === 'runtime') {
    run('node', ['--check', 'serve-local.mjs']);
    run('node', ['--check', 'scripts/resolve-dependencies.mjs']);
    run('node', ['--test', 'tests/serve-local.test.mjs', 'tests/cloud-deployment-config.test.mjs']);
    run('npm', ['run', 'privacy:check:strict']);
    process.exit(0);
  }
  if (plan.mode === 'assets') {
    run('npm', ['run', 'assets:check']);
    run('node', ['--test', 'tests/cloudbuild-plan.test.mjs']);
    run('npm', ['run', 'privacy:check:strict']);
    process.exit(0);
  }
  run('npm', ['run', 'build']);
  run('npm', ['run', 'validate']);
  run('npm', ['run', 'privacy:check:strict']);
}
