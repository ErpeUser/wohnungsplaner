import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
  if (files.some(isFullFile)) {
    return { mode: 'full', changedFiles: files, reason: 'Application, source, configuration, or deployment files changed.', requiresAssetCheck: true };
  }
  if (files.every(isAssetOnlyFile) && sameAssetIdentity(previousManifest, currentManifest)) {
    if (!previousImageAvailable) {
      return { mode: 'full', changedFiles: files, reason: 'Asset base image is unavailable.', requiresAssetCheck: true };
    }
    return { mode: 'assets', changedFiles: files, reason: 'Only existing asset bytes or their hashes changed.', requiresAssetCheck: true };
  }
  return { mode: 'full', changedFiles: files, reason: 'Asset structure or deployment metadata changed.', requiresAssetCheck: true };
}

function git(...args) {
  return execFileSync('git.exe', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true }).trim();
}

function readGitJson(ref, file) {
  try { return JSON.parse(execFileSync('git.exe', ['show', `${ref}:${file}`], { cwd: projectRoot, encoding: 'utf8' })); }
  catch { return null; }
}

function main() {
  const commit = process.argv[2] || process.env.COMMIT_SHA || 'HEAD';
  const output = process.argv[3] || path.resolve(projectRoot, '..', 'Wohnungsplaner_Generated', 'reports', 'cloudbuild', 'plan.json');
  const parent = `${commit}^`;
  let plan;
  try {
    const changedFiles = git('diff', '--name-only', parent, commit).split(/\r?\n/).filter(Boolean);
    plan = classifyDeployment({
      changedFiles,
      previousManifest: readGitJson(parent, 'public/planner-assets/manifest.json'),
      currentManifest: readGitJson(commit, 'public/planner-assets/manifest.json'),
      previousImageAvailable: process.env.BASE_IMAGE_AVAILABLE !== 'false',
    });
  } catch {
    plan = classifyDeployment({
      changedFiles: ['__cloudbuild_history_unavailable__'],
      previousImageAvailable: false,
    });
    plan.reason = 'Git history is unavailable in the build workspace. A safe full build is required.';
  }
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...plan, commit, parent, generatedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(JSON.stringify(plan));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
