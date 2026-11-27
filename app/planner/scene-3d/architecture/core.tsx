"use client";

import { isTileMaterial, useTileBoxGeometry } from "../shared/tile-box-geometry.ts";
import { BalconyArchitecture, isBalconyExteriorWall } from "./balcony";
import { MarbleTileSurface, bathMarbleWallBounds, wcMarbleWallBounds } from "./marble-tiles";
import { BathMat, BathRoundMirror, BathShowerCurtain, BathShowerRod, BathShowerSet, BathTiledFinish, BathTowelHookRail, ScoutBasinCabinet, ScoutWasherCabinet, Washbasin, WcBrush, WcFlushPlate, WcPaperHolder, WcRevisionPanel } from "./bathroom";
import { WcArtisanWallboard, WcWallVent, WcShelfStyling, WcWallHungPan } from "./wc-reference";
import { isWcWallboardCatalogId } from "../../domain/wc-wallboards.ts";
import { DeskLedMirror, WallpaperFinish, WindowCurtain, Zimmer1DeskAccessories, Zimmer1DeskShelf, Zimmer1EntryNiche, Zimmer1EntrySlimArt, Zimmer1HeadboardLed, Zimmer1HeadboardSconces, Zimmer1LayeredCurtain, Zimmer1NightstandDecor, Zimmer1WallArtPair, Zimmer1WardrobeTopDecor, ZimmerWallPanel } from "./bedroom";
import { DoorAssembly, DoorFrame } from "./doors";
import { FixtureMarker } from "./fixtures";
import { Floor } from "./floors";
import { KitchenBacksplash, KitchenBase, KitchenCornerBase, KitchenCornerUpper, KitchenFloorZone, KitchenFridge, KitchenHob, KitchenHood, KitchenMicrowave, KitchenOven, KitchenSink, KitchenUpper, KitchenWorktop } from "./kitchen";
import { LivingFloatingCabinet, LivingTelevision, MossPanel, VorraumWallDecor, WallClock, WallLight } from "./living";
import { WindowAssembly } from "./windows";
import { SHARED_BOX, SHARED_CYLINDER, VORRAUM_PLANT_TEXTURE } from "../shared/architecture-primitives";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { SRGBColorSpace } from "three";

import type { PlannerBuiltIn } from "../../domain/types";
import { getPlannerMaterial } from "../materials";
import type { SceneModel, SceneObject, SceneWall, SceneWallSegment } from "../scene-model";
VORRAUM_PLANT_TEXTURE.colorSpace = SRGBColorSpace;
VORRAUM_PLANT_TEXTURE.flipY = false;
VORRAUM_PLANT_TEXTURE.needsUpdate = true;

export function PlannerArchitecture({
  scene,
  selectionId,
  onSelect,
  onToggleDoor,
  cutaway = false,
  walkthrough = false,
  hiddenWallIds = [],
  hiddenOpeningIds = [],
  hiddenObjectIds = [],
  hiddenFixtureIds = [],
}: {
  scene: SceneModel;
  selectionId: string | null;
  onSelect(id: string | null): void;
  onToggleDoor?(openingId: string): void;
  cutaway?: boolean;
  walkthrough?: boolean;
  hiddenWallIds?: readonly string[];
  hiddenOpeningIds?: readonly string[];
  hiddenObjectIds?: readonly string[];
  hiddenFixtureIds?: readonly string[];
}) {
  const hiddenWalls = useMemo(() => new Set(hiddenWallIds), [hiddenWallIds]);
  const hiddenOpenings = useMemo(() => new Set(hiddenOpeningIds), [hiddenOpeningIds]);
  const hiddenObjects = useMemo(() => new Set(hiddenObjectIds), [hiddenObjectIds]);
  const hiddenFixtures = useMemo(() => new Set(hiddenFixtureIds), [hiddenFixtureIds]);
  const bathtub = scene.builtIns.find((item) => item.roomId === "bad" && item.catalogId === "sanitary-bathtub");
  const bathSideCap = scene.builtIns.find((item) => item.roomId === "bad" && item.catalogId === "bath-tub-side-apron");
  const bathFrontEndZ = bathSideCap ? bathSideCap.position[2] - bathSideCap.size[2] / 2 : undefined;
  return (
    <group onPointerMissed={() => onSelect(null)}>
      {scene.floors.map((floor) => <Floor key={floor.id} floor={floor} />)}
      {scene.walls.filter((wall) => !isBalconyExteriorWall(wall) && !hiddenWalls.has(wall.id)).flatMap((wall) => wall.segments.map((wallSegment) => (
        <WallSegmentMesh
          key={wallSegment.id}
          wall={wall}
          segment={wallSegment}
          bathtub={bathtub}
        />
      )))}
      <BalconyArchitecture scene={scene} showRoof={walkthrough} />
      {scene.windows.filter((window) => !hiddenOpenings.has(window.id)).map((window) => <WindowAssembly key={window.id} window={window} />)}
      {scene.doors.filter((door) => !hiddenOpenings.has(door.id)).map((door) => {
        const angle = door.state === "open" ? door.displayOpenAngle : door.baseAngle;
        const center: [number, number, number] = [
          door.hinge.x + Math.cos(angle) * door.width / 2,
          door.height / 2,
          door.hinge.z + Math.sin(angle) * door.width / 2,
        ];
        return (
          <group key={door.id}>
            <DoorFrame door={door} />
            <DoorAssembly door={door} angle={angle} center={center} onToggleDoor={onToggleDoor} />
          </group>
        );
      })}
      {scene.builtIns.filter((item) => !hiddenObjects.has(item.id)).map((item) => (
        <ObjectBox key={item.id} item={item} walls={scene.walls} bathFrontEndZ={bathFrontEndZ}
          selected={selectionId === item.id} onSelect={onSelect} />
      ))}
      {scene.fixtures
        .filter((fixture) => !hiddenFixtures.has(fixture.id))
        .filter((fixture) => !cutaway || (fixture.kind !== "ceiling-light" && fixture.kind !== "smoke-detector"))
        .map((fixture) => <FixtureMarker key={fixture.id} fixture={fixture} />)}
    </group>
  );
}

