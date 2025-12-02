/**
 * Solubility database for common laboratory chemicals
 * Contains solubility limits in various solvents
 *
 * Enhanced with ML-based solubility prediction using CatBoost model
 * trained on the Delaney ESOL dataset (93.35% accuracy)
 */

import {
  SolubilityPredictionAPI,
  SolubilityPredictionResult,
} from '@/services/solubilityApi';

export interface SolubilityData {
  chemicalId: string;
  waterSolubility: number; // g/L at 20-25°C
  waterSolubilityUnit: 'g/L' | 'mg/mL' | 'M';
  alternativeSolvents?: Array<{
    solvent: string;
    solubility: number;
    unit: string;
    notes?: string;
  }>;
  notes?: string;
  temperature?: string; // Temperature at which solubility is measured
}

/**
 * Solubility data for common laboratory chemicals
 * Data sources: PubChem, Sigma-Aldrich, literature values
 */
export const SOLUBILITY_DATABASE: SolubilityData[] = [
  // ============================================================================
  // Buffers
  // ============================================================================
  {
    chemicalId: 'tris-base',
    waterSolubility: 550, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Highly soluble in water, slightly soluble in ethanol',
  },
  {
    chemicalId: 'tris-hcl',
    waterSolubility: 1000, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'hepes',
    waterSolubility: 850, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    alternativeSolvents: [
      {
        solvent: 'DMSO',
        solubility: 100,
        unit: 'mg/mL',
        notes: 'For stock solutions',
      },
    ],
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'mes',
    waterSolubility: 750, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'mops',
    waterSolubility: 1000, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'pipes',
    waterSolubility: 300, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Moderately soluble in water',
  },

  // ============================================================================
  // Salts
  // ============================================================================
  {
    chemicalId: 'nacl',
    waterSolubility: 360, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Highly soluble in water, slightly soluble in ethanol',
  },
  {
    chemicalId: 'kcl',
    waterSolubility: 344, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Highly soluble in water',
  },
  {
    chemicalId: 'cacl2',
    waterSolubility: 745, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water, hygroscopic',
  },
  {
    chemicalId: 'mgcl2',
    waterSolubility: 542, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water, hygroscopic',
  },
  {
    chemicalId: 'na2hpo4',
    waterSolubility: 119, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Soluble in water, forms different hydrates',
  },
  {
    chemicalId: 'kh2po4',
    waterSolubility: 226, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Soluble in water',
  },
  {
    chemicalId: 'na2co3',
    waterSolubility: 215, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Soluble in water',
  },
  {
    chemicalId: 'nahco3',
    waterSolubility: 96, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Soluble in water',
  },

  // ============================================================================
  // Sugars
  // ============================================================================
  {
    chemicalId: 'glucose',
    waterSolubility: 909, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'sucrose',
    waterSolubility: 2000, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Highly soluble in water',
  },
  {
    chemicalId: 'glycerol',
    waterSolubility: 1000, // g/L (miscible)
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Miscible with water in all proportions',
  },

  // ============================================================================
  // Acids/Bases
  // ============================================================================
  {
    chemicalId: 'acetic-acid',
    waterSolubility: 1000, // g/L (miscible)
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Miscible with water',
  },
  {
    chemicalId: 'citric-acid',
    waterSolubility: 1330, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'edta',
    waterSolubility: 0.5, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    alternativeSolvents: [
      {
        solvent: 'Water with NaOH adjustment to pH 8',
        solubility: 500,
        unit: 'g/L',
        notes: 'EDTA is poorly soluble in water at neutral pH. Adjust pH to 8 with NaOH for better solubility',
      },
    ],
    notes: 'Poorly soluble in water at neutral pH. Requires pH adjustment (add NaOH to pH ~8) for dissolution',
  },
  {
    chemicalId: 'edta-na2',
    waterSolubility: 108, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Soluble in water, more soluble than EDTA free acid',
  },
  {
    chemicalId: 'egta',
    waterSolubility: 1, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    alternativeSolvents: [
      {
        solvent: 'Water with KOH/NaOH adjustment to pH 8-11',
        solubility: 500,
        unit: 'g/L',
        notes: 'Adjust pH to 8-11 with KOH or NaOH for dissolution',
      },
    ],
    notes: 'Poorly soluble in water at neutral pH. Requires pH adjustment for dissolution',
  },

  // ============================================================================
  // Detergents
  // ============================================================================
  {
    chemicalId: 'sds',
    waterSolubility: 250, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Soluble in water above CMC, may precipitate below 15°C',
  },
  {
    chemicalId: 'triton-x100',
    waterSolubility: 1000, // g/L (miscible)
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Miscible with water, viscous liquid',
  },
  {
    chemicalId: 'tween-20',
    waterSolubility: 1000, // g/L (miscible)
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Miscible with water',
  },

  // ============================================================================
  // Reducing Agents
  // ============================================================================
  {
    chemicalId: 'dtt',
    waterSolubility: 1540, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water, unstable in solution, store frozen',
  },
  {
    chemicalId: 'tcep',
    waterSolubility: 1000, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water, more stable than DTT',
  },
  {
    chemicalId: 'bme',
    waterSolubility: 1000, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Miscible with water, strong odor',
  },

  // ============================================================================
  // Protein Denaturants
  // ============================================================================
  {
    chemicalId: 'urea',
    waterSolubility: 1080, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Highly soluble in water, endothermic dissolution. 8M urea = ~480 g/L',
  },
  {
    chemicalId: 'gdnhcl',
    waterSolubility: 2500, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Extremely soluble in water, 6M GdnHCl = ~573 g/L',
  },

  // ============================================================================
  // Amino Acids (examples)
  // ============================================================================
  {
    chemicalId: 'glycine',
    waterSolubility: 225, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Soluble in water',
  },
  {
    chemicalId: 'l-arginine',
    waterSolubility: 150, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '21°C',
    notes: 'Soluble in water',
  },
  {
    chemicalId: 'l-glutamic-acid',
    waterSolubility: 8.6, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    alternativeSolvents: [
      {
        solvent: 'Water with base (adjust pH)',
        solubility: 500,
        unit: 'g/L',
        notes: 'Much more soluble at alkaline pH as glutamate salt',
      },
    ],
    notes: 'Poorly soluble at neutral pH, soluble as salt form',
  },

  // ============================================================================
  // Antibiotics
  // ============================================================================
  {
    chemicalId: 'ampicillin',
    waterSolubility: 8, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    alternativeSolvents: [
      {
        solvent: 'Water (with pH adjustment to 8-9)',
        solubility: 100,
        unit: 'mg/mL',
        notes: 'More soluble at slightly alkaline pH',
      },
      {
        solvent: 'Ethanol (50%)',
        solubility: 50,
        unit: 'mg/mL',
        notes: 'For stock solutions',
      },
    ],
    notes: 'Poorly soluble in water at neutral pH, decomposes in solution',
  },
  {
    chemicalId: 'kanamycin',
    waterSolubility: 500, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'chloramphenicol',
    waterSolubility: 2.5, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    alternativeSolvents: [
      {
        solvent: 'Ethanol (95%)',
        solubility: 500,
        unit: 'mg/mL',
        notes: 'Standard stock solution solvent',
      },
      {
        solvent: 'Methanol',
        solubility: 500,
        unit: 'mg/mL',
      },
    ],
    notes: 'Poorly soluble in water, prepare stock in ethanol',
  },

  // ============================================================================
  // Other Common Chemicals
  // ============================================================================
  {
    chemicalId: 'imidazole',
    waterSolubility: 633, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '20°C',
    notes: 'Very soluble in water',
  },
  {
    chemicalId: 'pmsf',
    waterSolubility: 1.8, // g/L
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    alternativeSolvents: [
      {
        solvent: 'Isopropanol',
        solubility: 172,
        unit: 'mg/mL',
        notes: 'Standard stock solution solvent (1M = 174 mg/mL)',
      },
      {
        solvent: 'Ethanol',
        solubility: 100,
        unit: 'mg/mL',
      },
    ],
    notes: 'Poorly soluble in water, hydrolyzes rapidly in aqueous solution. Prepare fresh stock in isopropanol or ethanol',
  },

  // ============================================================================
  // Common Organic Compounds
  // ============================================================================
  {
    chemicalId: 'pubchem-2272', // Azobenzene
    waterSolubility: 0.0064, // g/L (6.4 mg/L)
    waterSolubilityUnit: 'g/L',
    temperature: '25°C',
    alternativeSolvents: [
      {
        solvent: 'Ethanol',
        solubility: 40,
        unit: 'g/L',
        notes: 'Soluble in ethanol and other organic solvents',
      },
      {
        solvent: 'DMSO',
        solubility: 100,
        unit: 'mg/mL',
        notes: 'For stock solutions',
      },
      {
        solvent: 'Acetone',
        solubility: 100,
        unit: 'g/L',
        notes: 'Readily soluble',
      },
    ],
    notes: 'Very poorly soluble in water (6.4 mg/L). Use organic solvents for stock solutions.',
  },
];

