# pH Calculator Research & Specification

## Overview
A comprehensive pH calculator for laboratory use, calculating the amount of common lab acids/bases needed to achieve target pH values.

---

## 1. Common Laboratory Acids & Bases

### 1.1 Strong Acids (Complete Dissociation)

| Acid | Formula | pKa | Stock Conc | MW (g/mol) | Density (g/mL) |
|------|---------|-----|------------|------------|----------------|
| Hydrochloric acid | HCl | −7 | 37% (12.1 M) | 36.46 | 1.18 |
| Nitric acid | HNO₃ | −1.3 | 70% (15.8 M) | 63.01 | 1.42 |
| Sulfuric acid | H₂SO₄ | −3, 1.99 | 98% (18.0 M) | 98.08 | 1.84 |

### 1.2 Strong Bases

| Base | Formula | Stock Conc | MW (g/mol) |
|------|---------|------------|------------|
| Sodium hydroxide | NaOH | 10 M | 40.00 |
| Potassium hydroxide | KOH | 10 M | 56.11 |

### 1.3 Weak Acids (for Buffers)

| Acid | Formula | pKa Values | Effective pH Range | Notes |
|------|---------|------------|-------------------|-------|
| **Phosphoric acid** | H₃PO₄ | 2.15, 7.20, 12.38 | 2-3, 6-8, 11-13 | pKa values well-separated |
| **Acetic acid** | CH₃COOH | 4.76 | 3.7-5.7 | Simple monoprotic |
| **Citric acid** | C₆H₈O₇ | 3.13, 4.76, 6.40 | 3.0-6.2 | ⚠️ pKa values OVERLAP - requires species solver |
| Formic acid | HCOOH | 3.75 | 2.8-4.8 | |
| Oxalic acid | H₂C₂O₄ | 1.25, 4.27 | 2-5 | |

### 1.4 Good's Biological Buffers

| Buffer | pKa (25°C) | Effective Range | dpKa/dT | Temp Sensitivity |
|--------|------------|-----------------|---------|------------------|
| **MES** | 6.15 | 5.5-6.7 | −0.011 | Low |
| **Bis-Tris** | 6.46 | 5.8-7.2 | −0.017 | Moderate |
| **PIPES** | 6.76 | 6.1-7.5 | −0.009 | **Very Low** ✓ |
| **MOPS** | 7.20 | 6.5-7.9 | −0.013 | Low |
| **HEPES** | 7.55 | 6.8-8.2 | −0.014 | Low |
| **Tricine** | 8.05 | 7.4-8.8 | −0.021 | Moderate |
| **Tris** | 8.06 | 7.0-9.0 | **−0.028** | ⚠️ **VERY HIGH** |
| **TAPS** | 8.40 | 7.7-9.1 | −0.018 | Moderate |
| **Glycine** | 9.78 | 8.8-10.6 | −0.025 | High |

---

## 2. Critical Warnings & Incompatibilities

### 2.1 Temperature Sensitivity (CRITICAL)

**Tris Buffer Warning:**
```
⚠️ CRITICAL: Tris has extreme temperature sensitivity (dpKa/dT = -0.028)

A Tris solution made to pH 8.0 at 25°C will be:
  • pH 8.6 at 4°C (cold room) — 0.6 pH units HIGHER
  • pH 7.8 at 37°C (incubator) — 0.2 pH units LOWER

ALWAYS prepare Tris buffers at the temperature you will use them!
```

**Temperature Correction Formula:**
```
pKa(T) = pKa(25°C) + dpKa/dT × (T − 25)

Example for Tris at 4°C:
pKa(4) = 8.06 + (−0.028) × (4 − 25) = 8.06 + 0.588 = 8.65
```

### 2.2 Chemical Incompatibilities

