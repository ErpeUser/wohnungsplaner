"use client";

import { Canvas, type RootState } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

import type { PlannerDocumentV3 } from "../domain/types.ts";
import { PlannerArchitecture } from "./architecture.tsx";
import { CameraController, dispatchWalkCommand, type CameraMode } from "./camera-controller.tsx";
import { Furniture3D } from "./furniture.tsx";
import { PlannerLighting } from "./lighting.tsx";
import {
  chooseQualityTier,
  detectThreeSupport,
  qualitySettings,
  type QualityTier,
  type ThreeSupport,
} from "./quality.ts";
import { createSceneModel } from "./scene-model.ts";

export type Planner3DProps = {
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onReturn2D(): void;
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
  const span = Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);

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
          position: [scene.center[0] + span * 0.72, Math.max(4.8, span * 0.72), scene.center[2] + span * 0.9],
          fov: 42,
          near: 0.05,
          far: 80,
        }}
        gl={{ antialias: tier !== "low", alpha: false, powerPreference: "high-performance" }}
        onCreated={configureRenderer}
      >
        <color attach="background" args={["#d9d7d0"]} />
        <Suspense fallback={null}>
          <PlannerLighting quality={quality} scene={scene} />
          <PlannerArchitecture scene={scene} selectionId={selectionId} onSelect={onSelect} />
          <Furniture3D scene={scene} selectionId={selectionId} onSelect={onSelect} />
        </Suspense>
        <CameraController
          document={document}
          scene={scene}
          mode={cameraMode}
          activeRoomId={activeRoomId}
          reducedMotion={reducedMotion}
        />
      </Canvas>
      <CameraOverlay mode={cameraMode} />
      <div className="planner-3d__quality" aria-hidden="true">3D · {tier === "high" ? "Hoch" : tier === "balanced" ? "Ausgewogen" : "Effizient"}</div>
    </div>
  );
}

function CameraOverlay({ mode }: { mode: CameraMode }) {
  if (mode === "orbit") {
    return (
      <div className="planner-3d__camera planner-3d__camera--orbit">
        <button type="button" onClick={() => dispatchWalkCommand("reset")}>Ansicht zurücksetzen</button>
      </div>
    );
  }
  return (
    <div className="planner-3d__camera" aria-label="Rundgangsteuerung">
      <span>Klicken zum Umsehen · WASD zum Gehen</span>
      <div>
        <button type="button" aria-label="Vorwärts" onClick={() => dispatchWalkCommand("forward")}>↑</button>
        <button type="button" aria-label="Links" onClick={() => dispatchWalkCommand("left")}>←</button>
        <button type="button" aria-label="Zurück" onClick={() => dispatchWalkCommand("back")}>↓</button>
        <button type="button" aria-label="Rechts" onClick={() => dispatchWalkCommand("right")}>→</button>
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
  gl.toneMappingExposure = 1.05;
  gl.shadowMap.autoUpdate = false;
  gl.shadowMap.needsUpdate = true;
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
