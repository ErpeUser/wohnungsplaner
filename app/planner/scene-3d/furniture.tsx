"use client";

import { BlissBed, DetailedBed } from "./furniture/beds.tsx";
import { ComparisonChair, KaleoArmchair, PhotoOfficeChair, TemuIvoryExecutiveChair } from "./furniture/chairs.tsx";
import { DetailedCabinet, DetailedDresser, DetailedFloorLamp, DetailedLowboard, DetailedShelf, LedChargingNightstand, PhotoDesk, PhotoWardrobe, StandardPlant, StandardWardrobe, TejoHallway, Zimmer1OlivePlant } from "./furniture/decor.tsx";
import { DetailStrip, SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./furniture/primitives.tsx";
import { GalaShaggyRug, LivingIvoryGreigeRug, StandardWovenRug, TemuEasyLineRug, TemuIvoryRabbitRug, TemuWhiteShaggyRug } from "./furniture/rugs.tsx";
import { ChicagoSofa, IvoryPulloutSofa, PhotoSectionalSofa, StandardSofa } from "./furniture/sofas.tsx";
import { BozanDiningTable, ComparisonDiningTable, DetailedTable } from "./furniture/tables.tsx";
export { getWardrobeFrontLayout } from "./furniture/decor.tsx";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Mesh, Object3D, type Material } from "three";

import { resolveFurnitureAsset } from "../catalog/asset-manifest.ts";
import { resolvePlannerAsset } from "../catalog/asset-resolver.ts";
import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { PlannerPlacement } from "../domain/types.ts";
import { plannerAssetUrl } from "./asset-url.ts";
import { CatalogModelGeometry, hasCatalogModelGeometry } from "./catalog-model-geometry.tsx";
import { createCatalogGltfMaterialCloner } from "./gltf-material-roles.ts";
import { normalizeCatalogGltf } from "./gltf-normalization.ts";
import { getPlannerMaterial } from "./materials.ts";
import { DecorativeProxy } from "./furniture/decorative-proxy.tsx";
import { furnitureRenderTransform, furnitureWorldPosition, type SceneModel, type SceneObject } from "./scene-model.ts";

export function Furniture3D({
  scene,
  selectionId,
  onSelect,
  hiddenObjectIds = [],
  assetOrigins = plannerAssetOrigins(),
}: {
  scene: SceneModel;
  selectionId: string | null;
  onSelect(id: string | null): void;
  hiddenObjectIds?: readonly string[];
  assetOrigins?: ReadonlySet<string>;
}) {
  const hiddenObjects = useMemo(() => new Set(hiddenObjectIds), [hiddenObjectIds]);
  return (
    <group>
      {scene.placements.filter((item) => !hiddenObjects.has(item.id)).map((item) => (
        <FurnitureInstance
          // Product switches must remount the parametric tree; keeping only the
          // placement key can leave the previous table geometry behind in R3F.
          key={`${item.id}:${item.catalogId}:${item.size.join(":")}`}
          item={item}
          selected={selectionId === item.id}
          onSelect={onSelect}
          assetOrigins={assetOrigins}
        />
      ))}
    </group>
  );
}

