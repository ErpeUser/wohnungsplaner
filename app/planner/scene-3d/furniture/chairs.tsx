import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type { Material } from "three";
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, LatheGeometry, TubeGeometry, Vector2, Vector3 } from "three";
import { getChairModelForCatalogId } from "../../chairs/chair-models.ts";
import { createChairCushionGeometry } from "../chair-cushion-geometry.ts";
import { createMetricChairFabricGeometry } from "../chair-fabric-uv.ts";
import { getPlannerMaterial } from "../materials.ts";
import { FurnitureBeam, SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./primitives.tsx";



export function PhotoOfficeChair() {
  const blush = getPlannerMaterial("fabric-blush");
  const white = getPlannerMaterial("white-matte");
  const legAngles = [0, 72, 144, 216, 288].map((degrees) => degrees * Math.PI / 180);
  return (
    <group>
      <RoundedBox args={[0.72, 0.18, 0.68]} radius={0.12} smoothness={4} position={[0, 0.52, 0]} castShadow receiveShadow><primitive object={blush} attach="material" /></RoundedBox>
      <RoundedBox args={[0.72, 0.58, 0.17]} radius={0.13} smoothness={4} position={[0, 0.78, -0.25]} rotation={[-0.12, 0, 0]} castShadow receiveShadow><primitive object={blush} attach="material" /></RoundedBox>
      <mesh position={[0, 0.31, 0]} scale={[0.09, 0.38, 0.09]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, 0.13, 0]} scale={[0.22, 0.08, 0.22]} geometry={SHARED_CYLINDER} castShadow><primitive object={white} attach="material" /></mesh>
      {legAngles.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.22, 0.105, 0]} scale={[0.42, 0.055, 0.075]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0.43, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.11, 0.055, 0.11]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}



export function TemuIvoryExecutiveChair() {
  const leather = getPlannerMaterial("leather-ivory-pebble");
  const seam = getPlannerMaterial("fabric-sand");
  const chrome = getPlannerMaterial("chrome-polished");
  const black = getPlannerMaterial("screen-black");
  const legAngles = [0, 72, 144, 216, 288].map((degrees) => degrees * Math.PI / 180);
  return (
    <group>
      <mesh position={[0, 0.22, 0]} scale={[0.105, 0.31, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={chrome} attach="material" /></mesh>
      <mesh position={[0, 0.11, 0]} scale={[0.24, 0.075, 0.24]} geometry={SHARED_CYLINDER} castShadow><primitive object={black} attach="material" /></mesh>
      {legAngles.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.23, 0.095, 0]} rotation={[0, 0, -0.08]} scale={[0.44, 0.055, 0.07]} geometry={SHARED_BOX} castShadow><primitive object={chrome} attach="material" /></mesh>
          <mesh position={[0.46, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.105, 0.055, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={black} attach="material" /></mesh>
        </group>
      ))}

      <RoundedBox args={[0.86, 0.18, 0.7]} radius={0.1} smoothness={6} position={[0, 0.5, 0.04]} castShadow receiveShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.7, 0.1, 0.58]} radius={0.075} smoothness={6} position={[0, 0.57, 0.065]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.58, 0.01, 0.016]} radius={0.005} smoothness={3} position={[0, 0.62, 0.345]} castShadow><primitive object={seam} attach="material" /></RoundedBox>
      <RoundedBox args={[0.22, 0.12, 0.5]} radius={0.055} smoothness={5} position={[-0.34, 0.59, 0.02]} rotation={[0, 0, -0.1]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.22, 0.12, 0.5]} radius={0.055} smoothness={5} position={[0.34, 0.59, 0.02]} rotation={[0, 0, 0.1]} castShadow><primitive object={leather} attach="material" /></RoundedBox>

      <RoundedBox args={[0.62, 0.55, 0.16]} radius={0.08} smoothness={6} position={[0, 0.76, -0.255]} rotation={[-0.07, 0, 0]} castShadow receiveShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.72, 0.22, 0.18]} radius={0.09} smoothness={6} position={[0, 0.99, -0.27]} rotation={[-0.04, 0, 0]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.5, 0.01, 0.016]} radius={0.005} smoothness={3} position={[0, 0.82, -0.352]} rotation={[-0.07, 0, 0]} castShadow><primitive object={seam} attach="material" /></RoundedBox>
      <RoundedBox args={[0.17, 0.38, 0.15]} radius={0.07} smoothness={5} position={[-0.34, 0.8, -0.22]} rotation={[-0.06, 0, -0.08]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.17, 0.38, 0.15]} radius={0.07} smoothness={5} position={[0.34, 0.8, -0.22]} rotation={[-0.06, 0, 0.08]} castShadow><primitive object={leather} attach="material" /></RoundedBox>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.43, 0, 0]}>
          <mesh position={[0, 0.62, 0.02]} scale={[0.055, 0.28, 0.055]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>
          <RoundedBox args={[0.15, 0.08, 0.38]} radius={0.035} smoothness={4} position={[0, 0.76, -0.01]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
        </group>
      ))}

      <mesh position={[0, 0.39, 0.31]} scale={[0.48, 0.035, 0.42]} geometry={SHARED_BOX} castShadow><primitive object={chrome} attach="material" /></mesh>
      <RoundedBox args={[0.58, 0.105, 0.35]} radius={0.055} smoothness={5} position={[0, 0.42, 0.33]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <mesh position={[0, 0.43, 0.51]} scale={[0.02, 0.02, 0.02]} geometry={SHARED_SPHERE} castShadow><primitive object={chrome} attach="material" /></mesh>
    </group>
  );
}



