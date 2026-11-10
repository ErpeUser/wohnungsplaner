import assert from "node:assert/strict";
import test from "node:test";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { inspectPlacement } from "../app/planner/domain/collisions.ts";

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

test("places the compact two-drawer LED nightstand beside the Bliss headboard", () => {
  const catalogItem = getFurnitureCatalogItem("nightstand-led-2drawer-white");
  const nightstand = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-led-nightstand");

  assert.ok(catalogItem);
  assert.deepEqual(catalogItem.defaultSize, { width: 0.396, depth: 0.3, height: 0.604 });
  assert.equal(catalogItem.resize, "fixed");

  assert.ok(nightstand);
  assert.equal(nightstand.roomId, "zimmer1");
  assert.deepEqual(nightstand.position, { x: 0.22, z: 1.69 });
  assert.deepEqual(nightstand.size, catalogItem.defaultSize);
  assert.equal(nightstand.rotation, 270);
  assert.equal(nightstand.materialVariants?.main, "white-matte");
  assert.equal(nightstand.metadata?.confidence, "estimated");
  assert.ok(nightstand.metadata?.notes?.some((note) => /Temu.*Bild/i.test(note)));
  assert.deepEqual(inspectPlacement(DEFAULT_APARTMENT_DOCUMENT, nightstand).hard, []);
});
