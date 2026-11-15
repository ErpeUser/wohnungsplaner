"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo, type ReactNode } from "react";
import { BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace, TextureLoader, TorusGeometry } from "three";

import { getPlannerMaterial } from "./materials.ts";
import type { SceneFixture, SceneFloor, SceneModel, SceneObject, SceneWall, SceneWallSegment } from "./scene-model.ts";
import type { PlannerBuiltIn } from "../domain/types.ts";

const SHARED_BOX = new BoxGeometry(1, 1, 1);
const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);
const SHARED_CIRCLE = new CircleGeometry(0.5, 48);
const SHARED_PLANE = new PlaneGeometry(1, 1);
const SHARED_SPHERE = new SphereGeometry(0.5, 28, 18);
const SHARED_TORUS = new TorusGeometry(0.5, 0.1, 12, 32);
const SHARED_MIRROR_LED = new TorusGeometry(0.5, 0.026, 10, 48);
const BALCONY_LOOP = new TorusGeometry(0.075, 0.011, 8, 18, Math.PI);
const GLAZED_DOOR_CROSS_RAIL_Y_RATIO = -0.18;
const VORRAUM_PLANT_TEXTURE = new TextureLoader().load("/planner-assets/textures/vorraum-wandpflanzgefaess.svg");
VORRAUM_PLANT_TEXTURE.colorSpace = SRGBColorSpace;
VORRAUM_PLANT_TEXTURE.flipY = false;
VORRAUM_PLANT_TEXTURE.needsUpdate = true;

export function PlannerArchitecture({
  scene,
  selectionId,
  onSelect,
  onToggleDoor,
  cutaway = false,
  walkthrough = false,
  hiddenWallIds = [],
  hiddenOpeningIds = [],
  hiddenObjectIds = [],
  hiddenFixtureIds = [],
}: {
  scene: SceneModel;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onToggleDoor?(openingId: string): void;
  cutaway?: boolean;
  walkthrough?: boolean;
  hiddenWallIds?: readonly string[];
  hiddenOpeningIds?: readonly string[];
  hiddenObjectIds?: readonly string[];
  hiddenFixtureIds?: readonly string[];
}) {
  const hiddenWalls = useMemo(() => new Set(hiddenWallIds), [hiddenWallIds]);
  const hiddenOpenings = useMemo(() => new Set(hiddenOpeningIds), [hiddenOpeningIds]);
  const hiddenObjects = useMemo(() => new Set(hiddenObjectIds), [hiddenObjectIds]);
  const hiddenFixtures = useMemo(() => new Set(hiddenFixtureIds), [hiddenFixtureIds]);
  return (
    <group onPointerMissed={() => onSelect(null)}>
      {scene.floors.map((floor) => <Floor key={floor.id} floor={floor} />)}
      {scene.walls.filter((wall) => !isBalconyExteriorWall(wall) && !hiddenWalls.has(wall.id)).flatMap((wall) => wall.segments.map((wallSegment) => (
        <WallSegmentMesh
          key={wallSegment.id}
          wall={wall}
          segment={wallSegment}
        />
      )))}
      <BalconyArchitecture scene={scene} showRoof={walkthrough} />
      {scene.windows.filter((window) => !hiddenOpenings.has(window.id)).map((window) => <WindowAssembly key={window.id} window={window} />)}
      {scene.doors.filter((door) => !hiddenOpenings.has(door.id)).map((door) => {
        const angle = door.state === "open" ? door.displayOpenAngle : door.baseAngle;
        const center: [number, number, number] = [
          door.hinge.x + Math.cos(angle) * door.width / 2,
          door.height / 2,
          door.hinge.z + Math.sin(angle) * door.width / 2,
        ];
        return (
          <group key={door.id}>
            <DoorFrame door={door} />
            <DoorAssembly door={door} angle={angle} center={center} onToggleDoor={onToggleDoor} />
          </group>
        );
      })}
      {scene.builtIns.filter((item) => !hiddenObjects.has(item.id)).map((item) => (
        <ObjectBox key={item.id} item={item} selected={selectionId === item.id} onSelect={onSelect} />
      ))}
      {scene.fixtures
        .filter((fixture) => !hiddenFixtures.has(fixture.id))
        .filter((fixture) => !cutaway || (fixture.kind !== "ceiling-light" && fixture.kind !== "smoke-detector"))
        .map((fixture) => <FixtureMarker key={fixture.id} fixture={fixture} />)}
    </group>
  );
}

function isBalconyExteriorWall(wall: SceneWall) {
  return wall.id.startsWith("wall-balkon-");
}

function BalconyArchitecture({ scene, showRoof }: { scene: SceneModel; showRoof: boolean }) {
  const floor = scene.floors.find((candidate) => candidate.roomId === "balkon");
  const exteriorWalls = scene.walls.filter(isBalconyExteriorWall);
  const roofShape = useMemo(() => {
    if (!floor) return null;
    const shape = new Shape();
    floor.points.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, -point.z);
      else shape.lineTo(point.x, -point.z);
    });
    shape.closePath();
    return shape;
  }, [floor]);

  if (!floor || exteriorWalls.length === 0) return null;
  const columnPoints = exteriorWalls.flatMap((wall) => [wall.start, wall.end]);
  const uniqueColumns = columnPoints.filter((point, index) => (
    columnPoints.findIndex((candidate) => Math.hypot(candidate.x - point.x, candidate.z - point.z) < 0.02) === index
  ));

  return (
    <group name="balcony-photo-architecture">
      {exteriorWalls.map((wall) => <BalconyRailingSegment key={wall.id} wall={wall} showRoof={showRoof} />)}
      {uniqueColumns.map((point, index) => (
        <group key={`${point.x}-${point.z}`} position={[point.x, 1.62, point.z]}>
          <mesh scale={[0.09, 1.8, 0.09]} geometry={SHARED_BOX} castShadow receiveShadow>
            <primitive object={getPlannerMaterial("balcony-rail-rust")} attach="material" />
          </mesh>
          {index === uniqueColumns.length - 1 ? (
            <mesh position={[0, -0.88, 0]} scale={[0.2, 0.025, 0.2]} geometry={SHARED_BOX} castShadow>
              <primitive object={getPlannerMaterial("metal-dark")} attach="material" />
            </mesh>
          ) : null}
        </group>
      ))}
      {roofShape ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.53, 0]} receiveShadow castShadow>
          <shapeGeometry args={[roofShape]} />
          {showRoof ? (
            <primitive object={getPlannerMaterial("balcony-ceiling")} attach="material" side={DoubleSide} />
          ) : (
            <meshStandardMaterial color="#c9c9c4" roughness={0.9} transparent opacity={0.24} depthWrite={false} side={DoubleSide} />
          )}
        </mesh>
      ) : null}
    </group>
  );
}

