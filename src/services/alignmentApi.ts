/**
 * Multiple Sequence Alignment API Service
 *
 * Provides access to EBI's MUSCLE and Clustal Omega alignment tools
 * via REST API
 *
 * Documentation: https://www.ebi.ac.uk/jdispatcher/docs/webservices/
 * GitHub: https://github.com/ebi-jdispatcher/webservice-clients
 */

const USE_PROXY = import.meta.env.VITE_USE_ALIGNMENT_PROXY === 'true';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// EBI REST API base URLs
const MUSCLE_BASE = 'https://www.ebi.ac.uk/Tools/services/rest/muscle';
const CLUSTALO_BASE = 'https://www.ebi.ac.uk/Tools/services/rest/clustalo';

export type AlignmentTool = 'muscle' | 'clustalo';

export interface AlignmentSequence {
  id: string;
  sequence: string;
}

export interface AlignmentResult {
  success: boolean;
  jobId?: string;
  alignment?: string; // Aligned sequences in FASTA or Clustal format
  alignmentFormat?: 'fasta' | 'clustal' | 'phylip';
  tool: AlignmentTool;
  sequenceCount: number;
  alignmentLength?: number;
  error?: string;
}

/**
 * Submit sequences for multiple sequence alignment
 */
export async function submitAlignment(
  sequences: AlignmentSequence[],
  tool: AlignmentTool = 'muscle',
  email: string = 'anonymous@example.com'
): Promise<AlignmentResult> {
  try {
    if (sequences.length < 2) {
      throw new Error('At least 2 sequences required for alignment');
    }

    // Format sequences as FASTA
    const fastaSequences = sequences
      .map(seq => `>${seq.id}\n${seq.sequence}`)
      .join('\n');

    console.log(`Submitting ${sequences.length} sequences to ${tool.toUpperCase()}`);

    let jobId: string;

    if (USE_PROXY) {
      // Use backend proxy
      const response = await fetch(`${API_BASE_URL}/api/alignment/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequences: fastaSequences,
          tool,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const data = await response.json();
      jobId = data.jobId;
    } else {
      // Direct API call
      const baseUrl = tool === 'muscle' ? MUSCLE_BASE : CLUSTALO_BASE;
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('sequence', fastaSequences);
      formData.append('format', 'fasta'); // Output format
      formData.append('order', 'aligned'); // Keep aligned order

      const response = await fetch(`${baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/plain',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      jobId = await response.text();
      jobId = jobId.trim(); // Remove any whitespace
    }

    console.log(`${tool.toUpperCase()} job submitted:`, jobId);

    // Poll for results
    const alignmentData = await pollAlignment(jobId, tool);

    return {
      success: true,
      jobId,
      alignment: alignmentData.alignment,
      alignmentFormat: alignmentData.format,
      tool,
      sequenceCount: sequences.length,
      alignmentLength: alignmentData.length,
    };
  } catch (error) {
    console.error('Alignment submission error:', error);
    return {
      success: false,
      tool,
      sequenceCount: sequences.length,
      error: error instanceof Error ? error.message : 'Alignment failed',
    };
  }
}

/**
 * Poll alignment job until completion
 */
async function pollAlignment(
  jobId: string,
  tool: AlignmentTool
): Promise<{ alignment: string; format: 'fasta' | 'clustal'; length: number }> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    let status: string;
    let alignment: string | null = null;

    if (USE_PROXY) {
      const response = await fetch(
        `${API_BASE_URL}/api/alignment/status/${jobId}?tool=${tool}`
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      status = data.status;
      alignment = data.alignment;
    } else {
      // Check status directly
      const baseUrl = tool === 'muscle' ? MUSCLE_BASE : CLUSTALO_BASE;
      const statusResponse = await fetch(`${baseUrl}/status/${jobId}`);

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      status = await statusResponse.text();
      status = status.trim();

      if (status === 'FINISHED') {
        // Fetch results - try different result types
        const resultTypes = ['aln-fasta', 'fasta', 'aln-clustal', 'clustal'];

        for (const resultType of resultTypes) {
          try {
            const resultResponse = await fetch(`${baseUrl}/result/${jobId}/${resultType}`);
            if (resultResponse.ok) {
              alignment = await resultResponse.text();
              break;
            }
          } catch (e) {
            // Try next result type
            continue;
          }
        }
      }
    }

    console.log(`${tool.toUpperCase()} status (attempt ${attempt + 1}):`, status);

    if (status === 'FINISHED' && alignment) {
      // Parse alignment to get length
      const lines = alignment.split('\n').filter(line => !line.startsWith('>'));
      const firstSeqLine = lines.find(line => line.trim().length > 0);
      const length = firstSeqLine ? firstSeqLine.trim().length : 0;

      // Detect format
      const format = alignment.includes('CLUSTAL') ? 'clustal' : 'fasta';

      return { alignment, format, length };
    }

    if (status === 'FAILURE' || status === 'ERROR' || status === 'NOT_FOUND') {
      throw new Error(`Job failed with status: ${status}`);
    }
  }

  throw new Error('Job timeout - alignment took too long');
}

/**
 * Parse aligned FASTA format to extract sequences
 */
export function parseAlignedFasta(fastaText: string): Array<{ id: string; sequence: string }> {
  const sequences: Array<{ id: string; sequence: string }> = [];
  const lines = fastaText.split('\n');
  let currentSeq: { id: string; sequence: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('>')) {
      if (currentSeq) {
        sequences.push(currentSeq);
      }
      currentSeq = { id: line.substring(1).trim(), sequence: '' };
    } else if (currentSeq && line.trim()) {
      currentSeq.sequence += line.trim().toUpperCase();
    }
  }

  if (currentSeq) {
    sequences.push(currentSeq);
  }

  return sequences;
}

/**
 * Parse Clustal format alignment
 */
export function parseClustalAlignment(clustalText: string): Array<{ id: string; sequence: string }> {
  const sequences: Map<string, string> = new Map();
  const lines = clustalText.split('\n');

  for (const line of lines) {
    // Skip header, conservation line, and empty lines
    if (
      line.startsWith('CLUSTAL') ||
      line.trim() === '' ||
      line.trim().match(/^[\s*:.]+$/)
    ) {
      continue;
    }

    // Parse sequence lines: ID followed by sequence
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const id = parts[0];
      const seqPart = parts[1];

      if (!sequences.has(id)) {
        sequences.set(id, '');
      }
      sequences.set(id, sequences.get(id)! + seqPart.toUpperCase());
    }
  }

  return Array.from(sequences.entries()).map(([id, sequence]) => ({ id, sequence }));
}

/**
 * Helper function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get alignment from Pfam domain sequences
 * Automatically extracts sequences from Pfam results
 */
export async function alignFromPfamDomains(
  querySequence: string,
  pfamAccession: string,
  pfamSequences: Array<{ name: string; sequence: string }>,
  tool: AlignmentTool = 'muscle'
): Promise<AlignmentResult> {
  // Combine query sequence with Pfam sequences
  const sequences: AlignmentSequence[] = [
    { id: 'Query', sequence: querySequence },
    ...pfamSequences.slice(0, 20).map((seq, idx) => ({
      id: seq.name || `${pfamAccession}_${idx + 1}`,
      sequence: seq.sequence.replace(/-/g, ''), // Remove gaps
    })),
  ];

  return submitAlignment(sequences, tool);
}
