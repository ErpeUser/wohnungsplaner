"use client";

import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { placementPolygon } from "../domain/geometry.ts";
import type { SnapGuide } from "../domain/snapping.ts";
import type { PlannerDocumentV3, PlannerViewPreferences } from "../domain/types.ts";
import { ArchitectureLayer } from "./architecture-layer.tsx";
import { FurnitureLayer } from "./furniture-layer.tsx";
import { OverlayLayer } from "./overlay-layer.tsx";
import {
  createPlanScene,
  fitPlanViewport,
  planViewportZoomPercent,
  resizePlanViewport,
  wheelZoomFactor,
  zoomPlanViewportAtCenter,
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
const PLAN_CONTROL_INSET = 82;

function fitCanvasViewport(scene: Pick<ReturnType<typeof createPlanScene>, "bounds">, size: typeof INITIAL_SIZE) {
  return fitPlanViewport(scene, {
    ...size,
    topInset: PLAN_CONTROL_INSET,
    bottomInset: PLAN_CONTROL_INSET,
  });
}

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
  const sceneRef = useRef(scene);
  const sizeRef = useRef(INITIAL_SIZE);
  const [viewport, setViewport] = useState<PlanViewport>(() => fitCanvasViewport(scene, INITIAL_SIZE));
  const doors = useMemo(() => scene.openings.filter((opening) => opening.kind === "door"), [scene.openings]);
  const [doorControlId, setDoorControlId] = useState("");
  const controlledDoor = doors.find((door) => door.id === doorControlId) ?? doors[0];
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);
  useEffect(() => {
    setViewport(fitCanvasViewport(sceneRef.current, sizeRef.current));
  }, [activeRoomId]);
  useEffect(() => {
    Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(420, Math.round(entry.contentRect.height));
      const nextSize = { width, height };
      const previousSize = sizeRef.current;
      if (previousSize.width === width && previousSize.height === height) return;
      sizeRef.current = nextSize;
      setViewport((current) => resizePlanViewport(current, previousSize, nextSize, sceneRef.current, {
        topInset: PLAN_CONTROL_INSET,
        bottomInset: PLAN_CONTROL_INSET,
      }));
      setSize(nextSize);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="planner-plan-canvas" data-testid="plan-stage" data-planner-editor="2d" tabIndex={0}>
      <div className="planner-plan-canvas__controls" aria-label="Planansicht steuern">
        <button
          type="button"
          aria-label="Verkleinern"
          disabled={viewport.scale <= viewport.minScale}
          onClick={() => setViewport((current) => zoomPlanViewportAtCenter(current, size, 1 / 1.2))}
        >
          −
        </button>
        <span aria-label="Zoomstufe" aria-live="polite">{planViewportZoomPercent(viewport)} %</span>
        <button
          type="button"
          aria-label="Vergrößern"
          disabled={viewport.scale >= viewport.maxScale}
          onClick={() => setViewport((current) => zoomPlanViewportAtCenter(current, size, 1.2))}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Ansicht zurücksetzen"
          onClick={() => setViewport(fitCanvasViewport(scene, size))}
        >
          Alles anzeigen
        </button>
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
        Grundriss mit {scene.rooms.length} {scene.rooms.length === 1 ? "Bereich" : "Bereichen"}, {scene.openings.length} Öffnungen und {scene.builtIns.length} festen Einbauten.
      </p>
      <div className="planner-visually-hidden" aria-label="Planobjekte als Liste">
        <ul>
          {scene.rooms.map((room) => <li key={room.id}>{room.name}, {Math.round(room.area * 100) / 100} m²</li>)}
          {document.placements.filter((item) => !activeRoomId || item.roomId === activeRoomId).map((item) => (
            <li key={item.id}><button type="button" onClick={() => onSelect(item.id)}>{getFurnitureCatalogItem(item.catalogId)?.name ?? item.catalogId}</button></li>
          ))}
          {scene.builtIns.map((item) => (
            <li key={item.id}><button type="button" onClick={() => onSelect(item.id)}>{item.label} (fix)</button></li>
          ))}
        </ul>
      </div>
      <InteractivePlanStage
        key={activeRoomId ?? "all"}
        scene={scene}
        size={size}
        viewport={viewport}
        setViewport={setViewport}
        document={document}
        activeRoomId={activeRoomId}
        selectionId={selectionId}
        onSelect={onSelect}
        onMove={onMove}
        onResize={onResize}
        onRotate={onRotate}
        onToggleDoor={onToggleDoor}
        onStageChange={onStageChange}
      />
    </div>
  );
}

type InteractivePlanStageProps = {
  scene: ReturnType<typeof createPlanScene>;
  size: typeof INITIAL_SIZE;
  viewport: PlanViewport;
  setViewport: React.Dispatch<React.SetStateAction<PlanViewport>>;
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect: PlanCanvasProps["onSelect"];
  onMove: PlanCanvasProps["onMove"];
  onResize: PlanCanvasProps["onResize"];
  onRotate: PlanCanvasProps["onRotate"];
  onToggleDoor: PlanCanvasProps["onToggleDoor"];
  onStageChange: PlanCanvasProps["onStageChange"];
};

