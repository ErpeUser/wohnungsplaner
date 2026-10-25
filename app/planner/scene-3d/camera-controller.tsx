"use client";

import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";

import { pointInPolygon } from "../domain/geometry.ts";
import type { PlannerDocumentV3, Point2 } from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";
import type { SceneModel, SceneWallSegment } from "./scene-model.ts";

export type CameraMode = "orbit" | "walk";
export type WalkCommand = "forward" | "back" | "left" | "right" | "reset";

export type WalkPose = {
  position: Point2;
  lookAt: Point2;
  eyeHeight: number;
};

const WALK_EVENT = "planner:walk-command";
const WALK_RADIUS = 0.22;
const WALK_SPEED = 1.65;
const EYE_HEIGHT = 1.62;

export function cameraTransitionDuration(reducedMotion: boolean) {
  return reducedMotion ? 0 : 320;
}

export function createWalkStartPose(
  document: PlannerDocumentV3,
  scene: SceneModel,
  activeRoomId: string | null,
): WalkPose {
  const room = activeRoomId
    ? document.rooms.find((candidate) => candidate.id === activeRoomId)
    : document.rooms.find((candidate) => candidate.id === "vorraum") ?? document.rooms[0];
  const polygon = room ? deriveRoomPolygon(document, room.id) : [];
  const center = polygon.length
    ? polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, z: sum.z + point.z / polygon.length }), { x: 0, z: 0 })
    : { x: scene.center[0], z: scene.center[2] };
  const candidates = [
    center,
    ...polygon.map((point) => ({ x: center.x * 0.72 + point.x * 0.28, z: center.z * 0.72 + point.z * 0.28 })),
  ];
  const position = candidates.find((point) => isWalkPositionValid(document, point, WALK_RADIUS))
    ?? findValidGridPoint(document, polygon)
    ?? { x: scene.center[0], z: scene.center[2] };
  const lookAt = bestWalkLookAt(document, position);
  return {
    position,
    lookAt,
    eyeHeight: EYE_HEIGHT,
  };
}

function bestWalkLookAt(document: PlannerDocumentV3, position: Point2) {
  let best = { angle: -Math.PI / 2, clearance: 0 };
  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * Math.PI * 2;
    let clearance = 0;
    for (let distance = 0.25; distance <= 3; distance += 0.25) {
      const point = {
        x: position.x + Math.cos(angle) * distance,
        z: position.z + Math.sin(angle) * distance,
      };
      if (!isWalkPositionValid(document, point, WALK_RADIUS)) break;
      clearance = distance;
    }
    if (clearance > best.clearance) best = { angle, clearance };
  }
  return {
    x: position.x + Math.cos(best.angle),
    z: position.z + Math.sin(best.angle),
  };
}

export function isWalkPositionValid(document: PlannerDocumentV3, point: Point2, radius = WALK_RADIUS) {
  const roomPolygons = document.rooms.map((room) => deriveRoomPolygon(document, room.id));
  const samples = [point, ...Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    return { x: point.x + Math.cos(angle) * radius, z: point.z + Math.sin(angle) * radius };
  })];
  if (!samples.every((sample) => roomPolygons.some((polygon) => pointInPolygon(sample, polygon)))) return false;

  const scene = createCollisionScene(document);
  if (scene.wallSegments.some((segment) => circleIntersectsWall(point, radius, segment))) return false;
  if (document.builtIns.some((item) => circleIntersectsPlacement(point, radius, item))) return false;
  if (document.placements.some((item) => circleIntersectsPlacement(point, radius, item))) return false;
  return true;
}

export function moveWalkPosition(
  document: PlannerDocumentV3,
  from: Point2,
  to: Point2,
  radius = WALK_RADIUS,
) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(0.035, radius * 0.28)));
  let accepted = from;
  for (let index = 1; index <= steps; index += 1) {
    const candidate = {
      x: from.x + (to.x - from.x) * index / steps,
      z: from.z + (to.z - from.z) * index / steps,
    };
    if (!isWalkPositionValid(document, candidate, radius)) break;
    accepted = candidate;
  }
  return accepted;
}

export function dispatchWalkCommand(command: WalkCommand) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WalkCommand>(WALK_EVENT, { detail: command }));
}

