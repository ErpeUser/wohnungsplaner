import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-konva", () => {
  const node = (name: string) => {
    function KonvaNode({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
      // Expose the drawing inputs produced by the real component so geometry
      // assertions can inspect its output without requiring a browser canvas.
      const geometry = { points: props.points, radiusX: props.radiusX, radiusY: props.radiusY, strokeWidth: props.strokeWidth };
      return <div data-konva-node={name} data-konva-geometry={JSON.stringify(geometry)} data-object-id={String(props.id ?? "")} data-testid={String(props["data-testid"] ?? "")}>{children}{typeof props.text === "string" ? props.text : null}</div>;
    }
    KonvaNode.displayName = `Konva${name}`;
    return KonvaNode;
  };
  return {
    Circle: node("Circle"),
    Ellipse: node("Ellipse"),
    Group: node("Group"),
    Line: node("Line"),
    Path: node("Path"),
    Layer: node("Layer"),
    Rect: node("Rect"),
    Text: node("Text"),
    Transformer: node("Transformer"),
  };
});

import { FURNITURE_CATALOG, filterFurnitureCatalog } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import { FurnitureLayer } from "../app/planner/plan-2d/furniture-layer.tsx";
import {
  createCatalogPlacement,
  nudgePlacement,
  nudgePlacementResize,
  nudgeRotation,
  resolvePlacementMove,
  resolvePlacementResize,
  resolvePlacementRotation,
} from "../app/planner/plan-2d/use-plan-interactions.ts";
import { CatalogPanel } from "../app/planner/workspace/catalog-panel.tsx";
import { InspectorPanel } from "../app/planner/workspace/inspector-panel.tsx";

describe("furniture catalog", () => {
  test("offers the Bliss bed only in its verified product dimensions and beige upholstery", () => {
    const bed = FURNITURE_CATALOG.find((item) => item.id === "bed-bliss-120");

    assert.ok(bed);
    assert.deepEqual(bed.defaultSize, { width: 1.47, depth: 2.22, height: 1.08 });
    assert.equal(bed.resize, "fixed");
    assert.deepEqual(bed.materials.map((material) => material.id), ["fabric-bliss-beige"]);
  });

  test("builds the photographed five-axis wardrobe with the full mirror exactly centred", async () => {
    const furniture3d = await import("../app/planner/scene-3d/furniture.tsx") as typeof import("../app/planner/scene-3d/furniture.tsx") & {
      getWardrobeFrontLayout?: () => Array<{ kind: string; center: number; width: number }>;
    };
    assert.equal(typeof furniture3d.getWardrobeFrontLayout, "function");

    const modules = furniture3d.getWardrobeFrontLayout!();
    assert.deepEqual(modules.map((module) => module.kind), ["door", "drawers", "mirror", "drawers", "door"]);
    assert.equal(Number(modules.reduce((sum, module) => sum + module.width, 0).toFixed(3)), 1);
    assert.deepEqual(modules.map((module) => module.width), [0.2, 0.2, 0.2, 0.2, 0.2]);
    assert.equal(modules[2].center, 0, "the reference photo shows the mirror on the centre axis");
  });

  test("contains realistic parametric objects across all planned categories", () => {
    assert.ok(FURNITURE_CATALOG.length >= 13);
    assert.deepEqual(
      new Set(FURNITURE_CATALOG.map((item) => item.category)),
      new Set(["Schlafen", "Sitzen", "Arbeiten", "Aufbewahren", "Tische", "Licht/Deko"]),
    );
    assert.ok(FURNITURE_CATALOG.every((item) => item.defaultSize.width > 0 && item.fallback3d));
  });

  test("filters by search and category and inserts into the active room", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<CatalogPanel activeRoomId="zimmer2" onAdd={onAdd} />);

    await user.type(screen.getByRole("searchbox", { name: "Möbel suchen" }), "sofa");
    expect(screen.getByRole("button", { name: /Sofa hinzufügen/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Bett hinzufügen/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Sofa hinzufügen/ }));
    expect(onAdd).toHaveBeenCalledWith("sofa-3seat");

    assert.equal(filterFurnitureCatalog("tisch", "Arbeiten")[0]?.id, "desk-standard");
  });
});

