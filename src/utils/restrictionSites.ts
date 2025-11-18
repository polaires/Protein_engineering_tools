/**
 * Restriction Sites Module
 * Converted from Rust (restriction.rs)
 *
 * Finds and removes restriction enzyme sites from DNA sequences
 */

import { RestrictionData, RestrictionSite, CodonUsageData } from '../types/codon';
import { calculateRelativeAdaptiveness } from '../data/codonData';
import { getSortedCodonsByWi } from './codonOptimizer';
import { calculateCAI } from './caiCalculator';
import restrictionEnzymesJSON from '../data/restriction_enzymes.json';

/**
 * Load restriction enzyme data from JSON
 *
 * @returns Restriction enzyme data
 */
export function loadRestrictionData(): RestrictionData {
  return restrictionEnzymesJSON as RestrictionData;
}

/**
 * Find all restriction sites in a DNA sequence
 *
 * @param dnaSequence - DNA sequence to search
 * @param restrictionData - Restriction enzyme data
 * @returns Array of restriction sites found
 */
export function findRestrictionSites(
  dnaSequence: string,
  restrictionData: RestrictionData
): RestrictionSite[] {
  return findRestrictionSitesFiltered(dnaSequence, restrictionData, null);
}

/**
 * Find restriction sites with optional enzyme filtering
 *
 * @param dnaSequence - DNA sequence to search
 * @param restrictionData - Restriction enzyme data
 * @param selectedEnzymes - Optional list of enzyme names to search for
 * @returns Array of restriction sites found
 */
export function findRestrictionSitesFiltered(
  dnaSequence: string,
  restrictionData: RestrictionData,
  selectedEnzymes: string[] | null
): RestrictionSite[] {
  const sites: RestrictionSite[] = [];
  const seqUpper = dnaSequence.toUpperCase();

  for (const [enzymeName, enzyme] of Object.entries(restrictionData.enzymes)) {
    // Filter by selected enzymes if provided
    if (selectedEnzymes && !selectedEnzymes.includes(enzymeName)) {
      continue;
    }

    const site = enzyme.recognition_site;

    // Skip sites with regex patterns (simplified for now)
    if (site.includes('[') || site.includes('N') || site.includes('R') || site.includes('Y')) {
      continue;
    }

    // Find all occurrences
    let pos = 0;
    while (true) {
      const foundPos = seqUpper.indexOf(site, pos);
      if (foundPos === -1) break;

      sites.push({
        position: foundPos,
        enzyme: enzymeName,
        sequence: site,
      });

      pos = foundPos + 1;
    }
  }

  // Only check simplified sites if no enzyme filter is applied
  if (!selectedEnzymes) {
    for (const site of restrictionData.simplified_sites) {
      let pos = 0;
      while (true) {
        const foundPos = seqUpper.indexOf(site, pos);
        if (foundPos === -1) break;

        // Check if this site is already recorded
        const alreadyFound = sites.some(
          (s) => s.position === foundPos && s.sequence === site
        );

        if (!alreadyFound) {
          sites.push({
            position: foundPos,
            enzyme: 'Unknown',
            sequence: site,
          });
        }

        pos = foundPos + 1;
      }
    }
  }

  sites.sort((a, b) => a.position - b.position);
  return sites;
}

/**
 * Remove restriction sites from an optimized sequence
 * This is done by replacing codons with suboptimal alternatives
 *
 * @param dnaSequence - DNA sequence
 * @param proteinSequence - Protein sequence
 * @param codonUsage - Codon usage data
 * @param restrictionData - Restriction enzyme data
 * @param selectedEnzymes - Optional list of enzyme names to remove
 * @returns Modified DNA sequence with sites removed
 */
