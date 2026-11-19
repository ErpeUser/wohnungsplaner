"use client";
/* React Three Fiber exposes a live camera object by design; camera pose/FOV
 * mutations are imperative scene synchronization, not React state mutation. */
/* camera controls are fully checked by the current React Hooks rules */

import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MOUSE, TOUCH, Vector3, type PerspectiveCamera } from "three";

import { doorPassagePolygon, pointInPolygon } from "../domain/geometry.ts";
import type { PlannerDocumentV3, Point2 } from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";
import { openingSliceOnWall, type SceneModel, type SceneWallSegment } from "./scene-model.ts";
import { isFloorCovering } from "../domain/collisions.ts";

export type CameraMode = "orbit" | "walk";
export type WalkCommand = "forward" | "back" | "left" | "right" | "zoom-in" | "zoom-out" | "reset";
type MoveCommand = "forward" | "back" | "left" | "right";

export type WalkPose = {
  position: Point2;
  lookAt: Point2;
  eyeHeight: number;
};

export type OrbitPose = {
  position: [number, number, number];
  target: [number, number, number];
};

const WALK_EVENT = "planner:walk-command";
const WALK_RADIUS = 0.22;
const WALK_SPEED = 1.65;
const EYE_HEIGHT = 1.62;
const DEFAULT_WALK_FOV = 42;
const MIN_WALK_FOV = 24;
const MAX_WALK_FOV = 72;

export function orbitFovForRoom(activeRoomId: string | null) {
  return activeRoomId === "vorraum" ? 46 : 42;
}

export function cameraTransitionDuration(reducedMotion: boolean) {
  return reducedMotion ? 0 : 320;
}

export function nextWalkFov(current: number, command: "zoom-in" | "zoom-out") {
  return Math.min(MAX_WALK_FOV, Math.max(MIN_WALK_FOV, current + (command === "zoom-in" ? -5 : 5)));
}

export function walkZoomCommandForKey(event: Pick<KeyboardEvent, "code" | "key">) {
  if (event.code === "NumpadAdd" || event.key === "+") return "zoom-in" as const;
  if (event.code === "NumpadSubtract" || event.key === "-") return "zoom-out" as const;
  return null;
}

export function createOrbitPose(scene: SceneModel, activeRoomId: string | null): OrbitPose {
  const [centerX, centerY, centerZ] = scene.center;
  const span = Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);
  const direction = activeRoomId === "zimmer1"
    ? { x: 0.78, z: -0.94 }
    : activeRoomId === "vorraum"
      ? { x: 0.48, z: -0.88 }
      : { x: 0.72, z: 0.9 };
  const hallOverview = activeRoomId === "vorraum";
  return {
    position: [
      centerX + span * direction.x,
      hallOverview ? Math.max(3.15, span * 0.62) : Math.max(4.8, span * 0.72),
      centerZ + span * direction.z,
    ],
    target: [centerX, hallOverview ? 0.82 : centerY, centerZ],
  };
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
  const position = candidates.find((point) => isWalkPositionValid(document, point, WALK_RADIUS, activeRoomId))
    ?? findValidGridPoint(document, polygon, activeRoomId)
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

