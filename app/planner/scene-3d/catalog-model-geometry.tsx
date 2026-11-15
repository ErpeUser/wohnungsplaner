"use client";

import { useEffect, useMemo } from "react";
import { BoxGeometry, CylinderGeometry, type MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three-stdlib";

import { getPlannerMaterial } from "./materials.ts";

type CatalogModelGeometryId = "chair-office" | "shelf";
type Triple = [number, number, number];

/** These two generic descriptions require construction absent from their shared GLBs. */
export function hasCatalogModelGeometry(catalogId: string): catalogId is CatalogModelGeometryId {
  return catalogId === "chair-office" || catalogId === "shelf";
}

function Solid({ size, position, material, radius = 0 }: {
  size: Triple;
  position: Triple;
  material: MeshStandardMaterial;
  radius?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => radius
    ? new RoundedBoxGeometry(width, height, depth, 3, radius)
    : new BoxGeometry(width, height, depth), [width, height, depth, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow dispose={null}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Cylinder({ radius, height, centerY, material }: {
  radius: number;
  height: number;
  centerY: number;
  material: MeshStandardMaterial;
}) {
  const geometry = useMemo(() => new CylinderGeometry(radius, radius, height, 32), [radius, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, centerY, 0]} castShadow receiveShadow dispose={null}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function GenericOfficeChair({ material }: { material: MeshStandardMaterial }) {
  const support = getPlannerMaterial("metal-dark");
  // Generic estimated proportions only: the catalogue specifies arms and swivel
  // support, but no castors, manufacturer base shape or measured seat profile.
  return (
    <group>
      <Cylinder radius={0.5} height={0.05} centerY={0.025} material={support} />
      <Cylinder radius={0.065} height={0.4} centerY={0.235} material={support} />
      <Solid size={[0.78, 0.11, 0.78]} position={[0, 0.48, 0.05]} radius={0.05} material={material} />
      <Solid size={[0.78, 0.55, 0.12]} position={[0, 0.725, -0.36]} radius={0.05} material={material} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Solid size={[0.055, 0.2, 0.055]} position={[side * 0.365, 0.53, 0.02]} material={support} />
          <Solid size={[0.12, 0.07, 0.6]} position={[side * 0.44, 0.65, 0.02]} radius={0.03} material={material} />
        </group>
      ))}
    </group>
  );
}

function GenericOpenShelf({ material, size }: { material: MeshStandardMaterial; size: Triple }) {
  const [width, height, depth] = size;
  // 18 mm boards and three interior levels are illustrative renderer estimates.
  // A cap keeps the same open construction usable for small free-resize states.
  const thickness = Math.min(0.018, width * 0.08, height * 0.08, depth * 0.08);
  const sideWidth = thickness / width;
  const boardHeight = thickness / height;
  return (
    <group>
      {[-1, 1].map((side) => (
        <Solid key={side} size={[sideWidth, 1, 1]} position={[side * (1 - sideWidth) / 2, 0.5, 0]} material={material} />
      ))}
      {[boardHeight / 2, 0.25, 0.5, 0.75, 1 - boardHeight / 2].map((centerY) => (
        <Solid key={centerY} size={[1 - 2 * sideWidth, boardHeight, 1]} position={[0, centerY, 0]} material={material} />
      ))}
    </group>
  );
}

/** Visible geometry occupies x/z [-0.5,0.5], y [0,1]; placement supplies scale. */
export function CatalogModelGeometry({ catalogId, materialId, size }: {
  catalogId: CatalogModelGeometryId;
  materialId: string;
  size: Triple;
}) {
  const material = getPlannerMaterial(materialId);
  return catalogId === "chair-office"
    ? <GenericOfficeChair material={material} />
    : <GenericOpenShelf material={material} size={size} />;
}
