import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneModel } from "../scene-model.ts";
import { GLAZED_DOOR_CROSS_RAIL_Y_RATIO, SHARED_BOX, SHARED_CYLINDER } from "../shared/architecture-primitives.ts";



export function DoorAssembly({
  door,
  angle,
  center,
  onToggleDoor,
}: {
  door: SceneModel["doors"][number];
  angle: number;
  center: [number, number, number];
  onToggleDoor?(openingId: string): void;
}) {
  const glass = door.visualStyle === "glass-clear" || door.visualStyle === "glass-frosted";
  const plainWhite = door.visualStyle === "solid-white";
  const leafMaterial = door.visualStyle === "solid-oak" ? "door-oak" : "white-matte";
  const hasOpaqueLowerPanel = glass && door.id === "hall-living-door";
  const insetBottom = -door.height / 2 + 0.09;
  const glassBottom = hasOpaqueLowerPanel ? door.height * GLAZED_DOOR_CROSS_RAIL_Y_RATIO : insetBottom;
  const glassTop = door.height / 2 - 0.09;
  return (
    <group
      name={`door-${door.id}`}
      position={center}
      rotation={[0, -angle, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onToggleDoor?.(door.id);
      }}
    >
      {glass ? (
        <>
          <mesh position={[0, (glassTop + glassBottom) / 2, 0]} scale={[door.width - 0.12, glassTop - glassBottom, 0.026]} geometry={SHARED_BOX} receiveShadow>
            <primitive object={getPlannerMaterial(door.visualStyle === "glass-clear" ? "glass-clear" : "glass-frosted")} attach="material" />
          </mesh>
          {/* The photographed lower infill meets the existing estimated crossrail height. */}
          {hasOpaqueLowerPanel ? (
            <mesh position={[0, (glassBottom + insetBottom) / 2, 0]} scale={[door.width - 0.12, glassBottom - insetBottom, 0.052]} geometry={SHARED_BOX} castShadow receiveShadow>
              <primitive object={getPlannerMaterial(leafMaterial)} attach="material" />
            </mesh>
          ) : null}
          <DoorLeafRails width={door.width} height={door.height} materialId={leafMaterial} />
        </>
      ) : (
        <>
          <mesh scale={[door.width - 0.018, door.height - 0.018, 0.052]} geometry={SHARED_BOX} castShadow receiveShadow>
            <primitive object={getPlannerMaterial(leafMaterial)} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.018]} scale={[door.width - 0.052, door.height - 0.052, 0.046]} geometry={SHARED_BOX} castShadow receiveShadow>
            <primitive object={getPlannerMaterial(leafMaterial)} attach="material" />
          </mesh>
          {!plainWhite ? [0.27, -0.27].map((y) => (
            <mesh key={y} position={[0, y * door.height, 0.043]} scale={[door.width * 0.78, door.height * 0.33, 0.012]} geometry={SHARED_BOX} castShadow>
              <primitive object={getPlannerMaterial(leafMaterial)} attach="material" />
            </mesh>
          )) : null}
          {plainWhite ? [-0.33, 0, 0.33].map((ratio) => (
            <mesh key={ratio} position={[-door.width / 2 + 0.035, ratio * door.height, 0.068]} scale={[0.035, 0.085, 0.026]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
            </mesh>
          )) : null}
        </>
      )}
      {door.leafOutlineSides === "both" ? <DoorLeafOutline door={door} /> : null}
      <DoorHandleSet door={door} />
      {door.detailProfile === "entry-security" ? <ApartmentEntryDoorDetails door={door} /> : null}
      {door.detailProfile === "vented" ? <DoorVentGrille door={door} /> : null}
    </group>
  );
}



