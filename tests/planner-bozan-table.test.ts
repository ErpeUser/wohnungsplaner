import assert from "node:assert/strict";
import test from "node:test";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { inspectPlacement } from "../app/planner/domain/collisions.ts";
import { getChairModelForCatalogId, BOZAN_WOLTU_TUCK_DISTANCE_M, chairSeatLayout } from "../app/planner/chairs/chair-models.ts";

test("balances the Bozan table between fridge and sofa while keeping the kitchen-side aisle usable", () => {
  const catalogItem = getFurnitureCatalogItem("dining-table-bozan-110");
  const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table");

  assert.ok(catalogItem);
  assert.deepEqual(catalogItem.defaultSize, { width: 1.1, depth: 1.1, height: 0.76 });
  assert.equal(catalogItem.resize, "fixed");

  assert.ok(table);
  assert.equal(table.roomId, "wohnkueche");
  assert.equal(table.catalogId, "dining-table-bozan-110");
  assert.deepEqual(table.position, { x: 2.2, z: 5.7 });
  assert.deepEqual(table.size, { width: 1.1, depth: 1.1, height: 0.76 });
  assert.equal(table.rotation, 180);
  assert.equal(table.materialVariants?.main, "oak-artisan");
  assert.equal(table.metadata?.confidence, "confirmed");
  assert.ok(table.metadata?.notes?.some((note) => /150.*110.*ausgezogen/i.test(note)));

  const fridgeFrontZ = 4.14;
  const sofaFrontZ = 6.79;
  const tableNorthEdge = table.position.z - table.size.depth / 2;
  const tableSouthEdge = table.position.z + table.size.depth / 2;
  assert.ok(tableNorthEdge - fridgeFrontZ >= 0.7, "at least 70 cm must remain at the fridge side");
  assert.ok(sofaFrontZ - tableSouthEdge >= 0.5, "at least 50 cm must remain at the sofa side");
  const diningGroupIds = new Set(
    DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => item.groupId === table.groupId).map((item) => item.id),
  );
  assert.deepEqual(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, table, { ignorePlacementIds: diningGroupIds }).hard, []);
});

test("places four WOLTU main dining chairs while keeping the refrigerator side clear", () => {
  const catalogItem = getFurnitureCatalogItem("chair-aliexpress-woltu-1005013095870024");
  const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table");
  const chairs = DEFAULT_APARTMENT_DOCUMENT.placements
    .filter((item) => item.catalogId === "chair-aliexpress-woltu-1005013095870024")
    .toSorted((left, right) => left.id.localeCompare(right.id));

  assert.ok(catalogItem);
  assert.deepEqual(catalogItem.defaultSize, { width: 0.58, depth: 0.6, height: 0.85 });
  assert.equal(catalogItem.resize, "fixed");
  assert.ok(table);
  assert.equal(table.groupId, "living-dining-group");
  assert.equal(chairs.length, 4);
  assert.deepEqual(chairs.map((chair) => ({
    id: chair.id,
    position: chair.position,
    rotation: chair.rotation,
    size: chair.size,
    groupId: chair.groupId,
  })), [
    {
      id: "living-kaleo-chair-east",
      position: { x: 2.82, z: 5.7 },
      rotation: 90,
      size: { width: 0.58, depth: 0.6, height: 0.85 },
      groupId: "living-dining-group",
    },
    {
      id: "living-kaleo-chair-north",
      position: { x: 2.2, z: 6.32 },
      rotation: 180,
      size: { width: 0.58, depth: 0.6, height: 0.85 },
      groupId: "living-dining-group",
    },
    {
      id: "living-kaleo-chair-south",
      position: { x: 1.58, z: 5.7 },
      rotation: 270,
      size: { width: 0.58, depth: 0.6, height: 0.85 },
      groupId: "living-dining-group",
    },
    {
      id: "living-kaleo-chair-west",
      position: { x: 2.2, z: 5.08 },
      rotation: 0,
      size: { width: 0.58, depth: 0.6, height: 0.85 },
      groupId: "living-dining-group",
    },
  ]);

  const groupIds = new Set([table.id, ...chairs.map((chair) => chair.id)]);
  for (const chair of chairs) {
    assert.deepEqual(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, chair, { ignorePlacementIds: groupIds }).hard, []);
    assert.equal(chair.materialVariants?.main, "fabric-woltu-chenille-cream");
    assert.ok(chair.metadata?.notes?.some((note) => /armlehnenhöhe 65 cm/i.test(note)));
    assert.ok(chair.metadata?.notes?.some((note) => /Metallbeine/i.test(note)));
  }
  const fridgeFrontZ = 4.14;
  const tableNorthEdge = table.position.z - table.size.depth / 2;
  assert.ok(tableNorthEdge - fridgeFrontZ >= 0.7, "the refrigerator side must retain at least 70 cm");

  const west = chairs.find((chair) => chair.id === "living-kaleo-chair-west")!;
  const east = chairs.find((chair) => chair.id === "living-kaleo-chair-east")!;
  const westKitchenEdge = 0.61;
  const eastWallAtTable = 4.097;
  const westAisle = west.position.x - west.size.depth / 2 - westKitchenEdge;
  const eastAisle = eastWallAtTable - (east.position.x + east.size.depth / 2);
  assert.ok(westAisle >= 0.75, "the main passage beside the sofa must stay comfortably open");
  assert.ok(eastAisle >= 0.67, "the secondary aisle at the angled wall must remain usable");
});

