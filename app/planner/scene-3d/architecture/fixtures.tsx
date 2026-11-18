import { RoundedBox } from "@react-three/drei";
import type { ReactNode } from "react";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneFixture } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "../shared/architecture-primitives.ts";



export function FixtureMarker({ fixture }: { fixture: SceneFixture }) {
  const white = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("metal-satin");
  const dark = getPlannerMaterial("screen-black");
  const plate = (children?: ReactNode) => (
    <group>
      <RoundedBox args={[0.12, 0.12, 0.025]} radius={0.018} smoothness={3} castShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {children}
    </group>
  );
  return (
    <group name={`fixture-${fixture.id}`} position={fixture.position} rotation={[0, fixture.rotationY, 0]}>
      {fixture.kind === "ceiling-light" ? (fixture.id === "fixture-z1-light" ? <Zimmer1RattanPendant /> : <BareBulb />) : null}
      {fixture.kind === "smoke-detector" ? (
        <group>
          <mesh scale={[0.2, 0.045, 0.2]} geometry={SHARED_CYLINDER} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, -0.026, 0]} scale={[0.13, 0.012, 0.13]} geometry={SHARED_CYLINDER}><primitive object={getPlannerMaterial("object-neutral")} attach="material" /></mesh>
        </group>
      ) : null}
      {fixture.kind === "switch" || fixture.kind === "blind-control" ? plate(
        <RoundedBox args={[0.072, 0.068, 0.018]} radius={0.012} smoothness={2} position={[0, 0, 0.018]} castShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>,
      ) : null}
      {fixture.kind === "outlet" ? plate(
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.018]}>
          <mesh scale={[0.065, 0.014, 0.065]} geometry={SHARED_CYLINDER}><primitive object={white} attach="material" /></mesh>
          {[-0.018, 0.018].map((x) => <mesh key={x} position={[x, -0.01, 0.015]} scale={[0.009, 0.008, 0.009]} geometry={SHARED_CYLINDER}><primitive object={dark} attach="material" /></mesh>)}
        </group>,
      ) : null}
      {fixture.kind === "intercom" ? (
        <group>
          {/* Recorded user size: 125 × 165 mm. The unchanged mounting centre keeps the lower edge at 133 cm. */}
          <RoundedBox args={[0.125, 0.165, 0.035]} radius={0.004} smoothness={3} position={[0, 0, 0.014]} castShadow><primitive object={white} attach="material" /></RoundedBox>
          <mesh position={[0, 0.034, 0.034]} scale={[0.104, 0.066, 0.004]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>
          {[-0.028, 0, 0.028].map((x) => <mesh key={x} position={[x, -0.043, 0.034]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.004, 0.009]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>)}
        </group>
      ) : null}
      {fixture.detailProfile === "hall-distribution" ? (
        <group position={[0, 0, fixture.surfaceOffset]}>
          <HallDistributionCluster depth={fixture.mountingDepth} />
        </group>
      ) : null}
      {fixture.kind === "distribution-panel" && fixture.detailProfile !== "hall-distribution" ? (
        <group>
          <RoundedBox args={[0.43, 0.57, 0.035]} radius={0.018} smoothness={2} castShadow><primitive object={white} attach="material" /></RoundedBox>
          <mesh position={[0, 0, 0.025]} scale={[0.385, 0.525, 0.012]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("paint-white")} attach="material" /></mesh>
          <mesh position={[0.165, 0, 0.045]} scale={[0.018, 0.05, 0.04]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
        </group>
      ) : null}
      {fixture.detailProfile === "hall-revision" ? (
        <group position={[0, 0, fixture.surfaceOffset]}>
          <HallFloorHeatingPanel depth={fixture.mountingDepth} />
        </group>
      ) : null}
    </group>
  );
}



