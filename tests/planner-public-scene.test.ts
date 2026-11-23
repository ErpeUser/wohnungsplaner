import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { projectPublicApartmentDocument } from "../app/planner/domain/public-scene.ts";

test("public projection keeps the complete apartment including Zimmer 1", () => {
    const projected = projectPublicApartmentDocument(DEFAULT_APARTMENT_DOCUMENT);

    assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.some((room) => room.id === "zimmer1"), true);
    assert.equal(projected.rooms.some((room) => room.id === "zimmer1"), true);
    assert.equal(projected.rooms.length, DEFAULT_APARTMENT_DOCUMENT.rooms.length);
    assert.equal(projected.builtIns.length, DEFAULT_APARTMENT_DOCUMENT.builtIns.length);
    assert.equal(projected.fixtures.length, DEFAULT_APARTMENT_DOCUMENT.fixtures.length);
    assert.equal(projected.placements.length, DEFAULT_APARTMENT_DOCUMENT.placements.length);
    assert.equal(projected.openings.some((opening) => opening.id === "zimmer1-window"), true);
    assert.equal(projected.openings.some((opening) => opening.id === "zimmer1-door"), true);
});

test("public catalogue keeps Zimmer-1 products and all 42 desktop references", () => {
    assert.ok(getFurnitureCatalogItem("bed-bliss-120"));
    assert.ok(getFurnitureCatalogItem("plant-zimmer1-olive"));
    assert.match(getFurnitureCatalogItem("deko-aliexpress-01")?.sourceUrl ?? "", /aliexpress\.com/);
    assert.match(getFurnitureCatalogItem("deko-temu-20")?.sourceUrl ?? "", /temu\.com/);
    assert.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
      .every((index) => Boolean(getFurnitureCatalogItem(`deko-aliexpress-${String(index).padStart(2, "0")}`))), true);
    assert.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      .every((index) => Boolean(getFurnitureCatalogItem(`deko-temu-${String(index).padStart(2, "0")}`))), true);
});
