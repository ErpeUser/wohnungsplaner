import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type { Material } from "three";
import { ExtrudeGeometry, Shape } from "three";
import { tableVisualProfile } from "../../tables/table-models.ts";
import { getComparisonTabletopMaterial, getPlannerMaterial } from "../materials.ts";
import { FurnitureBeam, PRIMARY_TABLETOPS, SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./primitives.tsx";



export function DetailedTable({ materialId }: { materialId: string }) {
  const top = getPlannerMaterial(materialId);
  return (
    <group>
      <RoundedBox args={[1, 0.12, 1]} radius={0.04} smoothness={3} position={[0, 0.91, 0]} castShadow receiveShadow><primitive object={top} attach="material" /></RoundedBox>
      {[[-0.39, -0.39], [0.39, -0.39], [-0.39, 0.39], [0.39, 0.39]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.43, z]} scale={[0.075, 0.84, 0.075]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}



function capsuleShape(width: number, depth: number) {
  const shape = new Shape();
  const horizontal = width >= depth;
  const radius = Math.min(width, depth) / 2;
  const halfStraight = Math.max(0, (Math.max(width, depth) - radius * 2) / 2);
  shape.moveTo(-halfStraight, -radius);
  shape.lineTo(halfStraight, -radius);
  shape.absarc(halfStraight, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-halfStraight, radius);
  shape.absarc(-halfStraight, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();
  return { shape, horizontal };
}



function CapsuleSolid({ width, depth, height, position, materialId, material }: {
  width: number; depth: number; height: number; position: [number, number, number]; materialId: string; material?: Material;
}) {
  const geometry = useMemo(() => {
    const bevel = Math.min(0.002, height / 5, width / 8, depth / 8);
    const { shape, horizontal } = capsuleShape(width - bevel * 2, depth - bevel * 2);
    const geometry = new ExtrudeGeometry(shape, {
      depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 2, steps: 1, curveSegments: 40,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -(height - bevel * 2) / 2, 0);
    if (!horizontal) geometry.rotateY(Math.PI / 2);
    return geometry;
  }, [width, depth, height]);
  return <mesh position={position} geometry={geometry} castShadow receiveShadow><primitive object={material ?? getPlannerMaterial(materialId)} attach="material" /></mesh>;
}



function FlutedSlab({ width, depth, height, x, materialId }: { width: number; depth: number; height: number; x: number; materialId: string }) {
  const points = useMemo(() => {
    const { shape, horizontal } = capsuleShape(width - 0.008, depth - 0.008);
    return shape.getSpacedPoints(Math.round((width + depth) * 2 / 0.018)).slice(0, -1).map((point) => horizontal ? [point.x, -point.y] : [-point.y, -point.x]);
  }, [width, depth]);
  return <group position={[x, 0, 0]}>
    <CapsuleSolid width={width - 0.008} depth={depth - 0.008} height={height} position={[0, height / 2, 0]} materialId={materialId} />
    {points.map(([px, pz], index) => <mesh key={index} position={[px, height / 2, pz]} scale={[0.008, height - 0.006, 0.008]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
      <primitive object={getPlannerMaterial(materialId)} attach="material" />
    </mesh>)}
  </group>;
}



export function ComparisonDiningTable({ materialId, catalogId, size }: { materialId: string; catalogId: string; size?: [number, number, number] }) {
  const profile = tableVisualProfile(catalogId);
  const width = size?.[0] ?? (profile === "round-metal-frame" ? 1 : 1.2);
  const height = size?.[1] ?? (profile === "round-metal-frame" ? 0.75 : 0.755);
  const depth = size?.[2] ?? (profile === "fluted-extension-pedestal" ? 0.8 : profile === "round-metal-frame" ? 1 : 1.2);
  const extended = width > (profile === "round-metal-frame" ? 1.01 : 1.21);
  if (profile === "fluted-round-pedestal") return <FlutedRoundPedestalTable width={width} height={height} depth={depth} materialId={materialId} extended={extended} />;
  const thickness = profile === "fluted-extension-pedestal" ? 0.018 : 0.025;
  const tabletop = PRIMARY_TABLETOPS.has(catalogId) ? getComparisonTabletopMaterial(materialId) : undefined;
  // Author these measured products in metres, then cancel the parent's unit-box
  // normalization. Extending the top must not stretch the legs or cabinet.
  return <group scale={[1 / width, 1 / height, 1 / depth]}>
    <CapsuleSolid width={width} depth={depth} height={thickness} position={[0, height - thickness / 2, 0]} materialId={materialId} material={tabletop} />
    {(extended ? [-0.2, 0.2] : [0]).map((x) => <mesh key={x} position={[x, height + 0.0002, 0]} scale={[0.0012, 0.0004, depth - 0.006]} geometry={SHARED_BOX}>
      <primitive object={getPlannerMaterial("oak-artisan-edge")} attach="material" />
    </mesh>)}
    {profile === "storage-pedestal" ? <StorageTableCabinet height={height - thickness} materialId={materialId} /> : profile === "fluted-extension-pedestal" ? (
      <group>
        {/* Saved dimension drawing: two 10.8 × 51.2 cm fluted slab legs,
            18 mm top, and a 40 cm centre leaf. */}
        {[-1, 1].map((side) => <FlutedSlab key={side} width={0.108} depth={0.512} height={height - thickness} x={side * (width / 2 - 0.27)} materialId={materialId} />)}
        {[-0.18, 0.18].map((z) => <FurnitureBeam key={z} start={[-width / 2 + 0.25, height - 0.038, z]} end={[width / 2 - 0.25, height - 0.038, z]} width={0.018} depth={0.028} materialId="oak-artisan-edge" />)}
      </group>
    ) : (
      <group>
        <mesh position={[0, height - 0.055, 0]} scale={[width - 0.3, 0.045, 0.14]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        <mesh position={[0, height - 0.095, 0]} scale={[0.105, 0.1, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => <FurnitureBeam key={`${x}-${z}`} start={[x * 0.045, height - 0.065, z * 0.045]} end={[x * 0.36, 0.012, z * 0.32]} width={0.047} depth={0.026} />))}
      </group>
    )}
  </group>;
}



function StorageTableCabinet({ height, materialId }: { height: number; materialId: string }) {
  // The saved product image supports the cabinet construction; its internal
  // proportions remain image estimates, not additional verified dimensions.
  const bodyHeight = height - 0.055;
  const front = 0.253;
  return <group>
    <CapsuleSolid width={0.72} depth={0.52} height={0.018} position={[0, 0.009, 0]} materialId={materialId} />
    <CapsuleSolid width={0.72} depth={0.52} height={0.025} position={[0, bodyHeight - 0.0125, 0]} materialId={materialId} />
    {[-1, 1].map((side) => <FlutedSlab key={side} x={side * 0.285} width={0.15} depth={0.5} height={bodyHeight} materialId={materialId} />)}
    <mesh position={[0, bodyHeight / 2, -0.235]} scale={[0.43, bodyHeight - 0.035, 0.025]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
    <mesh position={[0, bodyHeight * 0.47, 0]} scale={[0.43, 0.014, 0.47]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
    <RoundedBox args={[0.78, 0.055, 0.47]} radius={0.009} position={[0, height - 0.0275, 0]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
    {[-1, 1].map((side) => <group key={side} position={[side * 0.106, 0, front]}>
      <mesh position={[0, bodyHeight / 2, 0]} scale={[0.172, bodyHeight - 0.09, 0.006]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("glass-frosted")} attach="material" /></mesh>
      {[-0.097, 0.097].map((x) => <mesh key={x} position={[x, bodyHeight / 2, 0.003]} scale={[0.022, bodyHeight - 0.035, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>)}
      {[0.032, bodyHeight - 0.032].map((y) => <mesh key={y} position={[0, y, 0.003]} scale={[0.214, 0.031, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>)}
      <FurnitureBeam start={[-side * 0.073, bodyHeight / 2 - 0.05, 0.027]} end={[-side * 0.073, bodyHeight / 2 + 0.05, 0.027]} width={0.008} materialId="metal-gold" round />
    </group>)}
  </group>;
}



function FlutedRoundPedestalTable({ width, height, depth, materialId, extended }: {
  width: number; height: number; depth: number; materialId: string; extended: boolean;
}) {
  const edge = getPlannerMaterial("oak-artisan-edge");
  const pedestal = getPlannerMaterial("oak-natural");
  const flute = getPlannerMaterial("oak-artisan-edge");
  const angles = Array.from({ length: 28 }, (_, index) => (index / 28) * Math.PI * 2);
  const thickness = height * 0.09;
  const footHeightRatio = 0.08;
  const supportHeightRatio = 0.025;
  const coreTopRatio = 1 - thickness / height - supportHeightRatio;
  const coreHeightRatio = coreTopRatio - footHeightRatio;
  return (
    <group scale={[1 / width, 1 / height, 1 / depth]}>
      <CapsuleSolid width={width} depth={depth} height={thickness} position={[0, height - thickness / 2, 0]} materialId={materialId} />
      {(extended ? [-(width - depth) / 2, (width - depth) / 2] : [0]).map((x) => (
        <mesh key={x} position={[x, height + 0.0002, 0]} scale={[0.0012, 0.0004, depth - 0.006]} geometry={SHARED_BOX}>
          <primitive object={edge} attach="material" />
        </mesh>
      ))}
      {/* Keep the same estimated outer flute envelope in both variants. The
          solid core connects its strips, floor-contact foot and top support. */}
      <group scale={[depth, height, depth]}>
        <mesh position={[0, coreTopRatio + supportHeightRatio / 2, 0]} scale={[0.56, supportHeightRatio, 0.56]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, footHeightRatio + coreHeightRatio / 2, 0]} scale={[0.63, coreHeightRatio, 0.63]} geometry={SHARED_CYLINDER} castShadow receiveShadow><primitive object={pedestal} attach="material" /></mesh>
        {angles.map((angle) => <mesh key={angle} position={[Math.cos(angle) * 0.315, 0.49, Math.sin(angle) * 0.315]} scale={[0.012, 0.66, 0.012]} geometry={SHARED_CYLINDER} castShadow><primitive object={flute} attach="material" /></mesh>)}
        <mesh position={[0, footHeightRatio / 2, 0]} scale={[0.38, footHeightRatio, 0.38]} geometry={SHARED_CYLINDER} castShadow><primitive object={pedestal} attach="material" /></mesh>
      </group>
    </group>
  );
}



export function BozanDiningTable() {
  const oak = getPlannerMaterial("oak-bozan-directional");
  const oakEdge = getPlannerMaterial("oak-bozan-edge");
  const black = getPlannerMaterial("metal-black");
  const joint = useMemo(() => {
    const material = getPlannerMaterial("oak-artisan-edge").clone();
    // Keep the joint flush while separating coincident surfaces in the depth
    // buffer. The shared edge material must retain its original settings.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    return material;
  }, []);
  useEffect(() => () => joint.dispose(), [joint]);
  // The catalogue records a 25 mm slab within the unchanged 76 cm height.
  const slabHeight = 0.025 / 0.76;
  const legAngle = 0.54;
  // Extend the existing inclined supports down to the floor, preserving their
  // upper attachment instead of translating the whole table or its placement.
  const oldFloorGap = 0.46 - Math.cos(legAngle) * 0.44 - Math.sin(legAngle) * 0.0325;
  const legExtension = oldFloorGap / Math.cos(legAngle);

  return (
    <group>
      <mesh position={[0, 1 - slabHeight / 2, 0]} scale={[1, slabHeight, 1]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={oak} attach="material" />
      </mesh>
      {/* A flush, estimated joint mark stays inside the circular slab. */}
      <mesh position={[0, 0.999, 0]} scale={[0.0018, 0.002, 0.93]} geometry={SHARED_BOX} dispose={null}>
        <primitive object={joint} attach="material" />
      </mesh>
      <RoundedBox args={[0.72, 0.12, 0.72]} radius={0.018} smoothness={4} position={[0, 1 - slabHeight - 0.06, 0]} castShadow receiveShadow>
        <primitive object={oakEdge} attach="material" />
      </RoundedBox>

      {[Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.22 + Math.sin(legAngle) * legExtension / 2, 0.46 - oldFloorGap / 2, 0]} rotation={[0, 0, legAngle]} scale={[0.065, 0.88 + legExtension, 0.065]} geometry={SHARED_BOX} castShadow receiveShadow>
            <primitive object={black} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.46, 0]} scale={[0.13, 0.18, 0.13]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={black} attach="material" />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={`bozan-bolt-${angle}`} position={[Math.cos(angle) * 0.17, 0.9, Math.sin(angle) * 0.17]} scale={[0.018, 0.012, 0.018]} geometry={SHARED_SPHERE} castShadow>
          <primitive object={black} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