/**
 * Get solubility data for a chemical by ID
 */
export function getSolubilityData(chemicalId: string): SolubilityData | undefined {
  return SOLUBILITY_DATABASE.find(data => data.chemicalId === chemicalId);
}

/**
 * Fetch solubility data from PubChem API
 * @param cid PubChem Compound ID
 * @param name Optional compound name to try web scraping as fallback
 * @returns Solubility data if available
 */
export async function fetchPubChemSolubility(cid: string, name?: string): Promise<{
  waterSolubility: number | null;
  unit: string | null;
  notes: string | null;
} | null> {
  // Helper function to extract and process solubility texts
  const processSolubilityTexts = (solubilityTexts: string[], source: string) => {
    if (solubilityTexts.length === 0) return null;

    console.log(`[PubChem ${source}] Found ${solubilityTexts.length} solubility entries:`, solubilityTexts);

    // Try to find water solubility data
    let bestMatch: { text: string; parsed: { value: number; unit: string } | null } | null = null;

    for (const text of solubilityTexts) {
      const parsed = parseSolubilityString(text);
      console.log(`[PubChem ${source}] Parsing "${text}":`, parsed);

      // Prefer entries that mention water and can be parsed
      if (parsed && (/water/i.test(text) || /h2o/i.test(text) || /aqueous/i.test(text))) {
        console.log(`[PubChem ${source}] Selected water-specific entry:`, text, parsed);
        return {
          waterSolubility: parsed.value,
          unit: parsed.unit,
          notes: text
        };
      }

      // Keep track of the first parseable entry as a fallback
      if (parsed && !bestMatch) {
        bestMatch = { text, parsed };
      }
    }

    // If we found a parseable entry (even without water mention), use it
    if (bestMatch) {
      console.log(`[PubChem ${source}] Using fallback entry:`, bestMatch.text, bestMatch.parsed);
      return {
        waterSolubility: bestMatch.parsed!.value,
        unit: bestMatch.parsed!.unit,
        notes: bestMatch.text
      };
    }

    // If we have text but couldn't parse, return as notes
    if (solubilityTexts.length > 0) {
      console.log(`[PubChem ${source}] Could not parse any entries, returning first as notes:`, solubilityTexts[0]);
      return {
        waterSolubility: null,
        unit: null,
        notes: solubilityTexts[0]
      };
    }

    return null;
  };

  // Try 1: JSON API by CID
  try {
    const response = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON`
    );

    if (response.ok) {
      const data = await response.json();
      const sections = data.Record?.Section || [];
      const solubilityTexts: string[] = [];

      // Helper function to recursively search for solubility data
      const findSolubility = (sections: any[], depth = 0): void => {
        for (const section of sections) {
          if (section.TOCHeading && /solubility/i.test(section.TOCHeading)) {
            if (section.Information && Array.isArray(section.Information)) {
              for (const info of section.Information) {
                if (info?.Value?.StringWithMarkup?.[0]?.String) {
                  solubilityTexts.push(info.Value.StringWithMarkup[0].String);
                } else if (info?.Value?.String) {
                  solubilityTexts.push(info.Value.String);
                } else if (typeof info?.Value === 'string') {
                  solubilityTexts.push(info.Value);
                }
                if (info?.Value?.Number && info?.Value?.Unit) {
                  solubilityTexts.push(`${info.Value.Number} ${info.Value.Unit}`);
                }
              }
            }
          }
          if (section.Section && Array.isArray(section.Section) && depth < 10) {
            findSolubility(section.Section, depth + 1);
          }
        }
      };

      findSolubility(sections);

      const result = processSolubilityTexts(solubilityTexts, `API CID ${cid}`);
      if (result) return result;
    }
  } catch (error) {
    console.error(`[PubChem] Error fetching API data for CID ${cid}:`, error);
  }

  // Try 2: Web scraping fallback if name is provided
  if (name) {
    try {
      console.log(`[PubChem] Trying web scraping fallback for "${name}"`);
      const htmlUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(name)}`;
      const response = await fetch(htmlUrl);

      if (response.ok) {
        const html = await response.text();

        // Extract solubility text from HTML
        // Look for patterns like "In water solubility, X mg/L" or similar
        const solubilityTexts: string[] = [];

        // Match common solubility patterns in the HTML
        const patterns = [
          /(?:In\s+water\s+)?solubility[,:]\s*([^<\n]+?)(?:<|$)/gi,
          /(\d+(?:\.\d+)?)\s*(?:mg\/L|g\/L|mg\/mL|g\/100\s*mL)/gi,
        ];

        for (const pattern of patterns) {
          const matches = html.matchAll(pattern);
          for (const match of matches) {
            const text = match[1] || match[0];
            if (text && text.trim()) {
              solubilityTexts.push(text.trim());
            }
          }
        }

        const result = processSolubilityTexts(solubilityTexts, `Web ${name}`);
        if (result) return result;
      }
    } catch (error) {
      console.error(`[PubChem] Error fetching web page for ${name}:`, error);
    }
  }

  console.log(`[PubChem] No solubility data available for CID ${cid}${name ? ` or name "${name}"` : ''}`);
  return null;
}

