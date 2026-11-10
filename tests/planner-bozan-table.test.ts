import assert from "node:assert/strict";
import test from "node:test";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { inspectPlacement } from "../app/planner/domain/collisions.ts";

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

test("places three Kaleo armchairs while keeping the refrigerator side clear", () => {
  const catalogItem = getFurnitureCatalogItem("chair-kaleo-chenille-beige");
  const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table");
  const chairs = DEFAULT_APARTMENT_DOCUMENT.placements
    .filter((item) => item.catalogId === "chair-kaleo-chenille-beige")
    .toSorted((left, right) => left.id.localeCompare(right.id));

  assert.ok(catalogItem);
  assert.deepEqual(catalogItem.defaultSize, { width: 0.63, depth: 0.64, height: 0.87 });
  assert.equal(catalogItem.resize, "fixed");
  assert.ok(table);
  assert.equal(table.groupId, "living-dining-group");
  assert.equal(chairs.length, 3);
  assert.deepEqual(chairs.map((chair) => ({
    id: chair.id,
    position: chair.position,
    rotation: chair.rotation,
    size: chair.size,
    groupId: chair.groupId,
  })), [
    {
      id: "living-kaleo-chair-east",
      position: { x: 2.9, z: 5.7 },
      rotation: 90,
      size: { width: 0.63, depth: 0.64, height: 0.87 },
      groupId: "living-dining-group",
    },
    {
      id: "living-kaleo-chair-south",
      position: { x: 1.5, z: 5.7 },
      rotation: 270,
      size: { width: 0.63, depth: 0.64, height: 0.87 },
      groupId: "living-dining-group",
    },
    {
      id: "living-kaleo-chair-west",
      position: { x: 2.2, z: 5 },
      rotation: 0,
      size: { width: 0.63, depth: 0.64, height: 0.87 },
      groupId: "living-dining-group",
    },
  ]);

  const groupIds = new Set([table.id, ...chairs.map((chair) => chair.id)]);
  for (const chair of chairs) {
    assert.deepEqual(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, chair, { ignorePlacementIds: groupIds }).hard, []);
    assert.equal(chair.materialVariants?.main, "fabric-kaleo-beige");
    assert.ok(chair.metadata?.notes?.some((note) => /armlehne.*66 cm/i.test(note)));
    assert.ok(chair.metadata?.notes?.some((note) => /50-cm.*rundfu/i.test(note)));
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
