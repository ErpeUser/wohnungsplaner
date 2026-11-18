// Git-independent production desktop service; no .vinext dev state or source-tree caches.
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  ensureDependencies, prepareWorkspace, workspaceEnvironment, generatedRoot, projectRoot,
} from './workspace-setup.mjs';

export const repositoryRoot = projectRoot;
const local=path.join(generatedRoot,'logs','local');
const build=path.join(generatedRoot,'build','dist','server','index.js');
const entry=path.join(projectRoot,'serve-local.mjs');
const url='http://127.0.0.1:3001/';
const stateFile=path.join(local,'desktop-server.json');

function readJson(file) {
  try{return JSON.parse(readFileSync(file,'utf8'));}catch{return null;}
}
function atomicWrite(file,obj) {
  const temp=file+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify(obj,null,2)+'\n');
  renameSync(temp,file);
}
function state(phase,message,extra={}) {
  atomicWrite(path.join(local,'desktop-state.json'),{
    phase,message,url,repositoryRoot,updatedAt:new Date().toISOString(),...extra,
  });
}
function powershell(script) {
  return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',
    Buffer.from("$ProgressPreference = 'SilentlyContinue'; "+script,'utf16le').toString('base64')],{
      encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe'],
    });
}
function processDetails(pid) {
  if(!Number.isSafeInteger(pid)||pid<=0)return null;
  const text=powershell("Get-CimInstance Win32_Process -Filter 'ProcessId = "+pid+
    "' | Select-Object Name,CommandLine | ConvertTo-Json -Compress").trim();
  return text?JSON.parse(text):null;
}
export function acquireWorkerLock(folder) {
  mkdirSync(folder,{recursive:true});
  const lock=path.join(folder,'desktop-worker.lock');
  if(existsSync(lock)){
    const old=readJson(lock);
    const p=processDetails(old?.pid);
    if(p?.Name==='node.exe' && p.CommandLine?.includes(fileURLToPath(import.meta.url)))return null;
    unlinkSync(lock);
  }
  try{
    const fd=openSync(lock,'wx');
    writeFileSync(fd,JSON.stringify({pid:process.pid}));
    closeSync(fd);
  }catch(error){if(error.code==='EEXIST')return null;throw error;}
  return ()=>{if(existsSync(lock))unlinkSync(lock);};
}
function isOwnedServer(saved) {
  if(!Number.isSafeInteger(saved?.pid)||saved.pid<=0)return false;
  const p=processDetails(saved.pid);
  return p?.Name==='node.exe' && p.CommandLine?.includes(entry);
}
async function healthy() {
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(3000)});
    return response.ok && /Raumplaner/.test(await response.text());
  }catch{return false;}
}
function portOwner() {
  // PowerShell reports exit code 1 for a missing port on some Windows versions.
  // An empty port is the normal precondition for starting the planner.
  return powershell("$ErrorActionPreference='SilentlyContinue'; " +
    "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | " +
    "Select-Object -ExpandProperty OwningProcess -Unique; exit 0").trim();
}
function stopServer() {
  const saved=readJson(stateFile);
  if(!saved?.pid)return;
  if(!isOwnedServer(saved)){
    // Never stop an unrelated process just because its PID was reused.
    if(processDetails(saved.pid))throw Error('Process ID belongs to another program; refusing termination.');
    unlinkSync(stateFile);
    return;
  }
  execFileSync('taskkill.exe',['/PID',String(saved.pid),'/T','/F'],{
    windowsHide:true,stdio:'pipe',
  });
  if(existsSync(stateFile))unlinkSync(stateFile);
}
function ensureBuild(force=false) {
  ensureDependencies();
  if(!force && existsSync(build))return;
  const env={...process.env,...workspaceEnvironment()};
  execFileSync('cmd.exe',['/d','/s','/c','npm.cmd run build'],{
    cwd:projectRoot,env,windowsHide:true,stdio:'inherit',timeout:600000,
  });
  if(!existsSync(build))throw Error('Production build missing after npm run build.');
}
async function startServer() {
  if(await healthy()){
    const saved=readJson(stateFile);
    if(!isOwnedServer(saved)||portOwner()!==String(saved.pid)){
      throw Error('Port 3001 already belongs to an unknown server.');
    }
    return;
  }
  if(portOwner())throw Error('Port 3001 is occupied; refusing to replace another service.');
  const out=openSync(path.join(local,'desktop-server.log'),'a');
  const loader=pathToFileURL(path.join(projectRoot,'scripts','resolve-dependencies.mjs')).href;
  const env={...process.env,...workspaceEnvironment(),PORT:'3001',HOST:'127.0.0.1',
    PLANNER_PID_FILE:path.join(local,'desktop-server.pid'),
    NODE_OPTIONS:[process.env.NODE_OPTIONS??'','--import='+loader].filter(Boolean).join(' ')};
  const child=spawn(process.execPath,[entry],{
    cwd:projectRoot,detached:true,windowsHide:true,stdio:['ignore',out,out],env,
  });
  child.unref();closeSync(out);
  atomicWrite(stateFile,{pid:child.pid,startedAt:new Date().toISOString(),repositoryRoot});
  for(let i=0;i<50;i++){
    if(await healthy())return;
    try{process.kill(child.pid,0);}catch{throw Error('Desktop server exited; see generated/logs/local/desktop-server.log');}
    await new Promise(resolve=>setTimeout(resolve,700));
  }
  throw Error('Desktop server could not become ready.');
}
export async function run(action='start') {
  prepareWorkspace();
  const release=acquireWorkerLock(local);
  if(!release){process.exitCode=2;return;}
  try{
    state('loading',action==='stop'?'Wird beendet':'Lokale Anwendung wird vorbereitet');
    if(action==='stop'){
      stopServer();state('stopped','Wohnungsplaner beendet');
    }else if(action==='start'||action==='update'){
      if(action==='update')stopServer();
      ensureBuild(action==='update');
      await startServer();
      state('ready','Wohnungsplaner bereit');
    }else throw Error('Expected start, update or stop');
  }catch(error){
    state('error',error.message);
    console.error(error);
    process.exitCode=1;
  }finally{release();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  await run(process.argv[2]??'start');
}
