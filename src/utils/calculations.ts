/**
 * Calculation utilities for molarity and solution preparation
 *
 * Core formulas:
 * - Molarity (M) = moles / volume (L)
 * - moles = mass (g) / molecular weight (g/mol)
 * - mass (g) = molarity (M) × volume (L) × molecular weight (g/mol)
 * - Dilution: C1 × V1 = C2 × V2
 */

import {
  MolarityCalculation,
  CalculationResult,
  CalculationMode,
  ConcentrationUnit,
  VolumeUnit,
  MassUnit,
} from '@/types';

// ============================================================================
// Core Calculation Functions
// ============================================================================

/**
 * Calculate mass (grams) needed for a solution
 * Formula: mass = molarity × volume × molecular weight
 */
export function calculateMass(
  molarity: number,
  volumeML: number,
  molecularWeight: number
): number {
  const volumeL = volumeML / 1000;
  return molarity * volumeL * molecularWeight;
}

/**
 * Calculate molarity from mass and volume
 * Formula: molarity = (mass / molecular weight) / volume
 */
export function calculateMolarity(
  massG: number,
  volumeML: number,
  molecularWeight: number
): number {
  const volumeL = volumeML / 1000;
  const moles = massG / molecularWeight;
  return moles / volumeL;
}

/**
 * Calculate volume needed for a given mass and concentration
 * Formula: volume = (mass / molecular weight) / molarity
 */
export function calculateVolume(
  massG: number,
  molarity: number,
  molecularWeight: number
): number {
  const moles = massG / molecularWeight;
  const volumeL = moles / molarity;
  return volumeL * 1000; // Convert to mL
}

/**
 * Dilution calculation (C1V1 = C2V2)
 * Find the missing variable given three others
 */
