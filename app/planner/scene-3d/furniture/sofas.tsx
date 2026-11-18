import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { DetailStrip, SHARED_BOX, SHARED_CYLINDER } from "./primitives.tsx";



/** Metric dimensions are applied by furnitureRenderTransform to this normalized geometry. */
export function IvoryPulloutSofa({ extended, depth = extended ? 1.72 : 0.9 }: { extended: boolean; depth?: number }) {
  const fabric = getPlannerMaterial("fabric-ali-ivory");
  const shadow = getPlannerMaterial("fabric-ali-shade");
  const metal = getPlannerMaterial("metal-black");
  const centers = [-0.235, 0.235];
  // The plan uses the complete open footprint. Cancel that extra depth for
  // the stationary body; only the sliding supports and cushions extend.
  const bodyDepth = extended ? 0.9 : depth;
  const bodyOffset = extended ? -(depth - bodyDepth) / 2 : 0;
  const footrestEnd = (depth * 0.485 - bodyOffset) / bodyDepth;
  const footrestStart = 0.33;
  const footrestDepth = footrestEnd - footrestStart;
  const footrestCenter = (footrestStart + footrestEnd) / 2;
  const railStart = 0.12;
  const railDepth = footrestEnd - railStart;
  const railCenter = (railStart + footrestEnd) / 2;
  return (
    <group position={[0, 0, bodyOffset / depth]} scale={[1, 1, bodyDepth / depth]}>
      <RoundedBox args={[0.83, 0.36, 0.76]} radius={0.055} smoothness={6} position={[0, 0.23, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {centers.map((x) => (
        <group key={x}>
          <RoundedBox args={[0.42, 0.15, 0.55]} radius={0.055} smoothness={6} position={[x, 0.47, 0.07]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.31, 0.20, 0.11]} radius={0.037} smoothness={5} position={[x, 0.62, -0.19]} rotation={[-0.15, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.40, 0.18]} radius={0.07} smoothness={7} position={[x, 0.72, -0.36]} rotation={[-0.06, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.21, 0.19]} radius={0.075} smoothness={7} position={[x, 0.89, -0.39]} rotation={[-0.1, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <DetailStrip position={[x, 0.72, -0.26]} scale={[0.34, 0.006, 0.009]} materialId="fabric-ali-seam" />
          {extended ? (
            <group>
              <DetailStrip position={[x, 0.235, railCenter]} scale={[0.3, 0.025, railDepth]} materialId="metal-black" />
              <DetailStrip position={[x - 0.10, 0.215, railCenter]} scale={[0.018, 0.018, railDepth * 0.94]} materialId="metal-black" rotation={[0.13, -0.12, 0]} />
              <DetailStrip position={[x + 0.10, 0.215, railCenter]} scale={[0.018, 0.018, railDepth * 0.94]} materialId="metal-black" rotation={[-0.13, 0.12, 0]} />
              <RoundedBox args={[0.43, 0.16, footrestDepth]} radius={0.05} smoothness={6} position={[x, 0.42, footrestCenter]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
              <DetailStrip position={[x, 0.43, footrestEnd]} scale={[0.33, 0.008, 0.012]} materialId="fabric-ali-seam" />
            </group>
          ) : <RoundedBox args={[0.43, 0.23, 0.10]} radius={0.036} smoothness={5} position={[x, 0.29, 0.39]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>}
        </group>
      ))}
      {[-0.43, 0.43].map((x) => (
        <group key={x}>
          <RoundedBox args={[0.14, 0.49, 0.75]} radius={0.065} smoothness={7} position={[x, 0.405, -0.025]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.19, 0.19, 0.74]} radius={0.08} smoothness={7} position={[x, 0.71, -0.04]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <DetailStrip position={[x, 0.34, 0]} scale={[0.005, 0.009, 0.44]} materialId="fabric-ali-seam" />
          {[-0.33, 0.27].map((z) => <mesh key={z} position={[x, 0.047, z]} scale={[0.06, 0.09, 0.065]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>)}
        </group>
      ))}
      <RoundedBox args={[0.012, 0.27, 0.32]} radius={0.01} smoothness={4} position={[-0.504, 0.31, 0.02]}><primitive object={shadow} attach="material" /></RoundedBox>
      <DetailStrip position={[-0.515, 0.44, 0.02]} scale={[0.006, 0.008, 0.28]} materialId="fabric-ali-seam" />
      <mesh position={[0.51, 0.34, 0.17]} rotation={[0, 0, Math.PI / 2]} scale={[0.058, 0.012, 0.058]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function ChicagoSofa() {
  const fabric = getPlannerMaterial("fabric-chicago-chenille");
  const seam = getPlannerMaterial("fabric-sand");
  const dark = getPlannerMaterial("metal-black");
  const control = getPlannerMaterial("screen-black");
  const seatCenters = [-0.225, 0.225];

  return (
    <group>
      <RoundedBox args={[0.84, 0.17, 0.64]} radius={0.05} smoothness={6} position={[0, 0.26, -0.01]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>

      {seatCenters.map((x) => (
        <group key={`relax-seat-${x}`}>
          <RoundedBox args={[0.43, 0.18, 0.54]} radius={0.07} smoothness={7} position={[x, 0.49, 0.1]} rotation={[-0.04, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.425, 0.14, 0.47]} radius={0.055} smoothness={7} position={[x, 0.39, 0.55]} rotation={[0.13, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.42, 0.1, 0.27]} radius={0.05} smoothness={7} position={[x, 0.315, 0.88]} rotation={[0.05, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.35, 0.012, 0.018]} radius={0.006} smoothness={3} position={[x, 0.495, 0.373]} rotation={[0.02, 0, 0]} castShadow>
            <primitive object={seam} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.34, 0.012, 0.018]} radius={0.006} smoothness={3} position={[x, 0.405, 0.79]} rotation={[0.12, 0, 0]} castShadow>
            <primitive object={seam} attach="material" />
          </RoundedBox>
          <mesh position={[x, 0.22, 0.48]} scale={[0.31, 0.035, 0.73]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[x, 0.24, 0.59]} rotation={[0.46, 0, 0]} scale={[0.035, 0.035, 0.48]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ))}

      {seatCenters.map((x) => (
        <group key={`back-${x}`}>
          <RoundedBox args={[0.43, 0.38, 0.19]} radius={0.075} smoothness={7} position={[x, 0.64, -0.29]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.43, 0.22, 0.17]} radius={0.075} smoothness={7} position={[x, 0.88, -0.37]} rotation={[-0.14, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
        </group>
      ))}

      {[-0.45, 0.45].map((x) => (
        <RoundedBox key={`arm-${x}`} args={[0.1, 0.56, 0.8]} radius={0.055} smoothness={7} position={[x, 0.5, -0.015]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.82, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.74, -0.405]} rotation={[-0.08, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.29, 0.39]} rotation={[0.02, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>

      {[
        [-0.42, -0.31, 0.18],
        [0.42, -0.31, -0.18],
        [-0.42, 0.29, 0.18],
        [0.42, 0.29, -0.18],
      ].map(([x, z, tilt], index) => (
        <mesh key={`leg-${index}`} position={[x, 0.105, z]} rotation={[z > 0 ? -0.15 : 0.15, 0, tilt]} scale={[0.035, 0.23, 0.04]} geometry={SHARED_BOX} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}

      <RoundedBox args={[0.035, 0.095, 0.14]} radius={0.015} smoothness={5} position={[0.385, 0.61, 0.06]} rotation={[0, 0, 0]} castShadow>
        <primitive object={control} attach="material" />
      </RoundedBox>
      {[-0.018, 0.018].map((z) => (
        <mesh key={`control-${z}`} position={[0.363, 0.615, 0.06 + z]} rotation={[0, 0, Math.PI / 2]} scale={[0.016, 0.008, 0.016]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function PhotoSectionalSofa() {
  const fabric = getPlannerMaterial("fabric-light-grey");
  return (
    <group>
      <RoundedBox args={[0.98, 0.22, 0.7]} radius={0.055} smoothness={4} position={[0, 0.2, -0.02]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      <RoundedBox args={[0.34, 0.22, 0.98]} radius={0.055} smoothness={4} position={[-0.32, 0.2, 0.02]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[-0.29, 0.02, 0.33].map((x) => (
        <RoundedBox key={x} args={[0.285, 0.15, 0.43]} radius={0.06} smoothness={4} position={[x, 0.4, 0.11]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      ))}
      <RoundedBox args={[0.285, 0.15, 0.39]} radius={0.06} smoothness={4} position={[-0.29, 0.4, 0.5]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[-0.3, 0, 0.3].map((x) => (
        <RoundedBox key={x} args={[0.28, 0.42, 0.16]} radius={0.07} smoothness={4} position={[x, 0.64, -0.31]} rotation={[-0.08, 0, 0]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      ))}
      <RoundedBox args={[0.14, 0.42, 0.76]} radius={0.07} smoothness={4} position={[-0.47, 0.52, 0.03]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      <RoundedBox args={[0.14, 0.38, 0.45]} radius={0.07} smoothness={4} position={[0.47, 0.48, 0.1]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[[-0.4, -0.28], [0.4, -0.28], [-0.4, 0.42], [0.4, 0.25]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.06, z]} scale={[0.04, 0.12, 0.04]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}



export function StandardSofa() {
  const fabric = getPlannerMaterial("fabric-sand");
  const seam = getPlannerMaterial("fabric-light-grey");
  const dark = getPlannerMaterial("metal-black");
  const seatCenters = [-0.32, 0, 0.32];

  return (
    <group>
      <RoundedBox args={[0.96, 0.18, 0.72]} radius={0.055} smoothness={6} position={[0, 0.24, 0.02]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {seatCenters.map((x) => (
        <group key={`standard-sofa-seat-${x}`}>
          <RoundedBox args={[0.29, 0.17, 0.53]} radius={0.065} smoothness={6} position={[x, 0.4, 0.08]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.285, 0.32, 0.16]} radius={0.06} smoothness={6} position={[x, 0.64, -0.27]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <DetailStrip position={[x, 0.485, 0.36]} scale={[0.22, 0.01, 0.014]} materialId="fabric-light-grey" />
        </group>
      ))}
      {[-0.48, 0.48].map((x) => (
        <RoundedBox key={`standard-sofa-arm-${x}`} args={[0.12, 0.5, 0.72]} radius={0.06} smoothness={6} position={[x, 0.5, 0.02]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.88, 0.11, 0.12]} radius={0.03} smoothness={4} position={[0, 0.79, -0.31]} rotation={[-0.08, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
      {[
        [-0.37, -0.27],
        [0.37, -0.27],
        [-0.37, 0.31],
        [0.37, 0.31],
      ].map(([x, z], index) => (
        <mesh key={`standard-sofa-foot-${index}`} position={[x, 0.08, z]} rotation={[0, 0, index % 2 === 0 ? -0.08 : 0.08]} scale={[0.055, 0.16, 0.055]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
