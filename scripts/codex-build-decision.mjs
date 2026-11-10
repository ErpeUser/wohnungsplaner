import { changedFiles, classifyChanges, determineActions, parseArgs } from "./codex-utils.mjs";

export async function buildDecision({ base = "HEAD", environment = {} } = {}) {
  const files = await changedFiles(base);
  const changes = classifyChanges(files);
  const decision = determineActions(changes, environment);
  const result = { changes, decision };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-build-decision.mjs")) buildDecision(parseArgs()).catch((error) => { console.error(error.message); process.exitCode = 1; });
