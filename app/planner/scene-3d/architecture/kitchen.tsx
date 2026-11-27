import { RoundedBox } from "@react-three/drei";
import { TILE_SIZE_METRES } from "../../domain/tile-dimensions.ts";
import { useTileBoxGeometry } from "../shared/tile-box-geometry.ts";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE, SHARED_TORUS } from "../shared/architecture-primitives.ts";



export function KitchenBacksplash({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const wood = getPlannerMaterial(item.materialId);
  const edge = getPlannerMaterial("oak-artisan-edge");
  return (
    <group name={`kitchen-backsplash-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} renderOrder={12} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </mesh>
      {/* A slim lower and side reveal keeps the veneer legible where it meets
          the worktop and makes the panel read as a mounted wall finish. */}
      <mesh position={[0, -height / 2 + 0.012, depth / 2 + 0.006]} scale={[Math.max(0.04, width - 0.018), 0.024, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[-width / 2 + 0.008, 0, depth / 2 + 0.006]} scale={[0.016, height, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[width / 2 - 0.008, 0, depth / 2 + 0.006]} scale={[0.016, height, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
    </group>
  );
}



export function KitchenFloorZone({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tileSize = TILE_SIZE_METRES;
  const tileHeight = Math.min(height, 0.006);
  const tileMaterial = getPlannerMaterial(item.materialId);
  const tileGeometry = useTileBoxGeometry([width, tileHeight, depth]);
  return (
    <group>
      <mesh position={[0, -height / 2 + tileHeight / 2, 0]} scale={[width, tileHeight, depth]} geometry={tileGeometry} receiveShadow>
        <primitive object={tileMaterial} attach="material" />
      </mesh>
      <group position={[0, -height / 2 + tileHeight + 0.0015, 0]}>
        {Array.from({ length: Math.max(1, Math.floor(width / tileSize)) }, (_, index) => {
          const x = -width / 2 + (index + 1) * tileSize;
          return x < width / 2 - 0.015 ? (
            <mesh key={`tile-x-${index}`} position={[x, 0, 0]} scale={[0.009, 0.004, depth]} geometry={SHARED_BOX}>
              <primitive object={getPlannerMaterial("tile-grout")} attach="material" />
            </mesh>
          ) : null;
        })}
        {Array.from({ length: Math.max(1, Math.floor(depth / tileSize)) }, (_, index) => {
          const z = -depth / 2 + (index + 1) * tileSize;
          return z < depth / 2 - 0.015 ? (
            <mesh key={`tile-z-${index}`} position={[0, 0, z]} scale={[width, 0.004, 0.009]} geometry={SHARED_BOX}>
              <primitive object={getPlannerMaterial("tile-grout")} attach="material" />
            </mesh>
          ) : null;
        })}
      </group>
    </group>
  );
}



export function KitchenWorktop({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, thickness, depth] = item.size;
  const worktop = getPlannerMaterial("kitchen-worktop-black");
  const edge = getPlannerMaterial("metal-dark");
  const bevel = Math.min(0.018, Math.max(0.004, thickness * 0.4));
  return (
    <group name={`kitchen-worktop-${item.source.id}`}>
      <RoundedBox
        args={[width, thickness, depth]}
        radius={bevel}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <primitive object={worktop} attach="material" />
      </RoundedBox>
      <mesh position={[0, thickness / 2 + 0.003, 0]} scale={[Math.max(0.04, width - 0.034), 0.006, Math.max(0.04, depth - 0.034)]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={worktop} attach="material" />
      </mesh>
      {/* The front edge catches a narrow highlight and separates the slab
          from the glossy white cabinet faces below it. */}
      <mesh position={[0, -thickness * 0.16, depth / 2 + 0.006]} scale={[Math.max(0.04, width - 0.028), thickness * 0.54, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[0, thickness / 2 + 0.008, 0]} scale={[Math.max(0.04, width - 0.12), 0.003, 0.003]} geometry={SHARED_BOX}>
        <meshBasicMaterial color="#5d6461" transparent opacity={0.48} />
      </mesh>
    </group>
  );
}



export function KitchenCornerBase({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  const plinth = getPlannerMaterial("kitchen-plinth-grey");
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + 0.045, 0]} scale={[width - 0.025, 0.09, depth - 0.025]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
      <mesh position={[0, -height * 0.035, depth / 2 + 0.014]} scale={[width - 0.02, height * 0.79, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[width / 2 + 0.014, -height * 0.035, 0]} scale={[0.028, height * 0.79, depth - 0.02]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, height * 0.28, depth / 2 + 0.038]} scale={[width * 0.48, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width / 2 + 0.038, height * 0.28, 0]} scale={[0.02, 0.018, depth * 0.48]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function KitchenBase({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  const plinth = getPlannerMaterial("kitchen-plinth-grey");

  if (item.source.id === "builtin-kitchen-base-west") {
    const segments = [
      { width: 0.45, kind: "drawers" },
      { width: 0.15, kind: "door" },
      { width: 0.6, kind: "oven" },
      { width: Math.max(0.3, width - 1.2), kind: "drawers" },
    ] as const;
    let cursor = -width / 2;
    return (
      <group>
        <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
        {segments.map((segment, index) => {
          const x = cursor + segment.width / 2;
          cursor += segment.width;
          if (segment.kind === "drawers") {
            return (
              <group key={index} position={[x, 0, 0]}>
                <mesh scale={[segment.width - 0.012, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
                <group position={[0, 0, depth / 2 + 0.013]}>
                  {[0.27, -0.02, -0.31].map((y, drawerIndex) => (
                    <group key={drawerIndex} position={[0, y * height, 0]}>
                      <mesh scale={[segment.width - 0.018, height * 0.275, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
                      <mesh position={[0, height * 0.075, 0.027]} scale={[segment.width * 0.56, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
                    </group>
                  ))}
                </group>
              </group>
            );
          }
          if (segment.kind === "oven") {
            return null;
          }
          return (
            <group key={index} position={[x, 0, 0]}>
              <mesh scale={[segment.width - 0.012, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
              <group position={[0, -height * 0.04, depth / 2 + 0.013]}>
                <mesh scale={[segment.width - 0.018, height * 0.78, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
                <mesh position={[0, height * 0.31, 0.027]} scale={[segment.width * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
              </group>
            </group>
          );
        })}
      </group>
    );
  }

  if (item.source.id === "builtin-kitchen-base-north") {
    const moduleCount = Math.max(2, Math.round(width / 0.62));
    const moduleWidths = Array.from({ length: moduleCount }, () => width / moduleCount);
    let cursor = -width / 2;
    return (
      <group>
        <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
        {moduleWidths.map((moduleWidth, index) => {
          const x = cursor + moduleWidth / 2;
          cursor += moduleWidth;
          return (
            <group key={index} position={[x, -height * 0.035, depth / 2 + 0.013]}>
              <mesh scale={[moduleWidth - 0.018, height * 0.79, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
              <mesh position={[0, height * 0.315, 0.027]} scale={[moduleWidth * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
            </group>
          );
        })}
      </group>
    );
  }

  const modules = Math.max(1, Math.round(width / 0.55));
  const moduleWidth = width / modules;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
      {Array.from({ length: modules }, (_, index) => {
        const x = -width / 2 + moduleWidth * (index + 0.5);
        return (
          <group key={index} position={[x, 0, depth / 2 + 0.012]}>
            <mesh position={[0, -height * 0.1, 0]} scale={[moduleWidth - 0.018, height * 0.72, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, height * 0.34, 0.002]} scale={[moduleWidth - 0.018, height * 0.17, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, height * 0.245, 0.026]} scale={[moduleWidth * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        );
      })}
    </group>
  );
}



export function KitchenUpper({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  if (item.source.id === "builtin-kitchen-upper-north") {
    const moduleWidth = width / 2;
    return (
      <group>
        <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        {[0].map((index) => (
          <group key={index} position={[-width / 2 + moduleWidth * (index + 0.5), 0, depth / 2 + 0.012]}>
            <mesh scale={[moduleWidth - 0.016, height - 0.018, 0.026]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, -height * 0.39, 0.027]} scale={[moduleWidth * 0.58, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        ))}
        <group position={[width / 2 - moduleWidth / 2, 0, depth / 2 + 0.013]}>
          <mesh position={[0, height * 0.33, 0]} scale={[moduleWidth - 0.016, height * 0.31, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, height * 0.225, 0.027]} scale={[moduleWidth * 0.58, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          <mesh position={[0, -height * 0.12, 0.002]} scale={[moduleWidth - 0.024, height * 0.52, 0.029]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
        </group>
      </group>
    );
  }
  const modules = item.source.id === "builtin-kitchen-upper-west"
    ? 2
    : Math.max(1, Math.round(width / 0.58));
  const moduleWidth = width / modules;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      {Array.from({ length: modules }, (_, index) => (
        <group key={index} position={[-width / 2 + moduleWidth * (index + 0.5), 0, depth / 2 + 0.012]}>
          <mesh scale={[moduleWidth - 0.016, height - 0.018, 0.026]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, -height * 0.4, 0.027]} scale={[moduleWidth * 0.68, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}



export function KitchenCornerUpper({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.018} smoothness={3} castShadow receiveShadow><primitive object={white} attach="material" /></RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.014]} scale={[width - 0.02, height - 0.02, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height * 0.4, depth / 2 + 0.035]} scale={[width * 0.48, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function KitchenFridge({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const body = getPlannerMaterial(item.materialId);
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={4} castShadow receiveShadow><primitive object={body} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.035, height * 0.72, 0.028]} radius={0.018} smoothness={3} position={[0, height * 0.12, depth / 2 + 0.014]} castShadow><primitive object={body} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.035, height * 0.235, 0.028]} radius={0.018} smoothness={3} position={[0, -height * 0.375, depth / 2 + 0.015]} castShadow><primitive object={body} attach="material" /></RoundedBox>
      <mesh position={[0, -height * 0.245, depth / 2 + 0.034]} scale={[width * 0.88, 0.012, 0.012]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.02, height * 0.22, depth / 2 + 0.036]} scale={[width * 0.12, height * 0.035, 0.012]} geometry={SHARED_BOX}><meshBasicMaterial color="#153b50" /></mesh>
      {[0, 1, 2].map((index) => <mesh key={index} position={[-width * 0.025 + index * width * 0.025, height * 0.22, depth / 2 + 0.045]} scale={[0.008, 0.008, 0.008]} geometry={SHARED_SPHERE}><meshBasicMaterial color="#7fd7ff" /></mesh>)}
    </group>
  );
}



export function KitchenSink({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, 0.032, depth]} radius={0.035} smoothness={4} castShadow><primitive object={metal} attach="material" /></RoundedBox>
      <RoundedBox args={[width * 0.76, 0.045, depth * 0.7]} radius={0.055} smoothness={4} position={[-width * 0.05, -0.018, 0]} receiveShadow><primitive object={getPlannerMaterial("#73797a")} attach="material" /></RoundedBox>
      <mesh position={[-width * 0.05, 0.008, depth * 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.012, 0.045]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.32, height * 0.86, -depth * 0.3]} scale={[0.035, height * 1.7, 0.035]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.2, height * 1.55, -depth * 0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.032, 0.17]} geometry={SHARED_TORUS} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function KitchenHob({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z], index) => (
        <mesh key={index} position={[x * width, height / 2 + 0.008, z * depth]} rotation={[Math.PI / 2, 0, 0]} scale={[width * (index % 2 ? 0.2 : 0.17), 0.012, width * (index % 2 ? 0.2 : 0.17)]} geometry={SHARED_TORUS}>
          <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function KitchenOven({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width * 0.98, height * 0.98, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      <RoundedBox args={[width * 0.9, height * 0.62, 0.032]} radius={0.018} smoothness={3} position={[0, -height * 0.11, depth / 2 + 0.018]} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></RoundedBox>
      <mesh position={[0, height * 0.15, depth / 2 + 0.045]} scale={[width * 0.72, 0.024, 0.024]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, height * 0.34, depth / 2 + 0.02]} scale={[width * 0.92, height * 0.19, 0.034]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      {[-0.32, 0.32].map((x) => <mesh key={x} position={[x * width, height * 0.34, depth / 2 + 0.045]} scale={[0.05, 0.026, 0.05]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]}><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>)}
    </group>
  );
}



export function KitchenHood({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh position={[0, height * 0.56, -depth * 0.22]} scale={[width * 0.28, height * 0.88, depth * 0.3]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("cabinet-black")} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.14, -depth * 0.14]} scale={[width * 0.82, height * 0.45, depth * 0.28]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      <RoundedBox args={[width * 0.9, height * 0.55, depth * 0.16]} radius={0.018} smoothness={4} position={[0, -height * 0.05, depth * 0.08]} rotation={[-0.1, 0, 0]} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></RoundedBox>
      <mesh position={[0, -height * 0.35, depth * 0.035]} scale={[width * 0.78, 0.018, depth * 0.44]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[0, -height * 0.37, depth * 0.28]} scale={[width * 0.34, 0.006, 0.018]} geometry={SHARED_BOX}>
        <meshBasicMaterial color="#ffe2b0" />
      </mesh>
    </group>
  );
}



export function KitchenMicrowave({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[-width * 0.08, 0, depth / 2 + 0.012]} scale={[width * 0.68, height * 0.7, 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      <mesh position={[width * 0.38, height * 0.16, depth / 2 + 0.025]} scale={[0.045, 0.045, 0.03]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[width * 0.37, -height * 0.08, depth / 2 + 0.025]} scale={[0.055, height * 0.28, 0.022]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
    </group>
  );
}
