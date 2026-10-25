"use client";

import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";

import type { PlannerDocumentV3, PlannerViewPreferences } from "../domain/types.ts";
import { ArchitectureLayer } from "./architecture-layer.tsx";
import { FurnitureLayer } from "./furniture-layer.tsx";
import { OverlayLayer } from "./overlay-layer.tsx";
import {
  createPlanScene,
  fitPlanViewport,
  zoomPlanViewportAtPoint,
  type PlanViewport,
} from "./plan-scene.ts";

type PlanCanvasProps = {
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  overlays: PlannerViewPreferences["overlays"];
  onOverlayChange(overlay: keyof PlannerViewPreferences["overlays"], visible: boolean): void;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onMove: React.ComponentProps<typeof FurnitureLayer>["onMove"];
  onResize: React.ComponentProps<typeof FurnitureLayer>["onResize"];
  onRotate: React.ComponentProps<typeof FurnitureLayer>["onRotate"];
  onStageChange?(stage: Konva.Stage | null): void;
};

const INITIAL_SIZE = { width: 960, height: 640 };

export function PlanCanvas({
  document,
  activeRoomId,
  overlays,
  onOverlayChange,
  selectionId,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onStageChange,
}: PlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(INITIAL_SIZE);
  const scene = useMemo(
    () => createPlanScene(document, { activeRoomId, overlays }),
    [activeRoomId, document, overlays],
  );
  useEffect(() => {
    Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(420, Math.round(entry.contentRect.height));
      setSize((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="planner-plan-canvas" data-testid="plan-stage">
      <div className="planner-plan-canvas__controls" aria-label="Planansicht steuern">
        <button type="submit" form="planner-fit-view">Alles anzeigen</button>
        <button
          type="button"
          aria-pressed={overlays.dimensions}
          aria-label={overlays.dimensions ? "Maße ausblenden" : "Maße anzeigen"}
          onClick={() => onOverlayChange("dimensions", !overlays.dimensions)}
        >
          Maße
        </button>
        <button
          type="button"
          aria-pressed={overlays.fixtures}
          aria-label={overlays.fixtures ? "Elektroelemente ausblenden" : "Elektroelemente anzeigen"}
          onClick={() => onOverlayChange("fixtures", !overlays.fixtures)}
        >
          Elektro
        </button>
      </div>
      <p className="planner-visually-hidden">
        Grundriss mit {scene.rooms.length} {scene.rooms.length === 1 ? "Raum" : "Räumen"}, {scene.openings.length} Öffnungen und {scene.builtIns.length} festen Einbauten.
      </p>
      <InteractivePlanStage
        key={`${activeRoomId ?? "all"}:${document.updatedAt}:${size.width}x${size.height}`}
        scene={scene}
        size={size}
        document={document}
        activeRoomId={activeRoomId}
        selectionId={selectionId}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onRotate={onRotate}
        onStageChange={onStageChange}
      />
    </div>
  );
}

type InteractivePlanStageProps = {
  scene: ReturnType<typeof createPlanScene>;
  size: typeof INITIAL_SIZE;
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect: PlanCanvasProps["onSelect"];
  onMove: PlanCanvasProps["onMove"];
  onResize: PlanCanvasProps["onResize"];
  onRotate: PlanCanvasProps["onRotate"];
  onStageChange: PlanCanvasProps["onStageChange"];
};

function InteractivePlanStage({
  scene,
  size,
  document,
  activeRoomId,
  selectionId,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onStageChange,
}: InteractivePlanStageProps) {
  const [viewport, setViewport] = useState<PlanViewport>(() => fitPlanViewport(scene, size));
  const stageRef = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    onStageChange?.(stageRef.current);
    return () => onStageChange?.(null);
  }, [onStageChange]);

  return (
    <form
      id="planner-fit-view"
      onSubmit={(event) => {
        event.preventDefault();
        setViewport(fitPlanViewport(scene, size));
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onSelect(null);
        }}
        onDragEnd={(event) => setViewport((current) => ({
          ...current,
          x: event.currentTarget.x(),
          y: event.currentTarget.y(),
        }))}
        onWheel={(event) => {
          event.evt.preventDefault();
          const pointer = event.target.getStage()?.getPointerPosition();
          if (!pointer) return;
          setViewport((current) => zoomPlanViewportAtPoint(
            current,
            { x: pointer.x, z: pointer.y },
            event.evt.deltaY > 0 ? 1 / 1.12 : 1.12,
          ));
        }}
      >
        <ArchitectureLayer scene={scene} />
        <FurnitureLayer
          document={document}
          activeRoomId={activeRoomId}
          selectionId={selectionId}
          onSelect={onSelect}
          onMove={onMove}
          onResize={onResize}
          onRotate={onRotate}
        />
        <OverlayLayer scene={scene} />
      </Stage>
    </form>
  );
}
