/**
 * Service for protein viewer database operations (IndexedDB)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProteinStructure, ViewerState } from '@/types/protein-viewer';

interface ProteinViewerDB extends DBSchema {
  structures: {
    key: string;
    value: ProteinStructure;
    indexes: { 'by-source': string; 'by-date': Date };
  };
  states: {
    key: string;
    value: ViewerState;
    indexes: { 'by-structure': string; 'by-date': Date };
  };
}

let db: IDBPDatabase<ProteinViewerDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<ProteinViewerDB>('protein-viewer-db', 1, {
      upgrade(database) {
        // Structures store
        if (!database.objectStoreNames.contains('structures')) {
          const structureStore = database.createObjectStore('structures', {
            keyPath: 'id',
          });
          structureStore.createIndex('by-source', 'source');
          structureStore.createIndex('by-date', 'uploadDate');
        }

        // Viewer states store
        if (!database.objectStoreNames.contains('states')) {
          const stateStore = database.createObjectStore('states', {
            keyPath: 'structureId',
          });
          stateStore.createIndex('by-structure', 'structureId');
          stateStore.createIndex('by-date', 'timestamp');
        }
      },
    });
  }
  return db;
}

// Structure operations
export async function saveStructure(structure: ProteinStructure): Promise<void> {
  const database = await getDB();
  await database.put('structures', structure);
}

export async function getStructure(id: string): Promise<ProteinStructure | undefined> {
  const database = await getDB();
  return database.get('structures', id);
}

export async function getAllStructures(): Promise<ProteinStructure[]> {
  const database = await getDB();
  return database.getAll('structures');
}

export async function deleteStructure(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('structures', id);
  // Also delete associated state
  await database.delete('states', id);
}

export async function getStructuresBySource(source: 'pdb' | 'file' | 'alphafold'): Promise<ProteinStructure[]> {
  const database = await getDB();
  return database.getAllFromIndex('structures', 'by-source', source);
}

// State operations
export async function saveViewerState(state: ViewerState): Promise<void> {
  const database = await getDB();
  await database.put('states', state);
}

export async function getViewerState(structureId: string): Promise<ViewerState | undefined> {
  const database = await getDB();
  return database.get('states', structureId);
}

export async function getAllStates(): Promise<ViewerState[]> {
  const database = await getDB();
  return database.getAll('states');
}

export async function deleteViewerState(structureId: string): Promise<void> {
  const database = await getDB();
  await database.delete('states', structureId);
}

// Utility functions
export function generateStructureId(): string {
  return `structure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function getStructureStats() {
  const database = await getDB();
  const structures = await database.getAll('structures');

  const stats = {
    total: structures.length,
    bySource: {
      pdb: structures.filter(s => s.source === 'pdb').length,
      file: structures.filter(s => s.source === 'file').length,
      alphafold: structures.filter(s => s.source === 'alphafold').length,
    },
    totalSize: structures.reduce((sum, s) => sum + (s.fileSize || 0), 0),
  };

  return stats;
}

// Export/Import functions
export async function exportAllData() {
  const database = await getDB();
  const structures = await database.getAll('structures');
  const states = await database.getAll('states');

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    structures,
    states,
  };
}

export async function importData(data: any): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const database = await getDB();

  try {
    // Import structures
    if (data.structures && Array.isArray(data.structures)) {
      for (const structure of data.structures) {
        try {
          await database.put('structures', structure);
        } catch (err) {
          errors.push(`Failed to import structure ${structure.id}: ${err}`);
        }
      }
    }

    // Import states
    if (data.states && Array.isArray(data.states)) {
      for (const state of data.states) {
        try {
          await database.put('states', state);
        } catch (err) {
          errors.push(`Failed to import state ${state.structureId}: ${err}`);
        }
      }
    }

    return { success: errors.length === 0, errors };
  } catch (err) {
    return { success: false, errors: [`Import failed: ${err}`] };
  }
}