function InteractivePlanStage({
  scene,
  size,
  viewport,
  setViewport,
  document,
  activeRoomId,
  selectionId,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onToggleDoor,
  onStageChange,
}: InteractivePlanStageProps) {
  // Keep the first client render identical to the server render. Initializing
  // from `window` made SSR return the empty form while the browser immediately
  // returned the interactive stage, triggering React hydration recovery.
  const [clientReady, setClientReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
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
    setClientReady(true);
    setLayersReady(true);
  }, []);

  useEffect(() => {
    if (!layersReady) return;
    let frame = 0;
    let attempts = 0;
    const inspect = () => {
      const ready = (stageRef.current?.getLayers().length ?? 0) > 0;
      setCanvasReady(ready);
      if (!ready && attempts++ < 4) frame = window.requestAnimationFrame(inspect);
    };
    frame = window.requestAnimationFrame(inspect);
    return () => window.cancelAnimationFrame(frame);
  }, [layersReady, scene]);

  useEffect(() => {
    onStageChange?.(stageRef.current);
    return () => onStageChange?.(null);
  }, [onStageChange]);
  if (!clientReady) return <form noValidate aria-hidden="true" />;

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} style={{ position: "relative", width: size.width, height: size.height }}>
      {!canvasReady ? (
        <PlanSvgFallback
          scene={scene}
          size={size}
          viewport={viewport}
          setViewport={setViewport}
          document={document}
          activeRoomId={activeRoomId}
          selectionId={selectionId}
          onSelect={onSelect}
          onToggleDoor={onToggleDoor}
        />
      ) : null}
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
            wheelZoomFactor(event.evt.deltaY, event.evt.deltaMode),
          ));
        }}
      >
        {layersReady ? (
          <>
            <ArchitectureLayer scene={scene} onToggleDoor={onToggleDoor} onSelect={onSelect} />
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
          </>
        ) : null}
      </Stage>
      {previewMessage || previewGuides.length ? (
        <p className="planner-plan-canvas__drag-status" role="status" aria-live="polite">
          {previewMessage ?? "Ausrichtung eingerastet"}
        </p>
      ) : null}
    </form>
  );
}

function PlanSvgFallback({
  scene,
  size,
  viewport,
  setViewport,
  document,
  activeRoomId,
  selectionId,
  onSelect,
  onToggleDoor,
}: {
  scene: ReturnType<typeof createPlanScene>;
  size: typeof INITIAL_SIZE;
  viewport: PlanViewport;
  setViewport: React.Dispatch<React.SetStateAction<PlanViewport>>;
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect: PlanCanvasProps["onSelect"];
  onToggleDoor: PlanCanvasProps["onToggleDoor"];
}) {
  const placements = document.placements.filter((item) => !activeRoomId || item.roomId === activeRoomId);
  const points = (values: { x: number; z: number }[]) => values.map((point) => `${point.x},${point.z}`).join(" ");
  const floorColor = (material: string) => material.includes("porcelain")
    ? "#c8c1b5"
    : material.includes("balcony")
      ? "#c6b386"
      : "#c79769";

  return (
    <svg
      aria-label="Maßstäblicher 2D-Grundriss"
      viewBox={`0 0 ${size.width} ${size.height}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      onClick={() => onSelect(null)}
      onWheel={(event) => {
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        setViewport((current) => zoomPlanViewportAtPoint(
          current,
          { x: event.clientX - bounds.left, z: event.clientY - bounds.top },
          wheelZoomFactor(event.deltaY, event.deltaMode),
        ));
      }}
    >
      <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
      {scene.rooms.map((room) => (
        <polygon key={room.id} points={points(room.points)} fill={floorColor(room.floorMaterialId)} stroke="#837b70" strokeWidth="0.025" />
      ))}
      {scene.walls.map((wall) => (
        <line key={wall.id} x1={wall.start.x} y1={wall.start.z} x2={wall.end.x} y2={wall.end.z} stroke="#1f3033" strokeWidth={wall.thickness} strokeLinecap="square" />
      ))}
      {scene.builtIns.map((item) => (
        <polygon key={item.id} points={points(item.points)} fill="#e8e3da" stroke="#596466" strokeWidth="0.025" />
      ))}
      {placements.map((item) => (
        <polygon
          key={item.id}
          points={points(placementPolygon(item))}
          fill={item.id === selectionId ? "#d9a36d" : "#f1ece3"}
          stroke={item.id === selectionId ? "#b75f24" : "#596466"}
          strokeWidth={item.id === selectionId ? 0.045 : 0.025}
          strokeDasharray={item.metadata?.confidence === "estimated" || item.metadata?.confidence === "legacy" ? "0.08 0.05" : undefined}
          data-source={item.metadata?.source}
          data-confidence={item.metadata?.confidence}
          aria-label={`${getFurnitureCatalogItem(item.catalogId)?.name ?? item.catalogId}${item.metadata?.confidence === "estimated" ? " (Schätzung)" : ""}`}
          onClick={(event) => { event.stopPropagation(); onSelect(item.id); }}
        />
      ))}
      {scene.openings.map((opening) => (
        <line
          key={opening.id}
          x1={opening.start.x}
          y1={opening.start.z}
          x2={opening.end.x}
          y2={opening.end.z}
          stroke={opening.kind === "window" ? "#8db4bd" : "#fffdf9"}
          strokeWidth={opening.kind === "window" ? 0.09 : 0.12}
          onClick={(event) => { event.stopPropagation(); if (opening.kind === "door") onToggleDoor(opening.id); }}
        />
      ))}
      {scene.rooms.map((room) => {
        const center = room.points.reduce((sum, point) => ({ x: sum.x + point.x / room.points.length, z: sum.z + point.z / room.points.length }), { x: 0, z: 0 });
        return <text key={`${room.id}-label`} x={center.x} y={center.z} textAnchor="middle" fontSize="0.13" fill="#344447">{room.name} · {room.area.toFixed(2).replace(".", ",")} m²</text>;
      })}
      </g>
    </svg>
  );
}
