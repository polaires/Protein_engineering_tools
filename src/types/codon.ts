/**
 * TypeScript type definitions for Codon Optimization
 * Converted from Rust source
 */

// Codon Data Types
export interface CodonInfo {
  aa: string;
  frequency: number;
  count: number;
}

export interface CodonUsageData {
  organism: string;
  description: string;
  reference: string;
  codons: Record<string, CodonInfo>;
  amino_acid_groups: Record<string, string[]>;
}

export interface RelativeAdaptiveness {
  codon: string;
  aa: string;
  w_i: number;
}

// CAI Types
export interface CAIResult {
  cai: number;
  codon_count: number;
  w_i_values: number[];
  codons: string[];
}

export interface CodonStats {
  total_codons: number;
  gc_content: number;
  mean_w_i: number;
  std_w_i: number;
}

// Restriction Enzyme Types
export interface RestrictionEnzyme {
  recognition_site: string;
  cut_pattern: string;
  overhang: string;
}

export interface RestrictionSite {
  position: number;
  enzyme: string;
  sequence: string;
}

export interface RestrictionData {
  description: string;
  reference: string;
  enzymes: Record<string, RestrictionEnzyme>;
  simplified_sites: string[];
}

// Terminator Types
export interface Terminator {
  position: number;
  stem_start: number;
  stem_end: number;
  poly_u_start: number;
  poly_u_end: number;
  free_energy: number;
  sequence: string;
}

export interface StemLoop {
  stem_start: number;
  stem_end: number;
  free_energy: number;
}

// Optimization Types
export interface OptimizationResult {
  original_sequence: string;
  optimized_sequence: string;
  protein_sequence: string;
  original_cai: number;
  optimized_cai: number;
  changes: CodonChange[];
}

export interface CodonChange {
  position: number;
  original: string;
  optimized: string;
  amino_acid: string;
  reason?: string;
}

// Full Optimization Request/Response
export interface OptimizationRequest {
  sequence: string;
  remove_restriction_sites: boolean;
  remove_terminators: boolean;
  selected_enzymes?: string[];
  optimize_ends?: boolean;
  end_length?: number;
}

export interface OptimizationResponse {
  original_sequence: string;
  optimized_sequence: string;
  final_sequence: string;
  protein_sequence: string;
  original_cai: number;
  optimized_cai: number;
  final_cai: number;
  restriction_sites_found: number;
  restriction_sites_removed: number;
  terminators_found: number;
  terminators_removed: number;
  changes: CodonChange[];
  w_i_values_original: number[];
  w_i_values_optimized: number[];
  w_i_values_final: number[];
  codons_original: string[];
  codons_optimized: string[];
  codons_final: string[];
  gc_content_original: number;
  gc_content_final: number;
}

export interface CAIAnalysisResult {
  cai: number;
  codon_count: number;
  w_i_values: number[];
  codons: string[];
  gc_content: number;
  mean_w_i: number;
  std_w_i: number;
}

// Saved Session Types
export interface SavedSession {
  id: string;
  name: string;
  timestamp: number;
  result: OptimizationResponse;
}
