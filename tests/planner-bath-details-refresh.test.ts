import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

const findBuiltIn = (document: typeof DEFAULT_APARTMENT_DOCUMENT, id: string) =>
  document.builtIns.find((item) => item.id === id)!;

test("tiled bath apron closes the lower and side seams with the tub", () => {
  const doc = DEFAULT_APARTMENT_DOCUMENT;
  const tub = findBuiltIn(doc, "builtin-bath-tub");
  const apron = findBuiltIn(doc, "builtin-bath-tub-apron");
  const side = findBuiltIn(doc, "builtin-bath-tub-side-apron");
  const end = findBuiltIn(doc, "builtin-bath-tub-end-ledge");
  const top = (item: typeof tub) => (item.elevation ?? 0) + item.size.height;
  assert.equal(top(apron), top(tub), "front ceramic reaches the rim without a slit");
  assert.equal(top(side), top(tub), "side ceramic reaches the rim without a slit");
  assert.equal(top(end), top(tub), "rear tiled ledge reaches the rim");
  assert.ok(side.position.z + side.size.depth / 2 > apron.position.z - apron.size.width / 2 + 0.01,
    "the side tile intersects the front edge rather than merely touching it");
  assert.ok(side.position.z - side.size.depth / 2 >= 8.2 - 0.0001,
    "the new tile does not protrude into the hallway");
});

test("the chrome shower is centered on the bathtub by the mirror wall", () => {
  const shower = findBuiltIn(DEFAULT_APARTMENT_DOCUMENT, "builtin-bath-shower-set");
  const tub = findBuiltIn(DEFAULT_APARTMENT_DOCUMENT, "builtin-bath-tub");
  assert.equal(shower.position.x, tub.position.x);
  assert.ok(shower.position.z > 9.9);
  assert.equal(shower.rotation, 180);
  const room = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "bad");
  assert.ok(room.builtIns.some((x) => x.id === shower.id && x.catalogId === "bath-shower-set"));
});

test("the original beige curtain keeps full purchased fabric dimensions but records half-open styling", () => {
  const curtain = findBuiltIn(DEFAULT_APARTMENT_DOCUMENT, "builtin-bath-shower-curtain");
  assert.deepEqual(curtain.size, { width: 1.8, depth: 0.018, height: 2 });
  assert.ok(curtain.metadata?.notes?.some((note) => /halb geöffnet/.test(note)));
});

test("existing browser saves get the bath seam and shower repair without losing customized furniture", () => {
  const doc = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const oldApron = findBuiltIn(doc, "builtin-bath-tub-apron");
  oldApron.size.height = 0.53;
  oldApron.elevation = 0.015;
  const oldEnd = findBuiltIn(doc, "builtin-bath-tub-end-ledge");
  oldEnd.size.height = 0.54;
  oldEnd.elevation = 0.01;
  const oldSide = findBuiltIn(doc, "builtin-bath-tub-side-apron");
  oldSide.position.z = 8.295;
  oldSide.size.depth = 0.19;
  const shower = findBuiltIn(doc, "builtin-bath-shower-set");
  shower.position = { x: -2.34, z: 9.62 };
  shower.rotation = 90;

  const movedBed = doc.placements.find((item) => item.id === "zimmer1-bliss-bed")!;
  movedBed.position.x += 0.08;
  const bedBefore = structuredClone(movedBed);
  doc.placements = doc.placements.filter((item) => item.id !== "zimmer1-chair");
  const refreshed = prepareSavedPlannerDocument(doc);
  for (const id of ["builtin-bath-tub-apron", "builtin-bath-tub-end-ledge", "builtin-bath-tub-side-apron", "builtin-bath-shower-set"]) {
    const current = findBuiltIn(refreshed, id);
    const target = findBuiltIn(DEFAULT_APARTMENT_DOCUMENT, id);
    assert.deepEqual(current.position, target.position);
    assert.deepEqual(current.size, target.size);
    assert.equal(current.elevation, target.elevation);
    assert.equal(current.rotation, target.rotation);
  }
  assert.deepEqual(refreshed.placements.find((x) => x.id === movedBed.id), bedBefore);
  const chair = refreshed.placements.filter((x) => x.id === "zimmer1-chair");
  assert.equal(chair.length, 1);
  assert.equal(chair[0].catalogId, "chair-aliexpress-xuegw-1005012445521181");
  assert.equal(prepareSavedPlannerDocument(refreshed), refreshed, "refresh is idempotent");
});

test("deliberately changed shower position and chair model remain untouched", () => {
  const doc = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  findBuiltIn(doc, "builtin-bath-shower-set").position.x = -2.20;
  const chair = doc.placements.find((item) => item.id === "zimmer1-chair")!;
  chair.catalogId = "chair-office";
  const next = prepareSavedPlannerDocument(doc);
  assert.equal(findBuiltIn(next, "builtin-bath-shower-set").position.x, -2.20);
  assert.equal(next.placements.find((item) => item.id === "zimmer1-chair")?.catalogId, "chair-office");
});