function FurnitureInstance({
  item,
  selected,
  onSelect,
  assetOrigins,
}: {
  item: SceneObject<PlannerPlacement>;
  selected: boolean;
  onSelect(id: string | null): void;
  assetOrigins: ReadonlySet<string>;
}) {
  const catalogItem = getFurnitureCatalogItem(item.catalogId);
  const resolution = catalogItem ? resolveFurnitureAsset(catalogItem) : null;
  const importedResolution = item.asset
    ? resolvePlannerAsset({ assets: [item.asset] }, item.asset.assetId, assetOrigins)
    : null;
  const fallback = catalogItem?.fallback3d ?? "cabinet";
  const materialId = item.source.materialVariants?.main ?? item.source.materialVariants?.color ?? item.materialId;
  const importedGlb = importedResolution?.kind === "remote" && importedResolution.asset.mediaType === "model/gltf-binary";
  const catalogGeometryId = hasCatalogModelGeometry(item.catalogId) ? item.catalogId : null;
  const catalogGlb = resolution?.kind === "gltf" && catalogItem?.renderMode !== "parametric" && catalogGeometryId === null;
  const modelMeterScale = importedGlb
    ? importedResolution.asset.meterScale ?? 1
    : catalogGlb
      ? resolution.asset.meterScale
      : 1;
  const renderTransform = furnitureRenderTransform(item, {
    meterScale: modelMeterScale,
    useAssetDimensions: importedGlb || catalogGlb,
  });
  const content = importedGlb ? (
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
        <GltfFurniture path={importedResolution.url} />
      </Suspense>
    </FurnitureAssetBoundary>
  ) : catalogGeometryId ? (
    <CatalogModelGeometry
      catalogId={catalogGeometryId}
      materialId={item.source.materialVariants?.main ?? item.source.materialVariants?.color ?? catalogItem?.materials[0]?.id ?? materialId}
      size={item.size}
    />
  ) : catalogGlb ? (
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
        <GltfFurniture
          path={plannerAssetUrl(resolution.asset.path)}
          normalizeToUnitBounds
          catalogAssetId={resolution.asset.id}
          materialId={item.source.materialVariants?.main ?? item.source.materialVariants?.color ?? catalogItem?.materials[0]?.id}
        />
      </Suspense>
    </FurnitureAssetBoundary>
  ) : <ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />;

  return (
    <group
      position={furnitureWorldPosition(item, renderTransform)}
      rotation={[0, item.rotationY, 0]}
      scale={renderTransform.scale}
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

function plannerAssetOrigins(): ReadonlySet<string> {
  const configured = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_PLANNER_ASSET_ORIGINS : undefined;
  return new Set((configured ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

function GltfFurniture({ path, normalizeToUnitBounds = false, catalogAssetId, materialId }: {
  path: string; normalizeToUnitBounds?: boolean; catalogAssetId?: string; materialId?: string;
}) {
  const gltf = useGLTF(path);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const cloneMaterial = createCatalogGltfMaterialCloner(gltf.parser.associations, catalogAssetId, materialId);
    clone.traverse((child: Object3D) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      // Only known local catalog roles use the selected finish. Imported assets
      // and all other slots keep private clones of their authored PBR materials.
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMaterial)
        : cloneMaterial(child.material);
    });
    return normalizeToUnitBounds ? normalizeCatalogGltf(clone) : clone;
  }, [gltf.scene, gltf.parser.associations, normalizeToUnitBounds, catalogAssetId, materialId]);
  useEffect(() => {
    if (!catalogAssetId) return;
    // R3F leaves primitives undisposed. These are only the private material
    // clones created above; geometry, textures and loader/recipe caches are shared.
    const materials = new Set<Material>();
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    });
    return () => {
      for (const material of materials) material.dispose();
    };
  }, [catalogAssetId, object]);
  return <primitive object={object} />;
}

function ParametricFurniture({ fallback, materialId, catalogId, size }: { fallback: string; materialId: string; catalogId: string; size?: [number, number, number] }) {
  const material = getPlannerMaterial(materialId);
  if (catalogId === "bed-bliss-120") return <BlissBed />;
  if (catalogId === "sofa-aliexpress-142" || catalogId === "sofa-aliexpress-142-open") return <IvoryPulloutSofa extended={catalogId === "sofa-aliexpress-142-open"} depth={size?.[2]} />;
  if (catalogId === "sofa-chicago-206") return <ChicagoSofa />;
  if (catalogId === "hallway-tejo-115") return <TejoHallway />;
  if (catalogId === "dining-table-bozan-110") return <BozanDiningTable />;
  if (catalogId.startsWith("dining-table-")) return <ComparisonDiningTable materialId={materialId} catalogId={catalogId} size={size} />;
  if (catalogId === "chair-kaleo-chenille-beige") return <KaleoArmchair />;
  if (catalogId === "chair-temu-swivel-upholstered") return <ComparisonChair variant="temu-swivel" materialId={materialId} />;
  if (catalogId === "chair-temu-faux-leather-metal") return <ComparisonChair variant="faux-leather" materialId={materialId} />;
  if (catalogId === "chair-temu-velvet-swivel-arm") return <ComparisonChair variant="velvet-swivel" materialId={materialId} />;
  if (catalogId === "chair-amber-chenille-beige") return <ComparisonChair variant="amber" materialId={materialId} />;
  if (catalogId === "nightstand-led-2drawer-white") return <LedChargingNightstand />;
  if (catalogId === "rug-temu-easy-line-120x180" || catalogId === "rug-temu-easy-line-140x200") return <TemuEasyLineRug materialId={materialId} />;
  if (catalogId === "rug-temu-rabbit-ivory-100x180") return <TemuIvoryRabbitRug />;
  if (catalogId === "rug-living-concept-240x240") return <LivingIvoryGreigeRug />;
  if (catalogId === "rug-temu-shaggy-white-120x200") return <TemuWhiteShaggyRug />;
  if (catalogId === "rug-gala-shaggy-2505-100x200") return <GalaShaggyRug />;
  if (catalogId === "plant-zimmer1-olive") return <Zimmer1OlivePlant />;
  if (catalogId === "vanity-vicco-sherry-120") return <ViccoSherryVanity />;
  if (catalogId === "chair-temu-executive-ivory") return <TemuIvoryExecutiveChair />;
  if (catalogId.startsWith("bed-")) return <DetailedBed materialId={materialId} />;
  if (catalogId === "wardrobe-200") return <StandardWardrobe materialId={materialId} />;
  if (catalogId === "wardrobe-225") return <PhotoWardrobe />;
  if (catalogId === "dresser") return <DetailedDresser materialId={materialId} />;
  if (catalogId === "shelf") return <DetailedShelf materialId={materialId} />;
  if (catalogId === "lowboard") return <DetailedLowboard materialId={materialId} />;
  if (catalogId === "desk-standard") return <PhotoDesk />;
  if (catalogId === "chair-office") return <PhotoOfficeChair />;
  if (catalogId === "sofa-sectional-photo") return <PhotoSectionalSofa />;
  if (catalogId === "rug-200") return <StandardWovenRug />;
  if (catalogId === "floor-lamp") return <DetailedFloorLamp />;
  if (catalogId === "plant-medium") return <StandardPlant />;
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
  if (fallback === "decor" || fallback === "shelf") {
    return <DecorativeProxy catalogId={catalogId} fallback={fallback} materialId={materialId} />;
  }
  if (fallback === "sofa") return <StandardSofa />;
  if (fallback === "table") return <DetailedTable materialId={materialId} />;
  if (fallback === "cabinet") return <DetailedCabinet materialId={materialId} />;
  return (
    <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.035} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </RoundedBox>
  );
}

