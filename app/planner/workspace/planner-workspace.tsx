'use client';
import { useEffect, useState } from 'react';
import { PlannerWorkspace as Workspace } from './planner-workspace-base.tsx';
import { DEFAULT_APARTMENT_DOCUMENT } from '../domain/apartment-v3.ts';
import { parsePlannerDocument } from '../domain/schema.ts';
import { createPlannerStore, type PlannerStore } from '../store/planner-store.ts';
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY, PLANNER_BACKUP_KEY, type PlannerRepository, upgradeLivingSofaRugGroup, upgradeRetiredDiningGroup } from '../store/persistence.ts';
import { readRefinedInterior } from '../store/interior-upgrade.ts';
import { prepareSavedPlannerDocument } from '../store/prepare-saved-planner-document.ts';

function browserRepository(): PlannerRepository | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const storage = window.localStorage;
    const base = createLocalStoragePlannerRepository(storage);
    const readCurrent = (raw: string | null) => readRefinedInterior(raw, storage, parsePlannerDocument, prepareSavedPlannerDocument, DEFAULT_APARTMENT_DOCUMENT.id);
    return {
      ...base,
      load() {
        const current = readCurrent(storage.getItem(PLANNER_STORAGE_KEY));
        if (current) return current;
        const result = base.load();
        return { ...result, document: prepareSavedPlannerDocument(result.document) };
      },
      previewImport(value) {
        const preview = base.previewImport(value);
        return { ...preview, document: prepareSavedPlannerDocument(preview.document) };
      },
      commitImport(preview) {
        return base.commitImport({ ...preview, document: prepareSavedPlannerDocument(preview.document) });
      },
      restoreBackup() {
        const current = readCurrent(storage.getItem(PLANNER_BACKUP_KEY));
        if (current) return current;
        const result = base.restoreBackup();
        return result ? { ...result, document: prepareSavedPlannerDocument(result.document) } : null;
      },
    };
  } catch { return undefined; }
}

export function PlannerWorkspace({ store: providedStore }: { store?: PlannerStore }) {
  const [store] = useState(() => providedStore ?? createPlannerStore({
    initialDocument: prepareSavedPlannerDocument(DEFAULT_APARTMENT_DOCUMENT),
    repository: browserRepository(),
  }));
  useEffect(() => {
    if (providedStore) return;
    try {
      const migration = store.getState().hydrate();
      const current = store.getState().document;
      const upgraded = upgradeLivingSofaRugGroup(upgradeRetiredDiningGroup(current));
      if (upgraded !== current) {
        store.getState().replaceDocument(upgraded);
        store.getState().scheduleSave();
      } else if (migration?.legacyBackupJson && migration.unmapped.length === 0) {
        // The previous layout was backed up before any photo/product upgrade.
        // Persist the successful migration so a later refresh cannot resurrect it.
        store.getState().scheduleSave();
      }
    }
    catch { store.getState().setAutosaveStatus('error'); }
  }, [providedStore, store]);
  return <Workspace store={providedStore ?? store} />;
}
