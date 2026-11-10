import { command, parseArgs, repoRoot } from "./codex-utils.mjs";

const taskName = "Wohnungsplaner-Codex-Agent";

function taskCommand() {
  return `cd /d "${repoRoot}" && npm run codex:pipeline -- --mode=full`;
}

export async function installAgent({ dryRun = false } = {}) {
  if (process.platform !== "win32") return { supported: false, action: "install", reason: "Nur Windows Task Scheduler ist derzeit implementiert." };
  const result = await command("schtasks.exe", ["/Create", "/SC", "HOURLY", "/TN", taskName, "/TR", taskCommand(), "/F"], { dryRun, allowFailure: true });
  return { supported: true, action: "install", installed: result.code === 0 || dryRun, result };
}

export async function agentStatus({ dryRun = false } = {}) {
  if (process.platform !== "win32") return { supported: false, action: "status", reason: "Nur Windows Task Scheduler ist derzeit implementiert." };
  const result = await command("schtasks.exe", ["/Query", "/TN", taskName, "/FO", "LIST"], { dryRun, allowFailure: true });
  return { supported: true, action: "status", installed: result.code === 0 || dryRun, result };
}

export async function uninstallAgent({ dryRun = false } = {}) {
  if (process.platform !== "win32") return { supported: false, action: "uninstall", reason: "Nur Windows Task Scheduler ist derzeit implementiert." };
  const result = await command("schtasks.exe", ["/Delete", "/TN", taskName, "/F"], { dryRun, allowFailure: true });
  return { supported: true, action: "uninstall", removed: result.code === 0 || dryRun, result };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  const args = parseArgs();
  const action = args.action || "status";
  const run = action === "install" ? installAgent : action === "uninstall" ? uninstallAgent : agentStatus;
  run(args).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
