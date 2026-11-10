import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const execFileAsync = promisify(execFile);
export const repoRoot = process.env.CODEX_REPO_ROOT || process.cwd();
export const localDir = path.join(repoRoot, ".local");

export async function ensureLocalDir() {
  await mkdir(localDir, { recursive: true });
}

export async function command(command, args = [], options = {}) {
  const { dryRun = false, cwd = repoRoot, env, allowFailure = false } = options;
  const display = [command, ...args].join(" ");
  if (dryRun) return { command: display, dryRun: true, stdout: "", stderr: "", code: 0 };
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env: { ...process.env, ...env },
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return { command: display, stdout: result.stdout ?? "", stderr: result.stderr ?? "", code: 0 };
  } catch (error) {
    const result = { command: display, stdout: error.stdout ?? "", stderr: error.stderr ?? error.message, code: error.code ?? 1 };
    if (allowFailure) return result;
    const wrapped = new Error(`${display} failed (${result.code}): ${String(result.stderr).trim()}`);
    wrapped.result = result;
    throw wrapped;
  }
}

export async function readJson(file, fallback = null) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function git(args, options = {}) { return command("git", args, options); }

export async function gitOutput(args, options = {}) {
  return (await git(args, options)).stdout.trim();
}

export async function detectDefaultBranch() {
  const symbolic = await gitOutput(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], { allowFailure: true });
  if (symbolic) return symbolic.replace(/^origin\//, "");
  const gh = await command("gh", ["repo", "view", "--json", "defaultBranchRef", "-q", ".defaultBranchRef.name"], { allowFailure: true });
  if (gh.code === 0 && gh.stdout.trim()) return gh.stdout.trim();
  return await gitOutput(["branch", "--show-current"], { allowFailure: true }) || "main";
}

export async function changedFiles(base = "HEAD") {
  const [committed, staged, working, untracked] = await Promise.all([
    git(["diff", "--name-only", base], { allowFailure: true }),
    git(["diff", "--cached", "--name-only"], { allowFailure: true }),
    git(["diff", "--name-only"], { allowFailure: true }),
    git(["ls-files", "--others", "--exclude-standard"], { allowFailure: true }),
  ]);
  return [...new Set([committed, staged, working, untracked]
    .flatMap((result) => result.stdout.split(/\r?\n/))
    .map((value) => value.trim())
    .filter(Boolean))];
}

export function classifyChanges(files = []) {
  const normalized = files.map((file) => file.replaceAll("\\", "/"));
  const onlyDocs = normalized.length > 0 && normalized.every((file) => /^(docs\/|README(?:\.md)?$|.*\.md$)/i.test(file));
  const lockChanged = normalized.some((file) => /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file));
  const packageChanged = normalized.some((file) => /(^|\/)package\.json$/.test(file));
  const cssChanged = normalized.some((file) => /\.css$/i.test(file));
  const sourceChanged = normalized.some((file) => /\.(tsx?|jsx?|vue|svelte|mjs|cjs)$/i.test(file) && !/^(scripts\/codex-|tests\/|__tests__\/)/.test(file));
  const serverChanged = normalized.some((file) => /(^|\/)(serve-local|next\.config|vite\.config|vinext\.config|worker\/).*(\.[cm]?[jt]s)?$/i.test(file));
  const assetChanged = normalized.some((file) => /\.(glb|gltf|hdr|png|jpe?g|webp|svg)$/i.test(file));
  const desktopChanged = normalized.some((file) => /(^|\/)(electron|electron-builder|electron-forge|src-tauri|tauri\.conf|.*\.csproj|.*\.wixproj)/i.test(file));
  return { files: normalized, onlyDocs, lockChanged, packageChanged, cssChanged, sourceChanged, serverChanged, assetChanged, desktopChanged };
}

export function determineActions(changes, environment = {}) {
  const desktop = Boolean(environment.desktop || environment.hasDesktopConfig || changes.desktopChanged);
  const build = !changes.onlyDocs && (changes.sourceChanged || changes.cssChanged || changes.lockChanged || changes.packageChanged || changes.serverChanged || changes.assetChanged || changes.desktopChanged);
  return {
    installDependencies: Boolean(changes.lockChanged || changes.packageChanged),
    runTests: changes.files.length > 0 && !changes.onlyDocs,
    build,
    buildDesktop: desktop && build,
    restart: Boolean(build && (changes.cssChanged || changes.sourceChanged || changes.serverChanged || changes.packageChanged || changes.lockChanged)),
    reason: changes.onlyDocs ? "Nur Dokumentation geändert" : build ? "Relevante Quell-/Konfigurationsänderungen" : "Keine Build-relevante Änderung",
  };
}

export function sha256File(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }

export function parseArgs(argv = process.argv.slice(2)) {
  const result = {};
  for (const arg of argv) {
    if (arg === "--dry-run") result.dryRun = true;
    else if (arg.startsWith("--mode=")) result.mode = arg.slice(7);
    else if (arg.startsWith("--base=")) result.base = arg.slice(7);
    else if (arg === "--merge") result.merge = true;
    else if (arg === "--restart") result.restart = true;
    else if (arg === "install" || arg === "status" || arg === "uninstall") result.action = arg;
  }
  return result;
}

export async function repositorySnapshot() {
  const branch = await gitOutput(["branch", "--show-current"], { allowFailure: true });
  const head = await gitOutput(["rev-parse", "HEAD"], { allowFailure: true });
  const status = (await git(["status", "--porcelain=v1"], { allowFailure: true })).stdout;
  const defaultBranch = await detectDefaultBranch();
  const remoteHead = await gitOutput(["rev-parse", `origin/${defaultBranch}`], { allowFailure: true });
  const counts = await gitOutput(["rev-list", "--left-right", "--count", `HEAD...origin/${defaultBranch}`], { allowFailure: true });
  const [ahead = "0", behind = "0"] = counts.split(/\s+/);
  return { branch, head, defaultBranch, remoteHead, dirty: Boolean(status.trim()), status, ahead: Number(ahead) || 0, behind: Number(behind) || 0 };
}

export async function saveState(name, value) { await ensureLocalDir(); await writeJson(path.join(localDir, name), value); }
export async function fileExists(file) { try { await access(file); return true; } catch { return false; } }
