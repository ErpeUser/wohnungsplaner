'use client';
import { useMemo, type ComponentProps } from 'react';
import { PlannerArchitecture as BaseArchitecture } from './architecture-base.tsx';
import { RefinedInteriorModel, hasRefinedInteriorModel } from './interior-models.tsx';
import { InteriorFloor } from './interior-floors.tsx';
import { partitionFloorRendering } from '../plan-2d/interior-plan-geometry.ts';

type Props = ComponentProps<typeof BaseArchitecture>;

/** Preserve all appliances, doors, walls and unrelated furniture. */
export function PlannerArchitecture(props: Props) {
  const { scene, selectionId, onSelect, hiddenObjectIds = [] } = props;
  const hidden = useMemo(() => new Set(hiddenObjectIds), [hiddenObjectIds]);
  const floors = useMemo(() => partitionFloorRendering(scene.floors), [scene.floors]);
  const partition = useMemo(() => ({
    original: { ...scene, floors: floors.base, builtIns: scene.builtIns.filter(item => !hasRefinedInteriorModel(item)) },
    refined: scene.builtIns.filter(hasRefinedInteriorModel),
  }), [scene, floors]);
  return <>
    {floors.metric.map(floor => <InteriorFloor key={floor.id} floor={floor} />)}
    <BaseArchitecture {...props} scene={partition.original} />
    {partition.refined.filter(item => !hidden.has(item.id)).map(item => (
      <group key={item.id} position={item.position} rotation={[0, item.rotationY, 0]}
        onClick={event => { event.stopPropagation(); onSelect(item.id); }}>
        <RefinedInteriorModel item={item} />
        {selectionId === item.id ? <mesh scale={item.size}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color='#d46f3a' wireframe transparent opacity={0.7} />
        </mesh> : null}
      </group>
    ))}
  </>;
}
