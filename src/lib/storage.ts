/**
 * Stockage local des analyses (IndexedDB via idb).
 * Rien ne quitte l'appareil ; l'utilisateur peut tout effacer depuis les
 * réglages.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredAnalysis } from '@shared/analysis/types';

interface PayLumoDB extends DBSchema {
  analyses: {
    key: string;
    value: StoredAnalysis;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<PayLumoDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<PayLumoDB>('paylumo', 1, {
      upgrade(database) {
        const store = database.createObjectStore('analyses', { keyPath: 'id' });
        store.createIndex('by-date', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function saveAnalysis(a: StoredAnalysis): Promise<void> {
  try {
    await (await db()).put('analyses', a);
  } catch {
    /* stockage indisponible (mode privé strict) — l'analyse reste en mémoire */
  }
}

export async function getAnalysis(id: string): Promise<StoredAnalysis | undefined> {
  try {
    return await (await db()).get('analyses', id);
  } catch {
    return undefined;
  }
}

export async function listAnalyses(): Promise<StoredAnalysis[]> {
  try {
    const all = await (await db()).getAllFromIndex('analyses', 'by-date');
    return all.reverse();
  } catch {
    return [];
  }
}

export async function deleteAnalysis(id: string): Promise<void> {
  try {
    await (await db()).delete('analyses', id);
  } catch {
    /* ignore */
  }
}

export async function clearAllAnalyses(): Promise<void> {
  try {
    await (await db()).clear('analyses');
  } catch {
    /* ignore */
  }
}
