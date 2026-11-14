"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { Furniture3D } from "../scene-3d/furniture.tsx";
import { PlannerArchitecture } from "../scene-3d/architecture.tsx";
import { RenderReady } from "../scene-3d/render-ready.tsx";
import { createReviewScene, reviewCameraPosition, type ReviewView } from "./review-models.ts";

type Props = { modelId: string; materialId: string; variantId: string; view: ReviewView; renderKey: string; onReady(): void };

export function ModelReviewCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const review = useMemo(() => createReviewScene(props.modelId, props.materialId, props.variantId), [props.modelId, props.materialId, props.variantId]);
  const { onReady } = props;
  useEffect(() => {
    const element = host.current;
    element?.addEventListener("planner:render-ready", onReady);
    return () => element?.removeEventListener("planner:render-ready", onReady);
  }, [onReady]);
  return <div ref={host} style={{ height: "100%" }}>
    <ReviewBoundary>
      <Canvas aria-label="Modellvorschau" frameloop="demand" dpr={1} shadows
        camera={{ position: reviewCameraPosition(review.size, props.view), fov: 35, near: 0.01, far: 100 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1;
          gl.outputColorSpace = SRGBColorSpace;
          camera.lookAt(0, review.size.height / 2, 0);
          gl.domElement.setAttribute("aria-label", "Modellvorschau");
          gl.domElement.dataset.modelId = props.modelId;
        }}>
        <color attach="background" args={["#e7e4de"]} />
        <ambientLight intensity={1.2} />
        <hemisphereLight args={["#fff6e6", "#898276", 1.1]} />
        <directionalLight position={[4, 7, 5]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 3, -2]} intensity={0.7} />
        <Suspense fallback={null}>
          <Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />
          <PlannerArchitecture scene={review.scene} selectionId={null} onSelect={() => {}} />
          <RenderReady renderKey={props.renderKey} />
        </Suspense>
      </Canvas>
    </ReviewBoundary>
  </div>;
}

class ReviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">3D konnte nicht gerendert werden. Diese Aufnahme gilt nicht als bestanden.</p> : this.props.children;
  }
}
