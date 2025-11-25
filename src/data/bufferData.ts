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
  incompatibilities?: string[];
  warnings?: string[];
  notes?: string;
}

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
// Good's Biological Buffers
// ============================================================================

export const BIOLOGICAL_BUFFERS: BufferSystem[] = [
  {
    id: 'mes',
    name: 'MES',
    fullName: '2-(N-morpholino)ethanesulfonic acid',
    acidForm: 'MES',
    baseForm: 'MES sodium salt',
    pKa: [6.15],
    dpKadT: -0.011,
    effectiveRange: [5.5, 6.7],
    mw: { acid: 195.24, base: 217.22 },
    category: 'biological',
    warnings: ['Do not autoclave with glucose - causes degradation'],
    notes: 'Zwitterionic buffer, minimal metal binding',
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
    notes: 'Primary amine buffer',
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
    notes: 'Very low temperature sensitivity - excellent choice',
  },
  {
    id: 'mops',
    name: 'MOPS',
    fullName: '3-(N-morpholino)propanesulfonic acid',
    acidForm: 'MOPS',
    baseForm: 'MOPS sodium salt',
    pKa: [7.20],
    dpKadT: -0.013,
    effectiveRange: [6.5, 7.9],
    mw: { acid: 209.26, base: 231.25 },
    category: 'biological',
    warnings: ['Do not autoclave with glucose - causes degradation'],
    notes: 'Zwitterionic buffer, common for electrophoresis',
  },
  {
    id: 'hepes',
    name: 'HEPES',
    fullName: '4-(2-hydroxyethyl)-1-piperazineethanesulfonic acid',
    acidForm: 'HEPES',
    baseForm: 'HEPES sodium salt',
    pKa: [7.55],
    dpKadT: -0.014,
    effectiveRange: [6.8, 8.2],
    mw: { acid: 238.30, base: 260.29 },
    category: 'biological',
    notes: 'Excellent for cell culture, low metal binding',
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
    notes: 'Good for SDS-PAGE of small proteins',
  },
  {
    id: 'tris',
    name: 'Tris',
    fullName: 'Tris(hydroxymethyl)aminomethane',
    acidForm: 'Tris-HCl',
    baseForm: 'Tris base',
    pKa: [8.06],
    dpKadT: -0.028,
    effectiveRange: [7.0, 9.0],
    mw: { acid: 157.60, base: 121.14 },
    category: 'biological',
    incompatibilities: ['DEPC'],
    warnings: [
      'CRITICAL: Very high temperature sensitivity!',
      'pH 8.0 at 25°C becomes pH 8.6 at 4°C (+0.6 units)',
      'pH 8.0 at 25°C becomes pH 7.8 at 37°C (-0.2 units)',
      'ALWAYS prepare at the temperature you will use it!',
      'Do not use with DEPC treatment - reacts with primary amines',
    ],
    notes: 'Most common biological buffer, but temperature-sensitive',
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
    notes: 'Alternative to Tris at higher pH',
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
    notes: 'High pH buffer, common in SDS-PAGE running buffer',
  },
];

// ============================================================================
// Common Laboratory Buffers
// ============================================================================

export const COMMON_BUFFERS: BufferSystem[] = [
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
