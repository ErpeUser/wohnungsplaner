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
  const hooks=get('builtin-bath-towel-hook-rail');
  assert.equal(hooks.size.height,.12);
  assert.match(hooks.metadata?.source??'',/1005013057225398.*Style2.*4PCS/);
  assert.deepEqual(hooks.position,{x:-.20,z:8.82});
  assert.equal(hooks.elevation,1.49);assert.equal(hooks.rotation,90);
});
test('supplier west chain equals 2562 mm',()=>{
  assert.deepEqual(kitchenModuleWidths(),[.45,.15,.6,.6,.112,.65]);assert.ok(Math.abs(kitchenModuleWidths().reduce((a,b)=>a+b,0)-2.562)<1e-9);
});
test('tile size uses the measured 20-cm apartment reference',()=>assert.equal(KITCHEN_REFERENCE.tilePitch,.2));
test('appliances and user-movable furniture are retained',()=>{
  const original=structuredClone(DEFAULT_APARTMENT_DOCUMENT),snapshot=structuredClone(original),result=refineRoomLayout(original);
  assert.deepEqual(original,snapshot);assert.equal(result.placements,original.placements);assert.equal(result.assets,original.assets);assert.equal(result.doorStates,original.doorStates);
  for(const name of ['fridge','oven','hob','sink','microwave','hood'])assert.equal(result.builtIns.filter(item=>item.id===`builtin-kitchen-${name}`).length,1);
});
test('the ten selected woven baskets replace only active old hallway decor',()=>{
  const result=refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);
  for(const id of ['builtin-hall-wall-decor','builtin-hall-tejo-art-plates','builtin-hall-between-door-decor'])assert.equal(result.builtIns.some(item=>item.id===id),false);
  const baskets=result.builtIns.filter(item=>item.catalogId?.startsWith('hall-woven-basket-'));
  assert.equal(baskets.length,10);
  assert.equal(new Set(baskets.map(item=>item.id)).size,10);
  assert.deepEqual(baskets.map(item=>Math.round(item.size.width*100)).sort((a,b)=>a-b),[11,11,11,16,24,24,24,25,25,30]);
  assert.ok(baskets.every(item=>item.rotation===270&&item.position.x===-2.345));
  const eps=1e-8,start=7.2975,narrowEnd=7.7425,openEnd=8.06;
  assert.ok(Math.max(...baskets.map(item=>(item.elevation??0)+item.size.height))<=2.00+eps,'No basket near the ceiling');
  assert.ok(Math.min(...baskets.map(item=>item.elevation??0))<=.40,'Use the free lower wall too');
  assert.equal(baskets.filter(item=>item.position.z+item.size.width/2>narrowEnd-.02+eps).length,4,'Use the wider open wall beside the bench');
  assert.deepEqual(baskets.map(item=>Math.round(((item.elevation??0)+item.size.height/2)*200)/2),[143,173,193,130,80.5,50,126.5,173,105,54]);
  for(const item of baskets){
    const y=(item.elevation??0)+item.size.height/2,low=item.elevation??0,high=low+item.size.height;
    const right=item.position.z+item.size.width/2;
    assert.ok(item.position.z-item.size.width/2>=start+.02-eps,item.id+' entry jamb');
    assert.ok(low>=.37-eps&&high<=2.00+eps,item.id+' vertical clearance');
    if(right>narrowEnd-.02+eps){
      assert.ok(right<=openEnd+eps,item.id+' rear panel clearance');
      assert.ok(low>=.75-eps&&high<=1.81+eps,item.id+' open bench area, no contact with upper or lower cabinet');
    }
    for(const fixture of [{z:7.30,y:1.4125,w:.125,h:.165},{z:7.50,y:1.05,w:.12,h:.12},{z:7.78,y:.30,w:.12,h:.12}]){
      const gapZ=Math.abs(item.position.z-fixture.z)-(item.size.width+fixture.w)/2;
      const gapY=Math.abs(y-fixture.y)-(item.size.height+fixture.h)/2;
      assert.ok(gapZ>=.03-eps||gapY>=.03-eps,item.id+' fixture clearance');
    }
  }
  for(let i=0;i<baskets.length;i++)for(let j=i+1;j<baskets.length;j++){
    const a=baskets[i],b=baskets[j],ay=(a.elevation??0)+a.size.height/2,by=(b.elevation??0)+b.size.height/2;
    const radius=(Math.max(a.size.width,a.size.height)+Math.max(b.size.width,b.size.height))/2;
    assert.ok(Math.hypot(a.position.z-b.position.z,ay-by)>=radius+.02-eps,a.id+' insufficient spacing to '+b.id);
  }
  assert.ok(baskets.every(item=>item.roomId==='vorraum'&&item.collision==='decorative'&&item.locked));
  assert.equal(result.placements,DEFAULT_APARTMENT_DOCUMENT.placements);
  assert.equal(refineRoomLayout(result),result);
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
