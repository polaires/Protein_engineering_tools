/**
 * Optimization Service
 * Main service for codon optimization
 * Converted from Rust (lib.rs)
 */

import {
  OptimizationRequest,
  OptimizationResponse,
  CodonChange,
  CAIAnalysisResult,
  RestrictionSite,
  Terminator,
} from '../types/codon';
import { loadCodonUsageData, translateSequence } from '../data/codonData';
import { optimizeSequence, optimizeTerminalRegions } from './codonOptimizer';
import {
  loadRestrictionData,
  findRestrictionSites,
  findRestrictionSitesFiltered,
  removeRestrictionSites,
} from './restrictionSites';
import { detectTerminators, removeTerminators } from './terminatorDetector';
import { calculateCAI, calculateCodonStats } from './caiCalculator';

/**
 * Optimize a codon sequence with all requested features
 *
 * @param request - Optimization request
 * @returns Optimization response with results
 */
export function optimizeCodonSequence(request: OptimizationRequest): OptimizationResponse {
  // Load data
  const codonUsage = loadCodonUsageData();
  const restrictionData = loadRestrictionData();

  // Step 1: Initial optimization
  const optimizationResult = optimizeSequence(request.sequence, codonUsage);

  let finalSequence = optimizationResult.optimized_sequence;
  const protein = optimizationResult.protein_sequence;

  // Track statistics
  let restrictionSitesRemoved = 0;
  let terminatorsRemoved = 0;

  // Calculate initial restriction sites (use selected enzymes if provided)
  const selectedEnzymesArray = request.selected_enzymes || null;
  const initialRestrictionSites = selectedEnzymesArray
    ? findRestrictionSitesFiltered(finalSequence, restrictionData, selectedEnzymesArray)
    : findRestrictionSites(finalSequence, restrictionData);
  const restrictionSitesFound = initialRestrictionSites.length;

  // Calculate initial terminators
  const initialTerminators = detectTerminators(finalSequence);
  const terminatorsFound = initialTerminators.length;

  // Step 2: Remove restriction sites if requested
  if (request.remove_restriction_sites) {
    const beforeRemoval = selectedEnzymesArray
      ? findRestrictionSitesFiltered(finalSequence, restrictionData, selectedEnzymesArray)
      : findRestrictionSites(finalSequence, restrictionData);

    finalSequence = removeRestrictionSites(
      finalSequence,
      protein,
      codonUsage,
      restrictionData,
      selectedEnzymesArray
    );

    const afterRemoval = selectedEnzymesArray
      ? findRestrictionSitesFiltered(finalSequence, restrictionData, selectedEnzymesArray)
      : findRestrictionSites(finalSequence, restrictionData);

    restrictionSitesRemoved = beforeRemoval.length - afterRemoval.length;
  }

  // Step 3: Remove terminators if requested
  if (request.remove_terminators) {
    const beforeRemoval = detectTerminators(finalSequence);
    finalSequence = removeTerminators(finalSequence, protein, codonUsage);
    const afterRemoval = detectTerminators(finalSequence);
    terminatorsRemoved = beforeRemoval.length - afterRemoval.length;
  }

  // Step 4: Optimize terminal regions if requested (for PCR primer design)
  if (request.optimize_ends) {
    const endLength = request.end_length || 24; // Default 24 bp (8 codons)
    finalSequence = optimizeTerminalRegions(finalSequence, protein, codonUsage, endLength);
  }

  // Calculate CAI for all versions
  const originalCaiResult =
    optimizationResult.original_sequence.length > 0
      ? calculateCAI(optimizationResult.original_sequence, codonUsage)
      : {
          cai: 0.0,
          codon_count: 0,
          w_i_values: [],
          codons: [],
        };

  const optimizedCaiResult = calculateCAI(optimizationResult.optimized_sequence, codonUsage);
  const finalCaiResult = calculateCAI(finalSequence, codonUsage);

  // Calculate GC content
  const originalStats =
    optimizationResult.original_sequence.length > 0
      ? calculateCodonStats(optimizationResult.original_sequence, codonUsage)
      : {
          total_codons: 0,
          gc_content: 0.0,
          mean_w_i: 0.0,
          std_w_i: 0.0,
        };

  const finalStats = calculateCodonStats(finalSequence, codonUsage);

  // Convert changes
  const changes: CodonChange[] = optimizationResult.changes.map((c) => ({
    position: c.position,
    original: c.original,
    optimized: c.optimized,
    amino_acid: c.amino_acid,
    reason: 'Optimization',
  }));

  return {
    original_sequence: optimizationResult.original_sequence,
    optimized_sequence: optimizationResult.optimized_sequence,
    final_sequence: finalSequence,
    protein_sequence: optimizationResult.protein_sequence,
    original_cai: originalCaiResult.cai,
    optimized_cai: optimizedCaiResult.cai,
    final_cai: finalCaiResult.cai,
    restriction_sites_found: restrictionSitesFound,
    restriction_sites_removed: restrictionSitesRemoved,
    terminators_found: terminatorsFound,
    terminators_removed: terminatorsRemoved,
    changes,
    w_i_values_original: originalCaiResult.w_i_values,
    w_i_values_optimized: optimizedCaiResult.w_i_values,
    w_i_values_final: finalCaiResult.w_i_values,
    codons_original: originalCaiResult.codons,
    codons_optimized: optimizedCaiResult.codons,
    codons_final: finalCaiResult.codons,
    gc_content_original: originalStats.gc_content,
    gc_content_final: finalStats.gc_content,
  };
}

/**
 * Analyze CAI of a sequence without optimization
 *
 * @param sequence - DNA sequence
 * @returns CAI analysis result
 */
export function analyzeCAI(sequence: string): CAIAnalysisResult {
  const codonUsage = loadCodonUsageData();
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');

  const caiResult = calculateCAI(cleanSequence, codonUsage);
  const stats = calculateCodonStats(cleanSequence, codonUsage);

  return {
    cai: caiResult.cai,
    codon_count: caiResult.codon_count,
    w_i_values: caiResult.w_i_values,
    codons: caiResult.codons,
    gc_content: stats.gc_content,
    mean_w_i: stats.mean_w_i,
    std_w_i: stats.std_w_i,
  };
}

/**
 * Translate DNA to protein
 *
 * @param sequence - DNA sequence
 * @returns Protein sequence
 */
export function translateDNA(sequence: string): string {
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');
  return translateSequence(cleanSequence);
}

/**
 * Get restriction sites in a sequence
 *
 * @param sequence - DNA sequence
 * @returns Array of restriction sites
 */
export function getRestrictionSites(sequence: string): RestrictionSite[] {
  const restrictionData = loadRestrictionData();
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');
  return findRestrictionSites(cleanSequence, restrictionData);
}

/**
 * Detect terminators in a sequence
 *
 * @param sequence - DNA sequence
 * @returns Array of terminators
 */
export function getTerminators(sequence: string): Terminator[] {
  const cleanSequence = sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');
  return detectTerminators(cleanSequence);
}
