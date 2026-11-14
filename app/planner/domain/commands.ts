import { inspectPlacement, type CollisionHit } from "./collisions.ts";
import { getTableModelForCatalogId, metresFromCentimetres } from "../tables/table-models.ts";
import { isKnownMaterialId } from "./material-registry.ts";
import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { chairSeatLayout, getChairModel, metresFromCentimetres as chairMetresFromCentimetres } from "../chairs/chair-models.ts";
import type {
  PlannerAssetRecord,
  PlannerDocumentV3,
  PlannerPlacement,
  Point2,
  Size3,
} from "./types.ts";

export type PlannerCommand =
  | { type: "registerAsset"; asset: PlannerAssetRecord }
  | { type: "removeAsset"; assetId: string }
  | { type: "addPlacement"; placement: PlannerPlacement }
  | { type: "movePlacement"; placementId: string; position: Point2 }
  | { type: "resizePlacement"; placementId: string; size: Size3 }
  | {
      type: "setPlacementProduct";
      placementId: string;
      catalogId: string;
      size: Size3;
      materialId?: string;
      metadata?: PlannerPlacement["metadata"];
    }
  | { type: "setDiningChairModel"; modelId: string }
  | { type: "setPlacementChairModel"; placementId: string; modelId: string }
  | { type: "rotatePlacement"; placementId: string; rotation: number }
  | { type: "setPlacementMaterial"; placementId: string; slot: string; materialId: string }
  | { type: "removePlacement"; placementId: string }
  | { type: "transferPlacement"; placementId: string; roomId: string; position: Point2 }
  | { type: "toggleDoor"; openingId: string; state?: "open" | "closed" }
  | {
      type: "setSurfaceMaterial";
      roomId: string;
      surface: "floor" | "walls" | "ceiling";
      materialId: string;
    };

export type CommandError = {
  code: "collision" | "duplicate-id" | "invalid" | "locked" | "not-found";
  message: string;
  collisions?: CollisionHit[];
};

export type CommandResult = {
  document: PlannerDocumentV3;
  warnings: CollisionHit[];
  error?: CommandError;
};

