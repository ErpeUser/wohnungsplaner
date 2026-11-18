import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneModel, SceneWall } from "../scene-model.ts";
import { BALCONY_LOOP, SHARED_BOX, SHARED_CYLINDER } from "../shared/architecture-primitives.ts";



export function isBalconyExteriorWall(wall: SceneWall) {
  return wall.id.startsWith("wall-balkon-");
}



export function BalconyArchitecture({ scene, showRoof }: { scene: SceneModel; showRoof: boolean }) {
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
