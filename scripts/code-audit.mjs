// Repeatable, non-destructive code audit. Tools and reports are disposable.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareWorkspace, ensureDependencies, projectRoot, workspacePath, dependencyRoot } from './workspace-setup.mjs';

prepareWorkspace();
ensureDependencies();
const toolsRoot = workspacePath('tools/code-audit');
const output = workspacePath('reports/code-audit/latest');
mkdirSync(toolsRoot,{recursive:true});
mkdirSync(output,{recursive:true});
const manifest = {
  name:'wohnungsplaner-disposable-code-audit',
  version:'1.0.0', private:true,
  dependencies:{ knip:'6.45.1', madge:'8.0.0' },
};
const toolPackage = path.join(toolsRoot,'package.json');
const previousPackage = existsSync(toolPackage) ? JSON.parse(readFileSync(toolPackage,'utf8')) : {};
const needsTools = !existsSync(path.join(toolsRoot,'node_modules/knip/package.json')) ||
  !existsSync(path.join(toolsRoot,'node_modules/madge/package.json')) ||
  JSON.stringify(previousPackage.dependencies) !== JSON.stringify(manifest.dependencies);
if (needsTools) {
  writeFileSync(toolPackage, JSON.stringify(manifest,null,2)+'\n');
  const env={...process.env,npm_config_cache:workspacePath('cache/npm')};
  if (process.platform==='win32') {
    execFileSync('cmd.exe',['/d','/s','/c','npm.cmd install --no-audit --no-fund'],{
      cwd:toolsRoot,env,stdio:'inherit',windowsHide:true,timeout:600000,
    });
  } else execFileSync('npm',['install','--no-audit','--no-fund'],{
    cwd:toolsRoot,env,stdio:'inherit',timeout:600000,
  });
}
function entry(binName) {
  const packagePath=path.join(toolsRoot,'node_modules',binName,'package.json');
  const pkg=JSON.parse(readFileSync(packagePath,'utf8'));
  const rel=typeof pkg.bin==='string'?pkg.bin:pkg.bin?.[binName] ?? Object.values(pkg.bin ?? {})[0];
  if(!rel)throw Error('No CLI for '+binName);
  return path.join(path.dirname(packagePath),rel);
}
const knipConfig=path.join(toolsRoot,'knip.generated.json');
writeFileSync(knipConfig,JSON.stringify({
  entry:[
    'app/page.tsx','app/layout.tsx','app/dev/**/*.{ts,tsx}',
    'scripts/desktop-runtime.mjs','scripts/visual-run.mjs','scripts/workspace-setup.mjs',
    'scripts/security-audit.mjs','scripts/workspace-inventory.mjs','scripts/workspace-exec.mjs',
    // Loaded by NODE_OPTIONS and Playwright webServer: dynamic, but genuinely in use.
    'scripts/resolve-dependencies.mjs','scripts/visual-server.mjs',
    'scripts/check-*.mjs','scripts/launch-desktop.ps1',
    'scripts/crawl-chair-sources.mjs','scripts/crawl-table-sources.mjs',
    'scripts/generate-planner-assets.mjs','scripts/prepare-planner-asset.mjs',
    'scripts/visual-cloud-preflight.mjs','scripts/visual-dev.mjs',
    'worker/index.ts','serve-local.mjs','sync-client-assets.mjs',
    'vite.config.ts','vitest.config.ts','playwright.config.ts',
    'tests/**/*.{ts,tsx,mjs}',
  ],
  project:['app/**/*.{ts,tsx}','worker/**/*.{ts,tsx}','scripts/**/*.{js,mjs}',
           'tests/**/*.{ts,tsx,mjs}','*.{js,mjs,ts,tsx}'],
  ignore:['Wohnungsplaner_Generated/**','node_modules/**','dist/**','.next/**','.vinext/**',
          'artifacts/**','.local/**','models/**','public/**'],
},null,2)+'\n');
const results={date:new Date().toISOString(),projectRoot,toolsRoot,output,checks:{}};
function run(name,program,args,reportName,env={}){
  console.log('RUN '+name);
  const result=spawnSync(program,args,{cwd:projectRoot,
    env:{...process.env,...env},encoding:'utf8',maxBuffer:48*1024*1024,windowsHide:true,
    timeout:name==='knip'?240000:120000});
  const content=result.stdout||'';
  writeFileSync(path.join(output,reportName),content);
  if(result.stderr)writeFileSync(path.join(output,name+'.stderr.txt'),result.stderr);
  results.checks[name]={exitCode:result.status,signal:result.signal,
    error:result.error?.message ?? null,bytes:Buffer.byteLength(content),
    report:path.join(output,reportName)};
  console.log(name+' EXIT='+result.status+' BYTES='+results.checks[name].bytes);
  return result;
}
run('knip',process.execPath,[entry('knip'),'--config',knipConfig,'--reporter','json','--no-progress'],'knip.json');
run('madge-cycles',process.execPath,[entry('madge'),'--circular','--json',
  '--extensions','ts,tsx','--ts-config','tsconfig.json','app/planner'],'madge-cycles.json');
run('madge-graph',process.execPath,[entry('madge'),'--json',
  '--extensions','ts,tsx','--ts-config','tsconfig.json','app/planner'],'madge-graph.json');
run('typescript',process.execPath,[path.join(dependencyRoot,'typescript/bin/tsc'),'--noEmit','-p','tsconfig.typecheck.json','--pretty','false'],'typescript.txt');
run('eslint',process.execPath,[path.join(dependencyRoot,'eslint/bin/eslint.js'),'.','--format','json'],'eslint.json',{
  NODE_OPTIONS:[process.env.NODE_OPTIONS??'',
    '--import='+pathToFileURL(path.join(projectRoot,'scripts','resolve-dependencies.mjs')).href]
    .filter(Boolean).join(' '),
});
results.checks.coverage='Run npm run test:coverage for V8 coverage; browser test via npm run visual:check -- --model=<ID>.';
writeFileSync(path.join(output,'summary.json'),JSON.stringify(results,null,2)+'\n');
if(results.checks.typescript.exitCode!==0||results.checks.eslint.exitCode!==0)process.exitCode=1;
console.log('RESULT='+path.join(output,'summary.json'));
