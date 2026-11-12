import assert from "node:assert/strict";
import test from "node:test";

import { executePlannerAiRequest, listPlannerAiCatalog } from "../app/planner/domain/ai-commands.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";

test("exposes a stable catalog projection and translates couch moves by ID", () => {
  const sofa = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-chicago-sofa")!;
  const catalog = listPlannerAiCatalog();
  assert.ok(catalog.some((item) => item.id === sofa.catalogId && item.materialIds.includes("fabric-ali-ivory")));

  const result = executePlannerAiRequest(DEFAULT_APARTMENT_DOCUMENT, {
    action: "move",
    objectId: sofa.id,
    position: { ...sofa.position },
  });
  assert.equal(result.command?.type, "movePlacement");
  assert.equal(result.result.error, undefined);
  assert.deepEqual(result.result.document.placements.find((item) => item.id === sofa.id)?.position, sofa.position);
});

test("creates deterministic IDs for catalog additions and rejects unknown products", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.placements = [];
  document.builtIns = [];
  document.fixtures = [];
  const request = {
    action: "add" as const,
    roomId: "zimmer1",
    catalogId: "sofa-aliexpress-142",
    position: { x: 1, z: 1 },
  };

  const first = executePlannerAiRequest(document, request);
  assert.equal(first.result.error, undefined);
  assert.equal(first.stableId, "ai-sofa-aliexpress-142-zimmer1");
  assert.equal(first.result.document.placements.at(-1)?.id, first.stableId);

  const second = executePlannerAiRequest(first.result.document, request);
  assert.equal(second.stableId, "ai-sofa-aliexpress-142-zimmer1-2");

  const unknown = executePlannerAiRequest(document, { ...request, catalogId: "not-a-catalog-item" });
  assert.equal(unknown.result.error?.code, "invalid");
});

test("keeps AI commands safe for malformed numeric input", () => {
  const result = executePlannerAiRequest(DEFAULT_APARTMENT_DOCUMENT, {
    action: "move",
    objectId: "living-chicago-sofa",
    position: { x: Number.NaN, z: 8 },
  });
  assert.equal(result.result.error?.code, "invalid");
  assert.equal(result.result.document, DEFAULT_APARTMENT_DOCUMENT);

  const malformed = executePlannerAiRequest(DEFAULT_APARTMENT_DOCUMENT, { action: "material", objectId: "living-chicago-sofa", materialId: undefined } as never);
  assert.equal(malformed.result.error?.code, "invalid");
});
