import type { PlannerDocumentV3 } from "../domain/types.ts";

export type PlannerHistory = {
  current(): PlannerDocumentV3;
  canUndo(): boolean;
  canRedo(): boolean;
  push(document: PlannerDocumentV3): PlannerDocumentV3;
  undo(): PlannerDocumentV3;
  redo(): PlannerDocumentV3;
  reset(document: PlannerDocumentV3): PlannerDocumentV3;
};

export function createPlannerHistory(initialDocument: PlannerDocumentV3): PlannerHistory {
  let past: PlannerDocumentV3[] = [];
  let present = initialDocument;
  let future: PlannerDocumentV3[] = [];

  return {
    current: () => present,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    push(document) {
      if (document === present) return present;
      past = [...past, present];
      present = document;
      future = [];
      return present;
    },
    undo() {
      const previous = past.at(-1);
      if (!previous) return present;
      past = past.slice(0, -1);
      future = [present, ...future];
      present = previous;
      return present;
    },
    redo() {
      const next = future[0];
      if (!next) return present;
      past = [...past, present];
      present = next;
      future = future.slice(1);
      return present;
    },
    reset(document) {
      past = [];
      present = document;
      future = [];
      return present;
    },
  };
}
