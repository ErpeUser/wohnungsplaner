"use client";

import type Konva from "konva";
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { ExportDialog } from "../export/export-dialog.tsx";
import { PlanCanvas } from "../plan-2d/plan-canvas.tsx";
import { createPlanScene } from "../plan-2d/plan-scene.ts";
import { usePlanInteractions } from "../plan-2d/use-plan-interactions.ts";
import { createLocalStoragePlannerRepository, upgradeRetiredDiningGroup } from "../store/persistence.ts";
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
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const [planStage, setPlanStage] = useState<Konva.Stage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const openExport = useCallback(() => setExportOpen(true), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const detailsOpen = state.panels.details;
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
    const upgraded = upgradeRetiredDiningGroup(current);
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
    if (!detailsOpen && !shoppingOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanel("details", false);
      setShoppingOpen(false);
      detailsButtonRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen, setPanel, shoppingOpen]);

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
    compact.addEventListener("change", onChange);
    return () => compact.removeEventListener("change", onChange);
  }, [store]);

  const closeDetails = () => {
    state.setPanel("details", false);
    detailsButtonRef.current?.focus();
  };

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
        {state.panels.catalog ? (
          <CatalogPanel activeRoomId={state.activeRoomId} onAdd={interactions.addCatalogItem} />
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
              <Workspace3DErrorBoundary onReturn2D={() => state.setViewMode("2d")}>
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
          <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} />
        ) : null}
      </div>

      {state.panels.details ? <DetailsDrawer document={state.document} onClose={closeDetails} /> : null}
      {shoppingOpen ? <ShoppingListDrawer onClose={() => setShoppingOpen(false)} /> : null}
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

class Workspace3DErrorBoundary extends Component<{
  children: ReactNode;
  onReturn2D(): void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="planner-3d-fallback" role="alert">
          <span className="planner-kicker">Sichere Ansicht</span>
          <strong>3D-Modul konnte nicht geladen werden</strong>
          <p>Die Planung bleibt vollständig erhalten.</p>
          <button type="button" onClick={this.props.onReturn2D}>Zu 2D</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function browserRepository() {
  if (typeof window === "undefined") return undefined;
  try {
    return createLocalStoragePlannerRepository(window.localStorage);
  } catch {
    return undefined;
  }
}
