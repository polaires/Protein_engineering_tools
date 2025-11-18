/**
 * Codon Optimizer Module
 * Converted from Rust (optimizer.rs)
 *
 * Main optimization algorithm for E. coli expression
 * Includes codon replacement logic and constraint handling
 */

import { OptimizationResult, CodonChange, CodonUsageData } from '../types/codon';
import { translateSequence, calculateRelativeAdaptiveness } from '../data/codonData';
import { calculateCAI } from './caiCalculator';

/**
 * Optimize a DNA sequence for E. coli expression
 * Replaces each codon with the most frequently used codon for that amino acid
 *
 * @param sequence - Input sequence (DNA or protein)
 * @param codonUsage - Codon usage data
 * @returns Optimization result
 */
export function optimizeSequence(sequence: string, codonUsage: CodonUsageData): OptimizationResult {
  // Validate input
  const dnaSequence = sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');

  // Check if input is protein or DNA
  const isDNA = Array.from(dnaSequence).every((c) => 'ATGC'.includes(c));

  // Only validate length for DNA sequences
  if (isDNA && dnaSequence.length % 3 !== 0) {
    throw new Error('DNA sequence length must be a multiple of 3');
  }

  let originalDNA: string;
  let protein: string;

  if (isDNA) {
    protein = translateSequence(dnaSequence);
    originalDNA = dnaSequence;
  } else {
    // Assume protein sequence, reverse translate with optimal codons
    protein = dnaSequence;
    originalDNA = reverseTranslate(protein, codonUsage);
  }

  // Calculate w_i values and find optimal codons
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);
  const optimalCodons = findOptimalCodons(w_i_table, codonUsage);

  // Optimize the sequence
  let optimized = '';
  const changes: CodonChange[] = [];

  for (let i = 0; i < protein.length; i++) {
    const aa = protein.charAt(i);
    const originalCodon = isDNA && i * 3 < originalDNA.length
      ? originalDNA.substring(i * 3, i * 3 + 3)
      : '';

    const aaStr = aa;
    const optimalCodon = optimalCodons[aaStr];

    if (!optimalCodon) {
      throw new Error(`No optimal codon for amino acid: ${aa}`);
    }

    optimized += optimalCodon;

    if (originalCodon && originalCodon !== optimalCodon) {
      changes.push({
        position: i,
        original: originalCodon,
        optimized: optimalCodon,
        amino_acid: aaStr,
      });
    }
  }

  // Calculate CAI for both sequences
  const originalCAI = isDNA ? calculateCAI(originalDNA, codonUsage).cai : 0.0;
  const optimizedCAI = calculateCAI(optimized, codonUsage).cai;

  return {
    original_sequence: originalDNA,
    optimized_sequence: optimized,
    protein_sequence: protein,
    original_cai: originalCAI,
    optimized_cai: optimizedCAI,
    changes,
  };
}

/**
 * Find the optimal (highest w_i) codon for each amino acid
 */
function findOptimalCodons(
  w_i_table: Record<string, number>,
  codonUsage: CodonUsageData
): Record<string, string> {
  const optimalCodons: Record<string, string> = {};

  for (const [aa, codons] of Object.entries(codonUsage.amino_acid_groups)) {
    let bestCodon = codons[0];
    let bestWi = 0;

    for (const codon of codons) {
      const w_i = w_i_table[codon];
      if (w_i !== undefined && w_i > bestWi) {
        bestWi = w_i;
        bestCodon = codon;
      }
    }

    optimalCodons[aa] = bestCodon;
  }

  return optimalCodons;
}

/**
 * Reverse translate protein to DNA using optimal codons
 */
export function reverseTranslate(protein: string, codonUsage: CodonUsageData): string {
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);
  const optimalCodons = findOptimalCodons(w_i_table, codonUsage);

  let dna = '';
  for (const aa of protein) {
    const aaStr = aa;
    const codon = optimalCodons[aaStr];
    if (!codon) {
      throw new Error(`Unknown amino acid: ${aa}`);
    }
    dna += codon;
  }

  return dna;
}

/**
 * Get sorted codons by w_i value for an amino acid (for use in constraint optimization)
 *
 * @param aminoAcid - Single-letter amino acid code
 * @param w_i_table - w_i values for all codons
 * @param codonUsage - Codon usage data
 * @returns Array of [codon, w_i] tuples sorted by w_i (descending)
 */
export function getSortedCodonsByWi(
  aminoAcid: string,
  w_i_table: Record<string, number>,
  codonUsage: CodonUsageData
): Array<[string, number]> {
  const codons = codonUsage.amino_acid_groups[aminoAcid];
  if (!codons) {
    return [];
  }

  const codonWiPairs: Array<[string, number]> = codons
    .map((codon): [string, number] | null => {
      const w_i = w_i_table[codon];
      return w_i !== undefined ? [codon, w_i] : null;
    })
    .filter((pair): pair is [string, number] => pair !== null);

  // Sort by w_i in descending order
  codonWiPairs.sort((a, b) => b[1] - a[1]);

  return codonWiPairs;
}

/**
 * Calculate GC content of a DNA sequence
 */
