import assert from "node:assert/strict";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ frameloop, dpr, shadows }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="r3f-canvas" data-frameloop={String(frameloop)} data-dpr={JSON.stringify(dpr)} data-shadows={String(shadows)}>
      <canvas />
    </div>
  ),
}));

vi.mock("../app/planner/scene-3d/architecture.tsx", () => ({
  PlannerArchitecture: () => <div data-testid="mock-3d-architecture" />,
}));

vi.mock("../app/planner/scene-3d/lighting.tsx", () => ({
  PlannerLighting: () => <div data-testid="mock-3d-lighting" />,
}));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { Planner3D } from "../app/planner/scene-3d/planner-3d.tsx";
import { qualitySettings, detectThreeSupport } from "../app/planner/scene-3d/quality.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

describe("createSceneModel", () => {
  test("derives floors and unique wall sources for all nine rooms", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    assert.equal(scene.floors.length, 9);
    assert.equal(scene.walls.length, DEFAULT_APARTMENT_DOCUMENT.walls.length);
    assert.equal(new Set(scene.walls.map((wall) => wall.id)).size, scene.walls.length);
    assert.ok(scene.walls.some((wall) => Math.abs(wall.angle) > 0.01 && Math.abs(wall.angle - Math.PI / 2) > 0.01));
  });

  test("cuts openings into wall segments and keeps current door states", () => {
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      doorStates: { ...DEFAULT_APARTMENT_DOCUMENT.doorStates, "zimmer1-door": "open" as const },
    };
    const scene = createSceneModel(document, "zimmer1");
    const wallWithWindow = scene.walls.find((wall) => wall.openingIds.includes("zimmer1-window"));
    assert.ok(wallWithWindow);
    assert.ok(wallWithWindow.segments.length >= 3);
    assert.equal(scene.doors.find((door) => door.id === "zimmer1-door")?.state, "open");
    assert.equal(scene.floors.length, 1);
  });

  test("includes built-ins and movable furniture without a second document model", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    assert.equal(scene.builtIns.length, DEFAULT_APARTMENT_DOCUMENT.builtIns.length);
    assert.equal(scene.placements.length, DEFAULT_APARTMENT_DOCUMENT.placements.length);
    assert.equal(scene.placements[0].source, DEFAULT_APARTMENT_DOCUMENT.placements[0]);
  });
});

describe("3D quality and resilience", () => {
  test("quality tiers change rendering cost only", () => {
    assert.deepEqual(qualitySettings("low"), { dpr: [1, 1.25], shadows: false, shadowMapSize: 512, effects: false });
    assert.equal(qualitySettings("balanced").shadows, true);
    assert.equal(qualitySettings("high").effects, true);
  });

  test("reports missing WebGL2 support without throwing", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof original;
    expect(detectThreeSupport()).toEqual({ supported: false, webgl2: false, reason: "WebGL 2 ist auf diesem Gerät nicht verfügbar." });
    HTMLCanvasElement.prototype.getContext = original;
  });

  test("uses demand rendering and falls back on context loss", async () => {
    const user = userEvent.setup();
    const onReturn2D = vi.fn();
    const documentBefore = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onReturn2D={onReturn2D}
        quality="balanced"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );

    expect(screen.getByTestId("r3f-canvas").getAttribute("data-frameloop")).toBe("demand");
    fireEvent(screen.getByTestId("r3f-canvas").querySelector("canvas")!, new Event("webglcontextlost", { cancelable: true }));
    assert.match((await screen.findByRole("alert")).textContent ?? "", /3D-Kontext wurde unterbrochen/);
    await user.click(screen.getByRole("button", { name: "Zu 2D" }));
    expect(onReturn2D).toHaveBeenCalledOnce();
    assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), documentBefore);
  });

  test("shows the same stable fallback when WebGL2 is unavailable", async () => {
    const user = userEvent.setup();
    const onReturn2D = vi.fn();
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onReturn2D={onReturn2D}
        quality="low"
        supportOverride={{ supported: false, webgl2: false, reason: "WebGL 2 fehlt." }}
      />,
    );
    assert.match(screen.getByRole("alert").textContent ?? "", /WebGL 2 fehlt/);
    await user.click(screen.getByRole("button", { name: "Zu 2D" }));
    expect(onReturn2D).toHaveBeenCalledOnce();
  });

  test("exposes a visible walk controller without changing planner data", () => {
    const before = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId="wohnkueche"
        selectionId={DEFAULT_APARTMENT_DOCUMENT.placements[0]?.id ?? null}
        cameraMode="walk"
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );
    assert.ok(screen.getByLabelText("Rundgangsteuerung"));
    assert.ok(screen.getByRole("button", { name: "Vorwärts" }));
    assert.ok(screen.getByRole("button", { name: "Start" }));
    assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), before);
  });
});
