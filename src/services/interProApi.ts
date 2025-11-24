/**
 * InterProScan API Service
 *
 * Provides comprehensive protein domain analysis using EBI InterProScan 5 REST API
 * Searches multiple databases: Pfam, NCBIfam, TIGRFAM, CDD, SMART, PANTHER
 */

const USE_PROXY = import.meta.env.VITE_USE_INTERPRO_PROXY === 'true';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const INTERPROSCAN_BASE = 'https://www.ebi.ac.uk/Tools/services/rest/iprscan5';
const INTERPRO_API_BASE = 'https://www.ebi.ac.uk/interpro/api';
const INTERPRO_WWWAPI_BASE = 'https://www.ebi.ac.uk/interpro/wwwapi';

export interface InterProMatch {
  signature: {
    accession: string;
    name: string;
    description?: string;
    signatureLibraryRelease?: {
      library: string;
      version?: string;
    };
    entry?: {
      accession: string;
      name: string;
      description?: string;
      type?: string;
    };
  };
  locations: Array<{
    start: number;
    end: number;
    score?: number;
    evalue?: number;
    hmmStart?: number;
    hmmEnd?: number;
    hmmLength?: number;
    hmmBounds?: string;
    envelopeStart?: number;
    envelopeEnd?: number;
  }>;
  evalue?: number;
  score?: number;
  model?: string;
}

export interface InterProResult {
  success: boolean;
  matches: InterProMatch[];
  totalMatches: number;
  sequenceLength: number;
  jobId?: string;
  error?: string;
}

export interface InterProMetadata {
  accession: string;
  name: string | { name: string; short: string };
  type?: string;
  description?: string[];
  literature?: Record<string, any>;
  wikipedia?: {
    title: string;
    extract: string;
    thumbnail?: string;
  };
  entry_annotations?: Record<string, any>;
  set_info?: {
    accession: string;
    name: string;
  };
  counters?: {
    proteins?: number;
    structures?: number;
    taxa?: number;
    proteomes?: number;
    domain_architectures?: number;
    subfamilies?: number;
  };
}

export interface AlignmentSequence {
  name: string;
  sequence: string;
}

/**
 * Submit sequence to InterProScan for domain analysis
 */
