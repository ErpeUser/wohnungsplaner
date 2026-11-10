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
          key={item.id}
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
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} />}>
        <GltfFurniture path={importedResolution.url} />
      </Suspense>
    </FurnitureAssetBoundary>
  ) : catalogGlb ? (
    <FurnitureAssetBoundary fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} />}>
      <Suspense fallback={<ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} />}>
        <GltfFurniture path={resolution.asset.path} />
      </Suspense>
    </FurnitureAssetBoundary>
  ) : <ParametricFurniture fallback={fallback} materialId={materialId} catalogId={item.catalogId} />;

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

function ParametricFurniture({ fallback, materialId, catalogId }: { fallback: string; materialId: string; catalogId: string }) {
  const material = getPlannerMaterial(materialId);
  if (catalogId === "bed-bliss-120") return <BlissBed />;
  if (catalogId === "sofa-chicago-206") return <ChicagoSofa />;
  if (catalogId === "hallway-tejo-115") return <TejoHallway />;
  if (catalogId === "dining-table-bozan-110") return <BozanDiningTable />;
  if (catalogId === "chair-kaleo-chenille-beige") return <KaleoArmchair />;
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
  if (catalogId === "wardrobe-225") return <PhotoWardrobe />;
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
  if (fallback === "table") return <DetailedTable materialId={materialId} />;
  if (fallback === "cabinet") return <DetailedCabinet materialId={materialId} />;
  return (
    <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.035} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
      <primitive object={material} attach="material" />
    </RoundedBox>
  );
}

function LedChargingNightstand() {
  const white = getPlannerMaterial("white-matte");
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

function ChicagoSofa() {
  const fabric = getPlannerMaterial("fabric-chicago-beige");
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
  const cashmere = getPlannerMaterial("tejo-cashmere");
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
  const fabric = getPlannerMaterial("fabric-bliss-beige");
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
  const base = getPlannerMaterial("rug-temu-rabbit-ivory");
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

function LivingIvoryGreigeRug() {
  const base = getPlannerMaterial("rug-living-ivory-greige");
  const relief = getPlannerMaterial("rug-living-relief");
  const bands = [-0.38, -0.19, 0, 0.19, 0.38];

  return (
    <group>
      <RoundedBox args={[1, 0.82, 1]} radius={0.045} smoothness={8} position={[0, 0.41, 0]} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </RoundedBox>
      {bands.map((z, index) => (
        <RoundedBox
          key={`living-rug-relief-${z}`}
          args={[0.82 - (index % 2) * 0.12, 0.11, 0.055]}
          radius={0.025}
          smoothness={6}
          position={[index % 2 === 0 ? -0.04 : 0.06, 0.88, z]}
          rotation={[0, index % 2 === 0 ? -0.08 : 0.08, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={relief} attach="material" />
        </RoundedBox>
      ))}
    </group>
  );
}

function Zimmer1OlivePlant() {
  const leaves = getPlannerMaterial("leaf-olive");
  const trunk = getPlannerMaterial("oak-artisan-edge");
  const pot = getPlannerMaterial("ceramic-beige");
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
  const white = getPlannerMaterial("white-matte");
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
  const white = getPlannerMaterial("white-matte");
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
  const leather = getPlannerMaterial("leather-ivory");
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

function BozanDiningTable() {
  const oak = getPlannerMaterial("oak-artisan");
  const oakEdge = getPlannerMaterial("oak-artisan-edge");
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
  const fabric = getPlannerMaterial("fabric-kaleo-beige");
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
