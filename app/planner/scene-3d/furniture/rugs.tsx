import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { DetailStrip, SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./primitives.tsx";




export function StandardWovenRug() {
  const base = getPlannerMaterial("rug-woven");
  const edge = getPlannerMaterial("rug-gala-beige-taupe");
  return (
    <group>
      <RoundedBox args={[1, 0.018, 0.7]} radius={0.025} smoothness={3} position={[0, 0.012, 0]} receiveShadow>
        <primitive object={base} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.024, 0]} scale={[0.94, 0.006, 0.64]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <DetailStrip position={[0, 0.031, -0.29]} scale={[0.9, 0.004, 0.012]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[0, 0.031, 0.29]} scale={[0.9, 0.004, 0.012]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[-0.44, 0.031, 0]} scale={[0.012, 0.004, 0.58]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[0.44, 0.031, 0]} scale={[0.012, 0.004, 0.58]} materialId="rug-gala-beige-taupe" />
    </group>
  );
}



export function GalaShaggyRug() {
  const cream = getPlannerMaterial("rug-gala-cream");
  const taupe = getPlannerMaterial("rug-gala-taupe");
  const pattern = [
    { x: -0.4375, z: 0.25, width: 0.125, depth: 0.5, radius: 0.012 },
    { x: -0.35, z: -0.19, width: 0.05, depth: 0.38, radius: 0.04 },
    { x: -0.25, z: 0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: -0.1, z: -0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0, z: 0.185, width: 0.05, depth: 0.37, radius: 0.04 },
    { x: 0.1, z: -0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0.25, z: 0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0.35, z: -0.17, width: 0.05, depth: 0.34, radius: 0.04 },
    { x: 0.4375, z: 0.25, width: 0.125, depth: 0.5, radius: 0.012 },
  ];
  const tufts = Array.from({ length: 15 }, (_, column) =>
    Array.from({ length: 9 }, (_, row) => {
      const x = -0.455 + column * 0.065;
      const z = -0.44 + row * 0.11;
      const isTaupe = pattern.some((stripe) =>
        Math.abs(x - stripe.x) <= stripe.width / 2 && Math.abs(z - stripe.z) <= stripe.depth / 2,
      );
      return { x, z, isTaupe, lean: (column + row) % 3 === 0 ? 0.08 : -0.06 };
    }),
  ).flat();
  return (
    <group>
      <RoundedBox args={[1, 0.12, 1]} radius={0.022} smoothness={5} position={[0, 0.06, 0]} receiveShadow>
        <primitive object={cream} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.985, 0.78, 0.985]} radius={0.03} smoothness={6} position={[0, 0.5, 0]} castShadow receiveShadow>
        <primitive object={cream} attach="material" />
      </RoundedBox>
      {pattern.map((stripe, index) => (
        <RoundedBox
          key={`gala-stripe-${index}`}
          args={[stripe.width, 0.17, stripe.depth]}
          radius={stripe.radius}
          smoothness={6}
          position={[stripe.x, 0.895, stripe.z]}
          castShadow
          receiveShadow
        >
          <primitive object={taupe} attach="material" />
        </RoundedBox>
      ))}
      {tufts.map((tuft, index) => (
        <mesh
          key={`gala-tuft-${index}`}
          position={[tuft.x, 0.965, tuft.z]}
          rotation={[tuft.lean, 0, tuft.lean * 0.7]}
          scale={[0.005, 0.13, 0.007]}
          geometry={SHARED_CYLINDER}
          castShadow
        >
          <primitive object={tuft.isTaupe ? taupe : cream} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function TemuWhiteShaggyRug() {
  const ivory = getPlannerMaterial("rug-temu-shaggy-white");
  const shadow = getPlannerMaterial("rug-temu-shaggy-shadow");
  const tufts = Array.from({ length: 17 }, (_, column) =>
    Array.from({ length: 11 }, (_, row) => ({
      x: -0.46 + column * 0.0575,
      z: -0.45 + row * 0.09,
      leanX: ((column * 7 + row * 3) % 5 - 2) * 0.045,
      leanZ: ((column * 2 + row * 5) % 5 - 2) * 0.04,
      height: 0.18 + ((column * 11 + row * 7) % 5) * 0.018,
      shaded: (column + row * 2) % 13 === 0,
    })),
  ).flat();

  return (
    <group>
      <RoundedBox args={[1, 0.22, 1]} radius={0.035} smoothness={6} position={[0, 0.11, 0]} receiveShadow>
        <primitive object={ivory} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.985, 0.54, 0.985]} radius={0.045} smoothness={7} position={[0, 0.47, 0]} castShadow receiveShadow>
        <primitive object={ivory} attach="material" />
      </RoundedBox>
      {tufts.map((tuft, index) => (
        <mesh
          key={`temu-white-rug-tuft-${index}`}
          position={[tuft.x, 0.79, tuft.z]}
          rotation={[tuft.leanX, 0, tuft.leanZ]}
          scale={[0.0065, tuft.height, 0.0075]}
          geometry={SHARED_CYLINDER}
          castShadow
        >
          <primitive object={tuft.shaded ? shadow : ivory} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function TemuEasyLineRug({ materialId }: { materialId: string }) {
  const patternedFabric = getPlannerMaterial(materialId);
  return (
    <group>
      <RoundedBox args={[1, 0.18, 1]} radius={0.025} smoothness={6} position={[0, 0.72, 0]} receiveShadow>
        <primitive object={patternedFabric} attach="material" dispose={null} />
      </RoundedBox>
      <RoundedBox args={[0.992, 0.1, 0.992]} radius={0.022} smoothness={6} position={[0, 0.88, 0]} castShadow receiveShadow>
        <primitive object={patternedFabric} attach="material" dispose={null} />
      </RoundedBox>
    </group>
  );
}



export function TemuIvoryRabbitRug() {
  const base = getPlannerMaterial("rug-rabbit-pile");
  const highlight = getPlannerMaterial("rug-temu-rabbit-highlight");
  const shadow = getPlannerMaterial("rug-temu-rabbit-shadow");
  const columns = 8;
  const rows = 14;
  const bubbles = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: -0.43 + column * (0.86 / 7),
      z: -0.44 + row * (0.88 / 13),
      light: (column * 3 + row) % 5 === 0,
      rotation: ((column * 11 + row * 7) % 7 - 3) * 0.025,
    };
  });

  return (
    <group>
      <RoundedBox args={[1, 0.22, 1]} radius={0.055} smoothness={8} position={[0, 0.11, 0]} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </RoundedBox>
      {bubbles.map((bubble, index) => (
        <mesh
          key={`temu-rabbit-rug-bubble-${index}`}
          position={[bubble.x, 0.30, bubble.z]}
          rotation={[0, bubble.rotation, 0]}
          scale={[0.085, 0.16, 0.055]}
          geometry={SHARED_SPHERE}
          castShadow
          receiveShadow
        >
          <primitive object={bubble.light ? highlight : base} attach="material" />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <mesh
          key={`temu-rabbit-rug-edge-${index}`}
          position={[-0.44 + index * 0.11, 0.24, 0.485]}
          scale={[0.065, 0.11, 0.028]}
          geometry={SHARED_SPHERE}
          castShadow
        >
          <primitive object={index % 2 === 0 ? highlight : shadow} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



/** Flat, metric product with one complete ornament pattern (not a repeated fabric swatch).
 * Width/depth are scaled by the scene placement to exactly 250 × 180 cm.
 * The 20 mm representation is a visualization allowance, not manufacturer thickness. */
export function LivingIvoryGreigeRug() {
  const top = getPlannerMaterial("rug-temu-vintage-cream");
  const edge = getPlannerMaterial("rug-living-ivory-greige");
  return (
    <group>
      <RoundedBox args={[1, 0.55, 1]} radius={0.008} smoothness={4} position={[0, 0.275, 0]} receiveShadow>
        <primitive object={edge} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.557, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.99, 0.99]} />
        <primitive object={top} attach="material" />
      </mesh>
      {[-0.495, 0.495].map((z) => (
        <mesh key={`vintage-rug-hem-z-${z}`} position={[0, 0.558, z]} scale={[0.99, 0.008, 0.007]} geometry={SHARED_BOX} receiveShadow>
          <meshStandardMaterial color="#f0e9df" roughness={1} />
        </mesh>
      ))}
      {[-0.495, 0.495].map((x) => (
        <mesh key={`vintage-rug-hem-x-${x}`} position={[x, 0.558, 0]} scale={[0.007, 0.008, 0.99]} geometry={SHARED_BOX} receiveShadow>
          <meshStandardMaterial color="#f0e9df" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
