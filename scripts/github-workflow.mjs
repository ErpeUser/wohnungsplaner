// Safe single-main GitHub workflow. Git metadata is outside sources, but any unpublished
// commits/stashes inside it must be preserved. No automatic commits, PR merges or pushes.
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
// PR mergers require explicit human content review outside this script.
const apply=process.argv.includes('--apply');

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
  const hooks=run('git.exe',['config','--local','--get','core.hooksPath'],true);
  if(hooks && hooks.split(path.sep).join('/')!=='scripts/git-hooks') {
    throw Error('Existing Git hooksPath differs; refusing to replace security hooks: '+hooks);
  }
  git('config','--local','core.hooksPath','scripts/git-hooks');
  git('config','--local','pull.ff','only');
  git('config','--local','merge.ff','only');
  git('config','--local','push.default','simple');
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
    const technicallyReady=pr.baseRefName==='main'&&!pr.isDraft &&
      pr.mergeable==='MERGEABLE'&&pr.reviewDecision==='APPROVED'&&passing;
    assessments.push({number:pr.number,title:pr.title,head:pr.headRefName,
      reviewDecision:pr.reviewDecision,mergeable:pr.mergeable,
      checksTotal:checks.length,checksPass:passing,technicallyReady,
      contentReviewRequired:true});
  }
  return snapshot('reconcile',{openCount:prs.length,assessments,
    merged:[],note:'Audit only. PR merges require a human relevance review and explicit GitHub action.'});
}
try{
  if(apply)throw Error('--apply is disabled: review PR content and merge manually via GitHub after checks.');
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
      if(dirtyFiles().length)throw Error('Working tree changed during fetch; refusing fast-forward.');
      const ancestor=git('merge-base','HEAD','refs/remotes/origin/main');
      const local=git('rev-parse','HEAD');
      if(ancestor!==local)throw Error('Remote history diverges. Manual conflict review required.');
      git('merge','--ff-only','refs/remotes/origin/main');
      snapshot('sync-success',{mergedPrs:[],
        assessedPrs:reconciliation.assessments});
    }
  }else if(command==='reconcile')safeReconcile();
  else throw Error('Commands: setup | status | sync | reconcile (audit only)');
}catch(err){
  const message=String(err?.message??err);
  console.error(message);
  writeFileSync(path.join(reportDir,'error.txt'),new Date().toISOString()+'\n'+message+'\n');
  process.exitCode=1;
}
