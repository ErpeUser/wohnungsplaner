import { Circle, Group, Layer, Line, Rect, Text } from "react-konva";

import type { PlanScene } from "./plan-scene.ts";

export function OverlayLayer({ scene }: { scene: PlanScene }) {
  return (
    <Layer listening={false}>
      {scene.fixtures.map((fixture) => (
        <Group key={fixture.id}>
          <Circle
            x={fixture.position.x}
            y={fixture.position.z}
            radius={0.09}
            fill="#fffdf9"
            stroke="#91623f"
            strokeWidth={0.025}
          />
          <Line
            points={[
              fixture.position.x - 0.055,
              fixture.position.z,
              fixture.position.x + 0.055,
              fixture.position.z,
            ]}
            stroke="#91623f"
            strokeWidth={0.02}
          />
          <Text
            x={fixture.position.x + 0.11}
            y={fixture.position.z - 0.05}
            text={fixture.label}
            fontFamily="Arial"
            fontSize={0.075}
            fill="#725039"
          />
        </Group>
      ))}
      {scene.dimensions.map((dimension) => {
        const middle = {
          x: (dimension.start.x + dimension.end.x) / 2,
          z: (dimension.start.z + dimension.end.z) / 2,
        };
        return (
          <Group key={dimension.id}>
            <Line
              points={[dimension.wallStart.x, dimension.wallStart.z, dimension.start.x, dimension.start.z]}
              stroke="#305d62"
              strokeWidth={0.012}
            />
            <Line
              points={[dimension.wallEnd.x, dimension.wallEnd.z, dimension.end.x, dimension.end.z]}
              stroke="#305d62"
              strokeWidth={0.012}
            />
            <Line
              points={[dimension.start.x, dimension.start.z, dimension.end.x, dimension.end.z]}
              stroke="#244b50"
              strokeWidth={0.018}
            />
            <Group x={middle.x} y={middle.z} rotation={dimension.rotation}>
              <Line points={[0, -0.055, 0, 0.055]} stroke="#244b50" strokeWidth={0.018} x={-Math.hypot(dimension.end.x - dimension.start.x, dimension.end.z - dimension.start.z) / 2} />
              <Line points={[0, -0.055, 0, 0.055]} stroke="#244b50" strokeWidth={0.018} x={Math.hypot(dimension.end.x - dimension.start.x, dimension.end.z - dimension.start.z) / 2} />
              <Rect x={-0.285} y={-0.095} width={0.57} height={0.19} cornerRadius={0.045} fill="#fffdf8" stroke="#305d62" strokeWidth={0.01} opacity={0.96} />
              <Text
                x={-0.285}
                y={-0.057}
                width={0.57}
                align="center"
                text={dimension.label}
                fontFamily="Arial"
                fontStyle="bold"
                fontSize={0.09}
                fill="#183e43"
              />
            </Group>
          </Group>
        );
      })}
      {scene.guides.map((guide) => (
        <Line
          key={guide.id}
          points={guide.axis === "x"
            ? [guide.value, scene.bounds.minZ, guide.value, scene.bounds.maxZ]
            : [scene.bounds.minX, guide.value, scene.bounds.maxX, guide.value]}
          stroke="#2b7783"
          strokeWidth={0.018}
          dash={[0.06, 0.04]}
        />
      ))}
    </Layer>
  );
}
