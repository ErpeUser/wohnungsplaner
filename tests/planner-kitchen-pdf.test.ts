import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";

test("matches the dimensioned kitchen plan and room photos", () => {
  const kitchenFloorZones = DEFAULT_APARTMENT_DOCUMENT.builtIns.filter(
    (item) => item.catalogId === "floor-zone-kitchen",
  );
  const mainRun = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-base-west");
  const mainWorktop = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-worktop-west");
  const oven = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-oven");
  const hob = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-hob");
  const hood = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-hood");

  assert.deepEqual(
    kitchenFloorZones.map((item) => ({
      id: item.id,
      position: item.position,
      size: item.size,
      material: item.materialVariants?.main,
    })),
    [
      {
        id: "builtin-kitchen-tile-north",
        position: { x: 1.225, z: 4.185 },
        size: { width: 2.45, depth: 1.43, height: 0.018 },
        material: "tile-kitchen-grey-square",
      },
      {
        id: "builtin-kitchen-tile-west",
        position: { x: 0.725, z: 5.466 },
        size: { width: 1.45, depth: 1.132, height: 0.018 },
        material: "tile-kitchen-grey-square",
      },
    ],
  );

  assert.ok(mainRun);
  assert.deepEqual(mainRun.position, { x: 0.3, z: 5.076 });
  assert.deepEqual(mainRun.size, { width: 1.912, depth: 0.6, height: 0.92 });

  assert.ok(mainWorktop);
  assert.equal(mainWorktop.size.width, 1.952);
  assert.equal(mainWorktop.materialVariants?.main, "kitchen-worktop-black");

  for (const appliance of [oven, hob, hood]) {
    assert.ok(appliance);
    assert.equal(appliance.position.z, 5.132);
  }

  const returnRun = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-base-north");
  const sink = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-sink");
  const microwave = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-microwave");
  const fridge = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-kitchen-fridge");

  assert.equal(returnRun?.size.width, 1.118);
  assert.equal(sink?.position.x, 1.468);
  assert.equal(microwave?.position.x, 1.468);
  assert.deepEqual(fridge?.size, { width: 0.6, depth: 0.65, height: 2.04 });
  assert.equal(fridge?.position.x, 2.068);
});
