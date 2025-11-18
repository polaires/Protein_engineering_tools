/**
 * Codon Data Module
 * Converted from Rust (codon_data.rs)
 *
 * Handles codon usage data, genetic code translation, and relative adaptiveness calculations
 */

import { CodonUsageData } from '../types/codon';
import ecoliCodonUsageJSON from './ecoli_codon_usage.json';

/**
 * Calculate relative adaptiveness (w_i) for all codons
 * Formula: w_i = f_i / f_max(i)
 *
 * @param codonUsage - Codon usage data
 * @returns Map of codon to w_i value
 */
export function calculateRelativeAdaptiveness(codonUsage: CodonUsageData): Record<string, number> {
  const w_i_values: Record<string, number> = {};

  // For each amino acid group, find the maximum frequency
  for (const [aa, codons] of Object.entries(codonUsage.amino_acid_groups)) {
    // Find max frequency for this amino acid
    const maxFreq = codons.reduce((max, codon) => {
      const info = codonUsage.codons[codon];
      return info ? Math.max(max, info.frequency) : max;
    }, 0);

    // Calculate w_i for each codon
    for (const codon of codons) {
      const info = codonUsage.codons[codon];
      if (!info) continue;

      let w_i = maxFreq > 0 ? info.frequency / maxFreq : 0.001; // Avoid division by zero

      // Special cases: Met, Trp, Stop codons
      if (aa === 'M' || aa === 'W' || aa === '*') {
        w_i = 1.0;
      } else if (w_i === 0.0) {
        w_i = 0.001; // Avoid log(0) in CAI calculation
      }

      w_i_values[codon] = w_i;
    }
  }

  return w_i_values;
}

/**
 * Get amino acid for a codon
 *
 * @param codon - Three-letter codon sequence
 * @param codonUsage - Codon usage data
 * @returns Amino acid single-letter code or null
 */
export function getAminoAcid(codon: string, codonUsage: CodonUsageData): string | null {
  const info = codonUsage.codons[codon];
  return info ? info.aa : null;
}

/**
 * Get all codons for an amino acid
 *
 * @param aa - Single-letter amino acid code
 * @param codonUsage - Codon usage data
 * @returns Array of codons or null
 */
export function getCodonsForAA(aa: string, codonUsage: CodonUsageData): string[] | null {
  return codonUsage.amino_acid_groups[aa] || null;
}

/**
 * Genetic code translation table
 * Translate a single codon to amino acid
 *
 * @param codon - Three-letter codon sequence
 * @returns Single-letter amino acid code or null
 */
export function translateCodon(codon: string): string | null {
  const codonUpper = codon.toUpperCase();

  const translationTable: Record<string, string> = {
    // Phenylalanine
    'TTT': 'F', 'TTC': 'F',
    // Leucine
    'TTA': 'L', 'TTG': 'L', 'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    // Isoleucine
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I',
    // Methionine
    'ATG': 'M',
    // Valine
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    // Serine
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S', 'AGT': 'S', 'AGC': 'S',
    // Proline
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    // Threonine
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    // Alanine
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    // Tyrosine
    'TAT': 'Y', 'TAC': 'Y',
    // Stop codons
    'TAA': '*', 'TAG': '*', 'TGA': '*',
    // Histidine
    'CAT': 'H', 'CAC': 'H',
    // Glutamine
    'CAA': 'Q', 'CAG': 'Q',
    // Asparagine
    'AAT': 'N', 'AAC': 'N',
    // Lysine
    'AAA': 'K', 'AAG': 'K',
    // Aspartic acid
    'GAT': 'D', 'GAC': 'D',
    // Glutamic acid
    'GAA': 'E', 'GAG': 'E',
    // Cysteine
    'TGT': 'C', 'TGC': 'C',
    // Tryptophan
    'TGG': 'W',
    // Arginine
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R', 'AGA': 'R', 'AGG': 'R',
    // Glycine
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
  };

  return translationTable[codonUpper] || null;
}

/**
 * Translate DNA sequence to protein
 *
 * @param dna - DNA sequence (must be multiple of 3)
 * @returns Protein sequence or throws error
 */
export function translateSequence(dna: string): string {
  if (dna.length % 3 !== 0) {
    throw new Error('DNA sequence length must be a multiple of 3');
  }

  let protein = '';
  for (let i = 0; i < dna.length; i += 3) {
    const codon = dna.substring(i, i + 3);
    const aa = translateCodon(codon);

    if (aa === null) {
      throw new Error(`Invalid codon: ${codon}`);
    }

    protein += aa;
  }

  return protein;
}

/**
 * Load codon usage data from JSON
 *
 * @returns Codon usage data for E. coli
 */
export function loadCodonUsageData(): CodonUsageData {
  return ecoliCodonUsageJSON as CodonUsageData;
}
