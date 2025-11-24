/**
 * Alignment Color Schemes
 *
 * Provides multiple color schemes for protein sequence alignment visualization
 */

export type ColorScheme = 'clustal2' | 'chemistry' | 'hydrophobicity' | 'taylor' | 'none';

export interface ColorSchemeInfo {
  name: string;
  description: string;
}

export const COLOR_SCHEMES: Record<ColorScheme, ColorSchemeInfo> = {
  clustal2: {
    name: 'Clustal2',
    description: 'Classic Clustal coloring by residue type',
  },
  chemistry: {
    name: 'Chemistry',
    description: 'Groups by chemical properties (charged, polar, hydrophobic)',
  },
  hydrophobicity: {
    name: 'Hydrophobicity',
    description: 'Kyte-Doolittle hydrophobicity scale',
  },
  taylor: {
    name: 'Taylor',
    description: 'Rainbow color scheme for each amino acid',
  },
  none: {
    name: 'No Color',
    description: 'Plain text without coloring',
  },
};

/**
 * Color mappings for each scheme
 */
const colorMaps: Record<ColorScheme, Record<string, string>> = {
  clustal2: {
    // Hydrophobic (blue)
    'A': '#80a0f0', 'I': '#80a0f0', 'L': '#80a0f0', 'M': '#80a0f0',
    'F': '#80a0f0', 'W': '#80a0f0', 'V': '#80a0f0',
    // Positive (red)
    'K': '#f01505', 'R': '#f01505',
    // Acidic (magenta)
    'E': '#c048c0', 'D': '#c048c0',
    // Polar (green)
    'N': '#15c015', 'Q': '#15c015', 'S': '#15c015', 'T': '#15c015',
    // Cysteine (pink)
    'C': '#f08080',
    // Glycine (orange)
    'G': '#f09048',
    // Proline (yellow)
    'P': '#c0c000',
    // Aromatic (cyan)
    'H': '#15a4a4', 'Y': '#15a4a4',
    // Gaps
    '-': 'transparent', '.': 'transparent',
  },

  chemistry: {
    // Charged (red)
    'D': '#e74c3c', 'E': '#e74c3c', 'K': '#e74c3c', 'R': '#e74c3c',
    // Polar (blue)
    'S': '#3498db', 'T': '#3498db', 'N': '#3498db', 'Q': '#3498db',
    'Y': '#3498db', 'C': '#3498db',
    // Hydrophobic (green)
    'A': '#2ecc71', 'V': '#2ecc71', 'I': '#2ecc71', 'L': '#2ecc71',
    'M': '#2ecc71', 'F': '#2ecc71', 'W': '#2ecc71', 'P': '#2ecc71',
    // Special (orange)
    'G': '#f39c12', 'H': '#f39c12',
    // Gaps
    '-': 'transparent', '.': 'transparent',
  },

  hydrophobicity: {
    // Kyte-Doolittle hydrophobicity scale (dark green = hydrophobic, light = hydrophilic)
    'I': '#053805', 'V': '#054805', 'L': '#055805', 'F': '#056805',
    'C': '#057805', 'M': '#058805', 'A': '#059805', 'G': '#56a856',
    'T': '#75b875', 'W': '#76b876', 'S': '#84c684', 'Y': '#85c785',
    'P': '#98d698', 'H': '#a6e6a6', 'E': '#c4f0c4', 'Q': '#c5f0c5',
    'D': '#d4f4d4', 'N': '#d5f4d5', 'K': '#e4fae4', 'R': '#e5fae5',
    // Gaps
    '-': 'transparent', '.': 'transparent',
  },

  taylor: {
    // Taylor rainbow color scheme
    'A': '#ccff00', 'C': '#ffff00', 'D': '#ff0000', 'E': '#ff0066',
    'F': '#00ff66', 'G': '#ff9900', 'H': '#0066ff', 'I': '#66ff00',
    'K': '#6600ff', 'L': '#33ff00', 'M': '#00ff00', 'N': '#cc00ff',
    'P': '#ffcc00', 'Q': '#ff00cc', 'R': '#0000ff', 'S': '#ff3300',
    'T': '#ff6600', 'V': '#99ff00', 'W': '#00ccff', 'Y': '#00ffcc',
    // Gaps
    '-': 'transparent', '.': 'transparent',
  },

  none: {
    // No coloring
  },
};

/**
 * Get color for an amino acid based on the selected scheme
 */
export function getAAColor(aa: string, scheme: ColorScheme): string {
  if (scheme === 'none') {
    return 'transparent';
  }

  const upperAA = aa.toUpperCase();
  return colorMaps[scheme][upperAA] || '#95a5a6'; // Default gray for unknown
}

/**
 * Analyze sequence composition
 */
export interface SequenceComposition {
  hydrophobic: number;
  charged: number;
  polar: number;
  other: number;
}

export function analyzeSequenceComposition(sequence: string): SequenceComposition {
  if (!sequence || sequence.length === 0) {
    return { hydrophobic: 0, charged: 0, polar: 0, other: 0 };
  }

  const hydrophobic = 'AVILMFWP';
  const charged = 'DEKR';
  const polar = 'STNQYC';

  let hydrophobicCount = 0;
  let chargedCount = 0;
  let polarCount = 0;
  let otherCount = 0;

  for (const aa of sequence.toUpperCase()) {
    if (hydrophobic.includes(aa)) hydrophobicCount++;
    else if (charged.includes(aa)) chargedCount++;
    else if (polar.includes(aa)) polarCount++;
    else otherCount++;
  }

  return {
    hydrophobic: parseFloat(((hydrophobicCount / sequence.length) * 100).toFixed(1)),
    charged: parseFloat(((chargedCount / sequence.length) * 100).toFixed(1)),
    polar: parseFloat(((polarCount / sequence.length) * 100).toFixed(1)),
    other: parseFloat(((otherCount / sequence.length) * 100).toFixed(1)),
  };
}