| Combination | Problem | Severity |
|-------------|---------|----------|
| **Citrate + Calcium** | Chelation of Ca²⁺ | High |
| **Phosphate + Calcium** | CaHPO₄ precipitates | High |
| **Phosphate + Magnesium** | MgHPO₄ precipitates | High |
| **Tris + DEPC treatment** | DEPC reacts with primary amines | High |
| **MOPS/MES + Autoclave + Glucose** | Degradation/browning | Moderate |
| **Borate + cis-diols** | Complex formation | Context-dependent |

---

## 3. Mathematical Formulas

### 3.1 Basic pH Calculations

**Strong Acid pH:**
```
pH = −log₁₀[H⁺]
[H⁺] = [acid concentration]  (for conc >> 10⁻⁷ M)
```

**Strong Base pH:**
```
pOH = −log₁₀[OH⁻]
pH = 14 − pOH  (at 25°C)
```

**Very Dilute Solutions (< 10⁻⁶ M):**
Must account for water autoionization:
```
[H⁺] = (C₀/2) + √(C₀²/4 + Kw)
where Kw = 10⁻¹⁴ at 25°C
```

### 3.2 Henderson-Hasselbalch Equation (Simple Buffers)

```
pH = pKa + log₁₀([A⁻]/[HA])
```

**Rearranged for ratio:**
```
[A⁻]/[HA] = 10^(pH − pKa)
```

**Limitations:**
- Only accurate for monoprotic acids OR polyprotic acids with pKa values >3 units apart
- Poor accuracy for pKa < 2.5 or > 11.5
- Assumes dilute solutions (< 0.1 M without activity correction)

### 3.3 Reverse Calculation: Strong Acid → Weak Base Buffer

To calculate the exact amount of Strong Acid (Cₐ) needed to adjust a Weak Base buffer (C_buffer) to target [H⁺]:

```
Cₐ = (C_buffer × [H⁺]) / (Ka + [H⁺]) + [H⁺] − Kw/[H⁺]
```

Where:
- Cₐ = concentration of strong acid to add
- C_buffer = total buffer concentration
- [H⁺] = 10^(−pH_target)
- Ka = acid dissociation constant of the buffer
- Kw = water autoionization constant (10⁻¹⁴ at 25°C)

### 3.4 Polyprotic Acid Species Distribution (REQUIRED for Citric Acid)

For a triprotic acid H₃A with pKa₁, pKa₂, pKa₃:

**Alpha (α) fractions:**
```
D = [H⁺]³ + Ka₁[H⁺]² + Ka₁Ka₂[H⁺] + Ka₁Ka₂Ka₃

α₀ = [H₃A]/C_total = [H⁺]³/D           (fully protonated)
α₁ = [H₂A⁻]/C_total = Ka₁[H⁺]²/D
α₂ = [HA²⁻]/C_total = Ka₁Ka₂[H⁺]/D
α₃ = [A³⁻]/C_total = Ka₁Ka₂Ka₃/D       (fully deprotonated)
```

**Why this matters for Citric Acid:**
- pKa values (3.13, 4.76, 6.40) are only ~1.5 units apart
- At pH 4.0, multiple species coexist in significant amounts
- Simple H-H equation introduces 10-20% error
- Species solver required for accurate calculations

### 3.5 Ionic Strength Correction (Davies Equation)

```
log₁₀(γ) = −0.509 × z² × (√I/(1+√I) − 0.3I)
```

Where:
- γ = activity coefficient
- z = ion charge
- I = ionic strength = ½ΣcᵢZᵢ²

**Corrected pKa:**
```
pKa_apparent = pKa_thermodynamic − 0.509 × (2z+1) × (√I/(1+√I) − 0.3I)
```

**Validity:**
- ✓ Valid for I < 0.5 M
- ⚠️ For I > 0.5 M: Display warning, disable correction
- Consider Pitzer equations for very high ionic strength (likely overkill)

### 3.6 Temperature Correction for Kw

```
pKw values:
  0°C:  14.94
  4°C:  14.79
  25°C: 14.00
  37°C: 13.62
```

