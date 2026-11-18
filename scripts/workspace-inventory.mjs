// Enumerate only canonical source files; never traverse disposable dependencies.
import { readdirSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  projectRoot, generatedRoot, prepareWorkspace, inspectWorkspace, forbiddenRootEntries,
} from './workspace-setup.mjs';

prepareWorkspace();
const entries=[],files=[],unsafe=[];
const forbidden=new Set(forbiddenRootEntries);
const junkNames=new Set(['.cache','cache','.turbo','coverage','test-results',
  'playwright-report','tmp','.tmp','__pycache__','.eslintcache']);
const junkFiles=/\.(tsbuildinfo|log|tmp|temp|profraw|heapprofile)$/i;
function walk(dir,relative=''){
  const list=readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'));
  for(const item of list){
    const name=relative?relative+'/'+item.name:item.name;
    const st=lstatSync(path.join(dir,item.name));
    if(st.isSymbolicLink()){
      entries.push('L '+name);
      unsafe.push({name,reason:'symlink-or-junction'});
    }else if(st.isDirectory()){
      entries.push('D '+name+'/');
      if((!relative&&forbidden.has(item.name))||junkNames.has(item.name.toLowerCase()))
        unsafe.push({name,reason:'generated-directory-in-source'});
      if(!unsafe.some(x=>x.name===name))walk(path.join(dir,item.name),name);
    }else if(st.isFile()){
      entries.push('F '+name);
      files.push({name,bytes:st.size});
      if(junkFiles.test(item.name))unsafe.push({name,reason:'generated-file-in-source'});
    }
  }
}
walk(projectRoot);
const status=inspectWorkspace();
const report={
  createdAt:new Date().toISOString(),projectRoot,generatedRoot,
  sourceFileCount:files.length,sourceDirCount:entries.filter(x=>x.startsWith('D ')).length,
  bytes:files.reduce((sum,f)=>sum+f.bytes,0),links:entries.filter(x=>x.startsWith('L ')).length,
  unexpected:unsafe,workspace:status,
};
const output=path.join(generatedRoot,'reports','layout');
mkdirSync(output,{recursive:true});
writeFileSync(path.join(output,'SOURCE-TREE.txt'),entries.join('\r\n')+'\r\n');
writeFileSync(path.join(output,'SOURCE-INVENTORY.csv'),
 'Path;Bytes\r\n'+files.map(x=>JSON.stringify(x.name)+';'+x.bytes).join('\r\n')+'\r\n');
writeFileSync(path.join(output,'LAYOUT.json'),JSON.stringify(report,null,2)+'\n');
console.log('SOURCE_FILES='+report.sourceFileCount);
console.log('PERMANENT_DIRS='+report.sourceDirCount);
console.log('LINKS='+report.links);
console.log('UNEXPECTED_OUTPUTS='+unsafe.length);
if(unsafe.length)console.log(JSON.stringify(unsafe.slice(0,30)));
console.log('REPORT='+path.join(output,'LAYOUT.json'));
if(unsafe.length||!status.ready)process.exitCode=1;
