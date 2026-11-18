import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import {
  projectRoot, generatedRoot, dependencyRoot, prepareWorkspace,
  inspectWorkspace, workspacePath, workspaceEnvironment,
} from '../scripts/workspace-setup.mjs';

test('canonical code and disposable data are siblings inside Wohnung', () => {
  assert.equal(path.dirname(projectRoot), path.dirname(generatedRoot));
  assert.equal(path.basename(generatedRoot), 'Wohnungsplaner_Generated');
  assert.equal(path.basename(projectRoot), 'wohnungsplaner');
  assert.equal(lstatSync(generatedRoot).isDirectory(), true);
  assert.equal(lstatSync(generatedRoot).isSymbolicLink(), false);
  for(const name of ['app','models','public','scripts','tests','worker']){
    const st=lstatSync(path.join(projectRoot,name));
    assert.equal(st.isDirectory(),true,name);
    assert.equal(st.isSymbolicLink(),false,name);
  }
});

test('no real or linked generated paths remain within canonical code', () => {
  const report=inspectWorkspace();
  assert.equal(report.ready,true,JSON.stringify(report.problems));
  for(const name of ['node_modules','dist','.next','.vinext','.wrangler','.local','artifacts']){
    assert.equal(existsSync(path.join(projectRoot,name)),false,name);
  }
  assert.equal(dependencyRoot,path.join(generatedRoot,'dependencies','node_modules'));
});

test('generated paths cannot escape to permanent sources', () => {
  assert.equal(workspacePath('reports/test.txt'),path.join(generatedRoot,'reports/test.txt'));
  for(const value of ['../models','..\\app','build/../../scripts',path.parse(projectRoot).root]){
    assert.throws(()=>workspacePath(value),/Unsafe generated path/);
  }
});

test('npm, Playwright and temp variables stay within the sibling Generated folder', () => {
  prepareWorkspace();
  const e=workspaceEnvironment();
  assert.equal(e.npm_config_cache,path.join(generatedRoot,'cache','npm'));
  assert.equal(e.PLAYWRIGHT_BROWSERS_PATH,path.join(generatedRoot,'downloads','playwright'));
  assert.equal(e.TEMP,path.join(generatedRoot,'tmp'));
});

test('all permanent rebuild configurations and entrypoints are present', () => {
  for(const name of [
    'package.json','package-lock.json','vite.config.ts','tsconfig.json',
    'scripts/workspace-setup.mjs','scripts/workspace-exec.mjs',
    'scripts/resolve-dependencies.mjs','serve-local.mjs','start-wohnungsplaner.ps1',
  ])assert.equal(existsSync(path.join(projectRoot,name)),true,name);
});
