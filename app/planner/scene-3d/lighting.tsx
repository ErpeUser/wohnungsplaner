"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

import type { QualitySettings } from "./quality.ts";
import type { SceneModel } from "./scene-model.ts";

export function PlannerLighting({
  quality,
  scene,
}: {
  quality: QualitySettings;
  scene: SceneModel;
}) {
  const width = Math.max(3, scene.bounds.maxX - scene.bounds.minX);
  const depth = Math.max(3, scene.bounds.maxZ - scene.bounds.minZ);
  return (
    <>
      <ambientLight intensity={0.34} color="#fff7eb" />
      <hemisphereLight args={["#d9e7ed", "#766958", 0.82]} />
      <directionalLight
        position={[scene.center[0] - 4, 9, scene.center[2] - 3]}
        intensity={2.2}
        color="#fff1d9"
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={0.1}
        shadow-camera-far={28}
        shadow-camera-left={-width}
        shadow-camera-right={width}
        shadow-camera-top={depth}
        shadow-camera-bottom={-depth}
        shadow-bias={-0.0003}
      />
      <Environment resolution={quality.effects ? 128 : 64} background={false} environmentIntensity={0.65}>
        <Lightformer form="rect" intensity={3.2} color="#fff4e5" position={[0, 8, -5]} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={1.4} color="#d8e8ed" position={[-5, 4, 2]} scale={5} />
      </Environment>
      {quality.effects ? (
        <ContactShadows
          position={[scene.center[0], 0.018, scene.center[2]]}
          opacity={0.34}
          scale={Math.max(width, depth) * 1.4}
          blur={2.4}
          far={5}
          resolution={quality.shadowMapSize}
          frames={1}
        />
      ) : null}
    </>
  );
}