export function isWalkPositionValid(
  document: PlannerDocumentV3,
  point: Point2,
  radius = WALK_RADIUS,
  activeRoomId: string | null = null,
) {
  const roomPolygons = document.rooms
    .filter((room) => !activeRoomId || room.id === activeRoomId)
    .map((room) => deriveRoomPolygon(document, room.id));
  const doorwayPolygons = document.openings
    .filter((opening) => (
      (opening.kind === "passage"
        || (opening.kind === "door" && (opening.roomIds?.length ?? 0) > 1)
        || document.doorStates[opening.id] === "open")
      && opening.sill <= 0.05
      && (opening.roomIds?.length ?? 0) > 1
    ))
    .map((opening) => doorPassagePolygon(document, opening.id));
  const samples = [point, ...Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    return { x: point.x + Math.cos(angle) * radius, z: point.z + Math.sin(angle) * radius };
  })];
  if (activeRoomId && !pointInPolygon(point, deriveRoomPolygon(document, activeRoomId))) return false;
  if (!samples.every((sample) => (
    roomPolygons.some((polygon) => pointInPolygon(sample, polygon))
    || doorwayPolygons.some((polygon) => pointInOrNearPolygon(sample, polygon, radius))
  ))) return false;

  const scene = createCollisionScene(document, radius);
  const atInteriorDoorway = doorwayPolygons.some((polygon) => pointInOrNearPolygon(point, polygon, radius));
  if (!atInteriorDoorway && scene.wallSegments.some((segment) => circleIntersectsWall(point, radius, segment))) return false;
  if (document.builtIns.some((item) => isWalkBlockingBuiltIn(item) && circleIntersectsPlacement(point, radius, item))) return false;
  if (document.placements.some((item) => isWalkBlockingPlacement(item) && !isFloorCovering(item) && circleIntersectsPlacement(point, radius, item))) return false;
  return true;
}

function isWalkBlockingBuiltIn(item: PlannerDocumentV3["builtIns"][number]) {
  return item.collision !== "decorative" && (item.elevation ?? 0) + item.size.height > 0.08;
}

function isWalkBlockingPlacement(item: PlannerDocumentV3["placements"][number]) {
  return item.size.height > 0.08;
}

