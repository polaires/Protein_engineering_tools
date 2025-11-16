/**
 * PubChem API service for fetching chemical data
 * Documentation: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 */

import axios, { AxiosError } from 'axios';
import { Chemical, PubChemCompound, APIResponse, ChemicalCategory } from '@/types';

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get data from cache if not expired
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Save data to cache
 */
function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// ============================================================================
// API Request Functions
// ============================================================================

/**
 * Search PubChem by compound name
 */
export async function searchCompoundByName(
  name: string
): Promise<APIResponse<PubChemCompound>> {
  const cacheKey = `search:${name.toLowerCase()}`;

  // Check cache first
  const cached = getCached<PubChemCompound>(cacheKey);
  if (cached) {
    return {
      success: true,
      data: cached,
      cached: true,
    };
  }

  try {
    // Step 1: Search for compound to get CID
    const searchUrl = `${PUBCHEM_BASE_URL}/compound/name/${encodeURIComponent(
      name
    )}/cids/JSON`;

    const searchResponse = await axios.get(searchUrl, {
      timeout: 10000,
    });

    const cids = searchResponse.data?.IdentifierList?.CID;

    if (!cids || cids.length === 0) {
      return {
        success: false,
        error: `No compound found for "${name}"`,
      };
    }

    // Use the first CID
    const cid = cids[0];

    // Step 2: Get compound properties
    const compound = await getCompoundByCID(cid);

    if (compound.success && compound.data) {
      setCache(cacheKey, compound.data);
      return compound;
    }

    return compound;
  } catch (error) {
    return handleAPIError(error, name);
  }
}

/**
 * Get compound data by CID (Compound ID)
 */
export async function getCompoundByCID(
  cid: number
): Promise<APIResponse<PubChemCompound>> {
  const cacheKey = `cid:${cid}`;

  // Check cache
  const cached = getCached<PubChemCompound>(cacheKey);
  if (cached) {
    return {
      success: true,
      data: cached,
      cached: true,
    };
  }

  try {
    const propertyUrl = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`;

    const response = await axios.get(propertyUrl, {
      timeout: 10000,
    });

    const properties = response.data?.PropertyTable?.Properties?.[0];

    if (!properties) {
      return {
        success: false,
        error: 'Failed to retrieve compound properties',
      };
    }

    // Get synonyms (common names)
    let synonyms: string[] = [];
    try {
      const synonymUrl = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/synonyms/JSON`;
      const synonymResponse = await axios.get(synonymUrl, {
        timeout: 10000,
      });
      synonyms =
        synonymResponse.data?.InformationList?.Information?.[0]?.Synonym || [];
      // Limit to first 10 synonyms
      synonyms = synonyms.slice(0, 10);
    } catch (e) {
      // Synonyms are optional, continue without them
      console.warn('Failed to fetch synonyms:', e);
    }

    const compound: PubChemCompound = {
      cid,
      iupacName: properties.IUPACName,
      molecularFormula: properties.MolecularFormula,
      molecularWeight: parseFloat(properties.MolecularWeight),
      canonicalSmiles: properties.CanonicalSMILES,
      synonyms,
    };

    setCache(cacheKey, compound);

    return {
      success: true,
      data: compound,
    };
  } catch (error) {
    return handleAPIError(error, cid.toString());
  }
}

/**
 * Convert PubChem compound to Chemical type
 */
export function pubChemToChemical(
  compound: PubChemCompound,
  commonName?: string
): Chemical {
  // Use the first synonym as common name if not provided
  const name =
    commonName ||
    (compound.synonyms && compound.synonyms.length > 0
      ? compound.synonyms[0]
      : compound.iupacName || compound.molecularFormula);

  return {
    id: `pubchem-${compound.cid}`,
    commonName: name,
    iupacName: compound.iupacName,
    formula: compound.molecularFormula,
    molecularWeight: compound.molecularWeight,
    category: ChemicalCategory.OTHER,
    tags: ['pubchem'],
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Search multiple compounds
 */
export async function searchMultipleCompounds(
  names: string[]
): Promise<APIResponse<Chemical[]>> {
  try {
    const results = await Promise.allSettled(
      names.map((name) => searchCompoundByName(name))
    );

    const chemicals: Chemical[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.data) {
        const chemical = pubChemToChemical(result.value.data, names[index]);
        chemicals.push(chemical);
      } else if (result.status === 'fulfilled' && !result.value.success) {
        errors.push(`${names[index]}: ${result.value.error}`);
      } else if (result.status === 'rejected') {
        errors.push(`${names[index]}: Request failed`);
      }
    });

    return {
      success: chemicals.length > 0,
      data: chemicals,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to search multiple compounds',
    };
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle API errors with appropriate messages
 */
function handleAPIError(error: unknown, context: string): APIResponse<never> {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Request timeout. Please check your internet connection and try again.',
      };
    }

    if (!axiosError.response) {
      return {
        success: false,
        error:
          'Network error. Please check your internet connection and try again.',
      };
    }

    const status = axiosError.response.status;

    switch (status) {
      case 404:
        return {
          success: false,
          error: `Compound "${context}" not found in PubChem database`,
        };
      case 400:
        return {
          success: false,
          error: 'Invalid search query',
        };
      case 503:
        return {
          success: false,
          error: 'PubChem service temporarily unavailable. Please try again later.',
        };
      case 429:
        return {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
        };
      default:
        return {
          success: false,
          error: `PubChem API error (${status}). Please try again later.`,
        };
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'Unknown error occurred while fetching chemical data',
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate chemical name before searching
 */
export function validateChemicalName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Chemical name cannot be empty',
    };
  }

  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Chemical name too short',
    };
  }

  if (name.length > 200) {
    return {
      isValid: false,
      error: 'Chemical name too long',
    };
  }

  // Check for potentially dangerous characters
  const dangerousChars = /[<>{}[\]\\]/;
  if (dangerousChars.test(name)) {
    return {
      isValid: false,
      error: 'Chemical name contains invalid characters',
    };
  }

  return { isValid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear the PubChem cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  let oldest: number | null = null;
  let newest: number | null = null;

  cache.forEach((entry) => {
    if (oldest === null || entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
    if (newest === null || entry.timestamp > newest) {
      newest = entry.timestamp;
    }
  });

  return {
    size: cache.size,
    oldestEntry: oldest,
    newestEntry: newest,
  };
}