---

## 4. Feature Specification

### 4.1 Core Features (MVP)

#### Tab 1: Strong Acid/Base pH
- Input: acid/base type, concentration, volume
- Output: resulting pH
- Handle very dilute solutions correctly

#### Tab 2: Buffer Maker (Henderson-Hasselbalch)
- Input: buffer system, target pH, final volume, total concentration
- Output: amounts of acid and conjugate base needed
- Show buffer capacity warning if outside pKa ± 1

#### Tab 3: pH Adjustment
- "How much HCl/NaOH to add to reach target pH?"
- Use the exact formula (Section 3.3) for accuracy
- Account for initial buffer if present

#### Tab 4: Common Buffer Recipes
Pre-configured recipes for:
- Phosphate buffer (pH 5.8-8.0)
- Acetate buffer (pH 3.6-5.6)
- Citrate buffer (pH 3.0-6.2)
- Tris buffer (pH 7.0-9.0)
- HEPES buffer (pH 6.8-8.2)

### 4.2 Advanced Features

#### Temperature Correction
- Dropdown: 4°C, 20°C, 25°C, 37°C, Custom
- Auto-adjust pKa based on dpKa/dT
- **PROMINENT warning for Tris at non-ambient temps**

#### Ionic Strength Correction
- Toggle: Enable/Disable Davies correction
- Auto-calculate I from buffer + salt concentrations
- Warning if I > 0.5 M

#### Species Distribution Solver
- Required for Citric Acid
- Show pie chart or bar graph of species at given pH
- Use alpha fraction equations

#### Titration Curve Visualization
- Interactive graph: pH vs. titrant volume
- Highlight:
  - Equivalence point(s)
  - Buffer region (pKa ± 1)
  - "Dead zones" with poor buffering

### 4.3 UX Features

#### Buffer Zone Visualization
When user selects target pH:
```
┌─────────────────────────────────────────────────┐
│  Phosphate Buffer Effective Ranges              │
│                                                 │
│  pH: 1  2  3  4  5  6  7  8  9  10 11 12 13    │
│      ████               ██████████      ████    │
│      pKa₁              pKa₂           pKa₃      │
│       2.15              7.20           12.38    │
│                                                 │
│  Your target: pH 9.0  ⚠️ DEAD ZONE             │
│  Suggestion: Use Tris or Glycine instead        │
└─────────────────────────────────────────────────┘
```

#### The "Glug Factor" - Practical Lab Output

**Bad output:**
```
Add 3.45 mL of HCl to 996.55 mL of water.
```

**Good output:**
```
Preparation Instructions:
1. Start with ~900 mL of deionized water in a beaker
2. Add 3.45 mL of 1M HCl (use calibrated pipette)
3. Mix thoroughly
4. Top up to 1000 mL final volume
5. Verify pH with calibrated meter
```

#### Unit Flexibility
Support inputs in:
- Concentration: M, mM, µM, % w/v
- Volume: L, mL, µL
- Mass: g, mg
- Temperature: °C, K

#### Warnings System
Display context-aware warnings:
- Buffer capacity limits
- Temperature sensitivity
- Chemical incompatibilities
- Ionic strength limits
- Polyprotic acid complexity

---

## 5. Data Sources & References

