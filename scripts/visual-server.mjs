import { spawn } from 'node:child_process';
import path from 'node:path';
import { ensureDependencies, dependencyRoot, collectOutputs } from './workspace-setup.mjs';

ensureDependencies();
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('Visual server build failed: ' + code)));
});

if (process.env.VISUAL_SKIP_BUILD !== '1') {
  await run([path.join(dependencyRoot, 'vinext', 'dist', 'cli.js'), 'build']);
  await run(['sync-client-assets.mjs']);
  collectOutputs();
}
await import('../serve-local.mjs');
