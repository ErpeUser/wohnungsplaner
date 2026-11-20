import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = 'public/planner-assets/';
const skipPrefixes = ['.github/', 'docs/'];
const fullPrefixes = [
  'app/', 'worker/', 'models/', 'scripts/', 'tests/',
  'package.json', 'package-lock.json', 'serve-local.mjs', 'sync-client-assets.mjs',
  'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tsconfig',
  'Dockerfile', 'cloudbuild.yaml', '.dockerignore', 'AGENTS.md', 'README.md',
];
const runtimeFiles = new Set(['serve-local.mjs', 'scripts/resolve-dependencies.mjs']);

function normalizePath(value) {
  return String(value).trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function uniquePaths(changedFiles) {
  return [...new Set((changedFiles ?? []).map(normalizePath).filter(Boolean))];
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['sha256', 'byteLength', 'generatedBy', 'version'].includes(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, canonicalValue(child)]));
}

function sameAssetIdentity(previousManifest, currentManifest) {
  if (!previousManifest || !currentManifest) return false;
  return JSON.stringify(canonicalValue(previousManifest)) === JSON.stringify(canonicalValue(currentManifest));
}

function isAssetOnlyFile(file) {
  return file.startsWith(assetRoot) || file === 'app/planner/scene-3d/asset-revisions.json';
}

function isSkipFile(file) {
  return skipPrefixes.some((prefix) => file.startsWith(prefix)) ||
    file === 'README.md' || file === 'AGENTS.md' || file.startsWith('tests/');
}

function isFullFile(file) {
  return fullPrefixes.some((prefix) => file === prefix || file.startsWith(prefix));
}

export function classifyDeployment({
  changedFiles = [],
  previousManifest = null,
  currentManifest = null,
  previousImageAvailable = true,
} = {}) {
  const files = uniquePaths(changedFiles);
  if (!files.length || files.every(isSkipFile)) {
    return { mode: 'skip', changedFiles: files, reason: 'No production files changed.', requiresAssetCheck: false };
  }
  if (files.every((file) => runtimeFiles.has(file))) {
    if (!previousImageAvailable) {
      return { mode: 'full', changedFiles: files, reason: 'Runtime base image is unavailable.', requiresAssetCheck: true };
    }
    return { mode: 'runtime', changedFiles: files, reason: 'Only the production server runtime changed.', requiresAssetCheck: false };
  }
  if (files.some(isFullFile)) {
    return { mode: 'full', changedFiles: files, reason: 'Application, source, configuration, or deployment files changed.', requiresAssetCheck: true };
  }
  if (files.every(isAssetOnlyFile) && sameAssetIdentity(previousManifest, currentManifest)) {
    return { mode: 'asset-live', changedFiles: files, reason: 'Only existing asset bytes or their hashes changed.', requiresAssetCheck: true };
  }
  if (files.every(isAssetOnlyFile)) {
    return { mode: 'asset-live', changedFiles: files, reason: 'Only planner assets or their manifest changed.', requiresAssetCheck: true };
  }
  return { mode: 'full', changedFiles: files, reason: 'Asset structure or deployment metadata changed.', requiresAssetCheck: true };
}

function git(...args) {
  const executable = process.platform === 'win32' ? 'git.exe' : 'git';
  return execFileSync(executable, args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim();
}

function readGitJson(ref, file) {
  try {
    const executable = process.platform === 'win32' ? 'git.exe' : 'git';
    return JSON.parse(execFileSync(executable, ['show', `${ref}:${file}`], { cwd: projectRoot, encoding: 'utf8' }));
  }
  catch { return null; }
}

async function readGithubJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'wohnungsplaner-cloudbuild',
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

async function classifyFromGithub(commit) {
  const repository = process.env.DEPLOY_REPOSITORY || 'ErpeUser/wohnungsplaner';
  const commitInfo = await readGithubJson(`https://api.github.com/repos/${repository}/commits/${commit}`);
  const parent = commitInfo.parents?.[0]?.sha;
  const changedFiles = (commitInfo.files ?? []).map((file) => file.filename);
  if (!parent || !changedFiles.length) throw new Error('GitHub commit history is incomplete');
  let previousManifest = null;
  try {
    const response = await fetch(`https://raw.githubusercontent.com/${repository}/${parent}/public/planner-assets/manifest.json`);
    if (response.ok) previousManifest = await response.json();
  } catch {
    previousManifest = null;
  }
  const currentManifest = JSON.parse(readFileSync(path.join(projectRoot, 'public', 'planner-assets', 'manifest.json'), 'utf8'));
  return {
    parent,
    plan: classifyDeployment({
      changedFiles,
      previousManifest,
      currentManifest,
      previousImageAvailable: process.env.BASE_IMAGE_AVAILABLE !== 'false',
    }),
  };
}

async function main() {
  const commit = process.argv[2] || process.env.COMMIT_SHA || 'HEAD';
  const output = process.argv[3] || path.resolve(projectRoot, '..', 'Wohnungsplaner_Generated', 'reports', 'cloudbuild', 'plan.json');
  const parent = `${commit}^`;
  let plan;
  let resolvedParent = parent;
  try {
    const changedFiles = git('diff', '--name-only', parent, commit).split(/\r?\n/).filter(Boolean);
    plan = classifyDeployment({
      changedFiles,
      previousManifest: readGitJson(parent, 'public/planner-assets/manifest.json'),
      currentManifest: readGitJson(commit, 'public/planner-assets/manifest.json'),
      previousImageAvailable: process.env.BASE_IMAGE_AVAILABLE !== 'false',
    });
  } catch {
    try {
      const github = await classifyFromGithub(commit);
      plan = github.plan;
      resolvedParent = github.parent;
      plan.reason += ' GitHub commit metadata supplied the parent diff.';
    } catch {
      plan = classifyDeployment({
        changedFiles: ['__cloudbuild_history_unavailable__'],
        previousImageAvailable: false,
      });
      plan.reason = 'Git history and public GitHub commit metadata are unavailable. A safe full build is required.';
    }
  }
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...plan, commit, parent: resolvedParent, generatedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(JSON.stringify(plan));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
