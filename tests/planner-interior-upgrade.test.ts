import assert from 'node:assert/strict';
import test from 'node:test';
import { readRefinedInterior, INTERIOR_BACKUP_KEY } from '../app/planner/store/interior-upgrade.ts';

type Doc = { id: string; version: number; placements: { id: string; x: number }[]; assets: string[]; doorStates: Record<string,string> };
const source: Doc = { id: 'wohnung-v3', version: 1, placements: [{id:'custom-sofa',x:2.731}], assets:['user-model'], doorStates:{door:'open'} };
const parse = (value: unknown): Doc => { const doc=value as Doc;if(!doc || !Array.isArray(doc.placements)) throw new Error('invalid');return doc; };
const prepare = (doc: Doc): Doc => doc.version===2 ? doc : {...doc, version:2};
const raw = JSON.stringify(source);
class MemoryStorage {
  data=new Map<string,string>();
  failWrite=false; failRead=false;
  getItem(key:string){if(this.failRead)throw new Error('Storage denied');return this.data.get(key)??null;}
  setItem(key:string,value:string){if(this.failWrite)throw new Error('QuotaExceededError');this.data.set(key,value);}
}
const read=(storage:MemoryStorage,value:string|null=raw,upgrade=prepare)=>readRefinedInterior(value,storage,parse,upgrade,source.id);
test('creates the pre-upgrade backup before exposing the refined layout',()=>{
 const storage=new MemoryStorage(),result=read(storage)!;
 assert.equal(result.document.version,2);assert.equal(storage.getItem(INTERIOR_BACKUP_KEY),raw);assert.equal(result.legacyBackupJson,raw);
 assert.deepEqual(result.document.placements,source.placements);assert.deepEqual(result.document.assets,source.assets);assert.deepEqual(result.document.doorStates,source.doorStates);
});
test('quota failure keeps the loaded user document rather than returning the default plan',()=>{
 const storage=new MemoryStorage();storage.failWrite=true;const result=read(storage)!;
 assert.deepEqual(result.document,source);assert.equal(result.legacyBackupJson,null);assert.match(result.warnings.join(' '),/Sicherung/);assert.equal(storage.data.size,0);
});
test('a blocked backup read also keeps the loaded user document',()=>{
 const storage=new MemoryStorage();storage.failRead=true;const result=read(storage)!;
 assert.deepEqual(result.document,source);assert.equal(result.legacyBackupJson,null);assert.equal(result.warnings.length,1);
});
test('a failed geometry upgrade keeps the original user document',()=>{
 const result=read(new MemoryStorage(),raw,()=>{throw new Error('invalid geometry');})!;
 assert.deepEqual(result.document,source);assert.match(result.warnings.join(' '),/unver/);
});
test('does not replace an existing pre-upgrade backup',()=>{
 const storage=new MemoryStorage();storage.setItem(INTERIOR_BACKUP_KEY,'original');const result=read(storage)!;
 assert.equal(result.document.version,2);assert.equal(storage.getItem(INTERIOR_BACKUP_KEY),'original');
});
test('already-upgraded saves are idempotent and require no backup write',()=>{
 const storage=new MemoryStorage();storage.failWrite=true;const result=read(storage,JSON.stringify(prepare(source)))!;
 assert.equal(result.document.version,2);assert.equal(result.warnings.length,0);assert.equal(result.legacyBackupJson,null);
});
test('does not refine another apartment or invalid source data',()=>{
 for(const value of [null,'{broken','{}',JSON.stringify({...source,id:'other'})]){
  const storage=new MemoryStorage();assert.equal(read(storage,value),null);assert.equal(storage.data.size,0);
 }
});
