import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  OFFICIAL_ROOM_AREAS,
  OFFICIAL_WNF_AREA,
  OUTDOOR_ROOM_IDS,
  getDocumentWnfArea,
  getRoomAreaAudit,
} from "../app/planner/domain/apartment-evidence.ts";
import { migrateStoredPlannerData } from "../app/planner/domain/migration.ts";
import { deriveRoomPolygon, deriveWallLength } from "../app/planner/domain/wall-graph.ts";

const expectedOpeningIds = [
  "zimmer1-window",
  "zimmer1-door",
  "hall-living-door",
  "apartment-entry-door",
  "hall-bath-door",
  "hall-wc-door",
  "hall-store-door",
  "living-zimmer2-door",
  "living-east-window",
  "living-feature-window",
  "living-loggia-door",
  "zimmer2-balcony-door",
];

test("publishes eight selectable areas while preserving the official 59.49 square metres", () => {
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.length, 8);
  assert.equal(getDocumentWnfArea(DEFAULT_APARTMENT_DOCUMENT), OFFICIAL_WNF_AREA);

  const zimmer1 = deriveRoomPolygon(DEFAULT_APARTMENT_DOCUMENT, "zimmer1");
  assert.equal(Math.max(...zimmer1.map((point) => point.x)) - Math.min(...zimmer1.map((point) => point.x)), 3.56);
  assert.equal(Math.max(...zimmer1.map((point) => point.z)) - Math.min(...zimmer1.map((point) => point.z)), 3.97);
});

test("presents the real balcony and loggia as one connected outdoor room", () => {
  assert.deepEqual(
    Object.fromEntries(DEFAULT_APARTMENT_DOCUMENT.rooms.map((room) => [room.id, room.area])),
    OFFICIAL_ROOM_AREAS,
  );
  assert.deepEqual([...OUTDOOR_ROOM_IDS], ["balkon"]);
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.some((room) => room.id === "loggia"), false);
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "balkon")?.name, "Balkon / Loggia");
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "balkon")?.area, 6.03);
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "balkon")?.wnfArea, 2.23);
  assert.deepEqual(DEFAULT_APARTMENT_DOCUMENT.openings.find((opening) => opening.id === "living-loggia-door")?.roomIds, ["wohnkueche", "balkon"]);
});

test("does not present scale-derived outlines as confirmed centimetre geometry", () => {
  for (const room of DEFAULT_APARTMENT_DOCUMENT.rooms) {
    assert.equal(room.metadata?.confidence, "estimated");
    assert.ok(room.metadata?.notes?.some((note) => /Planfläche.*bestätigt/i.test(note)));
    assert.ok(room.metadata?.notes?.some((note) => /Kontur.*planmaßstäblich/i.test(note)));
  }

  const audit = getRoomAreaAudit(DEFAULT_APARTMENT_DOCUMENT);
  assert.equal(audit.length, 8);
  assert.equal(audit.find((entry) => entry.roomId === "wohnkueche")?.declaredArea, 21.82);
  assert.ok(audit.every((entry) => Number.isFinite(entry.polygonArea)));
});

test("keeps every opening, diagonal facades, and one shared wall record", () => {
  assert.deepEqual(DEFAULT_APARTMENT_DOCUMENT.openings.map((opening) => opening.id), expectedOpeningIds);
  assert.ok(
    DEFAULT_APARTMENT_DOCUMENT.walls.filter(
      (wall) => Math.abs(wall.start.x - wall.end.x) > 0.01 && Math.abs(wall.start.z - wall.end.z) > 0.01,
    ).length >= 4,
  );
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.walls.every((wall) => deriveWallLength(wall) > 0));

  const sharedLivingWall = DEFAULT_APARTMENT_DOCUMENT.walls.find(
    (wall) => wall.roomIds.includes("wohnkueche") && wall.roomIds.includes("zimmer2"),
  );
  assert.ok(sharedLivingWall);
  assert.equal(
    DEFAULT_APARTMENT_DOCUMENT.walls.filter(
      (wall) => wall.roomIds.includes("wohnkueche") && wall.roomIds.includes("zimmer2"),
    ).length,
    1,
  );
});

test("stores the fixed kitchen and sanitary inventory separately from movable furniture", () => {
  const builtInKinds = new Set(DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => item.kind));
  assert.deepEqual([...builtInKinds].sort(), ["kitchen", "other", "sanitary", "storage"]);
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "kitchen-sink"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "sanitary-bathtub"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "bath-tub-apron"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "kitchen-fridge"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.every((item) => item.locked));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.placements.some((item) => item.roomId === "wohnkueche"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.placements.some((item) => item.roomId === "vorraum"));
});

