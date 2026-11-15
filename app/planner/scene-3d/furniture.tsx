"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { BoxGeometry, BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, LatheGeometry, Mesh, Object3D, Quaternion, Shape, SphereGeometry, TubeGeometry, Vector2, Vector3, type Material } from "three";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { resolveFurnitureAsset } from "../catalog/asset-manifest.ts";
import { resolvePlannerAsset } from "../catalog/asset-resolver.ts";
import { getComparisonTabletopMaterial, getPlannerMaterial } from "./materials.ts";
import { furnitureRenderTransform, furnitureWorldPosition, type SceneModel, type SceneObject } from "./scene-model.ts";
import type { PlannerPlacement } from "../domain/types.ts";
import { tableVisualProfile } from "../tables/table-models.ts";
import { getChairModelForCatalogId } from "../chairs/chair-models.ts";
import { normalizeCatalogGltf } from "./gltf-normalization.ts";
import { createCatalogGltfMaterialCloner } from "./gltf-material-roles.ts";
import { plannerAssetUrl } from "./asset-url.ts";
import { createChairCushionGeometry } from "./chair-cushion-geometry.ts";
import { CatalogModelGeometry, hasCatalogModelGeometry } from "./catalog-model-geometry.tsx";
import { createMetricChairFabricGeometry } from "./chair-fabric-uv.ts";

const SHARED_BOX = new BoxGeometry(1, 1, 1);
const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);
const SHARED_SPHERE = new SphereGeometry(0.5, 20, 12);
const PRIMARY_TABLETOPS = new Set([
  "dining-table-aliexpress-100-140",
  "dining-table-temu-606997-120-160",
  "dining-table-kaufland-567080013-120-160",
]);

function DetailStrip({
  position,
  scale,
  materialId,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  scale: [number, number, number];
  materialId: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} geometry={SHARED_BOX} castShadow>
      <primitive object={getPlannerMaterial(materialId)} attach="material" />
    </mesh>
  );
}

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
  if (fallback === "sofa") return <StandardSofa />;
  if (fallback === "table") return <DetailedTable materialId={materialId} />;
  if (fallback === "cabinet") return <DetailedCabinet materialId={materialId} />;
  return (
    <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.035} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </RoundedBox>
  );
}


function StandardWovenRug() {
  const base = getPlannerMaterial("rug-woven");
  const edge = getPlannerMaterial("rug-gala-beige-taupe");
  return (
    <group>
      <RoundedBox args={[1, 0.018, 0.7]} radius={0.025} smoothness={3} position={[0, 0.012, 0]} receiveShadow>
        <primitive object={base} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.024, 0]} scale={[0.94, 0.006, 0.64]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <DetailStrip position={[0, 0.031, -0.29]} scale={[0.9, 0.004, 0.012]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[0, 0.031, 0.29]} scale={[0.9, 0.004, 0.012]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[-0.44, 0.031, 0]} scale={[0.012, 0.004, 0.58]} materialId="rug-gala-beige-taupe" />
      <DetailStrip position={[0.44, 0.031, 0]} scale={[0.012, 0.004, 0.58]} materialId="rug-gala-beige-taupe" />
    </group>
  );
}

