/**
 * Buffer system data for pH calculations
 * Includes pKa values, temperature coefficients, and incompatibility warnings
 */

// ============================================================================
// Types
// ============================================================================

export interface BufferSystem {
  id: string;
  name: string;
  fullName: string;
  acidForm: string;
  baseForm: string;
  pKa: number[];                    // Array for polyprotic acids
  dpKadT: number;                   // Temperature coefficient (per degree C)
  effectiveRange: [number, number]; // Effective pH range
  mw: {
    acid: number;
    base: number;
    [key: string]: number;
  };
  category: 'biological' | 'common' | 'strong';
  suitability: 'general' | 'limited';  // general = cyan (recommended), limited = red (use with caution)
  incompatibilities?: string[];
  warnings?: string[];
  notes?: string;
}

// Suitability explanations:
// 'general' - Suitable for general biochemical use (zwitterionic, minimal interference)
// 'limited' - Use with caution (metal binding, temperature sensitive, reactive with aldehydes/DEPC)

export interface StrongAcidBase {
  id: string;
  name: string;
  formula: string;
  type: 'acid' | 'base';
  pKa?: number;                     // undefined for strong acids/bases
  mw: number;
  density?: number;                 // g/mL for concentrated solutions
  stockConcentration?: number;      // Common stock concentration (M)
  stockPercentage?: number;         // Weight percentage of common stock
}

export interface IncompatibilityWarning {
  chemicals: string[];
  severity: 'high' | 'moderate' | 'low';
  description: string;
  context?: string;
}

// ============================================================================
// Temperature-dependent pKw values
// ============================================================================

export const PKW_BY_TEMPERATURE: Record<number, number> = {
  0: 14.94,
  4: 14.79,
  10: 14.53,
  20: 14.17,
  25: 14.00,
  30: 13.83,
  37: 13.62,
  40: 13.53,
  50: 13.26,
};

/**
 * Get pKw at a given temperature using interpolation
 */
