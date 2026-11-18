// Safe single-main GitHub workflow. Git metadata is disposable, source is canonical.
// Never commit/push, discard local changes, create branches or PRs automatically.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { projectRoot, generatedRoot, prepareWorkspace } from './workspace-setup.mjs';

const repo='ErpeUser/wohnungsplaner';
const url='https://github.com/ErpeUser/wohnungsplaner.git';
const gitDir=path.join(generatedRoot,'git','repository');
const gitPointer=path.join(projectRoot,'.git');
const reportDir=path.join(generatedRoot,'reports','github');
const command=process.argv[2]??'status';
// An explicit sync reconciles review-approved, CI-green PRs before fast-forwarding main.
const apply=process.argv.includes('--apply')||command==='sync';

prepareWorkspace();
mkdirSync(reportDir,{recursive:true});
function run(bin,args,allowFailure=false){
  try{return execFileSync(bin,args,{
    cwd:projectRoot,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],
    timeout:120000,maxBuffer:16*1024*1024,
  }).trim();}
  catch(error){if(allowFailure)return null;
    throw new Error(bin+' '+args.join(' ')+' failed: '+(error.stderr?.toString()||error.message));
  }
}
const git=(...a)=>run('git.exe',a);
const gh=(...a)=>run('gh.exe',a);
function ensureMetadata() {
  if(existsSync(gitPointer)&&lstatSync(gitPointer).isSymbolicLink())throw Error('Git metadata cannot be an NTFS link');
  if(existsSync(gitPointer)){
    const text=readFileSync(gitPointer,'utf8').trim();
    if(!text.toLowerCase().startsWith('gitdir:')||
       !path.resolve(projectRoot,text.slice(7).trim()).toLowerCase().startsWith(gitDir.toLowerCase())){
      throw Error('Unrecognized existing .git metadata, refusing to replace it.');
    }
  }
  const active=run('git.exe',['rev-parse','--git-dir'],true);
  if(!active) {
    // Regenerate separate .git state if Generated was deleted. No source files touched.
    if(existsSync(gitPointer) && !existsSync(gitDir)) {
      // The verified one-line .git pointer is a regenerable Git administration file.
      // Removing it never removes application sources or any working-tree changes.
      unlinkSync(gitPointer);
    }
    mkdirSync(path.dirname(gitDir),{recursive:true});
    git('init','--initial-branch=main','--separate-git-dir',gitDir,projectRoot);
  }
  const origin=run('git.exe',['remote','get-url','origin'],true);
  if(origin && origin.replace(/\.git$/,'')!==url.replace(/\.git$/,'')) {
    throw Error('Git origin points to another repository. Refusing automatic replacement: '+origin);
  }
  if(!origin)git('remote','add','origin',url);
}
function setup() {
  ensureMetadata();
  git('fetch','--prune','origin','main');
  const remote=git('rev-parse','refs/remotes/origin/main');
  const local=run('git.exe',['rev-parse','--verify','refs/heads/main'],true);
  if(!local){
    git('update-ref','refs/heads/main',remote);
    // Populate the index only; do NOT checkout, reset, or alter any source file.
    git('symbolic-ref','HEAD','refs/heads/main');
    git('read-tree',remote);
  }
  const branch=git('symbolic-ref','--short','HEAD');
  if(branch!=='main')throw Error('Local worktree is not on main: '+branch);
  return {repo,origin:url,branch,remote,local:git('rev-parse','HEAD')};
}
function dirtyFiles(){
  const status=git('status','--porcelain=v1','--untracked-files=all');
  return status?status.split(/\r?\n/):[];
}
function snapshot(action,extras={}){
  const changed=dirtyFiles();
  const snap={at:new Date().toISOString(),action,repo,branch:'main',
    changedFileCount:changed.length,changedFiles:changed.slice(0,200),
    local:git('rev-parse','HEAD'),remote:git('rev-parse','refs/remotes/origin/main'),
    ...extras};
  writeFileSync(path.join(reportDir,'status.json'),JSON.stringify(snap,null,2)+'\n');
  console.log(JSON.stringify(snap,null,2));
  return snap;
}
function reviewPrs(){
  const json=gh('pr','list','-R',repo,'--state','open','--limit','100',
    '--json','number,title,isDraft,mergeable,headRefName,baseRefName,reviewDecision,statusCheckRollup');
  return JSON.parse(json||'[]');
}
function safeReconcile(){
  const prs=reviewPrs();
  const assessments=[];
  for(const pr of prs){
    const checks=pr.statusCheckRollup??[];
    const passing=checks.length>0 && checks.every(c=>{
      const value=c.conclusion??c.state??c.status;
      return value==='SUCCESS'||value==='NEUTRAL'||value==='SKIPPED';
    });
    const ready=pr.baseRefName==='main'&&!pr.isDraft &&
      pr.mergeable==='MERGEABLE'&&pr.reviewDecision==='APPROVED'&&passing;
    assessments.push({number:pr.number,title:pr.title,head:pr.headRefName,
      reviewDecision:pr.reviewDecision,mergeable:pr.mergeable,
      checksTotal:checks.length,checksPass:passing,ready});
    if(ready&&apply){
      gh('pr','merge',String(pr.number),'-R',repo,'--squash','--delete-branch');
    }
  }
  return snapshot('reconcile',{apply,openCount:prs.length,assessments,
    merged:apply?assessments.filter(a=>a.ready).map(a=>a.number):[]});
}
try{
  const metadata=setup();
  if(command==='setup')snapshot('setup',{metadata});
  else if(command==='status')snapshot('status',{metadata,openPrCount:reviewPrs().length});
  else if(command==='sync'){
    const changed=dirtyFiles();
    if(changed.length){
      snapshot('sync-blocked',{reason:'Local modifications and untracked files must be reviewed; no force reset/stash/overwrite.',count:changed.length});
      process.exitCode=2;
    } else {
      const reconciliation=safeReconcile();
      git('fetch','--prune','origin','main');
      const ancestor=git('merge-base','HEAD','refs/remotes/origin/main');
      const local=git('rev-parse','HEAD');
      if(ancestor!==local)throw Error('Remote history diverges. Manual conflict review required.');
      git('merge','--ff-only','refs/remotes/origin/main');
      snapshot('sync-success',{mergedPrs:reconciliation.merged,
        assessedPrs:reconciliation.assessments});
    }
  }else if(command==='reconcile')safeReconcile();
  else throw Error('Commands: setup | status | sync | reconcile [--apply]');
}catch(err){
  const message=String(err?.message??err);
  console.error(message);
  writeFileSync(path.join(reportDir,'error.txt'),new Date().toISOString()+'\n'+message+'\n');
  process.exitCode=1;
}
