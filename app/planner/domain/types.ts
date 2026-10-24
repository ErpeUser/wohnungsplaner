export type Point2 = {
  x: number;
  z: number;
};

export type Size3 = {
  width: number;
  depth: number;
  height: number;
};

export type PlannerMetadata = {
  source?: string;
  confidence?: "confirmed" | "estimated" | "legacy";
  notes?: string[];
};

export type WallRef = {
  wallId: string;
  direction: 1 | -1;
};

export type PlannerWall = {
  id: string;
  start: Point2;
  end: Point2;
  thickness: number;
  height: number;
  roomIds: string[];
  metadata?: PlannerMetadata;
};

export type PlannerRoom = {
  id: string;
  name: string;
  boundary: WallRef[];
  surfaces: {
    floor: string;
    walls: string;
    ceiling: string;
  };
  metadata?: PlannerMetadata;
};

export type PlannerOpening = {
  id: string;
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sill: number;
  kind: "door" | "window" | "passage";
  hinge: "start" | "end" | "none";
  swingDegrees: number;
  metadata?: PlannerMetadata;
};

export type PlannerBuiltIn = {
  id: string;
  roomId: string;
  kind: "kitchen" | "sanitary" | "storage" | "other";
  catalogId?: string;
  position: Point2;
  rotation: number;
  size: Size3;
  locked: true;
  materialVariants?: Record<string, string>;
  metadata?: PlannerMetadata;
};

export type PlannerFixture = {
  id: string;
  roomId: string;
  kind:
    | "switch"
    | "outlet"
    | "blind-control"
    | "vent"
    | "light"
    | "radiator"
    | "other";
  position: Point2;
  wallId?: string;
  height?: number;
  rotation?: number;
  metadata?: PlannerMetadata;
};

export type PlannerPlacement = {
  id: string;
  roomId: string;
  catalogId: string;
  position: Point2;
  rotation: number;
  size: Size3;
  wallId?: string;
  materialVariants?: Record<string, string>;
  metadata?: PlannerMetadata;
};

export type PlannerViewPreferences = {
  activeRoomId: string | null;
  overlays: {
    dimensions: boolean;
    fixtures: boolean;
    evidence: boolean;
  };
};

export type PlannerDocumentV3 = {
  schemaVersion: 3;
  id: string;
  name: string;
  updatedAt: string;
  walls: PlannerWall[];
  rooms: PlannerRoom[];
  openings: PlannerOpening[];
  builtIns: PlannerBuiltIn[];
  fixtures: PlannerFixture[];
  placements: PlannerPlacement[];
  doorStates: Record<string, "open" | "closed">;
  viewPreferences: PlannerViewPreferences;
};
