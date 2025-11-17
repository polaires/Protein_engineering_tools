/**
 * Solubility database for common laboratory chemicals
 * Contains solubility limits in various solvents
 */

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
];

/**
 * Get solubility data for a chemical by ID
 */
export function getSolubilityData(chemicalId: string): SolubilityData | undefined {
  return SOLUBILITY_DATABASE.find(data => data.chemicalId === chemicalId);
}

/**
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

  // Convert solubility to mg/mL for comparison
  let solubilityMgML = data.waterSolubility;
  if (data.waterSolubilityUnit === 'g/L') {
    solubilityMgML = data.waterSolubility; // g/L = mg/mL
  }

  const percentOfLimit = (concentrationMgML / solubilityMgML) * 100;
  const isExceeded = percentOfLimit > 100;
  const isNearLimit = percentOfLimit > 80 && percentOfLimit <= 100;

  let warning: string | null = null;
  const suggestions: string[] = [];

  if (isExceeded) {
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) exceeds water solubility limit (${solubilityMgML.toFixed(1)} mg/mL) by ${(percentOfLimit - 100).toFixed(0)}%.`;

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
    warning = `Concentration (${concentrationMgML.toFixed(1)} mg/mL) is ${percentOfLimit.toFixed(0)}% of water solubility limit (${solubilityMgML.toFixed(1)} mg/mL). May require heating or extended mixing.`;

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