test("places the 142 cm AliExpress sofa at the wall-side living position", () => {
  const sofa = DEFAULT_APARTMENT_DOCUMENT.placements.find(item=>item.id==="living-chicago-sofa");
  assert.ok(sofa);
  assert.equal(sofa.catalogId,"sofa-aliexpress-142");
  assert.deepEqual(sofa.position,{x:1.55,z:7.99});
  assert.equal(sofa.groupId, undefined);
  assert.deepEqual(sofa.size,{width:1.42,depth:0.9,height:0.865});
  assert.equal(sofa.rotation,90);
});

test("places the exact Bliss 120 upholstered bed in the free Zimmer 1 corner", () => {
  const bed = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-bliss-bed");

  assert.ok(bed);
  assert.equal(bed.catalogId, "bed-bliss-120");
  assert.deepEqual(bed.position, { x: 1.17, z: 0.81 });
  assert.deepEqual(bed.size, { width: 1.47, depth: 2.22, height: 1.08 });
  assert.equal(bed.rotation, 270);
  assert.equal(bed.materialVariants?.main, "fabric-bliss-beige");
  assert.equal(bed.metadata?.confidence, "confirmed");
});

test("keeps the photographed black fridge beside rather than inside the sink run", () => {
  const fridge = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "kitchen-fridge");
  const sinkRun = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-base-north");

  assert.ok(fridge);
  assert.ok(sinkRun);
  assert.equal(fridge.materialVariants?.main, "cabinet-black");
  assert.ok(
    sinkRun.position.x + sinkRun.size.width / 2 <= fridge.position.x - fridge.size.width / 2 + 0.001,
    "the sink cabinets must stop before the fridge begins",
  );
});

test("closes the photographed tub end with a tiled ledge", () => {
  const ledge = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-tub-end-ledge");
  assert.ok(ledge);
  assert.equal(ledge.materialVariants?.main, "tile-white-square");
  assert.ok(ledge.size.depth >= 0.12);
  assert.ok(ledge.size.width >= 0.7);
});

test("keeps the hall intercom and entry-side switch on the same wall axis", () => {
  const intercom = DEFAULT_APARTMENT_DOCUMENT.fixtures.find((item) => item.id === "fixture-hall-intercom");
  const entrySwitch = DEFAULT_APARTMENT_DOCUMENT.fixtures.find((item) => item.id === "fixture-hall-switch");
  assert.ok(intercom);
  assert.ok(entrySwitch);
  assert.equal(intercom.position.x, entrySwitch.position.x);
  assert.ok(Math.abs(intercom.position.z - entrySwitch.position.z) <= 0.25);
});

test("mounts the chromed bathtub shower centrally above the tub on the mirror wall", () => {
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.doorStates["zimmer1-door"], "closed");
  const shower = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-shower-set");
  assert.deepEqual(shower?.position, { x: -2.06, z: 9.975 });
  assert.equal(shower?.rotation, 180);
  assert.match(shower?.label ?? "", /Spiegelwand/);
});

test("keeps the supplied Temu bath dimensions and the selected vintage wallpaper material", () => {
  const rod = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-shower-rod");
  const curtain = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-shower-curtain");
  const accentWall = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-z1-bed-accent-wall");

  assert.deepEqual(rod?.size, { width: 2.05, depth: 0.03, height: 0.03 });
  assert.equal(rod?.materialVariants?.main, "chrome-polished");
  assert.deepEqual(curtain?.size, { width: 1.8, depth: 0.018, height: 2 });
  assert.equal(curtain?.materialVariants?.main, "temu-shower-curtain-beige");
  assert.equal(accentWall?.materialVariants?.main, "wallpaper-vintage-brown-fabric");
});

test("places the supplied woven rugs in the bathroom and WC at measured sizes", () => {
  const bathMat = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-mat");
  const wcMat = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "wc-mat");

  assert.ok(bathMat);
  assert.ok(wcMat);
  assert.deepEqual(bathMat.size, { width: 1.22, depth: 0.61, height: 0.01 });
  assert.deepEqual(wcMat.size, { width: 0.92, depth: 0.61, height: 0.01 });
  assert.deepEqual(wcMat.position, { x: -1.87, z: 5.15 });
  assert.equal(wcMat.rotation, 90, "92-cm-Seite liegt längs im WC");
  assert.equal(bathMat.materialVariants?.main, "aliexpress-bath-rug-woven");
  assert.equal(wcMat.materialVariants?.main, "aliexpress-bath-rug-woven");
  assert.equal(bathMat.collision, "decorative");
  assert.equal(wcMat.collision, "decorative");
  assert.ok(bathMat.metadata?.notes?.some((note) => /122.*61 cm/i.test(note)));
  assert.ok(wcMat.metadata?.notes?.some((note) => /92.*61 cm/i.test(note)));
});

