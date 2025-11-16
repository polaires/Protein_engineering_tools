/**
 * Codon Optimization for E. coli
 * Based on E. coli K-12 codon usage frequencies
 * Data source: Kazusa Codon Usage Database
 */

// Genetic code: codon -> amino acid
export const GENETIC_CODE: Record<string, string> = {
  // Phenylalanine
  TTT: 'F', TTC: 'F',
  // Leucine
  TTA: 'L', TTG: 'L', CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  // Isoleucine
  ATT: 'I', ATC: 'I', ATA: 'I',
  // Methionine
  ATG: 'M',
  // Valine
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  // Serine
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S', AGT: 'S', AGC: 'S',
  // Proline
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  // Threonine
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  // Alanine
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  // Tyrosine
  TAT: 'Y', TAC: 'Y',
  // Stop codons
  TAA: '*', TAG: '*', TGA: '*',
  // Histidine
  CAT: 'H', CAC: 'H',
  // Glutamine
  CAA: 'Q', CAG: 'Q',
  // Asparagine
  AAT: 'N', AAC: 'N',
  // Lysine
  AAA: 'K', AAG: 'K',
  // Aspartic acid
  GAT: 'D', GAC: 'D',
  // Glutamic acid
  GAA: 'E', GAG: 'E',
  // Cysteine
  TGT: 'C', TGC: 'C',
  // Tryptophan
  TGG: 'W',
  // Arginine
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R', AGA: 'R', AGG: 'R',
  // Glycine
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

// E. coli K-12 optimal codons (most frequently used)
// Based on codon usage frequency data
export const ECOLI_OPTIMAL_CODONS: Record<string, string> = {
  F: 'TTC', // Phe
  L: 'CTG', // Leu
  I: 'ATC', // Ile
  M: 'ATG', // Met
  V: 'GTG', // Val
  S: 'AGC', // Ser
  P: 'CCG', // Pro
  T: 'ACC', // Thr
  A: 'GCG', // Ala
  Y: 'TAC', // Tyr
  '*': 'TAA', // Stop
  H: 'CAC', // His
  Q: 'CAG', // Gln
  N: 'AAC', // Asn
  K: 'AAA', // Lys
  D: 'GAT', // Asp
  E: 'GAA', // Glu
  C: 'TGC', // Cys
  W: 'TGG', // Trp
  R: 'CGT', // Arg
  G: 'GGC', // Gly
};

// All codons for each amino acid (for reverse translation)
export const AMINO_ACID_CODONS: Record<string, string[]> = {
  F: ['TTT', 'TTC'],
  L: ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
  I: ['ATT', 'ATC', 'ATA'],
  M: ['ATG'],
  V: ['GTT', 'GTC', 'GTA', 'GTG'],
  S: ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
  P: ['CCT', 'CCC', 'CCA', 'CCG'],
  T: ['ACT', 'ACC', 'ACA', 'ACG'],
  A: ['GCT', 'GCC', 'GCA', 'GCG'],
  Y: ['TAT', 'TAC'],
  '*': ['TAA', 'TAG', 'TGA'],
  H: ['CAT', 'CAC'],
  Q: ['CAA', 'CAG'],
  N: ['AAT', 'AAC'],
  K: ['AAA', 'AAG'],
  D: ['GAT', 'GAC'],
  E: ['GAA', 'GAG'],
  C: ['TGT', 'TGC'],
  W: ['TGG'],
  R: ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  G: ['GGT', 'GGC', 'GGA', 'GGG'],
};

// E. coli K-12 codon usage weights (relative frequencies)
// Higher weight = more frequently used
export const ECOLI_CODON_WEIGHTS: Record<string, number> = {
  // Phe
  TTT: 0.42, TTC: 0.58,
  // Leu
  TTA: 0.11, TTG: 0.10, CTT: 0.09, CTC: 0.10, CTA: 0.03, CTG: 0.57,
  // Ile
  ATT: 0.49, ATC: 0.42, ATA: 0.09,
  // Met
  ATG: 1.00,
  // Val
  GTT: 0.26, GTC: 0.20, GTA: 0.15, GTG: 0.39,
  // Ser
  TCT: 0.15, TCC: 0.15, TCA: 0.12, TCG: 0.15, AGT: 0.14, AGC: 0.29,
  // Pro
  CCT: 0.16, CCC: 0.11, CCA: 0.18, CCG: 0.55,
  // Thr
  ACT: 0.17, ACC: 0.44, ACA: 0.13, ACG: 0.26,
  // Ala
  GCT: 0.16, GCC: 0.25, GCA: 0.21, GCG: 0.38,
  // Tyr
  TAT: 0.43, TAC: 0.57,
  // Stop
  TAA: 0.64, TAG: 0.09, TGA: 0.27,
  // His
  CAT: 0.43, CAC: 0.57,
  // Gln
  CAA: 0.30, CAG: 0.70,
  // Asn
  AAT: 0.40, AAC: 0.60,
  // Lys
  AAA: 0.76, AAG: 0.24,
  // Asp
  GAT: 0.62, GAC: 0.38,
  // Glu
  GAA: 0.69, GAG: 0.31,
  // Cys
  TGT: 0.42, TGC: 0.58,
  // Trp
  TGG: 1.00,
  // Arg
  CGT: 0.40, CGC: 0.39, CGA: 0.06, CGG: 0.09, AGA: 0.04, AGG: 0.02,
  // Gly
  GGT: 0.34, GGC: 0.37, GGA: 0.11, GGG: 0.18,
};

export interface CodonOptimizationResult {
  originalSequence: string;
  optimizedSequence: string;
  proteinSequence: string;
  originalGC: number;
  optimizedGC: number;
  originalCAI: number;
  optimizedCAI: number;
  identicalCodons: number;
  changedCodons: number;
  percentIdentity: number;
}

/**
 * Clean and validate DNA sequence
 */
function cleanDNASequence(sequence: string): string {
  // Remove whitespace, numbers, and convert to uppercase
  const cleaned = sequence.replace(/[^ATGCUatgcu]/g, '').toUpperCase().replace(/U/g, 'T');
  return cleaned;
}

/**
 * Validate DNA sequence
 */
function validateDNASequence(sequence: string): { valid: boolean; error?: string } {
  if (sequence.length === 0) {
    return { valid: false, error: 'DNA sequence is empty' };
  }

  if (sequence.length % 3 !== 0) {
    return { valid: false, error: 'DNA sequence length is not a multiple of 3' };
  }

  if (!/^[ATGC]+$/.test(sequence)) {
    return { valid: false, error: 'DNA sequence contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Translate DNA sequence to protein
 */
export function translateDNA(dnaSequence: string): string {
  const codons = [];
  for (let i = 0; i < dnaSequence.length; i += 3) {
    codons.push(dnaSequence.substring(i, i + 3));
  }

  return codons.map(codon => GENETIC_CODE[codon] || 'X').join('');
}

/**
 * Calculate GC content percentage
 */
function calculateGCContent(sequence: string): number {
  const gcCount = (sequence.match(/[GC]/g) || []).length;
  return (gcCount / sequence.length) * 100;
}

/**
 * Calculate Codon Adaptation Index (CAI)
 * Measures how well codons match the optimal codon usage
 */
function calculateCAI(sequence: string): number {
  const codons = [];
  for (let i = 0; i < sequence.length; i += 3) {
    codons.push(sequence.substring(i, i + 3));
  }

  let totalWeight = 0;
  let validCodons = 0;

  for (const codon of codons) {
    const weight = ECOLI_CODON_WEIGHTS[codon];
    if (weight !== undefined) {
      totalWeight += Math.log(weight);
      validCodons++;
    }
  }

  if (validCodons === 0) return 0;

  // CAI is the geometric mean of codon weights
  return Math.exp(totalWeight / validCodons);
}

/**
 * Optimize DNA sequence for E. coli expression
 */
export function optimizeForEcoli(dnaSequence: string): CodonOptimizationResult {
  // Clean sequence
  const cleaned = cleanDNASequence(dnaSequence);

  // Validate
  const validation = validateDNASequence(cleaned);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Translate original sequence
  const proteinSequence = translateDNA(cleaned);

  // Check for stop codons in the middle
  const stopIndex = proteinSequence.indexOf('*');
  if (stopIndex !== -1 && stopIndex < proteinSequence.length - 1) {
    throw new Error(`Premature stop codon found at position ${stopIndex + 1}`);
  }

  // Optimize: replace each codon with E. coli optimal codon
  const optimizedCodons: string[] = [];
  for (const aa of proteinSequence) {
    const optimalCodon = ECOLI_OPTIMAL_CODONS[aa];
    if (optimalCodon) {
      optimizedCodons.push(optimalCodon);
    } else {
      throw new Error(`No optimal codon found for amino acid: ${aa}`);
    }
  }

  const optimizedSequence = optimizedCodons.join('');

  // Calculate metrics
  const originalGC = calculateGCContent(cleaned);
  const optimizedGC = calculateGCContent(optimizedSequence);
  const originalCAI = calculateCAI(cleaned);
  const optimizedCAI = calculateCAI(optimizedSequence);

  // Calculate identity
  let identicalCodons = 0;
  for (let i = 0; i < cleaned.length; i += 3) {
    const originalCodon = cleaned.substring(i, i + 3);
    const optimizedCodon = optimizedSequence.substring(i, i + 3);
    if (originalCodon === optimizedCodon) {
      identicalCodons++;
    }
  }

  const totalCodons = cleaned.length / 3;
  const changedCodons = totalCodons - identicalCodons;
  const percentIdentity = (identicalCodons / totalCodons) * 100;

  return {
    originalSequence: cleaned,
    optimizedSequence,
    proteinSequence,
    originalGC,
    optimizedGC,
    originalCAI,
    optimizedCAI,
    identicalCodons,
    changedCodons,
    percentIdentity,
  };
}

/**
 * Reverse translate protein sequence to DNA using E. coli optimal codons
 */
export function reverseTranslate(proteinSequence: string): string {
  const cleaned = proteinSequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY*]/g, '');

  const codons: string[] = [];
  for (const aa of cleaned) {
    const optimalCodon = ECOLI_OPTIMAL_CODONS[aa];
    if (optimalCodon) {
      codons.push(optimalCodon);
    } else {
      throw new Error(`Invalid amino acid: ${aa}`);
    }
  }

  return codons.join('');
}
