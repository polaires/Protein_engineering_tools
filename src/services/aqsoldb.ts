/**
 * AqSolDB - Aqueous Solubility Database Lookup Service
 *
 * Provides fast browser-based lookup of experimental solubility data
 * from the AqSolDB dataset (9,982 unique compounds).
 *
 * Source: https://doi.org/10.1038/s41597-019-0151-1
 * License: MIT
 */

// Data format from the JSON file
interface AqSolDBData {
  version: string;
  source: string;
  description: string;
  format: string[]; // ['name', 'smiles', 'inchikey', 'solubilityGL', 'molWt', 'molLogP']
  count: number;
  compounds: Array<[string, string, string, number, number, number]>;
  indices: {
    byName: Record<string, number>;
    bySmiles: Record<string, number>;
    byInchikey: Record<string, number>;
  };
}

export interface AqSolDBEntry {
  name: string;
  smiles: string;
  inchikey: string;
  solubilityGL: number; // g/L (= mg/mL)
  molecularWeight: number;
  molLogP: number;
}

class AqSolDBService {
  private data: AqSolDBData | null = null;
  private loadPromise: Promise<void> | null = null;
  private loadError: string | null = null;

  /**
   * Load the AqSolDB database
   */
  async load(): Promise<void> {
    if (this.data) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._doLoad();
    return this.loadPromise;
  }

  private async _doLoad(): Promise<void> {
    try {
      console.log('[AqSolDB] Loading database...');
      const response = await fetch('/data/aqsoldb.json');

      if (!response.ok) {
        throw new Error(`Failed to load AqSolDB: ${response.status}`);
      }

      this.data = await response.json();
      console.log(`[AqSolDB] Loaded ${this.data!.count} compounds`);
      this.loadError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AqSolDB] Load failed:', message);
      this.loadError = message;
      throw error;
    }
  }

  /**
   * Check if database is loaded
   */
  isLoaded(): boolean {
    return this.data !== null;
  }

  /**
   * Get load error if any
   */
  getError(): string | null {
    return this.loadError;
  }

  /**
   * Parse a compound array into an entry object
   */
  private parseEntry(compound: [string, string, string, number, number, number]): AqSolDBEntry {
    return {
      name: compound[0],
      smiles: compound[1],
      inchikey: compound[2],
      solubilityGL: compound[3],
      molecularWeight: compound[4],
      molLogP: compound[5],
    };
  }

  /**
   * Lookup compound by normalized name
   */
  lookupByName(name: string): AqSolDBEntry | null {
    if (!this.data) return null;

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = this.data.indices.byName[normalized];

    if (idx === undefined) return null;

    return this.parseEntry(this.data.compounds[idx]);
  }

  /**
   * Lookup compound by SMILES
   */
  lookupBySmiles(smiles: string): AqSolDBEntry | null {
    if (!this.data) return null;

    const idx = this.data.indices.bySmiles[smiles];

    if (idx === undefined) return null;

    return this.parseEntry(this.data.compounds[idx]);
  }

  /**
   * Lookup compound by InChIKey
   */
  lookupByInchikey(inchikey: string): AqSolDBEntry | null {
    if (!this.data) return null;

    const idx = this.data.indices.byInchikey[inchikey];

    if (idx === undefined) return null;

    return this.parseEntry(this.data.compounds[idx]);
  }

  /**
   * Try to find a compound using multiple identifiers
   * Priority: InChIKey > SMILES > Name
   */
  lookup(options: {
    name?: string;
    smiles?: string;
    inchikey?: string;
  }): AqSolDBEntry | null {
    if (!this.data) return null;

    // Try InChIKey first (most specific)
    if (options.inchikey) {
      const result = this.lookupByInchikey(options.inchikey);
      if (result) {
        console.log(`[AqSolDB] Found by InChIKey: ${options.inchikey}`);
        return result;
      }
    }

    // Try SMILES (also specific)
    if (options.smiles) {
      const result = this.lookupBySmiles(options.smiles);
      if (result) {
        console.log(`[AqSolDB] Found by SMILES: ${options.smiles}`);
        return result;
      }
    }

    // Try name (least specific, but useful for common chemicals)
    if (options.name) {
      const result = this.lookupByName(options.name);
      if (result) {
        console.log(`[AqSolDB] Found by name: ${options.name}`);
        return result;
      }
    }

    return null;
  }

  /**
   * Get database statistics
   */
  getStats(): { count: number; source: string } | null {
    if (!this.data) return null;

    return {
      count: this.data.count,
      source: this.data.source,
    };
  }
}

// Export singleton instance
export const aqsoldb = new AqSolDBService();

// Convenience function for one-shot lookup
export async function lookupAqSolDB(options: {
  name?: string;
  smiles?: string;
  inchikey?: string;
}): Promise<AqSolDBEntry | null> {
  await aqsoldb.load();
  return aqsoldb.lookup(options);
}
