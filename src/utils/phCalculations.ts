/**
 * pH Calculation Utilities
 *
 * Includes:
 * - Henderson-Hasselbalch equation for simple buffers
 * - Species distribution solver for polyprotic acids
 * - Strong acid/base pH calculations
 * - Davies equation for ionic strength correction
 * - Reverse calculations (target pH → amount needed)
 */

import {
  BufferSystem,
  StrongAcidBase,
  getPKaAtTemperature,
  getPKw,
  getClosestPKa,
  isInDeadZone,
} from '@/data/bufferData';

// ============================================================================
// Types
// ============================================================================

export interface PhCalculationResult {
  success: boolean;
  pH?: number;
  pOH?: number;
  acidAmount?: { value: number; unit: string; form: string };
  baseAmount?: { value: number; unit: string; form: string };
  warnings: string[];
  steps: string[];
  speciesDistribution?: SpeciesFraction[];
  bufferCapacity?: number;
  ionicStrength?: number;
  // Alternative preparation using single chemical + HCl/NaOH
  alternativePreparation?: {
    chemical: { value: number; unit: string; form: string };
    titrant: { value: number; unit: string; form: string; type: 'HCl' | 'NaOH'; concentration: number };
    steps: string[];
  };
}

export interface SpeciesFraction {
  species: string;
  formula: string;
  fraction: number;
  concentration?: number;
}

export interface BufferCalculationInput {
  bufferSystem: BufferSystem;
  targetPH: number;
  totalConcentration: number;  // M
  finalVolume: number;         // mL
  temperature: number;         // °C
  ionicStrength?: number;      // M (optional, for Davies correction)
}

export interface StrongAcidBaseInput {
  compound: StrongAcidBase;
  concentration: number;       // M
  volume?: number;             // mL (optional)
}

export interface PHAdjustmentInput {
  currentPH: number;
  targetPH: number;
  bufferConcentration: number; // M
  bufferPKa: number;
  volume: number;              // mL
  adjustingWith: 'acid' | 'base';
  adjustingConcentration: number; // M of the acid/base being added
}

// ============================================================================
// Constants
// ============================================================================

const DAVIES_A = 0.509;  // Debye-Hückel constant at 25°C

// ============================================================================
// Basic pH Calculations
// ============================================================================

/**
 * Calculate pH of a strong acid solution
 * For very dilute solutions (< 10⁻⁶ M), accounts for water autoionization
 */
export function calculateStrongAcidPH(
  concentration: number,
  temperature: number = 25
): PhCalculationResult {
  const steps: string[] = [];
  const warnings: string[] = [];
  const Kw = Math.pow(10, -getPKw(temperature));

  steps.push(`Strong Acid pH Calculation`);
  steps.push(`Temperature: ${temperature}°C, pKw = ${getPKw(temperature).toFixed(2)}`);
  steps.push(`[Acid] = ${concentration.toExponential(3)} M`);

  let pH: number;

  if (concentration >= 1e-6) {
    // Standard calculation: pH = -log[H⁺]
    pH = -Math.log10(concentration);
    steps.push(`Formula: pH = -log₁₀[H⁺]`);
    steps.push(`pH = -log₁₀(${concentration.toExponential(3)}) = ${pH.toFixed(3)}`);
  } else {
    // Very dilute: must account for water autoionization
    // [H⁺] = (C₀/2) + √(C₀²/4 + Kw)
    const H = (concentration / 2) + Math.sqrt(Math.pow(concentration, 2) / 4 + Kw);
    pH = -Math.log10(H);
    steps.push(`Very dilute solution - accounting for water autoionization`);
    steps.push(`[H⁺] = (C₀/2) + √(C₀²/4 + Kw)`);
    steps.push(`[H⁺] = ${H.toExponential(3)} M`);
    steps.push(`pH = ${pH.toFixed(3)}`);
    warnings.push('Very dilute solution - water autoionization considered');
  }

  // Handle negative pH for concentrated acids
  if (pH < 0) {
    warnings.push(`Negative pH (${pH.toFixed(2)}) indicates concentrated acid. Activity coefficients should be considered.`);
  }

  return {
    success: true,
    pH,
    pOH: getPKw(temperature) - pH,
    warnings,
    steps,
  };
}

/**
 * Calculate pH of a strong base solution
 */
