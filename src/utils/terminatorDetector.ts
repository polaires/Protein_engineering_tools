/**
 * Terminator Detector Module
 * Converted from Rust (terminator.rs)
 *
 * Detects and removes Rho-independent terminators in DNA sequences
 * Based on Ermolaeva et al. (2000) algorithm
 * Looks for: stem-loop structure + poly-U tail
 */

import { Terminator, StemLoop, CodonUsageData } from '../types/codon';
import { calculateRelativeAdaptiveness } from '../data/codonData';
import { getSortedCodonsByWi } from './codonOptimizer';

/**
 * Detect Rho-independent terminators in a DNA sequence
 *
 * @param dnaSequence - DNA sequence to search
 * @returns Array of terminators found
 */
export function detectTerminators(dnaSequence: string): Terminator[] {
  const terminators: Terminator[] = [];
  const seqUpper = dnaSequence.toUpperCase();

  // Convert to RNA for analysis (T -> U)
  const rnaSequence = seqUpper.replace(/T/g, 'U');

  // Scan for poly-U/T tails (4+ consecutive U's/T's)
  const polyUPositions = findPolyUTails(seqUpper);

  // For each poly-U tail, look upstream for stem-loop structure
  for (const polyUPos of polyUPositions) {
    // Search 10-60 bp upstream for stem-loop
    const searchStart = polyUPos >= 60 ? polyUPos - 60 : 0;
    const searchEnd = polyUPos >= 10 ? polyUPos - 1 : 0;

    if (searchStart >= searchEnd) {
      continue;
    }

    const searchRegion = rnaSequence.substring(searchStart, searchEnd);

    // Look for inverted repeats (stem-loop)
    const stemLoop = findStemLoop(searchRegion, searchStart);

    if (stemLoop) {
      // Check if free energy is below threshold (-10 kcal/mol)
      if (stemLoop.free_energy < -10.0) {
        terminators.push({
          position: stemLoop.stem_start,
          stem_start: stemLoop.stem_start,
          stem_end: stemLoop.stem_end,
          poly_u_start: polyUPos,
          poly_u_end: polyUPos + 4,
          free_energy: stemLoop.free_energy,
          sequence: seqUpper.substring(stemLoop.stem_start, polyUPos + 4),
        });
      }
    }
  }

  return terminators;
}

/**
 * Find poly-U/T tails (4+ consecutive U's or T's)
 */
function findPolyUTails(sequence: string): number[] {
  const positions: number[] = [];
  const chars = Array.from(sequence);

  let count = 0;
  let start = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === 'T' || ch === 'U') {
      if (count === 0) {
        start = i;
      }
      count++;
    } else {
      if (count >= 4) {
        positions.push(start);
      }
      count = 0;
    }
  }

  if (count >= 4) {
    positions.push(start);
  }

  return positions;
}

/**
 * Find stem-loop structures (inverted repeats)
 */
