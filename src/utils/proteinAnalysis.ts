/**
 * Protein Analysis Utilities
 * Based on ExPASy ProtParam and Biopython implementation
 */

// Amino acid molecular weights (average isotopic composition)
export const AA_WEIGHTS: Record<string, number> = {
  A: 89.09, // Alanine
  C: 121.15, // Cysteine
  D: 133.10, // Aspartic acid
  E: 147.13, // Glutamic acid
  F: 165.19, // Phenylalanine
  G: 75.07, // Glycine
  H: 155.16, // Histidine
  I: 131.17, // Isoleucine
  K: 146.19, // Lysine
  L: 131.17, // Leucine
  M: 149.21, // Methionine
  N: 132.12, // Asparagine
  P: 115.13, // Proline
  Q: 146.15, // Glutamine
  R: 174.20, // Arginine
  S: 105.09, // Serine
  T: 119.12, // Threonine
  V: 117.15, // Valine
  W: 204.23, // Tryptophan
  Y: 181.19, // Tyrosine
};

// Kyte-Doolittle hydropathy scale
export const HYDROPATHY: Record<string, number> = {
  A: 1.8,
  R: -4.5,
  N: -3.5,
  D: -3.5,
  C: 2.5,
  Q: -3.5,
  E: -3.5,
  G: -0.4,
  H: -3.2,
  I: 4.5,
  L: 3.8,
  K: -3.9,
  M: 1.9,
  F: 2.8,
  P: -1.6,
  S: -0.8,
  T: -0.7,
  W: -0.9,
  Y: -1.3,
  V: 4.2,
};

// Flexibility parameters (Vihinen et al., 1994)
export const FLEXIBILITY: Record<string, number> = {
  A: 0.984,
  C: 0.906,
  D: 1.068,
  E: 1.094,
  F: 0.915,
  G: 1.031,
  H: 0.950,
  I: 0.927,
  K: 1.102,
  L: 0.935,
  M: 0.952,
  N: 1.048,
  P: 1.049,
  Q: 1.037,
  R: 1.008,
  S: 1.046,
  T: 0.997,
  V: 0.931,
  W: 0.904,
  Y: 0.929,
};

// pKa values for isoelectric point calculation
export const PKA_VALUES = {
  positive: {
    Nterm: 9.69,
    K: 10.54,
    R: 12.48,
    H: 6.00,
  },
  negative: {
    Cterm: 2.34,
    D: 3.86,
    E: 4.25,
    C: 8.33,
    Y: 10.07,
  },
};