function HallDistributionCluster({ depth }: { depth: number }) {
  const white = getPlannerMaterial("white-matte");
  const face = getPlannerMaterial("paint-white");
  const metal = getPlannerMaterial("metal-satin");
  const seam = getPlannerMaterial("#5f5c57");
  return (
    <group>
      <mesh position={[0, -0.008, -depth / 2]} scale={[0.76, 0.86, 0.004]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={seam} attach="material" />
      </mesh>
      <RoundedBox args={[0.73, 0.83, depth]} radius={0.004} smoothness={2}>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {[-0.18, 0.18].map((x) => (
        <group key={x} position={[x, 0, depth / 2 + 0.001]}>
          <mesh scale={[0.34, 0.77, 0.002]} geometry={SHARED_BOX}><primitive object={seam} attach="material" /></mesh>
          <mesh position={[0, 0, 0.0015]} scale={[0.318, 0.746, 0.001]} geometry={SHARED_BOX}><primitive object={face} attach="material" /></mesh>
          {[0.255, 0.225, 0.195].map((y) => (
            <mesh key={y} position={[-0.015, y, 0.0025]} scale={[0.23, 0.009, 0.001]} geometry={SHARED_BOX}>
              <primitive object={seam} attach="material" />
            </mesh>
          ))}
          <mesh position={[0, 0.05, 0.0025]} scale={[0.2, 0.055, 0.001]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("#ece8df")} attach="material" /></mesh>
          <mesh position={[0.135, -0.08, 0.003]} scale={[0.018, 0.065, 0.002]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
          {[-0.155, 0.155].map((y) => (
            <group key={y} position={[-0.135, y, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh scale={[0.012, 0.001, 0.012]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}



function HallFloorHeatingPanel({ depth }: { depth: number }) {
  const white = getPlannerMaterial("white-matte");
  const face = getPlannerMaterial("paint-white");
  const metal = getPlannerMaterial("metal-satin");
  const seam = getPlannerMaterial("#5f5c57");
  return (
    <group>
      <mesh position={[0, -0.006, -depth / 2]} scale={[0.8, 0.46, 0.004]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={seam} attach="material" />
      </mesh>
      <RoundedBox args={[0.77, 0.43, depth]} radius={0.004} smoothness={2}>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.001]} scale={[0.725, 0.385, 0.002]} geometry={SHARED_BOX}>
        <primitive object={seam} attach="material" />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.0025]} scale={[0.7, 0.36, 0.001]} geometry={SHARED_BOX}>
        <primitive object={face} attach="material" />
      </mesh>
      <mesh position={[0.3, 0, depth / 2 + 0.003]} scale={[0.02, 0.065, 0.002]} geometry={SHARED_BOX}>
        <primitive object={metal} attach="material" />
      </mesh>
      {[-0.3, 0.3].map((x) => [-0.12, 0.12].map((y) => (
        <group key={`${x}-${y}`} position={[x, y, depth / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh scale={[0.011, 0.001, 0.011]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
        </group>
      )))}
    </group>
  );
}



function BareBulb() {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} scale={[0.065, 0.11, 0.065]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[0, -0.18, 0]} scale={[0.14, 0.19, 0.14]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></mesh>
      <pointLight position={[0, -0.2, 0]} intensity={0.22} color="#ffe0b0" distance={2.1} decay={2} />
    </group>
  );
}



function Zimmer1RattanPendant() {
  const oak = getPlannerMaterial("oak-light");
  const dark = getPlannerMaterial("metal-dark");
  return (
    <group>
      <mesh position={[0, -0.16, 0]} scale={[0.025, 0.32, 0.025]} geometry={SHARED_CYLINDER} castShadow><primitive object={dark} attach="material" /></mesh>
      <mesh position={[0, -0.36, 0]} scale={[0.05, 0.1, 0.05]} geometry={SHARED_CYLINDER} castShadow><primitive object={dark} attach="material" /></mesh>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = index * Math.PI * 2 / 16;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.16, -0.49, Math.sin(angle) * 0.16]}
            rotation={[0.34 * Math.sin(angle), -angle, 0.34 * Math.cos(angle)]}
            scale={[0.012, 0.34, 0.012]}
            geometry={SHARED_CYLINDER}
            castShadow
          >
            <primitive object={oak} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, -0.49, 0]} scale={[0.075, 0.1, 0.075]} geometry={SHARED_SPHERE}>
        <meshStandardMaterial color="#fff0cf" emissive="#ffc870" emissiveIntensity={1.25} roughness={0.32} />
      </mesh>
      <pointLight position={[0, -0.49, 0]} color="#ffd39a" intensity={0.5} distance={3.1} decay={2} />
    </group>
  );
}
