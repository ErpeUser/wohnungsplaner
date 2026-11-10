import { readFile } from "node:fs/promises";
import { command, fileExists, localDir, parseArgs, saveState } from "./codex-utils.mjs";
import path from "node:path";

const pidFile = path.join(localDir, "codex-server.pid");

export async function runtimeStatus() {
  const pid = await readFile(pidFile, "utf8").then((value) => Number(value.trim())).catch(() => null);
  let running = false;
  if (pid) {
    const probe = process.platform === "win32"
      ? await command("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV"], { allowFailure: true })
      : await command("kill", ["-0", String(pid)], { allowFailure: true });
    running = probe.code === 0 && (!probe.stdout || !/No tasks are running/i.test(probe.stdout));
  }
  return { pid, running, pidFile: await fileExists(pidFile) };
}

export async function restartRuntime({ dryRun = false, restart = false } = {}) {
  const status = await runtimeStatus();
  if (!restart) return { status, restarted: false, reason: "Neustart nicht angefordert" };
  if (!status.running) return { status, restarted: false, reason: "Kein eigener Projektprozess registriert" };
  if (!process.env.CODEX_RUNTIME_STOP_COMMAND || !process.env.CODEX_RUNTIME_START_COMMAND) {
    return { status, restarted: false, blocked: "CODEX_RUNTIME_STOP_COMMAND und CODEX_RUNTIME_START_COMMAND müssen für einen sicheren Neustart gesetzt sein" };
  }
  const stop = await command(process.platform === "win32" ? "powershell.exe" : "sh", process.platform === "win32" ? ["-NoProfile", "-Command", process.env.CODEX_RUNTIME_STOP_COMMAND] : ["-c", process.env.CODEX_RUNTIME_STOP_COMMAND], { dryRun, allowFailure: true });
  if (stop.code !== 0) return { status, restarted: false, blocked: "Stop-Befehl fehlgeschlagen", stop };
  const start = await command(process.platform === "win32" ? "powershell.exe" : "sh", process.platform === "win32" ? ["-NoProfile", "-Command", process.env.CODEX_RUNTIME_START_COMMAND] : ["-c", process.env.CODEX_RUNTIME_START_COMMAND], { dryRun, allowFailure: true });
  const result = { status, restarted: start.code === 0, stop, start };
  if (result.restarted && !dryRun) await saveState("codex-runtime-state.json", { runningCommit: process.env.CODEX_SOURCE_COMMIT || null, lastSuccessfulStart: new Date().toISOString(), pendingActions: [] });
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-runtime.mjs")) restartRuntime(parseArgs()).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
