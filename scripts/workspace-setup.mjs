// Canonical sources live in ./wohnungsplaner; disposable files are its sibling.
// No Windows junction, symlink, copied source tree, or package-directory pointer.
import {
  existsSync, lstatSync, mkdirSync, readFileSync, copyFileSync,
  writeFileSync, rmSync, readdirSync, renameSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const generatedRoot = path.resolve(projectRoot, '..', 'Wohnungsplaner_Generated');
export const dependencyRoot = path.join(generatedRoot, 'dependencies', 'node_modules');
const requiredSources = [
  'app', 'models', 'public', 'scripts', 'tests', 'worker',
  'package.json', 'package-lock.json', 'vite.config.ts',
  'tsconfig.json', 'serve-local.mjs', 'start-wohnungsplaner.ps1',
];
const disposableTargets = {
  dist: 'build/dist',
  '.next': 'build/next',
  '.vinext': 'build/vinext',
  '.wrangler': 'cache/wrangler',
  '.local': 'logs/local',
  artifacts: 'reports/artifacts',
};
export const forbiddenRootEntries = ['node_modules', ...Object.keys(disposableTargets)];
function statOrNull(file) {
  try { return lstatSync(file); }
  catch (err) { if (err.code === 'ENOENT') return null; throw err; }
}
function assertSafeRoots() {
  if (path.dirname(projectRoot).toLowerCase() !== path.dirname(generatedRoot).toLowerCase()) {
    throw new Error('Source and generated data must be sibling folders.');
  }
  if (path.basename(generatedRoot) !== 'Wohnungsplaner_Generated') {
    throw new Error('Unsafe generated folder name.');
  }
  const generatedStat = statOrNull(generatedRoot);
  if (generatedStat && (!generatedStat.isDirectory() || generatedStat.isSymbolicLink())) {
    throw new Error('Generated workspace must be a real folder, not a link.');
  }
  for (const name of requiredSources) {
    const p = path.join(projectRoot, name);
    if (!existsSync(p) || statOrNull(p)?.isSymbolicLink()) {
      throw new Error('Missing or linked permanent source: ' + name);
    }
  }
}
export function workspacePath(rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) ||
      rel.split(/[\\/]/).some(part => part === '..' || part === '')) {
    throw new Error('Unsafe generated path');
  }
  return path.join(generatedRoot, rel);
}
export function workspaceEnvironment() {
  return {
    PLAYWRIGHT_BROWSERS_PATH: workspacePath('downloads/playwright'),
    npm_config_cache: workspacePath('cache/npm'),
    TEMP: workspacePath('tmp'),
    TMP: workspacePath('tmp'),
    TMPDIR: workspacePath('tmp'),
  };
}
export function prepareWorkspace() {
  assertSafeRoots();
  for (const sub of [
    'dependencies','build','cache/npm','cache/vite','cache/wrangler','agents',
    'docs','downloads/playwright','logs/local','reports/artifacts','tmp','tools','desktop',
    'git',
  ]) mkdirSync(workspacePath(sub), { recursive: true });
  const guide = workspacePath('README-LOESCHBAR.txt');
  if (!existsSync(guide)) writeFileSync(guide, [
    'Wohnungsplaner: nur reproduzierbare Build-, Paket-, Cache- und Hilfsdateien',
    'Git-Metadaten in git/repository koennen unveroeffentlichte Commits, Branches und Stashes enthalten.',
    'Vor dem Loeschen des Ordners erst Git-Status, Remote und lokale Sonderreferenzen pruefen.',
    'Ohne nachweisliche Sicherung niemals das ganze Verzeichnis loeschen.',
    'Dauerhafte Quellen, Programmstarts, Modelle und Konfiguration sind im Schwesterordner wohnungsplaner.',
    'Node.js 24+ und bei Neuinstallation Internetzugriff koennen erforderlich sein.',
    'Browser-Benutzerdaten und persoenliche Originaldateien liegen NICHT in diesem Ordner.',
    'Git-Metadaten muessen nach Loeschung bei Bedarf mit npm run github:setup neu geholt werden.',
    '',
  ].join('\n'),'utf8');
  Object.assign(process.env, workspaceEnvironment());
  return {projectRoot,generatedRoot,dependencyRoot};
}
function digest(x) { return createHash('sha256').update(x).digest('hex'); }
function dependencySignature() {
  const manifest=JSON.parse(readFileSync(path.join(projectRoot,'package.json'),'utf8'));
  const tracked = Object.fromEntries([
    'name','version','dependencies','devDependencies','optionalDependencies',
    'peerDependencies','overrides','engines','packageManager',
  ].map(k=>[k,manifest[k]??null]));
  return digest(JSON.stringify(tracked) + ':' + readFileSync(path.join(projectRoot,'package-lock.json'),'utf8'));
}
export function ensureDependencies(force=false) {
  prepareWorkspace();
  const installed = ['vinext/dist/cli.js','typescript/bin/tsc',
    'vitest/vitest.mjs','eslint/bin/eslint.js','@playwright/test/cli.js'];
  const stamp = workspacePath('cache/dependency-lock.sha256');
  const signature = dependencySignature();
  if (!force && existsSync(stamp) &&
      readFileSync(stamp,'utf8').trim()===signature &&
      installed.every(x=>existsSync(path.join(dependencyRoot,x)))) return false;
  const dest=workspacePath('dependencies');
  copyFileSync(path.join(projectRoot,'package.json'),path.join(dest,'package.json'));
  copyFileSync(path.join(projectRoot,'package-lock.json'),path.join(dest,'package-lock.json'));
  const env = {...process.env,...workspaceEnvironment(),npm_config_audit:'false',npm_config_fund:'false'};
  if (process.platform==='win32') execFileSync('cmd.exe',['/d','/s','/c','npm.cmd ci --no-audit --no-fund'],{
    cwd:dest,env,windowsHide:true,stdio:'inherit',timeout:600000,
  });
  else execFileSync('npm',['ci','--no-audit','--no-fund'],{
    cwd:dest,env,stdio:'inherit',timeout:600000,
  });
  if (!installed.every(x=>existsSync(path.join(dependencyRoot,x)))) {
    throw new Error('npm install did not produce the required package files.');
  }
  writeFileSync(stamp,signature+'\n');
  return true;
}
export function collectOutputs() {
  prepareWorkspace();
  const moved=[];
  for(const [name,rel] of Object.entries(disposableTargets)){
    const source=path.join(projectRoot,name);
    const st=statOrNull(source);
    if(!st)continue;
    if(!st.isDirectory() || st.isSymbolicLink()){
      throw new Error('Refusing to operate on a non-directory or linked output: '+source);
    }
    // Framework-created hidden directories are disposable caches. Avoid
    // renaming them on Windows: native file watchers can hold open handles.
    // Keep the already externalized cache, remove only the newly emitted duplicate.
    if(name!=='dist'){
      rmSync(source,{recursive:true,force:true,maxRetries:10,retryDelay:250});
      if(statOrNull(source))throw new Error('Generated cache could not be removed: '+name);
      moved.push(name);
      continue;
    }
    const target=workspacePath(rel);
    mkdirSync(path.dirname(target),{recursive:true});
    const previous=target+'.previous-'+process.pid+'-'+Date.now();
    let movedOld=false,movedNew=false;
    try {
      if(existsSync(target)){renameSync(target,previous);movedOld=true;}
      renameSync(source,target);movedNew=true;
      if(movedOld)rmSync(previous,{recursive:true,force:true});
      moved.push(name);
    }catch(error){
      if(movedNew && !statOrNull(source))renameSync(target,source);
      if(movedOld && !existsSync(target))renameSync(previous,target);
      throw error;
    }
  }
  // The built server now lives outside the package.json(type=module) source scope.
  // Make its module format explicit rather than relying on Node syntax detection.
  const outputPackage=workspacePath('build/dist/package.json');
  if(existsSync(workspacePath('build/dist')) &&
     !existsSync(outputPackage))writeFileSync(outputPackage,'{"type":"module"}\n');
  return moved;
}
export function ensurePlaywrightBrowsers() {
  ensureDependencies();
  const base=workspacePath('downloads/playwright');
  if(readdirSync(base).some(n=>/^chromium_headless_shell-\d+$/.test(n)))return false;
  execFileSync(process.execPath,[path.join(dependencyRoot,'@playwright','test','cli.js'),'install','chromium'],{
    cwd:projectRoot,env:{...process.env,...workspaceEnvironment()},
    windowsHide:true,stdio:'inherit',timeout:600000,
  });
  return true;
}
// Remove only known *regenerated* caches that misbehaving third-party tools
// occasionally emit beside sources. Never delete a populated real npm install,
// unexpected directories, or user data.
export function cleanupSourceCaches() {
  assertSafeRoots();
  const removed=[];
  for(const [folder,allowed] of [
    ['node_modules',new Set(['.vite','.vite-temp','.vitest-cache'])],
    ['.local',new Set(['Wohnungsplaner_Generated'])],
  ]){
    const root=path.join(projectRoot,folder);
    const st=statOrNull(root);
    if(!st)continue;
    if(!st.isDirectory()||st.isSymbolicLink())throw Error('Refusing unsafe source cache cleanup: '+folder);
    const entries=readdirSync(root);
    if(entries.some(name=>!allowed.has(name))){
      throw Error('Unknown files in '+folder+'; refusing automated removal: '+entries.join(','));
    }
    for(const entry of entries){
      const child=path.join(root,entry);
      const childStat=lstatSync(child);
      if(!childStat.isDirectory()||childStat.isSymbolicLink()){
        throw Error('Unexpected non-directory inside source cache: '+child);
      }
      rmSync(child,{recursive:true,force:true,maxRetries:5,retryDelay:300});
    }
    rmSync(root,{recursive:true,force:false,maxRetries:5,retryDelay:300});
    removed.push(folder);
  }
  return removed;
}
export function inspectWorkspace() {
  const problems=[];
  for(const name of forbiddenRootEntries) {
    const p=path.join(projectRoot,name);
    if(statOrNull(p))problems.push(name+' unexpectedly exists in permanent sources');
  }
  const st=statOrNull(generatedRoot);
  if(!st || !st.isDirectory() || st.isSymbolicLink())problems.push('Generated sibling is not a real directory');
  if(!existsSync(dependencyRoot))problems.push('Installed npm dependencies absent');
  return {projectRoot,generatedRoot,dependencyRoot,problems,ready:problems.length===0};
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const mode=process.argv[2]??'ensure';
  if(mode==='prepare')prepareWorkspace();
  else if(mode==='ensure')ensureDependencies();
  else if(mode==='install')ensureDependencies(true);
  else if(mode==='browsers')ensurePlaywrightBrowsers();
  else if(mode==='collect')console.log('COLLECTED='+collectOutputs().join(','));
  else if(mode==='doctor' || mode==='where'){
    prepareWorkspace();
    const result=inspectWorkspace();
    console.log(JSON.stringify(result,null,2));
    if(!result.ready)process.exitCode=1;
  }else throw new Error('Use: prepare | ensure | install | browsers | collect | doctor | where');
}
