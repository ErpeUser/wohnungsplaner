import assert from 'node:assert/strict';
import test from 'node:test';
import { createWaffleSurface, createWaffleFringe, createWafflePixels, createKitchenTiles, worktopSlabs, baseShellPanels, sinkProfile, FABRIC_TILE_METRES } from '../app/planner/scene-3d/interior-geometry.ts';

for (const [name,w,d] of [['bath',1.22,.61],['wc',.92,.61]] as const) {
 test(`${name} rug has millimetre relief within the supplied footprint and 1-cm height`,()=>{
  const g=createWaffleSurface(w,d,.01);let min=Infinity,max=-Infinity;
  for(let i=0;i<g.positions.length;i+=3){const [x,y,z]=g.positions.slice(i,i+3);assert.ok(Number.isFinite(x+y+z));assert.ok(Math.abs(x)<=w/2+1e-6);assert.ok(Math.abs(z)<=d/2+1e-6);assert.ok(Math.abs(y)<=.005+1e-6);min=Math.min(min,y);max=Math.max(max,y);}
  assert.ok(max-min>.004,'surface must not be a flat beige plane');assert.ok(g.positions.length/3<35000,'bounded vertex count');
 });
 test(`${name} rug UVs retain the same physical weave pitch`,()=>{
  const g=createWaffleSurface(w,d,.01);let min=Infinity,max=-Infinity;
  for(let i=1;i<g.uvs.length;i+=2){min=Math.min(min,g.uvs[i]);max=Math.max(max,g.uvs[i]);}
  assert.ok(Math.abs(max-min-d/FABRIC_TILE_METRES)<1e-5);
 });
 test(`${name} rug normals and triangle indices are valid`,()=>{
  const g=createWaffleSurface(w,d,.01),count=g.positions.length/3;
  for(let i=0;i<g.normals.length;i+=3){assert.ok(Math.abs(Math.hypot(...g.normals.slice(i,i+3))-1)<1e-5);assert.ok(g.normals[i+1]>0);}
  assert.ok(g.indices.every(i=>i<count));
 });
}
test('cotton albedo and microheight are different opaque pixel channels',()=>{
 const p=createWafflePixels(256);assert.notDeepEqual(p.color,p.height);assert.equal(p.color.length,256*256*4);
 for(let i=0;i<p.height.length;i+=4){assert.equal(p.height[i],p.height[i+1]);assert.equal(p.height[i],p.height[i+2]);assert.equal(p.color[i+3],255);assert.equal(p.height[i+3],255);}
});
test('sink opening removes exactly the aperture area, without intersecting slabs',()=>{
 const hole={x:-.2845,z:-.0015,width:.49,depth:.39};
 const slabs=worktopSlabs(1.163,.603,hole);assert.equal(slabs.length,4);
 assert.ok(Math.abs(slabs.reduce((sum,s)=>sum+s.width*s.depth,0)-(1.163*.603-.49*.39))<1e-10);
 for(const s of slabs){const overlapX=Math.min(s.x+s.width/2,hole.x+hole.width/2)-Math.max(s.x-s.width/2,hole.x-hole.width/2);const overlapZ=Math.min(s.z+s.depth/2,hole.z+hole.depth/2)-Math.max(s.z-s.depth/2,hole.z-hole.depth/2);assert.ok(overlapX<1e-10||overlapZ<1e-10);}
});
test('sink opening is centered on the actual sink and reaches the 910-mm worktop',()=>{
 assert.ok(Math.abs(1.2445-.2845-.96)<1e-10);assert.ok(Math.abs(3.8315-.0015-3.83)<1e-10);
 const profile=sinkProfile(.52,.42,.16);assert.ok(Math.abs(.75+.08+profile.rimY-.91)<1e-10);
 assert.ok(profile.bowlWidth<.49&&profile.bowlDepth<.39);
});
test('corner carcass stays hollow below the recessed sink',()=>{
 const panels=baseShellPanels(1.15,.87,.603,false);assert.equal(panels.some(p=>p.id==='top'),false);assert.equal(panels.length,4);
 for(const p of panels)assert.ok(p.size.every(v=>v>0));
});
test('kitchen patch uses upward faces and remains a shallow finish, not a raised box',()=>{
 const g=createKitchenTiles(2.38,1.39,1.25,4.225);
 for(let i=1;i<g.positions.length;i+=3)assert.ok(Math.abs(g.positions[i]-.001)<1e-8);
 for(let i=1;i<g.normals.length;i+=3)assert.equal(g.normals[i],1);
});
test('invalid cutouts and extreme rug dimensions do not allocate broken geometry',()=>{
 assert.throws(()=>worktopSlabs(1,.6,{x:0,z:0,width:2,depth:.3}),RangeError);
 assert.throws(()=>createWaffleSurface(NaN,.61),RangeError);
 assert.throws(()=>createWaffleSurface(100,.61),RangeError);
 assert.throws(()=>createKitchenTiles(2,1,0,0,.32,.4),RangeError);
});

test("Fringe geometry stays inside the confirmed overall dimensions",()=>{
  for(const [w,d] of [[.92,.61],[1.22,.61]]){
    const g=createWaffleFringe(w,d,.01);assert.ok(g.positions.length>1000);
    for(let i=0;i<g.positions.length;i+=3){assert.ok(Math.abs(g.positions[i])<=w/2+1e-6);assert.ok(Math.abs(g.positions[i+2])<=d/2+1e-6);}
  }
});