/**
 * Parse solubility string from PubChem
 * Examples: "100 mg/mL", "5.5 g/L at 25 °C", "freely soluble", "1 g/100 mL", "10000 mg/L"
 */
function parseSolubilityString(text: string): { value: number; unit: string } | null {
  // Remove extra whitespace
  const cleaned = text.trim();

  // Try to match common patterns with more flexibility
  // Pattern 1: Numbers with units - handle various formats
  // Match patterns like: "100 mg/mL", "5.5 g/L", "1 g/100 mL", "10,000 mg/L", "1.5E+5 mg/L"
  const numericMatch = cleaned.match(/(\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?)\s*(mg\/mL|g\/L|mg\/L|μg\/mL|ug\/mL|g\/100\s*mL|g\/100mL|mg\/100\s*mL|mg\/100mL|g\/dL|g per 100 mL|g per L)/i);
  if (numericMatch) {
    let value = parseFloat(numericMatch[1].replace(',', '')); // Handle comma as thousands separator
    let unit = numericMatch[2].toLowerCase().replace(/\s+/g, '').replace('per', '/');

    // Convert to g/L for consistency
    let valueInGPerL = value;
    if (unit === 'mg/ml' || unit === 'g/l') {
      valueInGPerL = value; // mg/mL = g/L
    } else if (unit === 'mg/l') {
      valueInGPerL = value / 1000;
    } else if (unit === 'μg/ml' || unit === 'ug/ml') {
      valueInGPerL = value / 1000;
    } else if (unit === 'g/100ml' || unit === 'g/dl') {
      valueInGPerL = value * 10;
    } else if (unit === 'mg/100ml') {
      valueInGPerL = value / 100;
    }

    return { value: valueInGPerL, unit: 'g/L' };
  }

  // Pattern 2: Handle percentage notation (e.g., "10% w/v" means 10 g/100mL = 100 g/L)
  const percentMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*%\s*(?:w\/v)?/i);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1]);
    return { value: percent * 10, unit: 'g/L' }; // % w/v = g/100mL, so multiply by 10 for g/L
  }

  // Pattern 3: Parts per notation (e.g., "1 part in 10 parts water")
  const partsMatch = cleaned.match(/1\s+(?:part|g)?\s+in\s+(\d+(?:\.\d+)?)\s+(?:parts?\s+)?(?:water|H2O)?/i);
  if (partsMatch) {
    const parts = parseFloat(partsMatch[1]);
    return { value: 1000 / parts, unit: 'g/L' }; // 1 in X parts means 1g in X mL = 1000/X g/L
  }

  // Pattern 4: Qualitative descriptions
  if (/very\s+soluble|freely\s+soluble|miscible/i.test(cleaned)) {
    return { value: 500, unit: 'g/L' }; // Assume high solubility
  }

  if (/soluble/i.test(cleaned) && !/slightly|poorly|sparingly|in[-\s]?soluble/i.test(cleaned)) {
    return { value: 100, unit: 'g/L' }; // Assume moderate solubility
  }

  if (/slightly\s+soluble|sparingly\s+soluble/i.test(cleaned)) {
    return { value: 10, unit: 'g/L' }; // Assume low solubility
  }

  if (/poorly\s+soluble|practically\s+insoluble|insoluble|negligible/i.test(cleaned)) {
    return { value: 1, unit: 'g/L' }; // Assume very low solubility
  }

  return null;
}

