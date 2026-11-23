import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { SHARED_BOX, SHARED_CYLINDER } from "./primitives.tsx";

/**
 * Parametric hall model from the supplied photograph. Proportions use the
 * existing 115 × 37.5 × 231.9 cm location; photo does not verify dimensions.
 * Front is +Z. The instance provides metric scale and room rotation.
 */
export function BrownHallwayMirrorBench() {
  const wood = getPlannerMaterial("hallway-walnut-brown");
  const groove = getPlannerMaterial("hallway-brown-groove");
  const back = getPlannerMaterial("hallway-sand-back");
  const metal = getPlannerMaterial("metal-dark");
  const mirror = getPlannerMaterial("mirror-glass");
  const cushion = getPlannerMaterial("fabric-ecru");
  const fluteXs = Array.from({ length: 28 }, (_, index) => -0.458 + index * 0.034);
  const hookXs = [-0.055, 0.09, 0.235, 0.38];

  return (
    <group name="photo-hallway-brown-mirror-bench">
      {/* Continuous wall back and the two narrow side gables. */}
      <mesh position={[0, 0.51, -0.454]} scale={[0.972, 0.975, 0.032]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.51, -0.012]} scale={[0.018, 0.975, 0.91]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={wood} attach="material" />
        </mesh>
      ))}
      {/* Woodgrain overhead cabinet and fine vertical fluting. */}
      <RoundedBox args={[0.974, 0.185, 0.925]} radius={0.007} smoothness={3}
        position={[0, 0.903, -0.01]} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </RoundedBox>
      {fluteXs.map((x) => (
        <mesh key={"top-" + x} position={[x, 0.909, 0.456]} scale={[0.0027, 0.167, 0.006]} geometry={SHARED_BOX} receiveShadow>
          <primitive object={groove} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.805, 0.454]} scale={[0.95, 0.012, 0.018]} geometry={SHARED_BOX}>
        <primitive object={metal} attach="material" />
      </mesh>
      {/* Left full-height tower and uninterrupted mirrored front. */}
      <RoundedBox args={[0.316, 0.605, 0.91]} radius={0.008} smoothness={3}
        position={[-0.322, 0.504, -0.007]} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </RoundedBox>
      <mesh position={[-0.322, 0.519, 0.456]} scale={[0.282, 0.568, 0.012]} geometry={SHARED_BOX}>
        <primitive object={metal} attach="material" />
      </mesh>
      <RoundedBox args={[0.260, 0.548, 0.011]} radius={0.003} smoothness={3}
        position={[-0.322, 0.519, 0.468]} receiveShadow>
        <primitive object={mirror} attach="material" />
      </RoundedBox>
      {[-0.468, -0.177].map((x) => (
        <mesh key={x} position={[x, 0.519, 0.46]} scale={[0.008, 0.576, 0.012]} geometry={SHARED_BOX}>
          <primitive object={metal} attach="material" />
        </mesh>
      ))}
      {[-0.16, -0.123].map((x) => (
        <group key={x} position={[x, 0.64, 0.485]}>
          <RoundedBox args={[0.009, 0.116, 0.015]} radius={0.004} smoothness={3} castShadow>
            <primitive object={metal} attach="material" />
          </RoundedBox>
        </group>
      ))}
      {/* Back panel, shallow hanger and four black hooks in open right bay. */}
      <mesh position={[0.164, 0.518, -0.411]} scale={[0.620, 0.567, 0.016]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={back} attach="material" />
      </mesh>
      {[-0.152, 0.475].map((x) => (
        <mesh key={x} position={[x, 0.515, -0.214]} scale={[0.013, 0.576, 0.394]} geometry={SHARED_BOX} castShadow>
          <primitive object={wood} attach="material" />
        </mesh>
      ))}
      <mesh position={[0.163, 0.749, -0.30]} scale={[0.58, 0.016, 0.023]} geometry={SHARED_BOX} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
      {hookXs.map((x) => (
        <group key={x} position={[x, 0.695, -0.294]}>
          <mesh scale={[0.018, 0.096, 0.027]} geometry={SHARED_BOX} castShadow>
            <primitive object={metal} attach="material" />
          </mesh>
          <mesh position={[0, -0.036, 0.024]} rotation={[0.60, 0, 0]}
            scale={[0.018, 0.067, 0.019]} geometry={SHARED_BOX} castShadow>
            <primitive object={metal} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Ivory upholstered seat, wooden support and dark separation line. */}
      <RoundedBox args={[0.573, 0.06, 0.70]} radius={0.017} smoothness={5}
        position={[0.167, 0.289, 0.054]} castShadow receiveShadow>
        <primitive object={cushion} attach="material" />
      </RoundedBox>
      <mesh position={[0.167, 0.254, 0.054]} scale={[0.565, 0.010, 0.67]} geometry={SHARED_BOX} castShadow>
        <primitive object={wood} attach="material" />
      </mesh>
      {/* Matching lower fluted storage cabinet and black horizontal rails. */}
      <RoundedBox args={[0.974, 0.213, 0.925]} radius={0.006} smoothness={3}
        position={[0, 0.115, -0.012]} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </RoundedBox>
      {fluteXs.map((x) => (
        <mesh key={"base-" + x} position={[x, 0.118, 0.456]}
          scale={[0.0027, 0.198, 0.006]} geometry={SHARED_BOX} receiveShadow>
          <primitive object={groove} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.232, 0.458]} scale={[0.946, 0.011, 0.015]} geometry={SHARED_BOX}>
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0, 0.013, 0.453]} scale={[0.946, 0.010, 0.012]} geometry={SHARED_BOX}>
        <primitive object={groove} attach="material" />
      </mesh>
      <mesh position={[0.167, 0.787, -0.083]} rotation={[0, 0, Math.PI / 2]}
        scale={[0.014, 0.578, 0.014]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
    </group>
  );
}