test("Bozan + WOLTU allow a partial under-table tuck without hiding the back or cutting into the apron", () => {
  const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table")!;
  const model = getChairModelForCatalogId("chair-aliexpress-woltu-1005013095870024")!;
  const chairs = DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => item.groupId === table.groupId && item.id !== table.id);
  assert.equal(chairs.length, 4);
  assert.equal(BOZAN_WOLTU_TUCK_DISTANCE_M, 0.62);
  const tabletopUnder = table.size.height - 0.025;
  assert.ok(model.armHeightCm !== undefined);
  assert.ok(topUnderArmClearance(tabletopUnder, model.armHeightCm / 100) >= 0.08);
  const tabletopRadius = table.size.width / 2;
  // Measured 25 mm top; the under-slab frame spans 72% of the Bozan model.
  const apronHalfWidth = table.size.width * 0.72 / 2;
  for (const chair of chairs) {
    const distance = Math.hypot(chair.position.x - table.position.x, chair.position.z - table.position.z);
    assert.ok(Math.abs(distance - BOZAN_WOLTU_TUCK_DISTANCE_M) < 0.00001, chair.id);
    const frontSeat = distance - model.sizeCm.depth / 200;
    assert.ok(topFrontSeatInset(tabletopRadius, frontSeat) >= 0.2, chair.id);
    // The shell arm tips end at 31% of depth from the centre; leave 3 cm
    // to the lower apron, not an unrealistic complete chair insertion.
    const frontArm = distance - model.sizeCm.depth / 100 * 0.31;
    assert.ok(frontArm > apronHalfWidth + 0.03, chair.id);
    const back = distance + model.sizeCm.depth / 100 * 0.46;
    assert.ok(back > tabletopRadius + 0.2, "high back remains outside table: " + chair.id);
  }
  // Each pair's nearest rectangular corners remains at least 3 cm apart.
  const axisGap = BOZAN_WOLTU_TUCK_DISTANCE_M - model.sizeCm.width / 200 - model.sizeCm.depth / 200;
  assert.ok(axisGap >= 0.03 - 1e-10);
  // Re-applying the chosen WOLTU group preserves the compact arrangement.
  const layout = chairSeatLayout(table, model);
  for (const seat of layout) {
    assert.ok(Math.abs(Math.hypot(seat.position.x - table.position.x, seat.position.z - table.position.z) - 0.62) < 1e-8);
  }
});
function topUnderArmClearance(underside: number, armTop: number) { return underside - armTop; }
function topFrontSeatInset(radius: number, seatFrontDistance: number) { return radius - seatFrontDistance; }
