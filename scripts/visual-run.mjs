import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
process.chdir(root);
const mode = process.argv[2] ?? 'all';
const args = process.argv.slice(3);
if (!['gui', 'models', 'all'].includes(mode)) throw new Error('Expected gui, models, or all');
const forwarded = [];
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--live') {
    if (mode !== 'models') throw new Error('--live is only available for visual:models');
    process.env.VISUAL_USE_LIVE_PREVIEW = '1';
  } else if (argument === '--model' || argument === '--view') {
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    process.env[argument === '--model' ? 'VISUAL_MODEL' : 'VISUAL_VIEW'] = value;
  } else if (argument.startsWith('--model=') || argument.startsWith('--view=')) {
    const [key, ...value] = argument.split('=');
    process.env[key === '--model' ? 'VISUAL_MODEL' : 'VISUAL_VIEW'] = value.join('=');
  } else forwarded.push(argument);
}
if (process.env.VISUAL_VIEW && !['front', 'side', 'back', 'perspective'].includes(process.env.VISUAL_VIEW)) throw new Error('Unknown perspective; use front, side, back, or perspective');

// Only this fixed output tree may be replaced. Refuse symbolic-link traversal.
const output = path.resolve(root, 'artifacts/visual/latest');
if (output !== path.join(root, 'artifacts', 'visual', 'latest')) throw new Error('Unsafe visual output directory');
for (const relative of ['artifacts', 'artifacts/visual', 'artifacts/visual/latest']) {
  const stat = await fs.lstat(path.join(root, relative)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  if (stat?.isSymbolicLink()) throw new Error(`Refusing symbolic-link output: ${relative}`);
}
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(path.join(output, 'report'), { recursive: true });
if (process.env.VISUAL_BROWSER_CHANNEL) {
  const result = spawnSync(process.execPath, ['scripts/visual-cloud-preflight.mjs'], { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) {
    console.error('Browser or WebGL preflight failed; no green visual review is possible.');
    process.exit(1);
  }
}
const selection = mode === 'all' ? [] : [mode === 'gui' ? 'planner.spec.ts' : 'models.spec.ts'];
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...selection, ...forwarded], { stdio: 'inherit', env: process.env });
child.once('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.once('exit', (code) => {
  // Inventory is generated even after test failures; every gap remains visible.
  const inventory = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/visual-cloud-inventory.mjs', mode], {
    stdio: 'inherit', env: process.env,
  });
  if (inventory.error) console.error(inventory.error);
  process.exitCode = (code ?? 1) || (inventory.status ?? 1);
});