export function getPKw(temperatureC: number): number {
  const temps = Object.keys(PKW_BY_TEMPERATURE).map(Number).sort((a, b) => a - b);

  // Exact match
  if (PKW_BY_TEMPERATURE[temperatureC] !== undefined) {
    return PKW_BY_TEMPERATURE[temperatureC];
  }

  // Find surrounding temperatures for interpolation
  let lower = temps[0];
  let upper = temps[temps.length - 1];

  for (let i = 0; i < temps.length - 1; i++) {
    if (temps[i] <= temperatureC && temps[i + 1] >= temperatureC) {
      lower = temps[i];
      upper = temps[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio = (temperatureC - lower) / (upper - lower);
  return PKW_BY_TEMPERATURE[lower] + ratio * (PKW_BY_TEMPERATURE[upper] - PKW_BY_TEMPERATURE[lower]);
}

// ============================================================================
// Good's Biological Buffers (Comprehensive List)
// Organized by pKa (low to high pH)
// Data sources: CRC Handbook, Goldberg et al. J. Phys. Chem. Ref. Data 2002,
// Sigma-Aldrich, GoldBio, Hampton Research
// ============================================================================

export const BIOLOGICAL_BUFFERS: BufferSystem[] = [
  // ---- Low pH Range (5.5-7.0) ----
  {
    id: 'mes',
    name: 'MES',
    fullName: '2-(N-morpholino)ethanesulfonic acid',
    acidForm: 'MES',
    baseForm: 'MES sodium salt',
    pKa: [6.10],
    dpKadT: -0.011,
    effectiveRange: [5.5, 6.7],
    mw: { acid: 195.24, base: 217.22 },
    category: 'biological',
    suitability: 'general',
    warnings: ['Do not autoclave with glucose - Maillard reaction causes degradation'],
    notes: 'Zwitterionic buffer, minimal metal binding. One of the original Good buffers.',
  },
  {
    id: 'bis-tris',
    name: 'Bis-Tris',
    fullName: 'Bis(2-hydroxyethyl)amino-tris(hydroxymethyl)methane',
    acidForm: 'Bis-Tris',
    baseForm: 'Bis-Tris',
    pKa: [6.46],
    dpKadT: -0.017,
    effectiveRange: [5.8, 7.2],
    mw: { acid: 209.24, base: 209.24 },
    category: 'biological',
    suitability: 'general',
    notes: 'Primary amine buffer. Good alternative to imidazole for His-tag purification.',
  },
  {
    id: 'ada',
    name: 'ADA',
    fullName: 'N-(2-Acetamido)iminodiacetic acid',
    acidForm: 'ADA',
    baseForm: 'ADA sodium salt',
    pKa: [6.59],
    dpKadT: -0.011,
    effectiveRange: [6.0, 7.2],
    mw: { acid: 190.15, base: 212.14 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Forms complexes with most common metal ions'],
    notes: 'Acetamido buffer. One of the original Good buffers.',
  },
  {
    id: 'aces',
    name: 'ACES',
    fullName: 'N-(2-Acetamido)-2-aminoethanesulfonic acid',
    acidForm: 'ACES',
    baseForm: 'ACES sodium salt',
    pKa: [6.78],
    dpKadT: -0.020,
    effectiveRange: [6.1, 7.5],
    mw: { acid: 182.20, base: 204.19 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Forms complexes with metals - consider when using Cu²⁺', 'Absorbs UV at 230 nm'],
    notes: 'Acetamido buffer. One of the original Good buffers.',
  },
  {
    id: 'pipes',
    name: 'PIPES',
    fullName: 'Piperazine-N,N\'-bis(2-ethanesulfonic acid)',
    acidForm: 'PIPES',
    baseForm: 'PIPES sodium salt',
    pKa: [6.76],
    dpKadT: -0.009,
    effectiveRange: [6.1, 7.5],
    mw: { acid: 302.37, base: 346.33 },
    category: 'biological',
    suitability: 'general',
    notes: 'Very low temperature sensitivity - excellent choice. One of the original Good buffers.',
  },
  {
    id: 'mopso',
    name: 'MOPSO',
    fullName: '3-(N-Morpholino)-2-hydroxypropanesulfonic acid',
    acidForm: 'MOPSO',
    baseForm: 'MOPSO sodium salt',
    pKa: [6.90],
    dpKadT: -0.015,
    effectiveRange: [6.2, 7.6],
    mw: { acid: 225.26, base: 247.25 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing analog of MOPS. Used as carrier electrolyte in capillary electrophoresis.',
  },
  {
    id: 'btp',
    name: 'BTP',
    fullName: '1,3-Bis[tris(hydroxymethyl)methylamino]propane (Bis-Tris Propane)',
    acidForm: 'Bis-Tris Propane',
    baseForm: 'Bis-Tris Propane',
    pKa: [6.80, 9.00],
    dpKadT: -0.016,
    effectiveRange: [6.3, 9.5],
    mw: { acid: 282.34, base: 282.34 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Primary amine - may interfere with some assays'],
    notes: 'Diprotic - wide buffering range. Enhances stability of restriction enzymes vs Tris.',
  },
  {
    id: 'bes',
    name: 'BES',
    fullName: 'N,N-Bis(2-hydroxyethyl)-2-aminoethanesulfonic acid',
    acidForm: 'BES',
    baseForm: 'BES sodium salt',
    pKa: [7.09],
    dpKadT: -0.016,
    effectiveRange: [6.4, 7.8],
    mw: { acid: 213.25, base: 235.24 },
    category: 'biological',
    suitability: 'general',
    notes: 'One of the original Good buffers. Used in calcium phosphate transfection.',
  },
  {
    id: 'mops',
    name: 'MOPS',
    fullName: '3-(N-Morpholino)propanesulfonic acid',
    acidForm: 'MOPS',
    baseForm: 'MOPS sodium salt',
    pKa: [7.20],
    dpKadT: -0.013,
    effectiveRange: [6.5, 7.9],
    mw: { acid: 209.26, base: 231.25 },
    category: 'biological',
    suitability: 'general',
    warnings: ['Do not autoclave with glucose - Maillard reaction causes degradation'],
    notes: 'Zwitterionic buffer. Very common for electrophoresis. One of the original Good buffers.',
  },
  {
    id: 'mobs',
    name: 'MOBS',
    fullName: '4-(N-Morpholino)butanesulfonic acid',
    acidForm: 'MOBS',
    baseForm: 'MOBS sodium salt',
    pKa: [7.60],
    dpKadT: -0.013,
    effectiveRange: [6.9, 8.3],
    mw: { acid: 223.29, base: 245.28 },
    category: 'biological',
    suitability: 'general',
    notes: 'Longer chain morpholino buffer with slightly higher pKa than MOPS.',
  },

  // ---- Neutral pH Range (6.8-8.0) ----
  {
    id: 'tes',
    name: 'TES',
    fullName: 'N-[Tris(hydroxymethyl)methyl]-2-aminoethanesulfonic acid',
    acidForm: 'TES',
    baseForm: 'TES sodium salt',
    pKa: [7.40],
    dpKadT: -0.020,
    effectiveRange: [6.8, 8.2],
    mw: { acid: 229.25, base: 251.24 },
    category: 'biological',
    suitability: 'general',
    notes: 'One of the original Good buffers. Good alternative to HEPES.',
  },
  {
    id: 'hepes',
    name: 'HEPES',
    fullName: '4-(2-Hydroxyethyl)-1-piperazineethanesulfonic acid',
    acidForm: 'HEPES',
    baseForm: 'HEPES sodium salt',
    pKa: [7.48],
    dpKadT: -0.014,
    effectiveRange: [6.8, 8.2],
    mw: { acid: 238.30, base: 260.29 },
    category: 'biological',
    suitability: 'general',
    notes: 'Excellent for cell culture, low metal binding. Most popular biological buffer.',
  },
  {
    id: 'dipso',
    name: 'DIPSO',
    fullName: '3-[N,N-Bis(2-hydroxyethyl)amino]-2-hydroxypropanesulfonic acid',
    acidForm: 'DIPSO',
    baseForm: 'DIPSO sodium salt',
    pKa: [7.52],
    dpKadT: -0.015,
    effectiveRange: [7.0, 8.2],
    mw: { acid: 243.30, base: 265.29 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing buffer with good solubility.',
  },
  {
    id: 'tapso',
    name: 'TAPSO',
    fullName: '3-[N-Tris(hydroxymethyl)methylamino]-2-hydroxypropanesulfonic acid',
    acidForm: 'TAPSO',
    baseForm: 'TAPSO sodium salt',
    pKa: [7.61],
    dpKadT: -0.018,
    effectiveRange: [7.0, 8.2],
    mw: { acid: 259.28, base: 281.27 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing analog of TAPS. Good stability.',
  },
  {
    id: 'tris',
    name: 'Tris',
    fullName: 'Tris(hydroxymethyl)aminomethane (Trizma)',
    acidForm: 'Tris-HCl',
    baseForm: 'Tris base',
    pKa: [8.06],
    dpKadT: -0.028,
    effectiveRange: [7.0, 9.0],
    mw: { acid: 157.60, base: 121.14 },
    category: 'biological',
    suitability: 'limited',
    incompatibilities: ['DEPC'],
    warnings: [
      'CRITICAL: Very high temperature sensitivity!',
      'pH 8.0 at 25°C becomes pH 8.6 at 4°C (+0.6 units)',
      'pH 8.0 at 25°C becomes pH 7.8 at 37°C (-0.2 units)',
      'ALWAYS prepare at the temperature you will use it!',
      'Do not use with DEPC treatment - reacts with primary amines',
    ],
    notes: 'Most common biological buffer, but very temperature-sensitive. Also known as Trizma.',
  },
  {
    id: 'heppso',
    name: 'HEPPSO',
    fullName: '4-(2-Hydroxyethyl)-1-piperazinepropanesulfonic acid',
    acidForm: 'HEPPSO',
    baseForm: 'HEPPSO sodium salt',
    pKa: [7.85],
    dpKadT: -0.014,
    effectiveRange: [7.1, 8.5],
    mw: { acid: 268.33, base: 290.32 },
    category: 'biological',
    suitability: 'general',
    warnings: ['Forms radicals - not suitable for redox reactions', 'Complexes with Cu(II) ions'],
    notes: 'Used as ampholytic separator for pH gradients in isoelectric focusing.',
  },
  {
    id: 'popso',
    name: 'POPSO',
    fullName: 'Piperazine-N,N\'-bis(2-hydroxypropanesulfonic acid)',
    acidForm: 'POPSO',
    baseForm: 'POPSO sodium salt',
    pKa: [7.78],
    dpKadT: -0.013,
    effectiveRange: [7.2, 8.5],
    mw: { acid: 362.40, base: 406.36 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing analog of PIPES with higher pKa.',
  },
  {
    id: 'tea',
    name: 'TEA',
    fullName: 'Triethanolamine',
    acidForm: 'TEA',
    baseForm: 'TEA',
    pKa: [7.76],
    dpKadT: -0.020,
    effectiveRange: [7.3, 8.3],
    mw: { acid: 149.19, base: 149.19 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Tertiary amine - may interfere with some assays'],
    notes: 'Tertiary amine and triol. Used in protein purification and chromatography.',
  },
  {
    id: 'epps',
    name: 'EPPS',
    fullName: '4-(2-Hydroxyethyl)piperazine-1-propanesulfonic acid (HEPPS)',
    acidForm: 'EPPS',
    baseForm: 'EPPS sodium salt',
    pKa: [8.00],
    dpKadT: -0.011,
    effectiveRange: [7.3, 8.7],
    mw: { acid: 252.33, base: 274.32 },
    category: 'biological',
    suitability: 'general',
    notes: 'Also known as HEPPS. Good alternative to HEPES at slightly higher pH.',
  },
  {
    id: 'tricine',
    name: 'Tricine',
    fullName: 'N-[Tris(hydroxymethyl)methyl]glycine',
    acidForm: 'Tricine',
    baseForm: 'Tricine',
    pKa: [8.05],
    dpKadT: -0.021,
    effectiveRange: [7.4, 8.8],
    mw: { acid: 179.17, base: 179.17 },
    category: 'biological',
    suitability: 'general',
    notes: 'Good for SDS-PAGE of small proteins. One of the original Good buffers.',
  },
  {
    id: 'glycine',
    name: 'Glycine',
    fullName: 'Glycine',
    acidForm: 'Glycine',
    baseForm: 'Glycine',
    pKa: [2.34, 9.78],
    dpKadT: -0.025,
    effectiveRange: [8.8, 10.6],
    mw: { acid: 75.07, base: 75.07 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Amino acid - may interfere with protein/amino acid assays'],
    notes: 'High pH buffer at pKa2. Common in SDS-PAGE running buffer.',
  },
  {
    id: 'bicine',
    name: 'Bicine',
    fullName: 'N,N-Bis(2-hydroxyethyl)glycine',
    acidForm: 'Bicine',
    baseForm: 'Bicine',
    pKa: [8.26],
    dpKadT: -0.018,
    effectiveRange: [7.6, 9.0],
    mw: { acid: 163.17, base: 163.17 },
    category: 'biological',
    suitability: 'general',
    notes: 'One of the original Good buffers. Good for crystallography.',
  },
  {
    id: 'hepbs',
    name: 'HEPBS',
    fullName: 'N-(2-Hydroxyethyl)piperazine-N\'-(4-butanesulfonic acid)',
    acidForm: 'HEPBS',
    baseForm: 'HEPBS sodium salt',
    pKa: [8.30],
    dpKadT: -0.013,
    effectiveRange: [7.6, 9.0],
    mw: { acid: 266.36, base: 288.35 },
    category: 'biological',
    suitability: 'general',
    notes: 'Longer chain HEPES analog with higher pKa.',
  },
  {
    id: 'taps',
    name: 'TAPS',
    fullName: 'N-[Tris(hydroxymethyl)methyl]-3-aminopropanesulfonic acid',
    acidForm: 'TAPS',
    baseForm: 'TAPS sodium salt',
    pKa: [8.40],
    dpKadT: -0.018,
    effectiveRange: [7.7, 9.1],
    mw: { acid: 243.28, base: 265.27 },
    category: 'biological',
    suitability: 'general',
    notes: 'Alternative to Tris at higher pH with better temperature stability.',
  },

  // ---- High pH Range (8.0-10.0) ----
  {
    id: 'ampd',
    name: 'AMPD',
    fullName: '2-Amino-2-methyl-1,3-propanediol',
    acidForm: 'AMPD',
    baseForm: 'AMPD',
    pKa: [8.80],
    dpKadT: -0.029,
    effectiveRange: [7.8, 9.7],
    mw: { acid: 105.14, base: 105.14 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['High temperature sensitivity similar to Tris'],
    notes: 'Primary amine buffer. Also known as AMPD or Ammediol.',
  },
  {
    id: 'tabs',
    name: 'TABS',
    fullName: 'N-Tris(hydroxymethyl)methyl-4-aminobutanesulfonic acid',
    acidForm: 'TABS',
    baseForm: 'TABS sodium salt',
    pKa: [8.90],
    dpKadT: -0.018,
    effectiveRange: [8.2, 9.6],
    mw: { acid: 257.31, base: 279.30 },
    category: 'biological',
    suitability: 'general',
    notes: 'Homolog of TES and TAPS with higher pKa. Good stability.',
  },
  {
    id: 'ampso',
    name: 'AMPSO',
    fullName: '3-[(1,1-Dimethyl-2-hydroxyethyl)amino]-2-hydroxypropanesulfonic acid',
    acidForm: 'AMPSO',
    baseForm: 'AMPSO sodium salt',
    pKa: [9.00],
    dpKadT: -0.020,
    effectiveRange: [8.3, 9.7],
    mw: { acid: 227.28, base: 249.27 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing buffer for high pH applications.',
  },
  {
    id: 'ches',
    name: 'CHES',
    fullName: 'N-Cyclohexyl-2-aminoethanesulfonic acid',
    acidForm: 'CHES',
    baseForm: 'CHES sodium salt',
    pKa: [9.50],
    dpKadT: -0.011,
    effectiveRange: [8.6, 10.0],
    mw: { acid: 207.29, base: 229.28 },
    category: 'biological',
    suitability: 'general',
    notes: 'Cyclohexylamino buffer. Low temperature sensitivity at high pH.',
  },
  {
    id: 'capso',
    name: 'CAPSO',
    fullName: '3-(Cyclohexylamino)-2-hydroxy-1-propanesulfonic acid',
    acidForm: 'CAPSO',
    baseForm: 'CAPSO sodium salt',
    pKa: [9.60],
    dpKadT: -0.012,
    effectiveRange: [8.9, 10.3],
    mw: { acid: 237.32, base: 259.31 },
    category: 'biological',
    suitability: 'general',
    notes: 'Hydroxyl-containing cyclohexylamino buffer.',
  },
  {
    id: 'amp',
    name: 'AMP',
    fullName: '2-Amino-2-methyl-1-propanol',
    acidForm: 'AMP',
    baseForm: 'AMP',
    pKa: [9.70],
    dpKadT: -0.031,
    effectiveRange: [9.0, 10.5],
    mw: { acid: 89.14, base: 89.14 },
    category: 'biological',
    suitability: 'limited',
    warnings: ['Very high temperature sensitivity'],
    notes: 'Primary amine buffer for high pH. Temperature-sensitive like Tris.',
  },
  {
    id: 'caps',
    name: 'CAPS',
    fullName: '3-(Cyclohexylamino)-1-propanesulfonic acid',
    acidForm: 'CAPS',
    baseForm: 'CAPS sodium salt',
    pKa: [10.40],
    dpKadT: -0.009,
    effectiveRange: [9.7, 11.1],
    mw: { acid: 221.32, base: 243.31 },
    category: 'biological',
    suitability: 'general',
    notes: 'Zwitterionic buffer for very high pH. Used in Western blotting at high pH.',
  },
  {
    id: 'cabs',
    name: 'CABS',
    fullName: '4-(Cyclohexylamino)-1-butanesulfonic acid',
    acidForm: 'CABS',
    baseForm: 'CABS sodium salt',
    pKa: [10.70],
    dpKadT: -0.009,
    effectiveRange: [10.0, 11.4],
    mw: { acid: 235.35, base: 257.34 },
    category: 'biological',
    suitability: 'general',
    notes: 'Highest pKa zwitterionic buffer. For extreme pH applications.',
  },
];

// ============================================================================
// Common Laboratory Buffers
// ============================================================================

export const COMMON_BUFFERS: BufferSystem[] = [
  // ---- Very Low pH Range (1.0-3.0) ----
  {
    id: 'glycine-hcl',
    name: 'Glycine-HCl',
    fullName: 'Glycine-hydrochloric acid buffer',
    acidForm: 'Glycine + HCl',
    baseForm: 'Glycine',
    pKa: [2.34],
    dpKadT: -0.0025,
    effectiveRange: [2.2, 3.6],
    mw: {
      acid: 75.07,            // Glycine
      base: 75.07,            // Glycine
    },
    category: 'common',
    suitability: 'general',
    notes: 'Standard low pH buffer. Commonly used for protein elution from affinity columns and antibody elution.',
  },
  {
    id: 'oxalate',
    name: 'Oxalate',
    fullName: 'Oxalate buffer',
    acidForm: 'Oxalic acid',
    baseForm: 'Sodium oxalate',
    pKa: [1.25, 4.27],
    dpKadT: -0.002,
    effectiveRange: [0.8, 4.5],
    mw: {
      acid: 90.03,            // Oxalic acid anhydrous
      acidH2O: 126.07,        // Oxalic acid dihydrate
      base: 134.00,           // Sodium oxalate
    },
    category: 'common',
    suitability: 'limited',
    incompatibilities: ['calcium', 'iron'],
    warnings: [
      'Strong calcium chelator - precipitates calcium oxalate',
      'Toxic - handle with care',
      'May inhibit metalloenzymes',
    ],
    notes: 'Diprotic acid. Very low pH buffer range. Used in analytical chemistry.',
  },
  {
    id: 'pyruvate',
    name: 'Pyruvate',
    fullName: 'Pyruvate buffer',
    acidForm: 'Pyruvic acid',
    baseForm: 'Sodium pyruvate',
    pKa: [2.49],
    dpKadT: -0.002,
    effectiveRange: [1.5, 3.5],
    mw: {
      acid: 88.06,            // Pyruvic acid
      base: 110.04,           // Sodium pyruvate
    },
    category: 'common',
    suitability: 'limited',
    warnings: [
      'Metabolically active - may interfere with metabolic studies',
      'Unstable - decomposes over time',
    ],
    notes: 'Useful when pyruvate is desired as part of the buffer system. Common in cell culture.',
  },
  {
    id: 'phthalate',
    name: 'Phthalate',
    fullName: 'Potassium hydrogen phthalate buffer',
    acidForm: 'Potassium hydrogen phthalate',
    baseForm: 'Potassium hydrogen phthalate + NaOH',
    pKa: [2.95, 5.41],
    dpKadT: -0.0012,
    effectiveRange: [2.2, 3.8],
    mw: {
      acid: 204.22,           // Potassium hydrogen phthalate (KHP)
      base: 204.22,           // KHP
    },
    category: 'common',
    suitability: 'limited',
    warnings: [
      'Not suitable for biological systems - may be toxic to cells',
      'Primary standard for pH calibration',
    ],
    notes: 'Reference buffer for pH meter calibration (pH 4.01 at 25°C). Very stable.',
  },

  // ---- Low pH Range (3.0-5.5) ----
  {
    id: 'formate',
    name: 'Formate',
    fullName: 'Formate buffer',
    acidForm: 'Formic acid',
    baseForm: 'Sodium formate',
    pKa: [3.75],
    dpKadT: -0.0002,
    effectiveRange: [2.8, 4.8],
    mw: {
      acid: 46.03,            // Formic acid
      base: 68.01,            // Sodium formate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Simple monoprotic buffer. Low temperature sensitivity. Used in HPLC mobile phases.',
  },
  {
    id: 'tartrate',
    name: 'Tartrate',
    fullName: 'Tartrate buffer',
    acidForm: 'L-Tartaric acid',
    baseForm: 'Sodium potassium tartrate',
    pKa: [3.04, 4.37],
    dpKadT: -0.003,
    effectiveRange: [2.2, 5.2],
    mw: {
      acid: 150.09,           // L-Tartaric acid
      base: 282.22,           // Sodium potassium tartrate (Rochelle salt) tetrahydrate
      monosodium: 172.07,     // Monosodium tartrate
      disodium: 194.05,       // Disodium tartrate anhydrous
      disodiumH2O: 230.08,    // Disodium tartrate dihydrate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Diprotic acid with well-separated pKa values. Common in food chemistry and wine analysis.',
  },
  {
    id: 'lactate',
    name: 'Lactate',
    fullName: 'Lactate buffer',
    acidForm: 'L-Lactic acid',
    baseForm: 'Sodium lactate',
    pKa: [3.86],
    dpKadT: -0.002,
    effectiveRange: [2.8, 4.8],
    mw: {
      acid: 90.08,            // L-Lactic acid
      base: 112.06,           // Sodium lactate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Physiologically relevant buffer. Used in Ringer\'s lactate solution.',
  },
  {
    id: 'succinate',
    name: 'Succinate',
    fullName: 'Succinate buffer',
    acidForm: 'Succinic acid',
    baseForm: 'Sodium succinate',
    pKa: [4.21, 5.64],
    dpKadT: -0.001,
    effectiveRange: [3.2, 6.4],
    mw: {
      acid: 118.09,           // Succinic acid
      base: 162.05,           // Disodium succinate anhydrous
      hexahydrate: 270.14,    // Disodium succinate hexahydrate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Diprotic acid. TCA cycle intermediate. Good buffering capacity over wide pH range.',
  },
  {
    id: 'malate',
    name: 'Malate',
    fullName: 'Malate buffer',
    acidForm: 'L-Malic acid',
    baseForm: 'Sodium malate',
    pKa: [3.40, 5.11],
    dpKadT: -0.002,
    effectiveRange: [2.8, 5.8],
    mw: {
      acid: 134.09,           // L-Malic acid
      base: 178.05,           // Disodium malate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Diprotic acid. TCA cycle intermediate. Common in fruit juice analysis.',
  },
  {
    id: 'maleate',
    name: 'Maleate',
    fullName: 'Maleate buffer',
    acidForm: 'Maleic acid',
    baseForm: 'Sodium maleate',
    pKa: [1.92, 6.27],
    dpKadT: -0.006,
    effectiveRange: [5.2, 7.2],
    mw: {
      acid: 116.07,           // Maleic acid
      base: 160.03,           // Disodium maleate
    },
    category: 'common',
    suitability: 'limited',
    warnings: [
      'cis-isomer of fumaric acid - do not confuse',
      'May inhibit some enzymes',
    ],
    notes: 'Diprotic acid with well-separated pKa values. Used mainly around pKa2.',
  },

  // ---- Standard Lab Buffers ----
  {
    id: 'phosphate',
    name: 'Phosphate',
    fullName: 'Phosphate buffer',
    acidForm: 'Sodium phosphate monobasic (NaH₂PO₄)',
    baseForm: 'Sodium phosphate dibasic (Na₂HPO₄)',
    pKa: [2.15, 7.20, 12.38],
    dpKadT: -0.0028,
    effectiveRange: [5.8, 8.0],
    mw: {
      acid: 119.98,           // NaH2PO4
      base: 141.96,           // Na2HPO4
      monobasic: 119.98,
      monobasicH2O: 137.99,   // NaH2PO4·H2O
      dibasic: 141.96,
      dibasicH2O: 177.99,     // Na2HPO4·2H2O
      dibasic7H2O: 268.07,    // Na2HPO4·7H2O
      dibasic12H2O: 358.14,   // Na2HPO4·12H2O
      h3po4: 98.00,           // Phosphoric acid
    },
    category: 'common',
    suitability: 'limited',
    incompatibilities: ['calcium', 'magnesium'],
    warnings: [
      'Precipitates with calcium and magnesium ions',
      'Not suitable for tissue culture with high Ca²⁺/Mg²⁺',
    ],
    notes: 'pKa values well-separated - H-H equation works well',
  },
  {
    id: 'acetate',
    name: 'Acetate',
    fullName: 'Acetate buffer',
    acidForm: 'Acetic acid',
    baseForm: 'Sodium acetate',
    pKa: [4.76],
    dpKadT: -0.0002,
    effectiveRange: [3.6, 5.6],
    mw: {
      acid: 60.05,
      base: 82.03,
      trihydrate: 136.08,     // Sodium acetate trihydrate
    },
    category: 'common',
    suitability: 'general',
    notes: 'Very stable, minimal temperature sensitivity',
  },
  {
    id: 'citrate',
    name: 'Citrate',
    fullName: 'Citrate buffer',
    acidForm: 'Citric acid',
    baseForm: 'Sodium citrate',
    pKa: [3.13, 4.76, 6.40],
    dpKadT: -0.002,
    effectiveRange: [3.0, 6.2],
    mw: {
      acid: 192.12,           // Citric acid anhydrous
      acidH2O: 210.14,        // Citric acid monohydrate
      base: 258.07,           // Trisodium citrate anhydrous
      dihydrate: 294.10,      // Trisodium citrate dihydrate
    },
    category: 'common',
    suitability: 'limited',
    incompatibilities: ['calcium'],
    warnings: [
      'pKa values overlap - simple H-H equation is inaccurate',
      'Use species distribution solver for accurate calculations',
      'Chelates calcium ions',
    ],
    notes: 'Triprotic acid with overlapping pKa values',
  },
  {
    id: 'carbonate',
    name: 'Carbonate',
    fullName: 'Carbonate-bicarbonate buffer',
    acidForm: 'Sodium bicarbonate (NaHCO₃)',
    baseForm: 'Sodium carbonate (Na₂CO₃)',
    pKa: [6.35, 10.33],
    dpKadT: -0.009,
    effectiveRange: [9.2, 10.8],
    mw: {
      acid: 84.01,            // NaHCO3
      base: 105.99,           // Na2CO3
    },
    category: 'common',
    suitability: 'limited',
    warnings: ['pH sensitive to CO₂ - use fresh'],
    notes: 'High pH buffer, equilibrates with atmospheric CO₂',
  },
];

// ============================================================================
// Strong Acids and Bases
// ============================================================================

export const STRONG_ACIDS: StrongAcidBase[] = [
  {
    id: 'hcl',
    name: 'Hydrochloric acid',
    formula: 'HCl',
    type: 'acid',
    mw: 36.46,
    density: 1.18,
    stockConcentration: 12.1,
    stockPercentage: 37,
  },
  {
    id: 'h2so4',
    name: 'Sulfuric acid',
    formula: 'H₂SO₄',
    type: 'acid',
    pKa: 1.99,  // pKa2, pKa1 is very negative
    mw: 98.08,
    density: 1.84,
    stockConcentration: 18.0,
    stockPercentage: 98,
  },
  {
    id: 'hno3',
    name: 'Nitric acid',
    formula: 'HNO₃',
    type: 'acid',
    mw: 63.01,
    density: 1.42,
    stockConcentration: 15.8,
    stockPercentage: 70,
  },
  {
    id: 'h3po4',
    name: 'Phosphoric acid',
    formula: 'H₃PO₄',
    type: 'acid',
    pKa: 2.15,  // pKa1, used for very low pH
    mw: 98.00,
    density: 1.69,
    stockConcentration: 14.6,
    stockPercentage: 85,
  },
];

export const STRONG_BASES: StrongAcidBase[] = [
  {
    id: 'naoh',
    name: 'Sodium hydroxide',
    formula: 'NaOH',
    type: 'base',
    mw: 40.00,
  },
  {
    id: 'koh',
    name: 'Potassium hydroxide',
    formula: 'KOH',
    type: 'base',
    mw: 56.11,
  },
];

// ============================================================================
// Chemical Incompatibilities
// ============================================================================

export const INCOMPATIBILITY_WARNINGS: IncompatibilityWarning[] = [
  {
    chemicals: ['citrate', 'calcium'],
    severity: 'high',
    description: 'Citrate chelates calcium ions, removing free Ca²⁺ from solution',
    context: 'Problematic for calcium-dependent enzymes and signaling studies',
  },
  {
    chemicals: ['phosphate', 'calcium'],
    severity: 'high',
    description: 'Calcium phosphate precipitates form (CaHPO₄)',
    context: 'Common issue in tissue culture and cell biology',
  },
  {
    chemicals: ['phosphate', 'magnesium'],
    severity: 'high',
    description: 'Magnesium phosphate precipitates can form (MgHPO₄)',
    context: 'Issue in high-Mg²⁺ buffers',
  },
  {
    chemicals: ['tris', 'depc'],
    severity: 'high',
    description: 'DEPC reacts with primary amines in Tris',
    context: 'Do not DEPC-treat Tris buffers for RNase-free work; use Tris made with DEPC-treated water instead',
  },
  {
    chemicals: ['mops', 'glucose', 'autoclave'],
    severity: 'moderate',
    description: 'MOPS degrades when autoclaved with glucose (Maillard reaction)',
    context: 'Autoclave buffer and glucose separately',
  },
  {
    chemicals: ['mes', 'glucose', 'autoclave'],
    severity: 'moderate',
    description: 'MES degrades when autoclaved with glucose',
    context: 'Autoclave buffer and glucose separately',
  },
  {
    chemicals: ['borate', 'cis-diols'],
    severity: 'moderate',
    description: 'Borate forms complexes with cis-diol containing compounds (sugars, nucleotides)',
    context: 'Avoid for carbohydrate or nucleotide work',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all buffer systems combined
 */
export function getAllBuffers(): BufferSystem[] {
  return [...BIOLOGICAL_BUFFERS, ...COMMON_BUFFERS];
}

/**
 * Find buffer by ID
 */
export function getBufferById(id: string): BufferSystem | undefined {
  return getAllBuffers().find(b => b.id === id);
}

/**
 * Get buffers effective at a given pH
 */
export function getBuffersForPH(targetPH: number): BufferSystem[] {
  return getAllBuffers().filter(b =>
    targetPH >= b.effectiveRange[0] && targetPH <= b.effectiveRange[1]
  );
}

/**
 * Calculate pKa at a given temperature
 */
export function getPKaAtTemperature(buffer: BufferSystem, temperatureC: number, pKaIndex: number = 0): number {
  const basePKa = buffer.pKa[pKaIndex];
  const tempDiff = temperatureC - 25;
  return basePKa + (buffer.dpKadT * tempDiff);
}

/**
 * Check for incompatibilities with given chemicals
 */
export function checkIncompatibilities(chemicalIds: string[]): IncompatibilityWarning[] {
  const lowerIds = chemicalIds.map(id => id.toLowerCase());
  return INCOMPATIBILITY_WARNINGS.filter(warning => {
    const matchCount = warning.chemicals.filter(chem =>
      lowerIds.some(id => id.includes(chem) || chem.includes(id))
    ).length;
    return matchCount >= 2;
  });
}

/**
 * Get temperature sensitivity level for a buffer
 */
export function getTemperatureSensitivity(buffer: BufferSystem): 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' {
  const absDpKa = Math.abs(buffer.dpKadT);
  if (absDpKa < 0.010) return 'very_low';
  if (absDpKa < 0.015) return 'low';
  if (absDpKa < 0.020) return 'moderate';
  if (absDpKa < 0.025) return 'high';
  return 'very_high';
}

/**
 * Check if target pH is in "dead zone" (poor buffering capacity)
 */
export function isInDeadZone(buffer: BufferSystem, targetPH: number): boolean {
  // For each pKa, check if targetPH is within ±1
  return !buffer.pKa.some(pKa => Math.abs(targetPH - pKa) <= 1.0);
}

/**
 * Get the closest pKa for a target pH
 */
export function getClosestPKa(buffer: BufferSystem, targetPH: number): { pKa: number; index: number; distance: number } {
  let closest = { pKa: buffer.pKa[0], index: 0, distance: Math.abs(targetPH - buffer.pKa[0]) };

  buffer.pKa.forEach((pKa, index) => {
    const distance = Math.abs(targetPH - pKa);
    if (distance < closest.distance) {
      closest = { pKa, index, distance };
    }
  });

  return closest;
}
