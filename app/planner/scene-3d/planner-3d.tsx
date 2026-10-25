"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, type RootState } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

import type { PlannerDocumentV3 } from "../domain/types.ts";
import { PlannerArchitecture } from "./architecture.tsx";
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
  quality?: QualityTier;
  supportOverride?: ThreeSupport;
};

export function Planner3D({
  document,
  activeRoomId,
  selectionId,
  onSelect,
  onReturn2D,
  quality: qualityOverride,
  supportOverride,
}: Planner3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failure, setFailure] = useState<string | null>(null);
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
        </Suspense>
        <OrbitControls
          makeDefault
          target={scene.center}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.4}
          maxDistance={Math.max(16, span * 3.2)}
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI / 2.02}
        />
      </Canvas>
      <div className="planner-3d__quality" aria-hidden="true">3D · {tier === "high" ? "Hoch" : tier === "balanced" ? "Ausgewogen" : "Effizient"}</div>
    </div>
  );
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
