/**
 * Type definitions for comprehensive solubility database
 */

// Temperature-specific solubility measurement
export interface TemperatureDataPoint {
  temperature: number;          // °C
  massPct?: number;             // Mass percentage
  molarity?: number;            // Molarity (M)
  logS?: number;                // log(solubility)
  gPer100mL?: number;           // g/100mL water
}

// Quality levels based on measurement count
export type DataQuality = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

// Data sources
export type DataSource = 'CRC' | 'Wikipedia' | 'Curated Database' | 'PubChem';

// Inorganic compound with temperature-dependent solubility
export interface InorganicCompound {
  formula: string;
  anion: string | null;
  molecularWeight: number | null;
  substanceName: string | null;
  smiles: string | null;  // SMILES notation for organic compounds
  dataQuality: DataQuality;  // Quality level (G1-G5)
  sd: number | null;  // Standard deviation
  measurements: number;  // Number of measurements
  temperatureData: Record<string, TemperatureDataPoint>;  // Key: temperature as string
  source: DataSource;  // Primary data source
}

// Element solubility data
export interface ElementSolubilityData {
  element: string;
  compounds: Record<string, InorganicCompound>;  // Key: compound formula
}

// Complete database structure
export interface SolubilityDatabase {
  [element: string]: ElementSolubilityData;
}

// Database statistics
export interface SolubilityStats {
  totalElements: number;
  totalCompounds: number;
  totalEntries: number;
  elements: string[];
  anions: string[];
  sources: string[];
  qualities: string[];
  temperatureRange: [number, number];
  hasOrganic: boolean;
  organicCount: number;
  lastUpdated: string;
}

// UI state types
export type VisualizationMode = 'metals' | 'organic' | 'all';

export interface TemperatureControlState {
  mode: 'specific' | 'range' | 'animation';
  value: number;          // For specific temperature
  range?: [number, number];
  animationSpeed?: number;
}

export interface SolubilityFilters {
  quality?: DataQuality[];
  sources?: DataSource[];
  temperatureAvailable?: boolean;
  minCompounds?: number;
}

// Element tile enhancement
export interface ElementTileData {
  symbol: string;
  atomicNumber: number;
  compoundCount: number;
  hasTemperatureData: boolean;
  qualityScore: DataQuality;
  avgSolubility?: number;
  sources: DataSource[];
}
