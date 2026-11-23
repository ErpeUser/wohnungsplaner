import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { getWcClearOutline } from "../app/planner/domain/wc-layout.ts";
import { upgradeWcPhotoReference } from "../app/planner/store/persistence.ts";
import { SHOPPING_ITEMS } from "../app/planner/workspace/shopping-items.ts";
import { marbleTileBuffers, wcMarbleWallBounds } from "../app/planner/scene-3d/architecture/marble-tiles.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

const document = DEFAULT_APARTMENT_DOCUMENT;
const getItem = (id: string) => document.builtIns.find((item) => item.id === id)!;

test("keeps the measured WC and reserves exactly nine centimetres beside the 80 cm wallboard", () => {
  const outline = getWcClearOutline(document)!;
  assert.equal(Number((outline[1].x - outline[0].x).toFixed(3)), 0.98);
  assert.equal(Number((outline[2].z - outline[1].z).toFixed(3)), 1.42);
  const shelf = getItem("builtin-wc-wallboard-artisan-80");
  assert.equal(shelf.catalogId, "wc-artisan-wallboard-80");
  assert.equal(shelf.roomId, "wc");
  assert.deepEqual(shelf.size, { width: 0.8, depth: 0.235, height: 0.038 });
  assert.deepEqual(shelf.position, { x: -1.87, z: 4.3245 });
  assert.equal(shelf.elevation, 2.015);
  assert.equal(shelf.collision, "decorative");
  assert.equal(shelf.materialVariants?.main, "oak-artisan");
  assert.equal(shelf.metadata?.confidence, "confirmed");
  assert.ok(Math.abs((0.98 - shelf.size.width) / 2 - 0.09) < 1e-9);
  assert.equal(shelf.position.x - shelf.size.width / 2, -2.27);
  assert.equal(shelf.position.x + shelf.size.width / 2, -1.47);
});

test("keeps WC utility shaft, dual-action flush, overhead ventilation and visible toilet aligned", () => {
  const flush = getItem("builtin-wc-flush");
  const hatch = getItem("builtin-wc-revision");
  const vent = getItem("builtin-wc-ventilation");
  const pan = getItem("builtin-wc-pan");
  const styling = getItem("builtin-wc-shelf-styling");
  assert.equal(flush.catalogId, "wc-flush-plate");
  assert.deepEqual(flush.size, { width: 0.24, depth: 0.035, height: 0.16 });
  assert.equal(hatch.catalogId, "wc-revision-panel");
  assert.equal(hatch.elevation, 1.48);
  assert.equal(vent.catalogId, "wc-wall-ventilation");
  assert.equal(vent.elevation, 2.35);
  assert.ok(vent.elevation > 2.015 + 0.038);
  assert.equal(vent.metadata?.confidence, "estimated");
  assert.equal(styling.collision, "decorative");
  assert.equal(pan.catalogId, "sanitary-wall-wc");
  for (const item of [flush,hatch,vent,pan,styling]) assert.equal(item.roomId, "wc");
  assert.ok(flush.position.x === hatch.position.x && hatch.position.x === vent.position.x);
  assert.equal(document.openings.find((x) => x.id === "hall-wc-door")?.width, 0.8);
});

test("renders warm-ivory tiled inward-facing panels on all WC walls only", () => {
  const wc = createSceneModel(document, "wc");
  const wallIds = new Set(wc.walls.filter((wall) => wall.roomIds.includes("wc")).map(w => w.id));
  const tiled = wc.walls.filter(wall => wall.roomIds.includes("wc"))
    .flatMap(wall=> wall.segments.map(segment=>wcMarbleWallBounds(wall, segment)).filter(Boolean));
  assert.equal(wallIds.size, 4);
  assert.ok(tiled.length >= 4);
  const first = marbleTileBuffers(0.98, 2.56, 0, "wc");
  assert.equal(first.positions.length, first.uvs.length / 2 * 3);
  assert.ok(first.positions.length > 0);
  const wall = wc.walls.find(w => w.roomIds.includes("wc"))!;
  assert.equal(wcMarbleWallBounds({ ...wall, roomIds: [] }, wall.segments[0]), null);
});

test("keeps the former WC onyx product as an unpriced alternative and adds only the selected board",()=>{
  const wood = SHOPPING_ITEMS.filter(x=>x.id==="007326000408");
  assert.equal(wood.length,1);
  assert.equal(wood[0].room,"WC");
  assert.equal(wood[0].price,14.99);
  assert.equal(wood[0].quantity,1);
  assert.match(wood[0].url ?? "", /007326000408/);
  const onyx=SHOPPING_ITEMS.find(x=>x.id==="601099584128261")!;
  assert.match(onyx.amountLabel??"",/Alternative/);
  assert.equal(onyx.price,null);
  assert.equal(SHOPPING_ITEMS.some(x=>x.id==="builtin-wc-shelf-styling"),false);
});

test("migrates the photo features to existing saved plans without replacing customized rooms or furniture",()=>{
  const saved=structuredClone(document);
  const newIds=new Set(["builtin-wc-wallboard-artisan-80","builtin-wc-shelf-styling","builtin-wc-ventilation"]);
  saved.builtIns=saved.builtIns.filter(x=>!newIds.has(x.id));
  const hatch=saved.builtIns.find(x=>x.id==="builtin-wc-revision")!;
  hatch.elevation=1.68;
  const rug=saved.placements.find(x=>x.id==="zimmer1-bliss-bed")!;
  rug.position.x+=0.05;
  const before=structuredClone(rug);
  saved.doorStates["hall-wc-door"]="open";
  const migrated=upgradeWcPhotoReference(saved);
  assert.equal(migrated.builtIns.filter(x=>newIds.has(x.id)).length,3);
  assert.equal(migrated.builtIns.find(x=>x.id===hatch.id)?.elevation,1.48);
  assert.deepEqual(migrated.placements.find(x=>x.id===rug.id),before);
  assert.equal(migrated.doorStates["hall-wc-door"],"open");
  assert.equal(upgradeWcPhotoReference(migrated),migrated);
  const custom=structuredClone(saved);
  const customHatch=custom.builtIns.find(x=>x.id===hatch.id)!;
  customHatch.elevation=1.5;
  customHatch.position.x+=0.03;
  const preserved=upgradeWcPhotoReference(custom);
  assert.equal(preserved.builtIns.find(x=>x.id===hatch.id)?.elevation,1.5);
  assert.equal(preserved.builtIns.find(x=>x.id===hatch.id)?.position.x,customHatch.position.x);
});
