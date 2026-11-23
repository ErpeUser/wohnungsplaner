import { RoundedBox } from "@react-three/drei";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "../shared/architecture-primitives.ts";



export function WallpaperFinish({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const paper = getPlannerMaterial(item.materialId);
  const seam = getPlannerMaterial("wallpaper-vintage-brown-fabric");
  const slatCount = Math.max(1, Math.floor(width / 0.72));
  return (
    <group name={`wallpaper-finish-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={paper} attach="material" />
      </mesh>
      {Array.from({ length: slatCount - 1 }, (_, index) => {
        const x = -width / 2 + (index + 1) * width / slatCount;
        return (
          <mesh key={`wallpaper-seam-${index}`} position={[x, 0, depth / 2 + 0.004]} scale={[0.006, height, 0.008]} geometry={SHARED_BOX}>
            <primitive object={seam} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}



export function ZimmerWallPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const count = 8;
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={4} castShadow receiveShadow><primitive object={getPlannerMaterial("fabric-light-grey")} attach="material" /></RoundedBox>
      {Array.from({ length: count - 1 }, (_, index) => (
        <mesh key={index} position={[-width / 2 + width * (index + 1) / count, 0, depth / 2 + 0.004]} scale={[0.012, height * 0.9, 0.01]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("fabric-anthracite")} attach="material" /></mesh>
      ))}
    </group>
  );
}



export function DeskLedMirror({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.045} smoothness={5} castShadow receiveShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.075, height - 0.075, depth + 0.012]} radius={0.04} smoothness={5} position={[0, 0, depth * 0.18]} castShadow><primitive object={getPlannerMaterial("mirror-glass")} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.14, height - 0.14, depth + 0.02]} radius={0.035} smoothness={5} position={[0, 0, depth * 0.3]}>
        <meshBasicMaterial color="#f4efe2" transparent opacity={0.2} />
      </RoundedBox>
      <pointLight position={[0, 0, depth * 0.65]} color="#fff2d4" intensity={0.24} distance={1.45} decay={2} />
    </group>
  );
}



export function WindowCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const folds = 7;
  return (
    <group>
      {Array.from({ length: folds }, (_, index) => (
        <RoundedBox key={index} args={[width / folds * 1.18, height, depth * (index % 2 === 0 ? 0.75 : 1)]} radius={0.025} smoothness={3} position={[-width / 2 + width * (index + 0.5) / folds, 0, index % 2 === 0 ? -depth * 0.08 : depth * 0.08]} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("fabric-light-grey")} attach="material" />
        </RoundedBox>
      ))}
      <mesh position={[0, height / 2 + 0.045, 0]} rotation={[0, 0, Math.PI / 2]} scale={[height * 0.015, width * 1.16, height * 0.015]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}



export function Zimmer1WallArtPair({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const frameWidth = (width - 0.1) / 2;
  const gap = 0.1;
  const centers = [-(frameWidth + gap) / 2, (frameWidth + gap) / 2];
  return (
    <group>
      {centers.map((x, index) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedBox args={[frameWidth, height, depth]} radius={0.018} smoothness={4} castShadow receiveShadow>
            <primitive object={getPlannerMaterial("oak-light")} attach="material" />
          </RoundedBox>
          <mesh position={[0, 0, depth / 2 + 0.006]} scale={[frameWidth - 0.055, height - 0.055, 0.014]} geometry={SHARED_BOX} castShadow>
            <primitive object={getPlannerMaterial("paper-cream")} attach="material" />
          </mesh>
          {index === 0 ? (
            <group position={[0, -height * 0.02, depth / 2 + 0.022]} rotation={[0, 0, -0.12]}>
              <mesh scale={[0.018, height * 0.54, 0.012]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("paper-taupe")} attach="material" /></mesh>
              {[-0.16, -0.02, 0.12].flatMap((y, leafIndex) => [
                <mesh key={`l-${leafIndex}`} position={[-0.075, y, 0]} rotation={[0, 0, -0.55]} scale={[0.12, 0.055, 0.014]} geometry={SHARED_SPHERE}><primitive object={getPlannerMaterial("paper-taupe")} attach="material" /></mesh>,
                <mesh key={`r-${leafIndex}`} position={[0.075, y + 0.05, 0]} rotation={[0, 0, 0.55]} scale={[0.12, 0.055, 0.014]} geometry={SHARED_SPHERE}><primitive object={getPlannerMaterial("paper-taupe")} attach="material" /></mesh>,
              ])}
            </group>
          ) : (
            <group position={[0, -height * 0.04, depth / 2 + 0.022]}>
              <mesh position={[-0.055, -0.05, 0]} scale={[0.18, 0.32, 0.014]} geometry={SHARED_SPHERE}><primitive object={getPlannerMaterial("paper-taupe")} attach="material" /></mesh>
              <mesh position={[0.07, 0.1, 0]} scale={[0.16, 0.23, 0.014]} geometry={SHARED_SPHERE}><primitive object={getPlannerMaterial("fabric-taupe")} attach="material" /></mesh>
            </group>
          )}
        </group>
      ))}
      <mesh position={[0, -height / 2 - 0.012, 0]} scale={[Math.min(width, 1.04), 0.012, depth]} geometry={SHARED_BOX}>
        <primitive object={getPlannerMaterial("paint-warm-taupe")} attach="material" />
      </mesh>
    </group>
  );
}



export function Zimmer1EntrySlimArt({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.012} smoothness={4} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("oak-light")} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.007]} scale={[width - 0.028, height - 0.034, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={getPlannerMaterial("paper-cream")} attach="material" />
      </mesh>
      <mesh position={[-width * 0.08, height * 0.08, depth / 2 + 0.021]} scale={[width * 0.42, height * 0.24, 0.009]} geometry={SHARED_SPHERE} castShadow>
        <primitive object={getPlannerMaterial("paper-taupe")} attach="material" />
      </mesh>
      <mesh position={[width * 0.12, -height * 0.16, depth / 2 + 0.022]} scale={[width * 0.35, height * 0.2, 0.009]} geometry={SHARED_SPHERE} castShadow>
        <primitive object={getPlannerMaterial("ceramic-beige")} attach="material" />
      </mesh>
    </group>
  );
}



export function Zimmer1HeadboardLed({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.012} smoothness={4} castShadow>
        <meshStandardMaterial color="#ffd8a0" emissive="#ffb65d" emissiveIntensity={2.2} roughness={0.3} />
      </RoundedBox>
      <pointLight position={[0, 0.08, depth * 2.2]} color="#ffd6a0" intensity={0.55} distance={2.15} decay={2} />
    </group>
  );
}



export function Zimmer1HeadboardSconces({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * width * 0.43, 0, 0]}>
          <RoundedBox args={[0.11, height * 0.72, depth * 0.28]} radius={0.035} smoothness={4} position={[0, 0, -depth * 0.28]} castShadow>
            <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
          </RoundedBox>
          <mesh position={[0, -height * 0.05, depth * 0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[0.055, depth * 2.4, 0.055]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
          </mesh>
          <mesh position={[0, -height * 0.15, depth * 0.62]} scale={[0.19, 0.14, 0.13]} geometry={SHARED_SPHERE} castShadow>
            <meshStandardMaterial color="#e7cfa8" emissive="#ffcf8b" emissiveIntensity={0.78} roughness={0.52} />
          </mesh>
          <pointLight position={[0, -height * 0.2, depth * 1.2]} color="#ffd29a" intensity={0.22} distance={1.3} decay={2} />
        </group>
      ))}
    </group>
  );
}



export function Zimmer1LayeredCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const sheerWidth = width * 0.72;
  const sheerFolds = 11;
  const sidePanelWidth = width * 0.18;
  return (
    <group>
      {Array.from({ length: sheerFolds }, (_, index) => (
        <RoundedBox
          key={`sheer-${index}`}
          args={[sheerWidth / sheerFolds * 1.2, height * 0.985, depth * (index % 2 === 0 ? 0.48 : 0.68)]}
          radius={0.018}
          smoothness={3}
          position={[-sheerWidth / 2 + sheerWidth * (index + 0.5) / sheerFolds, -height * 0.005, index % 2 === 0 ? -depth * 0.08 : depth * 0.04]}
          castShadow
          receiveShadow
        >
          <primitive object={getPlannerMaterial("fabric-ecru-sheer")} attach="material" />
        </RoundedBox>
      ))}
      {[-1, 1].flatMap((side) => Array.from({ length: 3 }, (_, index) => (
        <RoundedBox
          key={`taupe-${side}-${index}`}
          args={[sidePanelWidth / 3 * 1.25, height, depth * (index % 2 === 0 ? 0.88 : 1.05)]}
          radius={0.024}
          smoothness={4}
          position={[side * (width / 2 - sidePanelWidth / 2) + (index - 1) * sidePanelWidth / 3, 0, depth * 0.05]}
          castShadow
          receiveShadow
        >
          <primitive object={getPlannerMaterial("fabric-taupe")} attach="material" />
        </RoundedBox>
      )))}
      <mesh position={[0, height / 2 + 0.025, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.016, width * 1.03, 0.016]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
      </mesh>
    </group>
  );
}



export function Zimmer1DeskShelf({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const isMain = item.catalogId === "zimmer1-desk-shelf-main";
  const isUpperSide = item.catalogId === "zimmer1-desk-shelf-side-upper";
  const isSkateWotan = item.materialId === "oak-wotan";
  const face = getPlannerMaterial(isSkateWotan ? "oak-wotan" : "oak-artisan");
  const edge = getPlannerMaterial(isSkateWotan ? "oak-wotan-edge" : "oak-artisan-edge");
  return (
    <group name={"wallboard-" + item.source.id}>
      {/* Real product thickness: SKATE 18 mm, SIMPLE 38 mm. */}
      <RoundedBox args={[width, height, depth]} radius={Math.min(0.004, height * 0.18)} smoothness={3} castShadow receiveShadow>
        <primitive object={face} attach="material" />
      </RoundedBox>
      <mesh geometry={SHARED_BOX} scale={[width * 0.99, height * 0.65, 0.0015]} position={[0, 0, depth / 2 + 0.0004]} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      {isMain ? (
        <>
          <group position={[-width * 0.38, height / 2 + 0.095, 0]}>
            <RoundedBox args={[0.14, 0.17, 0.12]} radius={0.035} smoothness={4} castShadow><primitive object={getPlannerMaterial("ceramic-beige")} attach="material" /></RoundedBox>
            {[-0.052, 0, 0.052].map((x, index) => <mesh key={x} position={[x, 0.14 + index * 0.016, 0]} rotation={[0, 0, x * 5]} scale={[0.065, 0.15, 0.052]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("leaf-olive")} attach="material" /></mesh>)}
          </group>
          {[-0.16, -0.095, -0.03].map((x, index) => <mesh key={x} position={[x, height / 2 + 0.13 + index * 0.012, 0]} scale={[0.038, 0.25 - index * 0.025, depth * 0.72]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(index === 1 ? "paper-taupe" : "paper-cream")} attach="material" /></mesh>)}
          <RoundedBox args={[0.16, 0.2, 0.12]} radius={0.065} smoothness={5} position={[width * 0.13, height / 2 + 0.1, 0]} castShadow><primitive object={getPlannerMaterial("paper-cream")} attach="material" /></RoundedBox>
          <RoundedBox args={[0.2, 0.13, 0.14]} radius={0.05} smoothness={5} position={[width * 0.36, height / 2 + 0.065, 0]} castShadow><primitive object={getPlannerMaterial("ceramic-beige")} attach="material" /></RoundedBox>
        </>
      ) : (
        <>
          <RoundedBox args={[Math.min(width * 0.5, 0.16), isUpperSide ? 0.17 : 0.13, Math.min(depth * 0.72, 0.12)]} radius={0.04} smoothness={4} position={[0, height / 2 + (isUpperSide ? 0.085 : 0.065), 0]} castShadow><primitive object={getPlannerMaterial(isUpperSide ? "paper-cream" : "ceramic-beige")} attach="material" /></RoundedBox>
          {!isUpperSide ? <mesh position={[0, height / 2 + 0.18, 0]} scale={[0.1, 0.12, 0.08]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("leaf-olive")} attach="material" /></mesh> : null}
        </>
      )}
    </group>
  );
}



export function Zimmer1DeskAccessories({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width * 0.3, 0.035, depth * 0.72]} radius={0.018} smoothness={4} position={[-width * 0.31, -height / 2 + 0.025, 0]} castShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>
      <RoundedBox args={[0.09, height * 0.58, 0.09]} radius={0.018} smoothness={4} position={[width * 0.29, -height * 0.18, 0]} castShadow><primitive object={getPlannerMaterial("ceramic-beige")} attach="material" /></RoundedBox>
      {[-0.025, 0, 0.025].map((x) => <mesh key={x} position={[width * 0.29 + x, height * 0.18, 0]} rotation={[0, 0, x * 7]} scale={[0.012, height * 0.55, 0.012]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>)}
      <RoundedBox args={[0.18, 0.025, depth * 0.5]} radius={0.015} smoothness={4} position={[-width * 0.31, -height * 0.23, 0]} castShadow><primitive object={getPlannerMaterial("paper-cream")} attach="material" /></RoundedBox>
    </group>
  );
}



export function Zimmer1EntryNiche({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const shelfYs = [-height * 0.22, height * 0.02, height * 0.26];
  return (
    <group>
      <RoundedBox args={[width, height, depth * 0.35]} radius={0.012} smoothness={3} position={[0, 0, -depth * 0.3]} castShadow receiveShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>
      {shelfYs.map((y, index) => (
        <group key={y} position={[0, y, depth * 0.12]}>
          <RoundedBox args={[width * 0.94, 0.035, depth]} radius={0.01} smoothness={3} castShadow receiveShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>
          <RoundedBox args={[width * 0.4, 0.1 + index * 0.018, depth * 0.45]} radius={0.03} smoothness={4} position={[0, 0.07 + index * 0.009, 0]} castShadow><primitive object={getPlannerMaterial(index === 1 ? "paper-cream" : "ceramic-beige")} attach="material" /></RoundedBox>
          {index === 2 ? <mesh position={[0, 0.2, 0]} scale={[width * 0.32, 0.11, depth * 0.3]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("leaf-olive")} attach="material" /></mesh> : null}
        </group>
      ))}
      <RoundedBox args={[0.018, height * 0.94, 0.018]} radius={0.008} smoothness={3} position={[width * 0.4, 0, depth * 0.28]}>
        <meshStandardMaterial color="#ffd49a" emissive="#ffb45b" emissiveIntensity={2.1} roughness={0.35} />
      </RoundedBox>
      <pointLight position={[0, 0.15, depth * 0.7]} color="#ffd6a0" intensity={0.32} distance={1.35} decay={2} />
    </group>
  );
}



export function Zimmer1WardrobeTopDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const boxWidth = width * 0.29;
  return (
    <group>
      {[-1, 0, 1].map((slot) => (
        <group key={slot} position={[slot * width * 0.33, 0, 0]}>
          <RoundedBox args={[boxWidth, height, depth]} radius={0.045} smoothness={5} castShadow receiveShadow>
            <primitive object={getPlannerMaterial(slot === 0 ? "fabric-ecru" : "fabric-taupe")} attach="material" />
          </RoundedBox>
          {[-0.32, -0.1, 0.12, 0.34].map((offset) => (
            <mesh key={offset} position={[offset * boxWidth, 0, depth / 2 + 0.008]} scale={[0.009, height * 0.82, 0.012]} geometry={SHARED_BOX}>
              <primitive object={getPlannerMaterial("oak-light")} attach="material" />
            </mesh>
          ))}
          <RoundedBox args={[boxWidth * 0.3, 0.035, 0.018]} radius={0.012} smoothness={3} position={[0, height * 0.12, depth / 2 + 0.018]} castShadow>
            <primitive object={getPlannerMaterial("oak-light")} attach="material" />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}



export function Zimmer1NightstandDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width * 0.42, 0.025, depth * 0.72]} radius={0.018} smoothness={4} position={[width * 0.2, -height / 2 + 0.018, 0]} castShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>

    </group>
  );
}
