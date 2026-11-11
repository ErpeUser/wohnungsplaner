/** Loading a valid user document must never fall back to defaults on quota failure. */
export const INTERIOR_BACKUP_KEY = 'wohnung-interior-refinement-2026-11-11-backup';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export type InteriorLoadResult<T> = {
  document: T;
  warnings: string[];
  legacyBackupJson: string | null;
  unmapped: never[];
};

export function readRefinedInterior<T extends { id: string }>(
  raw: string | null,
  storage: StoragePort,
  parse: (value: unknown) => T,
  prepare: (document: T) => T,
  documentId: string,
): InteriorLoadResult<T> | null {
  if (raw === null) return null;
  let parsed: T;
  try { parsed = parse(JSON.parse(raw)); }
  catch { return null; } // The existing repository handles invalid/legacy formats.
  if (parsed.id !== documentId) return null;
  const unchanged = (warning?: string): InteriorLoadResult<T> => ({
    document: parsed, warnings: warning ? [warning] : [], legacyBackupJson: null, unmapped: [],
  });
  let document: T;
  try { document = prepare(parsed); }
  catch { return unchanged('Die Aktualisierung konnte nicht angewendet werden. Dein gespeicherter Plan bleibt unver\u00e4ndert.'); }
  if (document === parsed) return unchanged();
  try {
    if (storage.getItem(INTERIOR_BACKUP_KEY) === null) storage.setItem(INTERIOR_BACKUP_KEY, raw);
  } catch {
    return unchanged('Die Sicherung konnte nicht gespeichert werden. Dein bisheriger Plan wurde unver\u00e4ndert geladen; die Aktualisierung wurde nicht angewendet.');
  }
  return {
    document,
    warnings: ['Bad, WC und K\u00fcche aktualisiert; pers\u00f6nliche M\u00f6belplatzierungen bleiben erhalten.'],
    legacyBackupJson: raw,
    unmapped: [],
  };
}