describe("furniture interactions", () => {
  const chair = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-chair")!;

  test("creates a catalog placement with real dimensions and material", () => {
    const item = FURNITURE_CATALOG.find((candidate) => candidate.id === "sofa-3seat")!;
    const placement = createCatalogPlacement(item, "zimmer2", { x: 1.5, z: 10.3 }, "new-sofa");
    assert.equal(placement.id, "new-sofa");
    assert.deepEqual(placement.size, item.defaultSize);
    assert.equal(placement.materialVariants?.main, item.materials[0].id);
  });

  test("snaps drag to 5 cm, while Alt keeps a free position", () => {
    const document = { ...DEFAULT_APARTMENT_DOCUMENT, placements: [chair] };
    const snapped = resolvePlacementMove(document, chair, { x: 2.713, z: 0.937 });
    const free = resolvePlacementMove(document, chair, { x: 2.713, z: 0.937 }, { disableGrid: true });
    assert.deepEqual(snapped.position, { x: 2.72, z: 0.935 });
    assert.deepEqual(free.position, { x: 2.72, z: 0.935 });
    assert.ok(snapped.guides.some((guide) => guide.kind === "object"));
  });

  test("uses real wall and object guides during production placement moves", () => {
    const nearWall = resolvePlacementMove(DEFAULT_APARTMENT_DOCUMENT, chair, { x: 0.32, z: 2 }, { disableGrid: true });
    assert.ok(nearWall.guides.some((guide) => guide.kind === "wall"));

    const other = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id !== chair.id)!;
    const nearObject = resolvePlacementMove(
      DEFAULT_APARTMENT_DOCUMENT,
      chair,
      { x: other.position.x, z: other.position.z },
      { disableGrid: true },
    );
    assert.ok(nearObject.guides.some((guide) => guide.kind === "object"));
  });

  test("transfers the complete placement when its center enters another room", () => {
    const document = { ...DEFAULT_APARTMENT_DOCUMENT, placements: [chair] };
    const result = resolvePlacementMove(document, chair, { x: 1.8, z: 10.4 }, { disableGrid: true });
    assert.equal(result.command.type, "transferPlacement");
    if (result.command.type === "transferPlacement") assert.equal(result.command.roomId, "zimmer2");
  });

  test("supports 1/10 cm keyboard movement, 45 degree/free rotation and allowed resizing", () => {
    assert.deepEqual(nudgePlacement(chair, "ArrowRight", false), { x: 2.97, z: 0.92 });
    assert.deepEqual(nudgePlacement(chair, "ArrowUp", true), { x: 2.96, z: 0.82 });
    assert.equal(nudgeRotation(0, "]", false), 5);
    assert.equal(nudgeRotation(0, "[", true), 315);
    assert.equal(nudgeRotation(0, "ArrowLeft", false), null);
    assert.equal(resolvePlacementRotation(32, false), 45);
    assert.equal(resolvePlacementRotation(32, true), 32);

    const desk = FURNITURE_CATALOG.find((item) => item.id === "desk-standard")!;
    assert.deepEqual(resolvePlacementResize(desk, desk.defaultSize, 1.2, 0.8), {
      ...desk.defaultSize,
      width: Number((desk.defaultSize.width * 1.2).toFixed(3)),
      depth: Number((desk.defaultSize.depth * 0.8).toFixed(3)),
    });
    assert.deepEqual(nudgePlacementResize(desk, chair.size, "ArrowRight", false), {
      ...chair.size,
      width: Number((chair.size.width + 0.01).toFixed(3)),
    });
    assert.deepEqual(nudgePlacementResize(desk, chair.size, "ArrowUp", true), {
      ...chair.size,
      depth: Number((chair.size.depth + 0.1).toFixed(3)),
    });
  });

  test.each([
    ["ArrowLeft", false, 2.19, 0.916],
    ["ArrowDown", false, 2.176, 0.91],
    ["ArrowLeft", true, 2.1, 0.878],
    ["ArrowDown", true, 1.961, 0.82],
    ["ArrowRight", false, 2.21, 0.924],
    ["ArrowUp", false, 2.224, 0.93],
    ["ArrowRight", true, 2.3, 0.962],
    ["ArrowUp", true, 2.439, 1.02],
  ] as const)("uniform keyboard resize %s (large step: %s) changes both footprint axes", (key, largeStep, width, depth) => {
    const sofa = FURNITURE_CATALOG.find((item) => item.id === "sofa-3seat")!;
    // Independently calculated from the 220 × 92 cm footprint, rounded to mm.
    assert.deepEqual(nudgePlacementResize(sofa, sofa.defaultSize, key, largeStep), {
      width, depth, height: 0.82,
    });
    assert.deepEqual(sofa.defaultSize, { width: 2.2, depth: 0.92, height: 0.82 });
  });

  test("keyboard resize preserves the fixed product envelope", () => {
    const kaleo = FURNITURE_CATALOG.find((item) => item.id === "chair-kaleo-chenille-beige")!;
    for (const key of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]) {
      assert.deepEqual(nudgePlacementResize(kaleo, kaleo.defaultSize, key, true), {
        width: 0.63, depth: 0.64, height: 0.87,
      });
    }
  });

  test.each([
    [0.24, 0.1, "ArrowLeft"],
    [0.1, 0.24, "ArrowDown"],
  ] as const)("uniform keyboard resize preserves the ratio at the %s by %s minimum boundary", (width, depth, key) => {
    const sofa = FURNITURE_CATALOG.find((item) => item.id === "sofa-3seat")!;
    const current = { width, depth, height: 0.82 };
    assert.deepEqual(nudgePlacementResize(sofa, current, key, false), current);
  });

  test.each([
    [0.24, 0.12, 0.2, 0.1],
    [0.12, 0.24, 0.1, 0.2],
  ] as const)("uniform transform preserves the %s by %s ratio when a minimum is reached", (width, depth, expectedWidth, expectedDepth) => {
    const sofa = FURNITURE_CATALOG.find((item) => item.id === "sofa-3seat")!;
    assert.deepEqual(resolvePlacementResize(sofa, { width, depth, height: 0.82 }, 0.25, 0.25), {
      width: expectedWidth, depth: expectedDepth, height: 0.82,
    });
  });

  test("renders selectable furniture and a transformer for the selection", () => {
    render(
      <FurnitureLayer
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId="zimmer1"
        selectionId="zimmer1-chair"
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRotate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("furniture-zimmer1-chair")).toBeTruthy();
    assert.equal(document.querySelectorAll('[data-konva-node="Transformer"]').length, 1);
  });

  test("renders individual 2D graphics for every existing product family", () => {
    const wardrobe = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "hall-tejo-wardrobe")!;
    const exampleDocument = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      placements: [...DEFAULT_APARTMENT_DOCUMENT.placements, {
        ...wardrobe, id: "tejo-catalog-example", catalogId: "hallway-tejo-115", materialVariants: { main: "tejo-cashmere" },
      }],
    };
    // Observe the real Image src setter: an unchanged path would reuse the old
    // rug artwork even when the new SVG is present on the server.
    const imageSources = vi.spyOn(HTMLImageElement.prototype, "src", "set");
    try {
      render(
        <FurnitureLayer
          document={exampleDocument}
          activeRoomId={null}
          selectionId={null}
          onSelect={vi.fn()}
          onMove={vi.fn()}
          onResize={vi.fn()}
          onRotate={vi.fn()}
        />,
      );
      for (const id of [
        "plant-zimmer1-olive",
        "bed-bliss-120",
        "hallway-tejo-115",
        "vanity-vicco-sherry-120",
        "chair-temu-executive-ivory",
        "nightstand-led-2drawer-white",
        "rug-living-concept-240x240",
      ]) expect(screen.getByTestId(`plan-graphic-${id}`)).toBeTruthy();
      const rugPath = "/planner-assets/textures/fabric/temu-vintage-rug-607199740937372.svg";
      expect(imageSources.mock.calls.map(([src]) => src).filter((src) => src.startsWith(rugPath))).toEqual([rugPath]);
    } finally { imageSources.mockRestore(); }
  });

  test("renders comparison tables from their current round or oval footprint", () => {
    const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table")!;
    render(
      <FurnitureLayer
        document={{
          ...DEFAULT_APARTMENT_DOCUMENT,
          placements: [{ ...table, catalogId: "dining-table-kaufland-567080013-120-160", size: { width: 1.6, depth: 0.8, height: 0.755 } }],
        }}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRotate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("plan-graphic-table-comparison")).toBeTruthy();
    expect(screen.getByText("160 × 80 cm")).toBeTruthy();
    const graphic = screen.getByTestId("plan-graphic-table-comparison");
    expect(graphic.querySelector('[data-konva-node="Ellipse"]')).toBeTruthy();
    expect(graphic.querySelectorAll('[data-konva-node="Line"]').length).toBe(2);
  });

  test.each([
    ["dining-table-aliexpress-100-140", 1.4, 1],
    ["dining-table-temu-606997-120-160", 1.6, 1.2],
    ["dining-table-kaufland-567080013-120-160", 1.6, 0.8],
  ] as const)("keeps the visible extension seam inside the %s tabletop", (catalogId, width, depth) => {
    const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table")!;
    const { container } = render(<FurnitureLayer
      document={{ ...DEFAULT_APARTMENT_DOCUMENT, placements: [{
        ...table, catalogId, size: { ...table.size, width, depth },
        metadata: { ...table.metadata, notes: ["Zustand extended"] },
      }] }}
      activeRoomId={null}
      selectionId={null}
      onSelect={vi.fn()}
      onMove={vi.fn()}
      onResize={vi.fn()}
      onRotate={vi.fn()}
    />);
    const plate = JSON.parse(container.querySelector('[data-konva-node="Ellipse"]')!.getAttribute("data-konva-geometry")!) as { radiusX: number; radiusY: number };
    const lines = [...container.querySelectorAll('[data-konva-node="Line"]')].map((element) => (
      JSON.parse(element.getAttribute("data-konva-geometry")!) as { points: number[]; strokeWidth: number }
    ));
    const seam = lines.find(({ points }) => points.length === 4 && points[0] === 0 && points[2] === 0);
    assert.ok(seam, "the extended tabletop must show its central joint");
    const halfStroke = seam.strokeWidth / 2;
    const rear = Math.min(seam.points[1], seam.points[3]) - halfStroke;
    const front = Math.max(seam.points[1], seam.points[3]) + halfStroke;
    assert.ok(rear < 0 && front > 0, "joint crosses the plate centre");
    assert.ok(rear >= -plate.radiusY, "joint stroke must not extend beyond the rear plate edge");
    assert.ok(front <= plate.radiusY, "joint stroke must not extend beyond the front plate edge");
    // Conservatively include the full stroke envelope, not just the line ends.
    for (const y of [rear, front]) {
      assert.ok((halfStroke / plate.radiusX) ** 2 + (y / plate.radiusY) ** 2 <= 1,
        "the full central joint must remain inside the oval plate");
    }
  });

  test.each([
    ["rug-temu-easy-line-120x180", "Easy Line · 120 × 180 cm"],
    ["rug-temu-easy-line-140x200", "Easy Line · 140 × 200 cm"],
  ] as const)("labels the %s rug with its actual footprint", (catalogId, label) => {
    const item = FURNITURE_CATALOG.find((candidate) => candidate.id === catalogId)!;
    const rug = createCatalogPlacement(item, "vorraum", { x: -1.29, z: 7.04 }, "labelled-rug");
    render(<FurnitureLayer
      document={{ ...DEFAULT_APARTMENT_DOCUMENT, placements: [rug] }}
      activeRoomId={null}
      selectionId={null}
      onSelect={vi.fn()}
      onMove={vi.fn()}
      onResize={vi.fn()}
      onRotate={vi.fn()}
    />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  test("rejects hard collisions and preserves undo/redo history", () => {
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    const collision = store.getState().dispatch({
      type: "movePlacement",
      placementId: "zimmer1-chair",
      position: DEFAULT_APARTMENT_DOCUMENT.placements[0].position,
    });
    assert.equal(collision.error?.code, "collision");

    store.getState().dispatch({ type: "movePlacement", placementId: "zimmer1-chair", position: { x: 3.15, z: 0.94 } });
    assert.equal(store.getState().canUndo, true);
    store.getState().undo();
    assert.equal(store.getState().document.placements.find((item) => item.id === "zimmer1-chair")?.position.x, 2.96);
    store.getState().redo();
    assert.equal(store.getState().document.placements.find((item) => item.id === "zimmer1-chair")?.position.x, 3.15);
  });

  test("clears a selection when undo removes the selected placement", () => {
    const document = { ...DEFAULT_APARTMENT_DOCUMENT, placements: [] };
    const store = createPlannerStore({ initialDocument: document });
    const item = FURNITURE_CATALOG.find((candidate) => candidate.id === "plant-medium")!;
    const placement = createCatalogPlacement(item, "zimmer2", { x: 1.5, z: 10.45 }, "temporary-plant");

    const result = store.getState().dispatch({ type: "addPlacement", placement });
    assert.equal(result.error, undefined);
    store.getState().select(placement.id);
    store.getState().undo();

    assert.equal(store.getState().selectionId, null);
  });
});

describe("furniture inspector", () => {
  test("offers complete labelled numeric and material alternatives", () => {
    render(
      <InspectorPanel
        document={DEFAULT_APARTMENT_DOCUMENT}
        selectionId="zimmer1-chair"
        dispatch={(command) => applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, command)}
        select={vi.fn()}
      />,
    );
    for (const label of [
      "Position X in Zentimetern",
      "Position Z in Zentimetern",
      "Breite in Zentimetern",
      "Tiefe in Zentimetern",
      "Höhe in Zentimetern",
      "Drehung in Grad",
      "Material",
    ]) expect(screen.getByLabelText(label)).toBeTruthy();
  });

  test("explains that built-ins are locked", () => {
    render(<InspectorPanel document={DEFAULT_APARTMENT_DOCUMENT} selectionId="builtin-kitchen-upper-west-end" dispatch={vi.fn()} select={vi.fn()} />);
    expect(screen.getByText(/gegen Verschieben und Entfernen geschützt/)).toBeTruthy();
  });
});
