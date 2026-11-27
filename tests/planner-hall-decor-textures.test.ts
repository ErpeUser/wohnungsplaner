import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHallVaseWoodPixels} from '../app/planner/scene-3d/hall-decor-textures.ts';
import {HALL_WHEAT_PRINT_REFERENCE} from '../app/planner/domain/room-refinement.ts';
test('selected wooden pockets have separate high resolution vertical grain textures',()=>{
 const light=createHallVaseWoodPixels(false),brown=createHallVaseWoodPixels(true);
 assert.equal(light.width,192);assert.equal(light.height,768);
 assert.equal(light.data.length,192*768*4);
 assert.ok(light.data[0]>brown.data[0]);assert.ok(light.data[1]>brown.data[1]);
 assert.ok(new Set(light.data.filter((_,i)=>i%4===0)).size>15);
});
test('uses the exact WebP derivative of the user TIFF, with 2:3 aspect ratio and no frame baked in',()=>{
 const bytes=readFileSync(new URL('../public'+HALL_WHEAT_PRINT_REFERENCE.texturePath,import.meta.url));
 assert.equal(bytes.length,4080);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'a91ae566e7b9b8ce81ad26fae0688023cfd6aeb3593813fe302a89ed98859979');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.readUInt16LE(26)&0x3fff,240);assert.equal(bytes.readUInt16LE(28)&0x3fff,360);
 assert.equal(HALL_WHEAT_PRINT_REFERENCE.paperWidth/HALL_WHEAT_PRINT_REFERENCE.paperHeight,240/360);
});