export function calculateStrongBasePH(
  concentration: number,
  temperature: number = 25
): PhCalculationResult {
  const steps: string[] = [];
  const warnings: string[] = [];
  const pKw = getPKw(temperature);
  const Kw = Math.pow(10, -pKw);

  steps.push(`Strong Base pH Calculation`);
  steps.push(`Temperature: ${temperature}°C, pKw = ${pKw.toFixed(2)}`);
  steps.push(`[Base] = ${concentration.toExponential(3)} M`);

  let pOH: number;
  let pH: number;

  if (concentration >= 1e-6) {
    pOH = -Math.log10(concentration);
    pH = pKw - pOH;
    steps.push(`Formula: pOH = -log₁₀[OH⁻], pH = pKw - pOH`);
    steps.push(`pOH = ${pOH.toFixed(3)}`);
    steps.push(`pH = ${pKw.toFixed(2)} - ${pOH.toFixed(3)} = ${pH.toFixed(3)}`);
  } else {
    // Very dilute
    const OH = (concentration / 2) + Math.sqrt(Math.pow(concentration, 2) / 4 + Kw);
    pOH = -Math.log10(OH);
    pH = pKw - pOH;
    steps.push(`Very dilute solution - accounting for water autoionization`);
    steps.push(`[OH⁻] = ${OH.toExponential(3)} M`);
    steps.push(`pOH = ${pOH.toFixed(3)}, pH = ${pH.toFixed(3)}`);
    warnings.push('Very dilute solution - water autoionization considered');
  }

  return {
    success: true,
    pH,
    pOH,
    warnings,
    steps,
  };
}

// ============================================================================
// Henderson-Hasselbalch Calculations
// ============================================================================

/**
 * Calculate pH using Henderson-Hasselbalch equation
 * pH = pKa + log([A⁻]/[HA])
 */
export function calculateBufferPH(
  pKa: number,
  acidConcentration: number,
  baseConcentration: number
): PhCalculationResult {
  const steps: string[] = [];
  const warnings: string[] = [];

  if (acidConcentration <= 0 || baseConcentration <= 0) {
    return {
      success: false,
      warnings: ['Both acid and base concentrations must be positive'],
      steps: [],
    };
  }

  const ratio = baseConcentration / acidConcentration;
  const pH = pKa + Math.log10(ratio);

  steps.push(`Henderson-Hasselbalch Equation: pH = pKa + log₁₀([A⁻]/[HA])`);
  steps.push(`pKa = ${pKa.toFixed(3)}`);
  steps.push(`[A⁻] (conjugate base) = ${baseConcentration.toExponential(3)} M`);
  steps.push(`[HA] (weak acid) = ${acidConcentration.toExponential(3)} M`);
  steps.push(`Ratio [A⁻]/[HA] = ${ratio.toFixed(4)}`);
  steps.push(`pH = ${pKa.toFixed(3)} + log₁₀(${ratio.toFixed(4)}) = ${pH.toFixed(3)}`);

  // Check buffer range
  if (ratio < 0.1 || ratio > 10) {
    warnings.push(`Buffer ratio outside optimal range (0.1-10). Buffer capacity is reduced.`);
  }

  return {
    success: true,
    pH,
    warnings,
    steps,
  };
}

/**
 * Calculate amounts needed to prepare a buffer at target pH
 * Uses Henderson-Hasselbalch to determine acid:base ratio
 */
