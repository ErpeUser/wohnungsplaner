import { TILE_SIZE_METRES } from '../domain/tile-dimensions.ts';
import { Arc, Circle, Group, Line, Text } from "react-konva";

import type { PlanObjectDescriptor, PlanOpeningDescriptor, PlanScene } from "./plan-scene.ts";

const FLOOR_COLORS: Record<string, string> = {
  "floor-oak-herringbone": "#c99a69",
  "floor-oak": "#c99a69",
  "floor-tile-light": "#dedbd2",
  "floor-tile-grey": "#c9cac5",
  "floor-balcony": "#b9b6a9",
  "parquet-oak-narrow": "#c79769",
  "porcelain-light-taupe": "#c8c1b5",
  "balcony-floor-beige": "#c6b386",
};

export function ArchitectureLayer({ scene, selectionId, onToggleDoor, onSelect }: { scene: PlanScene; selectionId?: string | null; onToggleDoor?(openingId: string): void; onSelect?(id: string | null): void }) {
  return (
    <Group listening>
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
      {scene.openings.map((opening) => <OpeningShape key={opening.id} opening={opening} onToggleDoor={onToggleDoor} />)}
      {scene.builtIns.map((item) => {
        const box = polygonBounds(item.points);
        // Stacked kitchen elements share a 2D footprint. Label the selection;
        // full names and evidence remain available in the object list/inspector.
        const selected = item.id === selectionId;
        const showLabel = selected && !item.catalogId?.startsWith("floor-zone-")
          && !item.catalogId?.startsWith("zimmer1-")
          && item.catalogId !== "wall-finish-taupe"
          && item.catalogId !== "wall-finish-vintage-fabric-wallpaper"
          && !item.catalogId?.includes("backsplash")
          && item.catalogId !== "appliance-washer"
          && item.catalogId !== "sanitary-washbasin"
          && (box.maxX - box.minX) * (box.maxZ - box.minZ) > 0.08;
        return (
          <Group key={item.id}>
            <Line
              points={flatten(item.points)}
              closed
              fill={planObjectColor(item.catalogId, item.kind)}
              stroke={selected ? "#176b61" : "#506366"}
              strokeWidth={selected ? 0.045 : 0.025}
              hitStrokeWidth={0.12}
              dash={item.metadata?.confidence === "estimated" || item.metadata?.confidence === "legacy"
                ? [0.04, 0.03]
                : item.catalogId?.startsWith("floor-zone-") ? undefined : [0.08, 0.04]}
              onClick={(event) => { event.cancelBubble = true; onSelect?.(item.id); }}
              onTap={(event) => { event.cancelBubble = true; onSelect?.(item.id); }}
            />
            <BuiltInDetail item={item} />
            {showLabel ? <Text
              x={box.minX + 0.03}
              y={box.minZ + 0.03}
              width={Math.max(0.2, box.maxX - box.minX - 0.06)}
              height={Math.max(0.09, Math.min(0.22, box.maxZ - box.minZ - 0.06))}
              text={planObjectLabel(item)}
              ellipsis
              fontFamily="Arial"
              fontSize={0.08}
              fill="#405255"
              listening={false}
            /> : null}
            {selected && box.maxZ - box.minZ > 0.3 && item.metadata?.confidence === "estimated" ? (
              <Text
                x={box.minX + 0.03}
                y={box.maxZ - 0.14}
                width={Math.max(0.2, box.maxX - box.minX - 0.06)}
                text="Schätzung"
                fontFamily="Arial"
                fontSize={0.06}
                fill="#8a5b2f"
                listening={false}
              />
            ) : null}
          </Group>
        );
      })}
    </Group>
  );
}

