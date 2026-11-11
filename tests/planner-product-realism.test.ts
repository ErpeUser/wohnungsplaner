import assert from "node:assert/strict";
import test from "node:test";

import {
  FURNITURE_CATALOG,
  PHOTO_FIRST_IDS,
  getFurnitureCatalogItem,
  getProductRealismSpec,
} from "../app/planner/catalog/catalog.ts";
import { resolveFurnitureAsset } from "../app/planner/catalog/asset-manifest.ts";

test("führt die Händlermaße der tatsächlich platzierten Produkte unverändert", () => {
  const expected: Record<string, [number, number, number]> = {
    "bed-bliss-120": [1.47, 2.22, 1.08],
    "sofa-aliexpress-142": [1.42, 0.9, 0.865],
    "sofa-aliexpress-142-open": [1.42, 1.72, 0.865],
    "sofa-chicago-206": [2.06, 1.07, 0.78],
    "hallway-tejo-115": [1.15, 0.375, 2.319],
    "dining-table-bozan-110": [1.1, 1.1, 0.76],
    "chair-kaleo-chenille-beige": [0.63, 0.64, 0.87],
    "vanity-vicco-sherry-120": [1.2, 0.55, 1.45],
    "chair-temu-executive-ivory": [0.64, 0.51, 1.14],
    "nightstand-led-2drawer-white": [0.396, 0.3, 0.604],
  };

  for (const [id, [width, depth, height]] of Object.entries(expected)) {
    assert.deepEqual(getFurnitureCatalogItem(id)?.defaultSize, { width, depth, height }, id);
  }
});

test("dokumentiert Konstruktion und Herkunft für jedes produktbezogene Möbel", () => {
  const productIds = [
    "bed-bliss-120", "sofa-aliexpress-142", "sofa-aliexpress-142-open", "sofa-chicago-206", "sofa-sectional-photo", "hallway-tejo-115", "dining-table-bozan-110",
    "chair-kaleo-chenille-beige", "vanity-vicco-sherry-120", "chair-temu-executive-ivory",
    "nightstand-led-2drawer-white", "wardrobe-225", "rug-temu-rabbit-ivory-100x180",
    "rug-temu-shaggy-white-120x200", "rug-temu-easy-line-120x180", "rug-temu-easy-line-140x200",
    "rug-gala-shaggy-2505-100x200", "rug-living-concept-240x240", "plant-zimmer1-olive",
  ];

  for (const id of productIds) {
    const spec = getProductRealismSpec(id);
    assert.ok(spec, `${id} needs a product realism specification`);
    assert.ok(spec.sourceLabel.length > 8);
    assert.match(spec.dimensions, /cm/);
    assert.ok(spec.construction.length >= 3);
  }
  assert.equal(getProductRealismSpec("rug-living-concept-240x240")?.confidence, "verified");
  assert.match(getProductRealismSpec("rug-living-concept-240x240")?.sourceLabel ?? "", /607199740937372/);
  assert.equal(getProductRealismSpec("sofa-aliexpress-142")?.confidence, "verified");
  assert.match(getProductRealismSpec("sofa-aliexpress-142-open")?.dimensions ?? "", /172 cm/);
  assert.equal(getProductRealismSpec("bed-bliss-120")?.confidence, "verified");
  assert.ok(getProductRealismSpec("sofa-chicago-206")?.construction.includes("zwei Relaxsitze"));
  assert.ok(getProductRealismSpec("chair-kaleo-chenille-beige")?.construction.includes("Sitzfläche 360° drehbar"));
});

test("hält produktbezogene Modelle parametrisch bis ein lizenziertes GLB vorliegt", () => {
  const productIds = [
    "bed-bliss-120", "sofa-aliexpress-142", "sofa-aliexpress-142-open", "sofa-chicago-206", "sofa-sectional-photo", "hallway-tejo-115", "dining-table-bozan-110",
    "chair-kaleo-chenille-beige", "vanity-vicco-sherry-120", "chair-temu-executive-ivory",
    "nightstand-led-2drawer-white", "wardrobe-225", "rug-temu-rabbit-ivory-100x180",
    "rug-temu-shaggy-white-120x200", "rug-temu-easy-line-120x180", "rug-temu-easy-line-140x200",
    "rug-gala-shaggy-2505-100x200", "rug-living-concept-240x240", "plant-zimmer1-olive",
  ];

  for (const id of productIds) {
    const item = getFurnitureCatalogItem(id)!;
    assert.equal(item.renderMode, "parametric", id);
    assert.equal(resolveFurnitureAsset(item).kind, "parametric", id);
  }
});

test("hält für jedes foto-first Produkt Herkunft und Bauweise vor", () => {
  for (const id of PHOTO_FIRST_IDS) {
    const item = getFurnitureCatalogItem(id);
    assert.ok(item, id);
    assert.ok(item?.realism, id + " needs a product realism specification");
    assert.ok(item?.realism?.sourceLabel.length > 8);
    assert.ok(item?.realism?.construction.length >= 3);
  }
});

test("Katalog bleibt auf vorhandene Möbelkategorien begrenzt", () => {
  assert.ok(FURNITURE_CATALOG.some((item) => item.id === "bed-bliss-120"));
  assert.ok(FURNITURE_CATALOG.some((item) => item.id === "sofa-chicago-206"));
  assert.ok(FURNITURE_CATALOG.every((item) => item.defaultSize.width > 0 && item.defaultSize.depth > 0));
});
