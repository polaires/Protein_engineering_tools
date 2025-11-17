/**
 * Periodic Table Element Data - Complete 118 Elements
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

  // Period 4
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

  // Period 5
  { number: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: '85.47', category: 'alkali-metal', group: 1, period: 5, block: 's', electronConfiguration: '[Kr] 5s¹', electronegativity: 0.82, meltingPoint: 312.45, boilingPoint: 961, density: 1.532 },
  { number: 38, symbol: 'Sr', name: 'Strontium', atomicMass: '87.62', category: 'alkaline-earth', group: 2, period: 5, block: 's', electronConfiguration: '[Kr] 5s²', electronegativity: 0.95, meltingPoint: 1050, boilingPoint: 1650, density: 2.64 },
  { number: 39, symbol: 'Y', name: 'Yttrium', atomicMass: '88.91', category: 'transition-metal', group: 3, period: 5, block: 'd', electronConfiguration: '[Kr] 4d¹ 5s²', electronegativity: 1.22, meltingPoint: 1799, boilingPoint: 3203, density: 4.472 },
  { number: 40, symbol: 'Zr', name: 'Zirconium', atomicMass: '91.22', category: 'transition-metal', group: 4, period: 5, block: 'd', electronConfiguration: '[Kr] 4d² 5s²', electronegativity: 1.33, meltingPoint: 2128, boilingPoint: 4650, density: 6.52 },
  { number: 41, symbol: 'Nb', name: 'Niobium', atomicMass: '92.91', category: 'transition-metal', group: 5, period: 5, block: 'd', electronConfiguration: '[Kr] 4d⁴ 5s¹', electronegativity: 1.6, meltingPoint: 2750, boilingPoint: 5017, density: 8.57 },
  { number: 42, symbol: 'Mo', name: 'Molybdenum', atomicMass: '95.95', category: 'transition-metal', group: 6, period: 5, block: 'd', electronConfiguration: '[Kr] 4d⁵ 5s¹', electronegativity: 2.16, meltingPoint: 2896, boilingPoint: 4912, density: 10.28 },
  { number: 43, symbol: 'Tc', name: 'Technetium', atomicMass: '98', category: 'transition-metal', group: 7, period: 5, block: 'd', electronConfiguration: '[Kr] 4d⁵ 5s²', electronegativity: 1.9, meltingPoint: 2430, boilingPoint: 4538, density: 11 },
  { number: 44, symbol: 'Ru', name: 'Ruthenium', atomicMass: '101.1', category: 'transition-metal', group: 8, period: 5, block: 'd', electronConfiguration: '[Kr] 4d⁷ 5s¹', electronegativity: 2.2, meltingPoint: 2607, boilingPoint: 4423, density: 12.45 },
  { number: 45, symbol: 'Rh', name: 'Rhodium', atomicMass: '102.9', category: 'transition-metal', group: 9, period: 5, block: 'd', electronConfiguration: '[Kr] 4d⁸ 5s¹', electronegativity: 2.28, meltingPoint: 2237, boilingPoint: 3968, density: 12.41 },
  { number: 46, symbol: 'Pd', name: 'Palladium', atomicMass: '106.4', category: 'transition-metal', group: 10, period: 5, block: 'd', electronConfiguration: '[Kr] 4d¹⁰', electronegativity: 2.20, meltingPoint: 1828.05, boilingPoint: 3236, density: 12.023 },
  { number: 47, symbol: 'Ag', name: 'Silver', atomicMass: '107.9', category: 'transition-metal', group: 11, period: 5, block: 'd', electronConfiguration: '[Kr] 4d¹⁰ 5s¹', electronegativity: 1.93, meltingPoint: 1234.93, boilingPoint: 2435, density: 10.501 },
  { number: 48, symbol: 'Cd', name: 'Cadmium', atomicMass: '112.4', category: 'transition-metal', group: 12, period: 5, block: 'd', electronConfiguration: '[Kr] 4d¹⁰ 5s²', electronegativity: 1.69, meltingPoint: 594.22, boilingPoint: 1040, density: 8.65 },
  { number: 49, symbol: 'In', name: 'Indium', atomicMass: '114.8', category: 'post-transition', group: 13, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p¹', electronegativity: 1.78, meltingPoint: 429.75, boilingPoint: 2345, density: 7.31 },
  { number: 50, symbol: 'Sn', name: 'Tin', atomicMass: '118.7', category: 'post-transition', group: 14, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p²', electronegativity: 1.96, meltingPoint: 505.08, boilingPoint: 2875, density: 7.265 },
  { number: 51, symbol: 'Sb', name: 'Antimony', atomicMass: '121.8', category: 'metalloid', group: 15, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p³', electronegativity: 2.05, meltingPoint: 903.78, boilingPoint: 1908, density: 6.697 },
  { number: 52, symbol: 'Te', name: 'Tellurium', atomicMass: '127.6', category: 'metalloid', group: 16, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p⁴', electronegativity: 2.1, meltingPoint: 722.66, boilingPoint: 1261, density: 6.24 },
  { number: 53, symbol: 'I', name: 'Iodine', atomicMass: '126.9', category: 'halogen', group: 17, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p⁵', electronegativity: 2.66, meltingPoint: 386.85, boilingPoint: 457.4, density: 4.933 },
  { number: 54, symbol: 'Xe', name: 'Xenon', atomicMass: '131.3', category: 'noble-gas', group: 18, period: 5, block: 'p', electronConfiguration: '[Kr] 4d¹⁰ 5s² 5p⁶', electronegativity: 2.60, meltingPoint: 161.4, boilingPoint: 165.051, density: 0.005887 },

  // Period 6
  { number: 55, symbol: 'Cs', name: 'Cesium', atomicMass: '132.9', category: 'alkali-metal', group: 1, period: 6, block: 's', electronConfiguration: '[Xe] 6s¹', electronegativity: 0.79, meltingPoint: 301.7, boilingPoint: 944, density: 1.93 },
  { number: 56, symbol: 'Ba', name: 'Barium', atomicMass: '137.3', category: 'alkaline-earth', group: 2, period: 6, block: 's', electronConfiguration: '[Xe] 6s²', electronegativity: 0.89, meltingPoint: 1000, boilingPoint: 2118, density: 3.62 },

  // Lanthanides
  { number: 57, symbol: 'La', name: 'Lanthanum', atomicMass: '138.9', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 5d¹ 6s²', electronegativity: 1.10, meltingPoint: 1193, boilingPoint: 3737, density: 6.162 },
  { number: 58, symbol: 'Ce', name: 'Cerium', atomicMass: '140.1', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹ 5d¹ 6s²', electronegativity: 1.12, meltingPoint: 1068, boilingPoint: 3716, density: 6.770 },
  { number: 59, symbol: 'Pr', name: 'Praseodymium', atomicMass: '140.9', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f³ 6s²', electronegativity: 1.13, meltingPoint: 1208, boilingPoint: 3403, density: 6.77 },
  { number: 60, symbol: 'Nd', name: 'Neodymium', atomicMass: '144.2', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁴ 6s²', electronegativity: 1.14, meltingPoint: 1297, boilingPoint: 3347, density: 7.01 },
  { number: 61, symbol: 'Pm', name: 'Promethium', atomicMass: '145', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁵ 6s²', meltingPoint: 1315, boilingPoint: 3273, density: 7.26 },
  { number: 62, symbol: 'Sm', name: 'Samarium', atomicMass: '150.4', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁶ 6s²', electronegativity: 1.17, meltingPoint: 1345, boilingPoint: 2173, density: 7.52 },
  { number: 63, symbol: 'Eu', name: 'Europium', atomicMass: '152.0', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁷ 6s²', meltingPoint: 1099, boilingPoint: 1802, density: 5.264 },
  { number: 64, symbol: 'Gd', name: 'Gadolinium', atomicMass: '157.3', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁷ 5d¹ 6s²', electronegativity: 1.20, meltingPoint: 1585, boilingPoint: 3273, density: 7.90 },
  { number: 65, symbol: 'Tb', name: 'Terbium', atomicMass: '158.9', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f⁹ 6s²', meltingPoint: 1629, boilingPoint: 3396, density: 8.23 },
  { number: 66, symbol: 'Dy', name: 'Dysprosium', atomicMass: '162.5', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹⁰ 6s²', electronegativity: 1.22, meltingPoint: 1680, boilingPoint: 2840, density: 8.540 },
  { number: 67, symbol: 'Ho', name: 'Holmium', atomicMass: '164.9', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹¹ 6s²', electronegativity: 1.23, meltingPoint: 1734, boilingPoint: 2873, density: 8.79 },
  { number: 68, symbol: 'Er', name: 'Erbium', atomicMass: '167.3', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹² 6s²', electronegativity: 1.24, meltingPoint: 1802, boilingPoint: 3141, density: 9.066 },
  { number: 69, symbol: 'Tm', name: 'Thulium', atomicMass: '168.9', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹³ 6s²', electronegativity: 1.25, meltingPoint: 1818, boilingPoint: 2223, density: 9.32 },
  { number: 70, symbol: 'Yb', name: 'Ytterbium', atomicMass: '173.0', category: 'lanthanide', period: 6, block: 'f', electronConfiguration: '[Xe] 4f¹⁴ 6s²', meltingPoint: 1097, boilingPoint: 1469, density: 6.90 },
  { number: 71, symbol: 'Lu', name: 'Lutetium', atomicMass: '175.0', category: 'lanthanide', period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d¹ 6s²', electronegativity: 1.27, meltingPoint: 1925, boilingPoint: 3675, density: 9.841 },

  // Period 6 transition metals continued
  { number: 72, symbol: 'Hf', name: 'Hafnium', atomicMass: '178.5', category: 'transition-metal', group: 4, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d² 6s²', electronegativity: 1.3, meltingPoint: 2506, boilingPoint: 4876, density: 13.31 },
  { number: 73, symbol: 'Ta', name: 'Tantalum', atomicMass: '180.9', category: 'transition-metal', group: 5, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d³ 6s²', electronegativity: 1.5, meltingPoint: 3290, boilingPoint: 5731, density: 16.69 },
  { number: 74, symbol: 'W', name: 'Tungsten', atomicMass: '183.8', category: 'transition-metal', group: 6, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d⁴ 6s²', electronegativity: 2.36, meltingPoint: 3695, boilingPoint: 5828, density: 19.25 },
  { number: 75, symbol: 'Re', name: 'Rhenium', atomicMass: '186.2', category: 'transition-metal', group: 7, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d⁵ 6s²', electronegativity: 1.9, meltingPoint: 3459, boilingPoint: 5869, density: 21.02 },
  { number: 76, symbol: 'Os', name: 'Osmium', atomicMass: '190.2', category: 'transition-metal', group: 8, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d⁶ 6s²', electronegativity: 2.2, meltingPoint: 3306, boilingPoint: 5285, density: 22.59 },
  { number: 77, symbol: 'Ir', name: 'Iridium', atomicMass: '192.2', category: 'transition-metal', group: 9, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d⁷ 6s²', electronegativity: 2.20, meltingPoint: 2719, boilingPoint: 4701, density: 22.56 },
  { number: 78, symbol: 'Pt', name: 'Platinum', atomicMass: '195.1', category: 'transition-metal', group: 10, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d⁹ 6s¹', electronegativity: 2.28, meltingPoint: 2041.4, boilingPoint: 4098, density: 21.45 },
  { number: 79, symbol: 'Au', name: 'Gold', atomicMass: '197.0', category: 'transition-metal', group: 11, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', electronegativity: 2.54, meltingPoint: 1337.33, boilingPoint: 3129, density: 19.282 },
  { number: 80, symbol: 'Hg', name: 'Mercury', atomicMass: '200.6', category: 'transition-metal', group: 12, period: 6, block: 'd', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', electronegativity: 2.00, meltingPoint: 234.321, boilingPoint: 629.88, density: 13.5336 },
  { number: 81, symbol: 'Tl', name: 'Thallium', atomicMass: '204.4', category: 'post-transition', group: 13, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', electronegativity: 1.62, meltingPoint: 577, boilingPoint: 1746, density: 11.85 },
  { number: 82, symbol: 'Pb', name: 'Lead', atomicMass: '207.2', category: 'post-transition', group: 14, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', electronegativity: 2.33, meltingPoint: 600.61, boilingPoint: 2022, density: 11.34 },
  { number: 83, symbol: 'Bi', name: 'Bismuth', atomicMass: '209.0', category: 'post-transition', group: 15, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', electronegativity: 2.02, meltingPoint: 544.7, boilingPoint: 1837, density: 9.78 },
  { number: 84, symbol: 'Po', name: 'Polonium', atomicMass: '209', category: 'metalloid', group: 16, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', electronegativity: 2.0, meltingPoint: 527, boilingPoint: 1235, density: 9.196 },
  { number: 85, symbol: 'At', name: 'Astatine', atomicMass: '210', category: 'halogen', group: 17, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', electronegativity: 2.2, meltingPoint: 575, boilingPoint: 610, density: 6.35 },
  { number: 86, symbol: 'Rn', name: 'Radon', atomicMass: '222', category: 'noble-gas', group: 18, period: 6, block: 'p', electronConfiguration: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', meltingPoint: 202, boilingPoint: 211.5, density: 0.00973 },

  // Period 7
  { number: 87, symbol: 'Fr', name: 'Francium', atomicMass: '223', category: 'alkali-metal', group: 1, period: 7, block: 's', electronConfiguration: '[Rn] 7s¹', electronegativity: 0.7, meltingPoint: 300, density: 1.87 },
  { number: 88, symbol: 'Ra', name: 'Radium', atomicMass: '226', category: 'alkaline-earth', group: 2, period: 7, block: 's', electronConfiguration: '[Rn] 7s²', electronegativity: 0.9, meltingPoint: 973, boilingPoint: 2010, density: 5.5 },

  // Actinides
  { number: 89, symbol: 'Ac', name: 'Actinium', atomicMass: '227', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 6d¹ 7s²', electronegativity: 1.1, meltingPoint: 1323, boilingPoint: 3471, density: 10.07 },
  { number: 90, symbol: 'Th', name: 'Thorium', atomicMass: '232.0', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 6d² 7s²', electronegativity: 1.3, meltingPoint: 2023, boilingPoint: 5061, density: 11.724 },
  { number: 91, symbol: 'Pa', name: 'Protactinium', atomicMass: '231.0', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f² 6d¹ 7s²', electronegativity: 1.5, meltingPoint: 1841, boilingPoint: 4300, density: 15.37 },
  { number: 92, symbol: 'U', name: 'Uranium', atomicMass: '238.0', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f³ 6d¹ 7s²', electronegativity: 1.38, meltingPoint: 1405.3, boilingPoint: 4404, density: 19.1 },
  { number: 93, symbol: 'Np', name: 'Neptunium', atomicMass: '237', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f⁴ 6d¹ 7s²', electronegativity: 1.36, meltingPoint: 912, boilingPoint: 4447, density: 20.45 },
  { number: 94, symbol: 'Pu', name: 'Plutonium', atomicMass: '244', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f⁶ 7s²', electronegativity: 1.28, meltingPoint: 912.5, boilingPoint: 3505, density: 19.816 },
  { number: 95, symbol: 'Am', name: 'Americium', atomicMass: '243', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f⁷ 7s²', electronegativity: 1.3, meltingPoint: 1449, boilingPoint: 2880, density: 12 },
  { number: 96, symbol: 'Cm', name: 'Curium', atomicMass: '247', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f⁷ 6d¹ 7s²', electronegativity: 1.3, meltingPoint: 1613, boilingPoint: 3383, density: 13.51 },
  { number: 97, symbol: 'Bk', name: 'Berkelium', atomicMass: '247', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f⁹ 7s²', electronegativity: 1.3, meltingPoint: 1259, density: 14.78 },
  { number: 98, symbol: 'Cf', name: 'Californium', atomicMass: '251', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f¹⁰ 7s²', electronegativity: 1.3, meltingPoint: 1173, density: 15.1 },
  { number: 99, symbol: 'Es', name: 'Einsteinium', atomicMass: '252', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f¹¹ 7s²', electronegativity: 1.3, meltingPoint: 1133, density: 8.84 },
  { number: 100, symbol: 'Fm', name: 'Fermium', atomicMass: '257', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f¹² 7s²', electronegativity: 1.3, meltingPoint: 1800 },
  { number: 101, symbol: 'Md', name: 'Mendelevium', atomicMass: '258', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f¹³ 7s²', electronegativity: 1.3, meltingPoint: 1100 },
  { number: 102, symbol: 'No', name: 'Nobelium', atomicMass: '259', category: 'actinide', period: 7, block: 'f', electronConfiguration: '[Rn] 5f¹⁴ 7s²', electronegativity: 1.3, meltingPoint: 1100 },
  { number: 103, symbol: 'Lr', name: 'Lawrencium', atomicMass: '266', category: 'actinide', period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d¹ 7s²', meltingPoint: 1900 },

  // Period 7 transition metals continued
  { number: 104, symbol: 'Rf', name: 'Rutherfordium', atomicMass: '267', category: 'transition-metal', group: 4, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d² 7s²' },
  { number: 105, symbol: 'Db', name: 'Dubnium', atomicMass: '268', category: 'transition-metal', group: 5, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d³ 7s²' },
  { number: 106, symbol: 'Sg', name: 'Seaborgium', atomicMass: '269', category: 'transition-metal', group: 6, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁴ 7s²' },
  { number: 107, symbol: 'Bh', name: 'Bohrium', atomicMass: '270', category: 'transition-metal', group: 7, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁵ 7s²' },
  { number: 108, symbol: 'Hs', name: 'Hassium', atomicMass: '277', category: 'transition-metal', group: 8, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁶ 7s²' },
  { number: 109, symbol: 'Mt', name: 'Meitnerium', atomicMass: '278', category: 'transition-metal', group: 9, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁷ 7s²' },
  { number: 110, symbol: 'Ds', name: 'Darmstadtium', atomicMass: '281', category: 'transition-metal', group: 10, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁸ 7s²' },
  { number: 111, symbol: 'Rg', name: 'Roentgenium', atomicMass: '282', category: 'transition-metal', group: 11, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d⁹ 7s²' },
  { number: 112, symbol: 'Cn', name: 'Copernicium', atomicMass: '285', category: 'transition-metal', group: 12, period: 7, block: 'd', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s²' },
  { number: 113, symbol: 'Nh', name: 'Nihonium', atomicMass: '286', category: 'post-transition', group: 13, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹' },
  { number: 114, symbol: 'Fl', name: 'Flerovium', atomicMass: '289', category: 'post-transition', group: 14, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²' },
  { number: 115, symbol: 'Mc', name: 'Moscovium', atomicMass: '290', category: 'post-transition', group: 15, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³' },
  { number: 116, symbol: 'Lv', name: 'Livermorium', atomicMass: '293', category: 'post-transition', group: 16, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴' },
  { number: 117, symbol: 'Ts', name: 'Tennessine', atomicMass: '294', category: 'halogen', group: 17, period: 7, block: 'p', electronConfiguration: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵' },
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