// Instability index dipeptide values (DIWV) - Guruprasad et al., 1990
// Only including the most significant values for brevity
export const DIWV: Record<string, Record<string, number>> = {
  A: { A: 1.0, C: 44.94, D: -7.49, E: 1.0, F: 1.0, G: 1.0, H: -7.49, I: 1.0, K: 1.0, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 1.0, R: 1.0, S: 1.0, T: 1.0, V: 1.0, W: 1.0, Y: 1.0 },
  C: { A: 1.0, C: 1.0, D: 20.26, E: 1.0, F: 1.0, G: 1.0, H: 33.60, I: 1.0, K: 1.0, L: 20.26, M: 33.60, N: 1.0, P: 20.26, Q: -6.54, R: 1.0, S: 1.0, T: 33.60, V: -6.54, W: 24.68, Y: 1.0 },
  D: { A: 1.0, C: 1.0, D: 1.0, E: 1.0, F: -6.54, G: 1.0, H: 1.0, I: 1.0, K: -7.49, L: 1.0, M: 1.0, N: 1.0, P: 1.0, Q: 1.0, R: -6.54, S: 20.26, T: -14.03, V: 1.0, W: 1.0, Y: 1.0 },
  E: { A: 1.0, C: 44.94, D: 20.26, E: 33.60, F: 1.0, G: 1.0, H: -6.54, I: 20.26, K: 1.0, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 20.26, R: 1.0, S: 20.26, T: 1.0, V: 1.0, W: -14.03, Y: 1.0 },
  F: { A: 1.0, C: 1.0, D: 13.34, E: 1.0, F: 1.0, G: 1.0, H: 1.0, I: 1.0, K: -14.03, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 1.0, R: 1.0, S: 1.0, T: 1.0, V: 1.0, W: 1.0, Y: 33.60 },
  G: { A: -7.49, C: 1.0, D: 1.0, E: -6.54, F: 1.0, G: 13.34, H: 1.0, I: -7.49, K: -7.49, L: 1.0, M: 1.0, N: -7.49, P: 1.0, Q: 1.0, R: 1.0, S: 1.0, T: -7.49, V: 1.0, W: 13.34, Y: -7.49 },
  H: { A: 1.0, C: 1.0, D: 1.0, E: 1.0, F: -9.37, G: -9.37, H: 1.0, I: 44.94, K: 24.68, L: 1.0, M: 1.0, N: 24.68, P: -1.88, Q: 1.0, R: 1.0, S: 1.0, T: -6.54, V: 1.0, W: -1.88, Y: 44.94 },
  I: { A: 1.0, C: 1.0, D: 1.0, E: 44.94, F: 1.0, G: 1.0, H: 13.34, I: 1.0, K: -7.49, L: 20.26, M: 1.0, N: 1.0, P: -1.88, Q: 1.0, R: 1.0, S: 1.0, T: 1.0, V: -7.49, W: 1.0, Y: 1.0 },
  K: { A: 1.0, C: 1.0, D: 1.0, E: 1.0, F: -14.03, G: -7.49, H: 1.0, I: -7.49, K: 1.0, L: -7.49, M: 33.60, N: 1.0, P: -6.54, Q: 24.68, R: 33.60, S: 1.0, T: 1.0, V: -7.49, W: 1.0, Y: 1.0 },
  L: { A: 1.0, C: 1.0, D: 1.0, E: 1.0, F: 1.0, G: 1.0, H: 1.0, I: 1.0, K: -7.49, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 33.60, R: 20.26, S: 1.0, T: 1.0, V: 1.0, W: 24.68, Y: 1.0 },
  M: { A: 13.34, C: 1.0, D: 1.0, E: 1.0, F: 1.0, G: 1.0, H: 58.28, I: 1.0, K: 1.0, L: 1.0, M: -1.88, N: 1.0, P: 44.94, Q: -6.54, R: -6.54, S: 44.94, T: -1.88, V: 1.0, W: 1.0, Y: 24.68 },
  N: { A: 1.0, C: -1.88, D: 1.0, E: 1.0, F: -14.03, G: -14.03, H: 1.0, I: 44.94, K: 24.68, L: 1.0, M: 1.0, N: 1.0, P: -1.88, Q: -6.54, R: 1.0, S: 1.0, T: -7.49, V: 1.0, W: -9.37, Y: 1.0 },
  P: { A: 20.26, C: -6.54, D: -6.54, E: 18.38, F: -14.03, G: 1.0, H: 1.0, I: 1.0, K: 1.0, L: 1.0, M: -6.54, N: 1.0, P: 20.26, Q: 20.26, R: -6.54, S: 20.26, T: 1.0, V: 20.26, W: -1.88, Y: 1.0 },
  Q: { A: 1.0, C: -6.54, D: 20.26, E: 20.26, F: -6.54, G: 1.0, H: 1.0, I: 1.0, K: 1.0, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 20.26, R: 1.0, S: 44.94, T: 1.0, V: -6.54, W: 1.0, Y: -6.54 },
  R: { A: 1.0, C: 1.0, D: 1.0, E: 1.0, F: 1.0, G: -7.49, H: 20.26, I: 1.0, K: 1.0, L: 1.0, M: 1.0, N: 13.34, P: 20.26, Q: 20.26, R: 58.28, S: 44.94, T: 1.0, V: 1.0, W: 58.28, Y: -6.54 },
  S: { A: 1.0, C: 33.60, D: 20.26, E: 20.26, F: 1.0, G: 1.0, H: 1.0, I: 1.0, K: 1.0, L: 1.0, M: 1.0, N: 1.0, P: 44.94, Q: 20.26, R: 20.26, S: 20.26, T: 1.0, V: 1.0, W: 1.0, Y: 1.0 },
  T: { A: 1.0, C: 1.0, D: 1.0, E: 20.26, F: 13.34, G: -7.49, H: 1.0, I: 1.0, K: 1.0, L: 1.0, M: 1.0, N: -14.03, P: 1.0, Q: -6.54, R: 1.0, S: 1.0, T: 1.0, V: 1.0, W: -14.03, Y: 1.0 },
  V: { A: 1.0, C: 1.0, D: -14.03, E: 1.0, F: 1.0, G: -7.49, H: 1.0, I: 1.0, K: -1.88, L: 1.0, M: 1.0, N: 1.0, P: 20.26, Q: 1.0, R: 1.0, S: 1.0, T: -7.49, V: 1.0, W: 1.0, Y: -6.54 },
  W: { A: -14.03, C: 1.0, D: 1.0, E: 1.0, F: 1.0, G: 13.34, H: 24.68, I: 1.0, K: 1.0, L: 13.34, M: 1.0, N: 13.34, P: 1.0, Q: 1.0, R: 1.0, S: 1.0, T: -14.03, V: -7.49, W: 1.0, Y: 1.0 },
  Y: { A: 1.0, C: 1.0, D: 24.68, E: -6.54, F: 1.0, G: -7.49, H: 13.34, I: 1.0, K: 1.0, L: 1.0, M: 44.94, N: 1.0, P: 13.34, Q: 1.0, R: -15.91, S: 1.0, T: -7.49, V: 1.0, W: -9.37, Y: 13.34 },
};

