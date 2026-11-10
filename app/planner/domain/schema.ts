import { z } from "zod";

import type { PlannerDocumentV3, PlannerWall, Point2, WallRef } from "./types.ts";
import { roomContainsPlacement } from "./geometry.ts";

const FINITE_MESSAGE = "Value must be finite";
const EPSILON = 0.001;

const finiteNumber = z.number({ error: FINITE_MESSAGE }).finite(FINITE_MESSAGE);
const positiveNumber = finiteNumber.positive();
const nonNegativeNumber = finiteNumber.nonnegative();
const entityId = z.string().trim().min(1);

const pointSchema = z.object({
  x: finiteNumber,
  z: finiteNumber,
});

const sizeSchema = z.object({
  width: positiveNumber,
  depth: positiveNumber,
  height: positiveNumber,
});

const metadataSchema = z
  .object({
    source: z.string().trim().min(1).optional(),
    confidence: z.enum(["confirmed", "estimated", "legacy"]).optional(),
    notes: z.array(z.string()).optional(),
  })
  .optional();

const wallRefSchema = z.object({
  wallId: entityId,
  direction: z.union([z.literal(1), z.literal(-1)]),
});

const wallSchema = z.object({
  id: entityId,
  start: pointSchema,
  end: pointSchema,
  thickness: positiveNumber,
  height: positiveNumber,
  roomIds: z.array(entityId),
  metadata: metadataSchema,
});

const roomSchema = z.object({
  id: entityId,
  name: z.string().trim().min(1),
  area: positiveNumber,
  includedInWnf: z.boolean(),
  wnfArea: nonNegativeNumber.optional(),
  boundary: z.array(wallRefSchema).min(3),
  surfaces: z.object({
    floor: entityId,
    walls: entityId,
    ceiling: entityId,
  }),
  metadata: metadataSchema,
});

const openingSchema = z.object({
  id: entityId,
  label: z.string().trim().min(1),
  roomIds: z.array(entityId).optional(),
  wallId: entityId,
  offset: nonNegativeNumber,
  width: positiveNumber,
  height: positiveNumber,
  sill: nonNegativeNumber,
  kind: z.enum(["door", "window", "passage"]),
  hinge: z.enum(["start", "end", "none"]),
  swingDirection: z.union([z.literal(1), z.literal(-1)]).optional(),
  swingDegrees: nonNegativeNumber.max(180),
  visualOpenFraction: z.number().min(0).max(1).optional(),
  visualStyle: z.enum(["solid-white", "solid-oak", "glass-clear", "glass-frosted"]).optional(),
  metadata: metadataSchema,
}).transform((opening) => ({
  ...opening,
  swingDirection: opening.swingDirection ?? (opening.hinge === "end" ? -1 as const : 1 as const),
}));

const builtInSchema = z.object({
  id: entityId,
  label: z.string().trim().min(1),
  roomId: entityId,
  kind: z.enum(["kitchen", "sanitary", "storage", "other"]),
  catalogId: entityId.optional(),
  position: pointSchema,
  elevation: nonNegativeNumber.optional(),
  rotation: finiteNumber,
  size: sizeSchema,
  locked: z.literal(true),
  materialVariants: z.record(entityId, entityId).optional(),
  metadata: metadataSchema,
});

const fixtureSchema = z.object({
  id: entityId,
  label: z.string().trim().min(1),
  roomId: entityId,
  kind: entityId,
  position: pointSchema,
  wallId: entityId.optional(),
  height: nonNegativeNumber.optional(),
  rotation: finiteNumber.optional(),
  metadata: metadataSchema,
});

const placementSchema = z.object({
  id: entityId,
  roomId: entityId,
  catalogId: entityId,
  groupId: entityId.optional(),
  position: pointSchema,
  rotation: finiteNumber,
  size: sizeSchema,
  wallId: entityId.optional(),
  materialVariants: z.record(entityId, entityId).optional(),
  metadata: metadataSchema,
});

