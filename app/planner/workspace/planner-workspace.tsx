"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";

import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { createLocalStoragePlannerRepository } from "../store/persistence.ts";
import { createPlannerStore, type PlannerStore } from "../store/planner-store.ts";
import { CatalogPanel } from "./catalog-panel.tsx";
import { DetailsDrawer } from "./details-drawer.tsx";
import { InspectorPanel } from "./inspector-panel.tsx";
import { PlannerStatus } from "./planner-status.tsx";
import { PlannerToolbar } from "./planner-toolbar.tsx";
import "./planner-workspace.css";

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
        {state.panels.catalog ? <CatalogPanel /> : null}
        <section className="planner-canvas" aria-label={state.viewMode === "2d" ? "2D-Planungsfläche" : "3D-Planungsfläche"}>
          <div className="planner-canvas__meta">
            <span>{state.activeRoomId ? state.document.rooms.find((room) => room.id === state.activeRoomId)?.name : "Gesamtwohnung"}</span>
            <span>{state.viewMode === "2d" ? "Grundriss · Nord oben" : state.cameraMode === "walk" ? "Begehbare Ansicht" : "3D-Übersicht"}</span>
          </div>
          <div className="planner-canvas__stage">
            <div className="planner-canvas__ruler planner-canvas__ruler--top" aria-hidden="true" />
            <div className="planner-canvas__ruler planner-canvas__ruler--left" aria-hidden="true" />
            <div className="planner-canvas__placeholder">
              <span className="planner-kicker">{state.viewMode === "2d" ? "Planfläche" : "Raummodell"}</span>
              <strong>{state.viewMode === "2d" ? "Maßhaltiger 2D-Plan" : "Realistische 3D-Ansicht"}</strong>
              <p>{state.viewMode === "2d" ? "Wände, Türen und Einbauten werden aus dem V3-Wohnungsmodell gezeichnet." : "Dieselbe Planung wird ohne zweites Datenmodell räumlich dargestellt."}</p>
            </div>
          </div>
          {state.lastError ? <p className="planner-canvas__error" role="alert">{state.lastError.message}</p> : null}
          {state.warnings.length ? <p className="planner-canvas__warning">Hinweis: {state.warnings[0].message}</p> : null}
        </section>
        {state.panels.inspector ? (
          <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} />
        ) : null}
      </div>

      {state.panels.details ? <DetailsDrawer document={state.document} onClose={closeDetails} /> : null}
      <PlannerStatus document={state.document} autosaveStatus={state.autosaveStatus} />
    </main>
  );
}

function browserRepository() {
  if (typeof window === "undefined") return undefined;
  try {
    return createLocalStoragePlannerRepository(window.localStorage);
  } catch {
    return undefined;
  }
}
