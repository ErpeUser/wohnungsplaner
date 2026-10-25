"use client";

import { useMemo } from "react";
import { BoxGeometry, DoubleSide, Shape } from "three";

import { getPlannerMaterial } from "./materials.ts";
import type { SceneFloor, SceneModel, SceneObject } from "./scene-model.ts";
import type { PlannerBuiltIn, PlannerPlacement } from "../domain/types.ts";

const SHARED_BOX = new BoxGeometry(1, 1, 1);

export function PlannerArchitecture({
  scene,
  selectionId,
  onSelect,
}: {
  scene: SceneModel;
  selectionId: string | null;
  onSelect(id: string | null): void;
}) {
  return (
    <group onPointerMissed={() => onSelect(null)}>
      {scene.floors.map((floor) => <Floor key={floor.id} floor={floor} />)}
      {scene.walls.flatMap((wall) => wall.segments.map((wallSegment) => (
        <mesh
          key={wallSegment.id}
          position={wallSegment.position}
          rotation={[0, wallSegment.rotationY, 0]}
          scale={wallSegment.size}
          geometry={SHARED_BOX}
          castShadow
          receiveShadow
        >
          <primitive object={getPlannerMaterial("wall-warm-white")} attach="material" />
        </mesh>
      )))}
      {scene.doors.map((door) => {
        const angle = door.state === "open" ? door.openAngle : door.baseAngle;
        const center: [number, number, number] = [
          door.hinge.x + Math.cos(angle) * door.width / 2,
          door.height / 2,
          door.hinge.z + Math.sin(angle) * door.width / 2,
        ];
        return (
          <mesh
            key={door.id}
            position={center}
            rotation={[0, -angle, 0]}
            scale={[door.width, door.height, 0.045]}
            geometry={SHARED_BOX}
            castShadow
          >
            <primitive object={getPlannerMaterial(door.materialId)} attach="material" />
          </mesh>
        );
      })}
      {scene.builtIns.map((item) => (
        <ObjectBox key={item.id} item={item} selected={selectionId === item.id} onSelect={onSelect} />
      ))}
      {scene.placements.map((item) => (
        <ObjectBox key={item.id} item={item} selected={selectionId === item.id} onSelect={onSelect} />
      ))}
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
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <primitive object={getPlannerMaterial(floor.materialId)} attach="material" side={DoubleSide} />
    </mesh>
  );
}

function ObjectBox({
  item,
  selected,
  onSelect,
}: {
  item: SceneObject<PlannerBuiltIn | PlannerPlacement>;
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
      <mesh scale={item.size} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
      </mesh>
      {selected ? (
        <mesh scale={item.size.map((value) => value * 1.015) as [number, number, number]} geometry={SHARED_BOX}>
          <meshBasicMaterial color="#d46f3a" wireframe transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}