function DoorLeafOutline({ door }: { door: SceneModel["doors"][number] }) {
  const dark = getPlannerMaterial("drawer-charcoal");
  const faceZ = door.visualStyle === "glass-clear" || door.visualStyle === "glass-frosted" ? 0.034 : 0.031;
  return (
    <group>
      {[-1, 1].flatMap((side) => [
        <mesh key={`left-${side}`} position={[-door.width / 2 + 0.026, 0, side * faceZ]} scale={[0.018, door.height - 0.045, 0.008]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>,
        <mesh key={`right-${side}`} position={[door.width / 2 - 0.026, 0, side * faceZ]} scale={[0.018, door.height - 0.045, 0.008]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>,
        <mesh key={`top-${side}`} position={[0, door.height / 2 - 0.026, side * faceZ]} scale={[door.width - 0.045, 0.018, 0.008]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>,
        <mesh key={`bottom-${side}`} position={[0, -door.height / 2 + 0.026, side * faceZ]} scale={[door.width - 0.045, 0.018, 0.008]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>,
      ])}
    </group>
  );
}



function DoorHandleSet({ door }: { door: SceneModel["doors"][number] }) {
  const metal = getPlannerMaterial("metal-satin");
  const dark = getPlannerMaterial("screen-black");
  const handleX = door.width * 0.36;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[handleX, 0.02, side * 0.074]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh scale={[0.055, 0.018, 0.055]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={metal} attach="material" />
            </mesh>
            <mesh position={[0, -side * 0.025, 0]} scale={[0.025, 0.04, 0.025]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={metal} attach="material" />
            </mesh>
          </group>
          <RoundedBox args={[0.22, 0.038, 0.04]} radius={0.016} smoothness={3} position={[handleX + 0.075, 0.02, side * 0.11]} castShadow>
            <primitive object={metal} attach="material" />
          </RoundedBox>
          <group position={[handleX, -0.115, side * 0.076]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh scale={[0.035, 0.015, 0.035]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={metal} attach="material" />
            </mesh>
            <mesh position={[0, -side * 0.017, 0]} scale={[0.008, 0.02, 0.008]} geometry={SHARED_BOX}>
              <primitive object={dark} attach="material" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}



function ApartmentEntryDoorDetails({ door }: { door: SceneModel["doors"][number] }) {
  const white = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("metal-satin");
  const dark = getPlannerMaterial("screen-black");
  return (
    <group>
      <group position={[0.12, door.height * 0.39, 0.075]}>
        <RoundedBox args={[0.34, 0.09, 0.09]} radius={0.018} smoothness={3} castShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>
        <mesh position={[-0.1, -0.055, 0.005]} rotation={[0, 0, -0.35]} scale={[0.34, 0.025, 0.025]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={metal} attach="material" />
        </mesh>
      </group>
      <group position={[0, door.height * 0.2, 0.078]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh scale={[0.028, 0.018, 0.028]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={metal} attach="material" />
        </mesh>
        <mesh position={[0, -0.012, 0]} scale={[0.012, 0.02, 0.012]} geometry={SHARED_CYLINDER}>
          <primitive object={dark} attach="material" />
        </mesh>
      </group>
      <RoundedBox args={[0.09, 0.36, 0.035]} radius={0.025} smoothness={3} position={[door.width * 0.325, -0.07, 0.064]} castShadow>
        <primitive object={metal} attach="material" />
      </RoundedBox>
      <group position={[door.width * 0.325, -0.2, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh scale={[0.025, 0.018, 0.025]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
        <mesh position={[0, -0.012, 0]} scale={[0.008, 0.022, 0.008]} geometry={SHARED_BOX}>
          <primitive object={metal} attach="material" />
        </mesh>
      </group>
    </group>
  );
}



function DoorVentGrille({ door }: { door: SceneModel["doors"][number] }) {
  const white = getPlannerMaterial("white-matte");
  const dark = getPlannerMaterial("object-neutral");
  return (
    <group position={[0, door.height * 0.34, 0.074]}>
      <RoundedBox args={[Math.min(0.48, door.width * 0.58), 0.17, 0.026]} radius={0.012} smoothness={2} castShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {[-0.052, -0.026, 0, 0.026, 0.052].map((y) => (
        <mesh key={y} position={[0, y, 0.018]} scale={[Math.min(0.4, door.width * 0.48), 0.009, 0.008]} geometry={SHARED_BOX}>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



function DoorLeafRails({ width, height, materialId }: { width: number; height: number; materialId: string }) {
  const rail = getPlannerMaterial(materialId);
  return (
    <group>
      <mesh position={[-width / 2 + 0.055, 0, 0]} scale={[0.11, height, 0.06]} geometry={SHARED_BOX} castShadow><primitive object={rail} attach="material" /></mesh>
      <mesh position={[width / 2 - 0.055, 0, 0]} scale={[0.11, height, 0.06]} geometry={SHARED_BOX} castShadow><primitive object={rail} attach="material" /></mesh>
      <mesh position={[0, height / 2 - 0.055, 0]} scale={[width, 0.11, 0.06]} geometry={SHARED_BOX} castShadow><primitive object={rail} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + 0.055, 0]} scale={[width, 0.11, 0.06]} geometry={SHARED_BOX} castShadow><primitive object={rail} attach="material" /></mesh>
      <mesh position={[0, height * GLAZED_DOOR_CROSS_RAIL_Y_RATIO, 0]} scale={[width - 0.12, 0.075, 0.062]} geometry={SHARED_BOX} castShadow><primitive object={rail} attach="material" /></mesh>
    </group>
  );
}



export function DoorFrame({ door }: { door: SceneModel["doors"][number] }) {
  const frame = getPlannerMaterial("white-matte");
  const narrowHallFrame = door.id === "hall-wc-door" || door.id === "hall-store-door";
  const jambWidth = narrowHallFrame ? 0.045 : 0.085;
  const jambOffset = narrowHallFrame ? 0.0225 : 0.035;
  const topWidth = narrowHallFrame ? door.width + 0.09 : door.width + 0.16;
  return (
    <group position={[door.frameCenter.x, door.height / 2, door.frameCenter.z]} rotation={[0, -door.frameAngle, 0]}>
      <mesh position={[-door.width / 2 - jambOffset, 0, 0]} scale={[jambWidth, door.height + 0.11, 0.13]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[door.width / 2 + jambOffset, 0, 0]} scale={[jambWidth, door.height + 0.11, 0.13]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[0, door.height / 2 + jambOffset, 0]} scale={[topWidth, jambWidth, 0.13]} geometry={SHARED_BOX} castShadow><primitive object={frame} attach="material" /></mesh>
      <mesh position={[0, -door.height / 2 + 0.014, 0]} scale={[door.width, 0.028, 0.11]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}