const plannerDocumentSchema = z
  .object({
    schemaVersion: z.literal(3),
    id: entityId,
    name: z.string().trim().min(1),
    updatedAt: z.iso.datetime(),
    walls: z.array(wallSchema).min(3),
    rooms: z.array(roomSchema).min(1),
    openings: z.array(openingSchema),
    builtIns: z.array(builtInSchema),
    fixtures: z.array(fixtureSchema),
    placements: z.array(placementSchema),
    doorStates: z.record(entityId, z.enum(["open", "closed"])),
    viewPreferences: z.object({
      activeRoomId: entityId.nullable(),
      overlays: z.object({
        dimensions: z.boolean(),
        fixtures: z.boolean(),
        evidence: z.boolean(),
      }),
    }),
  })
  .superRefine((document, context) => {
    validateUniqueIds(document, context);

    const wallById = new Map(document.walls.map((wall) => [wall.id, wall]));
    const roomIds = new Set(document.rooms.map((room) => room.id));

    for (const wall of document.walls) {
      if (distance(wall.start, wall.end) <= EPSILON) {
        addIssue(context, ["walls"], `Wall ${wall.id} must have a finite length`);
      }
      for (const roomId of wall.roomIds) {
        if (!roomIds.has(roomId)) {
          addIssue(context, ["walls"], `Wall ${wall.id} references unknown room ${roomId}`);
        }
      }
    }

    for (const room of document.rooms) {
      const boundaryWalls = room.boundary.map((reference) => wallById.get(reference.wallId));
      if (boundaryWalls.some((wall) => !wall)) {
        addIssue(context, ["rooms"], `Room ${room.id} references an unknown wall`);
        continue;
      }
      if (!isClosedLoop(room.boundary, wallById)) {
        addIssue(context, ["rooms"], `Room ${room.id} boundary must form a closed wall loop`);
      }
    }

    for (const opening of document.openings) {
      const wall = wallById.get(opening.wallId);
      if (!wall) {
        addIssue(context, ["openings"], `Opening ${opening.id} references an unknown wall`);
        continue;
      }
      if (!wallChainSupportsOpening(document.walls, wall, opening.offset, opening.width)) {
        addIssue(context, ["openings"], `Opening ${opening.id} extends outside its wall`);
      }
    }

    for (const item of [...document.builtIns, ...document.fixtures, ...document.placements]) {
      if (!roomIds.has(item.roomId)) {
        addIssue(context, [], `${item.id} references unknown room ${item.roomId}`);
      }
      if ("wallId" in item && item.wallId && !wallById.has(item.wallId)) {
        addIssue(context, [], `${item.id} references unknown wall ${item.wallId}`);
      }
    }

    for (const placement of document.placements) {
      if (roomIds.has(placement.roomId) && !roomContainsPlacement(document, placement.roomId, placement)) {
        addIssue(context, ["placements"], `Placement ${placement.id} must be fully inside room ${placement.roomId}`);
      }
    }

    if (document.viewPreferences.activeRoomId && !roomIds.has(document.viewPreferences.activeRoomId)) {
      addIssue(context, ["viewPreferences", "activeRoomId"], "Active room does not exist");
    }

    const doorIds = new Set(
      document.openings.filter((opening) => opening.kind === "door").map((opening) => opening.id),
    );
    for (const openingId of Object.keys(document.doorStates)) {
      if (!doorIds.has(openingId)) {
        addIssue(context, ["doorStates", openingId], `Door state references unknown door ${openingId}`);
      }
    }
  });

export class PlannerValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(error: z.ZodError) {
    super(error.issues.map((issue) => issue.message).join("; "));
    this.name = "PlannerValidationError";
    this.issues = error.issues;
  }
}

export function parsePlannerDocument(value: unknown): PlannerDocumentV3 {
  const result = plannerDocumentSchema.safeParse(value);
  if (!result.success) {
    throw new PlannerValidationError(result.error);
  }
  return result.data;
}

function validateUniqueIds(
  document: z.infer<typeof plannerDocumentSchema>,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>([document.id]);
  const entities = [
    ...document.walls,
    ...document.rooms,
    ...document.openings,
    ...document.builtIns,
    ...document.fixtures,
    ...document.placements,
  ];

  for (const entity of entities) {
    if (seen.has(entity.id)) {
      addIssue(context, [], `Duplicate id: ${entity.id}`);
    }
    seen.add(entity.id);
  }
}

function isClosedLoop(references: WallRef[], wallById: Map<string, PlannerWall>) {
  const oriented = references.map((reference) => {
    const wall = wallById.get(reference.wallId)!;
    return reference.direction === 1
      ? { start: wall.start, end: wall.end }
      : { start: wall.end, end: wall.start };
  });

  return oriented.every((segment, index) => {
    const next = oriented[(index + 1) % oriented.length];
    return pointsEqual(segment.end, next.start);
  });
}

function pointsEqual(left: Point2, right: Point2) {
  return distance(left, right) <= EPSILON;
}

function distance(left: Point2, right: Point2) {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function wallChainSupportsOpening(walls: PlannerWall[], base: PlannerWall, offset: number, width: number) {
  const length = distance(base.start, base.end);
  const tangent = { x: (base.end.x - base.start.x) / length, z: (base.end.z - base.start.z) / length };
  const intervals = walls
    .filter((wall) => wall.roomIds.some((roomId) => base.roomIds.includes(roomId)))
    .filter((wall) => [wall.start, wall.end].every((point) => {
      const cross = (point.x - base.start.x) * tangent.z - (point.z - base.start.z) * tangent.x;
      return Math.abs(cross) <= EPSILON;
    }))
    .map((wall) => {
      const values = [wall.start, wall.end].map((point) => (
        (point.x - base.start.x) * tangent.x + (point.z - base.start.z) * tangent.z
      ));
      return { start: Math.min(...values), end: Math.max(...values) };
    })
    .sort((left, right) => left.start - right.start);
  let covered = offset;
  const required = offset + width;
  for (const interval of intervals) {
    if (interval.start > covered + EPSILON) break;
    if (interval.end >= covered - EPSILON) covered = Math.max(covered, interval.end);
    if (covered >= required - EPSILON) return true;
  }
  return false;
}

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({
    code: "custom",
    path,
    message,
  });
}
