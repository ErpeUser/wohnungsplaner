/**
 * Version of the apartment model and catalog defaults, independent from the
 * persisted document schema. The V3 shape has stayed compatible while the
 * furniture and room-detail defaults evolved several times.
 */
export const CURRENT_MODEL_REVISION = 6;

export const MODEL_REVISION_HISTORY = {
  0: "V3-Dokument ohne Modellrevision (vor dem AliExpress-Sofa)",
  1: "AliExpress-Relaxsofa und erster Wohnungsmodell-Visualstand",
  2: "Temu-Vintage-Teppich und Materialnormalisierung",
  3: "Bozan-Tischvergleich und aktuelle Essgruppe",
  4: "Kaleo-/Amber-Stuhlmaße und Gruppenmodell",
  5: "Bad/WC-, Vorraum- und Zimmer-1-Detailstand",
  6: "Aktueller maßhaltiger Modell- und Materialstand",
} as const;

export function isKnownModelRevision(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= CURRENT_MODEL_REVISION;
}
