/**
 * HMMER/Pfam API Service
 *
 * Provides functions to search protein sequences against the Pfam database
 * using the HMMER web API (https://hmmer-web-docs.readthedocs.io/en/latest/api.html)
 */

export interface PfamDomain {
  acc: string;           // Pfam accession (e.g., PF00001)
  name: string;          // Pfam ID/name (e.g., 7tm_1)
  type: string;          // Domain type (e.g., "Family", "Domain", "Repeat")
  description: string;   // Domain description
  start: number;         // Start position in sequence
  end: number;           // End position in sequence
  ali_start: number;     // Alignment start in HMM
  ali_end: number;       // Alignment end in HMM
  evalue: number;        // E-value
  bitscore: number;      // Bit score
  envelope_start: number;
  envelope_end: number;
}

export interface PfamSearchResult {
  success: boolean;
  domains: PfamDomain[];
  sequence: string;
  sequenceLength: number;
  searchTime?: number;
  error?: string;
}

interface HmmerSearchResponse {
  results?: {
    hits?: Array<{
      acc?: string;
      name?: string;
      desc?: string;
      evalue?: number;
      score?: number;
      domains?: Array<{
        ienv?: number;
        jenv?: number;
        iali?: number;
        jali?: number;
        bitscore?: number;
        cevalue?: number;
      }>;
    }>;
  };
  stats?: {
    nincluded?: number;
  };
}

const HMMER_API_BASE = 'https://www.ebi.ac.uk/Tools/hmmer';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_RETRIES = 60; // Maximum 2 minutes of polling

// Use backend proxy if CORS issues occur
const USE_PROXY = import.meta.env.VITE_USE_HMMER_PROXY === 'true';
const PROXY_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Search a protein sequence against the Pfam database
 * @param sequence - Protein sequence (amino acids)
 * @returns Promise<PfamSearchResult>
 */
