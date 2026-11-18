// Tests the real local production server, not an old Cloudflare Worker preview.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const build=path.join(root,'..','Wohnungsplaner_Generated','build','dist','server','index.js');
const sleep=ms=>new Promise(done=>setTimeout(done,ms));

async function unusedLocalPort(){
  const socket=createServer();
  await new Promise((done,reject)=>{
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',done);
  });
  const port=socket.address().port;
  await new Promise((done,reject)=>socket.close(e=>e?reject(e):done()));
  return port;
}
export async function startProductionServer(){
  if(!existsSync(build))throw Error('No compiled server; run npm run build');
  const port=await unusedLocalPort();
  const url='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,['serve-local.mjs'],{
    cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,HOST:'127.0.0.1',PORT:String(port),
      PLANNER_WRITE_PID:'0',PLANNER_REVIEW_ENABLED:'0'},
  });
  let logs='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',buf=>{
    logs=(logs+buf.toString()).slice(-10000);
  });
  let ready=false;
  for(let i=0;i<100;i++){
    if(child.exitCode!==null||child.signalCode!==null)break;
    try{
      const response=await fetch(url+'/__codex/health',{signal:AbortSignal.timeout(600)});
      if(response.status===200){ready=true;break;}
    }catch{}
    await sleep(100);
  }
  if(!ready){
    if(child.exitCode===null)child.kill('SIGTERM');
    throw Error('Production server start failed: '+logs);
  }
  return {
    url,
    fetch:(pathname='/',options)=>fetch(url+pathname,options),
    async stop(){
      if(child.exitCode!==null||child.signalCode!==null)return;
      const exited=once(child,'exit');
      child.kill('SIGTERM');
      await Promise.race([exited,sleep(5000)]);
      if(child.exitCode===null&&child.signalCode===null)throw Error('Server did not stop');
    },
  };
}