/**
 * Fetch SMILES notation from PubChem for a compound
 * @param cid PubChem Compound ID
 * @returns SMILES string or null
 */
async function fetchSmilesFromPubChem(cid: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/CanonicalSMILES/JSON`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.PropertyTable?.Properties?.[0]?.CanonicalSMILES || null;
  } catch (error) {
    console.error('[Solubility] Error fetching SMILES from PubChem:', error);
    return null;
  }
}

/**
 * Generate solubility warning based on ML prediction
 */
function getPredictionBasedWarning(
  concentrationMgML: number,
  prediction: SolubilityPredictionResult
): {
  isExceeded: boolean;
  percentOfLimit: number;
  warning: string | null;
  suggestions: string[];
  solubilityData: SolubilityData | null;
  source: 'database' | 'pubchem' | 'prediction' | 'general';
  prediction: SolubilityPredictionResult;
} {
  const predictedSolubilityMgML = prediction.solubility_g_l || 0; // g/L = mg/mL
  const percentOfLimit =
    predictedSolubilityMgML > 0
      ? (concentrationMgML / predictedSolubilityMgML) * 100
      : 0;
  const isExceeded = percentOfLimit > 100;
  const isNearLimit = percentOfLimit > 80 && percentOfLimit <= 100;

  let warning: string | null = null;
  const suggestions: string[] = [];

  // Add confidence note
  const confidenceNote =
    prediction.confidence === 'high'
      ? ''
      : prediction.confidence === 'medium'
        ? ' (moderate confidence)'
        : ' (low confidence - compound may be outside model training domain)';

  if (isExceeded) {
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) exceeds predicted water solubility (~${predictedSolubilityMgML.toFixed(2)} mg/mL) by ${(percentOfLimit - 100).toFixed(0)}%${confidenceNote}.`;
    suggestions.push(
      `Predicted solubility class: ${prediction.solubility_class || 'unknown'}`
    );
    suggestions.push(
      'Consider preparing a stock solution in an appropriate organic solvent (DMSO, ethanol) and diluting to working concentration.'
    );
    suggestions.push(
      'Alternatively, try heating the solution while stirring, or adjust pH if applicable.'
    );
  } else if (isNearLimit) {
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is ${percentOfLimit.toFixed(0)}% of predicted water solubility (~${predictedSolubilityMgML.toFixed(2)} mg/mL)${confidenceNote}. May require extended mixing or gentle heating.`;
    suggestions.push(
      `Predicted solubility class: ${prediction.solubility_class || 'unknown'}`
    );
  } else if (prediction.solubility_class) {
    // Provide informative message even when concentration is OK
    if (
      prediction.solubility_class === 'poorly soluble' ||
      prediction.solubility_class === 'very poorly soluble' ||
      prediction.solubility_class === 'practically insoluble'
    ) {
      warning = `This compound is predicted to be ${prediction.solubility_class} (~${predictedSolubilityMgML.toFixed(4)} mg/mL)${confidenceNote}. Current concentration (${concentrationMgML.toFixed(1)} mg/mL) is within predicted limits.`;
      suggestions.push(
        'Monitor for precipitation. Consider using co-solvents if dissolution issues occur.'
      );
    }
  }

  // Add molecular properties for context
  if (prediction.mol_log_p !== undefined) {
    const logPNote =
      prediction.mol_log_p > 3
        ? 'High lipophilicity may limit aqueous solubility.'
        : prediction.mol_log_p < -1
          ? 'Low lipophilicity suggests good water solubility.'
          : '';
    if (logPNote) {
      suggestions.push(`LogP: ${prediction.mol_log_p.toFixed(2)} - ${logPNote}`);
    }
  }

  return {
    isExceeded,
    percentOfLimit,
    warning,
    suggestions,
    solubilityData: null,
    source: 'prediction',
    prediction,
  };
}

/**
 * Check if a concentration exceeds solubility limit
 * Uses database lookup, PubChem data, or ML prediction (in order of preference)
 *
 * @param chemicalId Chemical ID
 * @param concentrationMgML Concentration in mg/mL
 * @param pubchemCid Optional PubChem CID for fetching data and SMILES
 * @param chemicalName Optional chemical name for fallback PubChem lookup
 * @param smiles Optional SMILES notation for ML prediction
 * @returns Object with warning status and message
 */
export async function checkSolubilityAsync(
  chemicalId: string,
  concentrationMgML: number,
  pubchemCid?: string,
  chemicalName?: string,
  smiles?: string
): Promise<{
  isExceeded: boolean;
  percentOfLimit: number;
  warning: string | null;
  suggestions: string[];
  solubilityData: SolubilityData | null;
  source: 'database' | 'pubchem' | 'prediction' | 'general';
  prediction?: SolubilityPredictionResult;
}> {
  // First, check our database
  const localData = getSolubilityData(chemicalId);

  if (localData) {
    const result = checkSolubility(chemicalId, concentrationMgML);
    return {
      ...result,
      source: 'database',
    };
  }

  // If not in database and we have PubChem CID, try fetching from PubChem
  if (pubchemCid) {
    const pubchemData = await fetchPubChemSolubility(pubchemCid, chemicalName);

    if (pubchemData && pubchemData.waterSolubility !== null) {
      const solubilityMgML = pubchemData.waterSolubility; // Already in g/L = mg/mL
      const percentOfLimit = (concentrationMgML / solubilityMgML) * 100;
      const isExceeded = percentOfLimit > 100;
      const isNearLimit = percentOfLimit > 80 && percentOfLimit <= 100;

      let warning: string | null = null;
      const suggestions: string[] = [];

      if (isExceeded) {
        warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) exceeds reported water solubility (~${solubilityMgML.toFixed(1)} mg/mL) by ${(percentOfLimit - 100).toFixed(0)}%.`;
        suggestions.push(
          'Consider preparing a stock solution in an appropriate organic solvent and diluting to working concentration.'
        );
        suggestions.push(
          'Alternatively, try heating the solution while stirring, or adjust pH if applicable.'
        );
        if (pubchemData.notes) {
          suggestions.push(`PubChem note: ${pubchemData.notes}`);
        }
      } else if (isNearLimit) {
        warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is ${percentOfLimit.toFixed(0)}% of reported water solubility (~${solubilityMgML.toFixed(1)} mg/mL). May require extended mixing or gentle heating.`;
        if (pubchemData.notes) {
          suggestions.push(`PubChem note: ${pubchemData.notes}`);
        }
      }

      return {
        isExceeded,
        percentOfLimit,
        warning,
        suggestions,
        solubilityData: null,
        source: 'pubchem',
      };
    }
  }

  // Try ML-based prediction if SMILES is available or can be fetched
  let smilesForPrediction: string | undefined = smiles;

  // Try to get SMILES from PubChem if not provided
  if (!smilesForPrediction && pubchemCid) {
    const fetchedSmiles = await fetchSmilesFromPubChem(pubchemCid);
    smilesForPrediction = fetchedSmiles ?? undefined;
  }

  // Attempt ML prediction if we have SMILES
  if (smilesForPrediction) {
    // Check if prediction API is available
    const apiAvailable = await SolubilityPredictionAPI.isAvailable();

    if (apiAvailable) {
      const prediction = await SolubilityPredictionAPI.predictSolubility(
        smilesForPrediction,
        chemicalName
      );

      if (prediction.success && prediction.solubility_g_l !== undefined) {
        console.log(
          `[Solubility] ML prediction for ${chemicalName || smilesForPrediction}: ${prediction.solubility_g_l.toFixed(4)} g/L (LogS: ${prediction.log_s})`
        );
        return getPredictionBasedWarning(concentrationMgML, prediction);
      } else if (prediction.error) {
        console.warn(
          `[Solubility] ML prediction failed: ${prediction.error}`
        );
      }
    }
  }

  // Fallback to general warnings (no specific data or prediction available)
  return getGeneralSolubilityWarning(concentrationMgML);
}

/**
 * Provide general solubility warnings when no specific data is available
 * This is a fallback when database, PubChem, and ML prediction are unavailable
 */
function getGeneralSolubilityWarning(concentrationMgML: number): {
  isExceeded: boolean;
  percentOfLimit: number;
  warning: string | null;
  suggestions: string[];
  solubilityData: SolubilityData | null;
  source: 'database' | 'pubchem' | 'prediction' | 'general';
} {
  let warning: string | null = null;
  const suggestions: string[] = [];
  let isExceeded = false;

  // General thresholds (conservative estimates)
  // Note: This fallback is used when ML prediction service is not available
  const mlNote =
    'Start the solubility prediction server (python scripts/solubility_api.py) for ML-based predictions.';

  if (concentrationMgML > 200) {
    // Very high concentration
    isExceeded = true;
    warning = `High concentration (${concentrationMgML.toFixed(1)} mg/mL) may exceed water solubility for many compounds.`;
    suggestions.push('⚠️ No solubility data or prediction available.');
    suggestions.push(mlNote);
    suggestions.push('Consider the following approaches:');
    suggestions.push(
      '• Prepare a concentrated stock in DMSO, ethanol, or other organic solvent'
    );
    suggestions.push('• Heat the solution gently while stirring');
    suggestions.push('• Adjust pH if the compound is acidic or basic');
    suggestions.push('• Use sonication to aid dissolution');
    suggestions.push('• Check supplier information for recommended solvents');
  } else if (concentrationMgML > 100) {
    // High concentration - warning
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is relatively high. Solubility may be limited for some compounds.`;
    suggestions.push('⚠️ No solubility data or prediction available.');
    suggestions.push(mlNote);
    suggestions.push('If dissolution is difficult, consider:');
    suggestions.push('• Using warm water (if compound is stable)');
    suggestions.push('• pH adjustment for ionizable compounds');
    suggestions.push('• Alternative solvents (DMSO, ethanol, etc.)');
  } else if (concentrationMgML > 50) {
    // Moderate concentration - info
    warning = `Moderate concentration (${concentrationMgML.toFixed(1)} mg/mL). Most water-soluble compounds should dissolve, but verify if issues arise.`;
    suggestions.push('ℹ️ No solubility data or prediction available.');
    suggestions.push(mlNote);
    suggestions.push(
      'If dissolution is slow, try gentle heating or extended mixing.'
    );
  }

  return {
    isExceeded,
    percentOfLimit: 0,
    warning,
    suggestions,
    solubilityData: null,
    source: 'general'
  };
}

