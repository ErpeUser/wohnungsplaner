import type { RefObject } from "react";

import type { PlannerCameraMode, PlannerViewMode } from "../store/planner-store.ts";
import type { PlannerRoom } from "../domain/types.ts";
import { RoomSelector } from "./room-selector.tsx";

type PlannerToolbarProps = {
  rooms: PlannerRoom[];
  activeRoomId: string | null;
  viewMode: PlannerViewMode;
  cameraMode: PlannerCameraMode;
  canUndo: boolean;
  canRedo: boolean;
  catalogOpen: boolean;
  inspectorOpen: boolean;
  detailsOpen: boolean;
  shoppingOpen: boolean;
  detailsButtonRef: RefObject<HTMLButtonElement | null>;
  shoppingButtonRef: RefObject<HTMLButtonElement | null>;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  onRoomChange(roomId: string | null): void;
  onViewChange(mode: PlannerViewMode): void;
  onCameraChange(mode: PlannerCameraMode): void;
  onUndo(): void;
  onRedo(): void;
  onToggleCatalog(): void;
  onToggleInspector(): void;
  onToggleDetails(): void;
  onToggleShopping(): void;
  onExport(): void;
};

export function PlannerToolbar({
  rooms,
  activeRoomId,
  viewMode,
  cameraMode,
  canUndo,
  canRedo,
  catalogOpen,
  inspectorOpen,
  detailsOpen,
  shoppingOpen,
  detailsButtonRef,
  shoppingButtonRef,
  exportButtonRef,
  onRoomChange,
  onViewChange,
  onCameraChange,
  onUndo,
  onRedo,
  onToggleCatalog,
  onToggleInspector,
  onToggleDetails,
  onToggleShopping,
  onExport,
}: PlannerToolbarProps) {
  return (
    <header className="planner-toolbar">
      <div className="planner-brand" aria-label="Raumplaner Wohnung">
        <span className="planner-brand__mark" aria-hidden="true">WP</span>
        <span>
          <small>Wohnungsplanung</small>
          <strong>Raumplaner</strong>
        </span>
      </div>

      <RoomSelector
        rooms={rooms}
        activeRoomId={activeRoomId}
        onChange={onRoomChange}
      />

      <div className="planner-segmented" aria-label="Ansicht">
        <button
          ref={shoppingButtonRef}
          type="button"
          aria-label="2D-Ansicht"
          aria-pressed={viewMode === "2d"}
          onClick={() => onViewChange("2d")}
        >
          2D
        </button>
        <button
          type="button"
          aria-label="3D-Ansicht"
          aria-pressed={viewMode === "3d"}
          onClick={() => onViewChange("3d")}
        >
          3D
        </button>
      </div>

      {viewMode === "3d" ? (
        <div className="planner-segmented planner-segmented--quiet" aria-label="Kamera">
          <button
            type="button"
            aria-pressed={cameraMode === "orbit"}
            onClick={() => onCameraChange("orbit")}
          >
            Übersicht
          </button>
          <button
            type="button"
            aria-pressed={cameraMode === "walk"}
            onClick={() => onCameraChange("walk")}
          >
            Begehen
          </button>
        </div>
      ) : null}

      <div className="planner-toolbar__history" aria-label="Verlauf">
        <button type="button" disabled={!canUndo} onClick={onUndo} aria-label="Rückgängig">
          ↶ <span>Rückgängig</span>
        </button>
        <button type="button" disabled={!canRedo} onClick={onRedo} aria-label="Wiederholen">
          ↷ <span>Wiederholen</span>
        </button>
      </div>

      <div className="planner-toolbar__tools" aria-label="Werkzeuge">
        <button
          type="button"
          aria-expanded={catalogOpen}
          aria-controls="planner-catalog"
          aria-label={catalogOpen ? "Katalog ausblenden" : "Katalog einblenden"}
          onClick={onToggleCatalog}
        >
          Katalog
        </button>
        <button
          type="button"
          aria-expanded={inspectorOpen}
          aria-controls="planner-inspector"
          aria-label={inspectorOpen ? "Eigenschaften ausblenden" : "Eigenschaften einblenden"}
          onClick={onToggleInspector}
        >
          Eigenschaften
        </button>
        <button
          ref={detailsButtonRef}
          type="button"
          aria-expanded={detailsOpen}
          aria-controls="planner-details"
          aria-label="Details öffnen"
          onClick={onToggleDetails}
        >
          Details
        </button>
        <button
          type="button"
          aria-expanded={shoppingOpen}
          aria-controls="planner-shopping-list"
          aria-label="Einkaufsliste öffnen"
          onClick={onToggleShopping}
        >
          Einkaufsliste
        </button>
        <button
          ref={exportButtonRef}
          type="button"
          className="planner-button planner-button--primary"
          aria-haspopup="dialog"
          onClick={onExport}
        >
          Export & Import
        </button>
      </div>
    </header>
  );
}
