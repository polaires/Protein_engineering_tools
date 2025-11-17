/**
 * Periodic Table Element Data
 */

export interface Element {
  number: number;
  symbol: string;
  name: string;
  atomicMass: string;
  category: string;
  group?: number;
  period: number;
  block: string;
  electronConfiguration: string;
  electronegativity?: number;
  meltingPoint?: number;  // in Kelvin
  boilingPoint?: number;  // in Kelvin
  density?: number;  // in g/cm³
}

export const elements: Element[] = [
  // Period 1
  { number: 1, symbol: 'H', name: 'Hydrogen', atomicMass: '1.008', category: 'nonmetal', group: 1, period: 1, block: 's', electronConfiguration: '1s¹', electronegativity: 2.20, meltingPoint: 13.99, boilingPoint: 20.271, density: 0.00008988 },
  { number: 2, symbol: 'He', name: 'Helium', atomicMass: '4.003', category: 'noble-gas', group: 18, period: 1, block: 's', electronConfiguration: '1s²', meltingPoint: 0.95, boilingPoint: 4.222, density: 0.0001785 },

  // Period 2
  { number: 3, symbol: 'Li', name: 'Lithium', atomicMass: '6.941', category: 'alkali-metal', group: 1, period: 2, block: 's', electronConfiguration: '[He] 2s¹', electronegativity: 0.98, meltingPoint: 453.65, boilingPoint: 1603, density: 0.534 },
  { number: 4, symbol: 'Be', name: 'Beryllium', atomicMass: '9.012', category: 'alkaline-earth', group: 2, period: 2, block: 's', electronConfiguration: '[He] 2s²', electronegativity: 1.57, meltingPoint: 1560, boilingPoint: 2742, density: 1.85 },
  { number: 5, symbol: 'B', name: 'Boron', atomicMass: '10.81', category: 'metalloid', group: 13, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p¹', electronegativity: 2.04, meltingPoint: 2349, boilingPoint: 4200, density: 2.34 },
  { number: 6, symbol: 'C', name: 'Carbon', atomicMass: '12.01', category: 'nonmetal', group: 14, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p²', electronegativity: 2.55, meltingPoint: 3823, density: 2.267 },
  { number: 7, symbol: 'N', name: 'Nitrogen', atomicMass: '14.01', category: 'nonmetal', group: 15, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p³', electronegativity: 3.04, meltingPoint: 63.15, boilingPoint: 77.355, density: 0.0012506 },
  { number: 8, symbol: 'O', name: 'Oxygen', atomicMass: '16.00', category: 'nonmetal', group: 16, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p⁴', electronegativity: 3.44, meltingPoint: 54.36, boilingPoint: 90.188, density: 0.001429 },
  { number: 9, symbol: 'F', name: 'Fluorine', atomicMass: '19.00', category: 'halogen', group: 17, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p⁵', electronegativity: 3.98, meltingPoint: 53.48, boilingPoint: 85.03, density: 0.001696 },
  { number: 10, symbol: 'Ne', name: 'Neon', atomicMass: '20.18', category: 'noble-gas', group: 18, period: 2, block: 'p', electronConfiguration: '[He] 2s² 2p⁶', meltingPoint: 24.56, boilingPoint: 27.104, density: 0.0008999 },

  // Period 3
  { number: 11, symbol: 'Na', name: 'Sodium', atomicMass: '22.99', category: 'alkali-metal', group: 1, period: 3, block: 's', electronConfiguration: '[Ne] 3s¹', electronegativity: 0.93, meltingPoint: 370.944, boilingPoint: 1156.09, density: 0.968 },
  { number: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: '24.31', category: 'alkaline-earth', group: 2, period: 3, block: 's', electronConfiguration: '[Ne] 3s²', electronegativity: 1.31, meltingPoint: 923, boilingPoint: 1363, density: 1.738 },
  { number: 13, symbol: 'Al', name: 'Aluminum', atomicMass: '26.98', category: 'post-transition', group: 13, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p¹', electronegativity: 1.61, meltingPoint: 933.47, boilingPoint: 2743, density: 2.70 },
  { number: 14, symbol: 'Si', name: 'Silicon', atomicMass: '28.09', category: 'metalloid', group: 14, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p²', electronegativity: 1.90, meltingPoint: 1687, boilingPoint: 3538, density: 2.3290 },
  { number: 15, symbol: 'P', name: 'Phosphorus', atomicMass: '30.97', category: 'nonmetal', group: 15, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p³', electronegativity: 2.19, meltingPoint: 317.3, boilingPoint: 553.7, density: 1.823 },
  { number: 16, symbol: 'S', name: 'Sulfur', atomicMass: '32.07', category: 'nonmetal', group: 16, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p⁴', electronegativity: 2.58, meltingPoint: 388.36, boilingPoint: 717.8, density: 2.07 },
  { number: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: '35.45', category: 'halogen', group: 17, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p⁵', electronegativity: 3.16, meltingPoint: 171.6, boilingPoint: 239.11, density: 0.003214 },
  { number: 18, symbol: 'Ar', name: 'Argon', atomicMass: '39.95', category: 'noble-gas', group: 18, period: 3, block: 'p', electronConfiguration: '[Ne] 3s² 3p⁶', meltingPoint: 83.81, boilingPoint: 87.302, density: 0.0017837 },

  // Period 4 - Transition metals
  { number: 19, symbol: 'K', name: 'Potassium', atomicMass: '39.10', category: 'alkali-metal', group: 1, period: 4, block: 's', electronConfiguration: '[Ar] 4s¹', electronegativity: 0.82, meltingPoint: 336.7, boilingPoint: 1032, density: 0.862 },
  { number: 20, symbol: 'Ca', name: 'Calcium', atomicMass: '40.08', category: 'alkaline-earth', group: 2, period: 4, block: 's', electronConfiguration: '[Ar] 4s²', electronegativity: 1.00, meltingPoint: 1115, boilingPoint: 1757, density: 1.55 },
  { number: 21, symbol: 'Sc', name: 'Scandium', atomicMass: '44.96', category: 'transition-metal', group: 3, period: 4, block: 'd', electronConfiguration: '[Ar] 3d¹ 4s²', electronegativity: 1.36, meltingPoint: 1814, boilingPoint: 3109, density: 2.985 },
  { number: 22, symbol: 'Ti', name: 'Titanium', atomicMass: '47.87', category: 'transition-metal', group: 4, period: 4, block: 'd', electronConfiguration: '[Ar] 3d² 4s²', electronegativity: 1.54, meltingPoint: 1941, boilingPoint: 3560, density: 4.506 },
  { number: 23, symbol: 'V', name: 'Vanadium', atomicMass: '50.94', category: 'transition-metal', group: 5, period: 4, block: 'd', electronConfiguration: '[Ar] 3d³ 4s²', electronegativity: 1.63, meltingPoint: 2183, boilingPoint: 3680, density: 6.0 },
  { number: 24, symbol: 'Cr', name: 'Chromium', atomicMass: '52.00', category: 'transition-metal', group: 6, period: 4, block: 'd', electronConfiguration: '[Ar] 3d⁵ 4s¹', electronegativity: 1.66, meltingPoint: 2180, boilingPoint: 2944, density: 7.15 },
  { number: 25, symbol: 'Mn', name: 'Manganese', atomicMass: '54.94', category: 'transition-metal', group: 7, period: 4, block: 'd', electronConfiguration: '[Ar] 3d⁵ 4s²', electronegativity: 1.55, meltingPoint: 1519, boilingPoint: 2334, density: 7.3 },
  { number: 26, symbol: 'Fe', name: 'Iron', atomicMass: '55.85', category: 'transition-metal', group: 8, period: 4, block: 'd', electronConfiguration: '[Ar] 3d⁶ 4s²', electronegativity: 1.83, meltingPoint: 1811, boilingPoint: 3134, density: 7.874 },
  { number: 27, symbol: 'Co', name: 'Cobalt', atomicMass: '58.93', category: 'transition-metal', group: 9, period: 4, block: 'd', electronConfiguration: '[Ar] 3d⁷ 4s²', electronegativity: 1.88, meltingPoint: 1768, boilingPoint: 3200, density: 8.86 },
  { number: 28, symbol: 'Ni', name: 'Nickel', atomicMass: '58.69', category: 'transition-metal', group: 10, period: 4, block: 'd', electronConfiguration: '[Ar] 3d⁸ 4s²', electronegativity: 1.91, meltingPoint: 1728, boilingPoint: 3003, density: 8.912 },
  { number: 29, symbol: 'Cu', name: 'Copper', atomicMass: '63.55', category: 'transition-metal', group: 11, period: 4, block: 'd', electronConfiguration: '[Ar] 3d¹⁰ 4s¹', electronegativity: 1.90, meltingPoint: 1357.77, boilingPoint: 2835, density: 8.96 },
  { number: 30, symbol: 'Zn', name: 'Zinc', atomicMass: '65.38', category: 'transition-metal', group: 12, period: 4, block: 'd', electronConfiguration: '[Ar] 3d¹⁰ 4s²', electronegativity: 1.65, meltingPoint: 692.68, boilingPoint: 1180, density: 7.134 },
  { number: 31, symbol: 'Ga', name: 'Gallium', atomicMass: '69.72', category: 'post-transition', group: 13, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p¹', electronegativity: 1.81, meltingPoint: 302.91, boilingPoint: 2477, density: 5.91 },
  { number: 32, symbol: 'Ge', name: 'Germanium', atomicMass: '72.63', category: 'metalloid', group: 14, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p²', electronegativity: 2.01, meltingPoint: 1211.4, boilingPoint: 3106, density: 5.323 },
  { number: 33, symbol: 'As', name: 'Arsenic', atomicMass: '74.92', category: 'metalloid', group: 15, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p³', electronegativity: 2.18, meltingPoint: 1090, density: 5.727 },
  { number: 34, symbol: 'Se', name: 'Selenium', atomicMass: '78.97', category: 'nonmetal', group: 16, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p⁴', electronegativity: 2.55, meltingPoint: 494, boilingPoint: 958, density: 4.809 },
  { number: 35, symbol: 'Br', name: 'Bromine', atomicMass: '79.90', category: 'halogen', group: 17, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p⁵', electronegativity: 2.96, meltingPoint: 265.8, boilingPoint: 332.0, density: 3.1028 },
  { number: 36, symbol: 'Kr', name: 'Krypton', atomicMass: '83.80', category: 'noble-gas', group: 18, period: 4, block: 'p', electronConfiguration: '[Ar] 3d¹⁰ 4s² 4p⁶', electronegativity: 3.00, meltingPoint: 115.78, boilingPoint: 119.93, density: 0.003733 },

  // Period 5 - Key elements
  { number: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: '85.47', category: 'alkali-metal', group: 1, period: 5, block: 's', electronConfiguration: '[Kr] 5s¹', electronegativity: 0.82, meltingPoint: 312.45, boilingPoint: 961, density: 1.532 },
  { number: 38, symbol: 'Sr', name: 'Strontium', atomicMass: '87.62', category: 'alkaline-earth', group: 2, period: 5, block: 's', electronConfiguration: '[Kr] 5s²', electronegativity: 0.95, meltingPoint: 1050, boilingPoint: 1650, density: 2.64 },

  // Selected Period 5 transition metals
  { number: 47, symbol: 'Ag', name: 'Silver', atomicMass: '107.9', category: 'transition-metal', group: 11, period: 5, block: 'd', electronConfiguration: '[Kr] 4d¹⁰ 5s¹', electronegativity: 1.93, meltingPoint: 1234.93, boilingPoint: 2435, density: 10.501 },

  // Period 5 p-block
  { number: 53, symbol: 'I', name: 'Iodine', atomicMass: '126.9', category: 'halogen', group: 17, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p⁵', electronegativity: 2.66, meltingPoint: 386.85, boilingPoint: 457.4, density: 4.933 },
  { number: 54, symbol: 'Xe', name: 'Xenon', atomicMass: '131.3', category: 'noble-gas', group: 18, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p⁶', electronegativity: 2.60, meltingPoint: 161.4, boilingPoint: 165.051, density: 0.005887 },

  // Period 6 - Key elements
  { number: 55, symbol: 'Cs', name: 'Cesium', atomicMass: '132.9', category: 'alkali-metal', group: 1, period: 6, block: 's', electronConfiguration: '[Xe] 6s¹', electronegativity: 0.79, meltingPoint: 301.7, boilingPoint: 944, density: 1.93 },
  { number: 56, symbol: 'Ba', name: 'Barium', atomicMass: '137.3', category: 'alkaline-earth', group: 2, period: 6, block: 's', electronConfiguration: '[Xe] 6s²', electronegativity: 0.89, meltingPoint: 1000, boilingPoint: 2118, density: 3.62 },

  // Selected Period 6 transition metals
  { number: 79, symbol: 'Au', name: 'Gold', atomicMass: '197.0', category: 'transition-metal', group: 11, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', electronegativity: 2.54, meltingPoint: 1337.33, boilingPoint: 3129, density: 19.282 },
  { number: 80, symbol: 'Hg', name: 'Mercury', atomicMass: '200.6', category: 'transition-metal', group: 12, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', electronegativity: 2.00, meltingPoint: 234.321, boilingPoint: 629.88, density: 13.5336 },

  // Period 6 p-block
  { number: 86, symbol: 'Rn', name: 'Radon', atomicMass: '222', category: 'noble-gas', group: 18, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', meltingPoint: 202, boilingPoint: 211.5, density: 0.00973 },

  // Period 7 - Key elements
  { number: 87, symbol: 'Fr', name: 'Francium', atomicMass: '223', category: 'alkali-metal', group: 1, period: 7, block: 's', electronConfiguration: '[Rn] 7s¹', electronegativity: 0.7, meltingPoint: 300, density: 1.87 },
  { number: 88, symbol: 'Ra', name: 'Radium', atomicMass: '226', category: 'alkaline-earth', group: 2, period: 7, block: 's', electronConfiguration: '[Rn] 7s²', electronegativity: 0.9, meltingPoint: 973, boilingPoint: 2010, density: 5.5 },
  { number: 118, symbol: 'Og', name: 'Oganesson', atomicMass: '294', category: 'noble-gas', group: 18, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶' },
];

export const categoryColors: Record<string, string> = {
  'alkali-metal': 'bg-red-400 hover:bg-red-500',
  'alkaline-earth': 'bg-orange-400 hover:bg-orange-500',
  'transition-metal': 'bg-yellow-400 hover:bg-yellow-500',
  'post-transition': 'bg-green-400 hover:bg-green-500',
  'metalloid': 'bg-teal-400 hover:bg-teal-500',
  'nonmetal': 'bg-blue-400 hover:bg-blue-500',
  'halogen': 'bg-indigo-400 hover:bg-indigo-500',
  'noble-gas': 'bg-purple-400 hover:bg-purple-500',
  'lanthanide': 'bg-pink-400 hover:bg-pink-500',
  'actinide': 'bg-rose-400 hover:bg-rose-500',
};

export const categoryNames: Record<string, string> = {
  'alkali-metal': 'Alkali Metal',
  'alkaline-earth': 'Alkaline Earth Metal',
  'transition-metal': 'Transition Metal',
  'post-transition': 'Post-transition Metal',
  'metalloid': 'Metalloid',
  'nonmetal': 'Nonmetal',
  'halogen': 'Halogen',
  'noble-gas': 'Noble Gas',
  'lanthanide': 'Lanthanide',
  'actinide': 'Actinide',
};
