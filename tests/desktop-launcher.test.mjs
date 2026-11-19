import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareWorkspace, generatedRoot, projectRoot } from '../scripts/workspace-setup.mjs';
import { acquireWorkerLock } from '../scripts/desktop-runtime.mjs';

prepareWorkspace();

test('desktop uses a Git-independent production server from the generated build', () => {
  const script=readFileSync(path.join(projectRoot,'scripts','desktop-runtime.mjs'),'utf8');
  assert.match(script,/serve-local[.]mjs/);
  assert.match(script,/Wohnungsplaner_Generated|generatedRoot/);
  assert.doesNotMatch(script,/synchronizeRepository|visual-dev[.]mjs|git fetch|git pull|gh[.]exe/);
});

test('the real command launcher opens the tray directly without a Windows shortcut', () => {
  const launcher=path.join(projectRoot,'Wohnungsplaner starten.cmd');
  assert.equal(existsSync(launcher),true);
  const content=readFileSync(launcher,'utf8');
  assert.match(content,/launch-desktop[.]ps1/);
  assert.doesNotMatch(content,/[.]lnk|install-desktop[.]ps1/);
});

test('desktop refresh regenerates only disposable tray assets', () => {
  const refresh=readFileSync(path.join(projectRoot,'scripts','refresh-desktop-assets.ps1'),'utf8');
  assert.match(refresh,/Wohnungsplaner_Generated[\\/]desktop/);
  assert.match(refresh,/New-PlannerIcon/);
  assert.doesNotMatch(refresh,/[.]lnk|[.]exe|Start-Process/);
});

test('a stale lock belonging to another live process is safely recovered', async t => {
  const folder=mkdtempSync(path.join(generatedRoot,'tmp','planner-lock-'));
  t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const lock=path.join(folder,'desktop-worker.lock');
  writeFileSync(lock,JSON.stringify({pid:process.pid}));
  const release=acquireWorkerLock(folder);
  assert.equal(typeof release,'function');
  release();
  assert.equal(existsSync(lock),false);
});

test('PowerShell background process exits with the expected status', {skip:process.platform!=='win32'},t => {
  const folder=mkdtempSync(path.join(generatedRoot,'tmp','planner-ps-exit-'));
  t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const helper=fileURLToPath(new URL('../scripts/desktop-process.ps1',import.meta.url));
  const quote=s=>"'"+s.replaceAll("'","''")+"'";
  const code="$ProgressPreference='SilentlyContinue'; . "+quote(helper)+
    "; $p=Start-PlannerBackgroundProcess -FilePath "+quote(process.execPath)+
    " -Arguments @('--version') -WorkingDirectory "+quote(folder)+
    " -OutputLog "+quote(path.join(folder,'out.log'))+
    " -ErrorLog "+quote(path.join(folder,'err.log'))+
    "; $p.WaitForExit(); @{code=$p.ExitCode;exited=$p.HasExited}|ConvertTo-Json -Compress";
  const result=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-EncodedCommand',
    Buffer.from(code,'utf16le').toString('base64')],{
      encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],
    }));
  assert.equal(result.code,0);
  assert.equal(result.exited,true);
});
