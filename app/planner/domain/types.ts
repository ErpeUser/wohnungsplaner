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
  area: number;
  includedInWnf: boolean;
  wnfArea?: number;
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
  label: string;
  roomIds?: string[];
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sill: number;
  kind: "door" | "window" | "passage";
  hinge: "start" | "end" | "none";
  swingDirection: 1 | -1;
  swingDegrees: number;
  visualOpenFraction?: number;
  visualStyle?: "solid-white" | "solid-oak" | "glass-clear" | "glass-frosted";
  metadata?: PlannerMetadata;
};

export type PlannerBuiltIn = {
  id: string;
  label: string;
  roomId: string;
  kind: "kitchen" | "sanitary" | "storage" | "other";
  catalogId?: string;
  position: Point2;
  elevation?: number;
  rotation: number;
  size: Size3;
  locked: true;
  /** Decorative wall-mounted/floor-covering built-ins do not block furniture or the walk camera. */
  collision?: "blocking" | "decorative";
  materialVariants?: Record<string, string>;
  metadata?: PlannerMetadata;
};

export type PlannerFixture = {
  id: string;
  label: string;
  roomId: string;
  kind: string;
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
  groupId?: string;
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
