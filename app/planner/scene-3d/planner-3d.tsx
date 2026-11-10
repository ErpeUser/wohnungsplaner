"use client";

import { Canvas, useThree, type RootState } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

import type { PlannerDocumentV3, Point2 } from "../domain/types.ts";
import { PlannerArchitecture } from "./architecture.tsx";
import { CameraController, createOrbitPose, dispatchWalkCommand, orbitFovForRoom, type CameraMode } from "./camera-controller.tsx";
import { Furniture3D } from "./furniture.tsx";
import { PlannerLighting } from "./lighting.tsx";
import { PLANNER_TEXTURE_READY_EVENT } from "./materials.ts";
import {
  chooseQualityTier,
  detectThreeSupport,
  qualitySettings,
  type QualityTier,
  type ThreeSupport,
} from "./quality.ts";
import { createSceneModel, derivePerspectiveCutaway, type PerspectiveCutaway } from "./scene-model.ts";

const EMPTY_CUTAWAY: PerspectiveCutaway = {
  hiddenWallIds: [],
  hiddenOpeningIds: [],
  hiddenObjectIds: [],
  hiddenFixtureIds: [],
};

export type Planner3DProps = {
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onReturn2D(): void;
  onToggleDoor?(openingId: string): void;
  cameraMode?: CameraMode;
  quality?: QualityTier;
  supportOverride?: ThreeSupport;
};

export function Planner3D({
  document,
  activeRoomId,
  selectionId,
  onSelect,
  onReturn2D,
  onToggleDoor,
  cameraMode = "orbit",
  quality: qualityOverride,
  supportOverride,
}: Planner3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const support = useMemo(() => supportOverride ?? detectThreeSupport(), [supportOverride]);
  const tier = useMemo(() => qualityOverride ?? chooseQualityTier(), [qualityOverride]);
  const quality = useMemo(() => qualitySettings(tier), [tier]);
  const scene = useMemo(() => createSceneModel(document, activeRoomId), [activeRoomId, document]);
  const orbitPose = useMemo(() => createOrbitPose(scene, activeRoomId), [activeRoomId, scene]);
  const initialOrbitCamera = useMemo<Point2>(() => {
    return {
      x: orbitPose.position[0],
      z: orbitPose.position[2],
    };
  }, [orbitPose]);
  const [orbitCamera, setOrbitCamera] = useState<Point2>(initialOrbitCamera);
  const [automaticCutaway, setAutomaticCutaway] = useState(true);
  const cutawayAvailable = Boolean(activeRoomId) && activeRoomId !== "balkon" && cameraMode === "orbit";
  const cutawayEnabled = cutawayAvailable && automaticCutaway;
  const cutaway = useMemo(
    () => cutawayEnabled ? derivePerspectiveCutaway(scene, orbitCamera, selectionId) : EMPTY_CUTAWAY,
    [cutawayEnabled, orbitCamera, scene, selectionId],
  );
  const updateOrbitCamera = useCallback((next: Point2) => {
    setOrbitCamera((previous) => (
      Math.hypot(next.x - previous.x, next.z - previous.z) < 0.015 ? previous : next
    ));
  }, []);

  useEffect(() => {
    setOrbitCamera(initialOrbitCamera);
  }, [initialOrbitCamera]);

  useEffect(() => {
    const canvas = hostRef.current?.querySelector("canvas");
    if (!canvas) return;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFailure("Der 3D-Kontext wurde unterbrochen. Deine Planung ist unverändert gespeichert.");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => canvas.removeEventListener("webglcontextlost", onContextLost);
  }, [support.supported]);

  if (!support.supported || failure) {
    return (
      <ThreeFallback
        message={failure ?? support.reason ?? "Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar."}
        onReturn2D={onReturn2D}
      />
    );
  }

  return (
    <div ref={hostRef} className="planner-3d" data-quality={tier}>
      <Canvas
        id="planner-3d-canvas"
        frameloop="demand"
        dpr={quality.dpr}
        shadows={quality.shadows ? "soft" : false}
        camera={{
          position: orbitPose.position,
          fov: orbitFovForRoom(activeRoomId),
          near: 0.05,
          far: 80,
        }}
        gl={{ antialias: tier !== "low", alpha: false, powerPreference: "high-performance" }}
        onCreated={configureRenderer}
      >
        <PlannerTextureInvalidator />
        <color attach="background" args={[activeRoomId === "balkon" ? "#dbe9ed" : "#e4e2dc"]} />
        <Suspense fallback={null}>
          <PlannerLighting quality={quality} scene={scene} />
          <PlannerArchitecture
            scene={scene}
            selectionId={selectionId}
            onSelect={onSelect}
            onToggleDoor={onToggleDoor}
            cutaway={cutawayEnabled}
            walkthrough={cameraMode === "walk"}
            hiddenWallIds={cutaway.hiddenWallIds}
            hiddenOpeningIds={cutaway.hiddenOpeningIds}
            hiddenObjectIds={cutaway.hiddenObjectIds}
            hiddenFixtureIds={cutaway.hiddenFixtureIds}
          />
          <Furniture3D
            scene={scene}
            selectionId={selectionId}
            onSelect={onSelect}
            hiddenObjectIds={cutaway.hiddenObjectIds}
          />
        </Suspense>
        <CameraController
          document={document}
          scene={scene}
          mode={cameraMode}
          activeRoomId={activeRoomId}
          reducedMotion={reducedMotion}
          onOrbitCameraChange={updateOrbitCamera}
        />
      </Canvas>
      <CameraOverlay
        mode={cameraMode}
        cutawayAvailable={cutawayAvailable}
        cutawayEnabled={cutawayEnabled}
        onToggleCutaway={() => setAutomaticCutaway((current) => !current)}
      />
      <div className="planner-3d__quality" aria-hidden="true">3D · {tier === "high" ? "Hoch" : tier === "balanced" ? "Ausgewogen" : "Effizient"}</div>
    </div>
  );
}

