/**
 * Unit tests for calculation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMass,
  calculateMolarity,
  calculateVolume,
  calculateDilution,
  performCalculation,
  validateCalculation,
  formatNumber,
  convertToMolarity,
  convertToMilliliters,
} from './calculations';
import { CalculationMode, ConcentrationUnit, VolumeUnit } from '@/types';

describe('Molarity Calculations', () => {
  describe('calculateMass', () => {
    it('should calculate mass correctly for a simple case', () => {
      // 1M solution, 100mL, MW=100 g/mol
      const mass = calculateMass(1, 100, 100);
      expect(mass).toBeCloseTo(10, 4); // 10 grams
    });

    it('should calculate mass for 0.5M NaCl in 100mL', () => {
      // 0.5M, 100mL, NaCl MW=58.44 g/mol
      const mass = calculateMass(0.5, 100, 58.44);
      expect(mass).toBeCloseTo(2.922, 3); // ~2.922 grams
    });

    it('should handle small volumes', () => {
      // 1M, 1mL, MW=100
      const mass = calculateMass(1, 1, 100);
      expect(mass).toBeCloseTo(0.1, 4); // 0.1 grams
    });
  });

  describe('calculateMolarity', () => {
    it('should calculate molarity correctly', () => {
      // 5g in 100mL, MW=100 g/mol
      const molarity = calculateMolarity(5, 100, 100);
      expect(molarity).toBeCloseTo(0.5, 4); // 0.5M
    });

    it('should calculate molarity for Tris-HCl', () => {
      // 121.14g in 1000mL, MW=121.14 g/mol
      const molarity = calculateMolarity(121.14, 1000, 121.14);
      expect(molarity).toBeCloseTo(1, 4); // 1M
    });
  });

  describe('calculateVolume', () => {
    it('should calculate volume correctly', () => {
      // 5g, 0.5M, MW=100 g/mol
      const volume = calculateVolume(5, 0.5, 100);
      expect(volume).toBeCloseTo(100, 4); // 100 mL
    });

    it('should calculate volume for small masses', () => {
      // 0.5g, 1M, MW=100 g/mol
      const volume = calculateVolume(0.5, 1, 100);
      expect(volume).toBeCloseTo(5, 4); // 5 mL
    });
  });

  describe('calculateDilution', () => {
    it('should calculate C2 (final concentration)', () => {
      const result = calculateDilution({
        c1: 10, // 10M stock
        v1: 1, // 1 mL
        v2: 10, // final volume 10 mL
      });
      expect(result.variable).toBe('c2');
      expect(result.value).toBeCloseTo(1, 4); // 1M final
    });

    it('should calculate V1 (volume needed from stock)', () => {
      const result = calculateDilution({
        c1: 10, // 10M stock
        c2: 1, // 1M final
        v2: 100, // 100 mL final
      });
      expect(result.variable).toBe('v1');
      expect(result.value).toBeCloseTo(10, 4); // 10 mL needed
    });

    it('should calculate V2 (final volume)', () => {
      const result = calculateDilution({
        c1: 10,
        v1: 5,
        c2: 1,
      });
      expect(result.variable).toBe('v2');
      expect(result.value).toBeCloseTo(50, 4); // 50 mL final
    });

    it('should calculate C1 (stock concentration)', () => {
      const result = calculateDilution({
        v1: 10,
        c2: 1,
        v2: 100,
      });
      expect(result.variable).toBe('c1');
      expect(result.value).toBeCloseTo(10, 4); // 10M stock
    });

    it('should throw error with insufficient parameters', () => {
      expect(() =>
        calculateDilution({
          c1: 10,
          c2: 1,
        })
      ).toThrow();
    });
  });
});

describe('performCalculation', () => {
  it('should perform mass calculation', () => {
    const result = performCalculation({
      mode: CalculationMode.MASS_FROM_MOLARITY,
      molarity: 1,
      volume: 100,
      molecularWeight: 100,
    });

    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(10, 4);
    expect(result.unit).toBe('g');
  });

  it('should perform molarity calculation', () => {
    const result = performCalculation({
      mode: CalculationMode.MOLARITY_FROM_MASS,
      mass: 5,
      volume: 100,
      molecularWeight: 100,
    });

    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(0.5, 4);
    expect(result.unit).toBe('M');
  });

  it('should perform volume calculation', () => {
    const result = performCalculation({
      mode: CalculationMode.VOLUME_FROM_MASS,
      mass: 5,
      molarity: 0.5,
      molecularWeight: 100,
    });

    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(100, 4);
    expect(result.unit).toBe('mL');
  });

  it('should perform dilution calculation', () => {
    const result = performCalculation({
      mode: CalculationMode.DILUTION,
      initialMolarity: 10,
      initialVolume: 10,
      finalVolume: 100,
    });

    expect(result.success).toBe(true);
    expect(result.value).toBeCloseTo(1, 4);
    expect(result.unit).toBe('M');
  });

  it('should return error for missing parameters', () => {
    const result = performCalculation({
      mode: CalculationMode.MASS_FROM_MOLARITY,
      molarity: 1,
      // missing volume and molecularWeight
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Unit Conversions', () => {
  describe('convertToMolarity', () => {
    it('should convert M to M', () => {
      expect(convertToMolarity(1, ConcentrationUnit.MOLAR)).toBe(1);
    });

    it('should convert mM to M', () => {
      expect(convertToMolarity(1000, ConcentrationUnit.MILLIMOLAR)).toBe(1);
    });

    it('should convert μM to M', () => {
      expect(convertToMolarity(1000000, ConcentrationUnit.MICROMOLAR)).toBe(1);
    });

    it('should convert nM to M', () => {
      expect(convertToMolarity(1000000000, ConcentrationUnit.NANOMOLAR)).toBe(1);
    });
  });

  describe('convertToMilliliters', () => {
    it('should convert mL to mL', () => {
      expect(convertToMilliliters(100, VolumeUnit.MILLILITER)).toBe(100);
    });

    it('should convert L to mL', () => {
      expect(convertToMilliliters(1, VolumeUnit.LITER)).toBe(1000);
    });

    it('should convert μL to mL', () => {
      expect(convertToMilliliters(1000, VolumeUnit.MICROLITER)).toBe(1);
    });
  });
});

describe('Validation', () => {
  describe('validateCalculation', () => {
    it('should validate correct inputs', () => {
      const result = validateCalculation({
        mode: CalculationMode.MASS_FROM_MOLARITY,
        molarity: 1,
        volume: 100,
        molecularWeight: 100,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative values', () => {
      const result = validateCalculation({
        mode: CalculationMode.MASS_FROM_MOLARITY,
        molarity: -1,
        volume: 100,
        molecularWeight: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject zero values', () => {
      const result = validateCalculation({
        mode: CalculationMode.MASS_FROM_MOLARITY,
        molarity: 0,
        volume: 100,
        molecularWeight: 100,
      });

      expect(result.isValid).toBe(false);
    });

    it('should reject extremely large values', () => {
      const result = validateCalculation({
        mode: CalculationMode.MASS_FROM_MOLARITY,
        molarity: 1e10,
        volume: 100,
        molecularWeight: 100,
      });

      expect(result.isValid).toBe(false);
    });
  });
});

describe('Formatting', () => {
  describe('formatNumber', () => {
    it('should format regular numbers', () => {
      expect(formatNumber(123.456789, 2)).toBe('123.46');
    });

    it('should use scientific notation for small numbers', () => {
      const formatted = formatNumber(0.0001, 2, true);
      expect(formatted).toContain('e');
    });

    it('should use scientific notation for large numbers', () => {
      const formatted = formatNumber(1000000, 2, true);
      expect(formatted).toContain('e');
    });

    it('should respect decimal places', () => {
      expect(formatNumber(3.14159, 2)).toBe('3.14');
      expect(formatNumber(3.14159, 4)).toBe('3.1416');
    });
  });
});

describe('Real-world Examples', () => {
  it('should calculate mass for 1× PBS recipe', () => {
    // NaCl: 137 mM in 1000 mL
    const nacl = calculateMass(0.137, 1000, 58.44);
    expect(nacl).toBeCloseTo(8.006, 3); // ~8g

    // KCl: 2.7 mM in 1000 mL
    const kcl = calculateMass(0.0027, 1000, 74.55);
    expect(kcl).toBeCloseTo(0.201, 3); // ~0.2g
  });

  it('should calculate dilution for 10× PBS to 1× PBS', () => {
    // Need 100 mL of 1× PBS from 10× stock
    const result = calculateDilution({
      c1: 10,
      c2: 1,
      v2: 100,
    });

    expect(result.value).toBeCloseTo(10, 4); // Add 10 mL of 10× stock to 90 mL water
  });

  it('should calculate mass for 1M Tris-HCl buffer', () => {
    // 1M Tris-HCl in 1L
    const mass = calculateMass(1, 1000, 121.14);
    expect(mass).toBeCloseTo(121.14, 2); // 121.14g
  });
});
