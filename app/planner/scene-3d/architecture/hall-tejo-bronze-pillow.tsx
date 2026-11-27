import { SphereGeometry } from "three";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";

// Deform a sphere into a soft square cushion; the rearward shear is in metres
// for the 40 cm reference. No merchant image or external texture is embedded.
const pillowGeometry = new SphereGeometry(1, 48, 32);
const positions = pillowGeometry.getAttribute("position");
const soften = (n: number) => Math.sign(n) * Math.pow(Math.abs(n), .52);
for (let i = 0; i < positions.count; i++) {
  const x = soften(positions.getX(i)) * .2;
  const y = soften(positions.getY(i)) * .2;
  const z = positions.getZ(i) * .06 - y * .14;
  positions.setXYZ(i, x, y, z);
}
positions.needsUpdate = true;
pillowGeometry.computeVertexNormals();
pillowGeometry.computeBoundingBox();
pillowGeometry.computeBoundingSphere();

export function HallTejoBronzePillow({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  return (
    <group name="hall-tejo-bronze-pillow">
      <mesh name="chenille-cushion-40x40" geometry={pillowGeometry}
        scale={[item.size[0] / .4, item.size[1] / .4, item.size[2] / .15]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
      </mesh>
    </group>
  );
}