export function moveWalkPosition(
  document: PlannerDocumentV3,
  from: Point2,
  to: Point2,
  radius = WALK_RADIUS,
  activeRoomId: string | null = null,
) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(distance / Math.max(0.035, radius * 0.28)));
  let accepted = from;
  for (let index = 1; index <= steps; index += 1) {
    const candidate = {
      x: from.x + (to.x - from.x) * index / steps,
      z: from.z + (to.z - from.z) * index / steps,
    };
    if (!isWalkPositionValid(document, candidate, radius, activeRoomId)) break;
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
  onOrbitCameraChange,
}: {
  document: PlannerDocumentV3;
  scene: SceneModel;
  mode: CameraMode;
  activeRoomId: string | null;
  reducedMotion: boolean;
  onOrbitCameraChange?(position: Point2): void;
}) {
  const { camera, invalidate, gl } = useThree();
  const keys = useRef(new Set<string>());
  const walkPose = useMemo(
    () => createWalkStartPose(document, scene, activeRoomId),
    [activeRoomId, document, scene],
  );
  const [sceneCenterX, sceneCenterY, sceneCenterZ] = scene.center;
  const orbitPose = useMemo(() => createOrbitPose(scene, activeRoomId), [activeRoomId, scene]);
  const orbitTarget = useMemo<[number, number, number]>(
    () => orbitPose.target,
    [orbitPose],
  );
  const walkPositionX = walkPose.position.x;
  const walkPositionZ = walkPose.position.z;
  const walkLookAtX = walkPose.lookAt.x;
  const walkLookAtZ = walkPose.lookAt.z;
  const walkEyeHeight = walkPose.eyeHeight;
  const sceneSpan = Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);
  const reportedOrbitPosition = useRef<Point2 | null>(null);
  const reportOrbitCamera = useCallback(() => {
    if (mode !== "orbit" || !onOrbitCameraChange) return;
    const next = { x: camera.position.x, z: camera.position.z };
    const previous = reportedOrbitPosition.current;
    if (previous && Math.hypot(next.x - previous.x, next.z - previous.z) < 0.015) return;
    reportedOrbitPosition.current = next;
    onOrbitCameraChange(next);
  }, [camera, mode, onOrbitCameraChange]);

  const resetCamera = useCallback(() => {
    if (mode === "walk") {
      camera.position.set(walkPositionX, walkEyeHeight, walkPositionZ);
      camera.lookAt(walkLookAtX, walkEyeHeight, walkLookAtZ);
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera) perspective.fov = DEFAULT_WALK_FOV;
    } else {
      camera.position.set(...orbitPose.position);
      camera.lookAt(...orbitPose.target);
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera) perspective.fov = orbitFovForRoom(activeRoomId);
      reportOrbitCamera();
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [
    camera,
    activeRoomId,
    invalidate,
    mode,
    orbitPose,
    reportOrbitCamera,
    walkEyeHeight,
    walkLookAtX,
    walkLookAtZ,
    walkPositionX,
    walkPositionZ,
  ]);

  const nudge = useCallback((command: MoveCommand, distance = 0.24) => {
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
      activeRoomId,
    );
    camera.position.set(next.x, EYE_HEIGHT, next.z);
    invalidate();
  }, [activeRoomId, camera, document, invalidate]);

  const zoomCamera = useCallback((command: "zoom-in" | "zoom-out") => {
    if (mode === "walk") {
      const perspective = camera as PerspectiveCamera;
      if (!perspective.isPerspectiveCamera) return;
      perspective.fov = nextWalkFov(perspective.fov, command);
      perspective.updateProjectionMatrix();
      invalidate();
      return;
    }
    const target = new Vector3(sceneCenterX, sceneCenterY, sceneCenterZ);
    const offset = camera.position.clone().sub(target);
    const currentDistance = offset.length();
    const nextDistance = Math.min(
      Math.max(1.4, command === "zoom-in" ? currentDistance * 0.82 : currentDistance * 1.22),
      Math.max(16, sceneSpan * 3.2),
    );
    if (currentDistance > 0.001) offset.setLength(nextDistance);
    camera.position.copy(target.add(offset));
    camera.lookAt(sceneCenterX, sceneCenterY, sceneCenterZ);
    camera.updateProjectionMatrix();
    reportOrbitCamera();
    invalidate();
  }, [camera, invalidate, mode, reportOrbitCamera, sceneCenterX, sceneCenterY, sceneCenterZ, sceneSpan]);

  useEffect(() => resetCamera(), [resetCamera]);

  useEffect(() => {
    if (mode === "walk") return;
    keys.current.clear();
    if (globalThis.document.pointerLockElement === gl.domElement) {
      globalThis.document.exitPointerLock?.();
    }
  }, [gl.domElement, mode]);

  useEffect(() => {
    const command = (event: Event) => {
      const detail = (event as CustomEvent<WalkCommand>).detail;
      if (detail === "reset") resetCamera();
      else if (detail === "zoom-in" || detail === "zoom-out") zoomCamera(detail);
      else if (mode === "walk") nudge(detail);
    };
    window.addEventListener(WALK_EVENT, command);
    return () => window.removeEventListener(WALK_EVENT, command);
  }, [mode, nudge, resetCamera, zoomCamera]);

  useEffect(() => {
    if (mode !== "walk") return;
    const activeKeys = keys.current;
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, button, a, [contenteditable='true'], [role='button']")) return;
      if (globalThis.document.pointerLockElement !== gl.domElement && globalThis.document.activeElement !== gl.domElement) return;
      const zoomCommand = walkZoomCommandForKey(event);
      if (zoomCommand) {
        event.preventDefault();
        zoomCamera(zoomCommand);
        return;
      }
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
  }, [gl.domElement, invalidate, mode, zoomCamera]);

  useFrame((_state, delta) => {
    if (mode !== "walk" || keys.current.size === 0) return;
    const codes = keys.current;
    if (codes.has("KeyW") || codes.has("ArrowUp")) nudge("forward", WALK_SPEED * delta);
    if (codes.has("KeyS") || codes.has("ArrowDown")) nudge("back", WALK_SPEED * delta);
    if (codes.has("KeyA") || codes.has("ArrowLeft")) nudge("left", WALK_SPEED * delta);
    if (codes.has("KeyD") || codes.has("ArrowRight")) nudge("right", WALK_SPEED * delta);
    invalidate();
  });

  if (mode === "walk") return <SafePointerLockControls />;
  return (
    <OrbitControls
      makeDefault
      target={orbitTarget}
      /* Keep the overview camera static. Zoom and reset stay available through the overlay buttons. */
      enabled
      enableRotate={false}
      enableZoom={false}
      enablePan={false}
      screenSpacePanning
      zoomToCursor
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
      rotateSpeed={0.72}
      panSpeed={0.8}
      zoomSpeed={0.9}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      minDistance={1.4}
      maxDistance={Math.max(16, sceneSpan * 3.2)}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.02}
      onChange={reportOrbitCamera}
    />
  );
}

