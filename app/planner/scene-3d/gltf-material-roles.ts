import { MeshStandardMaterial, type Material } from "three";
import type { GLTF } from "three-stdlib";

import { getPlannerMaterial } from "./materials.ts";

// Original GLB material indices, verified against their geometry and generator.
// Roles must not depend on mesh traversal order, names or similar colours.
const SELECTED_MATERIALS: Record<string, readonly number[]> = {
  "model-bed": [2], // Headboard; retain frame, mattress and pillows.
  "model-chair": [0, 1], // Seat and back; retain legs.
  "model-table": [0], // Top; retain legs.
  "model-storage": [0], // Body; retain front accents and feet.
  "model-plant": [0], // Pot; retain stem and leaves.
  "model-sofa": [0, 1, 2, 3, 4, 5], // Upholstery with authored relative lightness.
};

/** Clone private materials using associations from the unmodified loader output. */
export function createCatalogGltfMaterialCloner(
  associations: GLTF["parser"]["associations"],
  assetId?: string,
  materialId?: string,
): (source: Material) => Material {
  const selected = assetId ? SELECTED_MATERIALS[assetId] : undefined;
  if (!selected || !materialId) return (source) => source.clone();

  // GLTFLoader retains baseColorFactor in linear RGB. The sofa has two authored
  // lightness groups; carry their measured ratio into the selected finish.
  const luminances = new Map<number, number>();
  if (assetId === "model-sofa") {
    for (const [source, reference] of associations) {
      const index = reference.materials;
      if (source instanceof MeshStandardMaterial && index !== undefined && selected.includes(index)) {
        const { r, g, b } = source.color;
        luminances.set(index, r * 0.2126 + g * 0.7152 + b * 0.0722);
      }
    }
  }
  const maximumLuminance = Math.max(0, ...luminances.values());

  return (source) => {
    // Scene cloning still shares the original material reference here; look up
    // its real glTF index before making a private material clone.
    const index = associations.get(source)?.materials;
    if (index === undefined || !selected.includes(index)) return source.clone();
    const lightness = assetId === "model-sofa" ? (luminances.get(index) ?? NaN) / maximumLuminance : 1;
    if (!Number.isFinite(lightness) || lightness < 0) return source.clone();
    const material = getPlannerMaterial(materialId).clone();
    material.color.multiplyScalar(lightness);
    return material;
  };
}
