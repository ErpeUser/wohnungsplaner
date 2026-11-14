"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { BoxGeometry, CylinderGeometry, Mesh, Object3D, SphereGeometry } from "three";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { resolveFurnitureAsset } from "../catalog/asset-manifest.ts";
import { resolvePlannerAsset } from "../catalog/asset-resolver.ts";
import { getPlannerMaterial } from "./materials.ts";
import { furnitureRenderTransform, furnitureWorldPosition, type SceneModel, type SceneObject } from "./scene-model.ts";
import type { PlannerPlacement } from "../domain/types.ts";
import { tableVisualProfile } from "../tables/table-models.ts";

const SHARED_BOX = new BoxGeometry(1, 1, 1);
const SHARED_CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 24);
const SHARED_SPHERE = new SphereGeometry(0.5, 20, 12);

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
  const catalogGlb = resolution?.kind === "gltf" && catalogItem?.renderMode !== "parametric";
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
  ) : catalogGlb ? (
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} size={item.size} />}>
        <GltfFurniture path={resolution.asset.path} />
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

function GltfFurniture({ path }: { path: string }) {
  const gltf = useGLTF(path);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child: Object3D) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      // Keep the GLB's authored PBR materials and texture maps. Replacing every
      // submesh with one planner material made imported products look flat and
      // destroyed multi-material details. Material variants remain available
      // for parametric fallbacks; imported assets are authoritative.
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone();
    });
    return clone;
  }, [gltf.scene]);
  return <primitive object={object} />;
}

