import assert from 'node:assert/strict';
import test from 'node:test';
import { refineRoomLayout, hookCenters, kitchenModuleWidths, KITCHEN_REFERENCE } from '../app/planner/domain/room-refinement.ts';
import { createWaffleSurface, createWafflePixels, worktopSlabs } from '../app/planner/scene-3d/interior-geometry.ts';
import { DEFAULT_APARTMENT_DOCUMENT } from '../app/planner/domain/apartment-v3.ts';
import { parsePlannerDocument } from '../app/planner/domain/schema.ts';

const get = (id:string) => refineRoomLayout(structuredClone(DEFAULT_APARTMENT_DOCUMENT)).builtIns.find(item=>item.id===id)!;

test('bath runner moves toward the basin, keeping the supplied 122 x 61 x 1 cm',()=>{
  const item=get('builtin-bath-mat');assert.deepEqual(item.position,{x:-1.25,z:8.99});assert.equal(item.rotation,90);assert.deepEqual(item.size,{width:1.22,depth:.61,height:.01});
});
test('WC mat extends from the toilet rather than across the room',()=>{
  const item=get('builtin-wc-mat');assert.equal(item.rotation,90);assert.deepEqual(item.position,{x:-1.87,z:5.15});assert.equal(item.size.width,.92);assert.equal(item.size.depth,.61);
});
test('paper holder remains on opposite WC wall but uses the darker two-ledge AliExpress source',()=>{
  const item=get('builtin-wc-paper-holder');
  assert.deepEqual(item.position,{x:-2.285,z:4.88});
  assert.equal(item.elevation,.68);
  assert.equal(item.rotation,270);
  assert.equal(item.catalogId,'wc-paper-holder');
  assert.match(item.metadata?.source??'',/1005013624521211/);
  assert.match(item.label,/Dunklere Massivholz-Doppelablage/);
  assert.ok(item.metadata?.notes?.some(note=>/16,99 × 13,97 cm.*14,98 cm.*9,39 cm/.test(note)));
});
test('four hooks form a horizontal row with 20-cm centres',()=>{
  assert.deepEqual(hookCenters(.72).map(x=>Number(x.toFixed(3))),[-.3,-.1,.1,.3]);
  assert.equal(get('builtin-bath-towel-hook-rail').size.height,.12);
});
test('supplier west chain equals 2562 mm',()=>{
  assert.deepEqual(kitchenModuleWidths(),[.45,.15,.6,.6,.112,.65]);assert.ok(Math.abs(kitchenModuleWidths().reduce((a,b)=>a+b,0)-2.562)<1e-9);
});
test('tile size remains prior 32-cm reference, not an invented supplier PDF dimension',()=>assert.equal(KITCHEN_REFERENCE.tilePitch,.32));
test('appliances and user-movable furniture are retained',()=>{
  const original=structuredClone(DEFAULT_APARTMENT_DOCUMENT),snapshot=structuredClone(original),result=refineRoomLayout(original);
  assert.deepEqual(original,snapshot);assert.equal(result.placements,original.placements);assert.equal(result.assets,original.assets);assert.equal(result.doorStates,original.doorStates);
  for(const name of ['fridge','oven','hob','sink','microwave','hood'])assert.equal(result.builtIns.filter(item=>item.id===`builtin-kitchen-${name}`).length,1);
});
test('both hall groups replace the retired combined object without duplicates',()=>{
  const result=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);assert.equal(result.builtIns.some(item=>item.id==='builtin-hall-wall-decor'),false);
  for(const id of ['builtin-hall-tejo-art-plates','builtin-hall-between-door-decor'])assert.equal(result.builtIns.filter(item=>item.id===id).length,1);
});
test('reapplication is idempotent',()=>{const once=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);assert.equal(refineRoomLayout(once),once);});
test('other apartments remain untouched',()=>{const other={...DEFAULT_APARTMENT_DOCUMENT,id:'another-flat'};assert.equal(refineRoomLayout(other),other);});
test('refined plan passes the actual document schema',()=>assert.doesNotThrow(()=>parsePlannerDocument(refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT))));
test('rugs use physical millimetre relief with finite normalized normals',()=>{
  for(const [width,depth] of [[1.22,.61],[.92,.61]]){
    const mesh=createWaffleSurface(width,depth,.01);let lo=Infinity,hi=-Infinity;
    for(let i=0;i<mesh.positions.length;i+=3){lo=Math.min(lo,mesh.positions[i+1]);hi=Math.max(hi,mesh.positions[i+1]);assert.ok(Math.abs(Math.hypot(...mesh.normals.slice(i,i+3))-1)<1e-5);assert.ok(mesh.normals[i+1]>0);}
    assert.ok(hi-lo>.003);assert.ok(mesh.positions.every(Number.isFinite));assert.ok(mesh.indices.every(i=>i<mesh.positions.length/3));
  }
});
test('albedo and linear microheight are separate deterministic channels',()=>{
  const a=createWafflePixels(),b=createWafflePixels();assert.deepEqual(a.color,b.color);assert.notDeepEqual(a.color,a.height);assert.ok(new Set(a.height).size>15);
});
test('sink aperture is absent from the stone geometry',()=>{
  const hole={x:-.2845,z:-.0015,width:.49,depth:.39},slabs=worktopSlabs(1.163,.603,hole);
  assert.ok(Math.abs(slabs.reduce((a,r)=>a+r.width*r.depth,0)-(1.163*.603-.49*.39))<1e-8);
  for(const r of slabs)assert.ok(r.x+r.width/2<=hole.x-hole.width/2+1e-8||r.x-r.width/2>=hole.x+hole.width/2-1e-8||r.z+r.depth/2<=hole.z-hole.depth/2+1e-8||r.z-r.depth/2>=hole.z+hole.depth/2-1e-8);
});
test('invalid dimensions fail explicitly',()=>{
  assert.throws(()=>createWaffleSurface(0,.46));assert.throws(()=>createWaffleSurface(NaN,.46));assert.throws(()=>worktopSlabs(1,.5,{x:1,z:0,width:.5,depth:.2}));
});
