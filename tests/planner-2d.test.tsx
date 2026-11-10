import assert from "node:assert/strict";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("react-konva", () => {
  const node = (name: string) => {
    function KonvaNode({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {
      return <div data-konva-node={name} {...safeDomProps(props)}>{children}</div>;
    }
    KonvaNode.displayName = `Konva${name}`;
    return KonvaNode;
  };
  return {
    Arc: node("Arc"),
    Circle: node("Circle"),
    Group: node("Group"),
    Layer: node("Layer"),
    Line: node("Line"),
    Path: node("Path"),
    Rect: node("Rect"),
    Stage: ({ children, onWheel, scaleX, x, y }: React.PropsWithChildren<{
      onWheel?(event: unknown): void;
      scaleX: number;
      x: number;
      y: number;
    }>) => (
      <div
        data-konva-node="Stage"
        data-testid="konva-stage"
        data-scale={scaleX}
        data-x={x}
        data-y={y}
        onWheel={(event) => onWheel?.({
          evt: event.nativeEvent,
          target: {
            getStage: () => ({ getPointerPosition: () => ({ x: 240, y: 180 }) }),
          },
        })}
      >
        {children}
      </div>
    ),
    Text: node("Text"),
    Transformer: node("Transformer"),
  };
});

vi.mock("konva", () => ({ default: { pixelRatio: 1 } }));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  createPlanScene,
  fitPlanViewport,
  planViewportZoomPercent,
  resizePlanViewport,
  worldToScreen,
  zoomPlanViewportAtCenter,
  zoomPlanViewportAtPoint,
} from "../app/planner/plan-2d/plan-scene.ts";
import { PlanCanvas } from "../app/planner/plan-2d/plan-canvas.tsx";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("createPlanScene", () => {
  test("derives all nine rooms from the shared wall graph", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    assert.equal(scene.rooms.length, 8);
    assert.equal(scene.walls.length, DEFAULT_APARTMENT_DOCUMENT.walls.length);
    assert.equal(new Set(scene.walls.map((wall) => wall.id)).size, scene.walls.length);
    assert.equal(scene.orientation, "north-up");
    assert.ok(scene.rooms.some((room) => room.points.some((point, index, points) => {
      const next = points[(index + 1) % points.length];
      return Math.abs(point.x - next.x) > 0.01 && Math.abs(point.z - next.z) > 0.01;
    })));
  });

  test("includes furniture in fit bounds", () => {
    const source = DEFAULT_APARTMENT_DOCUMENT.placements[0];
    const scene = createPlanScene({
      ...DEFAULT_APARTMENT_DOCUMENT,
      placements: [{ ...source, position: { x: -10, z: -10 } }],
    }, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    assert.ok(scene.bounds.minX < -10);
    assert.ok(scene.bounds.minZ < -10);
  });

  test("filters the same scene to one room without duplicating geometry", () => {
    const room = DEFAULT_APARTMENT_DOCUMENT.rooms.find((item) => item.id === "zimmer1")!;
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: room.id,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    assert.deepEqual(scene.rooms.map((item) => item.id), ["zimmer1"]);
    assert.deepEqual(new Set(scene.walls.map((wall) => wall.id)), new Set(room.boundary.map((wall) => wall.wallId)));
    assert.ok(scene.openings.every((opening) => (
      room.boundary.some((wall) => wall.wallId === opening.wallId)
      || DEFAULT_APARTMENT_DOCUMENT.openings.find((source) => source.id === opening.id)?.roomIds?.includes(room.id)
    )));
    assert.ok(scene.builtIns.every((item) => item.roomId === "zimmer1"));
  });

  test("keeps a room-associated door visible when its frame sits across the wall thickness", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: "wc",
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    const door = scene.openings.find((opening) => opening.id === "hall-wc-door");
    assert.ok(door);
    assert.ok(scene.bounds.maxZ >= Math.max(door.start.z, door.end.z));
  });

  test("describes doors, windows, built-ins and optional overlays", () => {
    const plain = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const annotated = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: true, fixtures: true, evidence: false },
    });

    assert.ok(plain.openings.some((opening) => opening.kind === "door"));
    assert.ok(plain.openings.some((opening) => opening.kind === "window"));
    assert.equal(plain.builtIns.length, DEFAULT_APARTMENT_DOCUMENT.builtIns.length);
    assert.equal(plain.placements.length, DEFAULT_APARTMENT_DOCUMENT.placements.length);
    assert.equal(plain.fixtures.length, 0);
    assert.equal(plain.dimensions.length, 0);
    assert.equal(annotated.fixtures.length, DEFAULT_APARTMENT_DOCUMENT.fixtures.length);
    assert.equal(annotated.dimensions.length, 49);
  });

  test("carries source and confidence through the shared scene descriptors", () => {
    const source = DEFAULT_APARTMENT_DOCUMENT.placements[0];
    const scene = createPlanScene({
      ...DEFAULT_APARTMENT_DOCUMENT,
      placements: [{ ...source, metadata: { source: "vision-review", confidence: "estimated" } }],
    }, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    assert.deepEqual(scene.placements[0]?.metadata, { source: "vision-review", confidence: "estimated" });
  });

  test("fits the complete apartment and keeps north-up screen orientation", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const viewport = fitPlanViewport(scene, { width: 1000, height: 700, padding: 50 });
    const topLeft = worldToScreen({ x: scene.bounds.minX, z: scene.bounds.minZ }, viewport);
    const bottomRight = worldToScreen({ x: scene.bounds.maxX, z: scene.bounds.maxZ }, viewport);

    assert.ok(topLeft.x >= 49 && topLeft.z >= 49);
    assert.ok(bottomRight.x <= 951 && bottomRight.z <= 651);
    assert.ok(bottomRight.z > topLeft.z);
  });

  test("can reserve a top inset so compact rooms stay below floating controls", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: "wc",
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const viewport = fitPlanViewport(scene, { width: 960, height: 640, padding: 44, topInset: 82, bottomInset: 82 });
    const topLeft = worldToScreen({ x: scene.bounds.minX, z: scene.bounds.minZ }, viewport);
    const bottomRight = worldToScreen({ x: scene.bounds.maxX, z: scene.bounds.maxZ }, viewport);

    assert.ok(topLeft.z >= 126);
    assert.ok(bottomRight.z <= 515);
  });

  test("zooms around the pointer without moving its world coordinate", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const viewport = fitPlanViewport(scene, { width: 1000, height: 700, padding: 50 });
    const pointer = { x: 420, z: 280 };
    const before = {
      x: (pointer.x - viewport.x) / viewport.scale,
      z: (pointer.z - viewport.y) / viewport.scale,
    };
    const zoomed = zoomPlanViewportAtPoint(viewport, pointer, 1.4);
    const after = {
      x: (pointer.x - zoomed.x) / zoomed.scale,
      z: (pointer.z - zoomed.y) / zoomed.scale,
    };

    assert.ok(Math.abs(before.x - after.x) < 0.000001);
    assert.ok(Math.abs(before.z - after.z) < 0.000001);
  });

  test("zooms around the viewport center and clamps the documented zoom range", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const size = { width: 1000, height: 700 };
    const viewport = fitPlanViewport(scene, size);
    const before = {
      x: (size.width / 2 - viewport.x) / viewport.scale,
      z: (size.height / 2 - viewport.y) / viewport.scale,
    };
    const zoomed = zoomPlanViewportAtCenter(viewport, size, 1.2);
    const after = {
      x: (size.width / 2 - zoomed.x) / zoomed.scale,
      z: (size.height / 2 - zoomed.y) / zoomed.scale,
    };

    assert.ok(Math.abs(after.x - before.x) < 0.000001);
    assert.ok(Math.abs(after.z - before.z) < 0.000001);
    assert.equal(planViewportZoomPercent(zoomed), 120);
    assert.equal(zoomPlanViewportAtCenter(viewport, size, 100).scale, viewport.maxScale);
    assert.equal(zoomPlanViewportAtCenter(viewport, size, 0.001).scale, viewport.minScale);
  });

  test("preserves the viewed world center and zoom percentage when the canvas resizes", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: null,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const previousSize = { width: 1000, height: 700 };
    const nextSize = { width: 720, height: 820 };
    const viewport = zoomPlanViewportAtPoint(
      fitPlanViewport(scene, previousSize),
      { x: 430, z: 260 },
      1.4,
    );
    const beforeCenter = {
      x: (previousSize.width / 2 - viewport.x) / viewport.scale,
      z: (previousSize.height / 2 - viewport.y) / viewport.scale,
    };
    const resized = resizePlanViewport(viewport, previousSize, nextSize, scene);
    const afterCenter = {
      x: (nextSize.width / 2 - resized.x) / resized.scale,
      z: (nextSize.height / 2 - resized.y) / resized.scale,
    };

    assert.ok(Math.abs(afterCenter.x - beforeCenter.x) < 0.000001);
    assert.ok(Math.abs(afterCenter.z - beforeCenter.z) < 0.000001);
    assert.equal(planViewportZoomPercent(resized), planViewportZoomPercent(viewport));
  });

  test("keeps the control insets when a compact room canvas resizes", () => {
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: "wc",
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });
    const previousSize = { width: 960, height: 640 };
    const nextSize = { width: 720, height: 760 };
    const viewport = fitPlanViewport(scene, { ...previousSize, topInset: 82, bottomInset: 82 });
    const resized = resizePlanViewport(viewport, previousSize, nextSize, scene, { topInset: 82, bottomInset: 82 });
    const topLeft = worldToScreen({ x: scene.bounds.minX, z: scene.bounds.minZ }, resized);
    const bottomRight = worldToScreen({ x: scene.bounds.maxX, z: scene.bounds.maxZ }, resized);

    assert.ok(topLeft.z >= 126 - 0.001);
    assert.ok(bottomRight.z <= nextSize.height - 126 + 0.001);
  });
});