function ParametricFurniture({ fallback, materialId, catalogId, size }: { fallback: string; materialId: string; catalogId: string; size?: [number, number, number] }) {
  const material = getPlannerMaterial(materialId);
  if (catalogId === "bed-bliss-120") return <BlissBed />;
  if (catalogId === "sofa-aliexpress-142" || catalogId === "sofa-aliexpress-142-open") return <IvoryPulloutSofa extended={catalogId === "sofa-aliexpress-142-open"} />;
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
function IvoryPulloutSofa({ extended }: { extended: boolean }) {
  const fabric = getPlannerMaterial("fabric-ali-ivory");
  const shadow = getPlannerMaterial("fabric-ali-shade");
  const metal = getPlannerMaterial("metal-black");
  const centers = [-0.235, 0.235];
  return (
    <group>
      <RoundedBox args={[0.83, 0.36, extended ? 0.45 : 0.76]} radius={0.055} smoothness={6} position={[0, 0.23, extended ? -0.20 : 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
      {centers.map((x) => (
        <group key={x}>
          <RoundedBox args={[0.42, 0.15, extended ? 0.37 : 0.55]} radius={0.055} smoothness={6} position={[x, 0.47, extended ? -0.15 : 0.07]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.31, 0.20, 0.11]} radius={0.037} smoothness={5} position={[x, 0.62, -0.19]} rotation={[-0.15, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.40, 0.18]} radius={0.07} smoothness={7} position={[x, 0.72, -0.36]} rotation={[-0.06, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <RoundedBox args={[0.43, 0.21, 0.19]} radius={0.075} smoothness={7} position={[x, 0.89, -0.39]} rotation={[-0.1, 0, 0]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
          <DetailStrip position={[x, 0.72, -0.26]} scale={[0.34, 0.006, 0.009]} materialId="fabric-ali-seam" />
          {extended ? (
            <group>
              <DetailStrip position={[x, 0.235, 0.17]} scale={[0.3, 0.025, 0.55]} materialId="metal-black" />
              <DetailStrip position={[x - 0.10, 0.215, 0.16]} scale={[0.018, 0.018, 0.52]} materialId="metal-black" rotation={[0.13, -0.12, 0]} />
              <DetailStrip position={[x + 0.10, 0.215, 0.16]} scale={[0.018, 0.018, 0.52]} materialId="metal-black" rotation={[-0.13, 0.12, 0]} />
              <RoundedBox args={[0.43, 0.16, 0.43]} radius={0.05} smoothness={6} position={[x, 0.42, 0.27]} castShadow receiveShadow><primitive object={fabric} attach="material" /></RoundedBox>
              <DetailStrip position={[x, 0.43, 0.485]} scale={[0.33, 0.008, 0.012]} materialId="fabric-ali-seam" />
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
      <DetailStrip position={[-0.327, 0.53, 0.505]} scale={[0.285, 0.012, 0.012]} materialId="metal-satin" />
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
        <group key={x} position={[x, 0.69, 0.445]}>
          <mesh position={[0, 0, 0]} scale={[0.022, 0.075, 0.025]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[0, -0.027, 0.025]} rotation={[0.55, 0, 0]} scale={[0.022, 0.055, 0.022]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ))}

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
      {modules.map((module) => (
        <mesh key={`wardrobe-reveal-${module.center}`} position={[module.center, 0.5, 0.526]} scale={[0.004, 0.9, 0.008]} geometry={SHARED_BOX}>
          <primitive object={getPlannerMaterial("drawer-charcoal")} attach="material" />
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

function ComparisonDiningTable({ materialId, catalogId, size }: { materialId: string; catalogId: string; size?: [number, number, number] }) {
  const top = getPlannerMaterial(materialId);
  const edge = getPlannerMaterial("oak-artisan-edge");
  const dark = getPlannerMaterial("metal-dark");
  const profile = tableVisualProfile(catalogId);
  const extended = catalogId === "dining-table-aliexpress-100-140"
    ? (size?.[0] ?? 1) > 1.01
    : (size?.[0] ?? 1.2) > 1.21;

  // Content spans y=0..1 so the placement height remains the measured
  // tabletop height. The three construction profiles intentionally differ:
  // metal-frame, storage pedestal and fluted extension pedestal.
  if (profile === "storage-pedestal") {
    return (
      <group>
        {extended ? (
          <group>
            {[-0.3, 0, 0.3].map((x, index) => (
              <RoundedBox key={x} args={[index === 1 ? 0.23 : 0.36, 0.1, 0.98]} radius={index === 1 ? 0.025 : 0.08} smoothness={6} position={[x, 0.95, 0]} castShadow receiveShadow>
                <primitive object={top} attach="material" />
              </RoundedBox>
            ))}
            {[-0.13, 0.13].map((x) => <DetailStrip key={x} position={[x, 1.004, 0]} scale={[0.012, 0.006, 0.92]} materialId="oak-artisan-edge" />)}
          </group>
        ) : (
          <RoundedBox args={[0.98, 0.1, 0.98]} radius={0.08} smoothness={6} position={[0, 0.95, 0]} castShadow receiveShadow>
            <primitive object={top} attach="material" />
          </RoundedBox>
        )}
        <RoundedBox args={[0.72, 0.64, 0.72]} radius={0.055} smoothness={5} position={[0, 0.58, 0]} castShadow receiveShadow>
          <primitive object={getPlannerMaterial("oak-natural")} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0.58, 0.372]} scale={[0.52, 0.38, 0.012]} geometry={SHARED_BOX} castShadow>
          <primitive object={getPlannerMaterial("glass-frosted")} attach="material" />
        </mesh>
        <mesh position={[-0.27, 0.58, 0.39]} scale={[0.028, 0.48, 0.035]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0.27, 0.58, 0.39]} scale={[0.028, 0.48, 0.035]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, 0.58, 0.39]} scale={[0.022, 0.48, 0.035]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, 0.78, 0.39]} scale={[0.58, 0.028, 0.035]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, 0.38, 0.39]} scale={[0.58, 0.028, 0.035]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        <mesh position={[0, 0.58, 0.365]} scale={[0.54, 0.018, 0.54]} geometry={SHARED_BOX} castShadow>
          <primitive object={edge} attach="material" />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <group key={x} position={[x, 0.57, 0.39]}>
            <RoundedBox args={[0.13, 0.18, 0.028]} radius={0.01} smoothness={3} castShadow>
              <primitive object={getPlannerMaterial("oak-artisan-edge")} attach="material" />
            </RoundedBox>
            <mesh position={[0, 0, 0.024]} scale={[0.012, 0.065, 0.012]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={dark} attach="material" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.14, 0]} scale={[0.78, 0.09, 0.78]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      </group>
    );
  }

  if (profile === "fluted-extension-pedestal") {
    return <FlutedExtensionTable top={top} edge={edge} extended={extended} />;
  }

  if (profile === "fluted-round-pedestal") {
    return <FlutedRoundPedestalTable top={top} edge={edge} extended={extended} />;
  }

  return (
    <group>
      <mesh position={[0, 0.94, 0]} scale={[1, 0.12, 1]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={top} attach="material" />
      </mesh>
      <mesh position={[0, 0.87, 0]} scale={[0.7, 0.08, 0.7]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}-${z}`} position={[x * 0.28, 0.43, z * 0.28]} rotation={[0, 0, x * z * 0.12]} scale={[0.055, 0.82, 0.055]} geometry={SHARED_BOX} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      )))}
      <mesh position={[0, 0.08, 0]} scale={[0.72, 0.08, 0.72]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>
    </group>
  );
}

function FlutedRoundPedestalTable({ top, edge, extended }: { top: ReturnType<typeof getPlannerMaterial>; edge: ReturnType<typeof getPlannerMaterial>; extended: boolean }) {
  const pedestal = getPlannerMaterial("oak-natural");
  const flute = getPlannerMaterial("oak-artisan-edge");
  const angles = Array.from({ length: 28 }, (_, index) => (index / 28) * Math.PI * 2);
  return (
    <group>
      {extended ? (
        <group>
          <RoundedBox args={[0.62, 0.09, 1.04]} radius={0.16} smoothness={8} position={[-0.44, 0.95, 0]} castShadow receiveShadow><primitive object={top} attach="material" /></RoundedBox>
          <RoundedBox args={[0.62, 0.09, 1.04]} radius={0.16} smoothness={8} position={[0.44, 0.95, 0]} castShadow receiveShadow><primitive object={top} attach="material" /></RoundedBox>
          <RoundedBox args={[0.36, 0.09, 1.04]} radius={0.11} smoothness={8} position={[0, 0.95, 0]} castShadow receiveShadow><primitive object={top} attach="material" /></RoundedBox>
          <DetailStrip position={[0, 0.998, 0]} scale={[0.012, 0.006, 0.98]} materialId="oak-artisan-edge" />
        </group>
      ) : (
        <mesh position={[0, 0.95, 0]} scale={[0.55, 0.09, 0.55]} geometry={SHARED_CYLINDER} castShadow receiveShadow><primitive object={top} attach="material" /></mesh>
      )}
      <mesh position={[0, 0.90, 0]} scale={[0.56, 0.025, 0.56]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={edge} attach="material" />
      </mesh>
      <mesh position={[0, 0.49, 0]} scale={[0.31, 0.71, 0.31]} geometry={SHARED_CYLINDER} castShadow receiveShadow><primitive object={pedestal} attach="material" /></mesh>
      {angles.map((angle) => <mesh key={angle} position={[Math.cos(angle) * 0.315, 0.49, Math.sin(angle) * 0.315]} scale={[0.012, 0.66, 0.012]} geometry={SHARED_CYLINDER} castShadow><primitive object={flute} attach="material" /></mesh>)}
      <mesh position={[0, 0.08, 0]} scale={[0.38, 0.08, 0.38]} geometry={SHARED_CYLINDER} castShadow><primitive object={pedestal} attach="material" /></mesh>
      {!extended ? <DetailStrip position={[0, 0.944, 0]} scale={[0.012, 0.014, 0.48]} materialId="oak-artisan-edge" /> : null}
    </group>
  );
}

function FlutedExtensionTable({ top, edge, extended }: { top: ReturnType<typeof getPlannerMaterial>; edge: ReturnType<typeof getPlannerMaterial>; extended: boolean }) {
  const pedestal = getPlannerMaterial("oak-artisan");
  const seam = getPlannerMaterial("oak-artisan-edge");
  const flutes = Array.from({ length: 18 }, (_, index) => (index / 18) * Math.PI * 2);
  return (
    <group>
      {extended ? (
        <group>
          {[-0.3, 0, 0.3].map((x, index) => (
            <RoundedBox key={x} args={[index === 1 ? 0.23 : 0.36, 0.09, 0.86]} radius={index === 1 ? 0.025 : 0.11} smoothness={8} position={[x, 0.95, 0]} castShadow receiveShadow>
              <primitive object={top} attach="material" />
            </RoundedBox>
          ))}
          {[-0.13, 0.13].map((x) => <DetailStrip key={x} position={[x, 0.998, 0]} scale={[0.012, 0.006, 0.8]} materialId="oak-artisan-edge" />)}
        </group>
      ) : (
        <RoundedBox args={[1, 0.09, 0.86]} radius={0.11} smoothness={8} position={[0, 0.95, 0]} castShadow receiveShadow>
          <primitive object={top} attach="material" />
        </RoundedBox>
      )}
      <RoundedBox args={[0.98, 0.025, 0.018]} radius={0.007} smoothness={2} position={[0, 0.992, 0]} castShadow>
        <primitive object={edge} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.44, 0.72, 0.44]} radius={0.12} smoothness={8} position={[0, 0.48, 0]} castShadow receiveShadow>
        <primitive object={pedestal} attach="material" />
      </RoundedBox>
      {flutes.map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 0.235, 0.48, Math.sin(angle) * 0.235]} scale={[0.018, 0.68, 0.018]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={getPlannerMaterial("oak-artisan-edge")} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0]} scale={[0.52, 0.08, 0.52]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={pedestal} attach="material" />
      </mesh>
      {extended ? null : (
        <>
          <mesh position={[0, 0.944, 0]} scale={[0.016, 0.014, 0.41]} geometry={SHARED_BOX} castShadow>
            <primitive object={seam} attach="material" />
          </mesh>
          <mesh position={[0, 0.944, 0]} scale={[0.41, 0.014, 0.016]} geometry={SHARED_BOX} castShadow>
            <primitive object={seam} attach="material" />
          </mesh>
        </>
      )}
    </group>
  );
}

function BozanDiningTable() {
  const oak = getPlannerMaterial("oak-bozan-directional");
  const oakEdge = getPlannerMaterial("oak-bozan-edge");
  const black = getPlannerMaterial("metal-black");

  return (
    <group>
      <mesh position={[0, 0.982, 0]} scale={[1, 0.036, 1]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={oak} attach="material" />
      </mesh>
      <DetailStrip position={[0, 1.003, 0]} scale={[0.012, 0.006, 0.93]} materialId="oak-artisan-edge" />
      <DetailStrip position={[0, 0.965, 0.498]} scale={[0.86, 0.012, 0.012]} materialId="oak-artisan-edge" />
      <RoundedBox args={[0.72, 0.12, 0.72]} radius={0.018} smoothness={4} position={[0, 0.89, 0]} castShadow receiveShadow>
        <primitive object={oakEdge} attach="material" />
      </RoundedBox>

      {[Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4].map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0.22, 0.46, 0]} rotation={[0, 0, 0.54]} scale={[0.065, 0.88, 0.065]} geometry={SHARED_BOX} castShadow receiveShadow>
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

function KaleoArmchair() {
  const fabric = getPlannerMaterial("fabric-kaleo-chenille");
  const metal = getPlannerMaterial("metal-black");
  const seam = getPlannerMaterial("fabric-sand");

  return (
    <group>
      <mesh position={[0, 0.035, 0]} scale={[0.79, 0.07, 0.78]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0, 0.27, 0]} scale={[0.15, 0.44, 0.15]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
      <mesh position={[0, 0.49, 0]} scale={[0.34, 0.07, 0.34]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>

      <RoundedBox args={[0.88, 0.16, 0.68]} radius={0.09} smoothness={7} position={[0, 0.61, 0.055]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.11, 0.58]} radius={0.075} smoothness={7} position={[0, 0.675, 0.07]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.748, 0.365]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.55, -0.31]} rotation={[-0.1, 0, 0]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>

      {[-0.445, 0.445].map((x) => (
        <RoundedBox key={x} args={[0.11, 0.27, 0.62]} radius={0.055} smoothness={6} position={[x, 0.7, 0.015]} rotation={[0, 0, x < 0 ? -0.04 : 0.04]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.9, 0.36, 0.18]} radius={0.085} smoothness={7} position={[0, 0.81, -0.255]} rotation={[-0.1, 0, 0]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.79, 0.28, 0.09]} radius={0.06} smoothness={6} position={[0, 0.815, -0.35]} rotation={[-0.1, 0, 0]} castShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>

      {[-0.25, 0, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.815, -0.398]} scale={[0.01, 0.24, 0.01]} geometry={SHARED_BOX} castShadow>
          <primitive object={seam} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.82, -0.4]} scale={[0.72, 0.01, 0.01]} geometry={SHARED_BOX} castShadow>
        <primitive object={seam} attach="material" />
      </mesh>
      <mesh position={[0, 0.54, 0]} scale={[0.2, 0.012, 0.2]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={metal} attach="material" />
      </mesh>
    </group>
  );
}

function ComparisonChair({ variant, materialId }: { variant: "temu-swivel" | "faux-leather" | "velvet-swivel" | "amber"; materialId: string }) {
  const fabric = getPlannerMaterial(materialId);
  const dark = getPlannerMaterial("metal-black");
  const seam = getPlannerMaterial(variant === "velvet-swivel" ? "velvet-temu-beige" : "fabric-sand");
  const isLegged = variant === "faux-leather" || variant === "velvet-swivel";
  const isAmber = variant === "amber";
  const isVelvet = variant === "velvet-swivel";

  return (
    <group>
      {isLegged ? (
        <group>
          {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
            <mesh key={`${x}-${z}`} position={[x * 0.25, 0.34, z * 0.2]} rotation={[0, 0, x * -0.12]} scale={[0.035, 0.68, 0.035]} geometry={SHARED_BOX} castShadow>
              <primitive object={dark} attach="material" />
            </mesh>
          )))}
          {isVelvet ? (
            <mesh position={[0, 0.11, 0]} scale={[0.36, 0.035, 0.36]} geometry={SHARED_CYLINDER} castShadow>
              <primitive object={dark} attach="material" />
            </mesh>
          ) : null}
        </group>
      ) : isAmber ? (
        <group>
          <mesh position={[0, 0.05, 0]} scale={[0.9, 0.075, 0.9]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          {[0, 1, 2, 3, 4].map((index) => (
            <mesh key={index} position={[Math.cos(index * (Math.PI * 2 / 5)) * 0.3, 0.18, Math.sin(index * (Math.PI * 2 / 5)) * 0.3]} rotation={[0, index * (Math.PI * 2 / 5), 0]} scale={[0.07, 0.05, 0.34]} geometry={SHARED_BOX} castShadow>
              <primitive object={dark} attach="material" />
            </mesh>
          ))}
          <mesh position={[0, 0.38, 0]} scale={[0.13, 0.44, 0.13]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.05, 0]} scale={[isVelvet ? 0.82 : 0.74, 0.065, isVelvet ? 0.82 : 0.74]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[0, 0.29, 0]} scale={[0.13, 0.44, 0.13]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[0, 0.51, 0]} scale={[0.29, 0.06, 0.29]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      )}

      <RoundedBox args={[isAmber ? 0.78 : isVelvet ? 0.76 : 0.7, 0.16, isAmber ? 0.65 : isVelvet ? 0.68 : 0.62]} radius={0.08} smoothness={6} position={[0, 0.64, 0.04]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[isAmber ? 0.76 : isVelvet ? 0.74 : 0.68, 0.1, 0.12]} radius={0.04} smoothness={5} position={[0, 0.77, -0.23]} rotation={[-0.12, 0, 0]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox args={[isAmber ? 0.78 : isVelvet ? 0.76 : 0.7, 0.34, 0.13]} radius={0.065} smoothness={6} position={[0, 0.82, -0.28]} rotation={[-0.12, 0, 0]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {(isVelvet || isAmber) ? (
        [-1, 1].map((x) => (
          <RoundedBox key={x} args={[0.1, 0.26, 0.55]} radius={0.045} smoothness={5} position={[x * 0.38, 0.72, 0.02]} rotation={[0, 0, x * 0.04]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
        ))
      ) : null}
      <RoundedBox args={[isAmber ? 0.64 : isVelvet ? 0.62 : 0.58, 0.012, 0.018]} radius={0.006} smoothness={3} position={[0, 0.72, 0.36]} castShadow>
        <primitive object={seam} attach="material" />
      </RoundedBox>
    </group>
  );
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
