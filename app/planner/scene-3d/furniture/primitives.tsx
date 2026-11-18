import { BoxGeometry, CylinderGeometry, Quaternion, SphereGeometry, Vector3 } from "three";
import { getPlannerMaterial } from "../materials.ts";



export const SHARED_BOX = new BoxGeometry(1, 1, 1);


export const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);


export const SHARED_SPHERE = new SphereGeometry(0.5, 20, 12);


export const PRIMARY_TABLETOPS = new Set([
  "dining-table-aliexpress-100-140",
  "dining-table-temu-606997-120-160",
  "dining-table-kaufland-567080013-120-160",
]);



export function DetailStrip({
  position,
  scale,
  materialId,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  scale: [number, number, number];
  materialId: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} geometry={SHARED_BOX} castShadow>
      <primitive object={getPlannerMaterial(materialId)} attach="material" />
    </mesh>
  );
}



export function FurnitureBeam({ start, end, width, depth = width, materialId = "metal-black", round = false }: {
  start: [number, number, number]; end: [number, number, number]; width: number; depth?: number; materialId?: string; round?: boolean;
}) {
  const from = new Vector3(...start);
  const to = new Vector3(...end);
  const direction = to.clone().sub(from);
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  return <mesh position={from.add(to).multiplyScalar(0.5)} quaternion={rotation} scale={[width, direction.length(), depth]} geometry={round ? SHARED_CYLINDER : SHARED_BOX} castShadow receiveShadow>
    <primitive object={getPlannerMaterial(materialId)} attach="material" />
  </mesh>;
}
