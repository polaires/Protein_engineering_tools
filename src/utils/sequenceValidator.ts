/**
 * Sequence Validator
 * Validates DNA and protein sequences
 */

/**
 * Validate DNA sequence
 * @param sequence - DNA sequence to validate
 * @returns true if valid, false otherwise
 */
export function isValidDNA(sequence: string): boolean {
  const cleanSeq = sequence.toUpperCase().replace(/\s/g, '');
  return /^[ATGC]+$/.test(cleanSeq);
}

/**
 * Validate protein sequence
 * @param sequence - Protein sequence to validate
 * @returns true if valid, false otherwise
 */
export function isValidProtein(sequence: string): boolean {
  const cleanSeq = sequence.toUpperCase().replace(/\s/g, '');
  return /^[ACDEFGHIKLMNPQRSTVWY*]+$/.test(cleanSeq);
}

/**
 * Clean sequence by removing whitespace and converting to uppercase
 * @param sequence - Sequence to clean
 * @returns Cleaned sequence
 */
export function cleanSequence(sequence: string): string {
  return sequence.toUpperCase().replace(/\s/g, '').replace(/\n/g, '');
}

/**
 * Detect sequence type (DNA or Protein)
 * @param sequence - Sequence to analyze
 * @returns 'dna', 'protein', or 'unknown'
 */
export function detectSequenceType(sequence: string): 'dna' | 'protein' | 'unknown' {
  const clean = cleanSequence(sequence);

  if (isValidDNA(clean)) {
    return 'dna';
  } else if (isValidProtein(clean)) {
    return 'protein';
  }

  return 'unknown';
}

/**
 * Calculate sequence length (excluding whitespace)
 * @param sequence - Sequence to measure
 * @returns Length of sequence
 */
export function getSequenceLength(sequence: string): number {
  return cleanSequence(sequence).length;
}
