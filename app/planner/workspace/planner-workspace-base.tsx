"use client";

import type Konva from "konva";
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";
import type { PlannerAssetRecord } from "../domain/types.ts";
import { ExportDialog } from "../export/export-dialog.tsx";
import { PlanCanvas } from "../plan-2d/plan-canvas.tsx";
import { createPlanScene } from "../plan-2d/plan-scene.ts";
import { usePlanInteractions } from "../plan-2d/use-plan-interactions.ts";
import { createLocalStoragePlannerRepository, upgradeLivingSofaRugGroup, upgradeRetiredDiningGroup } from "../store/persistence.ts";
import { createPlannerStore, type PlannerStore } from "../store/planner-store.ts";
import { CatalogPanel } from "./catalog-panel.tsx";
import { DetailsDrawer } from "./details-drawer.tsx";
import { InspectorPanel } from "./inspector-panel.tsx";
import { PlannerStatus } from "./planner-status.tsx";
import { PlannerToolbar } from "./planner-toolbar.tsx";
import { ShoppingListDrawer } from "./shopping-list-drawer.tsx";
import "./planner-workspace.css";

const LazyPlanner3D = lazy(() => import("../scene-3d/planner-3d.tsx").then((module) => ({
  default: module.Planner3D,
})));

export function PlannerWorkspace({ store: providedStore }: { store?: PlannerStore }) {
  const [repository] = useState(() => browserRepository());
  const [internalStore] = useState(() => createPlannerStore({
    initialDocument: DEFAULT_APARTMENT_DOCUMENT,
    repository,
  }));
  const store = providedStore ?? internalStore;
  const state = useStore(store);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const shoppingButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const [planStage, setPlanStage] = useState<Konva.Stage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const openExport = useCallback(() => setExportOpen(true), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const detailsOpen = state.panels.details;
  const drawerOpen = detailsOpen || shoppingOpen;
  const setPanel = state.setPanel;
  const interactions = usePlanInteractions({
    document: state.document,
    activeRoomId: state.activeRoomId,
    selectionId: state.selectionId,
    dispatch: state.dispatch,
    select: state.select,
  });
  const exportScene = useMemo(() => createPlanScene(state.document, {
    activeRoomId: null,
    overlays: state.overlays,
  }), [state.document, state.overlays]);

  useEffect(() => {
    if (providedStore) return;
    try {
      store.getState().hydrate();
    } catch {
      store.getState().setAutosaveStatus("error");
    }
  }, [providedStore, store]);

  useEffect(() => {
    if (providedStore) return;
    const current = store.getState().document;
    const upgraded = upgradeLivingSofaRugGroup(upgradeRetiredDiningGroup(current));
    if (upgraded === current) return;
    store.getState().replaceDocument(upgraded);
    store.getState().scheduleSave();
  }, [providedStore, state.document, store]);

  useEffect(() => {
    const onHistoryShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        store.getState().undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        store.getState().redo();
      }
    };
    window.addEventListener("keydown", onHistoryShortcut);
    return () => window.removeEventListener("keydown", onHistoryShortcut);
  }, [store]);

  useEffect(() => {
    if (!drawerOpen) return;
    const dialog = document.querySelector<HTMLElement>("#planner-details, #planner-shopping-list");
    const focusable = dialog?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    (focusable ?? dialog)?.focus();

  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanel("details", false);
      setShoppingOpen(false);
      (shoppingOpen ? shoppingButtonRef : detailsButtonRef).current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen, setPanel, shoppingOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const compact = window.matchMedia("(max-width: 1023px)");
    const closeSidePanels = (matches: boolean) => {
      if (!matches) return;
      store.getState().setPanel("catalog", false);
      store.getState().setPanel("inspector", false);
    };
    closeSidePanels(compact.matches);
    const onChange = (event: MediaQueryListEvent) => closeSidePanels(event.matches);
    if (typeof compact.addEventListener === "function") compact.addEventListener("change", onChange);
    else compact.addListener(onChange);
    return () => {
      if (typeof compact.removeEventListener === "function") compact.removeEventListener("change", onChange);
      else compact.removeListener(onChange);
    };
  }, [store]);

  const closeDetails = () => {
    state.setPanel("details", false);
    detailsButtonRef.current?.focus();
  };

  const registerAsset = useCallback((asset: PlannerAssetRecord) => {
    const registered = store.getState().dispatch({ type: "registerAsset", asset });
    if (registered.error) return registered.error.message;
    const roomId = store.getState().activeRoomId;
    if (!roomId) return null;
    const polygon = deriveRoomPolygon(store.getState().document, roomId);
    const center = polygon.reduce((result, point) => ({ x: result.x + point.x, z: result.z + point.z }), { x: 0, z: 0 });
    const position = polygon.length ? { x: center.x / polygon.length, z: center.z / polygon.length } : { x: 0, z: 0 };
    const basePlacementId = `asset-placeholder-${asset.assetId}`;
    const existingPlacementIds = new Set(store.getState().document.placements.map((item) => item.id));
    let placementId = basePlacementId;
    let suffix = 2;
    while (existingPlacementIds.has(placementId)) {
      placementId = `${basePlacementId}-${suffix}`;
      suffix += 1;
    }
    const placed = store.getState().dispatch({
      type: "addPlacement",
      placement: {
        id: placementId,
        roomId,
        catalogId: asset.assetId,
        position,
        rotation: 0,
        size: asset.normalizedSize,
        materialVariants: { main: asset.materialId },
        metadata: {
          source: asset.source,
          confidence: asset.confidence,
          notes: ["Editierbarer Platzhalter: freigegebene Storage-URL fehlt."],
        },
      },
    });
    if (placed.error) return `Asset registriert, Platzhalter nicht platziert: ${placed.error.message}`;
    store.getState().select(placementId);
    return null;
  }, [store]);

  return (
    <main className="planner-workspace">
      <PlannerToolbar
        rooms={state.document.rooms}
        activeRoomId={state.activeRoomId}
        viewMode={state.viewMode}
        cameraMode={state.cameraMode}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        catalogOpen={state.panels.catalog}
        inspectorOpen={state.panels.inspector}
        detailsOpen={state.panels.details}
        shoppingOpen={shoppingOpen}
        detailsButtonRef={detailsButtonRef}
        shoppingButtonRef={shoppingButtonRef}
        exportButtonRef={exportButtonRef}
        onRoomChange={state.setActiveRoom}
        onViewChange={state.setViewMode}
        onCameraChange={state.setCameraMode}
        onUndo={state.undo}
        onRedo={state.redo}
        onToggleCatalog={() => state.setPanel("catalog", !state.panels.catalog)}
        onToggleInspector={() => state.setPanel("inspector", !state.panels.inspector)}
        onToggleDetails={() => {
          setShoppingOpen(false);
          state.setPanel("details", !state.panels.details);
        }}
        onToggleShopping={() => {
          state.setPanel("details", false);
          setShoppingOpen((open) => !open);
        }}
        onExport={openExport}
      />

      <div className="planner-workspace__body" data-catalog-open={state.panels.catalog} data-inspector-open={state.panels.inspector}>
        {(state.panels.catalog || state.panels.inspector || state.panels.details || shoppingOpen) ? (
          <button
            type="button"
            className="planner-mobile-backdrop"
            aria-label="Seitenbereich schließen"
            onClick={() => {
              state.setPanel("catalog", false);
              state.setPanel("inspector", false);
              state.setPanel("details", false);
              setShoppingOpen(false);
              (shoppingOpen ? shoppingButtonRef : detailsButtonRef).current?.focus();
            }}
          />
        ) : null}
        {state.panels.catalog ? (
          <CatalogPanel
            document={state.document}
            activeRoomId={state.activeRoomId}
            onAdd={interactions.addCatalogItem}
            onRegisterAsset={registerAsset}
          />
        ) : null}
        <section className="planner-canvas" aria-label={state.viewMode === "2d" ? "2D-Planungsfläche" : "3D-Planungsfläche"}>
          <div className="planner-canvas__meta">
            <span>{state.activeRoomId ? state.document.rooms.find((room) => room.id === state.activeRoomId)?.name : "Gesamtwohnung"}</span>
            <span>{state.viewMode === "2d" ? "Grundriss · Nord oben" : state.cameraMode === "walk" ? "Begehbare Ansicht" : "3D-Übersicht"}</span>
          </div>
          <div className="planner-canvas__stage">
            <div className="planner-canvas__ruler planner-canvas__ruler--top" aria-hidden="true" />
            <div className="planner-canvas__ruler planner-canvas__ruler--left" aria-hidden="true" />
            {state.viewMode === "2d" ? (
              <PlanCanvas
                document={state.document}
                activeRoomId={state.activeRoomId}
                overlays={state.overlays}
                onOverlayChange={state.setOverlay}
                selectionId={state.selectionId}
                onSelect={state.select}
                onMove={interactions.movePlacement}
                onResize={interactions.resizePlacement}
                onRotate={interactions.rotatePlacement}
                onToggleDoor={(openingId) => state.dispatch({ type: "toggleDoor", openingId })}
                onStageChange={setPlanStage}
              />
            ) : (
              <Workspace3DErrorBoundary onReturn2D={() => state.setViewMode("2d")} onReload={() => window.location.reload()}>
                <Suspense fallback={<ThreeLoading />}>
                  <LazyPlanner3D
                    document={state.document}
                    activeRoomId={state.activeRoomId}
                    selectionId={state.selectionId}
                    cameraMode={state.cameraMode}
                    onSelect={state.select}
                    onToggleDoor={(openingId) => state.dispatch({ type: "toggleDoor", openingId })}
                    onReturn2D={() => state.setViewMode("2d")}
                  />
                </Suspense>
              </Workspace3DErrorBoundary>
            )}
          </div>
          {state.lastError ? <p className="planner-canvas__error" role="alert">{state.lastError.message}</p> : null}
          {state.warnings.length ? <p className="planner-canvas__warning">Hinweis: {state.warnings[0].message}</p> : null}
        </section>
        {state.panels.inspector ? (
          <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} select={state.select} />
        ) : null}
      </div>

      {state.panels.details ? <DetailsDrawer document={state.document} onClose={closeDetails} /> : null}
      {shoppingOpen ? <ShoppingListDrawer document={state.document} activeRoomId={state.activeRoomId} dispatch={state.dispatch} onClose={() => { setShoppingOpen(false); shoppingButtonRef.current?.focus(); }} /> : null}
      {repository ? (
        <ExportDialog
          open={exportOpen}
          document={state.document}
          scene={exportScene}
          stage={state.viewMode === "2d" ? planStage : null}
          repository={repository}
          onImport={(preview) => {
            if (!state.importDocument(preview)) state.replaceDocument(preview.document);
          }}
          onClose={closeExport}
        />
      ) : null}
      <PlannerStatus
        document={state.document}
        autosaveStatus={state.autosaveStatus}
        selectionId={state.selectionId}
        warningCount={state.warnings.length}
        hasError={Boolean(state.lastError)}
      />
    </main>
  );
}

