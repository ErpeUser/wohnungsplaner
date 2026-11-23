import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CYLINDER, SHARED_PLANE, SHARED_SPHERE, SHARED_TORUS } from "../shared/architecture-primitives.ts";

/** Furniture dimensions are sourced from Möbelix item 007326000408.
 * Width 80 cm, height 3.8 cm, depth 23.5 cm; photographed finish is
 * artisan-oak foil on MDF, not solid oak. All geometry stays in that envelope.
 */
export function WcArtisanWallboard({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const edge = getPlannerMaterial("oak-artisan-edge");
  const veneer = getPlannerMaterial("oak-artisan");
  return (
    <group name="wc-artisan-simple-wallboard">
      <RoundedBox args={[width, height, depth]} radius={0.004} smoothness={4} castShadow receiveShadow>
        <primitive object={edge} attach="material" />
      </RoundedBox>
      {/* Actual veneer plane preserves directionality and a fine PBR wood grain. */}
      <mesh name="wc-artisan-top-veneer" position={[0, height / 2 + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}
        scale={[width - 0.004, depth - 0.003, 1]} geometry={SHARED_PLANE} receiveShadow>
        <primitive object={veneer} attach="material" />
      </mesh>
      <mesh name="wc-artisan-front-banding" position={[0, 0, depth / 2 + 0.0006]}
        scale={[width - 0.006, height - 0.003, 0.0008]} geometry={SHARED_BOX} castShadow>
        <primitive object={veneer} attach="material" />
      </mesh>
    </group>
  );
}

/** The ventilation cover is flush against the WC's tiled rear wall.
 * A functional duct diameter is not inferred from the photo. */
export function WcWallVent({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const face = getPlannerMaterial("tile-white-rect");
  const shadow = getPlannerMaterial("#b8afa4");
  return (
    <group name="wc-wall-air-vent">
      <RoundedBox args={[width, height, depth]} radius={0.008} smoothness={4} castShadow receiveShadow>
        <primitive object={face} attach="material" />
      </RoundedBox>
      <mesh name="wc-vent-recess" position={[0, 0, depth / 2 + 0.001]} scale={[width * 0.81, height * 0.64, 0.002]}
        geometry={SHARED_BOX}>
        <primitive object={shadow} attach="material" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} name={"wc-vent-louver-" + i}
          position={[0, (i - 3) * height * 0.083, depth / 2 + 0.004]}
          scale={[width * 0.78, height * 0.057, 0.004]} geometry={SHARED_BOX} castShadow>
          <primitive object={face} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, -height * 0.38, depth / 2 + 0.003]}
        scale={[width * 0.88, 0.008, 0.005]} geometry={SHARED_BOX}>
        <primitive object={face} attach="material" />
      </mesh>
    </group>
  );
}

/** Photo-inspired botanical staging, explicitly separate from the purchased
 * shelf's real bounding box and excluded from the shopping list. */