test("keeps the chosen 180 x 250 cm Temu vintage rug at the 358 cm wall", () => {
  const rug = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-rug-concept");

  assert.ok(rug);
  assert.deepEqual(rug.position, { x: 1.55, z: 7.99 });
  assert.equal(rug.groupId, undefined);
  assert.equal(rug.rotation, 0);
  assert.equal(rug.materialVariants?.main, "rug-temu-vintage-cream");
  assert.equal(rug.metadata?.confidence, "confirmed");
  assert.deepEqual(rug.size, { width: 2.5, depth: 1.8, height: 0.02 });
  assert.ok(rug.metadata?.notes?.some((note) => /180.*250 cm/i.test(note)));
});

test("keeps the bathroom rug aligned like the original plan graphic and records the selected shower curtain", () => {
  const bathMat = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-mat");
  const curtain = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-shower-curtain");

  assert.ok(bathMat);
  assert.ok(curtain);
  assert.deepEqual(bathMat.position, { x: -1.25, z: 8.8 });
  assert.equal(bathMat.rotation, 90);
  assert.equal(bathMat.materialVariants?.main, "aliexpress-bath-rug-woven");
  assert.deepEqual(curtain.size, { width: 1.8, depth: 0.018, height: 2 });
  assert.equal(curtain.materialVariants?.main, "temu-shower-curtain-beige");
  assert.equal(curtain.elevation, 0.16, "2-m-Vorhang hängt unter der 218-cm-Stange");
  assert.ok(curtain.metadata?.notes?.some((note) => /12 Metallhaken.*180.*200 cm/i.test(note)));
});

test("places four individual oak and black hooks in a 2-by-2 group on the existing bathroom wall", () => {
  const hooks = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "bath-towel-hooks-wood-black");

  assert.ok(hooks);
  assert.equal(hooks.id, "builtin-bath-towel-hook-rail", "existing stable identity stays intact");
  assert.equal(hooks.roomId, "bad");
  assert.deepEqual(hooks.size, { width: 0.36, depth: 0.09, height: 0.34 });
  assert.deepEqual(hooks.position, { x: -0.16, z: 8.72 });
  assert.equal(hooks.rotation, 90);
  assert.equal(hooks.materialVariants?.main, "bath-hook-oak-natural");
  assert.equal(hooks.collision, "decorative");
  assert.match(hooks.metadata?.source ?? "", /1005013057225398.*Style2.*4er-Pack/);
  assert.ok(hooks.metadata?.notes?.some((note) => /Vier einzelne.*2×2/.test(note)));
});

test("places the user-selected AliExpress darker oak-and-iron shelves without moving the WC fixture", () => {
  const holders = DEFAULT_APARTMENT_DOCUMENT.builtIns.filter((item) => item.catalogId === "wc-paper-holder");
  assert.equal(holders.length, 1, "exactly one WC paper holder, no duplicate furniture");
  const holder = holders[0];
  assert.equal(holder.roomId, "wc");
  assert.equal(holder.id, "builtin-wc-paper-holder");
  assert.deepEqual(holder.size, { width: 0.33, depth: 0.15, height: 0.25 });
  assert.deepEqual(holder.position, { x: -1.455, z: 4.8 });
  assert.equal(holder.rotation, 90);
  assert.equal(holder.elevation, 0.68);
  assert.equal(holder.materialVariants?.main, "wc-holder-solid-oak");
  assert.equal(holder.collision, "decorative");
  assert.equal(holder.metadata?.confidence, "estimated", "overall dimensions are not documented on the photo");
  assert.match(holder.metadata?.source ?? "", /1005013624521211/);
  assert.ok(holder.metadata?.notes?.some((note) => /16,99 × 13,97 cm.*14,98 cm.*9,39 cm/.test(note)));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "wc-mat"), "existing WC rug must remain");
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "sanitary-wall-wc"), "existing WC must remain");
});

test("includes the photographed finishes and requested fixed living-room composition", () => {
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor, "parquet-oak-narrow");
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "wohnkueche")?.surfaces.floor, "parquet-oak-narrow");
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "wc")?.surfaces.walls, "tile-white-rect");
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "bad")?.surfaces.walls, "tile-white-square");

  const catalogIds = new Set(DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => item.catalogId));
  for (const expected of [
    "floor-zone-kitchen",
    "kitchen-backsplash-oak",
    "living-slat-wall",
    "living-moss-panel",
    "living-clock",
    "living-tv",
    "living-floating-cabinet",
    "wc-flush-plate",
  ]) assert.ok(catalogIds.has(expected), expected);

  for (const expected of ["ceiling-light", "smoke-detector", "switch", "outlet", "intercom", "blind-control"]) {
    assert.ok(DEFAULT_APARTMENT_DOCUMENT.fixtures.some((fixture) => fixture.kind === expected), expected);
  }

  const tv = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.catalogId === "living-tv");
  assert.equal(tv?.metadata?.confidence, "estimated");
  assert.ok(tv?.metadata?.notes?.some((note) => /Annahme|Wunschplanung/i.test(note)));
});