function calculateGCContent(sequence: string): number {
  const gcCount = Array.from(sequence).filter((c) => c === 'G' || c === 'C').length;
  return (gcCount / sequence.length) * 100.0;
}

/**
 * Optimize terminal regions for better GC balance (ideal for PCR primers)
 * Targets 40-60% GC content for better primer annealing
 *
 * @param dnaSequence - DNA sequence
 * @param proteinSequence - Protein sequence
 * @param codonUsage - Codon usage data
 * @param endLength - Length of terminal regions to optimize (in bp)
 * @returns Optimized DNA sequence
 */
export function optimizeTerminalRegions(
  dnaSequence: string,
  proteinSequence: string,
  codonUsage: CodonUsageData,
  endLength: number
): string {
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);
  let resultSequence = dnaSequence.toUpperCase();

  const sequenceLength = dnaSequence.length;
  const numCodons = sequenceLength / 3;

  // Ensure end_length is reasonable (in base pairs)
  const endBp = Math.min(endLength, Math.floor(sequenceLength / 2));
  const endCodons = Math.max(Math.floor(endBp / 3), 1); // At least 1 codon

  // Target GC content: 40-60% is ideal for primers
  const targetGcLow = 40.0;
  const targetGcHigh = 60.0;

  // Optimize 5' end
  if (numCodons >= endCodons) {
    const fivePrimeStart = 0;
    const fivePrimeEnd = endCodons * 3;
    const fivePrimeRegion = resultSequence.substring(fivePrimeStart, fivePrimeEnd);
    const gcContent = calculateGCContent(fivePrimeRegion);

    // Only optimize if GC is outside ideal range
    if (gcContent < targetGcLow || gcContent > targetGcHigh) {
      resultSequence = optimizeRegionGC(
        resultSequence,
        proteinSequence,
        0,
        endCodons,
        w_i_table,
        codonUsage,
        targetGcLow,
        targetGcHigh
      );
    }
  }

  // Optimize 3' end
  if (numCodons >= endCodons) {
    const threePrimeStartCodon = numCodons - endCodons;
    const threePrimeStart = threePrimeStartCodon * 3;
    const threePrimeRegion = resultSequence.substring(threePrimeStart);
    const gcContent = calculateGCContent(threePrimeRegion);

    // Only optimize if GC is outside ideal range
    if (gcContent < targetGcLow || gcContent > targetGcHigh) {
      resultSequence = optimizeRegionGC(
        resultSequence,
        proteinSequence,
        threePrimeStartCodon,
        numCodons,
        w_i_table,
        codonUsage,
        targetGcLow,
        targetGcHigh
      );
    }
  }

  return resultSequence;
}

/**
 * Optimize a specific region for GC content while maintaining protein sequence
 */
function optimizeRegionGC(
  dnaSequence: string,
  proteinSequence: string,
  startCodon: number,
  endCodon: number,
  w_i_table: Record<string, number>,
  codonUsage: CodonUsageData,
  targetGcLow: number,
  targetGcHigh: number
): string {
  let result = dnaSequence;
  const maxIterations = 50;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const startBp = startCodon * 3;
    const endBp = endCodon * 3;
    const region = result.substring(startBp, endBp);
    const currentGc = calculateGCContent(region);

    // Check if we're within target range
    if (currentGc >= targetGcLow && currentGc <= targetGcHigh) {
      break;
    }

    const needMoreGc = currentGc < targetGcLow;
    let bestChange: [number, string] | null = null;
    let bestImprovement = 0;

    // Try changing each codon in the region
    for (let codonIdx = startCodon; codonIdx < endCodon; codonIdx++) {
      if (codonIdx >= proteinSequence.length) {
        break;
      }

      const aa = proteinSequence.charAt(codonIdx);
      const aaStr = aa;

      const sortedCodons = getSortedCodonsByWi(aaStr, w_i_table, codonUsage);

      // Try alternative codons
      for (const [altCodon, w_i] of sortedCodons) {
        const currentCodon = result.substring(codonIdx * 3, codonIdx * 3 + 3);

        if (altCodon === currentCodon) {
          continue;
        }

        // Calculate GC of alternative codon
        const altGc = calculateGCContent(altCodon);
        const currentCodonGc = calculateGCContent(currentCodon);

        // Determine if this change improves GC
        let improvement: number;
        if (needMoreGc) {
          // We need more GC - prefer codons with higher GC
          if (altGc > currentCodonGc) {
            improvement = (altGc - currentCodonGc) * w_i; // Weight by codon quality
          } else {
            continue; // Skip codons that don't increase GC
          }
        } else {
          // We need less GC - prefer codons with lower GC
          if (altGc < currentCodonGc) {
            improvement = (currentCodonGc - altGc) * w_i; // Weight by codon quality
          } else {
            continue; // Skip codons that don't decrease GC
          }
        }

        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          bestChange = [codonIdx, altCodon];
        }
      }
    }

    // Apply best change if found
    if (bestChange) {
      const [codonIdx, newCodon] = bestChange;
      const codonPos = codonIdx * 3;
      result =
        result.substring(0, codonPos) +
        newCodon +
        result.substring(codonPos + 3);
    } else {
      // No improvement found, exit
      break;
    }
  }

  return result;
}