export interface ProteinAnalysisResult {
  sequence: string;
  length: number;
  molecularWeight: number;
  theoreticalPI: number;
  aminoAcidComposition: Record<string, number>;
  aminoAcidPercent: Record<string, number>;
  atomicComposition: {
    C: number;
    H: number;
    N: number;
    O: number;
    S: number;
  };
  extinctionCoefficient: {
    reduced: number; // Cys reduced
    oxidized: number; // Cystine formed
  };
  instabilityIndex: number;
  aliphaticIndex: number;
  gravy: number; // Grand average of hydropathicity
  aromaticity: number;
}

/**
 * Clean and validate protein sequence
 */
export function cleanSequence(sequence: string): string {
  // Remove whitespace, numbers, and convert to uppercase
  return sequence.replace(/[\s\d]/g, '').toUpperCase();
}

/**
 * Validate protein sequence
 */
export function isValidSequence(sequence: string): boolean {
  const validAA = Object.keys(AA_WEIGHTS);
  const cleaned = cleanSequence(sequence);

  if (cleaned.length === 0) return false;

  for (const aa of cleaned) {
    if (!validAA.includes(aa)) {
      return false;
    }
  }

  return true;
}

/**
 * Count amino acids in sequence
 */
export function countAminoAcids(sequence: string): Record<string, number> {
  const counts: Record<string, number> = {};

  // Initialize all counts to 0
  Object.keys(AA_WEIGHTS).forEach(aa => counts[aa] = 0);

  // Count each amino acid
  for (const aa of sequence) {
    if (counts[aa] !== undefined) {
      counts[aa]++;
    }
  }

  return counts;
}

/**
 * Calculate molecular weight
 */
export function calculateMolecularWeight(sequence: string): number {
  let weight = 0;

  for (const aa of sequence) {
    weight += AA_WEIGHTS[aa] || 0;
  }

  // Subtract water molecules (peptide bonds)
  weight -= (sequence.length - 1) * 18.015;

  return weight;
}

/**
 * Calculate theoretical isoelectric point (pI)
 * Uses bisection method to find pH where net charge = 0
 */
