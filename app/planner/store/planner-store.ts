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
import type {
  PlannerImportPreview,
  PlannerRepository,
} from "./persistence.ts";
import type { MigrationResult } from "../domain/migration.ts";

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
  migrationResult: MigrationResult | null;
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
  setMigrationResult(result: MigrationResult | null): void;
  hydrate(): MigrationResult | null;
  scheduleSave(): void;
  importDocument(preview: PlannerImportPreview): PlannerDocumentV3 | null;
  restoreBackup(): MigrationResult | null;
};

export type PlannerStore = StoreApi<PlannerState & PlannerActions>;

export function createPlannerStore(options: {
  initialDocument: PlannerDocumentV3;
  repository?: PlannerRepository;
  autosaveDelayMs?: number;
}): PlannerStore {
  const history = createPlannerHistory(options.initialDocument);
  const autosaveDelayMs = options.autosaveDelayMs ?? 300;
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  let autosaveGeneration = 0;
  const cancelPendingAutosave = () => {
    autosaveGeneration += 1;
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = null;
  };

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
      get().scheduleSave();
      return result;
    },
    undo() {
      const before = get().document;
      const document = history.undo();
      set({
        document,
        warnings: [],
        lastError: null,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
      if (document !== before) get().scheduleSave();
    },
    redo() {
      const before = get().document;
      const document = history.redo();
      set({
        document,
        warnings: [],
        lastError: null,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
      if (document !== before) get().scheduleSave();
    },
    replaceDocument(document) {
      cancelPendingAutosave();
      history.reset(document);
      set({ document, warnings: [], lastError: null, canUndo: false, canRedo: false, autosaveStatus: "idle" });
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
    hydrate() {
      if (!options.repository) return null;
      cancelPendingAutosave();
      const result = options.repository.load();
      history.reset(result.document);
      set({
        document: result.document,
        activeRoomId: result.document.viewPreferences.activeRoomId,
        overlays: { ...result.document.viewPreferences.overlays },
        migrationResult: result,
        warnings: [],
        lastError: null,
        canUndo: false,
        canRedo: false,
        autosaveStatus: "idle",
      });
      return result;
    },
    scheduleSave() {
      if (!options.repository) return;
      cancelPendingAutosave();
      const generation = autosaveGeneration;
      set({ autosaveStatus: "idle" });
      autosaveTimer = setTimeout(() => {
        autosaveTimer = null;
        const document = get().document;
        set({ autosaveStatus: "saving" });
        try {
          const saved = options.repository!.save(document);
          if (generation !== autosaveGeneration) return;
          set({
            document: get().document === document ? saved : get().document,
            autosaveStatus: "saved",
          });
        } catch {
          if (generation === autosaveGeneration) set({ autosaveStatus: "error" });
        }
      }, autosaveDelayMs);
    },
    importDocument(preview) {
      if (!options.repository) return null;
      cancelPendingAutosave();
      const document = options.repository.commitImport(preview);
      history.reset(document);
      set({
        document,
        activeRoomId: document.viewPreferences.activeRoomId,
        overlays: { ...document.viewPreferences.overlays },
        migrationResult: preview,
        warnings: [],
        lastError: null,
        canUndo: false,
        canRedo: false,
        autosaveStatus: "saved",
      });
      return document;
    },
    restoreBackup() {
      if (!options.repository) return null;
      cancelPendingAutosave();
      const result = options.repository.restoreBackup();
      if (!result) return null;
      const document = options.repository.save(result.document);
      history.reset(document);
      set({
        document,
        activeRoomId: document.viewPreferences.activeRoomId,
        overlays: { ...document.viewPreferences.overlays },
        migrationResult: result,
        warnings: [],
        lastError: null,
        canUndo: false,
        canRedo: false,
        autosaveStatus: "saved",
      });
      return result;
    },
  }));
}