export function calculateBufferPreparation(input: BufferCalculationInput): PhCalculationResult {
  const { bufferSystem, targetPH, totalConcentration, finalVolume, temperature, ionicStrength } = input;

  const steps: string[] = [];
  const warnings: string[] = [];

  // Get the closest pKa for the target pH
  const { pKa: basePKa, index: pKaIndex } = getClosestPKa(bufferSystem, targetPH);

  // Temperature-corrected pKa
  const pKa = getPKaAtTemperature(bufferSystem, temperature, pKaIndex);

  steps.push(`Buffer: ${bufferSystem.name} (${bufferSystem.fullName})`);
  steps.push(`Target pH: ${targetPH.toFixed(2)}`);
  steps.push(`Total concentration: ${(totalConcentration * 1000).toFixed(1)} mM`);
  steps.push(`Final volume: ${finalVolume.toFixed(1)} mL`);
  steps.push(`Temperature: ${temperature}°C`);
  steps.push(``);

  // Temperature warning for Tris
  if (bufferSystem.id === 'tris' && temperature !== 25) {
    const pHShift = (temperature - 25) * bufferSystem.dpKadT;
    warnings.push(
      `⚠️ TRIS WARNING: pKa at ${temperature}°C = ${pKa.toFixed(2)} (shifted ${pHShift > 0 ? '+' : ''}${pHShift.toFixed(2)} from 25°C)`
    );
  }

  // Check if in dead zone (outside pKa ± 1 for all pKa values)
  if (isInDeadZone(bufferSystem, targetPH)) {
    const pKaRanges = bufferSystem.pKa.map(pKa => `${(pKa - 1).toFixed(1)}-${(pKa + 1).toFixed(1)} (pKa ${pKa.toFixed(2)})`).join(', ');
    warnings.push(
      `⚠️ Target pH ${targetPH.toFixed(1)} is outside the optimal buffering range (pKa ± 1: ${pKaRanges}). Poor buffer capacity expected.`
    );
  }

  // pKa correction
  steps.push(`pKa at 25°C: ${basePKa.toFixed(3)}`);
  if (temperature !== 25) {
    steps.push(`Temperature correction: dpKa/dT = ${bufferSystem.dpKadT}`);
    steps.push(`pKa at ${temperature}°C: ${pKa.toFixed(3)}`);
  }

  // Apply ionic strength correction if provided
  let effectivePKa = pKa;
  if (ionicStrength !== undefined && ionicStrength > 0) {
    const correction = calculateDaviesCorrection(ionicStrength, 1);
    effectivePKa = pKa + correction;
    steps.push(`Ionic strength correction (Davies): ${correction.toFixed(3)}`);
    steps.push(`Effective pKa: ${effectivePKa.toFixed(3)}`);

    if (ionicStrength > 0.5) {
      warnings.push(`⚠️ Ionic strength (${ionicStrength.toFixed(2)} M) exceeds Davies equation validity (~0.5 M)`);
    }
  }

  // Calculate ratio using H-H equation: [A⁻]/[HA] = 10^(pH - pKa)
  const ratio = Math.pow(10, targetPH - effectivePKa);

  steps.push(``);
  steps.push(`Henderson-Hasselbalch: pH = pKa + log([Base]/[Acid])`);
  steps.push(`Rearranged: [Base]/[Acid] = 10^(pH - pKa) = 10^(${targetPH.toFixed(2)} - ${effectivePKa.toFixed(3)})`);
  steps.push(`Ratio = ${ratio.toFixed(4)}`);

  // Calculate individual concentrations
  // [Acid] + [Base] = Total
  // [Base]/[Acid] = ratio
  // Therefore: [Acid] = Total / (1 + ratio)
  const acidConcentration = totalConcentration / (1 + ratio);
  const baseConcentration = totalConcentration - acidConcentration;

  steps.push(``);
  steps.push(`[Acid] = Total / (1 + ratio) = ${(acidConcentration * 1000).toFixed(3)} mM`);
  steps.push(`[Base] = Total - [Acid] = ${(baseConcentration * 1000).toFixed(3)} mM`);

  // Convert to mass
  const volumeL = finalVolume / 1000;
  const acidMoles = acidConcentration * volumeL;
  const baseMoles = baseConcentration * volumeL;

  const acidMass = acidMoles * bufferSystem.mw.acid;
  const baseMass = baseMoles * bufferSystem.mw.base;

  steps.push(``);
  steps.push(`=== Preparation Instructions ===`);
  steps.push(`Acid form (${bufferSystem.acidForm}):`);
  steps.push(`  MW = ${bufferSystem.mw.acid.toFixed(2)} g/mol`);
  steps.push(`  Moles = ${(acidConcentration * 1000).toFixed(3)} mM × ${(volumeL * 1000).toFixed(1)} mL / 1000 = ${(acidMoles * 1000).toFixed(4)} mmol`);
  steps.push(`  Mass = ${formatMass(acidMass)}`);

  steps.push(``);
  steps.push(`Base form (${bufferSystem.baseForm}):`);
  steps.push(`  MW = ${bufferSystem.mw.base.toFixed(2)} g/mol`);
  steps.push(`  Moles = ${(baseConcentration * 1000).toFixed(3)} mM × ${(volumeL * 1000).toFixed(1)} mL / 1000 = ${(baseMoles * 1000).toFixed(4)} mmol`);
  steps.push(`  Mass = ${formatMass(baseMass)}`);

  // Add incompatibility warnings
  if (bufferSystem.warnings) {
    warnings.push(...bufferSystem.warnings);
  }

  // Calculate buffer capacity (β)
  const bufferCapacity = 2.303 * totalConcentration * ratio / Math.pow(1 + ratio, 2);

  // Calculate alternative preparation method (single chemical + HCl/NaOH)
  // Determine which is better: acid form + NaOH, or base form + HCl
  const totalMoles = totalConcentration * volumeL;
  const titrantConcentration = 1.0; // 1 M stock solution

  // Option 1: Use acid form only + NaOH
  // Need to neutralize baseConcentration worth to convert acid → base
  const naohMolesNeeded = baseMoles;
  const naohVolumeML = (naohMolesNeeded / titrantConcentration) * 1000;
  const totalAcidMass = totalMoles * bufferSystem.mw.acid;

  // Option 2: Use base form only + HCl
  // Need to neutralize acidConcentration worth to convert base → acid
  const hclMolesNeeded = acidMoles;
  const hclVolumeML = (hclMolesNeeded / titrantConcentration) * 1000;
  const totalBaseMass = totalMoles * bufferSystem.mw.base;

  // Choose the option that requires less titrant (simpler preparation)
  const useAcidForm = naohVolumeML <= hclVolumeML;

  const altSteps: string[] = [];
  altSteps.push(`=== Alternative Preparation (Single Chemical) ===`);

  let alternativePreparation: PhCalculationResult['alternativePreparation'];

  if (useAcidForm) {
    altSteps.push(`Using acid form (${bufferSystem.acidForm}) + NaOH`);
    altSteps.push(``);
    altSteps.push(`1. Weigh ${formatMass(totalAcidMass)} of ${bufferSystem.acidForm}`);
    altSteps.push(`   (MW = ${bufferSystem.mw.acid.toFixed(2)} g/mol, ${(totalMoles * 1000).toFixed(4)} mmol)`);
    altSteps.push(``);
    altSteps.push(`2. Dissolve in ~${(finalVolume * 0.8).toFixed(0)} mL water`);
    altSteps.push(``);
    altSteps.push(`3. Add ${naohVolumeML.toFixed(2)} mL of 1 M NaOH`);
    altSteps.push(`   (${(naohMolesNeeded * 1000).toFixed(4)} mmol NaOH)`);
    altSteps.push(``);
    altSteps.push(`4. Check pH and adjust if needed`);
    altSteps.push(`5. Bring to final volume (${finalVolume.toFixed(0)} mL)`);

    alternativePreparation = {
      chemical: {
        value: totalAcidMass,
        unit: totalAcidMass >= 1 ? 'g' : 'mg',
        form: bufferSystem.acidForm,
      },
      titrant: {
        value: naohVolumeML,
        unit: 'mL',
        form: '1 M NaOH',
        type: 'NaOH',
        concentration: titrantConcentration,
      },
      steps: altSteps,
    };
  } else {
    altSteps.push(`Using base form (${bufferSystem.baseForm}) + HCl`);
    altSteps.push(``);
    altSteps.push(`1. Weigh ${formatMass(totalBaseMass)} of ${bufferSystem.baseForm}`);
    altSteps.push(`   (MW = ${bufferSystem.mw.base.toFixed(2)} g/mol, ${(totalMoles * 1000).toFixed(4)} mmol)`);
    altSteps.push(``);
    altSteps.push(`2. Dissolve in ~${(finalVolume * 0.8).toFixed(0)} mL water`);
    altSteps.push(``);
    altSteps.push(`3. Add ${hclVolumeML.toFixed(2)} mL of 1 M HCl`);
    altSteps.push(`   (${(hclMolesNeeded * 1000).toFixed(4)} mmol HCl)`);
    altSteps.push(``);
    altSteps.push(`4. Check pH and adjust if needed`);
    altSteps.push(`5. Bring to final volume (${finalVolume.toFixed(0)} mL)`);

    alternativePreparation = {
      chemical: {
        value: totalBaseMass,
        unit: totalBaseMass >= 1 ? 'g' : 'mg',
        form: bufferSystem.baseForm,
      },
      titrant: {
        value: hclVolumeML,
        unit: 'mL',
        form: '1 M HCl',
        type: 'HCl',
        concentration: titrantConcentration,
      },
      steps: altSteps,
    };
  }

  return {
    success: true,
    pH: targetPH,
    acidAmount: {
      value: acidMass,
      unit: acidMass >= 1 ? 'g' : 'mg',
      form: bufferSystem.acidForm,
    },
    baseAmount: {
      value: baseMass,
      unit: baseMass >= 1 ? 'g' : 'mg',
      form: bufferSystem.baseForm,
    },
    warnings,
    steps,
    bufferCapacity,
    alternativePreparation,
  };
}