function WallSegmentMesh({ wall, segment, bathtub }: {
  wall: SceneWall;
  segment: SceneWallSegment;
  bathtub?: SceneObject<PlannerBuiltIn>;
}) {
  const base = getPlannerMaterial(wall.materialId);
  const positive = getPlannerMaterial(wall.sideMaterialIds[0]);
  const negative = getPlannerMaterial(wall.sideMaterialIds[1]);
  const tileFaces = (isTileMaterial(wall.materialId) ? 15 : 0)
    | (isTileMaterial(wall.sideMaterialIds[0]) ? 16 : 0)
    | (isTileMaterial(wall.sideMaterialIds[1]) ? 32 : 0);
  const geometry = useTileBoxGeometry(segment.size, tileFaces);
  const bathMarble = bathtub && bathMarbleWallBounds(wall, segment, bathtub);
  const wcMarble = wcMarbleWallBounds(wall, segment);
  return (
    <>
      <mesh
        position={segment.position}
        rotation={[0, segment.rotationY, 0]}
        scale={segment.size}
        geometry={geometry}
        material={[base, base, base, base, positive, negative]}
        castShadow
        receiveShadow
      />
      {bathMarble && (
        <group position={bathMarble.position} rotation={[0, Math.PI / 2, 0]}>
          <MarbleTileSurface width={bathMarble.width} height={bathMarble.height} />
        </group>
      )}
      {wcMarble && (
        <group position={wcMarble.position} rotation={[0, wcMarble.rotationY, 0]}>
          <MarbleTileSurface width={wcMarble.width} height={wcMarble.height} finish="wc" />
        </group>
      )}
    </>
  );
}

function recessedPanelPosition(item: SceneObject<PlannerBuiltIn>, walls: readonly SceneWall[]): [number, number, number] {
  if (
    !["wc-flush-plate", "wc-revision-panel"].includes(item.catalogId)
    || item.source.metadata?.confidence !== "estimated"
  ) return item.position;

  const normal = { x: Math.sin(item.rotationY), z: Math.cos(item.rotationY) };
  for (const wall of walls) {
    if (!wall.roomIds.includes(item.roomId)) continue;
    const tangent = { x: Math.cos(wall.angle), z: Math.sin(wall.angle) };
    if (Math.abs(tangent.x * normal.x + tangent.z * normal.z) > 0.000001) continue;
    const relative = { x: item.position[0] - wall.start.x, z: item.position[2] - wall.start.z };
    const along = relative.x * tangent.x + relative.z * tangent.z;
    if (along < item.size[0] / 2 || along > wall.length - item.size[0] / 2) continue;
    const fromAxis = relative.x * normal.x + relative.z * normal.z;
    if (fromAxis < 0 || fromAxis > wall.thickness / 2) continue;

    // Retain the estimated stored anchor and all dimensions. Expose only the
    // recessed body's front face with 1 mm rendering clearance; its back stays
    // inside the wall. Already visible or freestanding panels are untouched.
    const offset = wall.thickness / 2 + 0.001 - fromAxis - item.size[2] / 2;
    if (offset <= 0) continue;
    return [item.position[0] + normal.x * offset, item.position[1], item.position[2] + normal.z * offset];
  }
  return item.position;
}