function ThreeLoading() {
  return (
    <div className="planner-3d-loading" role="status">
      <span className="planner-3d-loading__mark" aria-hidden="true" />
      <strong>3D-Raum wird vorbereitet</strong>
      <p>Geometrie, Materialien und Licht werden aus derselben Planung abgeleitet.</p>
    </div>
  );
}

export class Workspace3DErrorBoundary extends Component<{
  children: ReactNode;
  onReturn2D(): void;
  onReload(): void;
}, { failed: boolean; moduleLoadFailure: boolean }> {
  state = { failed: false, moduleLoadFailure: false };

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, moduleLoadFailure: isModuleLoadError(error) };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="planner-3d-fallback" role="alert">
          <span className="planner-kicker">{this.state.moduleLoadFailure ? "Ladefehler" : "Sichere Ansicht"}</span>
          <strong>{this.state.moduleLoadFailure ? "3D-Dateien konnten nicht geladen werden" : "3D-Modul konnte nicht geladen werden"}</strong>
          <p>{this.state.moduleLoadFailure
            ? "Bitte lade die Seite neu, um die 3D-Dateien erneut anzufordern. Du kannst auch in 2D weiterarbeiten."
            : "Die Planung bleibt vollständig erhalten."}</p>
          {this.state.moduleLoadFailure ? <button type="button" onClick={this.props.onReload}>Seite neu laden</button> : null}
          <button type="button" onClick={this.props.onReturn2D}>Zu 2D</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function isModuleLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError"
    || /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error.message);
}

function browserRepository() {
  if (typeof window === "undefined") return undefined;
  try {
    return createLocalStoragePlannerRepository(window.localStorage);
  } catch {
    return undefined;
  }
}
