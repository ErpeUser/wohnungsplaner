import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { FurnitureBeam, SHARED_BOX, SHARED_CYLINDER } from "./primitives.tsx";

/**
 * Detailed parametric desk/vanity swivel chair.
 *
 * The linked AliExpress listing supplies the chair category, padded back,
 * height adjustment and quiet rollers; its gallery and manufacturer's
 * measurements could not be verified. The five-caster base, shell contours,
 * colour and 62 × 53 × 92 cm envelope are clearly marked design estimates.
 *
 * Coordinates are normalized: floor y=0, rear -Z, front +Z. The furniture
 * instance scales this mesh to the estimated product envelope in metres.
 */
export function XuegwAdjustableDeskChair({ materialId }: { materialId: string }) {
  const fabric = getPlannerMaterial(materialId);
  const piping = getPlannerMaterial("fabric-sand");
  const base = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("chrome-polished");
  const dark = getPlannerMaterial("metal-dark");
  const spokes = Array.from({ length: 5 }, (_, index) => index * Math.PI * 2 / 5);

  return (
    <group name="xuegw-adjustable-desk-chair">
      {/* Five-spoke base with independent twin rolling wheels. */}
      <mesh name="xuegw-base-hub" position={[0, 0.14, 0]} scale={[0.19, 0.115, 0.19]}
        geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </mesh>
      {spokes.map((angle, index) => (
        <group key={index} rotation={[0, angle, 0]}>
          <FurnitureBeam start={[0, 0.15, 0]} end={[0.425, 0.083, 0]}
            width={0.055} depth={0.085} materialId="white-matte" round />
          <group name={"xuegw-caster-" + index} position={[0.425, 0.048, 0]}>
            <mesh position={[0, 0.015, 0]} scale={[0.082, 0.070, 0.088]} geometry={SHARED_BOX} castShadow>
              <primitive object={dark} attach="material" />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0, 0, side * 0.032]}
                rotation={[Math.PI / 2, 0, 0]} scale={[0.083, 0.030, 0.083]}
                geometry={SHARED_CYLINDER} castShadow receiveShadow>
                <primitive object={dark} attach="material" />
              </mesh>
            ))}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}
              scale={[0.035, 0.082, 0.035]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={metal} attach="material" />
            </mesh>
          </group>
        </group>
      ))}

      {/* The centre post, telescoping gas lift and under-seat swivel plate. */}
      <mesh name="xuegw-gas-lift-sleeve" position={[0, 0.274, 0]} scale={[0.105, 0.235, 0.105]}
        geometry={SHARED_CYLINDER} castShadow>
        <primitive object={base} attach="material" />
      </mesh>
      <mesh name="xuegw-gas-lift" position={[0, 0.385, 0]} scale={[0.061, 0.245, 0.061]}
        geometry={SHARED_CYLINDER} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0, 0.474, 0]} scale={[0.37, 0.048, 0.29]} geometry={SHARED_BOX} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>
      <FurnitureBeam start={[0.13, 0.451, 0.035]} end={[0.30, 0.425, 0.085]}
        width={0.026} depth={0.022} materialId="metal-dark" round />
      <RoundedBox args={[0.075, 0.03, 0.046]} radius={0.012} smoothness={3}
        position={[0.298, 0.425, 0.086]} castShadow>
        <primitive object={dark} attach="material" />
      </RoundedBox>

      {/* Seat: supportive upholstered base, soft top cushion and fine front piping. */}
      <RoundedBox args={[0.84, 0.13, 0.73]} radius={0.072} smoothness={5}
        position={[0, 0.51, 0.045]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.076, 0.67]} radius={0.038} smoothness={5}
        position={[0, 0.585, 0.062]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.68, 0.009, 0.012]} radius={0.004} smoothness={3}
        position={[0, 0.555, 0.414]} receiveShadow>
        <primitive object={piping} attach="material" />
      </RoundedBox>
      {[-0.355, 0.355].map((x) => (
        <RoundedBox key={x} args={[0.014, 0.028, 0.50]} radius={0.006} smoothness={3}
          position={[x, 0.605, 0.045]} receiveShadow>
          <primitive object={piping} attach="material" />
        </RoundedBox>
      ))}

      {/* Rear connection and softly sculpted, slightly reclined back shell. */}
      <mesh name="xuegw-back-support" position={[0, 0.641, -0.268]}
        rotation={[-0.10, 0, 0]} scale={[0.24, 0.242, 0.047]}
        geometry={SHARED_BOX} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
      <RoundedBox args={[0.78, 0.39, 0.16]} radius={0.075} smoothness={6}
        position={[0, 0.759, -0.261]} rotation={[-0.09, 0, 0]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[0.145, 0.319, 0.191]} radius={0.065} smoothness={5}
          position={[side * 0.323, 0.761, -0.222]}
          rotation={[-0.11, 0, side * -0.13]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {/* Slight lumbar swell and tonal vertical stitch tracks. */}
      <RoundedBox args={[0.54, 0.165, 0.055]} radius={0.027} smoothness={4}
        position={[0, 0.724, -0.156]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {[-0.185, 0.185].map((x) => (
        <mesh key={x} position={[x, 0.824, -0.170]} scale={[0.005, 0.185, 0.006]}
          geometry={SHARED_BOX} castShadow>
          <primitive object={piping} attach="material" />
        </mesh>
      ))}
      <RoundedBox args={[0.57, 0.014, 0.015]} radius={0.005} smoothness={4}
        position={[0, 0.934, -0.184]}>
        <primitive object={piping} attach="material" />
      </RoundedBox>
    </group>
  );
}