export function applyPlannerCommand(
  document: PlannerDocumentV3,
  command: PlannerCommand,
): CommandResult {
  switch (command.type) {
    case "registerAsset": {
      if ((document.assets ?? []).some((asset) => asset.assetId === command.asset.assetId)) {
        return reject(document, "duplicate-id", `Das Asset ${command.asset.assetId} ist bereits registriert.`);
      }
      if (!validAsset(command.asset)) {
        return reject(document, "invalid", "Das Asset enthält ungültige Hash-, Größen- oder Maßdaten.");
      }
      return accept({ ...document, updatedAt: timestamp(), assets: [...(document.assets ?? []), command.asset] });
    }

    case "removeAsset": {
      if (!(document.assets ?? []).some((asset) => asset.assetId === command.assetId)) {
        return reject(document, "not-found", `Das Asset ${command.assetId} wurde nicht gefunden.`);
      }
      if (document.placements.some((placement) => placement.catalogId === command.assetId)) {
        return reject(document, "invalid", "Das Asset wird noch von einer Platzierung verwendet.");
      }
      return accept({
        ...document,
        updatedAt: timestamp(),
        assets: (document.assets ?? []).filter((asset) => asset.assetId !== command.assetId),
      });
    }

    case "addPlacement": {
      if (hasEntityId(document, command.placement.id)) {
        return reject(document, "duplicate-id", `Die ID ${command.placement.id} ist bereits vergeben.`);
      }
      if (!validPlacement(command.placement)) {
        return reject(document, "invalid", "Das neue Objekt enthält ungültige Maße oder Koordinaten.");
      }
      if (!document.rooms.some((room) => room.id === command.placement.roomId)) {
        return reject(document, "not-found", `Der Raum ${command.placement.roomId} wurde nicht gefunden.`);
      }
      if (command.placement.wallId && !document.walls.some((wall) => wall.id === command.placement.wallId)) {
        return reject(document, "not-found", `Die Wand ${command.placement.wallId} wurde nicht gefunden.`);
      }
      return validatePlacement(document, command.placement, (placement) => ({
        ...document,
        updatedAt: timestamp(),
        placements: [...document.placements, placement],
      }));
    }

    case "movePlacement":
      return movePlacement(document, command.placementId, command.position);

    case "resizePlacement":
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        size: { ...command.size },
      }));

    case "setPlacementProduct": {
      if (document.builtIns.some((item) => item.id === command.placementId)) {
        return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
      }
      const selected = document.placements.find((item) => item.id === command.placementId);
      if (!selected) return reject(document, "not-found", `Das Objekt ${command.placementId} wurde nicht gefunden.`);
      if (selected.id !== "living-bozan-table") {
        return reject(document, "invalid", "Der Tischvergleich kann nur den vorhandenen Esstisch ersetzen.");
      }
      const catalogItem = getFurnitureCatalogItem(command.catalogId);
      if (!catalogItem) return reject(document, "invalid", `Das Produkt ${command.catalogId} ist im Katalog nicht vorhanden.`);
      const tableModel = getTableModelForCatalogId(command.catalogId);
      if (!tableModel || catalogItem.symbol !== "table") {
        return reject(document, "invalid", "Das Produkt ist kein belegtes Tischvergleichsmodell.");
      }
      const selectedVariant = tableModel.variants.find((variant) => sameSize(command.size, metresFromCentimetres(variant.sizeCm)));
      if (!selectedVariant) {
        return reject(document, "invalid", "Die Tischmaße entsprechen keinem belegten Ausziehzustand dieses Modells.");
      }
      if (!validPlacement({ ...selected, catalogId: command.catalogId, size: command.size })) {
        return reject(document, "invalid", "Das Produkt enthält ungültige Maße oder Koordinaten.");
      }
      const materialId = command.materialId ?? catalogItem.materials[0]?.id;
      if (!materialId || !isKnownMaterialId(document, materialId) || !catalogItem.materials.some((material) => material.id === materialId)) {
        return reject(document, "invalid", `Das Material ${materialId ?? "(leer)"} gehört nicht zum Produkt ${command.catalogId}.`);
      }
      const candidate: PlannerPlacement = {
        ...selected,
        catalogId: command.catalogId,
        size: { ...command.size },
        materialVariants: { ...selected.materialVariants, main: materialId },
        metadata: {
          ...selected.metadata,
          ...command.metadata,
          source: tableModel.sourceLabel,
          confidence: selectedVariant.confidence === "unknown" ? "estimated" : selectedVariant.confidence,
          notes: [...new Set([
            ...(selected.metadata?.notes ?? []),
            ...tableModel.sourceNotes,
            ...selectedVariant.notes,
            `Vergleichsmodell ${tableModel.id} · Zustand ${selectedVariant.id}.`,
            ...(command.metadata?.notes ?? []).filter((note) => !note.startsWith("Vergleichsmodell ")),
          ])],
        },
      };
      const ignorePlacementIds = selected.groupId
        ? new Set(document.placements.filter((item) => item.groupId === selected.groupId && item.id !== selected.id).map((item) => item.id))
        : undefined;
      return validatePlacement(document, candidate, (placement) => ({
        ...document,
        updatedAt: timestamp(),
        placements: document.placements.map((item) => item.id === placement.id ? placement : item),
      }), ignorePlacementIds);
    }

    case "setPlacementChairModel": {
      if (document.builtIns.some((item) => item.id === command.placementId)) {
        return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
      }
      const selected = document.placements.find((item) => item.id === command.placementId);
      if (!selected) return reject(document, "not-found", `Das Objekt ${command.placementId} wurde nicht gefunden.`);
      if (!isDiningChairPlacement(selected) || getFurnitureCatalogItem(selected.catalogId)?.symbol !== "chair") {
        return reject(document, "invalid", "Der Stuhlvergleich kann nur einen vorhandenen Esszimmerstuhl ersetzen.");
      }
      const model = getChairModel(command.modelId);
      if (!model) return reject(document, "invalid", `Das Stuhlmodell ${command.modelId} ist nicht im Vergleichskatalog vorhanden.`);
      const catalogItem = getFurnitureCatalogItem(model.catalogId);
      if (!catalogItem || catalogItem.symbol !== "chair") {
        return reject(document, "invalid", `Das Produkt ${model.catalogId} ist kein registriertes Stuhlmodell.`);
      }
      if (!isKnownMaterialId(document, model.materialId) || !catalogItem.materials.some((material) => material.id === model.materialId)) {
        return reject(document, "invalid", `Das Material ${model.materialId} gehört nicht zum Produkt ${model.catalogId}.`);
      }
      return updatePlacement(document, selected.id, (placement) => ({
        ...placement,
        catalogId: model.catalogId,
        size: chairMetresFromCentimetres(model.sizeCm),
        materialVariants: { ...placement.materialVariants, main: model.materialId },
        metadata: {
          ...placement.metadata,
          source: model.sourceLabel,
          confidence: model.confidence,
          notes: [...new Set([
            ...(placement.metadata?.notes ?? []),
            ...model.sourceNotes,
            `Stuhlvergleich ${model.id} · ${model.sizeCm.width} × ${model.sizeCm.depth} × ${model.sizeCm.height} cm.`,
          ])],
        },
      }));
    }

    case "setDiningChairModel": {
      const model = getChairModel(command.modelId);
      if (!model) return reject(document, "invalid", `Das Stuhlmodell ${command.modelId} ist nicht im Vergleichskatalog vorhanden.`);
      const table = document.placements.find((item) => item.id === "living-bozan-table");
      if (!table) return reject(document, "not-found", "Der Esstisch für die vierteilige Stuhlgruppe wurde nicht gefunden.");
      const chairIds = new Set([
        "living-kaleo-chair-west",
        "living-kaleo-chair-east",
        "living-kaleo-chair-south",
        "living-kaleo-chair-north",
      ]);
      const chairs = document.placements.filter((item) => chairIds.has(item.id));
      if (chairs.length !== chairIds.size) {
        return reject(document, "invalid", "Die vier Sitzplätze der Essgruppe sind nicht vollständig vorhanden.");
      }
      const catalogItem = getFurnitureCatalogItem(model.catalogId);
      if (!catalogItem) return reject(document, "invalid", `Das Produkt ${model.catalogId} ist im Katalog nicht vorhanden.`);
      const size = chairMetresFromCentimetres(model.sizeCm);
      const layout = chairSeatLayout(table, model);
      const layoutById = new Map(layout.map((seat) => [seat.id, seat]));
      const candidates = chairs.map((chair) => {
        const seat = layoutById.get(chair.id)!;
        return {
          ...chair,
          catalogId: model.catalogId,
          size: { ...size },
          position: { ...seat.position },
          rotation: seat.rotation,
          materialVariants: { ...chair.materialVariants, main: model.materialId },
          metadata: {
            source: model.sourceLabel,
            confidence: model.confidence,
            notes: [
              ...model.sourceNotes,
              `Stuhlvergleich ${model.id} · ${model.sizeCm.width} × ${model.sizeCm.depth} × ${model.sizeCm.height} cm.`,
              `Vier Plätze automatisch am Tisch ausgerichtet; Basis ${model.baseStyle}${model.swivel ? ", 360° drehbar" : ""}.`,
            ],
          },
        } satisfies PlannerPlacement;
      });
      if (candidates.some((candidate) => !validPlacement(candidate))) {
        return reject(document, "invalid", "Das gewählte Stuhlmodell enthält ungültige Maße oder Koordinaten.");
      }
      const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
      const projectedDocument = {
        ...document,
        placements: document.placements.map((item) => candidateById.get(item.id) ?? item),
      };
      // The table is the only intentional overlap target. Other chairs must
      // still be checked against the projected four-chair layout.
      const ignorePlacementIds = new Set([table.id]);
      const reports = candidates.map((candidate) => inspectPlacement(projectedDocument, candidate, { ignorePlacementIds }));
      const hard = reports.flatMap((report) => report.hard);
      const warnings = reports.flatMap((report) => report.warnings);
      if (hard.length > 0) {
        return {
          document,
          warnings,
          error: {
            code: "collision",
            message: hard[0].message,
            collisions: hard,
          },
        };
      }
      return accept({
        ...document,
        updatedAt: timestamp(),
        placements: document.placements.map((item) => candidateById.get(item.id) ?? item),
      }, warnings);
    }

    case "rotatePlacement":
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        rotation: normalizeRotation(command.rotation),
      }));

    case "setPlacementMaterial":
      if (!command.slot.trim() || !command.materialId.trim()) {
        return reject(document, "invalid", "Material-Slot und Material dürfen nicht leer sein.");
      }
      if (!isKnownMaterialId(document, command.materialId)) {
        return reject(document, "invalid", `Das Material ${command.materialId} ist im Katalog nicht vorhanden.`);
      }
      if (document.builtIns.some((item) => item.id === command.placementId)) {
        return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
      }
      if (!document.placements.some((item) => item.id === command.placementId)) {
        return reject(document, "not-found", `Das Objekt ${command.placementId} wurde nicht gefunden.`);
      }
      return accept({
        ...document,
        updatedAt: timestamp(),
        placements: document.placements.map((placement) => placement.id === command.placementId
          ? {
              ...placement,
              materialVariants: { ...placement.materialVariants, [command.slot]: command.materialId },
            }
          : placement),
      });

    case "transferPlacement":
      if (!document.rooms.some((room) => room.id === command.roomId)) {
        return reject(document, "not-found", `Der Zielraum ${command.roomId} wurde nicht gefunden.`);
      }
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        roomId: command.roomId,
        position: { ...command.position },
        wallId: undefined,
      }));

    case "removePlacement": {
      if (document.builtIns.some((item) => item.id === command.placementId)) {
        return reject(document, "locked", "Fest eingebaute Elemente können nicht entfernt werden.");
      }
      if (!document.placements.some((item) => item.id === command.placementId)) {
        return reject(document, "not-found", `Das Objekt ${command.placementId} wurde nicht gefunden.`);
      }
      return accept({
        ...document,
        updatedAt: timestamp(),
        placements: document.placements.filter((item) => item.id !== command.placementId),
      });
    }

    case "toggleDoor": {
      const opening = document.openings.find((item) => item.id === command.openingId);
      if (!opening || opening.kind !== "door") {
        return reject(document, "not-found", `Die Tür ${command.openingId} wurde nicht gefunden.`);
      }
      const current = document.doorStates[opening.id] ?? "closed";
      const state = command.state ?? (current === "open" ? "closed" : "open");
      return accept({
        ...document,
        updatedAt: timestamp(),
        doorStates: { ...document.doorStates, [opening.id]: state },
      });
    }

    case "setSurfaceMaterial": {
      const roomIndex = document.rooms.findIndex((room) => room.id === command.roomId);
      if (roomIndex < 0) {
        return reject(document, "not-found", `Der Raum ${command.roomId} wurde nicht gefunden.`);
      }
      if (!command.materialId.trim()) {
        return reject(document, "invalid", "Eine Material-ID darf nicht leer sein.");
      }
      if (!isKnownMaterialId(document, command.materialId)) {
        return reject(document, "invalid", `Das Material ${command.materialId} ist im Katalog nicht vorhanden.`);
      }
      const rooms = document.rooms.map((room, index) => index === roomIndex
        ? { ...room, surfaces: { ...room.surfaces, [command.surface]: command.materialId } }
        : room);
      return accept({ ...document, updatedAt: timestamp(), rooms });
    }
  }
}

