import assert from "node:assert/strict";
import test from "node:test";

import {
  TABLE_MODELS,
  getTableModel,
  getTableVariant,
  metresFromCentimetres,
  tableModelHasGeometry,
} from "../app/planner/tables/table-models.ts";

test("führt alle vier gecrawlten Tischquellen mit belegten Größenständen", () => {
  assert.equal(TABLE_MODELS.length, 4);
  assert.deepEqual(TABLE_MODELS.map((model) => model.id), [
    "aliexpress-100-140",
    "temu-606997-120-160",
    "kaufland-567080013-120-160",
    "temu-609726-unknown",
  ]);

  const ali = getTableModel("aliexpress-100-140");
  assert.ok(ali);
  assert.equal(ali?.variants.length, 2);
  assert.deepEqual(getTableVariant(ali!, "extended")?.sizeCm, { width: 140, depth: 100, height: 75 });
  assert.equal(ali?.variants[0]?.confidence, "estimated");
  assert.ok(ali?.imageUrls.length);

  const temu = getTableModel("temu-606997-120-160");
  assert.deepEqual(getTableVariant(temu!, "closed")?.sizeCm, { width: 120, depth: 120, height: 75.5 });
  assert.deepEqual(getTableVariant(temu!, "extended")?.sizeCm, { width: 160, depth: 120, height: 75.5 });
  assert.equal(temu?.variants[1]?.seatCount, 8);

  const kaufland = getTableModel("kaufland-567080013-120-160");
  assert.deepEqual(getTableVariant(kaufland!, "closed")?.sizeCm, { width: 120, depth: 80, height: 75.5 });
  assert.deepEqual(getTableVariant(kaufland!, "extended")?.sizeCm, { width: 160, depth: 80, height: 75.5 });
  assert.equal(kaufland?.sourceStatus, "confirmed");
});

test("konvertiert Zentimeter ohne Rundungsfehler für die Planungsgeometrie", () => {
  assert.deepEqual(metresFromCentimetres({ width: 160, depth: 80, height: 75.5 }), {
    width: 1.6,
    depth: 0.8,
    height: 0.755,
  });
});

test("zeigt die blockierte Temu-Quelle ohne erfundene Maße an", () => {
  const unknown = getTableModel("temu-609726-unknown");
  assert.ok(unknown);
  assert.equal(unknown?.sourceStatus, "blocked");
  assert.equal(unknown?.variants.length, 0);
  assert.equal(tableModelHasGeometry(unknown!), false);
  assert.equal(unknown?.sourceUrl, "https://www.temu.com/at/g-609726356120319.html");
});
