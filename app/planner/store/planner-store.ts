import { createStore, type StoreApi } from "zustand/vanilla";

import {
  applyPlannerCommand,
  type CommandError,
  type CommandResult,
  type PlannerCommand,
} from "../domain/commands.ts";
import type { CollisionHit } from "../domain/collisions.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import { createPlannerHistory } from "./history.ts";

export type PlannerViewMode = "2d" | "3d";
export type PlannerCameraMode = "orbit" | "walk";
export type PlannerPanel = "catalog" | "inspector" | "details";
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type PlannerState = {
  document: PlannerDocumentV3;
  selectionId: string | null;
  activeRoomId: string | null;
  viewMode: PlannerViewMode;
  cameraMode: PlannerCameraMode;
  overlays: PlannerDocumentV3["viewPreferences"]["overlays"];
  panels: Record<PlannerPanel, boolean>;
  autosaveStatus: AutosaveStatus;
  migrationResult: unknown | null;
  warnings: CollisionHit[];
  lastError: CommandError | null;
  canUndo: boolean;
  canRedo: boolean;
};

export type PlannerActions = {
  dispatch(command: PlannerCommand): CommandResult;
  undo(): void;
  redo(): void;
  replaceDocument(document: PlannerDocumentV3): void;
  select(id: string | null): void;
  setActiveRoom(roomId: string | null): void;
  setViewMode(mode: PlannerViewMode): void;
  setCameraMode(mode: PlannerCameraMode): void;
  setPanel(panel: PlannerPanel, open: boolean): void;
  setOverlay(overlay: keyof PlannerState["overlays"], visible: boolean): void;
  setAutosaveStatus(status: AutosaveStatus): void;
  setMigrationResult(result: unknown | null): void;
};

export type PlannerStore = StoreApi<PlannerState & PlannerActions>;

export function createPlannerStore(options: { initialDocument: PlannerDocumentV3 }): PlannerStore {
  const history = createPlannerHistory(options.initialDocument);

  return createStore<PlannerState & PlannerActions>((set, get) => ({
    document: options.initialDocument,
    selectionId: null,
    activeRoomId: options.initialDocument.viewPreferences.activeRoomId,
    viewMode: "2d",
    cameraMode: "orbit",
    overlays: { ...options.initialDocument.viewPreferences.overlays },
    panels: { catalog: true, inspector: true, details: false },
    autosaveStatus: "idle",
    migrationResult: null,
    warnings: [],
    lastError: null,
    canUndo: false,
    canRedo: false,

    dispatch(command) {
      const result = applyPlannerCommand(get().document, command);
      if (result.error) {
        set({ warnings: result.warnings, lastError: result.error });
        return result;
      }
      history.push(result.document);
      set({
        document: result.document,
        warnings: result.warnings,
        lastError: null,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
      return result;
    },
    undo() {
      set({
        document: history.undo(),
        warnings: [],
        lastError: null,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    },
    redo() {
      set({
        document: history.redo(),
        warnings: [],
        lastError: null,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    },
    replaceDocument(document) {
      history.reset(document);
      set({ document, warnings: [], lastError: null, canUndo: false, canRedo: false });
    },
    select(selectionId) { set({ selectionId }); },
    setActiveRoom(activeRoomId) { set({ activeRoomId }); },
    setViewMode(viewMode) { set({ viewMode }); },
    setCameraMode(cameraMode) { set({ cameraMode }); },
    setPanel(panel, open) {
      set((state) => ({ panels: { ...state.panels, [panel]: open } }));
    },
    setOverlay(overlay, visible) {
      set((state) => ({ overlays: { ...state.overlays, [overlay]: visible } }));
    },
    setAutosaveStatus(autosaveStatus) { set({ autosaveStatus }); },
    setMigrationResult(migrationResult) { set({ migrationResult }); },
  }));
}