export function calculateDilution(params: {
  c1?: number;
  v1?: number;
  c2?: number;
  v2?: number;
}): { value: number; variable: string } {
  const { c1, v1, c2, v2 } = params;

  // Count how many parameters are provided
  const provided = [c1, v1, c2, v2].filter((x) => x !== undefined).length;

  if (provided !== 3) {
    throw new Error('Exactly 3 parameters must be provided for dilution calculation');
  }

  // Calculate the missing parameter
  if (c1 === undefined) {
    return { value: (c2! * v2!) / v1!, variable: 'c1' };
  }
  if (v1 === undefined) {
    return { value: (c2! * v2!) / c1!, variable: 'v1' };
  }
  if (c2 === undefined) {
    return { value: (c1! * v1!) / v2!, variable: 'c2' };
  }
  if (v2 === undefined) {
    return { value: (c1! * v1!) / c2!, variable: 'v2' };
  }

  throw new Error('Invalid dilution calculation parameters');
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Perform calculation based on the selected mode
 */
export function performCalculation(
  calculation: MolarityCalculation
): CalculationResult {
  try {
    switch (calculation.mode) {
      case CalculationMode.MASS_FROM_MOLARITY:
        return calculateMassFromMolarity(calculation);

      case CalculationMode.MOLARITY_FROM_MASS:
        return calculateMolarityFromMass(calculation);

      case CalculationMode.VOLUME_FROM_MASS:
        return calculateVolumeFromMass(calculation);

      case CalculationMode.DILUTION:
        return calculateDilutionResult(calculation);

      default:
        return {
          success: false,
          error: 'Invalid calculation mode',
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Calculation error',
    };
  }
}

// ============================================================================
// Mode-Specific Calculation Functions
// ============================================================================

function calculateMassFromMolarity(
  calc: MolarityCalculation
): CalculationResult {
  const { molarity, volume, molecularWeight } = calc;

  if (!molarity || !volume || !molecularWeight) {
    return {
      success: false,
      error: 'Missing required parameters: molarity, volume, and molecular weight',
    };
  }

  if (molarity <= 0 || volume <= 0 || molecularWeight <= 0) {
    return {
      success: false,
      error: 'All values must be positive numbers',
    };
  }

  const mass = calculateMass(molarity, volume, molecularWeight);
  const massInMg = mass * 1000;

  const steps = [
    `Formula: mass (g) = Molarity (M) × Volume (L) × Molecular Weight (g/mol)`,
    `Volume in L = ${volume} mL ÷ 1000 = ${(volume / 1000).toFixed(4)} L`,
    `mass = ${molarity} M × ${(volume / 1000).toFixed(4)} L × ${molecularWeight} g/mol`,
    `mass = ${mass.toFixed(4)} g = ${massInMg.toFixed(2)} mg`,
  ];

  // Return in grams if >= 1g, otherwise in milligrams
  if (mass >= 1) {
    return {
      success: true,
      value: mass,
      unit: 'g',
      formula: `mass = M × V × MW`,
      steps,
    };
  } else {
    return {
      success: true,
      value: massInMg,
      unit: 'mg',
      formula: `mass = M × V × MW`,
      steps,
    };
  }
}

function calculateMolarityFromMass(
  calc: MolarityCalculation
): CalculationResult {
  const { mass, volume, molecularWeight } = calc;

  if (!mass || !volume || !molecularWeight) {
    return {
      success: false,
      error: 'Missing required parameters: mass, volume, and molecular weight',
    };
  }

  if (mass <= 0 || volume <= 0 || molecularWeight <= 0) {
    return {
      success: false,
      error: 'All values must be positive numbers',
    };
  }

  const molarity = calculateMolarity(mass, volume, molecularWeight);

  const steps = [
    `Formula: Molarity (M) = (mass (g) / MW (g/mol)) / Volume (L)`,
    `Volume in L = ${volume} mL ÷ 1000 = ${(volume / 1000).toFixed(4)} L`,
    `Moles = ${mass} g ÷ ${molecularWeight} g/mol = ${(
      mass / molecularWeight
    ).toFixed(6)} mol`,
    `Molarity = ${(mass / molecularWeight).toFixed(6)} mol ÷ ${(
      volume / 1000
    ).toFixed(4)} L`,
    `Molarity = ${molarity.toFixed(4)} M`,
  ];

  return {
    success: true,
    value: molarity,
    unit: 'M',
    formula: `M = (mass / MW) / V`,
    steps,
  };
}

function calculateVolumeFromMass(
  calc: MolarityCalculation
): CalculationResult {
  const { mass, molarity, molecularWeight } = calc;

  if (!mass || !molarity || !molecularWeight) {
    return {
      success: false,
      error: 'Missing required parameters: mass, molarity, and molecular weight',
    };
  }

  if (mass <= 0 || molarity <= 0 || molecularWeight <= 0) {
    return {
      success: false,
      error: 'All values must be positive numbers',
    };
  }

  const volume = calculateVolume(mass, molarity, molecularWeight);

  const steps = [
    `Formula: Volume (L) = (mass (g) / MW (g/mol)) / Molarity (M)`,
    `Moles = ${mass} g ÷ ${molecularWeight} g/mol = ${(
      mass / molecularWeight
    ).toFixed(6)} mol`,
    `Volume = ${(mass / molecularWeight).toFixed(6)} mol ÷ ${molarity} M`,
    `Volume = ${(volume / 1000).toFixed(4)} L = ${volume.toFixed(2)} mL`,
  ];

  return {
    success: true,
    value: volume,
    unit: 'mL',
    formula: `V = (mass / MW) / M`,
    steps,
  };
}

function calculateDilutionResult(
  calc: MolarityCalculation
): CalculationResult {
  const { initialMolarity, initialVolume, finalMolarity, finalVolume } = calc;

  try {
    const result = calculateDilution({
      c1: initialMolarity,
      v1: initialVolume,
      c2: finalMolarity,
      v2: finalVolume,
    });

    const variableNames: { [key: string]: string } = {
      c1: 'Initial Concentration',
      v1: 'Initial Volume',
      c2: 'Final Concentration',
      v2: 'Final Volume',
    };

    const variableUnits: { [key: string]: string } = {
      c1: 'M',
      v1: 'mL',
      c2: 'M',
      v2: 'mL',
    };

    const steps = [
      `Formula: C₁ × V₁ = C₂ × V₂`,
      `Known values:`,
      initialMolarity !== undefined && `  C₁ = ${initialMolarity} M`,
      initialVolume !== undefined && `  V₁ = ${initialVolume} mL`,
      finalMolarity !== undefined && `  C₂ = ${finalMolarity} M`,
      finalVolume !== undefined && `  V₂ = ${finalVolume} mL`,
      `Solving for ${variableNames[result.variable]}...`,
      `${variableNames[result.variable]} = ${result.value.toFixed(4)} ${
        variableUnits[result.variable]
      }`,
    ].filter(Boolean) as string[];

    return {
      success: true,
      value: result.value,
      unit: variableUnits[result.variable],
      formula: `C₁V₁ = C₂V₂`,
      steps,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Dilution calculation error',
    };
  }
}

// ============================================================================
// Unit Conversion Functions
// ============================================================================

/**
 * Convert concentration to molarity (M)
 * @param value - The concentration value
 * @param unit - The unit of the concentration
 * @param molecularWeight - Optional molecular weight (g/mol), required for PPM conversion
 */
export function convertToMolarity(
  value: number,
  unit: ConcentrationUnit,
  molecularWeight?: number
): number {
  switch (unit) {
    case ConcentrationUnit.MOLAR:
      return value;
    case ConcentrationUnit.MILLIMOLAR:
      return value / 1000;
    case ConcentrationUnit.MICROMOLAR:
      return value / 1000000;
    case ConcentrationUnit.NANOMOLAR:
      return value / 1000000000;
    case ConcentrationUnit.PICOMOLAR:
      return value / 1000000000000;
    case ConcentrationUnit.PPM:
      // ppm (mg/L) to Molarity: M = (ppm / MW) / 1000
      if (!molecularWeight) {
        throw new Error('Molecular weight is required to convert ppm to Molarity');
      }
      return (value / molecularWeight) / 1000;
    default:
      throw new Error(`Cannot convert ${unit} to Molarity without additional information`);
  }
}

/**
 * Convert volume to milliliters
 */
export function convertToMilliliters(value: number, unit: VolumeUnit): number {
  switch (unit) {
    case VolumeUnit.MILLILITER:
      return value;
    case VolumeUnit.LITER:
      return value * 1000;
    case VolumeUnit.MICROLITER:
      return value / 1000;
    default:
      throw new Error(`Unknown volume unit: ${unit}`);
  }
}

/**
 * Convert mass to grams (base unit for calculations)
 */
export function convertToGrams(value: number, unit: MassUnit): number {
  switch (unit) {
    case MassUnit.GRAM:
      return value;
    case MassUnit.MILLIGRAM:
      return value / 1000;
    case MassUnit.MICROGRAM:
      return value / 1000000;
    default:
      throw new Error(`Unknown mass unit: ${unit}`);
  }
}

/**
 * Convert molarity from base unit
 * @param value - The molarity value (M)
 * @param targetUnit - The target concentration unit
 * @param molecularWeight - Optional molecular weight (g/mol), required for PPM conversion
 */
export function convertFromMolarity(
  value: number,
  targetUnit: ConcentrationUnit,
  molecularWeight?: number
): number {
  switch (targetUnit) {
    case ConcentrationUnit.MOLAR:
      return value;
    case ConcentrationUnit.MILLIMOLAR:
      return value * 1000;
    case ConcentrationUnit.MICROMOLAR:
      return value * 1000000;
    case ConcentrationUnit.NANOMOLAR:
      return value * 1000000000;
    case ConcentrationUnit.PICOMOLAR:
      return value * 1000000000000;
    case ConcentrationUnit.PPM:
      // Molarity to ppm (mg/L): ppm = M × MW × 1000
      if (!molecularWeight) {
        throw new Error('Molecular weight is required to convert Molarity to ppm');
      }
      return value * molecularWeight * 1000;
    default:
      throw new Error(`Cannot convert to ${targetUnit}`);
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate calculation inputs
 */
export function validateCalculation(
  calc: MolarityCalculation
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for negative values
  const checkPositive = (
    value: number | undefined,
    name: string
  ): boolean => {
    if (value !== undefined && value <= 0) {
      errors.push(`${name} must be positive`);
      return false;
    }
    return true;
  };

  checkPositive(calc.molarity, 'Molarity');
  checkPositive(calc.volume, 'Volume');
  checkPositive(calc.mass, 'Mass');
  checkPositive(calc.molecularWeight, 'Molecular Weight');
  checkPositive(calc.initialMolarity, 'Initial Molarity');
  checkPositive(calc.initialVolume, 'Initial Volume');
  checkPositive(calc.finalMolarity, 'Final Molarity');
  checkPositive(calc.finalVolume, 'Final Volume');

  // Check for extremely large or small values that might cause precision issues
  const checkRange = (
    value: number | undefined,
    name: string,
    min: number,
    max: number
  ): boolean => {
    if (value !== undefined && (value < min || value > max)) {
      errors.push(`${name} is outside reasonable range (${min} - ${max})`);
      return false;
    }
    return true;
  };

  checkRange(calc.molarity, 'Molarity', 1e-12, 1e6);
  checkRange(calc.volume, 'Volume', 1e-6, 1e9);
  checkRange(calc.mass, 'Mass', 1e-9, 1e6);
  checkRange(calc.molecularWeight, 'Molecular Weight', 1, 1e6);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format number with appropriate precision
 */
export function formatNumber(
  value: number,
  decimalPlaces: number = 4,
  useScientific: boolean = false
): string {
  if (useScientific || Math.abs(value) < 0.001 || Math.abs(value) > 1e6) {
    return value.toExponential(decimalPlaces);
  }
  return value.toFixed(decimalPlaces);
}

/**
 * Format calculation result for display
 */
export function formatResult(
  result: CalculationResult,
  decimalPlaces: number = 4
): string {
  if (!result.success || result.value === undefined) {
    return 'N/A';
  }

  const formatted = formatNumber(result.value, decimalPlaces);
  return `${formatted} ${result.unit || ''}`;
}