export function WcShelfStyling({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height] = item.size;
  const green = getPlannerMaterial("leaf-green");
  const olive = getPlannerMaterial("leaf-olive");
  const stem = getPlannerMaterial("#60734c");
  const pot = getPlannerMaterial("ceramic-beige");
  const porcelain = getPlannerMaterial("ceramic-pot-glazed");
  const amber = getPlannerMaterial("#ac7e4c");
  const wicker = getPlannerMaterial("wc-holder-oak-edge");
  const vines = useMemo(() => [
    [[-0.28, -0.005, 0.06], [-0.32, -0.08, 0.09], [-0.33, -0.25, 0.095], [-0.29, -0.47, 0.08]],
    [[-0.26, 0.01, -0.015], [-0.35, -0.04, 0.025], [-0.38, -0.16, 0.07], [-0.35, -0.34, 0.085]],
  ].map((positions) => new TubeGeometry(
    new CatmullRomCurve3(positions.map(([x, y, z]) => new Vector3(x, y, z))), 20, 0.0025, 5, false,
  )), []);
  const leaves = [
    [-0.27, 0.09, 0.02, -0.5], [-0.35, 0.045, 0.02, 0.7], [-0.23, 0.14, -0.01, 0.8],
    [-0.32, -0.07, 0.09, -0.7], [-0.34, -0.17, 0.10, 0.6], [-0.31, -0.27, 0.092, -0.7],
    [-0.28, -0.38, 0.086, 0.7], [-0.36, -0.18, 0.071, 0.6], [-0.37, -0.27, 0.09, -0.6],
  ] as const;
  return (
    <group name="wc-photo-shelf-styling">
      {/* Left plant: grounded beige pot, foliage and hanging pothos. */}
      <mesh name="wc-shelf-plant-pot" position={[-width * 0.35, -height * 0.27, 0]}
        scale={[0.14, 0.115, 0.14]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={pot} attach="material" />
      </mesh>
      {vines.map((geometry, i) => (
        <mesh key={i} name={"wc-pothos-vine-" + i} geometry={geometry} castShadow>
          <primitive object={stem} attach="material" />
        </mesh>
      ))}
      {leaves.map(([x, y, z, tilt], i) => (
        <mesh key={i} name={"wc-pothos-leaf-" + i} position={[x, y, z]} rotation={[0.4, tilt, tilt * 0.6]}
          scale={[0.055, 0.018, 0.037]} geometry={SHARED_SPHERE} castShadow receiveShadow>
          <primitive object={i % 3 ? green : olive} attach="material" />
        </mesh>
      ))}
      {/* Amber reed diffuser: translucent-looking lacquer and individual sticks. */}
      <mesh name="wc-shelf-amber-diffuser" position={[-0.025, -height * 0.3, 0]}
        scale={[0.095, 0.103, 0.095]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={amber} attach="material" />
      </mesh>
      {[[-0.021, 0.17], [-0.016, -0.14], [0.008, 0.06], [0.034, -0.1]].map(([x, lean], i) => (
        <mesh key={i} position={[-0.025 + x, 0.053, 0]} rotation={[lean, 0, x * 4]}
          scale={[0.003, 0.19, 0.003]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={wicker} attach="material" />
        </mesh>
      ))}
      {/* Right ceramic eucalyptus vase with slender stems and sage leaves. */}
      <mesh name="wc-shelf-vase" position={[0.195, -height * 0.24, -0.015]}
        scale={[0.135, 0.146, 0.135]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={porcelain} attach="material" />
      </mesh>
      {[[-0.03, 0.12], [0.022, 0.18], [0.06, 0.1]].map(([x, tilt], i) => (
        <group key={i} position={[0.195 + x, 0.04, -0.015]} rotation={[0, 0, tilt]}>
          <mesh scale={[0.004, 0.22 - i * 0.025, 0.004]} geometry={SHARED_CYLINDER}>
            <primitive object={stem} attach="material" />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.025, i * 0.008, 0]}
              rotation={[0, side * 0.36, side * 0.45]}
              scale={[0.047, 0.013, 0.025]} geometry={SHARED_SPHERE} castShadow>
              <primitive object={olive} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      <mesh name="wc-shelf-woven-basket" position={[width * 0.45, -height * 0.27, -0.03]}
        scale={[0.09, 0.12, 0.09]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={wicker} attach="material" />
      </mesh>
    </group>
  );
}

/** Wall-hung porcelain pan with a sculpted ceramic shell, recessed bowl,
 * white seat, edge rim and concealed anchor. No standalone cistern in the room. */
export function WcWallHungPan({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const ceramic = getPlannerMaterial("ceramic-white");
  const recess = getPlannerMaterial("#857c73");
  const hinge = getPlannerMaterial("metal-satin");
  return (
    <group name="wc-wall-hung-ceramic-pan">
      <RoundedBox args={[width * 0.96, height * 0.63, depth * 0.93]} radius={0.105} smoothness={6}
        position={[0, -height * 0.08, depth * 0.027]} castShadow receiveShadow>
        <primitive object={ceramic} attach="material" />
      </RoundedBox>
      <mesh position={[0, -height * 0.1, depth * 0.245]}
        scale={[width * 0.93, height * 0.61, depth * 0.48]} geometry={SHARED_SPHERE} castShadow receiveShadow>
        <primitive object={ceramic} attach="material" />
      </mesh>
      <RoundedBox args={[width * 0.88, height * 0.32, depth * 0.12]} radius={0.03} smoothness={5}
        position={[0, height * 0.06, -depth * 0.40]} castShadow>
        <primitive object={ceramic} attach="material" />
      </RoundedBox>
      <mesh name="wc-bowl-interior" position={[0, height * 0.307, depth * 0.066]}
        scale={[width * 0.52, 0.008, depth * 0.56]} geometry={SHARED_SPHERE} receiveShadow>
        <primitive object={recess} attach="material" />
      </mesh>
      <mesh name="wc-seat-contoured-rim" rotation={[-Math.PI / 2, 0, 0]}
        position={[0, height * 0.33, depth * 0.066]} scale={[width * 0.82, depth * 0.72, 0.21]}
        geometry={SHARED_TORUS} castShadow receiveShadow>
        <primitive object={ceramic} attach="material" />
      </mesh>
      <RoundedBox name="wc-seat-back-cover" args={[width * 0.84, 0.028, depth * 0.17]} radius={0.014} smoothness={4}
        position={[0, height * 0.35, -depth * 0.34]} castShadow>
        <primitive object={ceramic} attach="material" />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.22, height * 0.34, -depth * 0.30]}
          rotation={[Math.PI / 2, 0, 0]} scale={[0.032, 0.02, 0.032]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={hinge} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
