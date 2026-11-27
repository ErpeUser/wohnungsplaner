import type { PlannerBuiltIn } from "../../domain/types.ts";
import { zimmer1EntryGoldSegments, ZIMMER1_ENTRY_GOLD_LAYOUT } from "../../domain/zimmer1-entry-gold.ts";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneObject } from "../scene-model.ts";
import { SHARED_BOX } from "../shared/architecture-primitives.ts";

/** Twelve separate pieces; the surrounding 38 cm selection box is not a backing panel. */
export function Zimmer1EntryGoldStrips({ item }: { item: SceneObject<PlannerBuiltIn> }) {
  const { stripWidth, stripLength } = ZIMMER1_ENTRY_GOLD_LAYOUT;
  const material = getPlannerMaterial(item.materialId);
  return (
    <group name="zimmer1-entry-gold-strips">
      {zimmer1EntryGoldSegments().map(segment => (
        <mesh key={segment.id} name={segment.id} position={[segment.x, segment.y, 0]}
          scale={[stripWidth, stripLength - 0.0004, item.size[2]]} geometry={SHARED_BOX} receiveShadow>
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