export function removeRestrictionSites(
  dnaSequence: string,
  proteinSequence: string,
  codonUsage: CodonUsageData,
  restrictionData: RestrictionData,
  selectedEnzymes: string[] | null = null
): string {
  let currentSequence = dnaSequence.toUpperCase();
  const w_i_table = calculateRelativeAdaptiveness(codonUsage);

  const maxIterations = 100;
  let iteration = 0;

  while (true) {
    iteration++;
    if (iteration > maxIterations) {
      throw new Error('Maximum iterations reached while removing restriction sites');
    }

    // Find all restriction sites in current sequence (filtered by selected enzymes)
    const sites = findRestrictionSitesFiltered(currentSequence, restrictionData, selectedEnzymes);

    if (sites.length === 0) {
      break; // No more restriction sites
    }

    // Try to remove the first site
    const site = sites[0];
    const siteStart = site.position;
    const siteEnd = site.position + site.sequence.length;

    // Find which codons overlap with the restriction site
    const codonStart = Math.floor(siteStart / 3) * 3;
    const codonEnd = Math.ceil(siteEnd / 3) * 3;

    // Get the affected codons and their amino acids
    const numCodons = (codonEnd - codonStart) / 3;
    const aaStart = codonStart / 3;

    if (aaStart + numCodons > proteinSequence.length) {
      throw new Error('Restriction site extends beyond sequence length');
    }

    // Try alternative codons for each affected position
    let bestAlternative: string | null = null;
    let bestCAI = 0;

    // Try changing each codon individually
    for (let i = 0; i < numCodons; i++) {
      const aaPos = aaStart + i;
      const aa = proteinSequence.charAt(aaPos);
      const aaStr = aa;

      // Get sorted codons by w_i
      const sortedCodons = getSortedCodonsByWi(aaStr, w_i_table, codonUsage);

      // Try each alternative codon (skip the first, which is the current optimal one)
      for (let j = 1; j < sortedCodons.length; j++) {
        const [altCodon] = sortedCodons[j];
        const testSequence =
          currentSequence.substring(0, aaPos * 3) +
          altCodon +
          currentSequence.substring(aaPos * 3 + 3);

        // Check if this removes the restriction site
        const testSites = findRestrictionSitesFiltered(testSequence, restrictionData, selectedEnzymes);
        const siteRemoved = !testSites.some((s) => s.position === siteStart);

        if (siteRemoved) {
          // Calculate CAI for this alternative
          try {
            const caiResult = calculateCAI(testSequence, codonUsage);
            if (caiResult.cai > bestCAI) {
              bestCAI = caiResult.cai;
              bestAlternative = testSequence;
            }
          } catch (e) {
            // Ignore invalid sequences
            continue;
          }
        }
      }
    }

    // Try changing multiple codons simultaneously if single changes didn't work
    if (bestAlternative === null) {
      bestAlternative = tryMultipleCodonChanges(
        currentSequence,
        proteinSequence,
        codonStart,
        codonEnd,
        siteStart,
        w_i_table,
        codonUsage,
        restrictionData,
        selectedEnzymes
      );
    }

    if (bestAlternative) {
      currentSequence = bestAlternative;
    } else {
      throw new Error(`Could not remove restriction site ${site.enzyme} at position ${site.position}`);
    }
  }

  return currentSequence;
}

/**
 * Try changing multiple codons simultaneously to remove a restriction site
 */
function tryMultipleCodonChanges(
  currentSequence: string,
  proteinSequence: string,
  codonStart: number,
  codonEnd: number,
  sitePosition: number,
  w_i_table: Record<string, number>,
  codonUsage: CodonUsageData,
  restrictionData: RestrictionData,
  selectedEnzymes: string[] | null
): string | null {
  const numCodons = (codonEnd - codonStart) / 3;
  const aaStart = codonStart / 3;

  // Limit complexity for larger regions
  if (numCodons > 3) {
    return null;
  }

  // Get all amino acids in the region
  const aaPositions: Array<[number, string]> = [];
  for (let i = 0; i < numCodons; i++) {
    const aaPos = aaStart + i;
    if (aaPos < proteinSequence.length) {
      const aa = proteinSequence.charAt(aaPos);
      aaPositions.push([aaPos, aa]);
    }
  }

  // Get alternative codons for each position
  const alternatives: string[][] = [];
  for (const [, aaStr] of aaPositions) {
    const sortedCodons = getSortedCodonsByWi(aaStr, w_i_table, codonUsage);
    const codonOptions = sortedCodons.slice(0, 3).map(([codon]) => codon); // Take top 3 alternatives
    alternatives.push(codonOptions);
  }

  // Try combinations (limited to prevent explosion)
  const maxCombinations = 50;
  let tried = 0;

  const combinations = generateCombinations(alternatives);

  for (const combo of combinations) {
    if (tried >= maxCombinations) {
      break;
    }
    tried++;

    let testSequence = currentSequence;
    for (let i = 0; i < combo.length; i++) {
      const altCodon = combo[i];
      const aaPos = aaPositions[i][0];
      testSequence =
        testSequence.substring(0, aaPos * 3) +
        altCodon +
        testSequence.substring(aaPos * 3 + 3);
    }

    // Check if this removes the restriction site
    const testSites = findRestrictionSitesFiltered(testSequence, restrictionData, selectedEnzymes);
    const siteRemoved = !testSites.some((s) => s.position === sitePosition);

    if (siteRemoved) {
      return testSequence;
    }
  }

  return null;
}

/**
 * Generate combinations of codon alternatives (simplified)
 */
function generateCombinations(alternatives: string[][]): string[][] {
  if (alternatives.length === 0) {
    return [[]];
  }

  const result: string[][] = [];
  const first = alternatives[0];
  const rest = alternatives.slice(1);

  const restCombos = generateCombinations(rest);

  for (const item of first) {
    for (const combo of restCombos) {
      result.push([item, ...combo]);
    }
  }

  return result;
}
