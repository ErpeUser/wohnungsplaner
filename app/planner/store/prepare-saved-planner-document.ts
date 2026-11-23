import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { INTERIOR_UPDATES, refineRoomLayout, upgradeWoltuNightstandPlacement } from "../domain/room-refinement.ts";
import { projectPublicApartmentDocument } from "../domain/public-scene.ts";
import { restoreWcMeasuredLayout } from "../domain/wc-layout.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import {
  upgradeLivingRugMaterial,
  upgradeHallPhotoReference,
  upgradeZimmer1Chair,
  upgradeWcPhotoReference,
} from "./persistence.ts";

/**
 * The browser's saved V3 document takes a different loading route from the
 * legacy repository. Apply the SAME targeted product updates on this route.
 * Each updater is idempotent and keeps individually moved furniture where
 * possible; do not reset the whole plan to the default document.
 */
export function prepareSavedPlannerDocument(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;

  const measured = restoreWcMeasuredLayout(document);
  const withBathroom = refreshLegacyBathroomDetails(measured);
  const withRug = upgradeLivingRugMaterial(withBathroom);
  const withHall = upgradeHallPhotoReference(withRug);
  const withChair = restoreMissingVanityChair(upgradeZimmer1Chair(withHall));
  const withWc = upgradeWcPhotoReference(withChair);
  const updated = upgradeWoltuNightstandPlacement(withWc);

  const existing = new Set(updated.builtIns.map((item) => item.id));
  const missing = DEFAULT_APARTMENT_DOCUMENT.builtIns.filter(
    (item) => INTERIOR_UPDATES[item.id] && !existing.has(item.id),
  );
  const refined = refineRoomLayout(missing.length
    ? { ...updated, builtIns: [...updated.builtIns, ...missing] }
    : updated);
  return projectPublicApartmentDocument(refined);
}

/**
 * Only match the previous stock bath geometry. Never reposition a bathroom
 * element that a person has already adjusted in their own saved layout.
 */
function refreshLegacyBathroomDetails(document: PlannerDocumentV3): PlannerDocumentV3 {
  const canonical = new Map(DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => [item.id, item]));
  let changed = false;
  const builtIns = document.builtIns.map((item) => {
    const original = canonical.get(item.id);
    if (!original) return item;
    const oldApron = item.id === "builtin-bath-tub-apron" && item.size.height === 0.53 && item.elevation === 0.015
      && item.position.x === -1.685 && item.position.z === 9.19;
    const oldEnd = item.id === "builtin-bath-tub-end-ledge" && item.size.height === 0.54 && item.elevation === 0.01
      && item.position.x === -2.06 && item.position.z === 9.99;
    const oldSide = item.id === "builtin-bath-tub-side-apron" && item.size.depth === 0.19
      && item.position.x === -2.06 && item.position.z === 8.295;
    const oldShower = item.id === "builtin-bath-shower-set" && item.position.x === -2.34
      && item.position.z === 9.62 && item.rotation === 90;
    if (!(oldApron || oldEnd || oldSide || oldShower)) return item;
    changed = true;
    return {
      ...item,
      position: { ...original.position },
      size: { ...original.size },
      elevation: original.elevation,
      rotation: original.rotation,
      label: original.label,
    };
  });
  return changed ? { ...document, builtIns } : document;
}

/** Restore a missing stock vanity chair, never replace a deliberate alternative. */
function restoreMissingVanityChair(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.placements.some((item) => item.id === "zimmer1-chair")
    || !document.rooms.some((room) => room.id === "zimmer1")
    || !document.placements.some((item) => item.id === "zimmer1-vanity")) return document;
  const defaultChair = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-chair");
  return defaultChair
    ? { ...document, placements: [...document.placements, structuredClone(defaultChair)] }
    : document;
}