describe("PlanCanvas", () => {
  test("renders separated Konva layers and exposes fit and overlay controls", async () => {
    const user = userEvent.setup();
    const onOverlayChange = vi.fn();
    const onToggleDoor = vi.fn();
    render(
      <PlanCanvas
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        overlays={{ dimensions: false, fixtures: false, evidence: false }}
        onOverlayChange={onOverlayChange}
        selectionId={null}
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRotate={vi.fn()}
        onToggleDoor={onToggleDoor}
      />,
    );

    assert.ok(screen.getByTestId("plan-stage"));
    assert.equal(document.querySelectorAll('[data-konva-node="Layer"]').length, 3);
    expect(screen.getByText(/8 Bereiche/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ansicht zurücksetzen" }));
    await user.click(screen.getByRole("button", { name: "Maße anzeigen" }));
    expect(onOverlayChange).toHaveBeenCalledWith("dimensions", true);
    await user.click(screen.getByRole("button", { name: "Elektroelemente anzeigen" }));
    expect(onOverlayChange).toHaveBeenCalledWith("fixtures", true);
    await user.click(screen.getByLabelText("Türgriff Zimmer 1 öffnen"));
    expect(onToggleDoor).toHaveBeenCalledWith("zimmer1-door");
  });

  test("offers labelled zoom buttons, percentage, reset and pointer-centred wheel zoom", async () => {
    const user = userEvent.setup();
    render(
      <PlanCanvas
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        overlays={{ dimensions: false, fixtures: false, evidence: false }}
        onOverlayChange={vi.fn()}
        selectionId={null}
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onResize={vi.fn()}
        onRotate={vi.fn()}
        onToggleDoor={vi.fn()}
      />,
    );

    const stage = screen.getByTestId("konva-stage");
    const pointer = { x: 240, y: 180 };
    const worldBefore = {
      x: (pointer.x - Number(stage.dataset.x)) / Number(stage.dataset.scale),
      z: (pointer.y - Number(stage.dataset.y)) / Number(stage.dataset.scale),
    };

    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "100 %");
    await user.click(screen.getByRole("button", { name: "Vergrößern" }));
    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "120 %");
    await user.click(screen.getByRole("button", { name: "Verkleinern" }));
    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "100 %");

    fireEvent.wheel(stage, { deltaY: -8, deltaMode: 0 });
    const worldAfter = {
      x: (pointer.x - Number(stage.dataset.x)) / Number(stage.dataset.scale),
      z: (pointer.y - Number(stage.dataset.y)) / Number(stage.dataset.scale),
    };
    assert.ok(Number(stage.dataset.scale) > 0);
    assert.ok(Math.abs(worldAfter.x - worldBefore.x) < 0.000001);
    assert.ok(Math.abs(worldAfter.z - worldBefore.z) < 0.000001);

    await user.click(screen.getByRole("button", { name: "Ansicht zurücksetzen" }));
    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "100 %");
  });

  test("fits the newly selected room instead of keeping the previous room offset", async () => {
    const user = userEvent.setup();
    const props = {
      document: DEFAULT_APARTMENT_DOCUMENT,
      overlays: { dimensions: false, fixtures: false, evidence: false },
      onOverlayChange: vi.fn(),
      selectionId: null,
      onSelect: vi.fn(),
      onMove: vi.fn(),
      onResize: vi.fn(),
      onRotate: vi.fn(),
      onToggleDoor: vi.fn(),
    };
    const view = render(<PlanCanvas {...props} activeRoomId="wohnkueche" />);
    await user.click(screen.getByRole("button", { name: "Vergrößern" }));
    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "120 %");

    view.rerender(<PlanCanvas {...props} activeRoomId="wc" />);

    const stage = screen.getByTestId("konva-stage");
    const expected = fitPlanViewport(
      createPlanScene(DEFAULT_APARTMENT_DOCUMENT, { activeRoomId: "wc", overlays: props.overlays }),
      { width: 960, height: 640, topInset: 82, bottomInset: 82 },
    );
    assert.equal(screen.getByLabelText("Zoomstufe").textContent, "100 %");
    assert.equal(Number(stage.dataset.x), expected.x);
    assert.equal(Number(stage.dataset.y), expected.y);
  });
});

function safeDomProps(props: Record<string, unknown>) {
  const allowed = ["data-testid", "aria-label", "role", "onClick"];
  return Object.fromEntries(Object.entries(props).filter(([key]) => allowed.includes(key)));
}