function OpeningShape({ opening, onToggleDoor }: { opening: PlanOpeningDescriptor; onToggleDoor?(openingId: string): void }) {
  const common = [opening.start.x, opening.start.z, opening.end.x, opening.end.z];
  if (opening.kind === "window") {
    const normal = segmentNormal(opening.start, opening.end, 0.038);
    return (
      <Group>
        <Line points={common} stroke="#f7f5ef" strokeWidth={0.18} />
        <Line points={common} stroke="#9fd0dc" strokeWidth={0.085} opacity={0.92} />
        <Line points={[opening.start.x + normal.x, opening.start.z + normal.z, opening.end.x + normal.x, opening.end.z + normal.z]} stroke="#f8faf8" strokeWidth={0.028} />
        <Line points={[opening.start.x - normal.x, opening.start.z - normal.z, opening.end.x - normal.x, opening.end.z - normal.z]} stroke="#f8faf8" strokeWidth={0.028} />
        <Circle x={opening.start.x} y={opening.start.z} radius={0.055} fill="#f8faf8" stroke="#5f858c" strokeWidth={0.014} />
        <Circle x={opening.end.x} y={opening.end.z} radius={0.055} fill="#f8faf8" stroke="#5f858c" strokeWidth={0.014} />
      </Group>
    );
  }
  if (opening.kind === "passage") {
    return <Line points={common} stroke="#f7f5ef" strokeWidth={0.17} />;
  }

  const hinge = opening.hinge === "end" ? opening.end : opening.start;
  const leafEnd = opening.hinge === "end" ? opening.start : opening.end;
  const displayedLeafEnd = opening.state === "open"
    ? rotateAround(leafEnd, hinge, opening.swingDirection * opening.swingDegrees)
    : leafEnd;
  const baseAngle = Math.atan2(leafEnd.z - hinge.z, leafEnd.x - hinge.x) * 180 / Math.PI;
  const arcRotation = opening.swingDirection === 1 ? baseAngle : baseAngle - opening.swingDegrees;
  const handle = {
    x: hinge.x + (displayedLeafEnd.x - hinge.x) * 0.84,
    z: hinge.z + (displayedLeafEnd.z - hinge.z) * 0.84,
  };
  const glassDoor = opening.visualStyle === "glass-clear"
    || opening.visualStyle === "glass-frosted"
    || opening.id.includes("loggia")
    || opening.id.includes("balcony");
  return (
    <Group
      onClick={() => onToggleDoor?.(opening.id)}
      onTap={() => onToggleDoor?.(opening.id)}
    >
      <Line points={common} stroke="#f7f5ef" strokeWidth={0.2} />
      <Line points={[hinge.x, hinge.z, displayedLeafEnd.x, displayedLeafEnd.z]} stroke={glassDoor ? "#8ac2cf" : "#26383b"} strokeWidth={glassDoor ? 0.085 : 0.055} />
      {glassDoor ? <Line points={[hinge.x, hinge.z, displayedLeafEnd.x, displayedLeafEnd.z]} stroke="#f8faf8" strokeWidth={0.025} /> : null}
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
      <Circle
        x={handle.x}
        y={handle.z}
        radius={0.07}
        fill="#d8aa62"
        stroke="#26383b"
        strokeWidth={0.018}
        hitStrokeWidth={0.16}
        aria-label={`Türgriff ${opening.label} ${opening.state === "open" ? "schließen" : "öffnen"}`}
      />
    </Group>
  );
}