/**
 * Synchronous version for backwards compatibility
 * Check if a concentration exceeds solubility limit
 * @param chemicalId Chemical ID
 * @param concentrationMgML Concentration in mg/mL
 * @returns Object with warning status and message
 */
export function checkSolubility(
  chemicalId: string,
  concentrationMgML: number
): {
  isExceeded: boolean;
  percentOfLimit: number;
  warning: string | null;
  suggestions: string[];
  solubilityData: SolubilityData | null;
} {
  const data = getSolubilityData(chemicalId);

  if (!data) {
    return {
      isExceeded: false,
      percentOfLimit: 0,
      warning: null,
      suggestions: [],
      solubilityData: null,
    };
  }

  // Convert base water solubility to mg/mL for comparison
  let baseSolubilityMgML = data.waterSolubility;
  if (data.waterSolubilityUnit === 'g/L') {
    baseSolubilityMgML = data.waterSolubility; // g/L = mg/mL
  }

  // Check alternative solvents for better solubility (especially pH-adjusted water)
  let bestSolvent: { solvent: string; solubilityMgML: number; notes?: string } | null = null;

  if (data.alternativeSolvents && data.alternativeSolvents.length > 0) {
    for (const alt of data.alternativeSolvents) {
      let altSolubilityMgML = alt.solubility;

      // Convert alternative solvent solubility to mg/mL
      if (alt.unit === 'g/L' || alt.unit === 'mg/mL') {
        altSolubilityMgML = alt.solubility;
      } else if (alt.unit === 'mg/L') {
        altSolubilityMgML = alt.solubility / 1000;
      }

      // Prioritize water-based solvents (pH adjustment, water with base, etc.)
      const isWaterBased = /water|pH|aqueous/i.test(alt.solvent);

      if (!bestSolvent || (isWaterBased && altSolubilityMgML > bestSolvent.solubilityMgML)) {
        bestSolvent = {
          solvent: alt.solvent,
          solubilityMgML: altSolubilityMgML,
          notes: alt.notes
        };
      } else if (!isWaterBased && altSolubilityMgML > bestSolvent.solubilityMgML && !/water|pH|aqueous/i.test(bestSolvent.solvent)) {
        // Only replace with non-water solvent if current best is also non-water
        bestSolvent = {
          solvent: alt.solvent,
          solubilityMgML: altSolubilityMgML,
          notes: alt.notes
        };
      }
    }
  }

  // Determine which solubility limit to use
  let effectiveSolubilityMgML = baseSolubilityMgML;
  let usedAlternative = false;

  // If concentration exceeds base water solubility but is within alternative solvent range, use that
  if (bestSolvent && concentrationMgML > baseSolubilityMgML && concentrationMgML <= bestSolvent.solubilityMgML) {
    effectiveSolubilityMgML = bestSolvent.solubilityMgML;
    usedAlternative = true;
  }

  const percentOfLimit = (concentrationMgML / effectiveSolubilityMgML) * 100;
  const isExceeded = percentOfLimit > 100;
  const isNearLimit = percentOfLimit > 80 && percentOfLimit <= 100;

  let warning: string | null = null;
  const suggestions: string[] = [];

  if (usedAlternative && !isExceeded) {
    // Concentration is OK with alternative solvent (pH adjustment, etc.)
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) requires ${bestSolvent!.solvent.toLowerCase()} (solubility: ${effectiveSolubilityMgML.toFixed(1)} mg/mL). Standard water solubility is only ${baseSolubilityMgML.toFixed(1)} mg/mL.`;

    if (data.notes) {
      suggestions.push(data.notes);
    }

    if (bestSolvent!.notes) {
      suggestions.push(`💡 ${bestSolvent!.notes}`);
    }
  } else if (isExceeded) {
    // Exceeds even the best alternative solvent
    if (usedAlternative) {
      warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) exceeds solubility even with ${bestSolvent!.solvent.toLowerCase()} (limit: ${effectiveSolubilityMgML.toFixed(1)} mg/mL) by ${(percentOfLimit - 100).toFixed(0)}%.`;
    } else {
      warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) exceeds water solubility limit (${baseSolubilityMgML.toFixed(1)} mg/mL) by ${(percentOfLimit - 100).toFixed(0)}%.`;
    }

    if (data.notes) {
      suggestions.push(data.notes);
    }

    if (data.alternativeSolvents && data.alternativeSolvents.length > 0) {
      suggestions.push('Consider using alternative solvents:');
      data.alternativeSolvents.forEach(solvent => {
        const msg = `• ${solvent.solvent}: up to ${solvent.solubility} ${solvent.unit}${solvent.notes ? ` (${solvent.notes})` : ''}`;
        suggestions.push(msg);
      });
    } else {
      suggestions.push('Consider preparing a more concentrated stock solution in an alternative solvent and diluting to working concentration.');
    }
  } else if (isNearLimit) {
    if (usedAlternative) {
      warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is ${percentOfLimit.toFixed(0)}% of solubility with ${bestSolvent!.solvent.toLowerCase()}. May require extended mixing.`;
    } else {
      warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is ${percentOfLimit.toFixed(0)}% of water solubility limit (${baseSolubilityMgML.toFixed(1)} mg/mL). May require heating or extended mixing.`;
    }

    if (data.notes) {
      suggestions.push(data.notes);
    }
  }

  return {
    isExceeded,
    percentOfLimit,
    warning,
    suggestions,
    solubilityData: data,
  };
}

/**
 * Predict water solubility directly from SMILES notation
 * Uses ML model (CatBoost trained on Delaney ESOL dataset)
 *
 * @param smiles SMILES notation of the molecule
 * @param name Optional compound name
 * @returns Prediction result or null if service unavailable
 */
export async function predictSolubilityFromSmiles(
  smiles: string,
  name?: string
): Promise<SolubilityPredictionResult | null> {
  const apiAvailable = await SolubilityPredictionAPI.isAvailable();

  if (!apiAvailable) {
    console.warn(
      '[Solubility] ML prediction service not available. Start with: python scripts/solubility_api.py'
    );
    return null;
  }

  const result = await SolubilityPredictionAPI.predictSolubility(smiles, name);

  if (!result.success) {
    console.error('[Solubility] Prediction failed:', result.error);
    return null;
  }

  return result;
}

/**
 * Check if the ML solubility prediction service is available
 */
export async function isSolubilityPredictionAvailable(): Promise<boolean> {
  return SolubilityPredictionAPI.isAvailable();
}

// Re-export prediction types for convenience
export type { SolubilityPredictionResult } from '@/services/solubilityApi';
