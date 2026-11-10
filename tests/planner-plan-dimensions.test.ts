import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("hält die gemessene lichte Deckenhöhe von 2,56 m auf allen Wänden", () => {
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.walls.length > 0);
  assert.deepEqual(new Set(DEFAULT_APARTMENT_DOCUMENT.walls.map((wall) => wall.height)), new Set([2.56]));
});

test("verwendet Epoxidharz für die kombinierte Balkon-/Loggia-Fläche", () => {
  const balcony = DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === "balkon");
  assert.equal(balcony?.area, 6.03);
  assert.equal(balcony?.wnfArea, 2.23);
  assert.equal(balcony?.surfaces.floor, "epoxy-grey");
  assert.equal(createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "balkon").floors[0]?.materialId, "epoxy-grey");
});

test("modelliert die obere 80-cm-Öffnung von Zimmer 2 als Balkontür", () => {
  const opening = DEFAULT_APARTMENT_DOCUMENT.openings.find((candidate) => candidate.id === "zimmer2-balcony-door");
  assert.deepEqual(
    { kind: opening?.kind, width: opening?.width, sill: opening?.sill, hinge: opening?.hinge, swingDirection: opening?.swingDirection },
    { kind: "door", width: 0.8, sill: 0, hinge: "end", swingDirection: -1 },
  );
});
