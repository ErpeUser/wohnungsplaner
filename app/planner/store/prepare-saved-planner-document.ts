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
  const withRug = upgradeLivingRugMaterial(measured);
  const withHall = upgradeHallPhotoReference(withRug);
  const withChair = upgradeZimmer1Chair(withHall);
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