export function calculatePI(counts: Record<string, number>): number {
  const chargeAtPH = (pH: number): number => {
    let positiveCharge = 0;
    let negativeCharge = 0;

    // N-terminus
    positiveCharge += 1 / (1 + Math.pow(10, pH - PKA_VALUES.positive.Nterm));

    // C-terminus
    negativeCharge += 1 / (1 + Math.pow(10, PKA_VALUES.negative.Cterm - pH));

    // Positive amino acids
    positiveCharge += counts.K / (1 + Math.pow(10, pH - PKA_VALUES.positive.K));
    positiveCharge += counts.R / (1 + Math.pow(10, pH - PKA_VALUES.positive.R));
    positiveCharge += counts.H / (1 + Math.pow(10, pH - PKA_VALUES.positive.H));

    // Negative amino acids
    negativeCharge += counts.D / (1 + Math.pow(10, PKA_VALUES.negative.D - pH));
    negativeCharge += counts.E / (1 + Math.pow(10, PKA_VALUES.negative.E - pH));
    negativeCharge += counts.C / (1 + Math.pow(10, PKA_VALUES.negative.C - pH));
    negativeCharge += counts.Y / (1 + Math.pow(10, PKA_VALUES.negative.Y - pH));

    return positiveCharge - negativeCharge;
  };

  // Bisection method to find pI
  let phMin = 0;
  let phMax = 14;
  let pI = 7.0;

  for (let i = 0; i < 100; i++) {
    pI = (phMin + phMax) / 2;
    const charge = chargeAtPH(pI);

    if (Math.abs(charge) < 0.001) break;

    if (charge > 0) {
      phMin = pI;
    } else {
      phMax = pI;
    }
  }

  return pI;
}

/**
 * Calculate atomic composition
 */
export function calculateAtomicComposition(counts: Record<string, number>): {
  C: number;
  H: number;
  N: number;
  O: number;
  S: number;
} {
  // Atomic composition for each amino acid
  const atoms: Record<string, { C: number; H: number; N: number; O: number; S: number }> = {
    A: { C: 3, H: 5, N: 1, O: 1, S: 0 },
    C: { C: 3, H: 5, N: 1, O: 1, S: 1 },
    D: { C: 4, H: 5, N: 1, O: 3, S: 0 },
    E: { C: 5, H: 7, N: 1, O: 3, S: 0 },
    F: { C: 9, H: 9, N: 1, O: 1, S: 0 },
    G: { C: 2, H: 3, N: 1, O: 1, S: 0 },
    H: { C: 6, H: 7, N: 3, O: 1, S: 0 },
    I: { C: 6, H: 11, N: 1, O: 1, S: 0 },
    K: { C: 6, H: 12, N: 2, O: 1, S: 0 },
    L: { C: 6, H: 11, N: 1, O: 1, S: 0 },
    M: { C: 5, H: 9, N: 1, O: 1, S: 1 },
    N: { C: 4, H: 6, N: 2, O: 2, S: 0 },
    P: { C: 5, H: 7, N: 1, O: 1, S: 0 },
    Q: { C: 5, H: 8, N: 2, O: 2, S: 0 },
    R: { C: 6, H: 12, N: 4, O: 1, S: 0 },
    S: { C: 3, H: 5, N: 1, O: 2, S: 0 },
    T: { C: 4, H: 7, N: 1, O: 2, S: 0 },
    V: { C: 5, H: 9, N: 1, O: 1, S: 0 },
    W: { C: 11, H: 10, N: 2, O: 1, S: 0 },
    Y: { C: 9, H: 9, N: 1, O: 2, S: 0 },
  };

  const total = { C: 0, H: 0, N: 0, O: 0, S: 0 };

  for (const [aa, count] of Object.entries(counts)) {
    if (atoms[aa]) {
      total.C += atoms[aa].C * count;
      total.H += atoms[aa].H * count;
      total.N += atoms[aa].N * count;
      total.O += atoms[aa].O * count;
      total.S += atoms[aa].S * count;
    }
  }

  // Subtract water molecules for peptide bonds
  const peptideBonds = Object.values(counts).reduce((a, b) => a + b, 0) - 1;
  total.H -= peptideBonds * 2;
  total.O -= peptideBonds;

  return total;
}

