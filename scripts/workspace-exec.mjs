// Run project tools against the generated package store without link folders.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ensureDependencies, projectRoot, dependencyRoot, workspaceEnvironment,
  collectOutputs, cleanupSourceCaches,
} from './workspace-setup.mjs';

ensureDependencies();
const [command,...args]=process.argv.slice(2);
const cli={
  node:null,
  vinext:'vinext/dist/cli.js',
  vitest:'vitest/vitest.mjs',
  eslint:'eslint/bin/eslint.js',
  tsc:'typescript/bin/tsc',
};
if(!Object.hasOwn(cli,command))throw new Error('Unsupported project command: '+command);
const program=command==='node'?null:path.join(dependencyRoot,cli[command]);
const resolver=pathToFileURL(path.join(projectRoot,'scripts','resolve-dependencies.mjs')).href;
const env={
  ...process.env,
  ...workspaceEnvironment(),
  NODE_OPTIONS:[process.env.NODE_OPTIONS??'', '--import='+resolver].filter(Boolean).join(' '),
};
const child=spawn(process.execPath,command==='node'?args:[program,...args],{
  cwd:projectRoot,env,stdio:'inherit',windowsHide:false,
});
child.once('error',err=>{console.error(err);process.exitCode=1;});
child.once('exit',(code,signal)=>{
  process.exitCode=code??(signal?1:0);
  try {
    if(command==='vinext' && args[0]==='dev') {
      console.log('COLLECTED_AFTER_DEV='+collectOutputs().join(','));
    }
    const removed=cleanupSourceCaches();
    if(removed.length)console.log('SOURCE_CACHES_CLEANED='+removed.join(','));
  } catch(error) {
    console.error('Source cache cleanup refused:',error);
    process.exitCode=1;
  }
});