function ObjectBox({
  item,
  walls,
  bathFrontEndZ,
  selected,
  onSelect,
}: {
  item: SceneObject<PlannerBuiltIn>;
  walls: readonly SceneWall[];
  bathFrontEndZ?: number;
  selected: boolean;
  onSelect(id: string | null): void;
}) {
  return (
    <group
      position={recessedPanelPosition(item, walls)}
      rotation={[0, item.rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(item.id);
      }}
    >
      <ParametricBuiltIn item={item} bathFrontEndZ={bathFrontEndZ} />
      {selected ? (
        <mesh scale={item.size.map((value) => value * 1.015) as [number, number, number]} geometry={SHARED_BOX}>
          <meshBasicMaterial color="#d46f3a" wireframe transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}

function ParametricBuiltIn({ item, bathFrontEndZ }: { item: SceneObject<PlannerBuiltIn>; bathFrontEndZ?: number }) {
  if (item.renderProfile === "bathtub") {
    const [width, height, depth] = item.size;
    return (
      <group>
        <RoundedBox args={[width, height, depth]} radius={0.075} smoothness={4} castShadow receiveShadow><primitive object={getPlannerMaterial("ceramic-white")} attach="material" /></RoundedBox>
        <RoundedBox args={[width * 0.72, height * 0.42, depth * 0.8]} radius={0.11} smoothness={4} position={[0, height * 0.34, 0]} receiveShadow><primitive object={getPlannerMaterial("glass-clear")} attach="material" /></RoundedBox>
      </group>
    );
  }
  if (item.renderProfile === "washer") {
    const [width, height, depth] = item.size;
    return (
      <group>
        <RoundedBox args={[width, height, depth]} radius={0.035} smoothness={3} castShadow receiveShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></RoundedBox>
        <mesh position={[0, -height * 0.08, depth / 2 + 0.016]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.54, 0.04, width * 0.54]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        <mesh position={[0, -height * 0.08, depth / 2 + 0.048]} rotation={[Math.PI / 2, 0, 0]} scale={[width * 0.43, 0.028, width * 0.43]} geometry={SHARED_CYLINDER}><primitive object={getPlannerMaterial("glass-frosted")} attach="material" /></mesh>
        <mesh position={[0, height * 0.34, depth / 2 + 0.018]} scale={[width * 0.9, height * 0.16, 0.03]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial("white-matte")} attach="material" /></mesh>
        <mesh position={[width * 0.29, height * 0.34, depth / 2 + 0.045]} rotation={[Math.PI / 2, 0, 0]} scale={[0.11, 0.045, 0.11]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        <mesh position={[-width * 0.2, height * 0.34, depth / 2 + 0.045]} scale={[width * 0.28, height * 0.06, 0.018]} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("screen-black")} attach="material" /></mesh>
      </group>
    );
  }
  if (item.renderProfile === "wall-wc") return <WcWallHungPan item={item} />;
  if (item.catalogId === "living-slat-wall") {
    const slatCount = Math.max(18, Math.round(item.size[0] / 0.055));
    return (
      <group>
        <mesh scale={item.size} geometry={SHARED_BOX}><primitive object={getPlannerMaterial("metal-dark")} attach="material" /></mesh>
        {Array.from({ length: slatCount }, (_, index) => (
          <mesh key={index} position={[(index - (slatCount - 1) / 2) * item.size[0] / slatCount, 0, item.size[2] / 2 + 0.018]} scale={[item.size[0] / (slatCount * 1.75), item.size[1], 0.025]} geometry={SHARED_BOX} castShadow>
            <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
          </mesh>
        ))}
      </group>
    );
  }
  if (item.catalogId === "bath-tub-apron" || item.catalogId === "bath-tub-end-ledge" || item.catalogId === "bath-tub-side-apron") return <BathTiledFinish item={item} frontWallEndZ={bathFrontEndZ} />;
  if (item.catalogId === "wc-flush-plate") return <WcFlushPlate item={item} />;
  if (item.catalogId === "wc-revision-panel") return <WcRevisionPanel item={item} />;
  if (isWcWallboardCatalogId(item.catalogId)) return <WcArtisanWallboard item={item} />;
  if (item.catalogId === "wc-wall-ventilation") return <WcWallVent item={item} />;
  if (item.catalogId === "wc-shelf-styling") return <WcShelfStyling item={item} />;
  if (item.catalogId === "wall-finish-vintage-fabric-wallpaper") return <WallpaperFinish item={item} />;
  if (item.catalogId === "floor-zone-kitchen") return <KitchenFloorZone item={item} />;
  if (item.catalogId === "kitchen-worktop") return <KitchenWorktop item={item} />;
  if (item.catalogId === "kitchen-backsplash-oak") return <KitchenBacksplash item={item} />;
  if (item.catalogId === "kitchen-base") return <KitchenBase item={item} />;
  if (item.catalogId === "kitchen-corner-base") return <KitchenCornerBase item={item} />;
  if (item.catalogId === "kitchen-upper") return <KitchenUpper item={item} />;
  if (item.catalogId === "kitchen-corner-upper") return <KitchenCornerUpper item={item} />;
  if (item.catalogId === "kitchen-fridge") return <KitchenFridge item={item} />;
  if (item.catalogId === "kitchen-sink") return <KitchenSink item={item} />;
  if (item.catalogId === "kitchen-hob") return <KitchenHob item={item} />;
  if (item.catalogId === "kitchen-oven") return <KitchenOven item={item} />;
  if (item.catalogId === "kitchen-hood") return <KitchenHood item={item} />;
  if (item.catalogId === "kitchen-microwave") return <KitchenMicrowave item={item} />;
  if (item.catalogId === "living-tv") return <LivingTelevision item={item} />;
  if (item.catalogId === "living-floating-cabinet") return <LivingFloatingCabinet item={item} />;
  if (item.catalogId === "living-moss-panel") return <MossPanel item={item} />;
  if (item.catalogId === "living-clock") return <WallClock item={item} />;
  if (item.catalogId === "living-wall-light") return <WallLight item={item} />;
  if (item.catalogId === "sanitary-washbasin") return <Washbasin item={item} />;
  if (item.catalogId === "bath-round-mirror") return <BathRoundMirror item={item} />;
  if (item.catalogId === "bath-towel-hooks-wood-black") return <BathTowelHookRail item={item} />;
  if (item.catalogId === "bath-mat" || item.catalogId === "wc-mat") return <BathMat item={item} />;
  if (item.catalogId === "bath-shower-rod") return <BathShowerRod item={item} />;
  if (item.catalogId === "bath-shower-curtain") return <BathShowerCurtain item={item} />;
  if (item.catalogId === "bath-basin-cabinet-scout") return <ScoutBasinCabinet item={item} />;
  if (item.catalogId === "bath-washer-cabinet-scout") return <ScoutWasherCabinet item={item} />;
  if (item.catalogId === "bath-shower-set") return <BathShowerSet item={item} />;
  if (item.catalogId === "wc-paper-holder") return <WcPaperHolder item={item} />;
  if (item.catalogId === "wc-brush") return <WcBrush item={item} />;
  if (item.catalogId === "zimmer1-wall-panel") return <ZimmerWallPanel item={item} />;
  if (item.catalogId === "zimmer1-desk-mirror") return <DeskLedMirror item={item} />;
  if (item.catalogId === "window-curtain") return <WindowCurtain item={item} />;
  if (item.catalogId === "zimmer1-wall-art-pair") return <Zimmer1WallArtPair item={item} />;
  if (item.catalogId === "zimmer1-entry-slim-art") return <Zimmer1EntrySlimArt item={item} />;
  if (item.catalogId === "zimmer1-headboard-led") return <Zimmer1HeadboardLed item={item} />;
  if (item.catalogId === "zimmer1-headboard-sconces") return <Zimmer1HeadboardSconces item={item} />;
  if (item.catalogId === "zimmer1-layered-curtain") return <Zimmer1LayeredCurtain item={item} />;
  if (item.catalogId.startsWith("zimmer1-desk-shelf-")) return <Zimmer1DeskShelf item={item} />;
  if (item.catalogId === "zimmer1-desk-accessories") return <Zimmer1DeskAccessories item={item} />;
  if (item.catalogId === "zimmer1-entry-niche") return <Zimmer1EntryNiche item={item} />;
  if (item.catalogId === "zimmer1-wardrobe-top-decor") return <Zimmer1WardrobeTopDecor item={item} />;
  if (item.catalogId === "zimmer1-nightstand-decor") return <Zimmer1NightstandDecor item={item} />;
  if (item.catalogId === "vorraum-wall-decor") return <VorraumWallDecor item={item} />;
  return (
    <mesh scale={item.size} geometry={SHARED_BOX} castShadow receiveShadow>
      <primitive object={getPlannerMaterial(item.materialId)} attach="material" />
    </mesh>
  );
}
