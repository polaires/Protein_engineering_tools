/**
 * FASTA Parser
 * Parse and format FASTA files
 */

export interface FastaEntry {
  header: string;
  sequence: string;
}

/**
 * Parse FASTA format text
 * @param fastaText - FASTA format text
 * @returns Array of FASTA entries
 */
export function parseFasta(fastaText: string): FastaEntry[] {
  const entries: FastaEntry[] = [];
  const lines = fastaText.split('\n');

  let currentHeader = '';
  let currentSequence = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) {
      // New entry
      if (currentHeader) {
        entries.push({
          header: currentHeader,
          sequence: currentSequence,
        });
      }
      currentHeader = trimmed.substring(1);
      currentSequence = '';
    } else if (trimmed) {
      // Sequence line
      currentSequence += trimmed;
    }
  }

  // Add last entry
  if (currentHeader) {
    entries.push({
      header: currentHeader,
      sequence: currentSequence,
    });
  }

  return entries;
}

/**
 * Format sequence as FASTA
 * @param header - FASTA header (without '>')
 * @param sequence - Sequence
 * @param lineWidth - Width of sequence lines (default 60)
 * @returns FASTA formatted string
 */
export function formatFasta(header: string, sequence: string, lineWidth: number = 60): string {
  let fasta = `>${header}\n`;

  for (let i = 0; i < sequence.length; i += lineWidth) {
    fasta += sequence.substring(i, i + lineWidth) + '\n';
  }

  return fasta;
}

/**
 * Check if text is in FASTA format
 * @param text - Text to check
 * @returns true if FASTA format
 */
export function isFastaFormat(text: string): boolean {
  return text.trim().startsWith('>');
}

/**
 * Extract sequence from FASTA or plain text
 * @param text - Input text
 * @returns Extracted sequence
 */
export function extractSequence(text: string): string {
  if (isFastaFormat(text)) {
    const entries = parseFasta(text);
    return entries.length > 0 ? entries[0].sequence : '';
  }
  return text;
}