function sameSize(left: PlannerPlacement["size"], right: PlannerPlacement["size"]) {
  return Math.abs(left.width - right.width) < 0.0001
    && Math.abs(left.depth - right.depth) < 0.0001
    && Math.abs(left.height - right.height) < 0.0001;
}

function movePlacement(
  document: PlannerDocumentV3,
  placementId: string,
  position: Point2,
): CommandResult {
  if (document.builtIns.some((item) => item.id === placementId)) {
    return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
  }
  const selected = document.placements.find((item) => item.id === placementId);
  if (!selected) return reject(document, "not-found", `Das Objekt ${placementId} wurde nicht gefunden.`);
  if (isDiningChairPlacement(selected)) {
    const candidate = { ...selected, position: { ...position } };
    const ignorePlacementIds = new Set(["living-bozan-table"]);
    return validatePlacement(document, candidate, (placement) => ({
      ...document,
      updatedAt: timestamp(),
      placements: document.placements.map((item) => item.id === placement.id ? placement : item),
    }), ignorePlacementIds);
  }
  if (!selected.groupId) {
    return updatePlacement(document, placementId, (placement) => ({
      ...placement,
      position: { ...position },
    }));
  }

  const delta = {
    x: position.x - selected.position.x,
    z: position.z - selected.position.z,
  };
  const members = document.placements.filter((item) => item.groupId === selected.groupId);
  const memberIds = new Set(members.map((item) => item.id));
  const candidates = members.map((item) => ({
    ...item,
    position: {
      x: Number((item.position.x + delta.x).toFixed(6)),
      z: Number((item.position.z + delta.z).toFixed(6)),
    },
  }));
  if (candidates.some((candidate) => !validPlacement(candidate))) {
    return reject(document, "invalid", "Die Möbelgruppe enthält ungültige Maße oder Koordinaten.");
  }

  const reports = candidates.map((candidate) => inspectPlacement(document, candidate, {
    ignorePlacementIds: memberIds,
  }));
  const hard = reports.flatMap((report) => report.hard);
  const warnings = reports.flatMap((report) => report.warnings);
  if (hard.length > 0) {
    return {
      document,
      warnings,
      error: {
        code: "collision",
        message: hard[0].message,
        collisions: hard,
      },
    };
  }

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  return accept({
    ...document,
    updatedAt: timestamp(),
    placements: document.placements.map((item) => candidateById.get(item.id) ?? item),
  }, warnings);
}

