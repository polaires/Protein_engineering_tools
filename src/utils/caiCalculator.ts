/**
 * CAI (Codon Adaptation Index) Calculator
 * Converted from Rust (cai.rs)
 *
 * Calculates CAI and codon usage statistics for DNA sequences
 */

import { CodonUsageData, CAIResult, CodonStats } from '../types/codon';
import { calculateRelativeAdaptiveness } from '../data/codonData';

/**
 * Calculate CAI (Codon Adaptation Index) for a DNA sequence
 * Formula: CAI = exp(mean(log(w_i)))
 * Excludes start and stop codons
 *
 * @param dnaSequence - DNA sequence (must be multiple of 3)
 * @param codonUsage - Codon usage data
 * @returns CAI result with metrics
 */
export function calculateCAI(dnaSequence: string, codonUsage: CodonUsageData): CAIResult {
  // Validate sequence length
  if (dnaSequence.length < 6) {
    throw new Error('Sequence must be at least 6 nucleotides (2 codons)');
  }

  if (dnaSequence.length % 3 !== 0) {
    throw new Error('DNA sequence length must be a multiple of 3');
  }

  // Calculate w_i values
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);

  // Extract codons
  const codons: string[] = [];
  for (let i = 0; i < dnaSequence.length; i += 3) {
    const codon = dnaSequence.substring(i, i + 3).toUpperCase();
    codons.push(codon);
  }

  // Exclude first codon (start) and last codon (stop) from CAI calculation
  const codonsForCAI = codons.length > 2 ? codons.slice(1, -1) : codons;

  // Get w_i values for each codon
  let logSum = 0;
  const w_i_values: number[] = [];

  for (const codon of codonsForCAI) {
    const w_i = w_i_table[codon];
    if (w_i === undefined) {
      throw new Error(`Unknown codon: ${codon}`);
    }
    w_i_values.push(w_i);
    // Use log to avoid underflow
    logSum += Math.log(w_i);
  }

  // Get w_i values for ALL codons (for visualization)
  const allWiValues: number[] = [];
  for (const codon of codons) {
    const w_i = w_i_table[codon];
    allWiValues.push(w_i !== undefined ? w_i : 0.0);
  }

  // Calculate CAI
  const codonCount = codonsForCAI.length;
  const cai = codonCount > 0 ? Math.exp(logSum / codonCount) : 0.0;

  return {
    cai,
    codon_count: codonCount,
    w_i_values: allWiValues,
    codons,
  };
}

/**
 * Calculate statistics about codon usage in a sequence
 *
 * @param dnaSequence - DNA sequence
 * @param codonUsage - Codon usage data
 * @returns Codon usage statistics
 */
export function calculateCodonStats(dnaSequence: string, codonUsage: CodonUsageData): CodonStats {
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);

  const codons: string[] = [];
  for (let i = 0; i < dnaSequence.length; i += 3) {
    const codon = dnaSequence.substring(i, i + 3).toUpperCase();
    codons.push(codon);
  }

  // Calculate GC content
  const gcCount = Array.from(dnaSequence).filter(
    (c) => c === 'G' || c === 'C' || c === 'g' || c === 'c'
  ).length;
  const gcContent = gcCount / dnaSequence.length;

  // Calculate mean and std of w_i
  const w_i_values: number[] = codons
    .map((codon) => w_i_table[codon])
    .filter((w_i): w_i is number => w_i !== undefined);

  const meanWi = w_i_values.length > 0
    ? w_i_values.reduce((sum, w_i) => sum + w_i, 0) / w_i_values.length
    : 0.0;

  const variance = w_i_values.length > 0
    ? w_i_values.reduce((sum, w_i) => sum + Math.pow(w_i - meanWi, 2), 0) / w_i_values.length
    : 0.0;

  const stdWi = Math.sqrt(variance);

  return {
    total_codons: codons.length,
    gc_content: gcContent,
    mean_w_i: meanWi,
    std_w_i: stdWi,
  };
}