function BuiltInDetail({ item }: { item: PlanObjectDescriptor }) {
  const id = item.catalogId ?? "";
  const box = polygonBounds(item.points);
  const width = box.maxX - box.minX;
  const depth = box.maxZ - box.minZ;
  if (id === "floor-zone-kitchen") {
    const tileSize = TILE_SIZE_METRES;
    const verticalLines = Math.floor(width / tileSize);
    const horizontalLines = Math.floor(depth / tileSize);
    return (
      <Group listening={false} opacity={0.6}>
        {Array.from({ length: verticalLines }, (_, index) => {
          const x = box.minX + tileSize * (index + 1);
          return <Line key={`v-${index}`} points={[x, box.minZ, x, box.maxZ]} stroke="#c8c7c1" strokeWidth={0.008} />;
        })}
        {Array.from({ length: horizontalLines }, (_, index) => {
          const z = box.minZ + tileSize * (index + 1);
          return <Line key={`h-${index}`} points={[box.minX, z, box.maxX, z]} stroke="#c8c7c1" strokeWidth={0.008} />;
        })}
      </Group>
    );
  }
  if (id === "kitchen-base" || id === "kitchen-upper" || id === "kitchen-corner-base") {
    const longX = width >= depth;
    const length = longX ? width : depth;
    const count = Math.max(1, Math.round(length / 0.55));
    return (
      <Group listening={false}>
        {Array.from({ length: count - 1 }, (_, index) => {
          const ratio = (index + 1) / count;
          return longX
            ? <Line key={index} points={[box.minX + width * ratio, box.minZ, box.minX + width * ratio, box.maxZ]} stroke="#a9a39a" strokeWidth={0.018} />
            : <Line key={index} points={[box.minX, box.minZ + depth * ratio, box.maxX, box.minZ + depth * ratio]} stroke="#a9a39a" strokeWidth={0.018} />;
        })}
      </Group>
    );
  }
  if (id === "kitchen-hob") {
    return <Group listening={false}>{[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], index) => <Circle key={index} x={(box.minX + box.maxX) / 2 + x * width} y={(box.minZ + box.maxZ) / 2 + z * depth} radius={Math.min(width, depth) * 0.12} stroke="#d4d8d5" strokeWidth={0.018} />)}</Group>;
  }
  if (id === "kitchen-sink") {
    return <Line points={[box.minX + width * 0.14, box.minZ + depth * 0.16, box.maxX - width * 0.14, box.minZ + depth * 0.16, box.maxX - width * 0.14, box.maxZ - depth * 0.16, box.minX + width * 0.14, box.maxZ - depth * 0.16]} closed stroke="#6f8588" strokeWidth={0.025} listening={false} />;
  }
  if (id === "kitchen-corner-upper") {
    return <Group listening={false}>{[0.25, 0.5, 0.75].map((ratio) => <Line key={ratio} points={[box.minX, box.minZ + depth * ratio, box.maxX, box.minZ + depth * ratio]} stroke="#745038" strokeWidth={0.022} />)}</Group>;
  }
  if (id === "living-tv") {
    return <Line points={[box.minX + width * 0.06, box.minZ + depth * 0.15, box.maxX - width * 0.06, box.maxZ - depth * 0.15]} stroke="#9fa9a9" strokeWidth={0.025} listening={false} />;
  }
  if (id === "appliance-washer") {
    const radius = Math.min(width, depth) * 0.32;
    return <Circle x={(box.minX + box.maxX) / 2} y={(box.minZ + box.maxZ) / 2} radius={radius} stroke="#75878a" strokeWidth={0.025} listening={false} />;
  }
  if (id === "bath-basin-cabinet-scout") {
    return <Group listening={false}><Line points={[(box.minX + box.maxX) / 2, box.minZ, (box.minX + box.maxX) / 2, box.maxZ]} stroke="#817568" strokeWidth={0.018} /><Line points={[box.minX + width * 0.18, box.minZ + depth * 0.18, box.maxX - width * 0.18, box.minZ + depth * 0.18]} stroke="#282c2d" strokeWidth={0.025} /></Group>;
  }
  if (id === "bath-washer-cabinet-scout") {
    return <Group listening={false}><Line points={[box.minX + width * 0.12, box.minZ, box.minX + width * 0.12, box.maxZ]} stroke="#817568" strokeWidth={0.025} /><Line points={[box.maxX - width * 0.12, box.minZ, box.maxX - width * 0.12, box.maxZ]} stroke="#817568" strokeWidth={0.025} /></Group>;
  }
  if (id === "sanitary-bathtub") {
    return <Line points={[box.minX + width * 0.1, box.minZ + depth * 0.08, box.maxX - width * 0.1, box.minZ + depth * 0.08, box.maxX - width * 0.1, box.maxZ - depth * 0.08, box.minX + width * 0.1, box.maxZ - depth * 0.08]} closed stroke="#7f9699" strokeWidth={0.025} listening={false} />;
  }
  if (id === "bath-round-mirror") {
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minZ + box.maxZ) / 2;
    return <Group listening={false}>
      <Circle x={centerX} y={centerY} radius={width * 0.5 + 0.035} stroke="#f2c77f" strokeWidth={0.018} opacity={0.9} />
      <Circle x={centerX} y={centerY} radius={width * 0.47} stroke="#cfdfe1" strokeWidth={0.018} fill="#dbe5e6" />
    </Group>;
  }
  if (id === "bath-mat" || id === "wc-mat") {
    const fringe = .025, x0 = box.minX + fringe, z0 = box.minZ + fringe, x1 = box.maxX - fringe, z1 = box.maxZ - fringe;
    const countX = Math.max(1, Math.round((x1-x0)/.02)), countZ = Math.max(1, Math.round((z1-z0)/.02));
    return <Group listening={false}>
      <Line points={[box.minX,box.minZ,box.maxX,box.minZ,box.maxX,box.maxZ,box.minX,box.maxZ]} closed fill="#e5cfaa" stroke="#c5ac86" strokeWidth={.003}/>
      <Line points={[x0,z0,x1,z0,x1,z1,x0,z1]} closed fill="#cbb18d" stroke="#dcc39e" strokeWidth={.005}/>
      {Array.from({length:countX-1},(_,i)=>{const x=x0+(i+1)*(x1-x0)/countX;return <Line key={"waffle-x-"+i} points={[x,z0,x,z1]} stroke="#ead4b1" strokeWidth={.004}/>;})}
      {Array.from({length:countZ-1},(_,i)=>{const z=z0+(i+1)*(z1-z0)/countZ;return <Line key={"waffle-z-"+i} points={[x0,z,x1,z]} stroke="#ead4b1" strokeWidth={.004}/>;})}
      {[box.minZ+.012,box.maxZ-.012].map((z,i)=><Line key={"fringe-z-"+i} points={[box.minX,z,box.maxX,z]} stroke="#f4e1bf" strokeWidth={.018} dash={[.002,.002]}/>)}
      {[box.minX+.012,box.maxX-.012].map((x,i)=><Line key={"fringe-x-"+i} points={[x,box.minZ,x,box.maxZ]} stroke="#f4e1bf" strokeWidth={.018} dash={[.002,.002]}/>)}
    </Group>;
  }
  if (id === "bath-towel-hooks-wood-black") {
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    return <Group listening={false}>
      {[-1, 1].flatMap((row) => [-1, 1].map((column) => {
        const x = centerX + column * width * 0.27;
        const z = centerZ + row * depth * 0.27;
        return <Group key={`oak-hook-${row}-${column}`}>
          <Circle x={x} y={z} radius={0.034} fill="#d8b587" stroke="#ab8157" strokeWidth={0.009} />
          <Circle x={x + 0.009} y={z + 0.004} radius={0.011} fill="#252320" />
        </Group>;
      }))}
    </Group>;
  }
  if (id === "bath-shower-rod") {
    const centerZ = (box.minZ + box.maxZ) / 2;
    return <Group listening={false}>
      <Line points={[box.minX, centerZ, box.maxX, centerZ]} stroke="#d6d9d7" strokeWidth={0.045} />
      <Line points={[box.minX, centerZ, box.maxX, centerZ]} stroke="#717876" strokeWidth={0.018} opacity={0.8} />
      <Circle x={box.minX} y={centerZ} radius={0.065} fill="#dfe2df" stroke="#6f7774" strokeWidth={0.018} />
      <Circle x={box.maxX} y={centerZ} radius={0.065} fill="#dfe2df" stroke="#6f7774" strokeWidth={0.018} />
    </Group>;
  }
  if (id === "bath-shower-curtain") {
    const folds = 12;
    const foldSpacing = width / folds;
    return <Group listening={false}>
      <Line points={[box.minX, box.minZ, box.maxX, box.minZ, box.maxX, box.maxZ, box.minX, box.maxZ]} closed stroke="#c5b5a0" strokeWidth={0.025} fill="#e6dac9" opacity={0.82} />
      {Array.from({ length: folds - 1 }, (_, index) => {
        const x = box.minX + foldSpacing * (index + 1);
        return <Line key={`fold-${index}`} points={[x, box.minZ + 0.02, x, box.maxZ - 0.02]} stroke={index % 2 ? "#c8b8a4" : "#f5eee4"} strokeWidth={0.012} opacity={0.72} />;
      })}
      {Array.from({ length: folds }, (_, index) => {
        const x = box.minX + foldSpacing * (index + 0.5);
        return <Group key={`hook-${index}`}>
          <Circle x={x} y={box.minZ + 0.025} radius={0.028} stroke="#8f9691" strokeWidth={0.012} fill="#e9ece8" />
          <Circle x={x} y={box.maxZ - 0.01} radius={0.018} fill="#d7c1a5" />
        </Group>;
      })}
    </Group>;
  }
  if (id === "wc-artisan-wallboard-80" || id === "wc-boxxx-wallboard-90" || id === "wc-livetastic-wallboard-90") {
    const acacia = id === "wc-livetastic-wallboard-90";
    const boxxx = id === "wc-boxxx-wallboard-90";
    // Matches the source gallery: muted Artisan oak, pale BOXXX oak veneer,
    // or reddish acacia with a visibly bevelled, natural front edge.
    const fill = acacia ? "#bc6f3e" : boxxx ? "#d8c0a4" : "#aa956f";
    const grain = acacia ? "#91532f" : boxxx ? "#b99b78" : "#827055";
    return <Group listening={false}>
      <Line points={[box.minX, box.minZ, box.maxX, box.minZ, box.maxX, box.maxZ, box.minX, box.maxZ]}
        closed fill={fill} stroke={grain} strokeWidth={0.009} />
      {acacia ? <Line points={[
        box.minX, box.maxZ - 0.018,
        box.minX + width * 0.24, box.maxZ - 0.014,
        box.minX + width * 0.50, box.maxZ - 0.020,
        box.minX + width * 0.76, box.maxZ - 0.013,
        box.maxX, box.maxZ - 0.017,
      ]} stroke="#834527" strokeWidth={0.009} opacity={0.95} /> : null}
      <Line points={[box.minX + width * 0.08, box.minZ + depth * 0.22,
        box.maxX - width * 0.08, box.minZ + depth * 0.22]}
        stroke={grain} strokeWidth={0.006} opacity={0.62} />
      <Line points={[box.minX + width * 0.14, box.maxZ - depth * 0.16,
        box.maxX - width * 0.10, box.maxZ - depth * 0.16]}
        stroke={acacia ? "#dba36c" : "#e1c5a1"} strokeWidth={0.005} opacity={0.68} />
    </Group>;
  }
  if (id === "wc-paper-holder") {
    // Two displaced oak ledges and the exposed iron roll arm in the WC plan.
    return <Group listening={false}>
      <Line points={[box.minX + width * 0.02, box.minZ + depth * 0.08, box.minX + width * 0.52, box.minZ + depth * 0.08,
        box.minX + width * 0.52, box.maxZ - depth * 0.12, box.minX + width * 0.02, box.maxZ - depth * 0.12]}
        closed fill="#bd9268" stroke="#89603e" strokeWidth={0.016} />
      <Line points={[box.minX + width * 0.48, box.minZ + depth * 0.12, box.maxX - width * 0.02, box.minZ + depth * 0.12,
        box.maxX - width * 0.02, box.maxZ - depth * 0.08, box.minX + width * 0.48, box.maxZ - depth * 0.08]}
        closed fill="#bd9268" stroke="#89603e" strokeWidth={0.016} />
      <Line points={[box.minX + width * 0.45, box.minZ + depth * 0.5, box.maxX - width * 0.09, box.minZ + depth * 0.5]}
        stroke="#222220" strokeWidth={0.02} lineCap="round" />
      <Circle x={box.maxX - width * 0.17} y={box.minZ + depth * 0.51}
        radius={depth * 0.16} stroke="#faf8f3" strokeWidth={0.02} fill="#efeae1" />
    </Group>;
  }
  if (id === "sanitary-wall-wc") {
    return <Circle x={(box.minX + box.maxX) / 2} y={(box.minZ + box.maxZ) / 2} radius={Math.min(width, depth) * 0.3} stroke="#7f9699" strokeWidth={0.025} listening={false} />;
  }
  return null;
}