function isDiningChairPlacement(placement: PlannerPlacement) {
  return /^living-kaleo-chair-(west|east|south|north)$/.test(placement.id);
}

function updatePlacement(
  document: PlannerDocumentV3,
  placementId: string,
  change: (placement: PlannerPlacement) => PlannerPlacement,
): CommandResult {
  if (document.builtIns.some((item) => item.id === placementId)) {
    return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
  }
  const index = document.placements.findIndex((item) => item.id === placementId);
  if (index < 0) return reject(document, "not-found", `Das Objekt ${placementId} wurde nicht gefunden.`);

  const candidate = change(document.placements[index]);
  if (!validPlacement(candidate)) {
    return reject(document, "invalid", "Das Objekt enthält ungültige Maße oder Koordinaten.");
  }
  return validatePlacement(document, candidate, (placement) => ({
    ...document,
    updatedAt: timestamp(),
    placements: document.placements.map((item, placementIndex) => placementIndex === index ? placement : item),
  }), isDiningChairPlacement(candidate) ? new Set(["living-bozan-table"]) : undefined);
}

function validatePlacement(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  update: (placement: PlannerPlacement) => PlannerDocumentV3,
  ignorePlacementIds?: ReadonlySet<string>,
): CommandResult {
  const report = inspectPlacement(document, placement, { ignorePlacementIds });
  if (report.hard.length > 0) {
    return {
      document,
      warnings: report.warnings,
      error: {
        code: "collision",
        message: report.hard[0].message,
        collisions: report.hard,
      },
    };
  }
  return accept(update(placement), report.warnings);
}

