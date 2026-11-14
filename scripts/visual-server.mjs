import { spawn } from 'node:child_process';

const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Visual server build failed (${code})`)));
});

if (process.env.VISUAL_SKIP_BUILD !== '1') {
  await run(['node_modules/vinext/dist/cli.js', 'build']);
  await run(['sync-client-assets.mjs']);
}
await import('../serve-local.mjs');