function segmentNormal(start: { x: number; z: number }, end: { x: number; z: number }, amount: number) {
  const length = Math.hypot(end.x - start.x, end.z - start.z) || 1;
  return { x: -(end.z - start.z) / length * amount, z: (end.x - start.x) / length * amount };
}

function rotateAround(point: { x: number; z: number }, origin: { x: number; z: number }, degrees: number) {
  const radians = degrees * Math.PI / 180;
  const x = point.x - origin.x;
  const z = point.z - origin.z;
  return {
    x: origin.x + x * Math.cos(radians) - z * Math.sin(radians),
    z: origin.z + x * Math.sin(radians) + z * Math.cos(radians),
  };
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

function planObjectLabel(item: PlanObjectDescriptor) {
  if (item.catalogId === "bath-basin-cabinet-scout") return "Scout 60";
  if (item.catalogId === "bath-washer-cabinet-scout") return "Scout 63";
  return item.label;
}

function planObjectColor(catalogId: string | undefined, kind: string) {
  if (catalogId === "floor-zone-kitchen") return "#e8e7e2";
  if (catalogId === "living-slat-wall" || catalogId === "kitchen-backsplash-oak") return "#98613a";
  if (catalogId === "living-moss-panel") return "#405539";
  if (catalogId === "bath-basin-cabinet-scout" || catalogId === "bath-washer-cabinet-scout") return "#cfc3b2";
  if (catalogId === "zimmer1-desk-mirror") return "#cbdadd";
  if (catalogId === "wc-paper-holder") return "#bd9268";
  if (catalogId === "wc-artisan-wallboard-80") return "#aa956f";
  if (catalogId === "wc-boxxx-wallboard-90") return "#d8c0a4";
  if (catalogId === "wc-livetastic-wallboard-90") return "#bc6f3e";
  if (catalogId === "wc-wall-ventilation" || catalogId === "wc-revision-panel") return "#efe5d8";
  if (catalogId === "wc-shelf-styling") return "#9fa988";
  if (catalogId === "zimmer1-wall-art-pair") return "#c99d68";
  if (catalogId === "zimmer1-entry-slim-art") return "#c99d68";
  if (catalogId === "zimmer1-headboard-led") return "#f2bd78";
  if (catalogId === "zimmer1-headboard-sconces") return "#c89d62";
  if (catalogId === "zimmer1-layered-curtain") return "#c9b6a4";
  if (catalogId === "zimmer1-desk-shelf-main") return "#b17d4f";
  if (catalogId?.startsWith("zimmer1-desk-shelf-side-")) return "#d0a66b";
  if (catalogId === "zimmer1-entry-niche") return "#c99d68";
  if (catalogId === "zimmer1-wardrobe-top-decor") return "#c6ae8e";
  if (catalogId === "zimmer1-desk-accessories" || catalogId === "zimmer1-nightstand-decor") return "#d7c8b4";
  if (catalogId === "vorraum-wall-decor") return "#c6ae8e";
  if (catalogId === "wall-finish-taupe") return "#B4A495";
  if (catalogId === "wall-finish-vintage-fabric-wallpaper") return "#a8876b";
  if (catalogId === "bath-towel-hooks-wood-black") return "#d7b68c";
  if (catalogId === "living-tv" || catalogId === "living-floating-cabinet" || catalogId === "kitchen-worktop") return "#171919";
  if (kind === "kitchen") return "#ebe7de";
  if (kind === "sanitary") return "#e7efed";
  return "#d8e1df";
}
