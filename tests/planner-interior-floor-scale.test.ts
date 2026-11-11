import assert from 'node:assert/strict';
import test from 'node:test';
import { floorTextureRepeat, kitchenTileFaces, partitionInteriorPlan, partitionFloorRendering } from '../app/planner/plan-2d/interior-plan-geometry.ts';
const rectangle=(x:number,z:number,w:number,d:number)=>[{x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},{x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2}];
const approx=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.00001,`${a} vs ${b}`);
test('ShapeGeometry metre UVs use inverse atlas size, not room width multiplied twice',()=>{
 assert.deepEqual(floorTextureRepeat('porcelain-light-taupe'),[1/.64,1/.64]);
 assert.deepEqual(floorTextureRepeat('parquet-oak-narrow'),[1/.42,1/.42]);
 assert.equal(floorTextureRepeat('epoxy-grey'),null);
});
test('2D kitchen grid has the same 320-mm modules and 2-mm joints as the 3D mesh',()=>{
 const faces=kitchenTileFaces(rectangle(1.25,4.225,2.38,1.39),.32,.002);
 assert.ok(faces.length>20);
 const full=faces.filter(f=>Math.abs(f.width-.318)<1e-5&&Math.abs(f.depth-.318)<1e-5);
 assert.ok(full.length>10);for(const f of full){approx(f.width,.318);approx(f.depth,.318);}
 assert.ok(faces.every(f=>f.x>=.06-1e-5&&f.z>=3.53-1e-5&&f.x+f.width<=2.44+1e-5&&f.z+f.depth<=4.92+1e-5));
});
test('the two L floor arms share one world grid instead of restarting at the seam',()=>{
 const a=kitchenTileFaces(rectangle(1.25,4.225,2.38,1.39),.32,.002);
 const b=kitchenTileFaces(rectangle(.665,5.506,1.21,1.172),.32,.002);
 assert.ok(a.length>10&&b.length>10);
 const ax=[...new Set(a.map(f=>f.x.toFixed(5)))];
 assert.ok(b.every(f=>ax.includes(f.x.toFixed(5))));
});
test('floor faces are painted before cabinetry; fridge and other appliances remain in the object pass',()=>{
 const ids=['floor-zone-kitchen','kitchen-fridge','kitchen-oven','bath-mat','hall-tejo-art-plates','bath-towel-hooks-wood-black'];
 const objects=ids.map((catalogId,i)=>({id:String(i),catalogId}));
 const groups=partitionInteriorPlan(objects);
 assert.deepEqual(groups.floor.map(i=>i.catalogId),['floor-zone-kitchen']);
 assert.deepEqual(groups.objects.map(i=>i.catalogId),['kitchen-fridge','kitchen-oven','bath-mat','hall-tejo-art-plates','bath-towel-hooks-wood-black']);
 assert.equal(groups.objects[0],objects[1]);
});
test('empty or non-finite floor footprints are rejected safely',()=>{
 assert.deepEqual(kitchenTileFaces([]),[]);assert.deepEqual(kitchenTileFaces([{x:NaN,z:0},{x:1,z:0},{x:1,z:1}]),[]);
});
test('preserves the balcony source floor needed by the existing balcony renderer',()=>{
 const floors=[{roomId:'wc'},{roomId:'balkon'},{roomId:'wohnkueche'}],groups=partitionFloorRendering(floors);
 assert.deepEqual(groups.base,[floors[1]]);assert.deepEqual(groups.metric,[floors[0],floors[2]]);
});