export async function searchPfam(sequence: string): Promise<PfamSearchResult> {
  const startTime = Date.now();

  try {
    // Validate sequence
    const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
    if (!cleanSequence || !/^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(cleanSequence)) {
      return {
        success: false,
        domains: [],
        sequence: cleanSequence,
        sequenceLength: cleanSequence.length,
        error: 'Invalid protein sequence. Only standard amino acid letters are allowed.',
      };
    }

    // Submit search to HMMER
    const jobId = await submitHmmerSearch(cleanSequence);

    // Poll for results
    const results = await pollHmmerResults(jobId);

    // Parse domains
    const domains = parseHmmerDomains(results);

    const searchTime = Date.now() - startTime;

    return {
      success: true,
      domains,
      sequence: cleanSequence,
      sequenceLength: cleanSequence.length,
      searchTime,
    };

  } catch (error) {
    console.error('Pfam search error:', error);
    return {
      success: false,
      domains: [],
      sequence: sequence.replace(/\s/g, ''),
      sequenceLength: sequence.replace(/\s/g, '').length,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Submit a search to HMMER API
 */
async function submitHmmerSearch(sequence: string): Promise<string> {
  const formData = new FormData();
  formData.append('seq', sequence);
  formData.append('seqdb', 'pdb'); // Search against PDB sequences to find Pfam matches

  const response = await fetch(`${HMMER_API_BASE}/search/phmmer`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HMMER API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.job || !data.job.id) {
    throw new Error('Failed to get job ID from HMMER API');
  }

  return data.job.id;
}

/**
 * Poll HMMER API for results
 */
async function pollHmmerResults(jobId: string, retries = 0): Promise<HmmerSearchResponse> {
  if (retries >= MAX_RETRIES) {
    throw new Error('HMMER search timed out. Please try again.');
  }

  const response = await fetch(`${HMMER_API_BASE}/results/${jobId}/score`);

  if (response.status === 200) {
    const data = await response.json();
    return data;
  } else if (response.status === 202) {
    // Job still running, wait and retry
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    return pollHmmerResults(jobId, retries + 1);
  } else {
    throw new Error(`HMMER API error: ${response.status} ${response.statusText}`);
  }
}

/**
 * Parse HMMER results to extract Pfam domains
 */
function parseHmmerDomains(results: HmmerSearchResponse): PfamDomain[] {
  const domains: PfamDomain[] = [];

  if (!results.results || !results.results.hits) {
    return domains;
  }

  for (const hit of results.results.hits) {
    if (!hit.domains) continue;

    for (const domain of hit.domains) {
      domains.push({
        acc: hit.acc || 'Unknown',
        name: hit.name || 'Unknown',
        type: 'Domain',
        description: hit.desc || '',
        start: domain.ienv || 0,
        end: domain.jenv || 0,
        ali_start: domain.iali || 0,
        ali_end: domain.jali || 0,
        evalue: domain.cevalue || 0,
        bitscore: domain.bitscore || 0,
        envelope_start: domain.ienv || 0,
        envelope_end: domain.jenv || 0,
      });
    }
  }

  // Sort by position
  domains.sort((a, b) => a.start - b.start);

  return domains;
}

/**
 * Alternative: Search using hmmscan against Pfam-A
 * This is the more common approach for finding Pfam domains
 */
export async function searchPfamDomains(sequence: string): Promise<PfamSearchResult> {
  if (USE_PROXY) {
    return searchPfamDomainsViaProxy(sequence);
  }

  const startTime = Date.now();

  try {
    // Validate sequence
    const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
    if (!cleanSequence || !/^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(cleanSequence)) {
      return {
        success: false,
        domains: [],
        sequence: cleanSequence,
        sequenceLength: cleanSequence.length,
        error: 'Invalid protein sequence. Only standard amino acid letters are allowed.',
      };
    }

    // Submit search using hmmscan against Pfam
    const formData = new FormData();
    formData.append('seq', `>query\n${cleanSequence}`);
    formData.append('hmmdb', 'pfam');

    const submitResponse = await fetch(`${HMMER_API_BASE}/api/v1/search/hmmscan`, {
      method: 'POST',
      body: formData,
    });

    if (!submitResponse.ok) {
      throw new Error(`HMMER API error: ${submitResponse.status} ${submitResponse.statusText}`);
    }

    const submitData = await submitResponse.json();

    if (!submitData.job || !submitData.job.id) {
      throw new Error('Failed to get job ID from HMMER API');
    }

    const jobId = submitData.job.id;

    // Poll for results
    let retries = 0;
    let resultsData: any = null;

    while (retries < MAX_RETRIES) {
      const pollResponse = await fetch(`${HMMER_API_BASE}/api/v1/results/${jobId}/score`);

      if (pollResponse.status === 200) {
        resultsData = await pollResponse.json();
        break;
      } else if (pollResponse.status === 202) {
        // Still running
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        retries++;
      } else {
        throw new Error(`HMMER API error: ${pollResponse.status} ${pollResponse.statusText}`);
      }
    }

    if (!resultsData) {
      throw new Error('HMMER search timed out. Please try again.');
    }

    // Parse Pfam domains from hmmscan results
    const domains = parsePfamDomains(resultsData);

    const searchTime = Date.now() - startTime;

    return {
      success: true,
      domains,
      sequence: cleanSequence,
      sequenceLength: cleanSequence.length,
      searchTime,
    };

  } catch (error) {
    console.error('Pfam domain search error:', error);
    return {
      success: false,
      domains: [],
      sequence: sequence.replace(/\s/g, ''),
      sequenceLength: sequence.replace(/\s/g, '').length,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Search Pfam domains via backend proxy (for CORS handling)
 */
async function searchPfamDomainsViaProxy(sequence: string): Promise<PfamSearchResult> {
  const startTime = Date.now();

  try {
    // Validate sequence
    const cleanSequence = sequence.replace(/\s/g, '').toUpperCase();
    if (!cleanSequence || !/^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(cleanSequence)) {
      return {
        success: false,
        domains: [],
        sequence: cleanSequence,
        sequenceLength: cleanSequence.length,
        error: 'Invalid protein sequence. Only standard amino acid letters are allowed.',
      };
    }

    // Submit search via proxy
    const submitResponse = await fetch(`${PROXY_BASE}/api/hmmer/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sequence: cleanSequence,
        database: 'pfam',
      }),
    });

    if (!submitResponse.ok) {
      throw new Error(`Proxy API error: ${submitResponse.status} ${submitResponse.statusText}`);
    }

    const { jobId } = await submitResponse.json();

    if (!jobId) {
      throw new Error('Failed to get job ID from proxy');
    }

    // Poll for results via proxy
    let retries = 0;
    let resultsData: any = null;

    while (retries < MAX_RETRIES) {
      const pollResponse = await fetch(`${PROXY_BASE}/api/hmmer/results/${jobId}`);

      if (!pollResponse.ok) {
        throw new Error(`Proxy API error: ${pollResponse.status} ${pollResponse.statusText}`);
      }

      const pollData = await pollResponse.json();

      if (pollData.status === 'complete') {
        resultsData = pollData.data;
        break;
      } else if (pollData.status === 'running') {
        // Still running
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        retries++;
      } else {
        throw new Error('Unexpected response from proxy');
      }
    }

    if (!resultsData) {
      throw new Error('HMMER search timed out. Please try again.');
    }

    // Parse Pfam domains from hmmscan results
    const domains = parsePfamDomains(resultsData);

    const searchTime = Date.now() - startTime;

    return {
      success: true,
      domains,
      sequence: cleanSequence,
      sequenceLength: cleanSequence.length,
      searchTime,
    };

  } catch (error) {
    console.error('Pfam domain search error (via proxy):', error);
    return {
      success: false,
      domains: [],
      sequence: sequence.replace(/\s/g, ''),
      sequenceLength: sequence.replace(/\s/g, '').length,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Parse Pfam domains from hmmscan results
 */
function parsePfamDomains(results: any): PfamDomain[] {
  const domains: PfamDomain[] = [];

  try {
    if (!results.results || !results.results.hits) {
      return domains;
    }

    for (const hit of results.results.hits) {
      if (!hit.domains) continue;

      for (const domain of hit.domains) {
        domains.push({
          acc: hit.acc || 'Unknown',
          name: hit.name || 'Unknown',
          type: hit.type || 'Domain',
          description: hit.desc || '',
          start: domain.ienv || domain.alisqfrom || 0,
          end: domain.jenv || domain.alisqto || 0,
          ali_start: domain.iali || domain.alihmmfrom || 0,
          ali_end: domain.jali || domain.alihmmto || 0,
          evalue: domain.cevalue || domain.ievalue || 0,
          bitscore: domain.bitscore || 0,
          envelope_start: domain.ienv || 0,
          envelope_end: domain.jenv || 0,
        });
      }
    }

    // Sort by E-value (most significant first)
    domains.sort((a, b) => a.evalue - b.evalue);

  } catch (error) {
    console.error('Error parsing Pfam domains:', error);
  }

  return domains;
}