// ============================================================================
// Species Distribution Solver (for polyprotic acids)
// ============================================================================

/**
 * Calculate alpha fractions for a polyprotic acid
 * For a triprotic acid H3A:
 *   α₀ = [H3A]/Ctotal (fully protonated)
 *   α₁ = [H2A⁻]/Ctotal
 *   α₂ = [HA²⁻]/Ctotal
 *   α₃ = [A³⁻]/Ctotal (fully deprotonated)
 */
export function calculateSpeciesDistribution(
  pKaValues: number[],
  pH: number,
  totalConcentration?: number
): SpeciesFraction[] {
  const H = Math.pow(10, -pH);
  const Ka = pKaValues.map(pKa => Math.pow(10, -pKa));

  // Calculate denominator D
  // For triprotic: D = [H⁺]³ + Ka₁[H⁺]² + Ka₁Ka₂[H⁺] + Ka₁Ka₂Ka₃
  let D = Math.pow(H, pKaValues.length);
  let KaProduct = 1;

  for (let i = 0; i < Ka.length; i++) {
    KaProduct *= Ka[i];
    D += KaProduct * Math.pow(H, pKaValues.length - 1 - i);
  }

  // Calculate alpha fractions
  const fractions: SpeciesFraction[] = [];
  let HProduct = Math.pow(H, pKaValues.length);

  // Fully protonated form (α₀)
  fractions.push({
    species: `H${pKaValues.length}A`,
    formula: getProtonatedFormula(pKaValues.length, 0),
    fraction: HProduct / D,
    concentration: totalConcentration ? (HProduct / D) * totalConcentration : undefined,
  });

  // Intermediate and deprotonated forms
  KaProduct = 1;
  for (let i = 0; i < pKaValues.length; i++) {
    KaProduct *= Ka[i];
    const term = KaProduct * Math.pow(H, pKaValues.length - 1 - i);

    fractions.push({
      species: getSpeciesName(pKaValues.length, i + 1),
      formula: getProtonatedFormula(pKaValues.length, i + 1),
      fraction: term / D,
      concentration: totalConcentration ? (term / D) * totalConcentration : undefined,
    });
  }

  return fractions;
}