function PlannerTextureInvalidator() {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const redraw = () => invalidate();
    window.addEventListener(PLANNER_TEXTURE_READY_EVENT, redraw);
    return () => window.removeEventListener(PLANNER_TEXTURE_READY_EVENT, redraw);
  }, [invalidate]);

  return null;
}

function CameraOverlay({
  mode,
  cutawayAvailable,
  cutawayEnabled,
  onToggleCutaway,
}: {
  mode: CameraMode;
  cutawayAvailable: boolean;
  cutawayEnabled: boolean;
  onToggleCutaway(): void;
}) {
  if (mode === "orbit") {
    return (
      <div className="planner-3d__camera planner-3d__camera--orbit" aria-label="3D-Ansicht steuern">
        <button type="button" aria-label="3D verkleinern" onClick={() => dispatchWalkCommand("zoom-out")}>−</button>
        <button type="button" aria-label="3D vergrößern" onClick={() => dispatchWalkCommand("zoom-in")}>+</button>
        <button type="button" aria-label="3D-Ansicht zurücksetzen" onClick={() => dispatchWalkCommand("reset")}>Ansicht zurücksetzen</button>
        {cutawayAvailable ? (
          <button
            type="button"
            aria-label={cutawayEnabled ? "Automatischen Wandschnitt ausschalten" : "Automatischen Wandschnitt einschalten"}
            aria-pressed={cutawayEnabled}
            onClick={onToggleCutaway}
          >
            {cutawayEnabled ? "Schnitt · Auto" : "Alle Wände"}
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="planner-3d__camera" aria-label="Rundgangsteuerung">
      <span>Klicken zum Umsehen · WASD zum Gehen · +/− zum Zoomen</span>
      <div>
        <button type="button" aria-label="Vorwärts" onClick={() => dispatchWalkCommand("forward")}>↑</button>
        <button type="button" aria-label="Links" onClick={() => dispatchWalkCommand("left")}>←</button>
        <button type="button" aria-label="Zurück" onClick={() => dispatchWalkCommand("back")}>↓</button>
        <button type="button" aria-label="Rechts" onClick={() => dispatchWalkCommand("right")}>→</button>
        <button type="button" aria-label="3D verkleinern" onClick={() => dispatchWalkCommand("zoom-out")}>−</button>
        <button type="button" aria-label="3D vergrößern" onClick={() => dispatchWalkCommand("zoom-in")}>+</button>
        <button type="button" onClick={() => dispatchWalkCommand("reset")}>Start</button>
      </div>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function configureRenderer({ gl }: RootState) {
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.16;
  gl.shadowMap.autoUpdate = true;
}

function ThreeFallback({ message, onReturn2D }: { message: string; onReturn2D(): void }) {
  return (
    <div className="planner-3d-fallback" role="alert">
      <span className="planner-kicker">Sichere Ansicht</span>
      <strong>3D konnte nicht dargestellt werden</strong>
      <p>{message}</p>
      <button type="button" onClick={onReturn2D}>Zu 2D</button>
    </div>
  );
}

export class Planner3DErrorBoundary extends Component<{
  children: ReactNode;
  onReturn2D(): void;
}, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ThreeFallback
          message="Das 3D-Modul konnte nicht geladen werden. Deine Planung wurde nicht verändert."
          onReturn2D={this.props.onReturn2D}
        />
      );
    }
    return this.props.children;
  }
}
