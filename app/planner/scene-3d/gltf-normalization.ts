import { Box3, Group, Vector3, type Object3D } from "three";

/** Normalize a private scene clone for the catalog's outer placement scale. */
export function normalizeCatalogGltf(object: Object3D): Group {
  object.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(object, true);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const scale = new Vector3(1 / size.x, 1 / size.y, 1 / size.z);
  if (
    bounds.isEmpty()
    || ![...size.toArray(), ...center.toArray(), ...scale.toArray(), bounds.min.y].every(Number.isFinite)
    || size.x <= 0 || size.y <= 0 || size.z <= 0
  ) {
    throw new Error("Catalog GLB requires finite, non-zero bounds on every axis.");
  }

  // Translate in source coordinates before scaling. Keep the actual geometry,
  // authored node transforms and materials intact; never modify the loader cache.
  const centered = new Group();
  centered.position.set(-center.x, -bounds.min.y, -center.z);
  centered.add(object);
  const normalized = new Group();
  normalized.scale.copy(scale);
  normalized.add(centered);
  return normalized;
}