/**
 * Calculate extinction coefficient
 * E(Prot) = Numb(Tyr)*Ext(Tyr) + Numb(Trp)*Ext(Trp) + Numb(Cystine)*Ext(Cystine)
 */
export function calculateExtinctionCoefficient(counts: Record<string, number>): {
  reduced: number;
  oxidized: number;
} {
  const ExtY = 1490; // Tyrosine
  const ExtW = 5500; // Tryptophan
  const ExtCystine = 125; // Cystine (disulfide bond)

  const reduced = counts.Y * ExtY + counts.W * ExtW;
  const oxidized = reduced + Math.floor(counts.C / 2) * ExtCystine;

  return { reduced, oxidized };
}

/**
 * Calculate instability index
 * Based on dipeptide composition (Guruprasad et al., 1990)
 * Value > 40 indicates unstable protein
 */
export function calculateInstabilityIndex(sequence: string): number {
  let instability = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    const aa1 = sequence[i];
    const aa2 = sequence[i + 1];

    if (DIWV[aa1] && DIWV[aa1][aa2] !== undefined) {
      instability += DIWV[aa1][aa2];
    }
  }

  return (10 / sequence.length) * instability;
}

/**
 * Calculate aliphatic index
 * Aliphatic index = X(Ala) + a * X(Val) + b * (X(Ile) + X(Leu))
 * where X is mole percent and a = 2.9, b = 3.9
 */
export function calculateAliphaticIndex(counts: Record<string, number>, length: number): number {
  const X_Ala = (counts.A / length) * 100;
  const X_Val = (counts.V / length) * 100;
  const X_Ile = (counts.I / length) * 100;
  const X_Leu = (counts.L / length) * 100;

  return X_Ala + 2.9 * X_Val + 3.9 * (X_Ile + X_Leu);
}

/**
 * Calculate GRAVY (Grand Average of Hydropathicity)
 * Sum of hydropathy values of all amino acids / number of residues
 */
export function calculateGRAVY(sequence: string): number {
  let sum = 0;

  for (const aa of sequence) {
    sum += HYDROPATHY[aa] || 0;
  }

  return sum / sequence.length;
}

/**
 * Calculate aromaticity
 * Relative frequency of Phe + Trp + Tyr
 */
export function calculateAromaticity(counts: Record<string, number>, length: number): number {
  const aromatic = counts.F + counts.W + counts.Y;
  return aromatic / length;
}

/**
 * Main analysis function
 */
export function analyzeProtein(sequence: string): ProteinAnalysisResult {
  const cleaned = cleanSequence(sequence);

  if (!isValidSequence(cleaned)) {
    throw new Error('Invalid protein sequence. Only standard amino acid letters (A-Z) are allowed.');
  }

  const length = cleaned.length;
  const counts = countAminoAcids(cleaned);

  // Calculate percentages
  const percentages: Record<string, number> = {};
  Object.entries(counts).forEach(([aa, count]) => {
    percentages[aa] = (count / length) * 100;
  });

  return {
    sequence: cleaned,
    length,
    molecularWeight: calculateMolecularWeight(cleaned),
    theoreticalPI: calculatePI(counts),
    aminoAcidComposition: counts,
    aminoAcidPercent: percentages,
    atomicComposition: calculateAtomicComposition(counts),
    extinctionCoefficient: calculateExtinctionCoefficient(counts),
    instabilityIndex: calculateInstabilityIndex(cleaned),
    aliphaticIndex: calculateAliphaticIndex(counts, length),
    gravy: calculateGRAVY(cleaned),
    aromaticity: calculateAromaticity(counts, length),
  };
}