function findStemLoop(sequence: string, offset: number): StemLoop | null {
  const minStemLength = 7;
  const maxStemLength = 20;
  const minLoopSize = 3;
  const maxLoopSize = 10;

  const chars = Array.from(sequence);

  // Try different stem lengths
  for (let stemLen = minStemLength; stemLen <= Math.min(maxStemLength, Math.floor(chars.length / 2)); stemLen++) {
    // Try different loop sizes
    for (let loopSize = minLoopSize; loopSize <= maxLoopSize; loopSize++) {
      // Check if we have enough sequence
      if (stemLen * 2 + loopSize > chars.length) {
        continue;
      }

      // Try different starting positions
      for (let start = 0; start < chars.length; start++) {
        if (start + stemLen * 2 + loopSize > chars.length) {
          break;
        }

        const stem1End = start + stemLen;
        const loopEnd = stem1End + loopSize;
        const stem2End = loopEnd + stemLen;

        const stem1 = chars.slice(start, stem1End);
        const stem2 = chars.slice(loopEnd, stem2End);

        // Check if stem2 is reverse complement of stem1
        const [matches, gcCount] = checkStemComplementarity(stem1, stem2);

        // Require at least 70% complementarity and high GC content
        const matchRatio = matches / stemLen;
        const gcRatio = gcCount / stemLen;

        if (matchRatio >= 0.7 && gcRatio >= 0.5) {
          // Estimate free energy (simplified)
          // GC pairs: -3 kcal/mol, AU pairs: -2 kcal/mol
          const freeEnergy = -(gcCount * 3.0 + (matches - gcCount) * 2.0);

          return {
            stem_start: offset + start,
            stem_end: offset + stem2End,
            free_energy: freeEnergy,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Check if two stems are complementary (reverse complement)
 */
function checkStemComplementarity(stem1: string[], stem2: string[]): [number, number] {
  if (stem1.length !== stem2.length) {
    return [0, 0];
  }

  let matches = 0;
  let gcPairs = 0;

  for (let i = 0; i < stem1.length; i++) {
    const base1 = stem1[i];
    const base2 = stem2[stem2.length - 1 - i]; // Reverse

    if (isComplementary(base1, base2)) {
      matches++;
      if ((base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) {
        gcPairs++;
      }
    }
  }

  return [matches, gcPairs];
}

/**
 * Check if two bases are complementary
 */
function isComplementary(base1: string, base2: string): boolean {
  // Map base pairs for RNA/DNA
  if ((base1 === 'A' && base2 === 'U') || (base1 === 'U' && base2 === 'A')) return true;
  if ((base1 === 'A' && base2 === 'T') || (base1 === 'T' && base2 === 'A')) return true;
  if ((base1 === 'G' && base2 === 'C') || (base1 === 'C' && base2 === 'G')) return true;
  return false;
}

/**
 * Remove terminators from sequence by replacing codons
 *
 * @param dnaSequence - DNA sequence
 * @param proteinSequence - Protein sequence
 * @param codonUsage - Codon usage data
 * @returns Modified DNA sequence with terminators removed
 */
export function removeTerminators(
  dnaSequence: string,
  proteinSequence: string,
  codonUsage: CodonUsageData
): string {
  let currentSequence = dnaSequence;
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);

  const maxIterations = 50;
  let iteration = 0;

  while (true) {
    iteration++;
    if (iteration > maxIterations) {
      throw new Error('Maximum iterations reached while removing terminators');
    }

    const terminators = detectTerminators(currentSequence);

    if (terminators.length === 0) {
      break;
    }

    // Try to remove the first terminator
    const terminator = terminators[0];

    // Focus on disrupting the poly-U tail first (easier)
    const polyUCodonStart = Math.floor(terminator.poly_u_start / 3) * 3;
    const polyUCodonEnd = Math.ceil(terminator.poly_u_end / 3) * 3;

    let modified = false;

    // Try to replace T's in poly-U region with alternative codons
    for (let codonPos = polyUCodonStart; codonPos < polyUCodonEnd; codonPos += 3) {
      const aaPos = codonPos / 3;

      if (aaPos >= proteinSequence.length) {
        continue;
      }

      const aa = proteinSequence.charAt(aaPos);
      const aaStr = aa;

      const sortedCodons = getSortedCodonsByWi(aaStr, w_i_table, codonUsage);

      // Try alternative codons that have fewer T's
      for (const [altCodon] of sortedCodons) {
        const tCount = Array.from(altCodon).filter((c) => c === 'T').length;
        const currentCodon = currentSequence.substring(codonPos, codonPos + 3);
        const currentTCount = Array.from(currentCodon).filter((c) => c === 'T').length;

        if (tCount < currentTCount) {
          currentSequence =
            currentSequence.substring(0, codonPos) +
            altCodon +
            currentSequence.substring(codonPos + 3);
          modified = true;
          break;
        }
      }

      if (modified) {
        break;
      }
    }

    if (!modified) {
      // If we couldn't modify the poly-U tail, try the stem region
      const stemCodonStart = Math.floor(terminator.stem_start / 3) * 3;
      const stemCodonEnd = Math.ceil(terminator.stem_end / 3) * 3;

      for (
        let codonPos = stemCodonStart;
        codonPos < Math.min(stemCodonEnd, currentSequence.length);
        codonPos += 3
      ) {
        const aaPos = codonPos / 3;

        if (aaPos >= proteinSequence.length) {
          break;
        }

        const aa = proteinSequence.charAt(aaPos);
        const aaStr = aa;

        const sortedCodons = getSortedCodonsByWi(aaStr, w_i_table, codonUsage);

        // Try second-best codon
        if (sortedCodons.length > 1) {
          const altCodon = sortedCodons[1][0];
          currentSequence =
            currentSequence.substring(0, codonPos) +
            altCodon +
            currentSequence.substring(codonPos + 3);
          modified = true;
          break;
        }
      }
    }

    if (!modified) {
      throw new Error(`Could not remove terminator at position ${terminator.position}`);
    }
  }

  return currentSequence;
}
