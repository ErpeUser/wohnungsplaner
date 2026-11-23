import { RoundedBox } from "@react-three/drei";
import { DoubleSide } from "three";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CIRCLE, SHARED_CYLINDER, SHARED_MIRROR_LED, SHARED_PLANE, SHARED_TORUS } from "../shared/architecture-primitives.ts";
import { MarbleTileSurface } from "./marble-tiles";




export function BathTiledFinish({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tile = getPlannerMaterial(item.materialId);
  if (item.roomId === "bad" && item.catalogId === "bath-tub-apron") {
    return (
      <group name={`bath-tiled-finish-${item.source.id}`}>
        <mesh scale={item.size} geometry={SHARED_BOX} material={tile} castShadow receiveShadow />
        {/* Local −Z faces into the room at the installed 90° rotation. */}
        <group position={[0, 0, -depth / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
          <MarbleTileSurface width={width} height={height} patternOffset={3} />
        </group>
      </group>
    );
  }
  const grout = getPlannerMaterial("tile-grout");
  const vertical = height > 0.06;
  const joint = vertical ? Math.min(0.012, depth * 0.12) : Math.min(0.006, width * 0.02);
  const jointCount = Math.max(1, Math.floor(width / 0.32));

  return (
    <group name={`bath-tiled-finish-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      <mesh position={[0, height / 2 + 0.002, 0]} scale={[Math.max(0.04, width - joint), 0.004, Math.max(0.04, depth - joint)]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      {Array.from({ length: jointCount }, (_, index) => {
        const x = -width / 2 + (index + 1) * width / (jointCount + 1);
        return (
          <mesh key={`bath-joint-x-${index}`} position={[x, vertical ? 0 : height / 2 + 0.006, depth / 2 + 0.002]} scale={[0.006, vertical ? height : 0.004, 0.008]} geometry={SHARED_BOX}>
            <primitive object={grout} attach="material" />
          </mesh>
        );
      })}
      {vertical ? (
        <mesh position={[0, 0, depth / 2 + 0.003]} scale={[width, 0.006, 0.008]} geometry={SHARED_BOX}>
          <primitive object={grout} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}



export function WcFlushPlate({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const plate = getPlannerMaterial("metal-satin");
  const rocker = getPlannerMaterial("white-matte");
  return (
    <group name={`wc-flush-plate-${item.source.id}`}>
      <RoundedBox args={[width, height, depth]} radius={0.008} smoothness={3} castShadow receiveShadow>
        <primitive object={plate} attach="material" />
      </RoundedBox>
      {/* Internal proportions are estimated from the reference; the plate envelope is unchanged. */}
      <mesh position={[-width * 0.125, 0, depth / 2 + 0.006]} scale={[width * 0.46, height * 0.56, 0.01]} geometry={SHARED_BOX}>
        <primitive object={rocker} attach="material" />
      </mesh>
      <mesh position={[width * 0.235, 0, depth / 2 + 0.006]} scale={[width * 0.24, height * 0.56, 0.01]} geometry={SHARED_BOX}>
        <primitive object={rocker} attach="material" />
      </mesh>
    </group>
  );
}



export function WcRevisionPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tile = getPlannerMaterial(item.materialId);
  const frame = getPlannerMaterial("#c9bdb0");
  const hinge = getPlannerMaterial("metal-satin");
  return (
    <group name={`wc-revision-panel-${item.source.id}`}>
      {/* Tiled wall-integrated service shaft: keep the original recess envelope. */}
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      <mesh name="wc-service-hatch-frame" position={[0, 0, depth / 2 + 0.006]}
        scale={[width - 0.028, height - 0.028, 0.008]} geometry={SHARED_BOX} castShadow>
        <primitive object={frame} attach="material" />
      </mesh>
      <mesh name="wc-service-hatch-door" position={[0, 0, depth / 2 + 0.011]}
        scale={[width - 0.046, height - 0.046, 0.004]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      <mesh name="wc-service-hatch-latch" position={[-width * 0.37, -height * 0.01, depth / 2 + 0.017]}
        scale={[0.013, 0.013, 0.005]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={hinge} attach="material" />
      </mesh>
    </group>
  );
}



export function Washbasin({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("ceramic-white")} attach="material" /></mesh>
      <mesh position={[0, height * 0.46, depth * 0.08]} scale={[width * 0.68, 0.03, depth * 0.55]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></mesh>
      <mesh position={[0, height * 0.96, -depth * 0.25]} scale={[0.03, height * 0.7, 0.03]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, -height * 1.25, -depth * 0.08]} scale={[0.045, height * 2.1, 0.045]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0.11, -height * 2.1, -depth * 0.08]} rotation={[0, 0, Math.PI / 2]} scale={[0.22, 0.045, 0.045]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}



export function BathRoundMirror({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const diameter = item.size[0];
  return (
    <group>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.02]} scale={[diameter, diameter, 0.018]} geometry={SHARED_CIRCLE} renderOrder={20} castShadow>
        <primitive object={getPlannerMaterial("mirror-glass")} attach="material" side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.027]} scale={[diameter * 0.94, diameter * 0.94, 1]} geometry={SHARED_MIRROR_LED} renderOrder={21}>
        <meshStandardMaterial color="#fff4da" emissive="#ffe4a3" emissiveIntensity={1.4} roughness={0.3} metalness={0.05} />
      </mesh>
      <pointLight position={[0, 0, 0.04]} color="#ffe0a0" intensity={0.16} distance={1.2} decay={2} />
    </group>
  );
}



export function BathMat({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const sand = getPlannerMaterial("temu-bath-rug-woven");
  const fringe = getPlannerMaterial("bath-mat-fringe-sand");
  const stitches = Math.max(22, Math.round(width / 0.018));
  // True footprint comes from the Temu variants: 122×61 cm and 77×46 cm.
  // The relief is a tiny 1-cm waffle lattice, not a large tile pattern.
  return (
    <group name={`waffle-rug-${item.catalogId}`}>
      <RoundedBox args={[width * 0.985, height, depth * 0.95]} radius={0.009} smoothness={3} receiveShadow castShadow>
        <primitive object={sand} attach="material" />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.002, 0]} scale={[width * 0.973, depth * 0.928, 1]} geometry={SHARED_PLANE} receiveShadow>
        <primitive object={sand} attach="material" side={DoubleSide} />
      </mesh>
      {[-1, 1].flatMap((side) => Array.from({ length: stitches }, (_, index) => {
        const x = -width / 2 + (index + 0.5) * width / stitches;
        const length = 0.008 + (index % 4) * 0.0009;
        return <mesh key={`fringe-${side}-${index}`} position={[x, 0.002, side * (depth / 2 + length * 0.24)]}
          rotation={[(index % 3 - 1) * 0.16, 0, (index % 5 - 2) * 0.1]}
          scale={[0.0022, 0.005, length]} geometry={SHARED_BOX} castShadow>
          <primitive object={fringe} attach="material" />
        </mesh>;
      }))}
      {[-1, 1].map((side) => <mesh key={`hem-${side}`} position={[0, height / 2 + 0.002, side * (depth / 2 - 0.014)]}
        scale={[width * 0.96, 0.003, 0.012]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={fringe} attach="material" />
      </mesh>)}
    </group>
  );
}



export function BathTowelHookRail({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const oak = getPlannerMaterial("bath-hook-oak-natural");
  const black = getPlannerMaterial("bath-hook-black");
  const diameter = Math.min(0.148, width * 0.39, height * 0.43);
  const horizontal = width * 0.27;
  const vertical = height * 0.27;
  // Four independent round natural-oak plates, not a three-hook metal rail.
  // Sizes are illustration assumptions because the listing does not state cm.
  return (
    <group name="four-oak-black-bath-hooks">
      {[-1, 1].flatMap((row) => [-1, 1].map((column) => (
        <group key={`hook-${row}-${column}`} position={[column * horizontal, row * vertical, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[diameter, depth * 0.16, diameter]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
            <primitive object={oak} attach="material" />
          </mesh>
          <mesh position={[0, 0, depth * 0.14]} scale={[diameter * 0.92, diameter * 0.92, 0.012]} geometry={SHARED_CIRCLE} castShadow>
            <primitive object={oak} attach="material" side={DoubleSide} />
          </mesh>
          <mesh position={[0, -diameter * 0.04, depth * 0.37]} rotation={[Math.PI / 2, 0, 0]}
            scale={[0.028, depth * 0.68, 0.028]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={black} attach="material" />
          </mesh>
          <RoundedBox position={[0, -diameter * 0.13, depth * 0.72]} rotation={[0.2, 0, -0.12]}
            args={[diameter * 0.46, diameter * 0.68, 0.017]} radius={0.008} smoothness={4} castShadow>
            <primitive object={black} attach="material" />
          </RoundedBox>
        </group>
      )))}
    </group>
  );
}



export function BathShowerRod({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  // The supplied Temu rod is a 171–210 cm pressure-fit tube.  Keep the
  // document's 205 cm setting as the single source of placement truth and
  // model the telescoping sleeve, collars and wall pads inside that existing
  // built-in footprint.
  const rod = getPlannerMaterial(item.materialId || "chrome-polished");
  const plate = getPlannerMaterial("metal-satin");
  const collarX = width * 0.17;
  const plateRadius = Math.max(0.045, Math.min(0.06, width * 0.028));
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[depth, width, height]} geometry={SHARED_CYLINDER} renderOrder={18} castShadow>
        <primitive object={rod} attach="material" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-collarX, 0, 0]} scale={[depth * 1.28, width * 0.21, height * 1.28]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={rod} attach="material" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[collarX, 0, 0]} scale={[depth * 1.18, width * 0.16, height * 1.18]} castShadow geometry={SHARED_CYLINDER}>
        <primitive object={rod} attach="material" />
      </mesh>
      {[-collarX, collarX].map((x) => (
        <mesh key={`collar-${x}`} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[depth * 1.35, depth * 1.35, depth * 1.35]} geometry={SHARED_TORUS} castShadow>
          <primitive object={rod} attach="material" />
        </mesh>
      ))}
      {[-0.5, 0.5].map((ratio) => (
        <group key={`mount-${ratio}`} position={[ratio * width, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[depth * 1.1, depth * 1.4, depth * 1.1]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={rod} attach="material" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[plateRadius, depth * 0.7, plateRadius]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={plate} attach="material" />
          </mesh>
          <mesh position={[ratio * 0.008, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[plateRadius * 0.94, plateRadius * 0.94, plateRadius * 0.94]} geometry={SHARED_TORUS}>
            <primitive object={plate} attach="material" />
          </mesh>
        </group>
      ))}
      {[-0.5, 0.5].map((ratio) => (
        <mesh key={`end-cap-${ratio}`} position={[ratio * width, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[depth * 1.5, depth * 0.16, depth * 1.5]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={rod} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function BathShowerCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const hookCount = 12;
  const cloth = getPlannerMaterial("temu-shower-curtain-beige");
  const seam = getPlannerMaterial("shower-curtain-hem-beige");
  const silver = getPlannerMaterial("chrome-polished");
  const step = width / hookCount;
  // Opaque washable textile, 180×200 cm; the document positions the hem
  // 16 cm above floor and the hooks just below the 218-cm curtain rod.
  // Draw rippling vertical sections with alternating front/back peaks.
  return <group name="temu-beige-curtain-180x200">
    {Array.from({ length: hookCount }, (_, index) => (
      <group key={`pleat-${index}`} position={[-width / 2 + step * (index + 0.5), 0, 0]}>
        <RoundedBox args={[step * 1.035, height - 0.026, Math.max(0.012, depth * 0.8)]}
          position={[0, -0.004, Math.sin(index * 1.13) * 0.022]} rotation={[0, Math.sin(index * 1.13) * 0.10, 0]}
          radius={0.006} smoothness={3} castShadow receiveShadow>
          <primitive object={cloth} attach="material" />
        </RoundedBox>
        <mesh position={[0, height / 2 - 0.013, 0.002]} scale={[step * 0.95, 0.018, 0.018]} geometry={SHARED_BOX} castShadow>
          <primitive object={seam} attach="material" />
        </mesh>
        <mesh position={[0, -height / 2 + 0.018, Math.sin(index * 1.13) * 0.022]} scale={[step, 0.026, 0.019]} geometry={SHARED_BOX} castShadow>
          <primitive object={seam} attach="material" />
        </mesh>
        <mesh position={[0, height / 2 + 0.023, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.026, 0.008, 0.026]} geometry={SHARED_TORUS} castShadow>
          <primitive object={silver} attach="material" />
        </mesh>
        <mesh position={[0, height / 2 + 0.042, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.032, 0.032, 0.032]} geometry={SHARED_TORUS} castShadow>
          <primitive object={silver} attach="material" />
        </mesh>
      </group>
    ))}
  </group>;
}



export function ScoutBasinCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const cashmere = getPlannerMaterial("cashmere-matte");
  const oak = getPlannerMaterial("scout-oak");
  const black = getPlannerMaterial("metal-black");
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={oak} attach="material" /></mesh>
      {[-0.25, 0.25].map((ratio) => (
        <mesh key={ratio} position={[ratio * width, 0.015, depth / 2 + 0.014]} scale={[width * 0.49 - 0.012, height - 0.055, 0.028]} geometry={SHARED_BOX} castShadow>
          <primitive object={cashmere} attach="material" />
        </mesh>
      ))}
      {[-0.25, 0.25].map((ratio) => <mesh key={`grip-${ratio}`} position={[ratio * width, height * 0.35, depth / 2 + 0.036]} scale={[width * 0.34, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>)}
      {[-0.43, 0.43].flatMap((x) => [-0.38, 0.38].map((z) => <mesh key={`${x}-${z}`} position={[x * width, -height / 2 - 0.01, z * depth]} scale={[0.035, 0.035, 0.035]} geometry={SHARED_BOX}><primitive object={black} attach="material" /></mesh>))}
    </group>
  );
}



export function ScoutWasherCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const oak = getPlannerMaterial("scout-oak");
  const cashmere = getPlannerMaterial("cashmere-matte");
  const black = getPlannerMaterial("metal-black");
  const side = 0.045;
  const lowerOpening = 0.96;
  const upperHeight = height - lowerOpening;
  return (
    <group>
      {[-1, 1].map((sideSign) => <mesh key={sideSign} position={[sideSign * (width / 2 - side / 2), 0, 0]} scale={[side, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={oak} attach="material" /></mesh>)}
      <mesh position={[0, height / 2 - side / 2, 0]} scale={[width, side, depth]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + lowerOpening, 0]} scale={[width - side * 2, side, depth]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      <mesh position={[0, height / 2 - upperHeight / 2, -depth * 0.22]} scale={[width - side * 2, upperHeight - side, depth * 0.55]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      {[-0.25, 0.25].map((ratio) => <mesh key={ratio} position={[ratio * width, height / 2 - upperHeight / 2, depth / 2 + 0.014]} scale={[width * 0.49 - 0.012, upperHeight - 0.055, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={cashmere} attach="material" /></mesh>)}
      {[-0.25, 0.25].map((ratio) => <mesh key={`grip-${ratio}`} position={[ratio * width, lowerOpening / 2 + 0.04, depth / 2 + 0.038]} scale={[width * 0.31, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>)}
    </group>
  );
}



export function BathShowerSet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height] = item.size;
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <mesh scale={[width * 0.16, height, width * 0.16]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      {[-0.42, 0.42].map((ratio) => (
        <mesh key={ratio} position={[0, height * ratio, -width * 0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.34, width * 0.28, width * 0.34]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      ))}
      <RoundedBox args={[width * 1.45, width * 0.42, width * 0.48]} radius={0.018} smoothness={3} position={[0, -height * 0.47, width * 0.06]} castShadow>
        <primitive object={metal} attach="material" />
      </RoundedBox>
      <mesh position={[-width * 0.72, height * 0.2, width * 0.16]} rotation={[0, 0, -0.22]} scale={[width * 0.22, height * 0.32, width * 0.22]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[-width * 0.76, height * 0.37, width * 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.5, width * 0.16, width * 0.34]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[-width * 0.35, -height * 0.18, width * 0.12]} rotation={[0, 0, 0.22]} scale={[width * 0.09, height * 0.58, width * 0.09]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function WcPaperHolder({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  // User photo: two offset solid-wood ledges (photo annotates the lower one
  // as 17 × 14 cm), an approximately 15-cm horizontal iron roll arm and a
  // 9-cm vertical connector. Overall envelope / mounting remain estimates.
  const wood = getPlannerMaterial("wc-holder-solid-oak");
  const woodEdge = getPlannerMaterial("wc-holder-oak-edge");
  const iron = getPlannerMaterial("wc-holder-black-iron");
  const paper = getPlannerMaterial("wc-paper-white");
  const core = getPlannerMaterial("wc-paper-core");
  const ledgeWidth = 0.17;
  const ledgeDepth = Math.min(depth * 0.94, 0.14);
  const ledgeThickness = 0.023;
  const topX = width / 2 - ledgeWidth / 2 - 0.008;
  const bottomX = -width / 2 + ledgeWidth / 2 + 0.008;
  const topY = height / 2 - 0.023;
  const bottomY = -height / 2 + 0.023;
  const bracketX = 0;
  const frontZ = depth / 2 - 0.009;
  return (
    <group name="temu-wc-oak-iron-paper-shelf">
      {[{ x: topX, y: topY }, { x: bottomX, y: bottomY }].map(({ x, y }, index) => (
        <group key={`wood-ledge-${index}`} position={[x, y, 0]}>
          <RoundedBox args={[ledgeWidth, ledgeThickness, ledgeDepth]} radius={0.006} smoothness={4} castShadow receiveShadow>
            <primitive object={woodEdge} attach="material" />
          </RoundedBox>
          <mesh position={[0, ledgeThickness / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}
            scale={[ledgeWidth * 0.94, ledgeDepth * 0.92, 1]} geometry={SHARED_PLANE} receiveShadow>
            <primitive object={wood} attach="material" side={DoubleSide} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`edge-grain-${side}`} position={[0, -ledgeThickness * 0.2, side * (ledgeDepth / 2 + 0.0008)]}
              scale={[ledgeWidth * 0.93, 0.002, 0.001]} geometry={SHARED_BOX}>
              <primitive object={wood} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Continuous bracket between the two offset wooden shelves. */}
      <RoundedBox args={[0.022, height * 0.75, 0.024]} radius={0.004} smoothness={3}
        position={[bracketX, 0, frontZ - 0.025]} castShadow>
        <primitive object={iron} attach="material" />
      </RoundedBox>
      <mesh position={[bracketX, 0.01, frontZ - 0.026]} scale={[0.035, 0.003, 0.033]} geometry={SHARED_BOX} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      {/* Horizontal 15-cm paper arm and small open end stop. */}
      <mesh position={[0.076, -0.014, frontZ]} rotation={[0, 0, Math.PI / 2]}
        scale={[0.014, 0.15, 0.014]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      <mesh position={[0.149, -0.003, frontZ]} scale={[0.01, 0.025, 0.01]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      {/* Visible replaceable paper roll, not a solid blank cylinder. */}
      <mesh position={[0.078, -0.014, frontZ]} rotation={[0, 0, Math.PI / 2]}
        scale={[0.098, 0.105, 0.098]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={paper} attach="material" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`paper-core-${side}`} position={[0.078 + side * 0.053, -0.014, frontZ]}>
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[0.031, 0.031, 0.031]} geometry={SHARED_TORUS}>
            <primitive object={core} attach="material" />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[0.013, 0.013, 0.013]} geometry={SHARED_TORUS}>
            <primitive object={iron} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.078, -0.085, frontZ + 0.046]} scale={[0.086, 0.118, 0.002]} geometry={SHARED_BOX} castShadow>
        <primitive object={paper} attach="material" />
      </mesh>
      {/* Wall mounting tabs under the shelves. */}
      {[topY - 0.035, bottomY + 0.032].map((y, index) => (
        <mesh key={`wall-mount-${index}`} position={[bracketX, y, -depth / 2 + 0.005]}
          scale={[0.038, 0.038, 0.008]} geometry={SHARED_BOX} castShadow>
          <primitive object={iron} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function WcBrush({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh position={[0, -height * 0.22, 0]} scale={[width, height * 0.55, depth]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <mesh position={[0, height * 0.27, 0]} scale={[width * 0.18, height * 0.62, depth * 0.18]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}
