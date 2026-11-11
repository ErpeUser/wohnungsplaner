'use client';
import { useEffect, useState } from 'react';
import { PlannerWorkspace as Workspace } from './planner-workspace-base.tsx';
import { DEFAULT_APARTMENT_DOCUMENT } from '../domain/apartment-v3.ts';
import { INTERIOR_UPDATES, refineRoomLayout } from '../domain/room-refinement.ts';
import { parsePlannerDocument } from '../domain/schema.ts';
import type { PlannerDocumentV3 } from '../domain/types.ts';
import { createPlannerStore, type PlannerStore } from '../store/planner-store.ts';
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY, PLANNER_BACKUP_KEY, type PlannerRepository } from '../store/persistence.ts';
import { readRefinedInterior } from '../store/interior-upgrade.ts';

function prepare(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const existing = new Set(document.builtIns.map(item => item.id));
  const missing = DEFAULT_APARTMENT_DOCUMENT.builtIns.filter(item => INTERIOR_UPDATES[item.id] && !existing.has(item.id));
  return refineRoomLayout(missing.length ? { ...document, builtIns: [...document.builtIns, ...missing] } : document);
}

function browserRepository(): PlannerRepository | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const storage = window.localStorage;
    const base = createLocalStoragePlannerRepository(storage);
    const readCurrent = (raw: string | null) => readRefinedInterior(raw, storage, parsePlannerDocument, prepare, DEFAULT_APARTMENT_DOCUMENT.id);
    return {
      ...base,
      load() {
        const current = readCurrent(storage.getItem(PLANNER_STORAGE_KEY));
        if (current) return current;
        const result = base.load();
        return { ...result, document: prepare(result.document) };
      },
      previewImport(value) {
        const preview = base.previewImport(value);
        return { ...preview, document: prepare(preview.document) };
      },
      commitImport(preview) {
        return base.commitImport({ ...preview, document: prepare(preview.document) });
      },
      restoreBackup() {
        const current = readCurrent(storage.getItem(PLANNER_BACKUP_KEY));
        if (current) return current;
        const result = base.restoreBackup();
        return result ? { ...result, document: prepare(result.document) } : null;
      },
    };
  } catch { return undefined; }
}

export function PlannerWorkspace({ store: providedStore }: { store?: PlannerStore }) {
  const [store] = useState(() => providedStore ?? createPlannerStore({
    initialDocument: prepare(DEFAULT_APARTMENT_DOCUMENT),
    repository: browserRepository(),
  }));
  useEffect(() => {
    if (providedStore) return;
    try { store.getState().hydrate(); }
    catch { store.getState().setAutosaveStatus('error'); }
  }, [providedStore, store]);
  return <Workspace store={providedStore ?? store} />;
}
