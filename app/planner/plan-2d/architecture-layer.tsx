import { Arc, Group, Layer, Line, Rect, Text } from "react-konva";

import type { PlanOpeningDescriptor, PlanScene } from "./plan-scene.ts";

const FLOOR_COLORS: Record<string, string> = {
  "floor-oak-herringbone": "#c99a69",
  "floor-oak": "#c99a69",
  "floor-tile-light": "#dedbd2",
  "floor-tile-grey": "#c9cac5",
  "floor-balcony": "#b9b6a9",
};

export function ArchitectureLayer({ scene }: { scene: PlanScene }) {
  return (
    <Layer listening>
      {scene.rooms.map((room) => (
        <Group key={room.id}>
          <Line
            points={flatten(room.points)}
            closed
            fill={FLOOR_COLORS[room.floorMaterialId] ?? "#d2b18d"}
            stroke="#837b70"
            strokeWidth={0.02}
          />
          <Text
            x={centroid(room.points).x - 0.75}
            y={centroid(room.points).z - 0.12}
            width={1.5}
            align="center"
            text={`${room.name}\n${formatArea(room.area)}`}
            fontFamily="Arial"
            fontSize={0.13}
            lineHeight={1.25}
            fill="#344447"
            listening={false}
          />
        </Group>
      ))}
      {scene.walls.map((wall) => (
        <Line
          key={wall.id}
          points={[wall.start.x, wall.start.z, wall.end.x, wall.end.z]}
          stroke="#1f3033"
          strokeWidth={wall.thickness}
          lineCap="square"
          lineJoin="miter"
        />
      ))}
      {scene.openings.map((opening) => <OpeningShape key={opening.id} opening={opening} />)}
      {scene.builtIns.map((item) => {
        const box = polygonBounds(item.points);
        return (
          <Group key={item.id}>
            <Rect
              x={box.minX}
              y={box.minZ}
              width={box.maxX - box.minX}
              height={box.maxZ - box.minZ}
              fill={item.kind === "kitchen" ? "#ebe7de" : "#d8e1df"}
              stroke="#506366"
              strokeWidth={0.025}
              dash={[0.08, 0.04]}
            />
            <Text
              x={box.minX + 0.03}
              y={box.minZ + 0.03}
              width={Math.max(0.2, box.maxX - box.minX - 0.06)}
              text={item.label}
              fontFamily="Arial"
              fontSize={0.08}
              fill="#405255"
              listening={false}
            />
          </Group>
        );
      })}
    </Layer>
  );
}

function OpeningShape({ opening }: { opening: PlanOpeningDescriptor }) {
  const common = [opening.start.x, opening.start.z, opening.end.x, opening.end.z];
  if (opening.kind === "window") {
    return (
      <Group>
        <Line points={common} stroke="#f7f5ef" strokeWidth={0.16} />
        <Line points={common} stroke="#5f858c" strokeWidth={0.055} />
      </Group>
    );
  }
  if (opening.kind === "passage") {
    return <Line points={common} stroke="#f7f5ef" strokeWidth={0.17} />;
  }

  const hinge = opening.hinge === "end" ? opening.end : opening.start;
  const leafEnd = opening.hinge === "end" ? opening.start : opening.end;
  const baseAngle = Math.atan2(leafEnd.z - hinge.z, leafEnd.x - hinge.x) * 180 / Math.PI;
  const arcRotation = opening.hinge === "end" ? baseAngle - opening.swingDegrees : baseAngle;
  return (
    <Group>
      <Line points={common} stroke="#f7f5ef" strokeWidth={0.17} />
      <Line points={[hinge.x, hinge.z, leafEnd.x, leafEnd.z]} stroke="#536568" strokeWidth={0.035} />
      <Arc
        x={hinge.x}
        y={hinge.z}
        innerRadius={opening.width - 0.012}
        outerRadius={opening.width + 0.012}
        angle={opening.swingDegrees}
        rotation={arcRotation}
        fill="#8f6a4d"
        opacity={0.7}
        listening={false}
      />
    </Group>
  );
}

function flatten(points: Array<{ x: number; z: number }>) {
  return points.flatMap((point) => [point.x, point.z]);
}

function centroid(points: Array<{ x: number; z: number }>) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
  };
}

function polygonBounds(points: Array<{ x: number; z: number }>) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function formatArea(area: number) {
  return `${area.toLocaleString("de-AT", { maximumFractionDigits: 2 })} m²`;
}
