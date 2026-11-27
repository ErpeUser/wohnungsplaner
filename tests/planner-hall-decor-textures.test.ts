import test from 'node:test';
import assert from 'node:assert/strict';
import {createHallVaseWoodPixels,createHallWheatPrintPixels} from '../app/planner/scene-3d/hall-decor-textures.ts';
test('selected wooden pockets have separate high resolution vertical grain textures',()=>{
 const light=createHallVaseWoodPixels(false),brown=createHallVaseWoodPixels(true);
 assert.equal(light.width,192);assert.equal(light.height,768);
 assert.equal(light.data.length,192*768*4);
 assert.ok(light.data[0]>brown.data[0]);assert.ok(light.data[1]>brown.data[1]);
 assert.ok(new Set(light.data.filter((_,i)=>i%4===0)).size>15);
});
test('reconstructs the exact two-tone botanical textile silhouette from the supplied image',()=>{
 const {data,width,height}=createHallWheatPrintPixels();
 assert.equal(width,136);assert.equal(height,216);
 assert.equal(data.length,width*height*4);
 assert.ok(data[0]>data[(width-1)*4]);
 let white=0;for(let i=0;i<data.length;i+=4){assert.equal(data[i+3],255);if(data[i]>245)white++;}
 assert.ok(white>1500&&white<15000);
});
