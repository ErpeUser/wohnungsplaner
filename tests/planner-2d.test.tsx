import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
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
    Rect: node("Rect"),
    Stage: node("Stage"),
    Text: node("Text"),
    Transformer: node("Transformer"),
  };
});

vi.mock("konva", () => ({ default: { pixelRatio: 1 } }));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  createPlanScene,
  fitPlanViewport,
  worldToScreen,
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

    assert.equal(scene.rooms.length, 9);
    assert.equal(scene.walls.length, DEFAULT_APARTMENT_DOCUMENT.walls.length);
    assert.equal(new Set(scene.walls.map((wall) => wall.id)).size, scene.walls.length);
    assert.equal(scene.orientation, "north-up");
    assert.ok(scene.rooms.some((room) => room.points.some((point, index, points) => {
      const next = points[(index + 1) % points.length];
      return Math.abs(point.x - next.x) > 0.01 && Math.abs(point.z - next.z) > 0.01;
    })));
  });

  test("filters the same scene to one room without duplicating geometry", () => {
    const room = DEFAULT_APARTMENT_DOCUMENT.rooms.find((item) => item.id === "zimmer1")!;
    const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
      activeRoomId: room.id,
      overlays: { dimensions: false, fixtures: false, evidence: false },
    });

    assert.deepEqual(scene.rooms.map((item) => item.id), ["zimmer1"]);
    assert.deepEqual(new Set(scene.walls.map((wall) => wall.id)), new Set(room.boundary.map((wall) => wall.wallId)));
    assert.ok(scene.openings.every((opening) => room.boundary.some((wall) => wall.wallId === opening.wallId)));
    assert.ok(scene.builtIns.every((item) => item.roomId === "zimmer1"));
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
    assert.equal(plain.fixtures.length, 0);
    assert.equal(plain.dimensions.length, 0);
    assert.equal(annotated.fixtures.length, DEFAULT_APARTMENT_DOCUMENT.fixtures.length);
    assert.equal(annotated.dimensions.length, DEFAULT_APARTMENT_DOCUMENT.walls.length);
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
});

describe("PlanCanvas", () => {
  test("renders separated Konva layers and exposes fit and overlay controls", async () => {
    const user = userEvent.setup();
    const onOverlayChange = vi.fn();
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
      />,
    );

    assert.ok(screen.getByTestId("plan-stage"));
    assert.equal(document.querySelectorAll('[data-konva-node="Layer"]').length, 3);
    expect(screen.getByText(/9 Räume/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Alles anzeigen" }));
    await user.click(screen.getByRole("button", { name: "Maße anzeigen" }));
    expect(onOverlayChange).toHaveBeenCalledWith("dimensions", true);
    await user.click(screen.getByRole("button", { name: "Elektroelemente anzeigen" }));
    expect(onOverlayChange).toHaveBeenCalledWith("fixtures", true);
  });
});

function safeDomProps(props: Record<string, unknown>) {
  const allowed = ["data-testid", "aria-label", "role"];
  return Object.fromEntries(Object.entries(props).filter(([key]) => allowed.includes(key)));
}