test("uses the measured hall-to-living door chain and keeps the TV composition inside the 195 cm wall", () => {
  const door = DEFAULT_APARTMENT_DOCUMENT.openings.find((item) => item.id === "hall-living-door");
  const slats = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-living-tv-slats");
  const tv = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-living-tv");
  const cabinet = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-living-floating-cabinet");

  assert.ok(door);
  assert.ok(slats);
  assert.ok(tv);
  assert.ok(cabinet);
  assert.equal(door.width, 0.85, "the visible hall-side door leaf must be 85 cm wide");
  assert.equal(door.offset, 0.255, "the leaf starts 20 cm from the hall corner plus the wall-graph offset");
  assert.equal(slats.size.width, 1.95);
  assert.deepEqual(slats.position, { x: 0.2, z: 7.975 });
  assert.equal(tv.position.z, slats.position.z);
  assert.equal(cabinet.position.z, slats.position.z);
  assert.ok(tv.size.width <= slats.size.width);
  assert.ok(cabinet.size.width <= slats.size.width);
});

test("migrates a raw v2 room record through an explicit furniture map", () => {
  const result = migrateStoredPlannerData(
    {
      zimmer1: [
        { id: "old-desk", type: "desk", x: 2.1, y: 0.4, w: 1.29, d: 0.55, h: 0.75, rotation: 0 },
      ],
      vorraum: [
        { id: "old-bench", type: "bench", x: 0.4, y: 1.1, w: 1, d: 0.38, h: 0.46, rotation: 90 },
      ],
    },
    DEFAULT_APARTMENT_DOCUMENT,
  );

  assert.equal(result.unmapped.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.document.placements.find((item) => item.id === "legacy-zimmer1-old-desk")?.catalogId, "desk-standard");
  assert.equal(result.document.placements.find((item) => item.id === "legacy-vorraum-old-bench")?.roomId, "vorraum");
  assert.match(result.legacyBackupJson ?? "", /old-desk/);
});

test("keeps base placements in rooms missing from a partial v2 record", () => {
  const result = migrateStoredPlannerData({ vorraum: [] }, DEFAULT_APARTMENT_DOCUMENT);

  assert.equal(
    result.document.placements.filter((item) => item.roomId === "zimmer1").length,
    DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => item.roomId === "zimmer1").length,
  );
});

test("reports unknown furniture and invalid numbers without silently dropping the backup", () => {
  const result = migrateStoredPlannerData(
    {
      zimmer1: [
        { id: "mystery", type: "teleporter", x: 1, y: 1, w: 1, d: 1, h: 1, rotation: 0 },
        { id: "broken", type: "chair", x: Number.NaN, y: 1, w: 0.5, d: 0.5, h: 0.8, rotation: 0 },
      ],
    },
    DEFAULT_APARTMENT_DOCUMENT,
  );

  assert.equal(result.unmapped.length, 2);
  assert.equal(result.warnings.length, 2);
  assert.match(result.legacyBackupJson ?? "", /mystery/);
  assert.match(result.legacyBackupJson ?? "", /__nonfinite:NaN/);
});

test("accepts an already valid V3 document without migration", () => {
  const input = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  delete (input.openings.find((opening) => opening.id === "zimmer1-door") as { swingDirection?: number }).swingDirection;
  const result = migrateStoredPlannerData(input, DEFAULT_APARTMENT_DOCUMENT);

  assert.notEqual(result.document, input);
  assert.equal(result.document.openings.find((opening) => opening.id === "zimmer1-door")?.swingDirection, 1);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.unmapped, []);
  assert.equal(result.legacyBackupJson, null);
});

test("keeps out-of-bounds legacy furniture in the migration report instead of throwing", () => {
  const result = migrateStoredPlannerData({
    zimmer1: [{ type: "desk", x: -3, y: -3, w: 1, d: 1, h: 0.75, rotation: 0 }],
  }, DEFAULT_APARTMENT_DOCUMENT);

  assert.equal(result.document.placements.some((item) => item.catalogId === "desk-standard" && item.id.startsWith("legacy-")), false);
  assert.equal(result.unmapped[0]?.reason, "outside-room");
  assert.match(result.warnings[0] ?? "", /außerhalb|innerhalb/i);
});
