import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./primitives.tsx";



export function BlissBed() {
  const fabric = getPlannerMaterial("fabric-bliss-weave");
  const dark = getPlannerMaterial("metal-dark");
  const bedding = getPlannerMaterial("fabric-ecru");
  const taupe = getPlannerMaterial("fabric-taupe");
  const white = getPlannerMaterial("fabric-white");
  const headboardColumns = [-0.375, -0.125, 0.125, 0.375];
  const headboardRows = [0.25, 0.52, 0.79];
  const railSegments = [-0.33, -0.165, 0, 0.165, 0.33];

  return (
    <group>
      <RoundedBox args={[0.955, 0.245, 0.93]} radius={0.048} smoothness={6} position={[0, 0.17, 0.005]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.96, 0.25, 0.105]} radius={0.04} smoothness={6} position={[0, 0.2, 0.445]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {headboardColumns.map((x) => (
        <RoundedBox key={`foot-${x}`} args={[0.232, 0.218, 0.052]} radius={0.052} smoothness={6} position={[x, 0.205, 0.505]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {[-0.465, 0.465].map((x) => (
        <RoundedBox key={x} args={[0.055, 0.235, 0.82]} radius={0.032} smoothness={5} position={[x, 0.2, 0.005]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {[-0.467, 0.467].flatMap((x) => railSegments.map((z) => (
        <RoundedBox key={`rail-${x}-${z}`} args={[0.054, 0.205, 0.145]} radius={0.045} smoothness={6} position={[x, 0.205, z]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      )))}
      <mesh position={[0, 0.325, 0.01]} scale={[0.79, 0.055, 0.86]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={fabric} attach="material" />
      </mesh>
      <RoundedBox args={[0.816, 0.16, 0.895]} radius={0.055} smoothness={7} position={[0, 0.45, 0.005]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.83, 0.095, 0.84]} radius={0.05} smoothness={7} position={[0, 0.56, 0.035]} rotation={[-0.018, 0, 0]} castShadow receiveShadow>
        <primitive object={bedding} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.024]} radius={0.008} smoothness={3} position={[0, 0.62, 0.458]} castShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.024]} radius={0.008} smoothness={3} position={[0, 0.63, -0.405]} castShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      {[-0.225, 0.225].map((x) => (
        <RoundedBox key={`pillow-${x}`} args={[0.37, 0.12, 0.21]} radius={0.058} smoothness={7} position={[x, 0.68, -0.31]} rotation={[-0.14, 0, x * 0.08]} castShadow receiveShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.36, 0.13, 0.16]} radius={0.045} smoothness={7} position={[0, 0.725, -0.16]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.82, 0.055, 0.28]} radius={0.03} smoothness={6} position={[0, 0.625, 0.26]} rotation={[-0.02, 0, 0]} castShadow receiveShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.97, 0.94, 0.075]} radius={0.05} smoothness={7} position={[0, 0.51, -0.455]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {headboardRows.flatMap((y) => headboardColumns.map((x) => (
        <RoundedBox key={`${x}-${y}`} args={[0.232, 0.235, 0.06]} radius={0.058} smoothness={7} position={[x, y, -0.407]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      )))}
      {headboardRows.flatMap((y) => headboardColumns.map((x) => (
        <mesh key={`button-${x}-${y}`} position={[x, y, -0.447]} scale={[0.018, 0.018, 0.018]} geometry={SHARED_SPHERE} castShadow>
          <primitive object={taupe} attach="material" />
        </mesh>
      )))}
      {[-0.38, 0.38].flatMap((x) => [-0.34, 0.35].map((z) => [x, z] as const)).map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.023, z]} scale={[0.045, 0.045, 0.045]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function DetailedBed({ materialId }: { materialId: string }) {
  return (
    <group>
      <RoundedBox args={[0.96, 0.22, 0.96]} radius={0.045} smoothness={3} position={[0, 0.18, 0]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.94, 0.24, 0.9]} radius={0.07} smoothness={4} position={[0, 0.39, 0.02]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.91, 0.14, 0.68]} radius={0.06} smoothness={4} position={[0, 0.56, 0.1]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.96, 0.64, 0.11]} radius={0.055} smoothness={4} position={[0, 0.55, -0.45]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
      {[-0.36, -0.18, 0, 0.18, 0.36].map((x) => (
        <RoundedBox key={x} args={[0.17, 0.52, 0.055]} radius={0.06} smoothness={4} position={[x, 0.55, -0.512]} castShadow>
          <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
        </RoundedBox>
      ))}
      {[-0.24, 0.24].map((x) => (
        <RoundedBox key={x} args={[0.4, 0.12, 0.22]} radius={0.06} smoothness={4} position={[x, 0.64, -0.27]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
        </RoundedBox>
      ))}
      {[[-0.38, -0.36], [0.38, -0.36], [-0.38, 0.36], [0.38, 0.36]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.055, z]} scale={[0.06, 0.11, 0.06]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}