export function CameraController({
  document,
  scene,
  mode,
  activeRoomId,
  reducedMotion,
}: {
  document: PlannerDocumentV3;
  scene: SceneModel;
  mode: CameraMode;
  activeRoomId: string | null;
  reducedMotion: boolean;
}) {
  const { camera, invalidate } = useThree();
  const keys = useRef(new Set<string>());
  const walkPose = useMemo(
    () => createWalkStartPose(document, scene, activeRoomId),
    [activeRoomId, document, scene],
  );
  const sceneSpan = Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);

  const resetCamera = useCallback(() => {
    if (mode === "walk") {
      camera.position.set(walkPose.position.x, walkPose.eyeHeight, walkPose.position.z);
      camera.lookAt(walkPose.lookAt.x, walkPose.eyeHeight, walkPose.lookAt.z);
    } else {
      camera.position.set(
        scene.center[0] + sceneSpan * 0.72,
        Math.max(4.8, sceneSpan * 0.72),
        scene.center[2] + sceneSpan * 0.9,
      );
      camera.lookAt(...scene.center);
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, mode, scene.center, sceneSpan, walkPose]);

  const nudge = useCallback((command: Exclude<WalkCommand, "reset">, distance = 0.24) => {
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    const right = new Vector3(-forward.z, 0, forward.x);
    const direction = command === "forward" ? forward
      : command === "back" ? forward.clone().multiplyScalar(-1)
        : command === "right" ? right
          : right.clone().multiplyScalar(-1);
    const next = moveWalkPosition(
      document,
      { x: camera.position.x, z: camera.position.z },
      { x: camera.position.x + direction.x * distance, z: camera.position.z + direction.z * distance },
      WALK_RADIUS,
    );
    camera.position.set(next.x, EYE_HEIGHT, next.z);
    invalidate();
  }, [camera, document, invalidate]);

  useEffect(() => resetCamera(), [resetCamera]);

  useEffect(() => {
    const command = (event: Event) => {
      const detail = (event as CustomEvent<WalkCommand>).detail;
      if (detail === "reset") resetCamera();
      else if (mode === "walk") nudge(detail);
    };
    window.addEventListener(WALK_EVENT, command);
    return () => window.removeEventListener(WALK_EVENT, command);
  }, [mode, nudge, resetCamera]);

  useEffect(() => {
    if (mode !== "walk") return;
    const activeKeys = keys.current;
    const down = (event: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        activeKeys.add(event.code);
        invalidate();
      }
    };
    const up = (event: KeyboardEvent) => activeKeys.delete(event.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      activeKeys.clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [invalidate, mode]);

  useFrame((_state, delta) => {
    if (mode !== "walk" || keys.current.size === 0) return;
    const codes = keys.current;
    if (codes.has("KeyW") || codes.has("ArrowUp")) nudge("forward", WALK_SPEED * delta);
    if (codes.has("KeyS") || codes.has("ArrowDown")) nudge("back", WALK_SPEED * delta);
    if (codes.has("KeyA") || codes.has("ArrowLeft")) nudge("left", WALK_SPEED * delta);
    if (codes.has("KeyD") || codes.has("ArrowRight")) nudge("right", WALK_SPEED * delta);
    invalidate();
  });

  if (mode === "walk") return <PointerLockControls makeDefault selector="#planner-3d-canvas" />;
  return (
    <OrbitControls
      makeDefault
      target={scene.center}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      minDistance={1.4}
      maxDistance={Math.max(16, sceneSpan * 3.2)}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.02}
    />
  );
}

function findValidGridPoint(document: PlannerDocumentV3, polygon: Point2[]) {
  if (polygon.length === 0) return null;
  const minX = Math.min(...polygon.map((point) => point.x));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const minZ = Math.min(...polygon.map((point) => point.z));
  const maxZ = Math.max(...polygon.map((point) => point.z));
  for (let z = minZ + 0.35; z <= maxZ - 0.35; z += 0.25) {
    for (let x = minX + 0.35; x <= maxX - 0.35; x += 0.25) {
      const point = { x, z };
      if (isWalkPositionValid(document, point, WALK_RADIUS)) return point;
    }
  }
  return null;
}

function createCollisionScene(document: PlannerDocumentV3) {
  const wallSegments = createSceneWallSegments(document);
  return { wallSegments };
}

function createSceneWallSegments(document: PlannerDocumentV3) {
  const openingsByWall = new Map<string, Array<{ from: number; to: number; sill: number }>>();
  for (const opening of document.openings) {
    const list = openingsByWall.get(opening.wallId) ?? [];
    list.push({ from: opening.offset, to: opening.offset + opening.width, sill: opening.sill });
    openingsByWall.set(opening.wallId, list);
  }
  return document.walls.flatMap((wall) => {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
    const cuts = [0, length, ...(openingsByWall.get(wall.id) ?? []).flatMap((opening) => [opening.from, opening.to])]
      .map((value) => Math.min(length, Math.max(0, value)))
      .sort((left, right) => left - right);
    const unique = [...new Set(cuts.map((value) => Number(value.toFixed(6))))];
    return unique.slice(0, -1).flatMap((from, index) => {
      const to = unique[index + 1];
      const midpoint = (from + to) / 2;
      const lowOpening = (openingsByWall.get(wall.id) ?? []).some((opening) => (
        midpoint > opening.from + 0.001 && midpoint < opening.to - 0.001 && opening.sill <= 0.05
      ));
      if (lowOpening) return [];
      const center = (from + to) / 2;
      return [{
        id: `${wall.id}-${index}`,
        position: [
          wall.start.x + Math.cos(angle) * center,
          wall.height / 2,
          wall.start.z + Math.sin(angle) * center,
        ] as [number, number, number],
        size: [to - from, wall.height, wall.thickness] as [number, number, number],
        rotationY: -angle,
      } satisfies SceneWallSegment];
    });
  });
}

function circleIntersectsWall(point: Point2, radius: number, segment: SceneWallSegment) {
  const dx = point.x - segment.position[0];
  const dz = point.z - segment.position[2];
  const cosine = Math.cos(segment.rotationY);
  const sine = Math.sin(segment.rotationY);
  const local = {
    x: dx * cosine - dz * sine,
    z: dx * sine + dz * cosine,
  };
  return circleIntersectsAxisAlignedRect(local, radius, segment.size[0], segment.size[2]);
}

function circleIntersectsPlacement(
  point: Point2,
  radius: number,
  item: PlannerDocumentV3["builtIns"][number] | PlannerDocumentV3["placements"][number],
) {
  const radians = -item.rotation * Math.PI / 180;
  const dx = point.x - item.position.x;
  const dz = point.z - item.position.z;
  const local = {
    x: dx * Math.cos(radians) - dz * Math.sin(radians),
    z: dx * Math.sin(radians) + dz * Math.cos(radians),
  };
  return circleIntersectsAxisAlignedRect(local, radius, item.size.width, item.size.depth);
}

function circleIntersectsAxisAlignedRect(point: Point2, radius: number, width: number, depth: number) {
  const closestX = Math.max(-width / 2, Math.min(width / 2, point.x));
  const closestZ = Math.max(-depth / 2, Math.min(depth / 2, point.z));
  return Math.hypot(point.x - closestX, point.z - closestZ) < radius;
}
