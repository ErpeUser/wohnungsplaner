import { RoundedBox } from "@react-three/drei";
import { DataTexture, LinearMipmapLinearFilter, MeshStandardMaterial, RGBAFormat, SRGBColorSpace } from "three";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { ZGV_WARDROBE_LAYOUT, zgvWardrobeBoxCenters } from "../../domain/zimmer1-wardrobe-boxes.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX } from "../shared/architecture-primitives.ts";

// Original procedural cream/brown textile motif, based on the visible product style.
// No merchant image or private photo is embedded in the public repository.
let patternedFabric: MeshStandardMaterial | undefined;
function storageFabric() {
  if (patternedFabric) return patternedFabric;
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x % 8;
      const py = y % 8;
      const stroke = (px + py) % 8 === 1 || (px - py + 8) % 8 === 3 && py > 3;
      const rgb = stroke ? [224, 212, 188] : [85, 70, 58];
      const i = (y * size + x) * 4;
      data.set([rgb[0], rgb[1], rgb[2], 255], i);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  patternedFabric = new MeshStandardMaterial({
    name: "planner-material-zgv-storage-pattern", color: "#ffffff", roughness: .96, map: texture,
  });
  return patternedFabric;
}

/** All three soft-sided bags are separate 60 × 40 × 30 cm models. */
export function Zimmer1ZgvStorageBags({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const { boxWidth: w, boxHeight: h, boxDepth: d } = ZGV_WARDROBE_LAYOUT;
  const pattern = storageFabric();
  const cream = getPlannerMaterial("fabric-ecru");
  const metal = getPlannerMaterial("chrome-polished");
  const handle = getPlannerMaterial(item.materialId);
  return (
    <group name="zgv-xl-storage-bag-set">
      {zgvWardrobeBoxCenters().map((x, index) => (
        <group key={index} name={`zgv-xl-storage-bag-${index + 1}`} position={[x, 0, 0]}>
          <RoundedBox args={[w, h - .028, d - .006]} radius={.018} smoothness={4} position={[0, -.014, 0]} castShadow receiveShadow>
            <primitive object={pattern} attach="material" />
          </RoundedBox>
          <RoundedBox args={[w, .019, d]} radius={.009} smoothness={4} position={[0, h / 2 - .029, 0]} castShadow>
            <primitive object={cream} attach="material" />
          </RoundedBox>
          <RoundedBox args={[w - .004, .022, d - .004]} radius={.01} smoothness={4} position={[0, h / 2 - .011, 0]} castShadow>
            <primitive object={pattern} attach="material" />
          </RoundedBox>
          {[-1, 1].map(side => (
            <group key={side}>
              <mesh position={[side * .096, -.009, .1985]} scale={[.012, .205, .003]} geometry={SHARED_BOX}>
                <primitive object={cream} attach="material" />
              </mesh>
              <mesh position={[0, -.009 + side * .0965, .1985]} scale={[.18, .012, .003]} geometry={SHARED_BOX}>
                <primitive object={cream} attach="material" />
              </mesh>
            </group>
          ))}
          {["#e1d1b8", "#cfbda5", "#e7d8c2", "#bfa98f"].map((color, layer) => (
            <mesh key={layer} position={[0, -.081 + layer * .046, .199]} scale={[.18, .043, .001]} geometry={SHARED_BOX}>
              <meshStandardMaterial color={color} roughness={.95} />
            </mesh>
          ))}
          <mesh name="zgv-clear-front-window" position={[0, -.009, .19965]} scale={[.18, .184, .0005]} geometry={SHARED_BOX}>
            <meshStandardMaterial color="#fff4e3" roughness={.18} transparent opacity={.17} depthWrite={false} />
          </mesh>
          {[-.014, .014].map(offset => (
            <RoundedBox key={offset} args={[.008, .024, .006]} radius={.003} smoothness={3} position={[offset, .108, .196]} castShadow>
              <primitive object={metal} attach="material" />
            </RoundedBox>
          ))}
          {[-1, 1].map(side => (
            <group key={side} position={[side * (w / 2 - .004), .066, 0]}>
              {[-.065, .065].map(z => (
                <RoundedBox key={z} args={[.008, .052, .023]} radius={.004} smoothness={3} position={[0, 0, z]}>
                  <primitive object={handle} attach="material" />
                </RoundedBox>
              ))}
              <RoundedBox args={[.008, .023, .15]} radius={.004} smoothness={3} position={[0, .027, 0]}>
                <primitive object={handle} attach="material" />
              </RoundedBox>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