function BalconyRailingSegment({ wall, showRoof }: { wall: SceneWall; showRoof: boolean }) {
  const length = wall.length;
  const midpoint: [number, number, number] = [
    (wall.start.x + wall.end.x) / 2,
    0,
    (wall.start.z + wall.end.z) / 2,
  ];
  const loopCount = Math.max(1, Math.floor((length - 0.16) / 0.2));
  return (
    <group position={midpoint} rotation={[0, -wall.angle, 0]}>
      <mesh position={[0, 0.34, 0]} scale={[length, 0.68, 0.13]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("balcony-parapet-grey")} attach="material" />
      </mesh>
      <mesh position={[0, 0.705, 0]} scale={[length + 0.055, 0.055, 0.19]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("balcony-coping-grey")} attach="material" />
      </mesh>
      {[0.745, 1.13].map((height) => (
        <mesh key={height} position={[0, height, 0]} scale={[length, 0.035, 0.045]} geometry={SHARED_BOX} castShadow>
          <primitive object={getPlannerMaterial("balcony-rail-rust")} attach="material" />
        </mesh>
      ))}
      {Array.from({ length: loopCount }, (_, index) => {
        const x = -length / 2 + length * (index + 0.5) / loopCount;
        return (
          <group key={index} position={[x, 0, 0]}>
            {[-0.075, 0.075].map((offset) => (
              <mesh key={offset} position={[offset, 0.94, 0]} scale={[0.022, 0.34, 0.022]} geometry={SHARED_CYLINDER} castShadow>
                <primitive object={getPlannerMaterial("balcony-rail-rust")} attach="material" />
              </mesh>
            ))}
            <mesh position={[0, 0.775, 0]} rotation={[0, 0, Math.PI]} geometry={BALCONY_LOOP} castShadow>
              <primitive object={getPlannerMaterial("balcony-rail-rust")} attach="material" />
            </mesh>
          </group>
        );
      })}
      {showRoof ? (
        <mesh position={[0, 2.525, 0]} scale={[length + 0.08, 0.15, 0.25]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("balcony-ceiling")} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}

function WallSegmentMesh({ wall, segment }: { wall: SceneWall; segment: SceneWallSegment }) {
  const base = getPlannerMaterial(wall.materialId);
  const positive = getPlannerMaterial(wall.sideMaterialIds[0]);
  const negative = getPlannerMaterial(wall.sideMaterialIds[1]);
  return (
    <mesh
      position={segment.position}
      rotation={[0, segment.rotationY, 0]}
      scale={segment.size}
      geometry={SHARED_BOX}
      material={[base, base, base, base, positive, negative]}
      castShadow
      receiveShadow
    />
  );
}

function DoorAssembly({
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

function DoorFrame({ door }: { door: SceneModel["doors"][number] }) {
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

function WindowAssembly({ window }: { window: SceneModel["windows"][number] }) {
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

function FixtureMarker({ fixture }: { fixture: SceneFixture }) {
  const white = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("metal-satin");
  const dark = getPlannerMaterial("screen-black");
  const plate = (children?: ReactNode) => (
    <group>
      <RoundedBox args={[0.12, 0.12, 0.025]} radius={0.018} smoothness={3} castShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {children}
    </group>
  );
  return (
    <group name={`fixture-${fixture.id}`} position={fixture.position} rotation={[0, fixture.rotationY, 0]}>
      {fixture.kind === "ceiling-light" ? (fixture.id === "fixture-z1-light" ? <Zimmer1RattanPendant /> : <BareBulb />) : null}
      {fixture.kind === "smoke-detector" ? (
        <group>
          <mesh scale={[0.2, 0.045, 0.2]} geometry={SHARED_CYLINDER} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, -0.026, 0]} scale={[0.13, 0.012, 0.13]} geometry={SHARED_CYLINDER}><primitive object={getPlannerMaterial("object-neutral")} attach="material" /></mesh>
        </group>
      ) : null}
      {fixture.kind === "switch" || fixture.kind === "blind-control" ? plate(
        <RoundedBox args={[0.072, 0.068, 0.018]} radius={0.012} smoothness={2} position={[0, 0, 0.018]} castShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>,
      ) : null}
      {fixture.kind === "outlet" ? plate(
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.018]}>
          <mesh scale={[0.065, 0.014, 0.065]} geometry={SHARED_CYLINDER}><primitive object={white} attach="material" /></mesh>
          {[-0.018, 0.018].map((x) => <mesh key={x} position={[x, -0.01, 0.015]} scale={[0.009, 0.008, 0.009]} geometry={SHARED_CYLINDER}><primitive object={dark} attach="material" /></mesh>)}
        </group>,
      ) : null}
      {fixture.kind === "intercom" ? (
        <group>
          {/* Recorded user size: 125 × 165 mm. The unchanged mounting centre keeps the lower edge at 133 cm. */}
          <RoundedBox args={[0.125, 0.165, 0.035]} radius={0.004} smoothness={3} position={[0, 0, 0.014]} castShadow><primitive object={white} attach="material" /></RoundedBox>
          <mesh position={[0, 0.034, 0.034]} scale={[0.104, 0.066, 0.004]} geometry={SHARED_BOX}><primitive object={dark} attach="material" /></mesh>
          {[-0.028, 0, 0.028].map((x) => <mesh key={x} position={[x, -0.043, 0.034]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.004, 0.009]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>)}
        </group>
      ) : null}
      {fixture.detailProfile === "hall-distribution" ? (
        <group position={[0, 0, fixture.surfaceOffset]}>
          <HallDistributionCluster depth={fixture.mountingDepth} />
        </group>
      ) : null}
      {fixture.kind === "distribution-panel" && fixture.detailProfile !== "hall-distribution" ? (
        <group>
          <RoundedBox args={[0.43, 0.57, 0.035]} radius={0.018} smoothness={2} castShadow><primitive object={white} attach="material" /></RoundedBox>
          <mesh position={[0, 0, 0.025]} scale={[0.385, 0.525, 0.012]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("paint-white")} attach="material" /></mesh>
          <mesh position={[0.165, 0, 0.045]} scale={[0.018, 0.05, 0.04]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
        </group>
      ) : null}
      {fixture.detailProfile === "hall-revision" ? (
        <group position={[0, 0, fixture.surfaceOffset]}>
          <HallFloorHeatingPanel depth={fixture.mountingDepth} />
        </group>
      ) : null}
    </group>
  );
}

function HallDistributionCluster({ depth }: { depth: number }) {
  const white = getPlannerMaterial("white-matte");
  const face = getPlannerMaterial("paint-white");
  const metal = getPlannerMaterial("metal-satin");
  const seam = getPlannerMaterial("#5f5c57");
  return (
    <group>
      <mesh position={[0, -0.008, -depth / 2]} scale={[0.76, 0.86, 0.004]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={seam} attach="material" />
      </mesh>
      <RoundedBox args={[0.73, 0.83, depth]} radius={0.004} smoothness={2}>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {[-0.18, 0.18].map((x) => (
        <group key={x} position={[x, 0, depth / 2 + 0.001]}>
          <mesh scale={[0.34, 0.77, 0.002]} geometry={SHARED_BOX}><primitive object={seam} attach="material" /></mesh>
          <mesh position={[0, 0, 0.0015]} scale={[0.318, 0.746, 0.001]} geometry={SHARED_BOX}><primitive object={face} attach="material" /></mesh>
          {[0.255, 0.225, 0.195].map((y) => (
            <mesh key={y} position={[-0.015, y, 0.0025]} scale={[0.23, 0.009, 0.001]} geometry={SHARED_BOX}>
              <primitive object={seam} attach="material" />
            </mesh>
          ))}
          <mesh position={[0, 0.05, 0.0025]} scale={[0.2, 0.055, 0.001]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("#ece8df")} attach="material" /></mesh>
          <mesh position={[0.135, -0.08, 0.003]} scale={[0.018, 0.065, 0.002]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
          {[-0.155, 0.155].map((y) => (
            <group key={y} position={[-0.135, y, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh scale={[0.012, 0.001, 0.012]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function HallFloorHeatingPanel({ depth }: { depth: number }) {
  const white = getPlannerMaterial("white-matte");
  const face = getPlannerMaterial("paint-white");
  const metal = getPlannerMaterial("metal-satin");
  const seam = getPlannerMaterial("#5f5c57");
  return (
    <group>
      <mesh position={[0, -0.006, -depth / 2]} scale={[0.8, 0.46, 0.004]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={seam} attach="material" />
      </mesh>
      <RoundedBox args={[0.77, 0.43, depth]} radius={0.004} smoothness={2}>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.001]} scale={[0.725, 0.385, 0.002]} geometry={SHARED_BOX}>
        <primitive object={seam} attach="material" />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.0025]} scale={[0.7, 0.36, 0.001]} geometry={SHARED_BOX}>
        <primitive object={face} attach="material" />
      </mesh>
      <mesh position={[0.3, 0, depth / 2 + 0.003]} scale={[0.02, 0.065, 0.002]} geometry={SHARED_BOX}>
        <primitive object={metal} attach="material" />
      </mesh>
      {[-0.3, 0.3].map((x) => [-0.12, 0.12].map((y) => (
        <group key={`${x}-${y}`} position={[x, y, depth / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh scale={[0.011, 0.001, 0.011]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
        </group>
      )))}
    </group>
  );
}

function BareBulb() {
  return (
    <group>
      <mesh position={[0, -0.055, 0]} scale={[0.065, 0.11, 0.065]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[0, -0.18, 0]} scale={[0.14, 0.19, 0.14]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></mesh>
      <pointLight position={[0, -0.2, 0]} intensity={0.22} color="#ffe0b0" distance={2.1} decay={2} />
    </group>
  );
}

function Zimmer1RattanPendant() {
  const oak = getPlannerMaterial("oak-light");
  const dark = getPlannerMaterial("metal-dark");
  return (
    <group>
      <mesh position={[0, -0.16, 0]} scale={[0.025, 0.32, 0.025]} geometry={SHARED_CYLINDER} castShadow><primitive object={dark} attach="material" /></mesh>
      <mesh position={[0, -0.36, 0]} scale={[0.05, 0.1, 0.05]} geometry={SHARED_CYLINDER} castShadow><primitive object={dark} attach="material" /></mesh>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = index * Math.PI * 2 / 16;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.16, -0.49, Math.sin(angle) * 0.16]}
            rotation={[0.34 * Math.sin(angle), -angle, 0.34 * Math.cos(angle)]}
            scale={[0.012, 0.34, 0.012]}
            geometry={SHARED_CYLINDER}
            castShadow
          >
            <primitive object={oak} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, -0.49, 0]} scale={[0.075, 0.1, 0.075]} geometry={SHARED_SPHERE}>
        <meshStandardMaterial color="#fff0cf" emissive="#ffc870" emissiveIntensity={1.25} roughness={0.32} />
      </mesh>
      <pointLight position={[0, -0.49, 0]} color="#ffd39a" intensity={0.5} distance={3.1} decay={2} />
    </group>
  );
}

function Floor({ floor }: { floor: SceneFloor }) {
  const shape = useMemo(() => {
    const next = new Shape();
    floor.points.forEach((point, index) => {
      if (index === 0) next.moveTo(point.x, -point.z);
      else next.lineTo(point.x, -point.z);
    });
    next.closePath();
    return next;
  }, [floor.points]);
  const floorMaterial = useMemo(() => {
    const base = getPlannerMaterial(floor.materialId);
    const clone = base.clone();
    clone.name = `${base.name}-${floor.id}`;
    if (clone.map) {
      const width = Math.max(...floor.points.map((point) => point.x)) - Math.min(...floor.points.map((point) => point.x));
      const depth = Math.max(...floor.points.map((point) => point.z)) - Math.min(...floor.points.map((point) => point.z));
      const isWood = floor.materialId.includes("parquet") || floor.materialId.includes("oak");
      const isTile = floor.materialId.includes("tile") || floor.materialId.includes("porcelain");
      // Tile atlases contain two cells across their 0..1 UV range.  A 0.64 m
      // UV repeat therefore produces the photographed 32 cm floor modules;
      // the previous 0.32 m repeat made the grout read as tiny mosaic.
      const scale = isWood ? 0.42 : isTile ? 0.64 : null;
      clone.map = clone.map.clone();
      if (scale) clone.map.repeat.set(Math.max(1, width / scale), Math.max(1, depth / scale));
      clone.map.needsUpdate = true;
      if (clone.bumpMap) {
        clone.bumpMap = clone.map;
        clone.bumpScale = isTile ? 0.022 : isWood ? 0.018 : 0.006;
      }
      clone.needsUpdate = true;
    }
    return clone;
  }, [floor]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <primitive object={floorMaterial} attach="material" side={DoubleSide} />
    </mesh>
  );
}

function ObjectBox({
  item,
  selected,
  onSelect,
}: {
  item: SceneObject<PlannerBuiltIn>;
  selected: boolean;
  onSelect(id: string | null): void;
}) {
  return (
    <group
      position={item.position}
      rotation={[0, item.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item.id);
      }}
    >
      <ParametricBuiltIn item={item} />
      {selected ? (
        <mesh scale={item.size.map((value) => value * 1.015) as [number, number, number]} geometry={SHARED_BOX}>
          <meshBasicMaterial color="#d46f3a" wireframe transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

function ParametricBuiltIn({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  if (item.renderProfile === "bathtub") {
    const [width, height, depth] = item.size;
    return (
      <group>
        <RoundedBox args={[width, height, depth]} radius={0.075} smoothness={4} castShadow receiveShadow><primitive object={getPlannerMaterial("ceramic-white")} attach="material" /></RoundedBox>
        <RoundedBox args={[width * 0.72, height * 0.42, depth * 0.8]} radius={0.11} smoothness={4} position={[0, height * 0.34, 0]} receiveShadow><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></RoundedBox>
      </group>
    );
  }
  if (item.renderProfile === "washer") {
    const [width, height, depth] = item.size;
    return (
      <group>
        <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={3} castShadow receiveShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></RoundedBox>
        <mesh position={[0, -height * 0.08, depth / 2 + 0.016]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.54, 0.04, width * 0.54]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        <mesh position={[0, -height * 0.08, depth / 2 + 0.048]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.43, 0.028, width * 0.43]} geometry={SHARED_CYLINDER}><primitive object={getPlannerMaterial("glass-frosted")} attach="material" /></mesh>
        <mesh position={[0, height * 0.34, depth / 2 + 0.018]} scale={[width * 0.9, height * 0.16, 0.03]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
        <mesh position={[width * 0.29, height * 0.34, depth / 2 + 0.045]} rotation={[Math.PI / 2, 0, 0]} scale={[0.11, 0.045, 0.11]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        <mesh position={[-width * 0.2, height * 0.34, depth / 2 + 0.045]} scale={[width * 0.28, height * 0.06, 0.018]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      </group>
    );
  }
  if (item.renderProfile === "wall-wc") {
    const [width, height, depth] = item.size;
    return (
      <group>
        <mesh position={[0, -height * 0.04, depth * 0.07]} scale={[width, height * 0.72, depth]} geometry={SHARED_SPHERE} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("white-matte")} attach="material" />
        </mesh>
        <mesh position={[0, height * 0.27, depth * 0.09]} scale={[width * 0.72, 0.035, depth * 0.56]} geometry={SHARED_CYLINDER}>
          <primitive object={getPlannerMaterial("glass-frosted")} attach="material" />
        </mesh>
        <mesh position={[0, height * 0.34, depth * 0.07]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.72, depth * 0.56, 0.055]} geometry={SHARED_TORUS} castShadow>
          <primitive object={getPlannerMaterial("white-matte")} attach="material" />
        </mesh>
        <mesh position={[0, height * 0.12, -depth * 0.39]} scale={[width * 0.88, height * 0.62, depth * 0.18]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("white-matte")} attach="material" />
        </mesh>
      </group>
    );
  }
  if (item.catalogId === "living-slat-wall") {
    const slatCount = Math.max(18, Math.round(item.size[0] / 0.055));
    return (
      <group>
        <mesh scale={item.size} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        {Array.from({ length: slatCount }, (_, index) => (
          <mesh key={index} position={[(index - (slatCount - 1) / 2) * item.size[0] / slatCount, 0, item.size[2] / 2 + 0.018]} scale={[item.size[0] / (slatCount * 1.75), item.size[1], 0.025]} geometry={SHARED_BOX} castShadow>
            <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
          </mesh>
        ))}
      </group>
    );
  }
  if (item.catalogId === "bath-tub-apron" || item.catalogId === "bath-tub-end-ledge" || item.catalogId === "bath-tub-side-apron") return <BathTiledFinish item={item} />;
  if (item.catalogId === "wc-flush-plate") return <WcFlushPlate item={item} />;
  if (item.catalogId === "wc-revision-panel") return <WcRevisionPanel item={item} />;
  if (item.catalogId === "wall-finish-vintage-fabric-wallpaper") return <WallpaperFinish item={item} />;
  if (item.catalogId === "floor-zone-kitchen") return <KitchenFloorZone item={item} />;
  if (item.catalogId === "kitchen-worktop") return <KitchenWorktop item={item} />;
  if (item.catalogId === "kitchen-backsplash-oak") return <KitchenBacksplash item={item} />;
  if (item.catalogId === "kitchen-base") return <KitchenBase item={item} />;
  if (item.catalogId === "kitchen-corner-base") return <KitchenCornerBase item={item} />;
  if (item.catalogId === "kitchen-upper") return <KitchenUpper item={item} />;
  if (item.catalogId === "kitchen-corner-upper") return <KitchenCornerUpper item={item} />;
  if (item.catalogId === "kitchen-fridge") return <KitchenFridge item={item} />;
  if (item.catalogId === "kitchen-sink") return <KitchenSink item={item} />;
  if (item.catalogId === "kitchen-hob") return <KitchenHob item={item} />;
  if (item.catalogId === "kitchen-oven") return <KitchenOven item={item} />;
  if (item.catalogId === "kitchen-hood") return <KitchenHood item={item} />;
  if (item.catalogId === "kitchen-microwave") return <KitchenMicrowave item={item} />;
  if (item.catalogId === "living-tv") return <LivingTelevision item={item} />;
  if (item.catalogId === "living-floating-cabinet") return <LivingFloatingCabinet item={item} />;
  if (item.catalogId === "living-moss-panel") return <MossPanel item={item} />;
  if (item.catalogId === "living-clock") return <WallClock item={item} />;
  if (item.catalogId === "living-wall-light") return <WallLight item={item} />;
  if (item.catalogId === "sanitary-washbasin") return <Washbasin item={item} />;
  if (item.catalogId === "bath-round-mirror") return <BathRoundMirror item={item} />;
  if (item.catalogId === "bath-towel-hooks-wood-black") return <BathTowelHookRail item={item} />;
  if (item.catalogId === "bath-mat" || item.catalogId === "wc-mat") return <BathMat item={item} />;
  if (item.catalogId === "bath-shower-rod") return <BathShowerRod item={item} />;
  if (item.catalogId === "bath-shower-curtain") return <BathShowerCurtain item={item} />;
  if (item.catalogId === "bath-basin-cabinet-scout") return <ScoutBasinCabinet item={item} />;
  if (item.catalogId === "bath-washer-cabinet-scout") return <ScoutWasherCabinet item={item} />;
  if (item.catalogId === "bath-shower-set") return <BathShowerSet item={item} />;
  if (item.catalogId === "wc-paper-holder") return <WcPaperHolder item={item} />;
  if (item.catalogId === "wc-brush") return <WcBrush item={item} />;
  if (item.catalogId === "zimmer1-wall-panel") return <ZimmerWallPanel item={item} />;
  if (item.catalogId === "zimmer1-desk-mirror") return <DeskLedMirror item={item} />;
  if (item.catalogId === "window-curtain") return <WindowCurtain item={item} />;
  if (item.catalogId === "zimmer1-wall-art-pair") return <Zimmer1WallArtPair item={item} />;
  if (item.catalogId === "zimmer1-entry-slim-art") return <Zimmer1EntrySlimArt item={item} />;
  if (item.catalogId === "zimmer1-headboard-led") return <Zimmer1HeadboardLed item={item} />;
  if (item.catalogId === "zimmer1-headboard-sconces") return <Zimmer1HeadboardSconces item={item} />;
  if (item.catalogId === "zimmer1-layered-curtain") return <Zimmer1LayeredCurtain item={item} />;
  if (item.catalogId.startsWith("zimmer1-desk-shelf-")) return <Zimmer1DeskShelf item={item} />;
  if (item.catalogId === "zimmer1-desk-accessories") return <Zimmer1DeskAccessories item={item} />;
  if (item.catalogId === "zimmer1-entry-niche") return <Zimmer1EntryNiche item={item} />;
  if (item.catalogId === "zimmer1-wardrobe-top-decor") return <Zimmer1WardrobeTopDecor item={item} />;
  if (item.catalogId === "zimmer1-nightstand-decor") return <Zimmer1NightstandDecor item={item} />;
  if (item.catalogId === "vorraum-wall-decor") return <VorraumWallDecor item={item} />;
  return (
    <mesh scale={item.size} geometry={SHARED_BOX} castShadow receiveShadow>
      <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
    </mesh>
  );
}

function VorraumWallDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, , depth] = item.size;
  // A 48 x 62 cm print is legible at the entrance while keeping both door
  // handles and the coat unit visually clear.
  const frameWidth = 0.48;
  const frameHeight = 0.62;
  const frameDepth = 0.038;
  // The wall is the negative-local-Z side after the -90° wall rotation.
  // Put the *whole* decoration on the room side.  Moving only the paper and
  // plates still left the frame intersecting the wall and made it disappear
  // from oblique camera angles.
  const front = -(depth / 2 + 0.012);
  const frameSurface = -(frameDepth / 2 + 0.018);
  const plantDiameter = 0.25;
  const plantSurface = front - 0.028;
  return (
    <group name="vorraum-wall-decor">
      <group position={[width * 0.26, 0.19, front]}>
        <RoundedBox args={[frameWidth, frameHeight, frameDepth]} radius={0.012} smoothness={4} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("oak-light")} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0, frameSurface]} scale={[frameWidth - 0.045, frameHeight - 0.045, 0.012]} geometry={SHARED_BOX} renderOrder={30}>
          <meshBasicMaterial color="#f2e6d5" side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh position={[-0.035, -0.01, frameSurface - 0.008]} scale={[0.014, 0.19, 0.01]} geometry={SHARED_BOX} renderOrder={31}>
          <meshBasicMaterial color="#a7835f" side={DoubleSide} depthTest={false} />
        </mesh>
        {[-0.08, 0.02, 0.11].flatMap((y, index) => [
          <mesh key={`left-${index}`} position={[-0.085, y, frameSurface - 0.009]} rotation={[0, 0, -0.45]} scale={[0.095, 0.036, 0.012]} geometry={SHARED_SPHERE} renderOrder={32}>
            <meshBasicMaterial color="#ad8963" side={DoubleSide} depthTest={false} />
          </mesh>,
          <mesh key={`right-${index}`} position={[0.02, y + 0.025, frameSurface - 0.009]} rotation={[0, 0, 0.45]} scale={[0.095, 0.036, 0.012]} geometry={SHARED_SPHERE} renderOrder={32}>
            <meshBasicMaterial color="#ad8963" side={DoubleSide} depthTest={false} />
          </mesh>,
        ])}
      </group>
      {/* Supplied wall-plant SVG. The physical scale is the exact diameter:
          0.25 m = 25 cm. */}
      <group position={[width * 0.34, -0.19, plantSurface]}>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[plantDiameter, plantDiameter, 0.02]} geometry={SHARED_CIRCLE} renderOrder={40}>
          <meshBasicMaterial color="#ede4d5" side={DoubleSide} depthTest={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[plantDiameter, plantDiameter, 1]} geometry={SHARED_PLANE} renderOrder={41}>
          <meshBasicMaterial map={VORRAUM_PLANT_TEXTURE} transparent={false} toneMapped={false} side={DoubleSide} depthTest={false} />
        </mesh>
        {[[-0.045, 0.035, 0.06, 0.035], [0.01, 0.06, 0.055, 0.03], [-0.015, -0.005, 0.045, 0.025], [0.045, -0.055, 0.05, 0.028]].map(([x, y, sx, sy], index) => (
          <mesh key={`plant-leaf-${index}`} position={[x, y, -0.012]} rotation={[0, Math.PI / 2, index % 2 ? 0.28 : -0.28]} scale={[sx, sy, 0.008]} geometry={SHARED_SPHERE} renderOrder={42}>
            <meshBasicMaterial color={index % 2 ? "#71845d" : "#87996e"} toneMapped={false} side={DoubleSide} depthTest={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}


function BathTiledFinish({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tile = getPlannerMaterial(item.materialId);
  const grout = getPlannerMaterial("tile-grout");
  const vertical = height > 0.06;
  const joint = vertical ? Math.min(0.012, depth * 0.12) : Math.min(0.006, width * 0.02);
  const jointCount = Math.max(1, Math.floor(width / 0.32));

  return (
    <group name={`bath-tiled-finish-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      <mesh position={[0, height / 2 + 0.002, 0]} scale={[Math.max(0.04, width - joint), 0.004, Math.max(0.04, depth - joint)]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      {Array.from({ length: jointCount }, (_, index) => {
        const x = -width / 2 + (index + 1) * width / (jointCount + 1);
        return (
          <mesh key={`bath-joint-x-${index}`} position={[x, vertical ? 0 : height / 2 + 0.006, depth / 2 + 0.002]} scale={[0.006, vertical ? height : 0.004, 0.008]} geometry={SHARED_BOX}>
            <primitive object={grout} attach="material" />
          </mesh>
        );
      })}
      {vertical ? (
        <mesh position={[0, 0, depth / 2 + 0.003]} scale={[width, 0.006, 0.008]} geometry={SHARED_BOX}>
          <primitive object={grout} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}

function WcFlushPlate({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const plate = getPlannerMaterial("metal-satin");
  const rocker = getPlannerMaterial("white-matte");
  return (
    <group name={`wc-flush-plate-${item.source.id}`}>
      <RoundedBox args={[width, height, depth]} radius={0.008} smoothness={3} castShadow receiveShadow>
        <primitive object={plate} attach="material" />
      </RoundedBox>
      {/* Internal proportions are estimated from the reference; the plate envelope is unchanged. */}
      <mesh position={[-width * 0.125, 0, depth / 2 + 0.006]} scale={[width * 0.46, height * 0.56, 0.01]} geometry={SHARED_BOX}>
        <primitive object={rocker} attach="material" />
      </mesh>
      <mesh position={[width * 0.235, 0, depth / 2 + 0.006]} scale={[width * 0.24, height * 0.56, 0.01]} geometry={SHARED_BOX}>
        <primitive object={rocker} attach="material" />
      </mesh>
    </group>
  );
}

function WcRevisionPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tile = getPlannerMaterial(item.materialId);
  const frame = getPlannerMaterial("tile-grout");
  return (
    <group name={`wc-revision-panel-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={tile} attach="material" />
      </mesh>
      <mesh position={[0, 0, depth / 2 + 0.006]} scale={[Math.max(0.04, width - 0.028), Math.max(0.04, height - 0.028), 0.008]} geometry={SHARED_BOX}>
        <primitive object={frame} attach="material" />
      </mesh>
    </group>
  );
}

function WallpaperFinish({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function KitchenBacksplash({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const wood = getPlannerMaterial(item.materialId);
  const edge = getPlannerMaterial("oak-artisan-edge");
  return (
    <group name={`kitchen-backsplash-${item.source.id}`}>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} renderOrder={12} castShadow receiveShadow>
        <primitive object={wood} attach="material" />
      </mesh>
      {/* A slim lower and side reveal keeps the veneer legible where it meets
          the worktop and makes the panel read as a mounted wall finish. */}
      <mesh position={[0, -height / 2 + 0.012, depth / 2 + 0.006]} scale={[Math.max(0.04, width - 0.018), 0.024, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[-width / 2 + 0.008, 0, depth / 2 + 0.006]} scale={[0.016, height, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[width / 2 - 0.008, 0, depth / 2 + 0.006]} scale={[0.016, height, 0.012]} geometry={SHARED_BOX} renderOrder={13} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
    </group>
  );
}

function KitchenFloorZone({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const tileSize = 0.32;
  const tileHeight = Math.min(height, 0.006);
  const tileMaterial = useMemo(() => {
    const base = getPlannerMaterial(item.materialId);
    const clone = base.clone();
    clone.name = `${base.name}-${item.source.id}`;
    if (base.map) {
      clone.map = base.map.clone();
      // The generated tile atlas contains two 32-px cells across its 64-px
      // texture. Repeat at half the apparent tile count so the rendered
      // joints are the measured 32 cm grid, rather than 16 cm micro-tiles.
      clone.map.repeat.set(Math.max(1, width / (tileSize * 2)), Math.max(1, depth / (tileSize * 2)));
      clone.map.needsUpdate = true;
    }
    return clone;
  }, [depth, item.materialId, item.source.id, width]);
  return (
    <group>
      <mesh position={[0, -height / 2 + tileHeight / 2, 0]} scale={[width, tileHeight, depth]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={tileMaterial} attach="material" />
      </mesh>
      <group position={[0, -height / 2 + tileHeight + 0.0015, 0]}>
        {Array.from({ length: Math.max(1, Math.floor(width / tileSize)) }, (_, index) => {
          const x = -width / 2 + (index + 1) * tileSize;
          return x < width / 2 - 0.015 ? (
            <mesh key={`tile-x-${index}`} position={[x, 0, 0]} scale={[0.009, 0.004, depth]} geometry={SHARED_BOX}>
              <primitive object={getPlannerMaterial("tile-grout")} attach="material" />
            </mesh>
          ) : null;
        })}
        {Array.from({ length: Math.max(1, Math.floor(depth / tileSize)) }, (_, index) => {
          const z = -depth / 2 + (index + 1) * tileSize;
          return z < depth / 2 - 0.015 ? (
            <mesh key={`tile-z-${index}`} position={[0, 0, z]} scale={[width, 0.004, 0.009]} geometry={SHARED_BOX}>
              <primitive object={getPlannerMaterial("tile-grout")} attach="material" />
            </mesh>
          ) : null;
        })}
      </group>
    </group>
  );
}

function KitchenWorktop({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, thickness, depth] = item.size;
  const worktop = getPlannerMaterial("kitchen-worktop-black");
  const edge = getPlannerMaterial("metal-dark");
  const bevel = Math.min(0.018, Math.max(0.004, thickness * 0.4));
  return (
    <group name={`kitchen-worktop-${item.source.id}`}>
      <RoundedBox
        args={[width, thickness, depth]}
        radius={bevel}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <primitive object={worktop} attach="material" />
      </RoundedBox>
      <mesh position={[0, thickness / 2 + 0.003, 0]} scale={[Math.max(0.04, width - 0.034), 0.006, Math.max(0.04, depth - 0.034)]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={worktop} attach="material" />
      </mesh>
      {/* The front edge catches a narrow highlight and separates the slab
          from the glossy white cabinet faces below it. */}
      <mesh position={[0, -thickness * 0.16, depth / 2 + 0.006]} scale={[Math.max(0.04, width - 0.028), thickness * 0.54, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[0, thickness / 2 + 0.008, 0]} scale={[Math.max(0.04, width - 0.12), 0.003, 0.003]} geometry={SHARED_BOX}>
        <meshBasicMaterial color="#5d6461" transparent opacity={0.48} />
      </mesh>
    </group>
  );
}

function KitchenCornerBase({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  const plinth = getPlannerMaterial("kitchen-plinth-grey");
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + 0.045, 0]} scale={[width - 0.025, 0.09, depth - 0.025]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
      <mesh position={[0, -height * 0.035, depth / 2 + 0.014]} scale={[width - 0.02, height * 0.79, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[width / 2 + 0.014, -height * 0.035, 0]} scale={[0.028, height * 0.79, depth - 0.02]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, height * 0.28, depth / 2 + 0.038]} scale={[width * 0.48, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width / 2 + 0.038, height * 0.28, 0]} scale={[0.02, 0.018, depth * 0.48]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}

function KitchenBase({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  const plinth = getPlannerMaterial("kitchen-plinth-grey");

  if (item.source.id === "builtin-kitchen-base-west") {
    const segments = [
      { width: 0.45, kind: "drawers" },
      { width: 0.15, kind: "door" },
      { width: 0.6, kind: "oven" },
      { width: Math.max(0.3, width - 1.2), kind: "drawers" },
    ] as const;
    let cursor = -width / 2;
    return (
      <group>
        <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
        {segments.map((segment, index) => {
          const x = cursor + segment.width / 2;
          cursor += segment.width;
          if (segment.kind === "drawers") {
            return (
              <group key={index} position={[x, 0, 0]}>
                <mesh scale={[segment.width - 0.012, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
                <group position={[0, 0, depth / 2 + 0.013]}>
                  {[0.27, -0.02, -0.31].map((y, drawerIndex) => (
                    <group key={drawerIndex} position={[0, y * height, 0]}>
                      <mesh scale={[segment.width - 0.018, height * 0.275, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
                      <mesh position={[0, height * 0.075, 0.027]} scale={[segment.width * 0.56, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
                    </group>
                  ))}
                </group>
              </group>
            );
          }
          if (segment.kind === "oven") {
            return null;
          }
          return (
            <group key={index} position={[x, 0, 0]}>
              <mesh scale={[segment.width - 0.012, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
              <group position={[0, -height * 0.04, depth / 2 + 0.013]}>
                <mesh scale={[segment.width - 0.018, height * 0.78, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
                <mesh position={[0, height * 0.31, 0.027]} scale={[segment.width * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
              </group>
            </group>
          );
        })}
      </group>
    );
  }

  if (item.source.id === "builtin-kitchen-base-north") {
    const moduleCount = Math.max(2, Math.round(width / 0.62));
    const moduleWidths = Array.from({ length: moduleCount }, () => width / moduleCount);
    let cursor = -width / 2;
    return (
      <group>
        <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
        {moduleWidths.map((moduleWidth, index) => {
          const x = cursor + moduleWidth / 2;
          cursor += moduleWidth;
          return (
            <group key={index} position={[x, -height * 0.035, depth / 2 + 0.013]}>
              <mesh scale={[moduleWidth - 0.018, height * 0.79, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
              <mesh position={[0, height * 0.315, 0.027]} scale={[moduleWidth * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
            </group>
          );
        })}
      </group>
    );
  }

  const modules = Math.max(1, Math.round(width / 0.55));
  const moduleWidth = width / modules;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + 0.045, 0.035]} scale={[width - 0.03, 0.09, depth + 0.015]} geometry={SHARED_BOX} castShadow><primitive object={plinth} attach="material" /></mesh>
      {Array.from({ length: modules }, (_, index) => {
        const x = -width / 2 + moduleWidth * (index + 0.5);
        return (
          <group key={index} position={[x, 0, depth / 2 + 0.012]}>
            <mesh position={[0, -height * 0.1, 0]} scale={[moduleWidth - 0.018, height * 0.72, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, height * 0.34, 0.002]} scale={[moduleWidth - 0.018, height * 0.17, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, height * 0.245, 0.026]} scale={[moduleWidth * 0.58, 0.026, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        );
      })}
    </group>
  );
}

function KitchenUpper({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  if (item.source.id === "builtin-kitchen-upper-north") {
    const moduleWidth = width / 2;
    return (
      <group>
        <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        {[0].map((index) => (
          <group key={index} position={[-width / 2 + moduleWidth * (index + 0.5), 0, depth / 2 + 0.012]}>
            <mesh scale={[moduleWidth - 0.016, height - 0.018, 0.026]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, -height * 0.39, 0.027]} scale={[moduleWidth * 0.58, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        ))}
        <group position={[width / 2 - moduleWidth / 2, 0, depth / 2 + 0.013]}>
          <mesh position={[0, height * 0.33, 0]} scale={[moduleWidth - 0.016, height * 0.31, 0.027]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, height * 0.225, 0.027]} scale={[moduleWidth * 0.58, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
          <mesh position={[0, -height * 0.12, 0.002]} scale={[moduleWidth - 0.024, height * 0.52, 0.029]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
        </group>
      </group>
    );
  }
  const modules = item.source.id === "builtin-kitchen-upper-west"
    ? 2
    : Math.max(1, Math.round(width / 0.58));
  const moduleWidth = width / modules;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      {Array.from({ length: modules }, (_, index) => (
        <group key={index} position={[-width / 2 + moduleWidth * (index + 0.5), 0, depth / 2 + 0.012]}>
          <mesh scale={[moduleWidth - 0.016, height - 0.018, 0.026]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0, -height * 0.4, 0.027]} scale={[moduleWidth * 0.68, 0.018, 0.02]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}

function KitchenCornerUpper({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const white = getPlannerMaterial("kitchen-white-gloss");
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.018} smoothness={3} castShadow receiveShadow><primitive object={white} attach="material" /></RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.014]} scale={[width - 0.02, height - 0.02, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, -height * 0.4, depth / 2 + 0.035]} scale={[width * 0.48, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}

function KitchenFridge({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const body = getPlannerMaterial(item.materialId);
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={4} castShadow receiveShadow><primitive object={body} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.035, height * 0.72, 0.028]} radius={0.018} smoothness={3} position={[0, height * 0.12, depth / 2 + 0.014]} castShadow><primitive object={body} attach="material" /></RoundedBox>
      <RoundedBox args={[width - 0.035, height * 0.235, 0.028]} radius={0.018} smoothness={3} position={[0, -height * 0.375, depth / 2 + 0.015]} castShadow><primitive object={body} attach="material" /></RoundedBox>
      <mesh position={[0, -height * 0.245, depth / 2 + 0.034]} scale={[width * 0.88, 0.012, 0.012]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.02, height * 0.22, depth / 2 + 0.036]} scale={[width * 0.12, height * 0.035, 0.012]} geometry={SHARED_BOX}><meshBasicMaterial color="#153b50" /></mesh>
      {[0, 1, 2].map((index) => <mesh key={index} position={[-width * 0.025 + index * width * 0.025, height * 0.22, depth / 2 + 0.045]} scale={[0.008, 0.008, 0.008]} geometry={SHARED_SPHERE}><meshBasicMaterial color="#7fd7ff" /></mesh>)}
    </group>
  );
}

function KitchenSink({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[width, 0.032, depth]} radius={0.035} smoothness={4} castShadow><primitive object={metal} attach="material" /></RoundedBox>
      <RoundedBox args={[width * 0.76, 0.045, depth * 0.7]} radius={0.055} smoothness={4} position={[-width * 0.05, -0.018, 0]} receiveShadow><primitive object={getPlannerMaterial("#73797a")} attach="material" /></RoundedBox>
      <mesh position={[-width * 0.05, 0.008, depth * 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.012, 0.045]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.32, height * 0.86, -depth * 0.3]} scale={[0.035, height * 1.7, 0.035]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[width * 0.2, height * 1.55, -depth * 0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.032, 0.17]} geometry={SHARED_TORUS} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}

function KitchenHob({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z], index) => (
        <mesh key={index} position={[x * width, height / 2 + 0.008, z * depth]} rotation={[Math.PI / 2, 0, 0]} scale={[width * (index % 2 ? 0.2 : 0.17), 0.012, width * (index % 2 ? 0.2 : 0.17)]} geometry={SHARED_TORUS}>
          <primitive object={getPlannerMaterial("metal-satin")} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function KitchenOven({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width * 0.98, height * 0.98, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      <RoundedBox args={[width * 0.9, height * 0.62, 0.032]} radius={0.018} smoothness={3} position={[0, -height * 0.11, depth / 2 + 0.018]} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></RoundedBox>
      <mesh position={[0, height * 0.15, depth / 2 + 0.045]} scale={[width * 0.72, 0.024, 0.024]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, height * 0.34, depth / 2 + 0.02]} scale={[width * 0.92, height * 0.19, 0.034]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      {[-0.32, 0.32].map((x) => <mesh key={x} position={[x * width, height * 0.34, depth / 2 + 0.045]} scale={[0.05, 0.026, 0.05]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]}><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>)}
    </group>
  );
}

function KitchenHood({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh position={[0, height * 0.56, -depth * 0.22]} scale={[width * 0.28, height * 0.88, depth * 0.3]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("cabinet-black")} attach="material" />
      </mesh>
      <mesh position={[0, height * 0.14, -depth * 0.14]} scale={[width * 0.82, height * 0.45, depth * 0.28]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      <RoundedBox args={[width * 0.9, height * 0.55, depth * 0.16]} radius={0.018} smoothness={4} position={[0, -height * 0.05, depth * 0.08]} rotation={[-0.1, 0, 0]} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></RoundedBox>
      <mesh position={[0, -height * 0.35, depth * 0.035]} scale={[width * 0.78, 0.018, depth * 0.44]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[0, -height * 0.37, depth * 0.28]} scale={[width * 0.34, 0.006, 0.018]} geometry={SHARED_BOX}>
        <meshBasicMaterial color="#ffe2b0" />
      </mesh>
    </group>
  );
}

function KitchenMicrowave({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[-width * 0.08, 0, depth / 2 + 0.012]} scale={[width * 0.68, height * 0.7, 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      <mesh position={[width * 0.38, height * 0.16, depth / 2 + 0.025]} scale={[0.045, 0.045, 0.03]} geometry={SHARED_CYLINDER} rotation={[Math.PI / 2, 0, 0]}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[width * 0.37, -height * 0.08, depth / 2 + 0.025]} scale={[0.055, height * 0.28, 0.022]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
    </group>
  );
}

function LivingTelevision({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.012]} scale={[width * 0.94, height * 0.9, 0.018]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("tv-display")} attach="material" /></mesh>
      <mesh position={[0, -height * 0.43, depth / 2 + 0.025]} scale={[0.08, 0.012, 0.012]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}

function LivingFloatingCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("cabinet-black")} attach="material" /></mesh>
      {[-1, 0, 1].map((index) => (
        <mesh key={index} position={[index * width / 3, 0, depth / 2 + 0.014]} scale={[width / 3 - 0.015, height - 0.018, 0.028]} geometry={SHARED_BOX} castShadow>
          <primitive object={getPlannerMaterial("drawer-charcoal")} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, height / 2 + 0.014, 0]} scale={[width + 0.025, 0.028, depth + 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
    </group>
  );
}

function MossPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("moss-green")} attach="material" /></mesh>
      {Array.from({ length: 18 }, (_, index) => (
        <mesh key={index} position={[(index % 6 - 2.5) * item.size[0] / 6, (Math.floor(index / 6) - 1) * item.size[1] / 3, item.size[2] / 2 + 0.025]} scale={[item.size[0] / 5.2, item.size[1] / 2.5, 0.045]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial(index % 3 === 0 ? "leaf-green" : "moss-green")} attach="material" /></mesh>
      ))}
    </group>
  );
}

function WallClock({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const silver = getPlannerMaterial("metal-satin");
  return (
    <group>
      {/* The reference shows a square, profiled silver frame. Its relief is simplified. */}
      <mesh position={[0, 0, -depth * 0.4]} scale={[width, height, depth * 0.2]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * width * 0.435, 0, depth * 0.1]} scale={[width * 0.13, height, depth * 0.8]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
          <mesh position={[0, side * height * 0.435, depth * 0.1]} scale={[width * 0.74, height * 0.13, depth * 0.8]} geometry={SHARED_BOX} castShadow><primitive object={silver} attach="material" /></mesh>
          <mesh position={[side * width * 0.3725, 0, depth * 0.37]} scale={[width * 0.035, height * 0.78, depth * 0.18]} geometry={SHARED_BOX}><primitive object={silver} attach="material" /></mesh>
          <mesh position={[0, side * height * 0.3725, depth * 0.37]} scale={[width * 0.71, height * 0.035, depth * 0.18]} geometry={SHARED_BOX}><primitive object={silver} attach="material" /></mesh>
        </group>
      ))}
      <mesh position={[0, 0, depth * 0.4]} scale={[width * 0.7, height * 0.7, depth * 0.08]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <mesh position={[0, height * 0.08, depth * 0.47]} rotation={[0, 0, -0.45]} scale={[width * 0.048, height * 0.25, depth * 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      <mesh position={[width * 0.06, -height * 0.02, depth * 0.47]} rotation={[0, 0, 1.1]} scale={[width * 0.038, height * 0.18, depth * 0.025]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
    </group>
  );
}

function WallLight({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  return (
    <group>
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <pointLight position={[0, -item.size[1] * 0.55, item.size[2] * 0.9]} color="#ffd8a2" intensity={0.48} distance={2.3} decay={2} />
    </group>
  );
}

function Washbasin({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial("ceramic-white")} attach="material" /></mesh>
      <mesh position={[0, height * 0.46, depth * 0.08]} scale={[width * 0.68, 0.03, depth * 0.55]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></mesh>
      <mesh position={[0, height * 0.96, -depth * 0.25]} scale={[0.03, height * 0.7, 0.03]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, -height * 1.25, -depth * 0.08]} scale={[0.045, height * 2.1, 0.045]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0.11, -height * 2.1, -depth * 0.08]} rotation={[0, 0, Math.PI / 2]} scale={[0.22, 0.045, 0.045]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}

function BathRoundMirror({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const diameter = item.size[0];
  return (
    <group>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.02]} scale={[diameter, diameter, 0.018]} geometry={SHARED_CIRCLE} renderOrder={20} castShadow>
        <primitive object={getPlannerMaterial("mirror-glass")} attach="material" side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.027]} scale={[diameter * 0.94, diameter * 0.94, 1]} geometry={SHARED_MIRROR_LED} renderOrder={21}>
        <meshStandardMaterial color="#fff4da" emissive="#ffe4a3" emissiveIntensity={1.4} roughness={0.3} metalness={0.05} />
      </mesh>
      <pointLight position={[0, 0, 0.04]} color="#ffe0a0" intensity={0.16} distance={1.2} decay={2} />
    </group>
  );
}

function BathMat({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const sand = getPlannerMaterial("temu-bath-rug-woven");
  const fringe = getPlannerMaterial("bath-mat-fringe-sand");
  const stitches = Math.max(22, Math.round(width / 0.018));
  // True footprint comes from the Temu variants: 122×61 cm and 77×46 cm.
  // The relief is a tiny 1-cm waffle lattice, not a large tile pattern.
  return (
    <group name={`waffle-rug-${item.catalogId}`}>
      <RoundedBox args={[width * 0.985, height, depth * 0.95]} radius={0.009} smoothness={3} receiveShadow castShadow>
        <primitive object={sand} attach="material" />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.002, 0]} scale={[width * 0.973, depth * 0.928, 1]} geometry={SHARED_PLANE} receiveShadow>
        <primitive object={sand} attach="material" side={DoubleSide} />
      </mesh>
      {[-1, 1].flatMap((side) => Array.from({ length: stitches }, (_, index) => {
        const x = -width / 2 + (index + 0.5) * width / stitches;
        const length = 0.008 + (index % 4) * 0.0009;
        return <mesh key={`fringe-${side}-${index}`} position={[x, 0.002, side * (depth / 2 + length * 0.24)]}
          rotation={[(index % 3 - 1) * 0.16, 0, (index % 5 - 2) * 0.1]}
          scale={[0.0022, 0.005, length]} geometry={SHARED_BOX} castShadow>
          <primitive object={fringe} attach="material" />
        </mesh>;
      }))}
      {[-1, 1].map((side) => <mesh key={`hem-${side}`} position={[0, height / 2 + 0.002, side * (depth / 2 - 0.014)]}
        scale={[width * 0.96, 0.003, 0.012]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={fringe} attach="material" />
      </mesh>)}
    </group>
  );
}

function BathTowelHookRail({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const oak = getPlannerMaterial("bath-hook-oak-natural");
  const black = getPlannerMaterial("bath-hook-black");
  const diameter = Math.min(0.148, width * 0.39, height * 0.43);
  const horizontal = width * 0.27;
  const vertical = height * 0.27;
  // Four independent round natural-oak plates, not a three-hook metal rail.
  // Sizes are illustration assumptions because the listing does not state cm.
  return (
    <group name="four-oak-black-bath-hooks">
      {[-1, 1].flatMap((row) => [-1, 1].map((column) => (
        <group key={`hook-${row}-${column}`} position={[column * horizontal, row * vertical, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[diameter, depth * 0.16, diameter]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
            <primitive object={oak} attach="material" />
          </mesh>
          <mesh position={[0, 0, depth * 0.14]} scale={[diameter * 0.92, diameter * 0.92, 0.012]} geometry={SHARED_CIRCLE} castShadow>
            <primitive object={oak} attach="material" side={DoubleSide} />
          </mesh>
          <mesh position={[0, -diameter * 0.04, depth * 0.37]} rotation={[Math.PI / 2, 0, 0]}
            scale={[0.028, depth * 0.68, 0.028]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={black} attach="material" />
          </mesh>
          <RoundedBox position={[0, -diameter * 0.13, depth * 0.72]} rotation={[0.2, 0, -0.12]}
            args={[diameter * 0.46, diameter * 0.68, 0.017]} radius={0.008} smoothness={4} castShadow>
            <primitive object={black} attach="material" />
          </RoundedBox>
        </group>
      )))}
    </group>
  );
}

function BathShowerRod({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  // The supplied Temu rod is a 171–210 cm pressure-fit tube.  Keep the
  // document's 205 cm setting as the single source of placement truth and
  // model the telescoping sleeve, collars and wall pads inside that existing
  // built-in footprint.
  const rod = getPlannerMaterial(item.materialId || "chrome-polished");
  const plate = getPlannerMaterial("metal-satin");
  const collarX = width * 0.17;
  const plateRadius = Math.max(0.045, Math.min(0.06, width * 0.028));
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[depth, width, height]} geometry={SHARED_CYLINDER} renderOrder={18} castShadow>
        <primitive object={rod} attach="material" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-collarX, 0, 0]} scale={[depth * 1.28, width * 0.21, height * 1.28]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={rod} attach="material" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[collarX, 0, 0]} scale={[depth * 1.18, width * 0.16, height * 1.18]} castShadow geometry={SHARED_CYLINDER}>
        <primitive object={rod} attach="material" />
      </mesh>
      {[-collarX, collarX].map((x) => (
        <mesh key={`collar-${x}`} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[depth * 1.35, depth * 1.35, depth * 1.35]} geometry={SHARED_TORUS} castShadow>
          <primitive object={rod} attach="material" />
        </mesh>
      ))}
      {[-0.5, 0.5].map((ratio) => (
        <group key={`mount-${ratio}`} position={[ratio * width, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[depth * 1.1, depth * 1.4, depth * 1.1]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={rod} attach="material" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[plateRadius, depth * 0.7, plateRadius]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={plate} attach="material" />
          </mesh>
          <mesh position={[ratio * 0.008, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[plateRadius * 0.94, plateRadius * 0.94, plateRadius * 0.94]} geometry={SHARED_TORUS}>
            <primitive object={plate} attach="material" />
          </mesh>
        </group>
      ))}
      {[-0.5, 0.5].map((ratio) => (
        <mesh key={`end-cap-${ratio}`} position={[ratio * width, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[depth * 1.5, depth * 0.16, depth * 1.5]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={rod} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function BathShowerCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const hookCount = 12;
  const cloth = getPlannerMaterial("temu-shower-curtain-beige");
  const seam = getPlannerMaterial("shower-curtain-hem-beige");
  const silver = getPlannerMaterial("chrome-polished");
  const step = width / hookCount;
  // Opaque washable textile, 180×200 cm; the document positions the hem
  // 16 cm above floor and the hooks just below the 218-cm curtain rod.
  // Draw rippling vertical sections with alternating front/back peaks.
  return <group name="temu-beige-curtain-180x200">
    {Array.from({ length: hookCount }, (_, index) => (
      <group key={`pleat-${index}`} position={[-width / 2 + step * (index + 0.5), 0, 0]}>
        <RoundedBox args={[step * 1.035, height - 0.026, Math.max(0.012, depth * 0.8)]}
          position={[0, -0.004, Math.sin(index * 1.13) * 0.022]} rotation={[0, Math.sin(index * 1.13) * 0.10, 0]}
          radius={0.006} smoothness={3} castShadow receiveShadow>
          <primitive object={cloth} attach="material" />
        </RoundedBox>
        <mesh position={[0, height / 2 - 0.013, 0.002]} scale={[step * 0.95, 0.018, 0.018]} geometry={SHARED_BOX} castShadow>
          <primitive object={seam} attach="material" />
        </mesh>
        <mesh position={[0, -height / 2 + 0.018, Math.sin(index * 1.13) * 0.022]} scale={[step, 0.026, 0.019]} geometry={SHARED_BOX} castShadow>
          <primitive object={seam} attach="material" />
        </mesh>
        <mesh position={[0, height / 2 + 0.023, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.026, 0.008, 0.026]} geometry={SHARED_TORUS} castShadow>
          <primitive object={silver} attach="material" />
        </mesh>
        <mesh position={[0, height / 2 + 0.042, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.032, 0.032, 0.032]} geometry={SHARED_TORUS} castShadow>
          <primitive object={silver} attach="material" />
        </mesh>
      </group>
    ))}
  </group>;
}

function ScoutBasinCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const cashmere = getPlannerMaterial("cashmere-matte");
  const oak = getPlannerMaterial("scout-oak");
  const black = getPlannerMaterial("metal-black");
  return (
    <group>
      <mesh scale={[width, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={oak} attach="material" /></mesh>
      {[-0.25, 0.25].map((ratio) => (
        <mesh key={ratio} position={[ratio * width, 0.015, depth / 2 + 0.014]} scale={[width * 0.49 - 0.012, height - 0.055, 0.028]} geometry={SHARED_BOX} castShadow>
          <primitive object={cashmere} attach="material" />
        </mesh>
      ))}
      {[-0.25, 0.25].map((ratio) => <mesh key={`grip-${ratio}`} position={[ratio * width, height * 0.35, depth / 2 + 0.036]} scale={[width * 0.34, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>)}
      {[-0.43, 0.43].flatMap((x) => [-0.38, 0.38].map((z) => <mesh key={`${x}-${z}`} position={[x * width, -height / 2 - 0.01, z * depth]} scale={[0.035, 0.035, 0.035]} geometry={SHARED_BOX}><primitive object={black} attach="material" /></mesh>))}
    </group>
  );
}

function ScoutWasherCabinet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const oak = getPlannerMaterial("scout-oak");
  const cashmere = getPlannerMaterial("cashmere-matte");
  const black = getPlannerMaterial("metal-black");
  const side = 0.045;
  const lowerOpening = 0.96;
  const upperHeight = height - lowerOpening;
  return (
    <group>
      {[-1, 1].map((sideSign) => <mesh key={sideSign} position={[sideSign * (width / 2 - side / 2), 0, 0]} scale={[side, height, depth]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={oak} attach="material" /></mesh>)}
      <mesh position={[0, height / 2 - side / 2, 0]} scale={[width, side, depth]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      <mesh position={[0, -height / 2 + lowerOpening, 0]} scale={[width - side * 2, side, depth]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      <mesh position={[0, height / 2 - upperHeight / 2, -depth * 0.22]} scale={[width - side * 2, upperHeight - side, depth * 0.55]} geometry={SHARED_BOX} castShadow><primitive object={oak} attach="material" /></mesh>
      {[-0.25, 0.25].map((ratio) => <mesh key={ratio} position={[ratio * width, height / 2 - upperHeight / 2, depth / 2 + 0.014]} scale={[width * 0.49 - 0.012, upperHeight - 0.055, 0.028]} geometry={SHARED_BOX} castShadow><primitive object={cashmere} attach="material" /></mesh>)}
      {[-0.25, 0.25].map((ratio) => <mesh key={`grip-${ratio}`} position={[ratio * width, lowerOpening / 2 + 0.04, depth / 2 + 0.038]} scale={[width * 0.31, 0.018, 0.018]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>)}
    </group>
  );
}

function BathShowerSet({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height] = item.size;
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <mesh scale={[width * 0.16, height, width * 0.16]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      {[-0.42, 0.42].map((ratio) => (
        <mesh key={ratio} position={[0, height * ratio, -width * 0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.34, width * 0.28, width * 0.34]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      ))}
      <RoundedBox args={[width * 1.45, width * 0.42, width * 0.48]} radius={0.018} smoothness={3} position={[0, -height * 0.47, width * 0.06]} castShadow>
        <primitive object={metal} attach="material" />
      </RoundedBox>
      <mesh position={[-width * 0.72, height * 0.2, width * 0.16]} rotation={[0, 0, -0.22]} scale={[width * 0.22, height * 0.32, width * 0.22]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[-width * 0.76, height * 0.37, width * 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.5, width * 0.16, width * 0.34]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
      <mesh position={[-width * 0.35, -height * 0.18, width * 0.12]} rotation={[0, 0, 0.22]} scale={[width * 0.09, height * 0.58, width * 0.09]} geometry={SHARED_CYLINDER} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}

function WcPaperHolder({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  // User photo: two offset solid-wood ledges (photo annotates the lower one
  // as 17 × 14 cm), an approximately 15-cm horizontal iron roll arm and a
  // 9-cm vertical connector. Overall envelope / mounting remain estimates.
  const wood = getPlannerMaterial("wc-holder-solid-oak");
  const woodEdge = getPlannerMaterial("wc-holder-oak-edge");
  const iron = getPlannerMaterial("wc-holder-black-iron");
  const paper = getPlannerMaterial("wc-paper-white");
  const core = getPlannerMaterial("wc-paper-core");
  const ledgeWidth = 0.17;
  const ledgeDepth = Math.min(depth * 0.94, 0.14);
  const ledgeThickness = 0.023;
  const topX = width / 2 - ledgeWidth / 2 - 0.008;
  const bottomX = -width / 2 + ledgeWidth / 2 + 0.008;
  const topY = height / 2 - 0.023;
  const bottomY = -height / 2 + 0.023;
  const bracketX = 0;
  const frontZ = depth / 2 - 0.009;
  return (
    <group name="temu-wc-oak-iron-paper-shelf">
      {[{ x: topX, y: topY }, { x: bottomX, y: bottomY }].map(({ x, y }, index) => (
        <group key={`wood-ledge-${index}`} position={[x, y, 0]}>
          <RoundedBox args={[ledgeWidth, ledgeThickness, ledgeDepth]} radius={0.006} smoothness={4} castShadow receiveShadow>
            <primitive object={woodEdge} attach="material" />
          </RoundedBox>
          <mesh position={[0, ledgeThickness / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}
            scale={[ledgeWidth * 0.94, ledgeDepth * 0.92, 1]} geometry={SHARED_PLANE} receiveShadow>
            <primitive object={wood} attach="material" side={DoubleSide} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`edge-grain-${side}`} position={[0, -ledgeThickness * 0.2, side * (ledgeDepth / 2 + 0.0008)]}
              scale={[ledgeWidth * 0.93, 0.002, 0.001]} geometry={SHARED_BOX}>
              <primitive object={wood} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Continuous bracket between the two offset wooden shelves. */}
      <RoundedBox args={[0.022, height * 0.75, 0.024]} radius={0.004} smoothness={3}
        position={[bracketX, 0, frontZ - 0.025]} castShadow>
        <primitive object={iron} attach="material" />
      </RoundedBox>
      <mesh position={[bracketX, 0.01, frontZ - 0.026]} scale={[0.035, 0.003, 0.033]} geometry={SHARED_BOX} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      {/* Horizontal 15-cm paper arm and small open end stop. */}
      <mesh position={[0.076, -0.014, frontZ]} rotation={[0, 0, Math.PI / 2]}
        scale={[0.014, 0.15, 0.014]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      <mesh position={[0.149, -0.003, frontZ]} scale={[0.01, 0.025, 0.01]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={iron} attach="material" />
      </mesh>
      {/* Visible replaceable paper roll, not a solid blank cylinder. */}
      <mesh position={[0.078, -0.014, frontZ]} rotation={[0, 0, Math.PI / 2]}
        scale={[0.098, 0.105, 0.098]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={paper} attach="material" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`paper-core-${side}`} position={[0.078 + side * 0.053, -0.014, frontZ]}>
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[0.031, 0.031, 0.031]} geometry={SHARED_TORUS}>
            <primitive object={core} attach="material" />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[0.013, 0.013, 0.013]} geometry={SHARED_TORUS}>
            <primitive object={iron} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.078, -0.085, frontZ + 0.046]} scale={[0.086, 0.118, 0.002]} geometry={SHARED_BOX} castShadow>
        <primitive object={paper} attach="material" />
      </mesh>
      {/* Wall mounting tabs under the shelves. */}
      {[topY - 0.035, bottomY + 0.032].map((y, index) => (
        <mesh key={`wall-mount-${index}`} position={[bracketX, y, -depth / 2 + 0.005]}
          scale={[0.038, 0.038, 0.008]} geometry={SHARED_BOX} castShadow>
          <primitive object={iron} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function WcBrush({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <mesh position={[0, -height * 0.22, 0]} scale={[width, height * 0.55, depth]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
      <mesh position={[0, height * 0.27, 0]} scale={[width * 0.18, height * 0.62, depth * 0.18]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
    </group>
  );
}

function ZimmerWallPanel({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function DeskLedMirror({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function WindowCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1WallArtPair({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1EntrySlimArt({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1HeadboardLed({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1HeadboardSconces({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1LayeredCurtain({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1DeskShelf({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  const isMain = item.catalogId === "zimmer1-desk-shelf-main";
  const isUpperSide = item.catalogId === "zimmer1-desk-shelf-side-upper";
  return (
    <group>
      <RoundedBox args={[width, height, depth]} radius={0.018} smoothness={4} castShadow receiveShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>
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

function Zimmer1DeskAccessories({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1EntryNiche({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1WardrobeTopDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
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

function Zimmer1NightstandDecor({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const [width, height, depth] = item.size;
  return (
    <group>
      <RoundedBox args={[width * 0.42, 0.025, depth * 0.72]} radius={0.018} smoothness={4} position={[width * 0.2, -height / 2 + 0.018, 0]} castShadow><primitive object={getPlannerMaterial("oak-light")} attach="material" /></RoundedBox>
      <mesh position={[-width * 0.2, -height * 0.18, 0]} scale={[0.055, height * 0.36, 0.055]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[-width * 0.2, height * 0.2, 0]} scale={[0.14, 0.14, 0.14]} geometry={SHARED_SPHERE} castShadow>
        <meshStandardMaterial color="#f3e4c8" emissive="#ffd49a" emissiveIntensity={0.78} roughness={0.56} />
      </mesh>
      <pointLight position={[-width * 0.2, height * 0.25, depth * 0.18]} color="#ffd5a0" intensity={0.18} distance={1.05} decay={2} />
    </group>
  );
}
