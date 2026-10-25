"use client";

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { PlanCanvas } from "../plan-2d/plan-canvas.tsx";
import { usePlanInteractions } from "../plan-2d/use-plan-interactions.ts";
import { createLocalStoragePlannerRepository } from "../store/persistence.ts";
import { createPlannerStore, type PlannerStore } from "../store/planner-store.ts";
import { CatalogPanel } from "./catalog-panel.tsx";
import { DetailsDrawer } from "./details-drawer.tsx";
import { InspectorPanel } from "./inspector-panel.tsx";
import { PlannerStatus } from "./planner-status.tsx";
import { PlannerToolbar } from "./planner-toolbar.tsx";
import "./planner-workspace.css";

const LazyPlanner3D = lazy(() => import("../scene-3d/planner-3d.tsx").then((module) => ({
  default: module.Planner3D,
})));

export function PlannerWorkspace({ store: providedStore }: { store?: PlannerStore }) {
  const [internalStore] = useState(() => createPlannerStore({
    initialDocument: DEFAULT_APARTMENT_DOCUMENT,
    repository: browserRepository(),
  }));
  const store = providedStore ?? internalStore;
  const state = useStore(store);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const detailsOpen = state.panels.details;
  const setPanel = state.setPanel;
  const interactions = usePlanInteractions({
    document: state.document,
    activeRoomId: state.activeRoomId,
    selectionId: state.selectionId,
    dispatch: state.dispatch,
    select: state.select,
  });

  useEffect(() => {
    if (providedStore) return;
    try {
      store.getState().hydrate();
    } catch {
      store.getState().setAutosaveStatus("error");
    }
  }, [providedStore, store]);

  useEffect(() => {
    if (!detailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPanel("details", false);
      detailsButtonRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen, setPanel]);

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

  const exportJson = () => {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(state.document, null, 2)], { type: "application/json" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "wohnung.json";
    link.click();
    URL.revokeObjectURL(url);
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
        detailsButtonRef={detailsButtonRef}
        onRoomChange={state.setActiveRoom}
        onViewChange={state.setViewMode}
        onCameraChange={state.setCameraMode}
        onUndo={state.undo}
        onRedo={state.redo}
        onToggleCatalog={() => state.setPanel("catalog", !state.panels.catalog)}
        onToggleInspector={() => state.setPanel("inspector", !state.panels.inspector)}
        onToggleDetails={() => state.setPanel("details", !state.panels.details)}
        onExport={exportJson}
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
