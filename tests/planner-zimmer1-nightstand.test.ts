import assert from "node:assert/strict";
import test from "node:test";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { inspectPlacement } from "../app/planner/domain/collisions.ts";
import { upgradeWoltuNightstandPlacement } from "../app/planner/domain/room-refinement.ts";

test("uses warm taupe only on the wall directly behind the Zimmer 1 bed", () => {
  const accent = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-z1-bed-accent-wall");

  assert.ok(accent);
  assert.equal(accent.roomId, "zimmer1");
  assert.equal(accent.catalogId, "wall-finish-vintage-fabric-wallpaper");
  assert.equal(accent.materialVariants?.main, "wallpaper-vintage-brown-fabric");
  assert.deepEqual(accent.position, { x: 0.068, z: 1.665 });
  assert.deepEqual(accent.size, { width: 3.33, depth: 0.008, height: 2.54 });
  assert.equal(accent.rotation, 90);
});

test("keeps the former LED nightstand model available while placing the selected AliExpress WOLTU model", () => {
  const former = getFurnitureCatalogItem("nightstand-led-2drawer-white");
  const selected = getFurnitureCatalogItem("nightstand-aliexpress-woltu-1005012793801128");
  const nightstand = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-led-nightstand");

  assert.ok(former);
  assert.ok(selected);
  assert.deepEqual(selected.defaultSize, { width: 0.396, depth: 0.3, height: 0.604 });
  assert.equal(selected.resize, "fixed");
  assert.equal(selected.symbol, "storage");
  assert.ok(nightstand);
  assert.equal(nightstand.catalogId, selected.id);
  assert.deepEqual(nightstand.size, selected.defaultSize);
  assert.equal(nightstand.materialVariants?.main, "white-matte");
  assert.match(nightstand.metadata?.source ?? "", /1005012793801128/);
  assert.ok(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, nightstand).hard.length === 0);
});

test("keeps the former catalog model available alongside the selected WOLTU placement", () => {
  const former = getFurnitureCatalogItem("nightstand-led-2drawer-white");
  const nightstand = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-led-nightstand");

  assert.ok(former);
  assert.deepEqual(former.defaultSize, { width: 0.396, depth: 0.3, height: 0.604 });
  assert.ok(nightstand);
  assert.equal(nightstand.catalogId, "nightstand-aliexpress-woltu-1005012793801128");
  assert.equal(nightstand.roomId, "zimmer1");
  assert.deepEqual(nightstand.position, { x: 0.22, z: 1.76 });
  assert.equal(nightstand.rotation, 270);
  assert.equal(nightstand.materialVariants?.main, "white-matte");
  assert.equal(nightstand.metadata?.confidence, "estimated");
  assert.ok(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, nightstand).hard.length === 0);
});

test("migrates an older saved nightstand placement to the selected AliExpress model", () => {
  const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  legacy.placements = legacy.placements.map((item) => item.id === "zimmer1-led-nightstand"
    ? { ...item, catalogId: "nightstand-led-2drawer-white", materialVariants: { main: "white-matte" } }
    : item);
  const migrated = upgradeWoltuNightstandPlacement(legacy);
  const nightstand = migrated.placements.find((item) => item.id === "zimmer1-led-nightstand")!;
  assert.equal(nightstand.catalogId, "nightstand-aliexpress-woltu-1005012793801128");
  assert.equal(nightstand.materialVariants?.main, "white-matte");
  assert.equal(upgradeWoltuNightstandPlacement(migrated), migrated);
});