function DetailedFloorLamp() {
  const base = getPlannerMaterial("metal-dark");
  const stem = getPlannerMaterial("metal-satin");
  const shade = getPlannerMaterial("shade-linen");
  return (
    <group>
      <mesh position={[0, 0.035, 0]} scale={[0.42, 0.07, 0.42]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </mesh>
      <mesh position={[0, 0.78, 0]} scale={[0.045, 1.45, 0.045]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={stem} attach="material" />
      </mesh>
      <mesh position={[0, 1.52, 0]} scale={[0.38, 0.28, 0.38]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={shade} attach="material" />
      </mesh>
      <mesh position={[0, 1.45, 0]} scale={[0.11, 0.08, 0.11]} geometry={SHARED_SPHERE} castShadow>
        <meshStandardMaterial color="#fff4da" emissive="#ffd27a" emissiveIntensity={0.65} roughness={0.32} />
      </mesh>
      <pointLight position={[0, 1.45, 0]} color="#ffd59a" intensity={0.18} distance={1.5} decay={2} />
    </group>
  );
}

function StandardPlant() {
  const pot = getPlannerMaterial("terracotta");
  const leaf = getPlannerMaterial("leaf-green");
  const stems = [-0.2, -0.07, 0.08, 0.22];
  return (
    <group>
      <mesh position={[0, 0.16, 0]} scale={[0.62, 0.32, 0.62]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={pot} attach="material" />
      </mesh>
      {stems.map((x, index) => (
        <group key={x} position={[x, 0.38, index % 2 === 0 ? -0.03 : 0.05]} rotation={[0, 0, (index - 1.5) * 0.12]}>
          <mesh position={[0, 0.3, 0]} scale={[0.028, 0.58, 0.028]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={getPlannerMaterial("metal-dark")} attach="material" />
          </mesh>
          <mesh position={[index % 2 === 0 ? -0.12 : 0.12, 0.6, index % 2 === 0 ? 0.04 : -0.04]} scale={[0.2, 0.09, 0.07]} geometry={SHARED_SPHERE} castShadow receiveShadow>
            <primitive object={leaf} attach="material" />
          </mesh>
          <mesh position={[index % 2 === 0 ? 0.12 : -0.12, 0.75, index % 2 === 0 ? -0.03 : 0.03]} scale={[0.18, 0.08, 0.065]} geometry={SHARED_SPHERE} castShadow receiveShadow>
            <primitive object={leaf} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LedChargingNightstand() {
  const white = getPlannerMaterial("white-lacquer");
  const dark = getPlannerMaterial("metal-dark");
  const black = getPlannerMaterial("screen-black");
  const drawerYs = [0.19, 0.43];

  return (
    <group>
      <RoundedBox args={[0.94, 0.72, 0.88]} radius={0.025} smoothness={5} position={[0, 0.36, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>

      {drawerYs.map((y) => (
        <group key={`drawer-${y}`}>
          <RoundedBox args={[0.82, 0.205, 0.035]} radius={0.012} smoothness={4} position={[0, y, 0.458]} castShadow receiveShadow>
            <primitive object={white} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.24, 0.025, 0.028]} radius={0.01} smoothness={4} position={[0, y + 0.015, 0.486]} castShadow>
            <primitive object={dark} attach="material" />
          </RoundedBox>
        </group>
      ))}

      <RoundedBox args={[0.82, 0.18, 0.045]} radius={0.012} smoothness={4} position={[0, 0.625, 0.458]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9f1ff" emissive="#2b9fff" emissiveIntensity={1.45} roughness={0.38} />
      </RoundedBox>
      <mesh position={[0, 0.585, 0.432]} scale={[0.74, 0.018, 0.72]} geometry={SHARED_BOX} receiveShadow>
        <meshStandardMaterial color="#b9e4ff" emissive="#168de0" emissiveIntensity={0.72} roughness={0.45} />
      </mesh>
      <pointLight position={[0, 0.65, 0.52]} color="#65bfff" intensity={0.28} distance={0.85} decay={2} />

      <RoundedBox args={[0.98, 0.095, 0.96]} radius={0.035} smoothness={6} position={[0, 0.785, 0]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.085, 0.42]} radius={0.025} smoothness={6} position={[0, 0.88, -0.16]} rotation={[-0.18, 0, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>

      {[-0.19, 0.19].map((x) => (
        <group key={`socket-${x}`} position={[x, 0.93, -0.145]} rotation={[-0.18, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.095, 0.018, 0.095]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={black} attach="material" />
          </mesh>
          {[-0.027, 0.027].map((pinX) => (
            <mesh key={pinX} position={[pinX, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.012, 0.024, 0.012]} geometry={SHARED_CYLINDER}>
              <primitive object={white} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.055, 0.055].map((x) => (
        <RoundedBox key={`usb-${x}`} args={[0.07, 0.018, 0.026]} radius={0.005} smoothness={3} position={[x, 0.936, 0.045]} rotation={[-0.18, 0, 0]}>
          <primitive object={black} attach="material" />
        </RoundedBox>
      ))}

      {[-0.4, 0.4].flatMap((x) => [-0.34, 0.34].map((z) => (
        <mesh key={`foot-${x}-${z}`} position={[x, 0.025, z]} scale={[0.065, 0.05, 0.065]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      )))}
    </group>
  );
}

/** Metric dimensions are applied by furnitureRenderTransform to this normalized geometry. */
function IvoryPulloutSofa({ extended, depth = extended ? 1.72 : 0.9 }: { extended: boolean; depth?: number }) {
  const fabric = getPlannerMaterial("fabric-ali-ivory");
  const shadow = getPlannerMaterial("fabric-ali-shade");
  const metal = getPlannerMaterial("metal-black");
  const centers = [-0.235, 0.235];
  // The plan uses the complete open footprint. Cancel that extra depth for
  // the stationary body; only the sliding supports and cushions extend.
  const bodyDepth = extended ? 0.9 : depth;
  const bodyOffset = extended ? -(depth - bodyDepth) / 2 : 0;
  const footrestEnd = (depth * 0.485 - bodyOffset) / bodyDepth;
  const footrestStart = 0.33;
  const footrestDepth = footrestEnd - footrestStart;
  const footrestCenter = (footrestStart + footrestEnd) / 2;
  const railStart = 0.12;
  const railDepth = footrestEnd - railStart;
  const railCenter = (railStart + footrestEnd) / 2;
  return (
    <group position={[0, 0, bodyOffset / depth]} scale={[1, 1, bodyDepth / depth]}>
      <RoundedBox args={[0.83, 0.36, 0.76]} radius={0.055} smoothness={6} position={[0, 0.23, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {centers.map((x) => (
        <group key={x}>
          <RoundedBox args={[0.42, 0.15, 0.55]} radius={0.055} smoothness={6} position={[x, 0.47, 0.07]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.31, 0.20, 0.11]} radius={0.037} smoothness={5} position={[x, 0.62, -0.19]} rotation={[-0.15, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.40, 0.18]} radius={0.07} smoothness={7} position={[x, 0.72, -0.36]} rotation={[-0.06, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.21, 0.19]} radius={0.075} smoothness={7} position={[x, 0.89, -0.39]} rotation={[-0.1, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <DetailStrip position={[x, 0.72, -0.26]} scale={[0.34, 0.006, 0.009]} materialId="fabric-ali-seam" />
          {extended ? (
            <group>
              <DetailStrip position={[x, 0.235, railCenter]} scale={[0.3, 0.025, railDepth]} materialId="metal-black" />
              <DetailStrip position={[x - 0.10, 0.215, railCenter]} scale={[0.018, 0.018, railDepth * 0.94]} materialId="metal-black" rotation={[0.13, -0.12, 0]} />
              <DetailStrip position={[x + 0.10, 0.215, railCenter]} scale={[0.018, 0.018, railDepth * 0.94]} materialId="metal-black" rotation={[-0.13, 0.12, 0]} />
              <RoundedBox args={[0.43, 0.16, footrestDepth]} radius={0.05} smoothness={6} position={[x, 0.42, footrestCenter]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
              <DetailStrip position={[x, 0.43, footrestEnd]} scale={[0.33, 0.008, 0.012]} materialId="fabric-ali-seam" />
            </group>
          ) : <RoundedBox args={[0.43, 0.23, 0.10]} radius={0.036} smoothness={5} position={[x, 0.29, 0.39]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>}
        </group>
      ))}
      {[-0.43, 0.43].map((x) => (
        <group key={x}>
          <RoundedBox args={[0.14, 0.49, 0.75]} radius={0.065} smoothness={7} position={[x, 0.405, -0.025]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.19, 0.19, 0.74]} radius={0.08} smoothness={7} position={[x, 0.71, -0.04]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <DetailStrip position={[x, 0.34, 0]} scale={[0.005, 0.009, 0.44]} materialId="fabric-ali-seam" />
          {[-0.33, 0.27].map((z) => <mesh key={z} position={[x, 0.047, z]} scale={[0.06, 0.09, 0.065]} geometry={SHARED_BOX}><primitive object={metal} attach="material" /></mesh>)}
        </group>
      ))}
      <RoundedBox args={[0.012, 0.27, 0.32]} radius={0.01} smoothness={4} position={[-0.504, 0.31, 0.02]}><primitive object={shadow} attach="material" /></RoundedBox>
      <DetailStrip position={[-0.515, 0.44, 0.02]} scale={[0.006, 0.008, 0.28]} materialId="fabric-ali-seam" />
      <mesh position={[0.51, 0.34, 0.17]} rotation={[0, 0, Math.PI / 2]} scale={[0.058, 0.012, 0.058]} geometry={SHARED_CYLINDER}><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}

function ChicagoSofa() {
  const fabric = getPlannerMaterial("fabric-chicago-chenille");
  const seam = getPlannerMaterial("fabric-sand");
  const dark = getPlannerMaterial("metal-black");
  const control = getPlannerMaterial("screen-black");
  const seatCenters = [-0.225, 0.225];

  return (
    <group>
      <RoundedBox args={[0.84, 0.17, 0.64]} radius={0.05} smoothness={6} position={[0, 0.26, -0.01]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>

      {seatCenters.map((x) => (
        <group key={`relax-seat-${x}`}>
          <RoundedBox args={[0.43, 0.18, 0.54]} radius={0.07} smoothness={7} position={[x, 0.49, 0.1]} rotation={[-0.04, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.425, 0.14, 0.47]} radius={0.055} smoothness={7} position={[x, 0.39, 0.55]} rotation={[0.13, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.42, 0.1, 0.27]} radius={0.05} smoothness={7} position={[x, 0.315, 0.88]} rotation={[0.05, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.35, 0.012, 0.018]} radius={0.006} smoothness={3} position={[x, 0.495, 0.373]} rotation={[0.02, 0, 0]} castShadow>
            <primitive object={seam} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.34, 0.012, 0.018]} radius={0.006} smoothness={3} position={[x, 0.405, 0.79]} rotation={[0.12, 0, 0]} castShadow>
            <primitive object={seam} attach="material" />
          </RoundedBox>
          <mesh position={[x, 0.22, 0.48]} scale={[0.31, 0.035, 0.73]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[x, 0.24, 0.59]} rotation={[0.46, 0, 0]} scale={[0.035, 0.035, 0.48]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ))}

      {seatCenters.map((x) => (
        <group key={`back-${x}`}>
          <RoundedBox args={[0.43, 0.38, 0.19]} radius={0.075} smoothness={7} position={[x, 0.64, -0.29]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.43, 0.22, 0.17]} radius={0.075} smoothness={7} position={[x, 0.88, -0.37]} rotation={[-0.14, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
        </group>
      ))}

      {[-0.45, 0.45].map((x) => (
        <RoundedBox key={`arm-${x}`} args={[0.1, 0.56, 0.8]} radius={0.055} smoothness={7} position={[x, 0.5, -0.015]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.82, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.74, -0.405]} rotation={[-0.08, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.29, 0.39]} rotation={[0.02, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>

      {[
        [-0.42, -0.31, 0.18],
        [0.42, -0.31, -0.18],
        [-0.42, 0.29, 0.18],
        [0.42, 0.29, -0.18],
      ].map(([x, z, tilt], index) => (
        <mesh key={`leg-${index}`} position={[x, 0.105, z]} rotation={[z > 0 ? -0.15 : 0.15, 0, tilt]} scale={[0.035, 0.23, 0.04]} geometry={SHARED_BOX} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}

      <RoundedBox args={[0.035, 0.095, 0.14]} radius={0.015} smoothness={5} position={[0.385, 0.61, 0.06]} rotation={[0, 0, 0]} castShadow>
        <primitive object={control} attach="material" />
      </RoundedBox>
      {[-0.018, 0.018].map((z) => (
        <mesh key={`control-${z}`} position={[0.363, 0.615, 0.06 + z]} rotation={[0, 0, Math.PI / 2]} scale={[0.016, 0.008, 0.016]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function TejoHallway() {
  const cashmere = getPlannerMaterial("tejo-cashmere-grain");
  const panel = getPlannerMaterial("tejo-panel-greige");
  const mirror = getPlannerMaterial("mirror-glass");
  const dark = getPlannerMaterial("metal-dark");
  const paddedRows = [0.34, 0.425, 0.51, 0.595, 0.68];
  const hookXs = [0.03, 0.17, 0.31, 0.45];

  return (
    <group>
      <RoundedBox args={[0.98, 0.205, 0.94]} radius={0.012} smoothness={3} position={[0, 0.112, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.208, 0.478]} scale={[0.94, 0.012, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>

      <RoundedBox args={[0.325, 0.61, 0.94]} radius={0.01} smoothness={3} position={[-0.327, 0.515, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.267, 0.53, 0.022]} radius={0.008} smoothness={4} position={[-0.327, 0.53, 0.482]} castShadow receiveShadow>
        <primitive object={mirror} attach="material" />
      </RoundedBox>
      <mesh position={[-0.327, 0.53, 0.496]} scale={[0.235, 0.49, 0.008]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={mirror} attach="material" />
      </mesh>
      <DetailStrip position={[-0.327, 0.53, 0.459]} scale={[0.285, 0.012, 0.012]} materialId="metal-satin" />
      <DetailStrip position={[-0.47, 0.53, 0.482]} scale={[0.012, 0.53, 0.012]} materialId="metal-satin" />
      <DetailStrip position={[-0.184, 0.53, 0.482]} scale={[0.012, 0.53, 0.012]} materialId="metal-satin" />

      <RoundedBox args={[0.61, 0.57, 0.055]} radius={0.01} smoothness={3} position={[0.18, 0.515, -0.445]} castShadow receiveShadow>
        <primitive object={panel} attach="material" />
      </RoundedBox>
      {paddedRows.map((y) => (
        <RoundedBox key={y} args={[0.565, 0.075, 0.035]} radius={0.018} smoothness={5} position={[0.18, y, -0.407]} castShadow receiveShadow>
          <primitive object={panel} attach="material" />
        </RoundedBox>
      ))}

      <RoundedBox args={[0.58, 0.055, 0.73]} radius={0.025} smoothness={5} position={[0.19, 0.244, 0.07]} castShadow receiveShadow>
        <primitive object={panel} attach="material" />
      </RoundedBox>
      <DetailStrip position={[0.19, 0.27, 0.445]} scale={[0.48, 0.012, 0.012]} materialId="tejo-cashmere" />
      <DetailStrip position={[0.19, 0.515, -0.478]} scale={[0.48, 0.012, 0.012]} materialId="metal-satin" />

      <RoundedBox args={[0.98, 0.19, 0.94]} radius={0.012} smoothness={3} position={[0, 0.9, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.807, 0.478]} scale={[0.94, 0.012, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>

      <mesh position={[0.19, 0.785, 0.425]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.52, 0.025]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>
      {[-0.08, 0.46].map((x) => (
        <mesh key={x} position={[x, 0.76, 0.425]} scale={[0.025, 0.08, 0.025]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}

      {hookXs.map((x) => (
        <group key={x} position={[x, 0.69, -0.355]}>
          <mesh position={[0, 0, 0]} scale={[0.022, 0.075, 0.025]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[0, -0.027, 0.025]} rotation={[0.55, 0, 0]} scale={[0.022, 0.055, 0.022]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.565, 0.09, 0.025]} radius={0.005} smoothness={3} position={[0.18, 0.69, -0.38]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>

      {[-0.43, 0.43].map((x) => (
        <mesh key={x} position={[x, 0.012, 0.32]} scale={[0.055, 0.024, 0.055]} geometry={SHARED_BOX} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function BlissBed() {
  const fabric = getPlannerMaterial("fabric-bliss-weave");
  const dark = getPlannerMaterial("metal-dark");
  const bedding = getPlannerMaterial("fabric-ecru");
  const taupe = getPlannerMaterial("fabric-taupe");
  const white = getPlannerMaterial("fabric-white");
  const headboardColumns = [-0.375, -0.125, 0.125, 0.375];
  const headboardRows = [0.25, 0.52, 0.79];
  const railSegments = [-0.33, -0.165, 0, 0.165, 0.33];

  return (
    <group>
      <RoundedBox args={[0.955, 0.245, 0.93]} radius={0.048} smoothness={6} position={[0, 0.17, 0.005]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.96, 0.25, 0.105]} radius={0.04} smoothness={6} position={[0, 0.2, 0.445]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {headboardColumns.map((x) => (
        <RoundedBox key={`foot-${x}`} args={[0.232, 0.218, 0.052]} radius={0.052} smoothness={6} position={[x, 0.205, 0.505]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {[-0.465, 0.465].map((x) => (
        <RoundedBox key={x} args={[0.055, 0.235, 0.82]} radius={0.032} smoothness={5} position={[x, 0.2, 0.005]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {[-0.467, 0.467].flatMap((x) => railSegments.map((z) => (
        <RoundedBox key={`rail-${x}-${z}`} args={[0.054, 0.205, 0.145]} radius={0.045} smoothness={6} position={[x, 0.205, z]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      )))}
      <mesh position={[0, 0.325, 0.01]} scale={[0.79, 0.055, 0.86]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={fabric} attach="material" />
      </mesh>
      <RoundedBox args={[0.816, 0.16, 0.895]} radius={0.055} smoothness={7} position={[0, 0.45, 0.005]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.83, 0.095, 0.84]} radius={0.05} smoothness={7} position={[0, 0.56, 0.035]} rotation={[-0.018, 0, 0]} castShadow receiveShadow>
        <primitive object={bedding} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.024]} radius={0.008} smoothness={3} position={[0, 0.62, 0.458]} castShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.78, 0.012, 0.024]} radius={0.008} smoothness={3} position={[0, 0.63, -0.405]} castShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      {[-0.225, 0.225].map((x) => (
        <RoundedBox key={`pillow-${x}`} args={[0.37, 0.12, 0.21]} radius={0.058} smoothness={7} position={[x, 0.68, -0.31]} rotation={[-0.14, 0, x * 0.08]} castShadow receiveShadow>
          <primitive object={white} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.36, 0.13, 0.16]} radius={0.045} smoothness={7} position={[0, 0.725, -0.16]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.82, 0.055, 0.28]} radius={0.03} smoothness={6} position={[0, 0.625, 0.26]} rotation={[-0.02, 0, 0]} castShadow receiveShadow>
        <primitive object={taupe} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.97, 0.94, 0.075]} radius={0.05} smoothness={7} position={[0, 0.51, -0.455]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {headboardRows.flatMap((y) => headboardColumns.map((x) => (
        <RoundedBox key={`${x}-${y}`} args={[0.232, 0.235, 0.06]} radius={0.058} smoothness={7} position={[x, y, -0.407]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      )))}
      {headboardRows.flatMap((y) => headboardColumns.map((x) => (
        <mesh key={`button-${x}-${y}`} position={[x, y, -0.447]} scale={[0.018, 0.018, 0.018]} geometry={SHARED_SPHERE} castShadow>
          <primitive object={taupe} attach="material" />
        </mesh>
      )))}
      {[-0.38, 0.38].flatMap((x) => [-0.34, 0.35].map((z) => [x, z] as const)).map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.023, z]} scale={[0.045, 0.045, 0.045]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function GalaShaggyRug() {
  const cream = getPlannerMaterial("rug-gala-cream");
  const taupe = getPlannerMaterial("rug-gala-taupe");
  const pattern = [
    { x: -0.4375, z: 0.25, width: 0.125, depth: 0.5, radius: 0.012 },
    { x: -0.35, z: -0.19, width: 0.05, depth: 0.38, radius: 0.04 },
    { x: -0.25, z: 0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: -0.1, z: -0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0, z: 0.185, width: 0.05, depth: 0.37, radius: 0.04 },
    { x: 0.1, z: -0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0.25, z: 0.25, width: 0.15, depth: 0.5, radius: 0.012 },
    { x: 0.35, z: -0.17, width: 0.05, depth: 0.34, radius: 0.04 },
    { x: 0.4375, z: 0.25, width: 0.125, depth: 0.5, radius: 0.012 },
  ];
  const tufts = Array.from({ length: 15 }, (_, column) =>
    Array.from({ length: 9 }, (_, row) => {
      const x = -0.455 + column * 0.065;
      const z = -0.44 + row * 0.11;
      const isTaupe = pattern.some((stripe) =>
        Math.abs(x - stripe.x) <= stripe.width / 2 && Math.abs(z - stripe.z) <= stripe.depth / 2,
      );
      return { x, z, isTaupe, lean: (column + row) % 3 === 0 ? 0.08 : -0.06 };
    }),
  ).flat();
  return (
    <group>
      <RoundedBox args={[1, 0.12, 1]} radius={0.022} smoothness={5} position={[0, 0.06, 0]} receiveShadow>
        <primitive object={cream} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.985, 0.78, 0.985]} radius={0.03} smoothness={6} position={[0, 0.5, 0]} castShadow receiveShadow>
        <primitive object={cream} attach="material" />
      </RoundedBox>
      {pattern.map((stripe, index) => (
        <RoundedBox
          key={`gala-stripe-${index}`}
          args={[stripe.width, 0.17, stripe.depth]}
          radius={stripe.radius}
          smoothness={6}
          position={[stripe.x, 0.895, stripe.z]}
          castShadow
          receiveShadow
        >
          <primitive object={taupe} attach="material" />
        </RoundedBox>
      ))}
      {tufts.map((tuft, index) => (
        <mesh
          key={`gala-tuft-${index}`}
          position={[tuft.x, 0.965, tuft.z]}
          rotation={[tuft.lean, 0, tuft.lean * 0.7]}
          scale={[0.005, 0.13, 0.007]}
          geometry={SHARED_CYLINDER}
          castShadow
        >
          <primitive object={tuft.isTaupe ? taupe : cream} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function TemuWhiteShaggyRug() {
  const ivory = getPlannerMaterial("rug-temu-shaggy-white");
  const shadow = getPlannerMaterial("rug-temu-shaggy-shadow");
  const tufts = Array.from({ length: 17 }, (_, column) =>
    Array.from({ length: 11 }, (_, row) => ({
      x: -0.46 + column * 0.0575,
      z: -0.45 + row * 0.09,
      leanX: ((column * 7 + row * 3) % 5 - 2) * 0.045,
      leanZ: ((column * 2 + row * 5) % 5 - 2) * 0.04,
      height: 0.18 + ((column * 11 + row * 7) % 5) * 0.018,
      shaded: (column + row * 2) % 13 === 0,
    })),
  ).flat();

  return (
    <group>
      <RoundedBox args={[1, 0.22, 1]} radius={0.035} smoothness={6} position={[0, 0.11, 0]} receiveShadow>
        <primitive object={ivory} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.985, 0.54, 0.985]} radius={0.045} smoothness={7} position={[0, 0.47, 0]} castShadow receiveShadow>
        <primitive object={ivory} attach="material" />
      </RoundedBox>
      {tufts.map((tuft, index) => (
        <mesh
          key={`temu-white-rug-tuft-${index}`}
          position={[tuft.x, 0.79, tuft.z]}
          rotation={[tuft.leanX, 0, tuft.leanZ]}
          scale={[0.0065, tuft.height, 0.0075]}
          geometry={SHARED_CYLINDER}
          castShadow
        >
          <primitive object={tuft.shaded ? shadow : ivory} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function TemuEasyLineRug({ materialId }: { materialId: string }) {
  const patternedFabric = getPlannerMaterial(materialId);
  return (
    <group>
      <RoundedBox args={[1, 0.18, 1]} radius={0.025} smoothness={6} position={[0, 0.72, 0]} receiveShadow>
        <primitive object={patternedFabric} attach="material" dispose={null} />
      </RoundedBox>
      <RoundedBox args={[0.992, 0.1, 0.992]} radius={0.022} smoothness={6} position={[0, 0.88, 0]} castShadow receiveShadow>
        <primitive object={patternedFabric} attach="material" dispose={null} />
      </RoundedBox>
    </group>
  );
}

function TemuIvoryRabbitRug() {
  const base = getPlannerMaterial("rug-rabbit-pile");
  const highlight = getPlannerMaterial("rug-temu-rabbit-highlight");
  const shadow = getPlannerMaterial("rug-temu-rabbit-shadow");
  const columns = 8;
  const rows = 14;
  const bubbles = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: -0.43 + column * (0.86 / 7),
      z: -0.44 + row * (0.88 / 13),
      light: (column * 3 + row) % 5 === 0,
      rotation: ((column * 11 + row * 7) % 7 - 3) * 0.025,
    };
  });

  return (
    <group>
      <RoundedBox args={[1, 0.22, 1]} radius={0.055} smoothness={8} position={[0, 0.11, 0]} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </RoundedBox>
      {bubbles.map((bubble, index) => (
        <mesh
          key={`temu-rabbit-rug-bubble-${index}`}
          position={[bubble.x, 0.30, bubble.z]}
          rotation={[0, bubble.rotation, 0]}
          scale={[0.085, 0.16, 0.055]}
          geometry={SHARED_SPHERE}
          castShadow
          receiveShadow
        >
          <primitive object={bubble.light ? highlight : base} attach="material" />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <mesh
          key={`temu-rabbit-rug-edge-${index}`}
          position={[-0.44 + index * 0.11, 0.24, 0.485]}
          scale={[0.065, 0.11, 0.028]}
          geometry={SHARED_SPHERE}
          castShadow
        >
          <primitive object={index % 2 === 0 ? highlight : shadow} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Flat, metric product with one complete ornament pattern (not a repeated fabric swatch).
 * Width/depth are scaled by the scene placement to exactly 250 × 180 cm.
 * The 20 mm representation is a visualization allowance, not manufacturer thickness. */
function LivingIvoryGreigeRug() {
  const top = getPlannerMaterial("rug-temu-vintage-cream");
  const edge = getPlannerMaterial("rug-living-ivory-greige");
  return (
    <group>
      <RoundedBox args={[1, 0.55, 1]} radius={0.008} smoothness={4} position={[0, 0.275, 0]} receiveShadow>
        <primitive object={edge} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.557, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.99, 0.99]} />
        <primitive object={top} attach="material" />
      </mesh>
      {[-0.495, 0.495].map((z) => (
        <mesh key={`vintage-rug-hem-z-${z}`} position={[0, 0.558, z]} scale={[0.99, 0.008, 0.007]} geometry={SHARED_BOX} receiveShadow>
          <meshStandardMaterial color="#f0e9df" roughness={1} />
        </mesh>
      ))}
      {[-0.495, 0.495].map((x) => (
        <mesh key={`vintage-rug-hem-x-${x}`} position={[x, 0.558, 0]} scale={[0.007, 0.008, 0.99]} geometry={SHARED_BOX} receiveShadow>
          <meshStandardMaterial color="#f0e9df" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Zimmer1OlivePlant() {
  const leaves = getPlannerMaterial("leaf-olive-soft");
  const trunk = getPlannerMaterial("oak-artisan-edge");
  const pot = getPlannerMaterial("ceramic-pot-glazed");
  const branches = [
    [-0.24, 0.54, -0.12, -0.28], [0.22, 0.58, 0.16, 0.3],
    [-0.18, 0.7, 0.18, -0.24], [0.2, 0.76, -0.14, 0.26],
    [-0.11, 0.88, 0.12, -0.2], [0.12, 0.92, -0.08, 0.18],
  ] as const;
  return (
    <group>
      <RoundedBox args={[0.66, 0.22, 0.66]} radius={0.11} smoothness={5} position={[0, 0.11, 0]} castShadow receiveShadow>
        <primitive object={pot} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.49, 0]} scale={[0.095, 0.72, 0.095]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={trunk} attach="material" />
      </mesh>
      {branches.map(([x, y, z, tilt], index) => (
        <group key={index} position={[x, y, z]} rotation={[0, tilt, index % 2 === 0 ? -0.42 : 0.42]}>
          <mesh scale={[0.04, 0.36, 0.04]} geometry={SHARED_CYLINDER} castShadow><primitive object={trunk} attach="material" /></mesh>
          {[-0.13, 0, 0.13].flatMap((offset, leafIndex) => [
            <mesh key={`left-${leafIndex}`} position={[-0.11, offset, 0]} rotation={[0, 0, -0.65]} scale={[0.22, 0.1, 0.09]} geometry={SHARED_SPHERE} castShadow><primitive object={leaves} attach="material" /></mesh>,
            <mesh key={`right-${leafIndex}`} position={[0.11, offset + 0.035, 0]} rotation={[0, 0, 0.65]} scale={[0.22, 0.1, 0.09]} geometry={SHARED_SPHERE} castShadow><primitive object={leaves} attach="material" /></mesh>,
          ])}
        </group>
      ))}
    </group>
  );
}

function DetailedBed({ materialId }: { materialId: string }) {
  return (
    <group>
      <RoundedBox args={[0.96, 0.22, 0.96]} radius={0.045} smoothness={3} position={[0, 0.18, 0]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.94, 0.24, 0.9]} radius={0.07} smoothness={4} position={[0, 0.39, 0.02]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.91, 0.14, 0.68]} radius={0.06} smoothness={4} position={[0, 0.56, 0.1]} castShadow receiveShadow>
        <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.96, 0.64, 0.11]} radius={0.055} smoothness={4} position={[0, 0.55, -0.45]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
      {[-0.36, -0.18, 0, 0.18, 0.36].map((x) => (
        <RoundedBox key={x} args={[0.17, 0.52, 0.055]} radius={0.06} smoothness={4} position={[x, 0.55, -0.512]} castShadow>
          <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
        </RoundedBox>
      ))}
      {[-0.24, 0.24].map((x) => (
        <RoundedBox key={x} args={[0.4, 0.12, 0.22]} radius={0.06} smoothness={4} position={[x, 0.64, -0.27]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("fabric-white")} attach="material" />
        </RoundedBox>
      ))}
      {[[-0.38, -0.36], [0.38, -0.36], [-0.38, 0.36], [0.38, 0.36]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.055, z]} scale={[0.06, 0.11, 0.06]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}

export function getWardrobeFrontLayout() {
  return [
    { center: -0.4, width: 0.2, kind: "door", finish: "white-matte" },
    { center: -0.2, width: 0.2, kind: "drawers", finish: "vinyl-cashmere-cream" },
    { center: 0, width: 0.2, kind: "mirror", finish: "mirror-glass" },
    { center: 0.2, width: 0.2, kind: "drawers", finish: "vinyl-cashmere-cream" },
    { center: 0.4, width: 0.2, kind: "door", finish: "white-matte" },
  ] as const;
}

function PhotoWardrobe() {
  const white = getPlannerMaterial("white-lacquer");
  const frame = getPlannerMaterial("wardrobe-frame-silver");
  const metal = getPlannerMaterial("metal-satin");
  const modules = getWardrobeFrontLayout();
  const moduleBoundaries = modules.slice(0, -1).map((module) => module.center + module.width / 2);
  const upperHandleXs = [-0.31, -0.29, 0.29, 0.31];
  return (
    <group>
      <mesh position={[0, 0.5, 0]} scale={[0.99, 1, 0.96]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, 0.025, 0.03]} scale={[1.01, 0.05, 0.99]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[-0.493, 0.5, 0.01]} scale={[0.026, 1, 0.98]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0.493, 0.5, 0.01]} scale={[0.026, 1, 0.98]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      {modules.map((module, index) => {
        return (
          <group key={index} position={[module.center, 0, 0.493]}>
            {module.kind === "drawers" ? (
              <>
                <RoundedBox args={[module.width - 0.012, 0.665, 0.028]} radius={0.006} smoothness={2} position={[0, 0.6425, 0]} castShadow receiveShadow>
                  <primitive object={white} attach="material" />
                </RoundedBox>
                {[0.095, 0.245].map((y) => (
                  <group key={y}>
                    <RoundedBox args={[module.width - 0.014, 0.14, 0.034]} radius={0.006} smoothness={2} position={[0, y, 0.006]} castShadow receiveShadow>
                      <primitive object={getPlannerMaterial(module.finish)} attach="material" />
                    </RoundedBox>
                    <mesh position={[0, y, 0.037]} scale={[module.width * 0.5, 0.014, 0.014]} geometry={SHARED_CYLINDER} rotation={[0, 0, Math.PI / 2]} castShadow><primitive object={metal} attach="material" /></mesh>
                  </group>
                ))}
              </>
            ) : (
              <RoundedBox args={[module.width - 0.012, 0.955, 0.028]} radius={0.006} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
                <primitive object={getPlannerMaterial(module.finish)} attach="material" />
              </RoundedBox>
            )}
          </group>
        );
      })}
      {moduleBoundaries.map((x) => (
        <mesh key={x} position={[x, 0.5, 0.509]} scale={[0.005, 0.955, 0.012]} geometry={SHARED_BOX} castShadow>
          <primitive object={frame} attach="material" />
        </mesh>
      ))}
      {upperHandleXs.map((x) => (
        <mesh key={x} position={[x, 0.58, 0.535]} scale={[0.014, 0.16, 0.014]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={metal} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 1.008, 0]} scale={[1.02, 0.025, 1.01]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
    </group>
  );
}

function PhotoDesk() {
  const white = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[1, 0.09, 1]} radius={0.025} smoothness={3} position={[0, 0.94, 0]} castShadow receiveShadow><primitive object={white} attach="material" /></RoundedBox>
      <group position={[-0.36, 0.42, 0]}>
        <mesh scale={[0.3, 0.82, 0.9]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        {[0.24, 0, -0.24].map((y) => (
          <group key={y}>
            <mesh position={[0, y, 0.465]} scale={[0.282, 0.225, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, y + 0.065, 0.485]} scale={[0.12, 0.014, 0.014]} geometry={SHARED_CYLINDER} rotation={[0, 0, Math.PI / 2]} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        ))}
      </group>
      <mesh position={[0.43, 0.46, 0]} scale={[0.07, 0.88, 0.88]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0.03, 0.78, -0.38]} scale={[0.72, 0.05, 0.05]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
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

function PhotoSectionalSofa() {
  const fabric = getPlannerMaterial("fabric-light-grey");
  return (
    <group>
      <RoundedBox args={[0.98, 0.22, 0.7]} radius={0.055} smoothness={4} position={[0, 0.2, -0.02]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      <RoundedBox args={[0.34, 0.22, 0.98]} radius={0.055} smoothness={4} position={[-0.32, 0.2, 0.02]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[-0.29, 0.02, 0.33].map((x) => (
        <RoundedBox key={x} args={[0.285, 0.15, 0.43]} radius={0.06} smoothness={4} position={[x, 0.4, 0.11]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      ))}
      <RoundedBox args={[0.285, 0.15, 0.39]} radius={0.06} smoothness={4} position={[-0.29, 0.4, 0.5]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[-0.3, 0, 0.3].map((x) => (
        <RoundedBox key={x} args={[0.28, 0.42, 0.16]} radius={0.07} smoothness={4} position={[x, 0.64, -0.31]} rotation={[-0.08, 0, 0]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      ))}
      <RoundedBox args={[0.14, 0.42, 0.76]} radius={0.07} smoothness={4} position={[-0.47, 0.52, 0.03]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      <RoundedBox args={[0.14, 0.38, 0.45]} radius={0.07} smoothness={4} position={[0.47, 0.48, 0.1]} castShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {[[-0.4, -0.28], [0.4, -0.28], [-0.4, 0.42], [0.4, 0.25]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.06, z]} scale={[0.04, 0.12, 0.04]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}

function PhotoOfficeChair() {
  const blush = getPlannerMaterial("fabric-blush");
  const white = getPlannerMaterial("white-matte");
  const legAngles = [0, 72, 144, 216, 288].map((degrees) => degrees * Math.PI / 180);
  return (
    <group>
      <RoundedBox args={[0.72, 0.18, 0.68]} radius={0.12} smoothness={4} position={[0, 0.52, 0]} castShadow receiveShadow><primitive object={blush} attach="material" /></RoundedBox>
      <RoundedBox args={[0.72, 0.58, 0.17]} radius={0.13} smoothness={4} position={[0, 0.78, -0.25]} rotation={[-0.12, 0, 0]} castShadow receiveShadow><primitive object={blush} attach="material" /></RoundedBox>
      <mesh position={[0, 0.31, 0]} scale={[0.09, 0.38, 0.09]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
      <mesh position={[0, 0.13, 0]} scale={[0.22, 0.08, 0.22]} geometry={SHARED_CYLINDER} castShadow><primitive object={white} attach="material" /></mesh>
      {legAngles.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.22, 0.105, 0]} scale={[0.42, 0.055, 0.075]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
          <mesh position={[0.43, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.11, 0.055, 0.11]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}

function TemuIvoryExecutiveChair() {
  const leather = getPlannerMaterial("leather-ivory-pebble");
  const seam = getPlannerMaterial("fabric-sand");
  const chrome = getPlannerMaterial("chrome-polished");
  const black = getPlannerMaterial("screen-black");
  const legAngles = [0, 72, 144, 216, 288].map((degrees) => degrees * Math.PI / 180);
  return (
    <group>
      <mesh position={[0, 0.22, 0]} scale={[0.105, 0.31, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={chrome} attach="material" /></mesh>
      <mesh position={[0, 0.11, 0]} scale={[0.24, 0.075, 0.24]} geometry={SHARED_CYLINDER} castShadow><primitive object={black} attach="material" /></mesh>
      {legAngles.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.23, 0.095, 0]} rotation={[0, 0, -0.08]} scale={[0.44, 0.055, 0.07]} geometry={SHARED_BOX} castShadow><primitive object={chrome} attach="material" /></mesh>
          <mesh position={[0.46, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.105, 0.055, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={black} attach="material" /></mesh>
        </group>
      ))}

      <RoundedBox args={[0.86, 0.18, 0.7]} radius={0.1} smoothness={6} position={[0, 0.5, 0.04]} castShadow receiveShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.7, 0.1, 0.58]} radius={0.075} smoothness={6} position={[0, 0.57, 0.065]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.58, 0.01, 0.016]} radius={0.005} smoothness={3} position={[0, 0.62, 0.345]} castShadow><primitive object={seam} attach="material" /></RoundedBox>
      <RoundedBox args={[0.22, 0.12, 0.5]} radius={0.055} smoothness={5} position={[-0.34, 0.59, 0.02]} rotation={[0, 0, -0.1]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.22, 0.12, 0.5]} radius={0.055} smoothness={5} position={[0.34, 0.59, 0.02]} rotation={[0, 0, 0.1]} castShadow><primitive object={leather} attach="material" /></RoundedBox>

      <RoundedBox args={[0.62, 0.55, 0.16]} radius={0.08} smoothness={6} position={[0, 0.76, -0.255]} rotation={[-0.07, 0, 0]} castShadow receiveShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.72, 0.22, 0.18]} radius={0.09} smoothness={6} position={[0, 0.99, -0.27]} rotation={[-0.04, 0, 0]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.5, 0.01, 0.016]} radius={0.005} smoothness={3} position={[0, 0.82, -0.352]} rotation={[-0.07, 0, 0]} castShadow><primitive object={seam} attach="material" /></RoundedBox>
      <RoundedBox args={[0.17, 0.38, 0.15]} radius={0.07} smoothness={5} position={[-0.34, 0.8, -0.22]} rotation={[-0.06, 0, -0.08]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <RoundedBox args={[0.17, 0.38, 0.15]} radius={0.07} smoothness={5} position={[0.34, 0.8, -0.22]} rotation={[-0.06, 0, 0.08]} castShadow><primitive object={leather} attach="material" /></RoundedBox>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.43, 0, 0]}>
          <mesh position={[0, 0.62, 0.02]} scale={[0.055, 0.28, 0.055]} geometry={SHARED_BOX} castShadow><primitive object={black} attach="material" /></mesh>
          <RoundedBox args={[0.15, 0.08, 0.38]} radius={0.035} smoothness={4} position={[0, 0.76, -0.01]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
        </group>
      ))}

      <mesh position={[0, 0.39, 0.31]} scale={[0.48, 0.035, 0.42]} geometry={SHARED_BOX} castShadow><primitive object={chrome} attach="material" /></mesh>
      <RoundedBox args={[0.58, 0.105, 0.35]} radius={0.055} smoothness={5} position={[0, 0.42, 0.33]} castShadow><primitive object={leather} attach="material" /></RoundedBox>
      <mesh position={[0, 0.43, 0.51]} scale={[0.02, 0.02, 0.02]} geometry={SHARED_SPHERE} castShadow><primitive object={chrome} attach="material" /></mesh>
    </group>
  );
}

function StandardSofa() {
  const fabric = getPlannerMaterial("fabric-sand");
  const seam = getPlannerMaterial("fabric-light-grey");
  const dark = getPlannerMaterial("metal-black");
  const seatCenters = [-0.32, 0, 0.32];

  return (
    <group>
      <RoundedBox args={[0.96, 0.18, 0.72]} radius={0.055} smoothness={6} position={[0, 0.24, 0.02]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {seatCenters.map((x) => (
        <group key={`standard-sofa-seat-${x}`}>
          <RoundedBox args={[0.29, 0.17, 0.53]} radius={0.065} smoothness={6} position={[x, 0.4, 0.08]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.285, 0.32, 0.16]} radius={0.06} smoothness={6} position={[x, 0.64, -0.27]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <DetailStrip position={[x, 0.485, 0.36]} scale={[0.22, 0.01, 0.014]} materialId="fabric-light-grey" />
        </group>
      ))}
      {[-0.48, 0.48].map((x) => (
        <RoundedBox key={`standard-sofa-arm-${x}`} args={[0.12, 0.5, 0.72]} radius={0.06} smoothness={6} position={[x, 0.5, 0.02]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.88, 0.11, 0.12]} radius={0.03} smoothness={4} position={[0, 0.79, -0.31]} rotation={[-0.08, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
      {[
        [-0.37, -0.27],
        [0.37, -0.27],
        [-0.37, 0.31],
        [0.37, 0.31],
      ].map(([x, z], index) => (
        <mesh key={`standard-sofa-foot-${index}`} position={[x, 0.08, z]} rotation={[0, 0, index % 2 === 0 ? -0.08 : 0.08]} scale={[0.055, 0.16, 0.055]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function DetailedTable({ materialId }: { materialId: string }) {
  const top = getPlannerMaterial(materialId);
  return (
    <group>
      <RoundedBox args={[1, 0.12, 1]} radius={0.04} smoothness={3} position={[0, 0.91, 0]} castShadow receiveShadow><primitive object={top} attach="material" /></RoundedBox>
      {[[-0.39, -0.39], [0.39, -0.39], [-0.39, 0.39], [0.39, 0.39]].map(([x, z], index) => (
        <mesh key={index} position={[x, 0.43, z]} scale={[0.075, 0.84, 0.075]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
      ))}
    </group>
  );
}

function capsuleShape(width: number, depth: number) {
  const shape = new Shape();
  const horizontal = width >= depth;
  const radius = Math.min(width, depth) / 2;
  const halfStraight = Math.max(0, (Math.max(width, depth) - radius * 2) / 2);
  shape.moveTo(-halfStraight, -radius);
  shape.lineTo(halfStraight, -radius);
  shape.absarc(halfStraight, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-halfStraight, radius);
  shape.absarc(-halfStraight, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();
  return { shape, horizontal };
}

function CapsuleSolid({ width, depth, height, position, materialId, material }: {
  width: number; depth: number; height: number; position: [number, number, number]; materialId: string; material?: Material;
}) {
  const geometry = useMemo(() => {
    const bevel = Math.min(0.002, height / 5, width / 8, depth / 8);
    const { shape, horizontal } = capsuleShape(width - bevel * 2, depth - bevel * 2);
    const geometry = new ExtrudeGeometry(shape, {
      depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 2, steps: 1, curveSegments: 40,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -(height - bevel * 2) / 2, 0);
    if (!horizontal) geometry.rotateY(Math.PI / 2);
    return geometry;
  }, [width, depth, height]);
  return <mesh position={position} geometry={geometry} castShadow receiveShadow><primitive object={material ?? getPlannerMaterial(materialId)} attach="material" /></mesh>;
}

function FurnitureBeam({ start, end, width, depth = width, materialId = "metal-black", round = false }: {
  start: [number, number, number]; end: [number, number, number]; width: number; depth?: number; materialId?: string; round?: boolean;
}) {
  const from = new Vector3(...start);
  const to = new Vector3(...end);
  const direction = to.clone().sub(from);
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  return <mesh position={from.add(to).multiplyScalar(0.5)} quaternion={rotation} scale={[width, direction.length(), depth]} geometry={round ? SHARED_CYLINDER : SHARED_BOX} castShadow receiveShadow>
    <primitive object={getPlannerMaterial(materialId)} attach="material" />
  </mesh>;
}

function FlutedSlab({ width, depth, height, x, materialId }: { width: number; depth: number; height: number; x: number; materialId: string }) {
  const points = useMemo(() => {
    const { shape, horizontal } = capsuleShape(width - 0.008, depth - 0.008);
    return shape.getSpacedPoints(Math.round((width + depth) * 2 / 0.018)).slice(0, -1).map((point) => horizontal ? [point.x, -point.y] : [-point.y, -point.x]);
  }, [width, depth]);
  return <group position={[x, 0, 0]}>
    <CapsuleSolid width={width - 0.008} depth={depth - 0.008} height={height} position={[0, height / 2, 0]} materialId={materialId} />
    {points.map(([px, pz], index) => <mesh key={index} position={[px, height / 2, pz]} scale={[0.008, height - 0.006, 0.008]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
      <primitive object={getPlannerMaterial(materialId)} attach="material" />
    </mesh>)}
  </group>;
}

function ComparisonDiningTable({ materialId, catalogId, size }: { materialId: string; catalogId: string; size?: [number, number, number] }) {
  const profile = tableVisualProfile(catalogId);
  const width = size?.[0] ?? (profile === "round-metal-frame" ? 1 : 1.2);
  const height = size?.[1] ?? (profile === "round-metal-frame" ? 0.75 : 0.755);
  const depth = size?.[2] ?? (profile === "fluted-extension-pedestal" ? 0.8 : profile === "round-metal-frame" ? 1 : 1.2);
  const extended = width > (profile === "round-metal-frame" ? 1.01 : 1.21);
  if (profile === "fluted-round-pedestal") return <FlutedRoundPedestalTable width={width} height={height} depth={depth} materialId={materialId} extended={extended} />;
  const thickness = profile === "fluted-extension-pedestal" ? 0.018 : 0.025;
  const tabletop = PRIMARY_TABLETOPS.has(catalogId) ? getComparisonTabletopMaterial(materialId) : undefined;
  // Author these measured products in metres, then cancel the parent's unit-box
  // normalization. Extending the top must not stretch the legs or cabinet.
  return <group scale={[1 / width, 1 / height, 1 / depth]}>
    <CapsuleSolid width={width} depth={depth} height={thickness} position={[0, height - thickness / 2, 0]} materialId={materialId} material={tabletop} />
    {(extended ? [-0.2, 0.2] : [0]).map((x) => <mesh key={x} position={[x, height + 0.0002, 0]} scale={[0.0012, 0.0004, depth - 0.006]} geometry={SHARED_BOX}>
      <primitive object={getPlannerMaterial("oak-artisan-edge")} attach="material" />
    </mesh>)}
    {profile === "storage-pedestal" ? <StorageTableCabinet height={height - thickness} materialId={materialId} /> : profile === "fluted-extension-pedestal" ? (
      <group>
        {/* Saved dimension drawing: two 10.8 × 51.2 cm fluted slab legs,
            18 mm top, and a 40 cm centre leaf. */}
        {[-1, 1].map((side) => <FlutedSlab key={side} width={0.108} depth={0.512} height={height - thickness} x={side * (width / 2 - 0.27)} materialId={materialId} />)}
        {[-0.18, 0.18].map((z) => <FurnitureBeam key={z} start={[-width / 2 + 0.25, height - 0.038, z]} end={[width / 2 - 0.25, height - 0.038, z]} width={0.018} depth={0.028} materialId="oak-artisan-edge" />)}
      </group>
    ) : (
      <group>
        <mesh position={[0, height - 0.055, 0]} scale={[width - 0.3, 0.045, 0.14]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        <mesh position={[0, height - 0.095, 0]} scale={[0.105, 0.1, 0.105]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => <FurnitureBeam key={`${x}-${z}`} start={[x * 0.045, height - 0.065, z * 0.045]} end={[x * 0.36, 0.012, z * 0.32]} width={0.047} depth={0.026} />))}
      </group>
    )}
  </group>;
}

function StorageTableCabinet({ height, materialId }: { height: number; materialId: string }) {
  // The saved product image supports the cabinet construction; its internal
  // proportions remain image estimates, not additional verified dimensions.
  const bodyHeight = height - 0.055;
  const front = 0.253;
  return <group>
    <CapsuleSolid width={0.72} depth={0.52} height={0.018} position={[0, 0.009, 0]} materialId={materialId} />
    <CapsuleSolid width={0.72} depth={0.52} height={0.025} position={[0, bodyHeight - 0.0125, 0]} materialId={materialId} />
    {[-1, 1].map((side) => <FlutedSlab key={side} x={side * 0.285} width={0.15} depth={0.5} height={bodyHeight} materialId={materialId} />)}
    <mesh position={[0, bodyHeight / 2, -0.235]} scale={[0.43, bodyHeight - 0.035, 0.025]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
    <mesh position={[0, bodyHeight * 0.47, 0]} scale={[0.43, 0.014, 0.47]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
    <RoundedBox args={[0.78, 0.055, 0.47]} radius={0.009} position={[0, height - 0.0275, 0]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
    {[-1, 1].map((side) => <group key={side} position={[side * 0.106, 0, front]}>
      <mesh position={[0, bodyHeight / 2, 0]} scale={[0.172, bodyHeight - 0.09, 0.006]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("glass-frosted")} attach="material" /></mesh>
      {[-0.097, 0.097].map((x) => <mesh key={x} position={[x, bodyHeight / 2, 0.003]} scale={[0.022, bodyHeight - 0.035, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>)}
      {[0.032, bodyHeight - 0.032].map((y) => <mesh key={y} position={[0, y, 0.003]} scale={[0.214, 0.031, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>)}
      <FurnitureBeam start={[-side * 0.073, bodyHeight / 2 - 0.05, 0.027]} end={[-side * 0.073, bodyHeight / 2 + 0.05, 0.027]} width={0.008} materialId="metal-gold" round />
    </group>)}
  </group>;
}

function FlutedRoundPedestalTable({ width, height, depth, materialId, extended }: {
  width: number; height: number; depth: number; materialId: string; extended: boolean;
}) {
  const edge = getPlannerMaterial("oak-artisan-edge");
  const pedestal = getPlannerMaterial("oak-natural");
  const flute = getPlannerMaterial("oak-artisan-edge");
  const angles = Array.from({ length: 28 }, (_, index) => (index / 28) * Math.PI * 2);
  const thickness = height * 0.09;
  const footHeightRatio = 0.08;
  const supportHeightRatio = 0.025;
  const coreTopRatio = 1 - thickness / height - supportHeightRatio;
  const coreHeightRatio = coreTopRatio - footHeightRatio;
  return (
    <group scale={[1 / width, 1 / height, 1 / depth]}>
      <CapsuleSolid width={width} depth={depth} height={thickness} position={[0, height - thickness / 2, 0]} materialId={materialId} />
      {(extended ? [-(width - depth) / 2, (width - depth) / 2] : [0]).map((x) => (
        <mesh key={x} position={[x, height + 0.0002, 0]} scale={[0.0012, 0.0004, depth - 0.006]} geometry={SHARED_BOX}>
          <primitive object={edge} attach="material" />
        </mesh>
      ))}
      {/* Keep the same estimated outer flute envelope in both variants. The
          solid core connects its strips, floor-contact foot and top support. */}
      <group scale={[depth, height, depth]}>
        <mesh position={[0, coreTopRatio + supportHeightRatio / 2, 0]} scale={[0.56, supportHeightRatio, 0.56]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, footHeightRatio + coreHeightRatio / 2, 0]} scale={[0.63, coreHeightRatio, 0.63]} geometry={SHARED_CYLINDER} castShadow receiveShadow><primitive object={pedestal} attach="material" /></mesh>
        {angles.map((angle) => <mesh key={angle} position={[Math.cos(angle) * 0.315, 0.49, Math.sin(angle) * 0.315]} scale={[0.012, 0.66, 0.012]} geometry={SHARED_CYLINDER} castShadow><primitive object={flute} attach="material" /></mesh>)}
        <mesh position={[0, footHeightRatio / 2, 0]} scale={[0.38, footHeightRatio, 0.38]} geometry={SHARED_CYLINDER} castShadow><primitive object={pedestal} attach="material" /></mesh>
      </group>
    </group>
  );
}

function BozanDiningTable() {
  const oak = getPlannerMaterial("oak-bozan-directional");
  const oakEdge = getPlannerMaterial("oak-bozan-edge");
  const black = getPlannerMaterial("metal-black");
  const joint = useMemo(() => {
    const material = getPlannerMaterial("oak-artisan-edge").clone();
    // Keep the joint flush while separating coincident surfaces in the depth
    // buffer. The shared edge material must retain its original settings.
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    return material;
  }, []);
  useEffect(() => () => joint.dispose(), [joint]);
  // The catalogue records a 25 mm slab within the unchanged 76 cm height.
  const slabHeight = 0.025 / 0.76;
  const legAngle = 0.54;
  // Extend the existing inclined supports down to the floor, preserving their
  // upper attachment instead of translating the whole table or its placement.
  const oldFloorGap = 0.46 - Math.cos(legAngle) * 0.44 - Math.sin(legAngle) * 0.0325;
  const legExtension = oldFloorGap / Math.cos(legAngle);

  return (
    <group>
      <mesh position={[0, 1 - slabHeight / 2, 0]} scale={[1, slabHeight, 1]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={oak} attach="material" />
      </mesh>
      {/* A flush, estimated joint mark stays inside the circular slab. */}
      <mesh position={[0, 0.999, 0]} scale={[0.0018, 0.002, 0.93]} geometry={SHARED_BOX} dispose={null}>
        <primitive object={joint} attach="material" />
      </mesh>
      <RoundedBox args={[0.72, 0.12, 0.72]} radius={0.018} smoothness={4} position={[0, 1 - slabHeight - 0.06, 0]} castShadow receiveShadow>
        <primitive object={oakEdge} attach="material" />
      </RoundedBox>

      {[Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.22 + Math.sin(legAngle) * legExtension / 2, 0.46 - oldFloorGap / 2, 0]} rotation={[0, 0, legAngle]} scale={[0.065, 0.88 + legExtension, 0.065]} geometry={SHARED_BOX} castShadow receiveShadow>
            <primitive object={black} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.46, 0]} scale={[0.13, 0.18, 0.13]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={black} attach="material" />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={`bozan-bolt-${angle}`} position={[Math.cos(angle) * 0.17, 0.9, Math.sin(angle) * 0.17]} scale={[0.018, 0.012, 0.018]} geometry={SHARED_SPHERE} castShadow>
          <primitive object={black} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

type ComparisonChairVariant = "kaleo" | "temu-swivel" | "faux-leather" | "velvet-swivel" | "amber";

function KaleoArmchair() {
  return <ComparisonChair variant="kaleo" materialId="fabric-kaleo-chenille" />;
}

function SoftChairSeat({ width, depth, seatHeight, material }: { width: number; depth: number; seatHeight: number; material: Material }) {
  const geometry = useMemo(() => createChairCushionGeometry(width, depth), [width, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0, seatHeight - 0.0275, 0.025]} castShadow receiveShadow dispose={null}>
    <primitive object={material} attach="material" />
  </mesh>;
}

function ChairUpholstery({ width, depth, height, seatHeight, seatWidth, seatDepth, armHeight, materialId, channels, softSeat = false, metricFabric = false }: {
  width: number; depth: number; height: number; seatHeight: number; seatWidth: number; seatDepth: number;
  armHeight: number; materialId: string; channels: boolean; softSeat?: boolean; metricFabric?: boolean;
}) {
  const { shell, rim } = useMemo(() => {
    // A continuous padded U shell gives the back and arms one smooth outline.
    // Its lower rim tapers toward the seat, while the upper back leans outward.
    const curve = new CatmullRomCurve3([
      new Vector3(-width * 0.46, armHeight, depth * 0.31),
      new Vector3(-width * 0.49, armHeight + 0.012, depth * 0.06),
      new Vector3(-width * 0.43, height - 0.075, -depth * 0.30),
      new Vector3(-width * 0.29, height - 0.006, -depth * 0.44),
      new Vector3(0, height - 0.002, -depth * 0.46),
      new Vector3(width * 0.29, height - 0.006, -depth * 0.44),
      new Vector3(width * 0.43, height - 0.075, -depth * 0.30),
      new Vector3(width * 0.49, armHeight + 0.012, depth * 0.06),
      new Vector3(width * 0.46, armHeight, depth * 0.31),
    ]);
    const segments = 56;
    const rows = 8;
    const stride = rows + 1;
    const layer = (segments + 1) * stride;
    const positions: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    for (let side = 0; side < 2; side++) {
      for (let u = 0; u <= segments; u++) {
        const top = curve.getPoint(u / segments);
        const tangent = curve.getTangent(u / segments);
        const normal = new Vector3(tangent.z, 0, -tangent.x).normalize();
        const bottom = new Vector3(top.x * 0.91, seatHeight - 0.055, top.z * 0.8 + 0.015);
        for (let v = 0; v <= rows; v++) {
          const point = bottom.clone().lerp(top, v / rows);
          point.addScaledVector(normal, Math.sin(v / rows * Math.PI) * 0.012 - side * 0.036);
          positions.push(point.x, point.y, point.z);
          uv.push(u / segments, v / rows);
        }
      }
    }
    for (let side = 0; side < 2; side++) {
      for (let u = 0; u < segments; u++) for (let v = 0; v < rows; v++) {
        const a = side * layer + u * stride + v;
        const b = a + stride;
        if (side === 0) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    for (let u = 0; u < segments; u++) {
      const a = u * stride + rows;
      const b = a + stride;
      indices.push(a, a + layer, b, b, a + layer, b + layer);
      const lower = u * stride;
      indices.push(lower, lower + stride, lower + layer, lower + stride, lower + stride + layer, lower + layer);
    }
    for (const u of [0, segments]) for (let v = 0; v < rows; v++) {
      const a = u * stride + v;
      if (u === 0) indices.push(a, a + layer, a + 1, a + 1, a + layer, a + layer + 1);
      else indices.push(a, a + 1, a + layer, a + 1, a + layer + 1, a + layer);
    }
    const shell = new BufferGeometry();
    shell.setAttribute("position", new Float32BufferAttribute(positions, 3));
    shell.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    shell.setIndex(indices);
    shell.computeVertexNormals();
    const rim = new TubeGeometry(curve, 72, 0.0016, 6, false);
    if (!metricFabric) return { shell, rim };
    const mapped = { shell: createMetricChairFabricGeometry(shell), rim: createMetricChairFabricGeometry(rim) };
    shell.dispose(); rim.dispose();
    return mapped;
  }, [width, depth, height, seatHeight, armHeight, metricFabric]);
  useEffect(() => {
    if (metricFabric) return () => { shell.dispose(); rim.dispose(); };
  }, [shell, rim, metricFabric]);
  const fabric = getPlannerMaterial(materialId);
  return <group>
    <mesh geometry={shell} castShadow receiveShadow dispose={metricFabric ? null : undefined}><primitive object={fabric} attach="material" /></mesh>
    <mesh geometry={rim} castShadow dispose={metricFabric ? null : undefined}><primitive object={fabric} attach="material" /></mesh>
    {softSeat ? <SoftChairSeat width={seatWidth} depth={seatDepth} seatHeight={seatHeight} material={fabric} /> :
      <RoundedBox args={[seatWidth, 0.055, seatDepth]} radius={0.025} smoothness={6} position={[0, seatHeight - 0.0275, 0.025]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>}
    {channels ? [-1, 1].map((side) => <ChairStitch key={side} points={[
      [side * seatWidth * 0.22, seatHeight + 0.045, -depth * 0.32],
      [side * seatWidth * 0.22, (height + seatHeight) / 2, -depth * 0.355],
      [side * seatWidth * 0.22, height - 0.035, -depth * 0.42],
    ]} materialId={materialId} metricFabric={metricFabric} />) : null}
    <ChairStitch points={[
      [-seatWidth * 0.42, seatHeight + (height - seatHeight) * 0.55, -depth * 0.33],
      [0, seatHeight + (height - seatHeight) * 0.48, -depth * 0.365],
      [seatWidth * 0.42, seatHeight + (height - seatHeight) * 0.55, -depth * 0.33],
    ]} materialId={materialId} metricFabric={metricFabric} />
  </group>;
}

function ChairStitch({ points, materialId, metricFabric = false }: { points: [number, number, number][]; materialId: string; metricFabric?: boolean }) {
  const geometry = useMemo(() => {
    const source = new TubeGeometry(new CatmullRomCurve3(points.map((point) => new Vector3(...point))), 24, 0.0011, 5, false);
    if (!metricFabric) return source;
    const mapped = createMetricChairFabricGeometry(source);
    source.dispose();
    return mapped;
  }, [points, metricFabric]);
  useEffect(() => {
    if (metricFabric) return () => geometry.dispose();
  }, [geometry, metricFabric]);
  return <mesh geometry={geometry} dispose={metricFabric ? null : undefined}><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>;
}

function KaleoDiscBase({ seatHeight }: { seatHeight: number }) {
  const geometry = useMemo(() => new LatheGeometry([
    new Vector2(0, 0), new Vector2(0.245, 0), new Vector2(0.25, 0.008),
    new Vector2(0.241, 0.018), new Vector2(0.12, 0.035), new Vector2(0.04, 0.065), new Vector2(0.026, 0.09),
  ], 64), []);
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
    <FurnitureBeam start={[0, 0.07, 0]} end={[0, seatHeight - 0.055, 0]} width={0.046} round />
    <mesh position={[0, seatHeight - 0.06, 0]} scale={[0.18, 0.025, 0.18]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh>
  </group>;
}

function ComparisonChair({ variant, materialId }: { variant: ComparisonChairVariant; materialId: string }) {
  const id = variant === "kaleo" ? "chair-kaleo-chenille-beige" : variant === "amber" ? "chair-amber-chenille-beige" : variant === "temu-swivel" ? "chair-temu-swivel-upholstered" : variant === "velvet-swivel" ? "chair-temu-velvet-swivel-arm" : "chair-temu-faux-leather-metal";
  const model = getChairModelForCatalogId(id)!;
  const width = model.sizeCm.width / 100;
  const depth = model.sizeCm.depth / 100;
  const height = model.sizeCm.height / 100;
  const seatHeight = model.seatCm.height / 100;
  const armless = variant === "faux-leather";
  const armHeight = armless ? seatHeight + 0.035 : (model.armHeightCm ? model.armHeightCm / 100 : seatHeight + 0.18);
  return <group scale={[1 / width, 1 / height, 1 / depth]}>
    <ChairUpholstery width={width} depth={depth} height={height} seatHeight={seatHeight} seatWidth={model.seatCm.width / 100} seatDepth={model.seatCm.depth / 100} armHeight={armHeight} materialId={materialId} channels={variant !== "amber" && !armless} softSeat={variant === "kaleo" || variant === "amber"} metricFabric={variant === "kaleo" || variant === "amber"} />
    {variant === "kaleo" ? <KaleoDiscBase seatHeight={seatHeight} /> : variant === "amber" ? <group>
      <FurnitureBeam start={[0, 0.035, 0]} end={[0, seatHeight - 0.055, 0]} width={0.046} round />
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => <FurnitureBeam key={angle} start={[0, 0.04, 0]} end={[Math.cos(angle) * width * 0.49, 0.018, Math.sin(angle) * depth * 0.49]} width={0.026} depth={0.034} />)}
    </group> : <group>
      {model.swivel ? <mesh position={[0, seatHeight - 0.075, 0]} scale={[0.075, 0.08, 0.075]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-black")} attach="material" /></mesh> : null}
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`${x}-${z}`}>
        <FurnitureBeam start={[x * (armless ? width * 0.31 : 0.055), seatHeight - 0.06, z * (armless ? depth * 0.30 : 0.05)]} end={[x * width * 0.46, 0.015, z * depth * 0.43]} width={variant === "temu-swivel" ? 0.027 : 0.025} depth={variant === "temu-swivel" ? 0.027 : 0.018} round={variant === "temu-swivel"} />
        {variant === "temu-swivel" ? <FurnitureBeam start={[x * 0.035, seatHeight - 0.09, z * 0.025]} end={[x * width * 0.36, 0.12, z * depth * 0.34]} width={0.006} round /> : null}
      </group>))}
    </group>}
  </group>;
}

function StandardWardrobe({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const frame = getPlannerMaterial("wardrobe-frame-silver");
  const handle = getPlannerMaterial("metal-satin");
  const doors = [-0.375, -0.125, 0.125, 0.375];

  return (
    <group>
      <RoundedBox args={[0.98, 0.98, 0.92]} radius={0.018} smoothness={3} position={[0, 0.5, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.02, 0.045, 0.96]} radius={0.012} smoothness={3} position={[0, 0.985, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {doors.map((x, index) => (
        <group key={x}>
          <RoundedBox args={[0.238, 0.91, 0.028]} radius={0.008} smoothness={2} position={[x, 0.505, 0.468]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          {index < doors.length - 1 ? (
            <mesh position={[x + 0.125, 0.505, 0.486]} scale={[0.006, 0.91, 0.012]} geometry={SHARED_BOX}>
              <primitive object={frame} attach="material" />
            </mesh>
          ) : null}
          <mesh position={[x + (index % 2 === 0 ? 0.082 : -0.082), 0.505, 0.492]} scale={[0.012, 0.16, 0.012]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={handle} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.03, 0.02]} scale={[1.01, 0.05, 0.94]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </mesh>
    </group>
  );
}

function DetailedDresser({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const handle = getPlannerMaterial("metal-satin");
  const drawerYs = [0.2, 0.43, 0.66];

  return (
    <group>
      <RoundedBox args={[0.98, 0.82, 0.84]} radius={0.025} smoothness={3} position={[0, 0.43, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.02, 0.07, 0.88]} radius={0.02} smoothness={4} position={[0, 0.87, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {drawerYs.map((y) => (
        <group key={y}>
          <RoundedBox args={[0.88, 0.19, 0.028]} radius={0.01} smoothness={3} position={[0, y, 0.434]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          <mesh position={[0, y + 0.012, 0.454]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 0.14, 0.012]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={handle} attach="material" />
          </mesh>
        </group>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.035, 0]} scale={[0.07, 0.06, 0.07]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={handle} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function DetailedShelf({ materialId }: { materialId: string }) {
  const shelf = getPlannerMaterial(materialId);
  const back = getPlannerMaterial("drawer-charcoal");
  const levels = [0.17, 0.39, 0.61, 0.83];

  return (
    <group>
      <mesh position={[0, 0.5, -0.42]} scale={[0.98, 0.96, 0.035]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={back} attach="material" />
      </mesh>
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} scale={[0.055, 0.98, 0.78]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={shelf} attach="material" />
        </mesh>
      ))}
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} scale={[0.94, 0.055, 0.78]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={shelf} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 0]} scale={[1.02, 0.07, 0.84]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={shelf} attach="material" />
      </mesh>
    </group>
  );
}

function DetailedLowboard({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const handle = getPlannerMaterial("metal-satin");

  return (
    <group>
      <RoundedBox args={[1, 0.42, 0.86]} radius={0.025} smoothness={3} position={[0, 0.25, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.03, 0.06, 0.9]} radius={0.02} smoothness={4} position={[0, 0.48, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {[-0.33, 0, 0.33].map((x, index) => (
        <group key={x}>
          <RoundedBox args={[0.29, 0.32, 0.028]} radius={0.008} smoothness={2} position={[x, 0.25, 0.444]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          {index < 2 ? (
            <mesh position={[x, 0.25, 0.466]} scale={[0.1, 0.018, 0.012]} geometry={SHARED_BOX} castShadow>
              <primitive object={handle} attach="material" />
            </mesh>
          ) : null}
        </group>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.055, 0]} scale={[0.06, 0.1, 0.06]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={handle} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function DetailedCabinet({ materialId }: { materialId: string }) {
  return (
    <group>
      <RoundedBox args={[0.98, 0.98, 0.96]} radius={0.025} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
      {[-0.245, 0.245].map((x) => (
        <group key={x} position={[x, 0.5, 0.49]}>
          <mesh scale={[0.475, 0.9, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
          <mesh position={[x < 0 ? 0.17 : -0.17, 0, 0.026]} scale={[0.018, 0.26, 0.018]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        </group>
      ))}
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
