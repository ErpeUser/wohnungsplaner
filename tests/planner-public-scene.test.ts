import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { parsePlannerDocument } from "../app/planner/domain/schema.ts";
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

test("restores Zimmer 1 from a saved public starter without replacing the active plan", () => {
    const full = DEFAULT_APARTMENT_DOCUMENT;
    const roomId = "zimmer1";
    const saved = structuredClone(full);
    saved.rooms = saved.rooms.filter((room) => room.id !== roomId);
    saved.walls = saved.walls.map((wall) => ({ ...wall, roomIds: wall.roomIds.filter((id) => id !== roomId) }))
        .filter((wall) => wall.roomIds.length > 0);
    const walls = new Set(saved.walls.map((wall) => wall.id));
    saved.openings = saved.openings.map((opening) => ({
        ...opening, roomIds: opening.roomIds?.filter((id) => id !== roomId),
    })).filter((opening) => (opening.roomIds?.length ?? 0) > 0 && walls.has(opening.wallId));
    saved.builtIns = saved.builtIns.filter((item) => item.roomId !== roomId);
    saved.fixtures = saved.fixtures.filter((item) => item.roomId !== roomId);
    saved.placements = saved.placements.filter((item) => item.roomId !== roomId);
    saved.doorStates = { "hall-bath-door": "open" };
    saved.viewPreferences.activeRoomId = "bad";
    saved.placements[0].materialVariants = { main: "Eiche nach Wunsch" };
    const active = parsePlannerDocument(saved);

    const restored = projectPublicApartmentDocument(active);

    assert.deepEqual(restored.rooms.map((room) => room.id), full.rooms.map((room) => room.id));
    const ordered = <T extends { id: string }>(items: T[]) => items.sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(ordered(restored.walls.filter((wall) => wall.roomIds.includes(roomId))),
        ordered(full.walls.filter((wall) => wall.roomIds.includes(roomId))));
    assert.deepEqual(restored.openings.filter((opening) => opening.roomIds?.includes(roomId)),
        full.openings.filter((opening) => opening.roomIds?.includes(roomId)));
    assert.deepEqual(restored.builtIns.filter((item) => item.roomId === roomId), full.builtIns.filter((item) => item.roomId === roomId));
    assert.deepEqual(restored.fixtures.filter((item) => item.roomId === roomId), full.fixtures.filter((item) => item.roomId === roomId));
    assert.deepEqual(restored.placements.filter((item) => item.roomId === roomId), full.placements.filter((item) => item.roomId === roomId));
    assert.deepEqual(restored.placements.filter((item) => item.roomId !== roomId), active.placements);
    assert.deepEqual(restored.doorStates, { "zimmer1-door": full.doorStates["zimmer1-door"], ...active.doorStates });
    assert.deepEqual(restored.viewPreferences, active.viewPreferences);
    assert.doesNotThrow(() => parsePlannerDocument(restored));
    assert.equal(projectPublicApartmentDocument(restored), restored);
});