function accept(document: PlannerDocumentV3, warnings: CollisionHit[] = []): CommandResult {
  return { document, warnings };
}

function reject(
  document: PlannerDocumentV3,
  code: CommandError["code"],
  message: string,
): CommandResult {
  return { document, warnings: [], error: { code, message } };
}

function hasEntityId(document: PlannerDocumentV3, id: string) {
  return [
    { id: document.id },
    ...document.walls,
    ...document.rooms,
    ...document.openings,
    ...document.builtIns,
    ...document.fixtures,
    ...document.placements,
  ].some((entity) => entity.id === id);
}

function validPlacement(placement: PlannerPlacement) {
  return [
    placement.position.x,
    placement.position.z,
    placement.rotation,
    placement.size.width,
    placement.size.depth,
    placement.size.height,
  ].every(Number.isFinite)
    && placement.size.width > 0
    && placement.size.depth > 0
    && placement.size.height > 0;
}

function validAsset(asset: PlannerAssetRecord) {
  return asset.assetId.trim().length > 0
    && /^[a-f0-9]{64}$/i.test(asset.sha256)
    && asset.byteLength > 0
    && asset.byteLength <= 5 * 1024 * 1024
    && Object.values(asset.normalizedSize).every((value) => Number.isFinite(value) && value > 0)
    && Number.isFinite(asset.meterScale ?? 1)
    && (asset.meterScale ?? 1) > 0
    && Number.isFinite(asset.floorOffset);
}

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function timestamp() {
  return new Date().toISOString();
}
