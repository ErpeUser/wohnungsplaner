"use client";

import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { SnapGuide } from "../domain/snapping.ts";
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
  onToggleDoor(openingId: string): void;
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
  onToggleDoor,
  onStageChange,
}: PlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(INITIAL_SIZE);
  const scene = useMemo(
    () => createPlanScene(document, { activeRoomId, overlays }),
    [activeRoomId, document, overlays],
  );
  const doors = useMemo(() => scene.openings.filter((opening) => opening.kind === "door"), [scene.openings]);
  const [doorControlId, setDoorControlId] = useState("");
  const controlledDoor = doors.find((door) => door.id === doorControlId) ?? doors[0];
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
        <label className="planner-plan-canvas__object-select">
          <span>Planobjekt</span>
          <select
            aria-label="Planobjekt auswählen"
            value={selectionId ?? ""}
            onChange={(event) => onSelect(event.currentTarget.value || null)}
          >
            <option value="">Kein Objekt gewählt</option>
            {document.placements
              .filter((item) => !activeRoomId || item.roomId === activeRoomId)
              .map((item) => <option key={item.id} value={item.id}>{getFurnitureCatalogItem(item.catalogId)?.name ?? item.catalogId}</option>)}
            {document.builtIns
              .filter((item) => !activeRoomId || item.roomId === activeRoomId)
              .map((item) => <option key={item.id} value={item.id}>{item.label} (fix)</option>)}
          </select>
        </label>
        {controlledDoor ? (
          <label className="planner-plan-canvas__object-select">
            <span>Tür</span>
            <select aria-label="Tür auswählen" value={controlledDoor.id} onChange={(event) => setDoorControlId(event.currentTarget.value)}>
              {doors.map((door) => <option key={door.id} value={door.id}>{door.label}</option>)}
            </select>
          </label>
        ) : null}
        {controlledDoor ? (
          <button
            type="button"
            aria-label={`${controlledDoor.label} ${controlledDoor.state === "open" ? "schließen" : "öffnen"}`}
            onClick={() => onToggleDoor(controlledDoor.id)}
          >
            {controlledDoor.state === "open" ? "Tür schließen" : "Tür öffnen"}
          </button>
        ) : null}
      </div>
      <p className="planner-visually-hidden">
        Grundriss mit {scene.rooms.length} {scene.rooms.length === 1 ? "Raum" : "Räumen"}, {scene.openings.length} Öffnungen und {scene.builtIns.length} festen Einbauten.
      </p>
      <InteractivePlanStage
        key={`${activeRoomId ?? "all"}:${size.width}x${size.height}`}
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
  const [previewGuides, setPreviewGuides] = useState<SnapGuide[]>([]);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const displayScene = useMemo(() => ({
    ...scene,
    guides: previewGuides
      .filter((guide) => guide.kind !== "grid")
      .map((guide, index) => ({ id: `drag-guide-${index}`, axis: guide.axis, value: guide.value })),
  }), [previewGuides, scene]);

  useEffect(() => {
    onStageChange?.(stageRef.current);
    return () => onStageChange?.(null);
  }, [onStageChange]);

  return (
    <form
      id="planner-fit-view"
      noValidate
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
          onPreview={(guides, message) => {
            setPreviewGuides(guides);
            setPreviewMessage(message);
          }}
        />
        <OverlayLayer scene={displayScene} />
      </Stage>
      {previewMessage || previewGuides.length ? (
        <p className="planner-plan-canvas__drag-status" role="status" aria-live="polite">
          {previewMessage ?? "Ausrichtung eingerastet"}
        </p>
      ) : null}
    </form>
  );
}