export type ComparisonChairVariant = "kaleo" | "temu-swivel" | "faux-leather" | "velvet-swivel" | "amber";



export function KaleoArmchair() {
  return <ComparisonChair variant="kaleo" materialId="fabric-kaleo-chenille" />;
}



function SoftChairSeat({ width, depth, seatHeight, material }: { width: number; depth: number; seatHeight: number; material: Material }) {
  const geometry = useMemo(() => createChairCushionGeometry(width, depth), [width, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0, seatHeight - 0.0275, 0.025]} castShadow receiveShadow dispose={null}>
    <primitive object={material} attach="material" />
  </mesh>;
}



function ChairUpholstery({ width, depth, height, seatHeight, seatWidth, seatDepth, armHeight, materialId, channels, softSeat = false, metricFabric = false }: {
  width: number; depth: number; height: number; seatHeight: number; seatWidth: number; seatDepth: number;
  armHeight: number; materialId: string; channels: boolean; softSeat?: boolean; metricFabric?: boolean;
}) {
  const { shell, rim } = useMemo(() => {
    // A continuous padded U shell gives the back and arms one smooth outline.
    // Its lower rim tapers toward the seat, while the upper back leans outward.
    const curve = new CatmullRomCurve3([
      new Vector3(-width * 0.46, armHeight, depth * 0.31),
      new Vector3(-width * 0.49, armHeight + 0.012, depth * 0.06),
      new Vector3(-width * 0.43, height - 0.075, -depth * 0.30),
      new Vector3(-width * 0.29, height - 0.006, -depth * 0.44),
      new Vector3(0, height - 0.002, -depth * 0.46),
      new Vector3(width * 0.29, height - 0.006, -depth * 0.44),
      new Vector3(width * 0.43, height - 0.075, -depth * 0.30),
      new Vector3(width * 0.49, armHeight + 0.012, depth * 0.06),
      new Vector3(width * 0.46, armHeight, depth * 0.31),
    ]);
    const segments = 56;
    const rows = 8;
    const stride = rows + 1;
    const layer = (segments + 1) * stride;
    const positions: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    for (let side = 0; side < 2; side++) {
      for (let u = 0; u <= segments; u++) {
        const top = curve.getPoint(u / segments);
        const tangent = curve.getTangent(u / segments);
        const normal = new Vector3(tangent.z, 0, -tangent.x).normalize();
        const bottom = new Vector3(top.x * 0.91, seatHeight - 0.055, top.z * 0.8 + 0.015);
        for (let v = 0; v <= rows; v++) {
          const point = bottom.clone().lerp(top, v / rows);
          point.addScaledVector(normal, Math.sin(v / rows * Math.PI) * 0.012 - side * 0.036);
          positions.push(point.x, point.y, point.z);
          uv.push(u / segments, v / rows);
        }
      }
    }
    for (let side = 0; side < 2; side++) {
      for (let u = 0; u < segments; u++) for (let v = 0; v < rows; v++) {
        const a = side * layer + u * stride + v;
        const b = a + stride;
        if (side === 0) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    for (let u = 0; u < segments; u++) {
      const a = u * stride + rows;
      const b = a + stride;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
      const lower = u * stride;
      indices.push(lower, lower + stride, lower + layer, lower + stride, lower + stride + layer, lower + layer);
    }
    for (const u of [0, segments]) for (let v = 0; v < rows; v++) {
      const a = u * stride + v;
      if (u === 0) indices.push(a, a + layer, a + 1, a + 1, a + layer, a + layer + 1);
      else indices.push(a, a + 1, a + layer, a + 1, a + layer + 1, a + layer);
    }
    const shell = new BufferGeometry();
    shell.setAttribute("position", new Float32BufferAttribute(positions, 3));
    shell.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    shell.setIndex(indices);
    shell.computeVertexNormals();
    const rim = new TubeGeometry(curve, 72, 0.0016, 6, false);
    if (!metricFabric) return { shell, rim };
    const mapped = { shell: createMetricChairFabricGeometry(shell), rim: createMetricChairFabricGeometry(rim) };
    shell.dispose(); rim.dispose();
    return mapped;
  }, [width, depth, height, seatHeight, armHeight, metricFabric]);
  useEffect(() => {
    if (metricFabric) return () => { shell.dispose(); rim.dispose(); };
  }, [shell, rim, metricFabric]);
  const fabric = getPlannerMaterial(materialId);
  return <group>
    <mesh geometry={shell} castShadow receiveShadow dispose={metricFabric ? null : undefined}><primitive object={fabric} attach="material" /></mesh>
    <mesh geometry={rim} castShadow dispose={metricFabric ? null : undefined}><primitive object={fabric} attach="material" /></mesh>
    {softSeat ? <SoftChairSeat width={seatWidth} depth={seatDepth} seatHeight={seatHeight} material={fabric} /> :
      <RoundedBox args={[seatWidth, 0.055, seatDepth]} radius={0.025} smoothness={6} position={[0, seatHeight - 0.0275, 0.025]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>}
    {channels ? [-1, 1].map((side) => <ChairStitch key={side} points={[
      [side * seatWidth * 0.22, seatHeight + 0.045, -depth * 0.32],
      [side * seatWidth * 0.22, (height + seatHeight) / 2, -depth * 0.355],
      [side * seatWidth * 0.22, height - 0.035, -depth * 0.42],
    ]} materialId={materialId} metricFabric={metricFabric} />) : null}
    <ChairStitch points={[
      [-seatWidth * 0.42, seatHeight + (height - seatHeight) * 0.55, -depth * 0.33],
      [0, seatHeight + (height - seatHeight) * 0.48, -depth * 0.365],
      [seatWidth * 0.42, seatHeight + (height - seatHeight) * 0.55, -depth * 0.33],
    ]} materialId={materialId} metricFabric={metricFabric} />
  </group>;
}



function ChairStitch({ points, materialId, metricFabric = false }: { points: [number, number, number][]; materialId: string; metricFabric?: boolean }) {
  const geometry = useMemo(() => {
    const source = new TubeGeometry(new CatmullRomCurve3(points.map((point) => new Vector3(...point))), 24, 0.0011, 5, false);
    if (!metricFabric) return source;
    const mapped = createMetricChairFabricGeometry(source);
    source.dispose();
    return mapped;
  }, [points, metricFabric]);
  useEffect(() => {
    if (metricFabric) return () => geometry.dispose();
  }, [geometry, metricFabric]);
  return <mesh geometry={geometry} dispose={metricFabric ? null : undefined}><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>;
}



function KaleoDiscBase({ seatHeight }: { seatHeight: number }) {
  const geometry = useMemo(() => new LatheGeometry([
    new Vector2(0, 0), new Vector2(0.245, 0), new Vector2(0.25, 0.008),
    new Vector2(0.241, 0.018), new Vector2(0.12, 0.035), new Vector2(0.04, 0.065), new Vector2(0.026, 0.09),
  ], 64), []);
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
    <FurnitureBeam start={[0, 0.07, 0]} end={[0, seatHeight - 0.055, 0]} width={0.046} round />
    <mesh position={[0, seatHeight - 0.06, 0]} scale={[0.18, 0.025, 0.18]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
  </group>;
}



export function ComparisonChair({ variant, materialId }: { variant: ComparisonChairVariant; materialId: string }) {
  const id = variant === "kaleo" ? "chair-kaleo-chenille-beige" : variant === "amber" ? "chair-amber-chenille-beige" : variant === "temu-swivel" ? "chair-temu-swivel-upholstered" : variant === "velvet-swivel" ? "chair-temu-velvet-swivel-arm" : "chair-temu-faux-leather-metal";
  const model = getChairModelForCatalogId(id)!;
  const width = model.sizeCm.width / 100;
  const depth = model.sizeCm.depth / 100;
  const height = model.sizeCm.height / 100;
  const seatHeight = model.seatCm.height / 100;
  const armless = variant === "faux-leather";
  const armHeight = armless ? seatHeight + 0.035 : (model.armHeightCm ? model.armHeightCm / 100 : seatHeight + 0.18);
  return <group scale={[1 / width, 1 / height, 1 / depth]}>
    <ChairUpholstery width={width} depth={depth} height={height} seatHeight={seatHeight} seatWidth={model.seatCm.width / 100} seatDepth={model.seatCm.depth / 100} armHeight={armHeight} materialId={materialId} channels={variant !== "amber" && !armless} softSeat={variant === "kaleo" || variant === "amber"} metricFabric={variant === "kaleo" || variant === "amber"} />
    {variant === "kaleo" ? <KaleoDiscBase seatHeight={seatHeight} /> : variant === "amber" ? <group>
      <FurnitureBeam start={[0, 0.035, 0]} end={[0, seatHeight - 0.055, 0]} width={0.046} round />
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => <FurnitureBeam key={angle} start={[0, 0.04, 0]} end={[Math.cos(angle) * width * 0.49, 0.018, Math.sin(angle) * depth * 0.49]} width={0.026} depth={0.034} />)}
    </group> : <group>
      {model.swivel ? <mesh position={[0, seatHeight - 0.075, 0]} scale={[0.075, 0.08, 0.075]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh> : null}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`${x}-${z}`}>
        <FurnitureBeam start={[x * (armless ? width * 0.31 : 0.055), seatHeight - 0.06, z * (armless ? depth * 0.30 : 0.05)]} end={[x * width * 0.46, 0.015, z * depth * 0.43]} width={variant === "temu-swivel" ? 0.027 : 0.025} depth={variant === "temu-swivel" ? 0.027 : 0.018} round={variant === "temu-swivel"} />
        {variant === "temu-swivel" ? <FurnitureBeam start={[x * 0.035, seatHeight - 0.09, z * 0.025]} end={[x * width * 0.36, 0.12, z * depth * 0.34]} width={0.006} round /> : null}
      </group>))}
    </group>}
  </group>;
}
