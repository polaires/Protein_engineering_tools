/**
 * Curated database of common laboratory buffer recipes
 */

import {
  Recipe,
  RecipeCategory,
  ConcentrationUnit,
  VolumeUnit,
} from '@/types';

export const CURATED_RECIPES: Recipe[] = [
  // ============================================================================
  // PBS (Phosphate-Buffered Saline) Recipes
  // ============================================================================
  {
    id: 'pbs-1x',
    name: '1× PBS (Phosphate-Buffered Saline)',
    description: 'Standard phosphate-buffered saline, pH 7.4',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'nacl',
        concentration: 137,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'kcl',
        concentration: 2.7,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'na2hpo4',
        concentration: 10,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'kh2po4',
        concentration: 1.8,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 7.4,
    instructions: [
      'Dissolve all components in ~800 mL distilled water',
      'Adjust pH to 7.4 with HCl or NaOH if needed',
      'Bring final volume to 1000 mL',
      'Sterilize by autoclaving or filter with 0.22 μm filter',
      'Store at room temperature or 4°C',
    ],
    notes: 'Most commonly used biological buffer. Can be stored at room temperature for weeks.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['pbs', 'buffer', 'common', 'phosphate'],
  },
  {
    id: 'pbs-10x',
    name: '10× PBS Stock Solution',
    description: '10× concentrated PBS stock',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'nacl',
        concentration: 1.37,
        concentrationUnit: ConcentrationUnit.MOLAR,
      },
      {
        chemicalId: 'kcl',
        concentration: 27,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'na2hpo4',
        concentration: 100,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'kh2po4',
        concentration: 18,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 7.4,
    instructions: [
      'Dissolve all components in ~800 mL distilled water',
      'Adjust pH to 7.4 with HCl or NaOH',
      'Bring final volume to 1000 mL',
      'Dilute 1:10 with water for working solution',
    ],
    notes: 'Stock solution. Dilute 100 mL to 1 L for 1× PBS.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['pbs', 'stock', 'concentrated'],
  },

  // ============================================================================
  // TBS (Tris-Buffered Saline) Recipes
  // ============================================================================
  {
    id: 'tbs-1x',
    name: '1× TBS (Tris-Buffered Saline)',
    description: 'Tris-buffered saline, pH 7.6',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'tris-base',
        concentration: 50,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'nacl',
        concentration: 150,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 7.6,
    instructions: [
      'Dissolve Tris base and NaCl in ~800 mL distilled water',
      'Adjust pH to 7.6 with HCl',
      'Bring final volume to 1000 mL',
      'Sterilize by autoclaving or filter',
    ],
    notes: 'Alternative to PBS, commonly used in Western blotting.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['tbs', 'buffer', 'tris', 'western blot'],
  },
  {
    id: 'tbst',
    name: 'TBST (TBS with Tween-20)',
    description: 'TBS with 0.1% Tween-20 for washing',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'tris-base',
        concentration: 50,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'nacl',
        concentration: 150,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'tween-20',
        concentration: 0.1,
        concentrationUnit: ConcentrationUnit.PERCENT_V_V,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 7.6,
    instructions: [
      'Prepare 1× TBS as described above',
      'Add 1 mL Tween-20 per liter (0.1%)',
      'Mix well until Tween-20 is completely dissolved',
    ],
    notes: 'Standard washing buffer for immunoassays and Western blotting.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['tbst', 'washing', 'western blot', 'elisa'],
  },

  // ============================================================================
  // TE Buffer (DNA Storage)
  // ============================================================================
  {
    id: 'te-buffer',
    name: 'TE Buffer (10 mM Tris, 1 mM EDTA)',
    description: 'Standard TE buffer for DNA storage',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'tris-hcl',
        concentration: 10,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'edta',
        concentration: 1,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 8.0,
    instructions: [
      'Add 10 mL of 1 M Tris-HCl (pH 8.0)',
      'Add 2 mL of 0.5 M EDTA (pH 8.0)',
      'Bring to 1000 mL with distilled water',
      'Autoclave for sterilization',
    ],
    notes: 'Standard buffer for DNA storage. EDTA chelates metal ions.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['te', 'dna', 'storage', 'molecular biology'],
  },

  // ============================================================================
  // Lysis Buffers
  // ============================================================================
  {
    id: 'ripa-buffer',
    name: 'RIPA Lysis Buffer',
    description: 'Radioimmunoprecipitation assay buffer for cell lysis',
    category: RecipeCategory.LYSIS,
    components: [
      {
        chemicalId: 'tris-hcl',
        concentration: 50,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'nacl',
        concentration: 150,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
      {
        chemicalId: 'triton-x100',
        concentration: 1,
        concentrationUnit: ConcentrationUnit.PERCENT_V_V,
      },
      {
        chemicalId: 'sds',
        concentration: 0.1,
        concentrationUnit: ConcentrationUnit.PERCENT_W_V,
      },
      {
        chemicalId: 'edta',
        concentration: 1,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 100,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 7.4,
    instructions: [
      'Mix all components in distilled water',
      'Adjust pH to 7.4',
      'Add protease inhibitors just before use (PMSF, cocktail)',
      'Store base buffer at 4°C',
    ],
    notes: 'Strong lysis buffer. Add protease inhibitors fresh before use.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['lysis', 'ripa', 'protein extraction'],
  },

  // ============================================================================
  // Other Common Buffers
  // ============================================================================
  {
    id: 'citrate-buffer',
    name: 'Citrate Buffer (0.1 M)',
    description: 'Sodium citrate buffer, pH 6.0',
    category: RecipeCategory.BUFFER,
    components: [
      {
        chemicalId: 'citric-acid',
        concentration: 100,
        concentrationUnit: ConcentrationUnit.MILLIMOLAR,
      },
    ],
    totalVolume: 1000,
    volumeUnit: VolumeUnit.MILLILITER,
    pH: 6.0,
    instructions: [
      'Dissolve citric acid in ~800 mL distilled water',
      'Adjust pH to 6.0 with NaOH',
      'Bring final volume to 1000 mL',
      'Autoclave for sterilization',
    ],
    notes: 'Useful for antigen retrieval and various enzyme assays.',
    isCustom: false,
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
    tags: ['citrate', 'buffer', 'antigen retrieval'],
  },
];