/**
 * Calculate buffer preparation using species distribution
 * More accurate for polyprotic acids with overlapping pKa values (e.g., citric acid)
 */
export function calculatePolyproticBufferPreparation(
  input: BufferCalculationInput
): PhCalculationResult {
  const { bufferSystem, targetPH, totalConcentration, finalVolume, temperature } = input;

  const steps: string[] = [];
  const warnings: string[] = [];

  // Temperature-corrected pKa values
  const pKaValues = bufferSystem.pKa.map((_, idx) =>
    getPKaAtTemperature(bufferSystem, temperature, idx)
  );

  steps.push(`Polyprotic Buffer: ${bufferSystem.name}`);
  steps.push(`pKa values at ${temperature}°C: ${pKaValues.map(p => p.toFixed(2)).join(', ')}`);
  steps.push(`Target pH: ${targetPH.toFixed(2)}`);
  steps.push(``);

  // Calculate species distribution
  const species = calculateSpeciesDistribution(pKaValues, targetPH, totalConcentration);

  steps.push(`Species distribution at pH ${targetPH.toFixed(2)}:`);
  species.forEach(s => {
    steps.push(`  ${s.formula}: ${(s.fraction * 100).toFixed(1)}%`);
  });

  // Check for overlapping pKa values
  for (let i = 0; i < pKaValues.length - 1; i++) {
    if (Math.abs(pKaValues[i + 1] - pKaValues[i]) < 2) {
      warnings.push(
        `pKa values are close (Δ = ${Math.abs(pKaValues[i + 1] - pKaValues[i]).toFixed(1)}). ` +
        `Species distribution solver used for accurate calculation.`
      );
      break;
    }
  }

  // Determine which components to mix
  // Find the two dominant species
  const sortedSpecies = [...species].sort((a, b) => b.fraction - a.fraction);
  const dominant = sortedSpecies.slice(0, 2);

  steps.push(``);
  steps.push(`Dominant species: ${dominant.map(s => `${s.formula} (${(s.fraction * 100).toFixed(1)}%)`).join(' and ')}`);

  // For preparation, typically mix the fully protonated acid with strong base (NaOH)
  // or mix different salt forms
  const volumeL = finalVolume / 1000;
  const acidMoles = totalConcentration * volumeL;
  const acidMass = acidMoles * bufferSystem.mw.acid;

  // Calculate amount of base needed to reach target pH
  // This depends on how much needs to be deprotonated
  let equivalentsNeeded = 0;
  for (let i = 0; i < species.length; i++) {
    equivalentsNeeded += i * species[i].fraction;
  }

  const baseMoles = acidMoles * equivalentsNeeded;

  steps.push(``);
  steps.push(`=== Preparation Method (Titration) ===`);
  steps.push(`1. Weigh ${formatMass(acidMass)} of ${bufferSystem.acidForm}`);
  steps.push(`2. Dissolve in ~${Math.round(finalVolume * 0.9)} mL water`);
  steps.push(`3. Add NaOH to reach pH ${targetPH.toFixed(2)} (approximately ${(baseMoles * 1000).toFixed(2)} mmol)`);
  steps.push(`4. Adjust volume to ${finalVolume.toFixed(0)} mL`);
  steps.push(`5. Verify pH with calibrated meter`);

  // Calculate alternative preparation with 1 M NaOH
  const titrantConcentration = 1.0; // 1 M stock solution
  const naohVolumeML = (baseMoles / titrantConcentration) * 1000;

  const altSteps: string[] = [];
  altSteps.push(`=== Alternative Preparation (Single Chemical) ===`);
  altSteps.push(`Using acid form (${bufferSystem.acidForm}) + NaOH`);
  altSteps.push(``);
  altSteps.push(`1. Weigh ${formatMass(acidMass)} of ${bufferSystem.acidForm}`);
  altSteps.push(`   (MW = ${bufferSystem.mw.acid.toFixed(2)} g/mol, ${(acidMoles * 1000).toFixed(4)} mmol)`);
  altSteps.push(``);
  altSteps.push(`2. Dissolve in ~${(finalVolume * 0.8).toFixed(0)} mL water`);
  altSteps.push(``);
  altSteps.push(`3. Add ${naohVolumeML.toFixed(2)} mL of 1 M NaOH`);
  altSteps.push(`   (${(baseMoles * 1000).toFixed(4)} mmol NaOH)`);
  altSteps.push(``);
  altSteps.push(`4. Check pH and adjust if needed`);
  altSteps.push(`5. Bring to final volume (${finalVolume.toFixed(0)} mL)`);

  return {
    success: true,
    pH: targetPH,
    acidAmount: {
      value: acidMass,
      unit: acidMass >= 1 ? 'g' : 'mg',
      form: bufferSystem.acidForm,
    },
    baseAmount: {
      value: baseMoles * 40.00, // NaOH MW
      unit: 'g',
      form: 'NaOH (for titration)',
    },
    warnings,
    steps,
    speciesDistribution: species,
    alternativePreparation: {
      chemical: {
        value: acidMass,
        unit: acidMass >= 1 ? 'g' : 'mg',
        form: bufferSystem.acidForm,
      },
      titrant: {
        value: naohVolumeML,
        unit: 'mL',
        form: '1 M NaOH',
        type: 'NaOH',
        concentration: titrantConcentration,
      },
      steps: altSteps,
    },
  };
}

