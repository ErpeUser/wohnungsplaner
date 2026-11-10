"use client";

import { ContactShadows, Environment } from "@react-three/drei";

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
  const fixtureLights = scene.fixtures.filter((fixture) => /light|ceiling|lamp/i.test(fixture.kind));
  const lightSources = fixtureLights.length > 0
    ? fixtureLights.map((fixture) => ({
      key: fixture.id,
      position: fixture.position,
      intensity: 0.78,
      color: "#ffe4bd",
    }))
    : [{
      key: "fallback-key-light",
      position: [scene.center[0], 2.42, scene.center[2]] as [number, number, number],
      intensity: 0.72,
      color: "#ffe4bd",
    }];
  return (
    <>
      <ambientLight intensity={0.54} color="#fffaf3" />
      <hemisphereLight args={["#eef2f2", "#91877a", 0.88]} />
      <directionalLight
        position={[scene.center[0] - 4, 9, scene.center[2] - 3]}
        intensity={2.08}
        color="#fff7e8"
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
      <Environment
        files="/planner-assets/environment/studio-soft.hdr"
        background={false}
        environmentIntensity={0.8}
      />
      {lightSources.map(({ key, position, intensity, color }) => (
        <pointLight
          key={key}
          position={position}
          intensity={intensity}
          color={color}
          distance={5.4}
          decay={2}
        />
      ))}
      {quality.effects ? (
        <ContactShadows
          position={[scene.center[0], 0.018, scene.center[2]]}
          opacity={0.28}
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