function SafePointerLockControls() {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;

    const lockPointer = () => {
      try {
        const request = canvas.requestPointerLock();
        if (request) void request.catch(() => undefined);
      } catch {
        // Pointer lock is optional. Embedded Chromium views can reject it even
        // after a user click; walking with WASD and the on-screen controls still works.
      }
    };

    canvas.addEventListener("click", lockPointer);
    return () => canvas.removeEventListener("click", lockPointer);
  }, [gl.domElement]);

  // Drei still owns camera rotation after a successful lock. The deliberately
  // empty selector prevents its internal click handler from dropping the
  // requestPointerLock() promise, which caused the Chromium rejection overlay.
  return <PointerLockControls makeDefault domElement={gl.domElement} selector="#planner-pointer-lock-trigger-disabled" />;
}

function findValidGridPoint(document: PlannerDocumentV3, polygon: Point2[], activeRoomId: string | null) {
  if (polygon.length === 0) return null;
  const minX = Math.min(...polygon.map((point) => point.x));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const minZ = Math.min(...polygon.map((point) => point.z));
  const maxZ = Math.max(...polygon.map((point) => point.z));
  for (let z = minZ + 0.35; z <= maxZ - 0.35; z += 0.25) {
    for (let x = minX + 0.35; x <= maxX - 0.35; x += 0.25) {
      const point = { x, z };
      if (isWalkPositionValid(document, point, WALK_RADIUS, activeRoomId)) return point;
    }
  }
  return null;
}

function createCollisionScene(document: PlannerDocumentV3, clearanceRadius = 0) {
  const wallSegments = createSceneWallSegments(document, clearanceRadius);
  return { wallSegments };
}

export function createSceneWallSegments(document: PlannerDocumentV3, clearanceRadius = 0) {
  const openingsByWall = new Map<string, Array<{ from: number; to: number; sill: number }>>();
  for (const opening of document.openings) {
    const isInteriorDoorway = opening.kind === "door" && (opening.roomIds?.length ?? 0) > 1;
    const isPassable = opening.kind === "passage" || isInteriorDoorway || document.doorStates[opening.id] === "open";
    if (opening.sill <= 0.05 && !isPassable) continue;
    for (const wall of document.walls) {
      const slice = openingSliceOnWall(document, opening, wall);
      if (!slice) continue;
      const list = openingsByWall.get(wall.id) ?? [];
    list.push({ from: slice.offset, to: slice.offset + slice.width, sill: slice.sill });
      openingsByWall.set(wall.id, list);
    }
  }
  return document.walls.flatMap((wall) => {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
    const openings = (openingsByWall.get(wall.id) ?? []).map((opening) => (
      opening.sill <= 0.05
        ? { ...opening, from: opening.from - clearanceRadius, to: opening.to + clearanceRadius }
        : opening
    ));
    const cuts = [0, length, ...openings.flatMap((opening) => [opening.from, opening.to])]
      .map((value) => Math.min(length, Math.max(0, value)))
      .sort((left, right) => left - right);
    const unique = [...new Set(cuts.map((value) => Number(value.toFixed(6))))];
    return unique.slice(0, -1).flatMap((from, index) => {
      const to = unique[index + 1];
      const midpoint = (from + to) / 2;
      const lowOpening = openings.some((opening) => (
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

function pointInOrNearPolygon(point: Point2, polygon: Point2[], radius: number) {
  if (pointInPolygon(point, polygon)) return true;
  const radiusSquared = radius * radius;
  return polygon.some((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSquared = dx * dx + dz * dz;
    const projection = lengthSquared <= 0.000001
      ? 0
      : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
    const nearestX = start.x + projection * dx;
    const nearestZ = start.z + projection * dz;
    return (point.x - nearestX) ** 2 + (point.z - nearestZ) ** 2 <= radiusSquared;
  });
}