### Primary Scientific References
1. [Chemistry LibreTexts - Henderson-Hasselbalch](https://chem.libretexts.org/Courses/Brevard_College/CHE_104:_Principles_of_Chemistry_II/07:_Acid_and_Base_Equilibria/7.24:_Calculating_pH_of_Buffer_Solutions-_Henderson-Hasselbalch_equation)
2. [PMC - Universal Buffers for Biochemistry](https://pmc.ncbi.nlm.nih.gov/articles/PMC8956001/)
3. [Calbiochem Buffers Guide](https://www.med.unc.edu/pharm/sondeklab/wp-content/uploads/sites/868/2018/10/buffers_calbiochem.pdf)
4. [Wikipedia - Acid Dissociation Constant](https://en.wikipedia.org/wiki/Acid_dissociation_constant)
5. [Wikipedia - Davies Equation](https://en.wikipedia.org/wiki/Davies_equation)

### pKa Data Tables
1. [Oxford pKa Table](https://global.oup.com/us/companion.websites/fdscontent/uscompanion/us/static/companion.websites/9780197651896/Table_7.2_Acidity_constants_for_common_acids.pdf)
2. [Williams pKa Compilation](https://organicchemistrydata.org/hansreich/resources/pka/pka_data/pka-compilation-williams.pdf)
3. [ReachDevices Biological Buffer Calculator](https://www.reachdevices.com/Protein/BiologicalBuffers.html)

### Buffer Preparation Protocols
1. [Sigma-Aldrich Buffer Reference Center](https://www.sigmaaldrich.com/US/en/technical-documents/protocol/protein-biology/protein-concentration-and-buffer-exchange/buffer-reference-center)
2. [AAT Bioquest Buffer Recipes](https://www.aatbio.com/resources/buffer-preparations-and-recipes/citrate-buffer-ph-3-to-6-2)
3. [Promega Buffers Guide](https://www.promega.com/resources/guides/lab-equipment-and-supplies/buffers-for-biochemical-reactions/)

### Online Calculators (Reference)
1. [Sigma-Aldrich Buffer Calculator](https://www.sigmaaldrich.com/US/en/support/calculators-and-apps/buffer-calculator)
2. [Omni Calculator - Buffer pH](https://www.omnicalculator.com/chemistry/buffer-ph)

---

## 6. Implementation Architecture

### File Structure
```
src/
├── components/
│   └── PhCalculator.tsx           # Main component with tabs
├── utils/
│   └── phCalculations.ts          # All calculation logic
├── data/
│   └── bufferData.ts              # pKa values, buffer recipes, warnings
└── types/
    └── index.ts                   # Add pH-related types
```

### Integration Point
Add as sub-tab in `Calculator.tsx` (Solution section):
```typescript
type CalculatorTab = 'calculator' | 'recipes' | 'dilution' | 'ph';
```

### Key Data Structures

```typescript
// Buffer system definition
interface BufferSystem {
  id: string;
  name: string;
  acidName: string;
  baseName: string;
  pKa: number[];                    // Array for polyprotic
  dpKadT: number;                   // Temperature coefficient
  effectiveRange: [number, number]; // pH range
  mw: {
    acid: number;
    base: number;
    [key: string]: number;          // For polyprotic salts
  };
  incompatibilities?: string[];
  warnings?: string[];
}

// Calculation result
interface PhCalculationResult {
  success: boolean;
  pH?: number;
  acidAmount?: { value: number; unit: string };
  baseAmount?: { value: number; unit: string };
  warnings: string[];
  steps: string[];                  // Step-by-step breakdown
  speciesDistribution?: {           // For polyprotic
    species: string;
    fraction: number;
  }[];
}
```

---

## 7. Testing Considerations

### Validation Test Cases
1. Strong acid dilution: 1M HCl → pH 0, 0.01M HCl → pH 2
2. Very dilute acid: 10⁻⁸ M HCl → pH ~6.98 (not 8!)
3. Acetate buffer at pKa: equal moles → pH 4.76
4. Tris temperature shift: pH 8.0 at 25°C → pH 8.6 at 4°C
5. Citric acid species: verify against published alpha curves
6. Ionic strength: compare Davies correction to published values

### Edge Cases
- pH at exact pKa (1:1 ratio)
- Very high/low target pH (outside buffer range)
- Zero volume or concentration inputs
- Negative pH (concentrated strong acids)
- High ionic strength (> 0.5 M)

---

*Document Version: 1.0*
*Last Updated: 2025-11-25*
*For: Protein Engineering Tools - pH Calculator Feature*
