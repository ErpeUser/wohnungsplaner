import { RoundedBox } from "@react-three/drei";
import { DoubleSide } from "three";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { CLOCK_NUMERALS, SHARED_BOX, SHARED_CIRCLE, SHARED_PLANE, SHARED_SPHERE, VORRAUM_PLANT_TEXTURE } from "../shared/architecture-primitives.ts";



export function VorraumWallDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, , depth] = item.size;
  // A 48 x 62 cm print is legible at the entrance while keeping both door
  // handles and the coat unit visually clear.
  const frameWidth = 0.48;
  const frameHeight = 0.62;
  const frameDepth = 0.038;
  // The wall is the negative-local-Z side after the -90° wall rotation.
  // Put the *whole* decoration on the room side.  Moving only the paper and
  // plates still left the frame intersecting the wall and made it disappear
  // from oblique camera angles.
  const front = -(depth / 2 + 0.012);
  const frameSurface = -(frameDepth / 2 + 0.018);
  const plantDiameter = 0.25;
  const plantSurface = front - 0.028;
  return (
    <group name="vorraum-wall-decor">
      <group position={[width * 0.26, 0.19, front]}>
        <RoundedBox args={[frameWidth, frameHeight, frameDepth]} radius={0.012} smoothness={4} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("oak-light")} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0, frameSurface]} scale={[frameWidth - 0.045, frameHeight - 0.045, 0.012]} geometry={SHARED_BOX} renderOrder={30}>
          <meshBasicMaterial color="#f2e6d5" side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[-0.035, -0.01, frameSurface - 0.008]} scale={[0.014, 0.19, 0.01]} geometry={SHARED_BOX} renderOrder={31}>
          <meshBasicMaterial color="#a7835f" side={DoubleSide} depthTest={false} />
        </mesh>
        {[-0.08, 0.02, 0.11].flatMap((y, index) => [
          <mesh key={`left-${index}`} position={[-0.085, y, frameSurface - 0.009]} rotation={[0, 0, -0.45]} scale={[0.095, 0.036, 0.012]} geometry={SHARED_SPHERE} renderOrder={32}>
            <meshBasicMaterial color="#ad8963" side={DoubleSide} depthTest={false} />
          </mesh>,
          <mesh key={`right-${index}`} position={[0.02, y + 0.025, frameSurface - 0.009]} rotation={[0, 0, 0.45]} scale={[0.095, 0.036, 0.012]} geometry={SHARED_SPHERE} renderOrder={32}>
            <meshBasicMaterial color="#ad8963" side={DoubleSide} depthTest={false} />
          </mesh>,
        ])}
      </group>
      {/* Supplied wall-plant SVG. The physical scale is the exact diameter:
          0.25 m = 25 cm. */}
      <group position={[width * 0.34, -0.19, plantSurface]}>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[plantDiameter, plantDiameter, 0.02]} geometry={SHARED_CIRCLE} renderOrder={40}>
          <meshBasicMaterial color="#ede4d5" side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[plantDiameter, plantDiameter, 1]} geometry={SHARED_PLANE} renderOrder={41}>
          <meshBasicMaterial map={VORRAUM_PLANT_TEXTURE} transparent={false} toneMapped={false} side={DoubleSide} depthTest={false} />
        </mesh>
        {[[-0.045, 0.035, 0.06, 0.035], [0.01, 0.06, 0.055, 0.03], [-0.015, -0.005, 0.045, 0.025], [0.045, -0.055, 0.05, 0.028]].map(([x, y, sx, sy], index) => (
          <mesh key={`plant-leaf-${index}`} position={[x, y, -0.012]} rotation={[0, Math.PI / 2, index % 2 ? 0.28 : -0.28]} scale={[sx, sy, 0.008]} geometry={SHARED_SPHERE} renderOrder={42}>
            <meshBasicMaterial color={index % 2 ? "#71845d" : "#87996e"} toneMapped={false} side={DoubleSide} depthTest={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}



export function LivingTelevision({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.012]} scale={[width * 0.94, height * 0.9, 0.018]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("tv-display")} attach="material" /></mesh>
      <mesh position={[0, -height * 0.43, depth / 2 + 0.025]} scale={[0.08, 0.012, 0.012]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}



export function LivingFloatingCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      {[-1, 0, 1].map((index) => (
        <mesh key={index} position={[index * width / 3, 0, depth / 2 + 0.014]} scale={[width / 3 - 0.015, height - 0.018, 0.028]} geometry={SHARED_BOX} castShadow>
          <primitive object={getPlannerMaterial("drawer-charcoal")} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, height / 2 + 0.014, 0]} scale={[width + 0.025, 0.028, depth + 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
    </group>
  );
}



export function MossPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("moss-green")} attach="material" /></mesh>
      {Array.from({ length: 18 }, (_, index) => (
        <mesh key={index} position={[(index % 6 - 2.5) * item.size[0] / 6, (Math.floor(index / 6) - 1) * item.size[1] / 3, item.size[2] / 2 + 0.025]} scale={[item.size[0] / 5.2, item.size[1] / 2.5, 0.045]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial(index % 3 === 0 ? "leaf-green" : "moss-green")} attach="material" /></mesh>
      ))}
    </group>
  );
}



export function WallClock({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const silver = getPlannerMaterial("metal-satin");
  return (
    <group>
      {/* The reference shows a square, profiled silver frame. Its relief is simplified. */}
      <mesh position={[0, 0, -depth * 0.4]} scale={[width, height, depth * 0.2]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * width * 0.435, 0, depth * 0.1]} scale={[width * 0.13, height, depth * 0.8]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
          <mesh position={[0, side * height * 0.435, depth * 0.1]} scale={[width * 0.74, height * 0.13, depth * 0.8]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
          <mesh position={[side * width * 0.3725, 0, depth * 0.37]} scale={[width * 0.035, height * 0.78, depth * 0.18]} geometry={SHARED_BOX}><primitive object={silver} attach="material" /></mesh>
          <mesh position={[0, side * height * 0.3725, depth * 0.37]} scale={[width * 0.71, height * 0.035, depth * 0.18]} geometry={SHARED_BOX}><primitive object={silver} attach="material" /></mesh>
        </group>
      ))}
      <mesh position={[0, 0, depth * 0.4]} scale={[width * 0.7, height * 0.7, depth * 0.08]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <mesh position={[0, height * 0.08, depth * 0.47]} rotation={[0, 0, -0.45]} scale={[width * 0.048, height * 0.25, depth * 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[width * 0.06, -height * 0.02, depth * 0.47]} rotation={[0, 0, 1.1]} scale={[width * 0.038, height * 0.18, depth * 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh name={`clock-roman-numerals-${item.id}`} position={[0, 0, depth * 0.445]} scale={[width, height, 1]} geometry={CLOCK_NUMERALS} dispose={null}>
        <primitive object={getPlannerMaterial("metal-dark")} attach="material" />
      </mesh>
    </group>
  );
}



export function WallLight({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <pointLight position={[0, -item.size[1] * 0.55, item.size[2] * 0.9]} color="#ffd8a2" intensity={0.48} distance={2.3} decay={2} />
    </group>
  );
}