export async function submitInterProScan(sequence: string): Promise<InterProResult> {
  try {
    // Clean sequence
    const cleanSeq = sequence.replace(/^>.*$/gm, '').replace(/\s/g, '').toUpperCase();

    if (cleanSeq.length < 10) {
      throw new Error('Sequence too short. Minimum 10 amino acids required.');
    }

    let jobId: string;

    if (USE_PROXY) {
      // Use backend proxy
      const response = await fetch(`${API_BASE_URL}/api/interpro/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: cleanSeq }),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const data = await response.json();
      jobId = data.jobId;
    } else {
      // Direct API call
      const formData = new URLSearchParams();
      formData.append('email', 'anonymous@example.com');
      formData.append('sequence', cleanSeq);
      formData.append('goterms', 'false');
      formData.append('pathways', 'false');

      const response = await fetch(`${INTERPROSCAN_BASE}/run`, {
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
    }

    if (!jobId || jobId.trim() === '') {
      throw new Error('No job ID received from InterProScan');
    }

    console.log('InterProScan job submitted:', jobId);

    // Poll for results
    const results = await pollInterProScan(jobId);

    return {
      success: true,
      matches: results.matches,
      totalMatches: results.matches.length,
      sequenceLength: cleanSeq.length,
      jobId,
    };

  } catch (error) {
    console.error('InterProScan error:', error);
    return {
      success: false,
      matches: [],
      totalMatches: 0,
      sequenceLength: 0,
      error: error instanceof Error ? error.message : 'InterProScan failed',
    };
  }
}

/**
 * Poll InterProScan job status until completion
 */
async function pollInterProScan(jobId: string): Promise<{ matches: InterProMatch[] }> {
  const maxAttempts = 120; // 10 minutes max
  const pollInterval = 5000; // 5 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    let status: string;
    let resultData: any;

    if (USE_PROXY) {
      const response = await fetch(`${API_BASE_URL}/api/interpro/status/${jobId}`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      status = data.status;
      resultData = data.data;
    } else {
      // Check status
      const statusResponse = await fetch(`${INTERPROSCAN_BASE}/status/${jobId}`);

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      status = await statusResponse.text();

      if (status === 'FINISHED') {
        // Fetch results
        const resultResponse = await fetch(`${INTERPROSCAN_BASE}/result/${jobId}/json`);

        if (!resultResponse.ok) {
          throw new Error(`Results fetch failed: ${resultResponse.statusText}`);
        }

        resultData = await resultResponse.json();
      }
    }

    console.log(`InterProScan status (attempt ${attempt + 1}):`, status);

    if (status === 'FINISHED' && resultData) {
      return parseInterProResults(resultData);
    }

    if (status === 'FAILURE' || status === 'ERROR' || status === 'NOT_FOUND') {
      throw new Error(`Job failed with status: ${status}`);
    }
  }

  throw new Error('Job timeout - analysis took too long');
}

/**
 * Parse InterProScan results
 */
function parseInterProResults(data: any): { matches: InterProMatch[] } {
  const matches: InterProMatch[] = [];

  if (!data || !data.results || data.results.length === 0) {
    return { matches };
  }

  const result = data.results[0];
  const resultMatches = result.matches || [];

  for (const match of resultMatches) {
    matches.push({
      signature: match.signature,
      locations: match.locations || [],
      evalue: match.evalue,
      score: match.score,
      model: match.model,
    });
  }

  return { matches };
}

/**
 * Fetch detailed metadata for an InterPro entry
 */
export async function fetchInterProMetadata(
  accession: string,
  database: string = 'pfam'
): Promise<InterProMetadata | null> {
  try {
    const dbPath = database.toLowerCase();
    const url = `${INTERPRO_API_BASE}/entry/${dbPath}/${accession}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 204) {
        throw new Error('No data available - entry may be deprecated');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.metadata || null;

  } catch (error) {
    console.error('InterPro metadata fetch error:', error);
    return null;
  }
}

/**
 * Fetch seed alignment for a Pfam/NCBIfam entry
 */
export async function fetchSeedAlignment(
  accession: string,
  database: string = 'pfam'
): Promise<AlignmentSequence[] | null> {
  try {
    const dbPath = database.toLowerCase();

    // Try InterPro wwwapi endpoint (returns gzipped Stockholm format)
    const alignmentUrl = `${INTERPRO_WWWAPI_BASE}/entry/${dbPath}/${accession}/?annotation=alignment:seed&download`;

    console.log('Fetching alignment from:', alignmentUrl);

    const response = await fetch(alignmentUrl);

    if (!response.ok) {
      // Fallback to Pfam for Pfam entries
      if (database.toLowerCase() === 'pfam') {
        return await fetchPfamAlignment(accession);
      }
      throw new Error(`Alignment fetch failed: ${response.status}`);
    }

    // Decompress gzip if browser supports it
    if ('DecompressionStream' in window) {
      const blob = await response.blob();
      const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBlob = await new Response(decompressedStream).blob();
      const alignmentData = await decompressedBlob.text();

      console.log('Alignment data decompressed');
      return parseAlignment(alignmentData);
    } else {
      // Browser doesn't support DecompressionStream
      if (database.toLowerCase() === 'pfam') {
        return await fetchPfamAlignment(accession);
      }
      throw new Error('Browser does not support gzip decompression');
    }

  } catch (error) {
    console.error('Alignment fetch error:', error);
    return null;
  }
}

/**
 * Fetch alignment from Pfam (fallback)
 */
async function fetchPfamAlignment(accession: string): Promise<AlignmentSequence[] | null> {
  try {
    const url = `https://pfam.xfam.org/family/${accession}/alignment/seed/format?format=fasta&alnType=seed&order=a&case=l&gaps=default&download=0`;

    console.log('Trying Pfam fallback:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Pfam fetch failed: ${response.status}`);
    }

    const data = await response.text();
    return parseAlignment(data);

  } catch (error) {
    console.error('Pfam fallback error:', error);
    return null;
  }
}

/**
 * Parse alignment data (FASTA or Stockholm format)
 */
export function parseAlignment(data: string): AlignmentSequence[] {
  const sequences: AlignmentSequence[] = [];

  // Try FASTA format first
  if (data.includes('>')) {
    const lines = data.split('\n');
    let currentSeq: AlignmentSequence | null = null;

    for (const line of lines) {
      if (line.startsWith('>')) {
        if (currentSeq) {
          sequences.push(currentSeq);
        }
        currentSeq = { name: line.substring(1).trim(), sequence: '' };
      } else if (currentSeq && line.trim()) {
        currentSeq.sequence += line.trim().toUpperCase();
      }
    }

    if (currentSeq) {
      sequences.push(currentSeq);
    }
  }
  // Try Stockholm format
  else if (data.includes('# STOCKHOLM')) {
    const lines = data.split('\n');
    const seqMap: Record<string, string> = {};

    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('//') || !line.trim()) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const seq = parts[1];

        if (!seqMap[name]) {
          seqMap[name] = '';
        }
        seqMap[name] += seq.toUpperCase();
      }
    }

    for (const [name, sequence] of Object.entries(seqMap)) {
      sequences.push({ name, sequence });
    }
  }

  return sequences;
}

/**
 * Helper function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