function ViccoSherryVanity() {
  const white = getPlannerMaterial("white-lacquer");
  const gold = getPlannerMaterial("metal-gold");
  const mirror = getPlannerMaterial("mirror-glass");
  const tabletopY = 0.75 / 1.55;
  const cabinetHeight = 0.75 / 1.55;
  const drawerYs = [0.08, 0.22, 0.36, 0.5, 0.64].map((height) => height / 1.55);
  return (
    <group>
      <RoundedBox args={[1, 0.014, 1]} radius={0.012} smoothness={4} position={[0, tabletopY, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>

      <RoundedBox args={[0.305, cabinetHeight, 0.94]} radius={0.018} smoothness={4} position={[-0.347, cabinetHeight / 2, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      {drawerYs.map((y) => (
        <group key={y} position={[-0.347, y, 0.483]}>
          <RoundedBox args={[0.286, 0.086, 0.025]} radius={0.01} smoothness={3} castShadow>
            <primitive object={white} attach="material" />
          </RoundedBox>
          <DetailStrip position={[0, -0.046, 0.019]} scale={[0.26, 0.006, 0.008]} materialId="drawer-charcoal" />
          <mesh position={[0, 0.005, 0.022]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 0.13, 0.012]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={gold} attach="material" />
          </mesh>
        </group>
      ))}

      <group position={[0.465, cabinetHeight / 2, 0]}>
        <mesh scale={[0.024, cabinetHeight * 0.96, 0.86]} geometry={SHARED_BOX} castShadow><primitive object={gold} attach="material" /></mesh>
        <mesh position={[-0.085, -cabinetHeight / 2 + 0.014, 0]} scale={[0.19, 0.026, 0.9]} geometry={SHARED_BOX} castShadow><primitive object={gold} attach="material" /></mesh>
      </group>
      <mesh position={[0.06, tabletopY - 0.02, -0.43]} scale={[0.78, 0.035, 0.045]} geometry={SHARED_BOX} castShadow>
        <primitive object={gold} attach="material" />
      </mesh>

      <group position={[0, 1.2 / 1.55, -0.485]}>
        <RoundedBox args={[0.917, 0.452, 0.045]} radius={0.022} smoothness={5} castShadow receiveShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>
        <RoundedBox args={[0.84, 0.408, 0.022]} radius={0.012} smoothness={5} position={[0, 0, 0.031]} castShadow>
          <primitive object={mirror} attach="material" />
        </RoundedBox>
        <DetailStrip position={[0, 0.224, 0.052]} scale={[0.82, 0.009, 0.012]} materialId="metal-gold" />
        <DetailStrip position={[0, -0.224, 0.052]} scale={[0.82, 0.009, 0.012]} materialId="metal-gold" />
        <DetailStrip position={[-0.412, 0, 0.052]} scale={[0.009, 0.42, 0.012]} materialId="metal-gold" />
        <DetailStrip position={[0.412, 0, 0.052]} scale={[0.009, 0.42, 0.012]} materialId="metal-gold" />
        {[-1, 1].map((side) => (
          <mesh key={`led-horizontal-${side}`} position={[0, side * 0.19, 0.052]} scale={[0.79, 0.014, 0.012]} geometry={SHARED_BOX}>
            <meshStandardMaterial color="#fff4dc" emissive="#ffd7a0" emissiveIntensity={1.85} roughness={0.32} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`led-vertical-${side}`} position={[side * 0.398, 0, 0.052]} scale={[0.014, 0.366, 0.012]} geometry={SHARED_BOX}>
            <meshStandardMaterial color="#fff4dc" emissive="#ffd7a0" emissiveIntensity={1.85} roughness={0.32} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.775, -0.2]} color="#ffd8a6" intensity={0.34} distance={1.6} decay={2} />
    </group>
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
