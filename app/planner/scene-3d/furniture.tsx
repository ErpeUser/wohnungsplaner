"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { BoxGeometry, CylinderGeometry, Mesh, Object3D, SphereGeometry } from "three";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { resolveFurnitureAsset } from "../catalog/asset-manifest.ts";
import { getPlannerMaterial } from "./materials.ts";
import type { SceneModel, SceneObject } from "./scene-model.ts";
import type { PlannerPlacement } from "../domain/types.ts";

const SHARED_BOX = new BoxGeometry(1, 1, 1);
const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);
const SHARED_SPHERE = new SphereGeometry(0.5, 20, 12);

export function Furniture3D({
  scene,
  selectionId,
  onSelect,
}: {
  scene: SceneModel;
  selectionId: string | null;
  onSelect(id: string | null): void;
}) {
  return (
    <group>
      {scene.placements.map((item) => (
        <FurnitureInstance
          key={item.id}
          item={item}
          selected={selectionId === item.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function FurnitureInstance({
  item,
  selected,
  onSelect,
}: {
  item: SceneObject<PlannerPlacement>;
  selected: boolean;
  onSelect(id: string | null): void;
}) {
  const catalogItem = getFurnitureCatalogItem(item.catalogId);
  const resolution = catalogItem ? resolveFurnitureAsset(catalogItem) : null;
  const fallback = catalogItem?.fallback3d ?? "cabinet";
  const materialId = item.source.materialVariants?.main ?? item.source.materialVariants?.color ?? item.materialId;
  const content = resolution?.kind === "gltf" ? (
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} />}>
        <GltfFurniture path={resolution.asset.path} materialId={materialId} />
      </Suspense>
    </FurnitureAssetBoundary>
  ) : <ParametricFurniture fallback={fallback} materialId={materialId} />;

  return (
    <group
      position={[item.position[0], item.position[1] - item.size[1] / 2, item.position[2]]}
      rotation={[0, item.rotationY, 0]}
      scale={item.size}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item.id);
      }}
    >
      {content}
      {selected ? (
        <mesh position={[0, 0.5, 0]} scale={[1.035, 1.035, 1.035]} geometry={SHARED_BOX}>
          <meshBasicMaterial color="#d46f3a" wireframe transparent opacity={0.88} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function GltfFurniture({ path, materialId }: { path: string; materialId: string }) {
  const gltf = useGLTF(path);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child: Object3D) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = getPlannerMaterial(materialId);
    });
    return clone;
  }, [gltf.scene, materialId]);
  return <primitive object={object} />;
}

function ParametricFurniture({ fallback, materialId }: { fallback: string; materialId: string }) {
  const material = getPlannerMaterial(materialId);
  if (fallback === "rug") {
    return <mesh position={[0, 0.01, 0]} scale={[1, 0.02, 1]} geometry={SHARED_BOX} receiveShadow><primitive object={getPlannerMaterial("rug-woven")} attach="material" /></mesh>;
  }
  if (fallback === "lamp") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]} scale={[0.72, 0.08, 0.72]} geometry={SHARED_CYLINDER} castShadow><primitive object={material} attach="material" /></mesh>
        <mesh position={[0, 0.5, 0]} scale={[0.1, 0.92, 0.1]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        <mesh position={[0, 0.82, 0]} scale={[0.82, 0.34, 0.82]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("shade-linen")} attach="material" /></mesh>
      </group>
    );
  }
  if (fallback === "plant") {
    return (
      <group>
        <mesh position={[0, 0.16, 0]} scale={[0.62, 0.32, 0.62]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("terracotta")} attach="material" /></mesh>
        <mesh position={[0, 0.66, 0]} scale={[0.86, 0.7, 0.86]} geometry={SHARED_SPHERE} castShadow><primitive object={getPlannerMaterial("leaf-green")} attach="material" /></mesh>
      </group>
    );
  }
  return (
    <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.035} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </RoundedBox>
  );
}

class FurnitureAssetBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
