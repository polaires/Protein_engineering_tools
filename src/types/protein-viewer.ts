/**
 * Type definitions for Protein Viewer (Mol* integration)
 */

export interface ProteinStructure {
  id: string;
  name: string;
  source: 'pdb' | 'file' | 'alphafold';
  pdbId?: string;
  data?: string;
  uploadDate: Date;
  fileSize?: number;
  chain?: string;
}

export interface ViewerState {
  structureId: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  };
  representation: string;
  colorScheme: string;
  timestamp: Date;
}

export interface ColorScheme {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface RepresentationStyle {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'dihedral';
  atoms: string[];
  value: number;
  unit: string;
  label: string;
}

export interface ProteinInfo {
  title?: string;
  experimentalMethod?: string;
  resolution?: number;
  organism?: string;
  depositionDate?: string;
  authors?: string[];
  chains?: string[];
  residueCount?: number;
  atomCount?: number;
}

export interface AlphaFoldPrediction {
  uniprotId: string;
  organism: string;
  gene?: string;
  confidence?: 'very high' | 'high' | 'low' | 'very low';
}

export interface StructureAlignment {
  structure1: string;
  structure2: string;
  rmsd: number;
  alignedResidues: number;
  totalResidues: number;
  chain1?: string;
  chain2?: string;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdb' | 'cif' | 'state';
  width?: number;
  height?: number;
  transparent?: boolean;
  quality?: number;
}

export interface SearchResult {
  pdbId: string;
  title: string;
  experimentalMethod: string;
  resolution?: number;
  depositionDate: string;
  organism?: string;
}
