import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { PlannerPlacement } from "../domain/types.ts";

export const DINING_CHAIR_IDS = [
  "living-kaleo-chair-west",
  "living-kaleo-chair-east",
  "living-kaleo-chair-south",
  "living-kaleo-chair-north",
] as const;

export function placementLabel(placement: Pick<PlannerPlacement, "id" | "catalogId">) {
  const name = getFurnitureCatalogItem(placement.catalogId)?.name ?? placement.catalogId;
  const seat = DINING_CHAIR_IDS.findIndex((id) => id === placement.id);
  return seat === -1 ? name : `Stuhl ${seat + 1} · ${name}`;
}
