import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = path.join(repositoryRoot, '.local');
const url = 'http://127.0.0.1:3001/';
function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', timeout: 30000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  }).trim();
}
export function synchronizeRepository(root) {
  const result = { changed: false, dependenciesChanged: false, skipped: false, warning: '' };
  if (git(root, ['branch', '--show-current']) !== 'main') {
    return { ...result, skipped: true, warning: 'Anderer Arbeitszweig aktiv: automatisches Update pausiert.' };
  }
  if (git(root, ['status', '--porcelain'])) {
    return { ...result, skipped: true, warning: 'Lokale Änderungen bleiben erhalten; automatisches Update pausiert.' };
  }
  const before = git(root, ['rev-parse', 'HEAD']);
  try {
    git(root, ['fetch', 'origin', 'main']);
    // Never merge, reset, stash, rebase, switch branches, or publish local work.
    git(root, ['merge', '--ff-only', 'origin/main']);
  } catch {
    return { ...result, warning: 'GitHub-Update nicht möglich; vorhandene lokale Version wird verwendet.' };
  }
  const after = git(root, ['rev-parse', 'HEAD']);
  return { ...result, changed: before !== after,
    dependenciesChanged: before !== after && /^(package(-lock)?\.json)$/m.test(git(root, ['diff', '--name-only', before, after])),
  };
}
function readJson(name) {
  try { return JSON.parse(readFileSync(path.join(local, name), 'utf8')); } catch { return null; }
}
function save(name, data) {
  const target = path.join(local, name);
  writeFileSync(`${target}.tmp`, JSON.stringify(data, null, 2));
  renameSync(`${target}.tmp`, target);
}
function status(phase, message, extra = {}) {
  save('desktop-state.json', { phase, message, url, repositoryRoot, updatedAt: new Date().toISOString(), ...extra });
}
function powershell(code) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from("$ProgressPreference = 'SilentlyContinue'; " + code, 'utf16le').toString('base64')],
    { encoding: 'utf8', windowsHide: true, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] });
}
function processDetails(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const details = powershell(`Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object Name,CommandLine | ConvertTo-Json -Compress`).trim();
  return details ? JSON.parse(details) : null;
}
export function acquireWorkerLock(folder) {
  const lockPath = path.join(folder, 'desktop-worker.lock');
  if (existsSync(lockPath)) {
    let owner;
    try { owner = JSON.parse(readFileSync(lockPath, 'utf8')); } catch { owner = null; }
    const details = processDetails(owner?.pid);
    if (details?.Name === 'node.exe' && details.CommandLine?.includes(fileURLToPath(import.meta.url))) return null;
    unlinkSync(lockPath);
  }
  try {
    const fd = openSync(lockPath, 'wx');
    writeFileSync(fd, JSON.stringify({ pid: process.pid })); closeSync(fd);
  } catch (error) {
    if (error.code === 'EEXIST') return null;
    throw error;
  }
  return () => { if (existsSync(lockPath)) unlinkSync(lockPath); };
}
function stopServer() {
  const saved = readJson('desktop-server.json');
  if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0) return;
  const scriptPath = path.join(repositoryRoot, 'scripts', 'visual-dev.mjs');
  const processInfo = processDetails(saved.pid);
  if (!processInfo) return;
  if (processInfo.Name !== 'node.exe' || !processInfo.CommandLine?.includes(scriptPath)) {
    throw new Error('Gespeicherte Prozessnummer gehört nicht zum Wohnungsplaner. Prozess bleibt erhalten.');
  }
  execFileSync('taskkill.exe', ['/PID', String(saved.pid), '/T', '/F'], { windowsHide: true, stdio: 'pipe' });
  unlinkSync(path.join(local, 'desktop-server.json'));
}
async function healthy() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok && /Raumplaner/.test(await response.text());
  } catch { return false; }
}
async function startServer() {
  if (await healthy()) {
    const saved = readJson('desktop-server.json');
    if (!Number.isSafeInteger(saved?.pid) || saved.pid <= 0) throw new Error('Port 3001 ist bereits belegt. Vorhandene Vorschau zuerst beenden.');
    const listener = powershell("Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique").trim();
    if (listener !== String(saved.pid)) throw new Error('Port 3001 gehört einer anderen Vorschau. Diese zuerst beenden.');
    const info = processDetails(saved.pid);
    if (info?.Name !== 'node.exe' || !info.CommandLine?.includes(path.join(repositoryRoot, 'scripts', 'visual-dev.mjs'))) {
      throw new Error('Die laufende Vorschau gehört nicht zu diesem Projektordner.');
    }
    return;
  }
  const out = openSync(path.join(local, 'desktop-server.log'), 'a');
  const child = spawn(process.execPath, [path.join(repositoryRoot, 'scripts', 'visual-dev.mjs')], {
    cwd: repositoryRoot, detached: true, windowsHide: true, stdio: ['ignore', out, out],
  });
  child.unref(); closeSync(out);
  save('desktop-server.json', { pid: child.pid, startedAt: new Date().toISOString(), repositoryRoot });
  for (let attempt = 0; attempt < 90; attempt++) {
    if (await healthy()) return;
    try { process.kill(child.pid, 0); } catch { throw new Error('Start fehlgeschlagen. Siehe .local/desktop-server.log.'); }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Die Vorschau braucht zu lange. Siehe .local/desktop-server.log.');
}
export async function run(action) {
  mkdirSync(local, { recursive: true });
  const release = acquireWorkerLock(local);
  if (!release) { process.exitCode = 2; return; }
  try {
    status('loading', action === 'stop' ? 'Wird beendet …' : 'Aktualisiert und lädt …');
    if (action === 'stop') { stopServer(); status('stopped', 'Beendet'); return; }
    if (!['start', 'update'].includes(action)) throw new Error('Unbekannter Startbefehl');
    const update = synchronizeRepository(repositoryRoot);
    // Restart for entrypoint/config changes too; HMR cannot reload the launcher itself.
    if (update.changed) stopServer();
    const lockHash = createHash('sha256').update(readFileSync(path.join(repositoryRoot, 'package-lock.json'))).digest('hex');
    const installed = readJson('desktop-dependencies.json');
    const install = !existsSync(path.join(repositoryRoot, 'node_modules', 'vinext', 'dist', 'cli.js')) ||
      update.dependenciesChanged || (installed && installed.lockHash !== lockHash);
    if (install) {
      status('loading', 'Installiert aktualisierte Komponenten …');
      stopServer();
      const log = openSync(path.join(local, 'desktop-install.log'), 'a');
      try {
        execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm ci --no-audit --no-fund'], {
          cwd: repositoryRoot, windowsHide: true, timeout: 600000, stdio: ['ignore', log, log],
        });
      } finally { closeSync(log); }
    }
    save('desktop-dependencies.json', { lockHash });
    status('loading', 'Wohnungsplaner lädt …', { warning: update.warning });
    await startServer();
    status('ready', 'Wohnungsplaner bereit', { warning: update.warning, commit: git(repositoryRoot, ['rev-parse', '--short', 'HEAD']) });
  } catch (error) {
    status('error', error.message); process.exitCode = 1;
  } finally { release(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run(process.argv[2] || 'start');
