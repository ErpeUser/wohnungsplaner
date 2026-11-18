import { getPlannerMaterial } from "../materials.ts";
import type { SceneModel } from "../scene-model.ts";
import { SHARED_BOX, SHARED_CYLINDER } from "../shared/architecture-primitives.ts";



export function WindowAssembly({ window }: { window: SceneModel["windows"][number] }) {
  const frame = getPlannerMaterial("white-matte");
  const rail = 0.07;
  return (
    <group name={`window-${window.id}`} position={window.position} rotation={[0, window.rotationY, 0]}>
      <mesh scale={[window.width - rail * 1.2, window.height - rail * 1.2, 0.026]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={getPlannerMaterial("glass-clear")} attach="material" />
      </mesh>
      <mesh position={[-window.width / 2 + rail / 2, 0, 0]} scale={[rail, window.height, 0.11]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[window.width / 2 - rail / 2, 0, 0]} scale={[rail, window.height, 0.11]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[0, window.height / 2 - rail / 2, 0]} scale={[window.width, rail, 0.11]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[0, -window.height / 2 + rail / 2, 0]} scale={[window.width, rail, 0.11]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      {Array.from({ length: window.mullions }, (_, index) => (
        <mesh key={index} position={[(index + 1) * window.width / (window.mullions + 1) - window.width / 2, 0, 0.012]} scale={[0.055, window.height - rail, 0.075]} geometry={SHARED_BOX} castShadow>
          <primitive object={frame} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, -window.height / 2 - 0.035, -0.035]} scale={[window.width + 0.16, 0.055, 0.22]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={frame} attach="material" />
      </mesh>
      <mesh position={[window.width * 0.23, 0, 0.075]} scale={[0.15, 0.024, 0.024]} geometry={SHARED_CYLINDER} rotation={[0, 0, Math.PI / 2]} castShadow>
        <primitive object={frame} attach="material" />
      </mesh>
    </group>
  );
}
