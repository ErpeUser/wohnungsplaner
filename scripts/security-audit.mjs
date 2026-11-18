// Repeatable production-dependency vulnerability check. All evidence is disposable.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { projectRoot, generatedRoot, prepareWorkspace } from './workspace-setup.mjs';

prepareWorkspace();
const out=path.join(generatedRoot,'reports','security');
mkdirSync(out,{recursive:true});
const env={...process.env,
  npm_config_cache:path.join(generatedRoot,'cache','npm'),
  TEMP:path.join(generatedRoot,'tmp'),
  TMP:path.join(generatedRoot,'tmp'),
};
const args=process.platform==='win32'
  ? ['/d','/s','/c','npm.cmd audit --omit=dev --json']
  : ['audit','--omit=dev','--json'];
const result=spawnSync(process.platform==='win32'?'cmd.exe':'npm',args,{
  cwd:projectRoot,env,encoding:'utf8',windowsHide:true,timeout:60_000,maxBuffer:16*1024*1024,
});
const jsonFile=path.join(out,'npm-production-audit.json');
writeFileSync(jsonFile,result.stdout||'');
if(result.stderr)writeFileSync(path.join(out,'npm-production-audit-stderr.txt'),result.stderr);
let findings;
try { findings=JSON.parse(result.stdout||''); }catch {
  console.error('npm production security audit could not return parseable JSON:',result.error?.message??result.stderr);
  process.exitCode=1;
}
if(findings) {
  const counts=findings.metadata?.vulnerabilities;
  const resultSummary={
    checkedAt:new Date().toISOString(),
    npmExitCode:result.status,
    total:counts?.total??null,
    critical:counts?.critical??null,
    high:counts?.high??null,
    moderate:counts?.moderate??null,
    low:counts?.low??null,
    report:jsonFile,
  };
  writeFileSync(path.join(out,'summary.json'),JSON.stringify(resultSummary,null,2)+'\n');
  console.log(JSON.stringify(resultSummary,null,2));
  if(result.status!==0 || (counts?.total??1)>0)process.exitCode=1;
}