// ============================================================================
// pH Adjustment Calculations
// ============================================================================

/**
 * Calculate amount of strong acid or base needed to adjust buffer to target pH
 * For acid: Ca = (Cb × [H⁺]) / (Ka + [H⁺]) + [H⁺] - Kw/[H⁺]
 * For base: Cb = (Cb_buffer × Ka) / (Ka + [H⁺]) - [H⁺] + Kw/[H⁺]
 */
export function calculateAcidNeededForPHAdjustment(
  input: PHAdjustmentInput,
  temperature: number = 25
): PhCalculationResult {
  const {
    currentPH,
    targetPH,
    bufferConcentration,
    bufferPKa,
    volume,
    adjustingWith,
    adjustingConcentration,
  } = input;

  const steps: string[] = [];
  const warnings: string[] = [];

  const pKw = getPKw(temperature);
  const Kw = Math.pow(10, -pKw);
  const Ka = Math.pow(10, -bufferPKa);
  const targetH = Math.pow(10, -targetPH);
  const currentH = Math.pow(10, -currentPH);

  steps.push(`pH Adjustment Calculation`);
  steps.push(`Current pH: ${currentPH.toFixed(2)} → Target pH: ${targetPH.toFixed(2)}`);
  steps.push(`Buffer concentration: ${(bufferConcentration * 1000).toFixed(1)} mM`);
  steps.push(`Buffer pKa: ${bufferPKa.toFixed(2)}`);
  steps.push(`Volume: ${volume.toFixed(1)} mL`);
  steps.push(`Adjusting with: ${adjustingWith === 'acid' ? 'Strong Acid (HCl)' : 'Strong Base (NaOH)'}`);
  steps.push(``);

  const volumeL = volume / 1000;

  if (adjustingWith === 'acid') {
    // Lowering pH - adding acid
    if (targetPH >= currentPH) {
      warnings.push('Target pH is higher than current pH - use base instead of acid');
      return { success: false, warnings, steps };
    }

    // Calculate acid concentration needed at equilibrium
    // Ca = (Cb × [H⁺]) / (Ka + [H⁺]) + [H⁺] - Kw/[H⁺]
    const CaTarget = (bufferConcentration * targetH) / (Ka + targetH) + targetH - Kw / targetH;
    const CaCurrent = (bufferConcentration * currentH) / (Ka + currentH) + currentH - Kw / currentH;
    const CaDelta = CaTarget - CaCurrent;

    steps.push(`Formula: Cₐ = (C_buffer × [H⁺]) / (Kₐ + [H⁺]) + [H⁺] - Kw/[H⁺]`);
    steps.push(`[H⁺]_target = 10^(-${targetPH.toFixed(2)}) = ${targetH.toExponential(3)} M`);
    steps.push(`Kₐ = 10^(-${bufferPKa.toFixed(2)}) = ${Ka.toExponential(3)}`);
    steps.push(`ΔCₐ = ${CaDelta.toExponential(3)} M`);

    const acidMoles = CaDelta * volumeL;
    const stockVolumeML = (acidMoles / adjustingConcentration) * 1000;

    steps.push(``);
    steps.push(`Acid needed: ${(CaDelta * 1000).toFixed(4)} mM = ${(acidMoles * 1000).toFixed(4)} mmol`);
    steps.push(`Volume of ${adjustingConcentration} M HCl: ${stockVolumeML.toFixed(3)} mL`);

    if (stockVolumeML < 0) {
      warnings.push('Negative volume calculated - you need to add base, not acid');
      return { success: false, warnings, steps };
    }

    steps.push(``);
    steps.push(`=== Preparation Instructions ===`);
    steps.push(`1. Start with ~${Math.round(volume * 0.9)} mL of your buffer solution`);
    steps.push(`2. Add ${stockVolumeML.toFixed(2)} mL of ${adjustingConcentration} M HCl`);
    steps.push(`3. Mix thoroughly`);
    steps.push(`4. Top up to ${volume.toFixed(0)} mL final volume`);
    steps.push(`5. Verify pH with calibrated meter`);

    return {
      success: true,
      pH: targetPH,
      acidAmount: {
        value: stockVolumeML,
        unit: 'mL',
        form: `${adjustingConcentration} M HCl`,
      },
      warnings,
      steps,
    };
  } else {
    // Raising pH - adding base
    if (targetPH <= currentPH) {
      warnings.push('Target pH is lower than current pH - use acid instead of base');
      return { success: false, warnings, steps };
    }

    // Calculate base concentration needed
    // For base: need to convert HA → A⁻
    // Cb = (Cb_buffer × Ka) / (Ka + [H⁺]) - [H⁺] + Kw/[H⁺]
    const CbTarget = (bufferConcentration * Ka) / (Ka + targetH) - targetH + Kw / targetH;
    const CbCurrent = (bufferConcentration * Ka) / (Ka + currentH) - currentH + Kw / currentH;
    const CbDelta = CbTarget - CbCurrent;

    steps.push(`Formula: C_b = (C_buffer × Kₐ) / (Kₐ + [H⁺]) - [H⁺] + Kw/[H⁺]`);
    steps.push(`[H⁺]_target = 10^(-${targetPH.toFixed(2)}) = ${targetH.toExponential(3)} M`);
    steps.push(`Kₐ = 10^(-${bufferPKa.toFixed(2)}) = ${Ka.toExponential(3)}`);
    steps.push(`ΔC_b = ${CbDelta.toExponential(3)} M`);

    const baseMoles = CbDelta * volumeL;
    const stockVolumeML = (baseMoles / adjustingConcentration) * 1000;

    steps.push(``);
    steps.push(`Base needed: ${(CbDelta * 1000).toFixed(4)} mM = ${(baseMoles * 1000).toFixed(4)} mmol`);
    steps.push(`Volume of ${adjustingConcentration} M NaOH: ${stockVolumeML.toFixed(3)} mL`);

    if (stockVolumeML < 0) {
      warnings.push('Negative volume calculated - you need to add acid, not base');
      return { success: false, warnings, steps };
    }

    steps.push(``);
    steps.push(`=== Preparation Instructions ===`);
    steps.push(`1. Start with ~${Math.round(volume * 0.9)} mL of your buffer solution`);
    steps.push(`2. Add ${stockVolumeML.toFixed(2)} mL of ${adjustingConcentration} M NaOH`);
    steps.push(`3. Mix thoroughly`);
    steps.push(`4. Top up to ${volume.toFixed(0)} mL final volume`);
    steps.push(`5. Verify pH with calibrated meter`);

    return {
      success: true,
      pH: targetPH,
      baseAmount: {
        value: stockVolumeML,
        unit: 'mL',
        form: `${adjustingConcentration} M NaOH`,
      },
      warnings,
      steps,
    };
  }
}

