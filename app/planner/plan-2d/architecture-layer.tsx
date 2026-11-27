import { Group, Layer, Line, Circle, Rect } from 'react-konva';
import { useMemo, type ComponentProps } from 'react';
import { ArchitectureLayer as BaseLayer } from './architecture-layer-base.tsx';
import { hookCenters, INTERIOR_REVISION, KITCHEN_REFERENCE } from '../domain/room-refinement.ts';
import { kitchenTileFaces, partitionInteriorPlan } from './interior-plan-geometry.ts';
import type { PlanObjectDescriptor } from './plan-scene.ts';

type Props = ComponentProps<typeof BaseLayer>;
const DETAILS = new Set(['bath-towel-hooks-wood-black', 'hall-tejo-art-plates', 'hall-between-door-decor',"hall-wall-vase-light","hall-wall-vase-brown","hall-wheat-print"]);
const refined = (item: PlanObjectDescriptor) => (DETAILS.has(item.catalogId ?? '') || item.catalogId?.startsWith('hall-woven-basket-')) && Boolean(item.metadata?.notes?.includes(INTERIOR_REVISION));

function KitchenFloorPatch({ item, onSelect }: { item: PlanObjectDescriptor; onSelect?: Props['onSelect'] }) {
  const faces = useMemo(() => kitchenTileFaces(item.points, KITCHEN_REFERENCE.tilePitch, KITCHEN_REFERENCE.tileGrout), [item.points]);
  return <Group onClick={e => { e.cancelBubble = true; onSelect?.(item.id); }} onTap={e => { e.cancelBubble = true; onSelect?.(item.id); }}>
    <Line points={item.points.flatMap(p => [p.x, p.z])} closed fill='#aaa9a1' strokeEnabled={false} />
    {faces.map((f, i) => <Rect key={i} x={f.x} y={f.z} width={f.width} height={f.depth} fill={f.fill} strokeEnabled={false} listening={false} />)}
  </Group>;
}

export function ArchitectureLayer(props: Props) {
  const { scene, onSelect } = props;
  const { floor, objects } = useMemo(() => partitionInteriorPlan(scene.builtIns), [scene.builtIns]);
  return <Layer>
    <BaseLayer {...props} scene={{ ...scene, builtIns: [] }} />
    <Group>{floor.map(item => <KitchenFloorPatch key={item.id} item={item} onSelect={onSelect} />)}</Group>
    <BaseLayer {...props} scene={{ ...scene, rooms: [], walls: [], openings: [], builtIns: objects.filter(item => !refined(item)) }} />
    <Group>
      {objects.filter(refined).map(item => {
        if (item.points.length < 4) return null;
        const center = item.points.reduce((a, p) => ({ x: a.x + p.x / item.points.length, z: a.z + p.z / item.points.length }), { x: 0, z: 0 });
        const [a, b, c] = item.points;
        const width = Math.hypot(b.x - a.x, b.z - a.z), depth = Math.hypot(c.x - b.x, c.z - b.z);
        const rotation = Math.atan2(b.z - a.z, b.x - a.x) * 180 / Math.PI;
        return <Group key={item.id} x={center.x} y={center.z} rotation={rotation}
          onClick={e => { e.cancelBubble = true; onSelect?.(item.id); }}
          onTap={e => { e.cancelBubble = true; onSelect?.(item.id); }}>
          <Rect x={-width / 2} y={-depth / 2} width={width} height={depth} fill='rgba(214,190,153,0.2)' stroke='#a98a62' strokeWidth={.008} hitStrokeWidth={.09} />
          {item.catalogId === 'bath-towel-hooks-wood-black' ? hookCenters(width).map((x, i) => <Group key={i} x={x}>
            <Line points={[-.06, -.035, .06, -.035]} stroke='#c2976a' strokeWidth={.014} />
            <Line points={[0, -.025, 0, .03]} stroke='#202221' strokeWidth={.012} />
            <Circle x={0} y={.032} radius={.012} fill='#202221' />
          </Group>) : item.catalogId?.startsWith('hall-woven-basket-') ? <Line points={[-width/2,0,width/2,0]} stroke='#b69669' strokeWidth={Math.min(depth,.018)} listening={false} /> : item.catalogId?.startsWith('hall-wall-vase-') ? <Rect x={-width/2} y={-depth/2} width={width} height={depth} fill={item.catalogId==='hall-wall-vase-brown'?'#9d6739':'#d2ad6b'} stroke='#856342' strokeWidth={.002} listening={false} /> : item.catalogId==='hall-wheat-print' ? <Group listening={false}><Rect x={-width/2} y={-depth/2} width={width*.524} height={depth} fill='#dfd0bd'/><Rect x={width*.024} y={-depth/2} width={width*.476} height={depth} fill='#a2856a'/></Group> : <>
            <Line points={[-width / 2, -depth * .32, width / 2, -depth * .32]} stroke='#c49a68' strokeWidth={.022} />
            {item.catalogId === 'hall-between-door-decor' ? <Rect x={-.125} y={-.055} width={.25} height={.10} cornerRadius={.03} fill='#d9d0bd' stroke='#a89b80' strokeWidth={.008} /> : [-.1, 0, .1].map((x, i) => <Circle key={i} x={x} y={0} radius={.023} fill={['#cfb17f', '#e6ddc9', '#996b3e'][i]} />)}
          </>}
        </Group>;
      })}
    </Group>
  </Layer>;
}
