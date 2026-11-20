import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('full container builds Node 24 output and starts the Cloud Run server', () => {
  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /node:24/);
  assert.match(dockerfile, /npm run build/);
  assert.match(dockerfile, /HOST=0\.0\.0\.0/);
  assert.match(dockerfile, /PORT=8080/);
  assert.match(dockerfile, /serve-local\.mjs/);
});

test('asset overlay copies only runtime planner assets from an existing image', () => {
  const dockerfile = read('Dockerfile.assets');
  assert.match(dockerfile, /ARG BASE_IMAGE/);
  assert.match(dockerfile, /FROM \$\{BASE_IMAGE\}/);
  assert.match(dockerfile, /public[\\/]planner-assets/);
  assert.doesNotMatch(dockerfile, /npm run build/);
});

test('runtime overlay replaces only the production server files', () => {
  const dockerfile = read('Dockerfile.runtime');
  assert.match(dockerfile, /ARG BASE_IMAGE/);
  assert.match(dockerfile, /serve-local\.mjs/);
  assert.match(dockerfile, /resolve-dependencies\.mjs/);
  assert.doesNotMatch(dockerfile, /npm run build/);
});

test('docker context excludes generated and private local data', () => {
  const ignore = read('.dockerignore');
  for (const entry of ['Wohnungsplaner_Generated/', 'node_modules/', '.env*', '*.pem', '*.key']) {
    assert.match(ignore, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), entry);
  }
});

test('cloud build config constrains main deployment and instance cost', () => {
  const config = read('cloudbuild.yaml');
  assert.match(config, /cloudbuild-plan\.mjs/);
  assert.match(config, /Dockerfile\.assets/);
  assert.match(config, /Dockerfile\.runtime/);
  assert.match(config, /npm run assets:check/);
  assert.match(config, /manual-\$\{BUILD_ID\}/);
  assert.match(config, /--min 0/);
  assert.match(config, /--max 2/);
  assert.match(config, /--region "\$\{_REGION\}"/);
  assert.match(config, /PLANNER_PIN_REQUIRED=1/);
  assert.match(config, /PLANNER_ACCESS_PIN=PLANNER_ACCESS_PIN:latest/);
  assert.match(config, /PLANNER_COOKIE_KEY=PLANNER_COOKIE_KEY:latest/);
});