// ============================================================================
// Ionic Strength Correction (Davies Equation)
// ============================================================================

/**
 * Calculate activity coefficient using Davies equation
 * log₁₀(γ) = -0.509 × z² × (√I/(1+√I) - 0.3I)
 */
export function calculateDaviesActivityCoefficient(
  ionicStrength: number,
  charge: number
): number {
  const sqrtI = Math.sqrt(ionicStrength);
  const logGamma = -DAVIES_A * Math.pow(charge, 2) * (sqrtI / (1 + sqrtI) - 0.3 * ionicStrength);
  return Math.pow(10, logGamma);
}

/**
 * Calculate pKa correction using Davies equation
 * pKa_apparent = pKa_thermo - 0.509 × (2z+1) × (√I/(1+√I) - 0.3I)
 */
export function calculateDaviesCorrection(
  ionicStrength: number,
  acidCharge: number
): number {
  const sqrtI = Math.sqrt(ionicStrength);
  const factor = sqrtI / (1 + sqrtI) - 0.3 * ionicStrength;
  return -DAVIES_A * (2 * acidCharge + 1) * factor;
}

/**
 * Calculate ionic strength from buffer components
 * I = ½ΣcᵢZᵢ²
 */
export function calculateIonicStrength(
  concentrations: { concentration: number; charge: number }[]
): number {
  return 0.5 * concentrations.reduce(
    (sum, { concentration, charge }) => sum + concentration * Math.pow(charge, 2),
    0
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format mass for display
 */
function formatMass(massGrams: number): string {
  if (massGrams >= 1) {
    return `${massGrams.toFixed(4)} g`;
  } else if (massGrams >= 0.001) {
    return `${(massGrams * 1000).toFixed(2)} mg`;
  } else {
    return `${(massGrams * 1000000).toFixed(2)} μg`;
  }
}

/**
 * Get species name for polyprotic acid
 */
function getSpeciesName(totalProtons: number, deprotonated: number): string {
  const remaining = totalProtons - deprotonated;
  if (remaining === 0) return 'A' + '⁻'.repeat(totalProtons);
  return `H${remaining}A` + '⁻'.repeat(deprotonated);
}

/**
 * Get formula representation
 */
function getProtonatedFormula(totalProtons: number, deprotonated: number): string {
  const remaining = totalProtons - deprotonated;
  const charge = deprotonated;

  let formula = '';
  if (remaining > 0) {
    formula = remaining === 1 ? 'HA' : `H${remaining}A`;
  } else {
    formula = 'A';
  }

  if (charge > 0) {
    formula += charge === 1 ? '⁻' : `${charge}⁻`;
  }

  return formula;
}

/**
 * Calculate concentration of acid needed to achieve target pH from base form
 */
export function calculateConcentrationForTargetPH(
  targetPH: number,
  pKa: number,
  totalConcentration: number
): { acidConc: number; baseConc: number } {
  const ratio = Math.pow(10, targetPH - pKa);
  const acidConc = totalConcentration / (1 + ratio);
  const baseConc = totalConcentration - acidConc;
  return { acidConc, baseConc };
}

/**
 * Validate pH value
 */
export function isValidPH(pH: number): boolean {
  return pH >= -1 && pH <= 15;
}

/**
 * Get suggested buffers for a target pH
 */
export function getSuggestedBuffers(
  targetPH: number,
  allBuffers: BufferSystem[]
): BufferSystem[] {
  return allBuffers
    .filter(b => targetPH >= b.effectiveRange[0] && targetPH <= b.effectiveRange[1])
    .sort((a, b) => {
      // Sort by distance from pKa
      const distA = Math.min(...a.pKa.map(pKa => Math.abs(targetPH - pKa)));
      const distB = Math.min(...b.pKa.map(pKa => Math.abs(targetPH - pKa)));
      return distA - distB;
    });
}
