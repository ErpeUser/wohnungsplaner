// Safe single-main GitHub workflow. Git metadata is outside sources, but any unpublished
// commits/stashes inside it must be preserved. No automatic commits, PR merges or pushes.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { projectRoot, generatedRoot, prepareWorkspace } from './workspace-setup.mjs';
import { classifyChangedFiles } from './post-pull-decision.mjs';

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
const npm=(...a)=>run(process.platform==='win32'?'npm.cmd':'npm',a);
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
function reviewBranches(){
  const raw=gh('api',`repos/${repo}/branches?per_page=100`,'--paginate','--slurp');
  const pages=JSON.parse(raw||'[]');
  const entries=Array.isArray(pages[0])?pages.flat():pages;
  return entries.map(branch=>({name:branch.name,protected:Boolean(branch.protected),sha:branch.commit?.sha??null}));
}
function reviewRepository(){
  const data=JSON.parse(gh('api',`repos/${repo}`));
  return {visibility:data.visibility,defaultBranch:data.default_branch,archived:Boolean(data.archived),htmlUrl:data.html_url};
}
function safeReconcile(){
  const prs=reviewPrs();
  const branches=reviewBranches();
  const repository=reviewRepository();
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
  return snapshot('reconcile',{repository,openCount:prs.length,branches,assessments,
    merged:[],note:'Audit only. PR merges require a human relevance review and explicit GitHub action.'});
}
function writePostPullReport(report){
  writeFileSync(path.join(reportDir,'post-pull.json'),JSON.stringify(report,null,2)+'\n');
}
function runPostPullActions(previousCommit,currentCommit,changedFiles){
  const decision=classifyChangedFiles(changedFiles);
  const report={at:new Date().toISOString(),action:'post-pull',previousCommit,currentCommit,
    ...decision,status:'running',results:[],generatedRoot:'../Wohnungsplaner_Generated',
    desktopArtifacts:'../Wohnungsplaner_Generated/desktop',
    extensionNote:decision.extensionRefreshRequired
      ? 'Extension-Dateien erkannt. Es gibt derzeit kein separates Extension-Paket oder Generator-Skript im Repository. Der Build wurde ausgeführt und die Extension-Änderung bleibt zur inhaltlichen Prüfung markiert.'
      : null};
  writePostPullReport(report);
  try{
    if(decision.buildRequired){
      npm('run','build');
      report.results.push({action:'build',status:'passed'});
    }
    if(decision.desktopAssetsRequired){
      run('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
        '-File',path.join(projectRoot,'scripts','refresh-desktop-assets.ps1')]);
      report.results.push({action:'desktop-assets',status:'passed',destination:'../Wohnungsplaner_Generated/desktop'});
    }
    if(decision.browserSmokeRequired){
      npm('run','test:browser');
      report.results.push({action:'browser-smoke',status:'passed'});
    }
    if(decision.extensionRefreshRequired){
      report.results.push({action:'extension-refresh',status:'review-required',
        note:report.extensionNote});
    }
    if(decision.desktopRunRequired){
      run(process.execPath,[path.join('scripts','desktop-runtime.mjs'),'stop']);
      run(process.execPath,[path.join('scripts','desktop-runtime.mjs'),'start']);
      report.results.push({action:'desktop-update-and-run',status:'passed',url:'http://127.0.0.1:3001/'});
    }
    report.status='completed';
    report.completedAt=new Date().toISOString();
    writePostPullReport(report);
    return report;
  }catch(error){
    report.status='failed';
    report.error=String(error?.message??error);
    report.failedAt=new Date().toISOString();
    writePostPullReport(report);
    throw error;
  }
}
try{
  if(apply)throw Error('--apply is disabled: review PR content and merge manually via GitHub after checks.');
  const metadata=setup();
  if(command==='setup')snapshot('setup',{metadata});
  else if(command==='status'){
    const prs=reviewPrs();
    const branches=reviewBranches();
    const repository=reviewRepository();
    snapshot('status',{metadata,repository,openPrCount:prs.length,branches,
      nonMainBranches:branches.filter(branch=>branch.name!=='main').map(branch=>branch.name),
      openPullRequests:prs.map(pr=>({number:pr.number,title:pr.title,head:pr.headRefName,base:pr.baseRefName}))});
  }
  else if(command==='sync'){
    const changed=dirtyFiles();
    if(changed.length){
      snapshot('sync-blocked',{reason:'Local modifications and untracked files must be reviewed; no force reset/stash/overwrite.',count:changed.length});
      process.exitCode=2;
    } else {
      const reconciliation=safeReconcile();
      if(reconciliation.openCount>0||reconciliation.branches.some(branch=>branch.name!=='main')){
        throw Error('Remote branches or open pull requests require explicit audit before sync.');
      }
      git('fetch','--prune','origin','main');
      if(dirtyFiles().length)throw Error('Working tree changed during fetch; refusing fast-forward.');
      const ancestor=git('merge-base','HEAD','refs/remotes/origin/main');
      const local=git('rev-parse','HEAD');
      if(ancestor!==local)throw Error('Remote history diverges. Manual conflict review required.');
      const previousCommit=local;
      git('merge','--ff-only','refs/remotes/origin/main');
      const currentCommit=git('rev-parse','HEAD');
      const changedFiles=currentCommit===previousCommit?[]:git('diff','--name-only',`${previousCommit}..${currentCommit}`)
        .split(/\r?\n/).filter(Boolean);
      const postPull=runPostPullActions(previousCommit,currentCommit,changedFiles);
      snapshot('sync-success',{mergedPrs:[],
        assessedPrs:reconciliation.assessments,postPull});
    }
  }else if(command==='reconcile')safeReconcile();
  else throw Error('Commands: setup | status | sync | reconcile (audit only)');
}catch(err){
  const message=String(err?.message??err);
  console.error(message);
  writeFileSync(path.join(reportDir,'error.txt'),new Date().toISOString()+'\n'+message+'\n');
  process.exitCode=1;
}
