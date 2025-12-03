/**
 * Main calculator component with multiple calculation modes
 */

import { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Beaker, FlaskConical, Droplet, BookOpen, Sparkles, AlertTriangle, GitBranch, FolderHeart, Loader2, Brain, Database, Globe } from 'lucide-react';
import {
  CalculationMode,
  MolarityCalculation,
  CalculationResult,
  CalculatorProps,
  ConcentrationUnit,
  VolumeUnit,
  MassUnit,
  Recipe,
  Chemical,
} from '@/types';
import { performCalculation, formatResult, convertToMolarity, convertToMilliliters, convertToGrams, convertMolarityToPpm } from '@/utils/calculations';
import { checkSolubilityAsync } from '@/data/solubility';
import { useApp } from '@/contexts/AppContext';
import ChemicalSearch from './ChemicalSearch';
import RecipeList from './RecipeList';
import RecipeBuilder from './RecipeBuilder';
import SerialDilution from './SerialDilution';
import MyRecipes from './MyRecipes';
import PhCalculator from './PhCalculator';

type CalculatorTab = 'calculator' | 'recipes' | 'dilution' | 'ph';
type RecipeSubTab = 'browse' | 'builder' | 'myrecipes';

const CALCULATION_MODES = [
  {
    mode: CalculationMode.MASS_FROM_MOLARITY,
    label: 'Calculate Mass',
    icon: Beaker,
    description: 'Find mass needed for a solution',
  },
  {
    mode: CalculationMode.MOLARITY_FROM_MASS,
    label: 'Calculate Molarity',
    icon: FlaskConical,
    description: 'Calculate concentration from mass',
  },
  {
    mode: CalculationMode.VOLUME_FROM_MASS,
    label: 'Calculate Volume',
    icon: Droplet,
    description: 'Find volume for given mass',
  },
  {
    mode: CalculationMode.DILUTION,
    label: 'Dilution (C₁V₁=C₂V₂)',
    icon: CalcIcon,
    description: 'Dilution calculations',
  },
];

export default function Calculator({ initialMode, onCalculate }: CalculatorProps) {
  const { preferences, addToRecentChemicals, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<CalculatorTab>('calculator');
  const [recipeSubTab, setRecipeSubTab] = useState<RecipeSubTab>('browse');
  const [selectedMode, setSelectedMode] = useState<CalculationMode>(
    initialMode || CalculationMode.MASS_FROM_MOLARITY
  );

  const [calculation, setCalculation] = useState<MolarityCalculation>({
    mode: selectedMode,
    molarity: undefined,
    volume: 1000,
    mass: undefined,
    molecularWeight: undefined,
  });

  // Unit state
  const [molarityUnit, setMolarityUnit] = useState<ConcentrationUnit>(ConcentrationUnit.MOLAR);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(VolumeUnit.MILLILITER);
  const [massUnit, setMassUnit] = useState<MassUnit>(MassUnit.GRAM);
  const [initialMolarityUnit, setInitialMolarityUnit] = useState<ConcentrationUnit>(ConcentrationUnit.MOLAR);
  const [finalMolarityUnit, setFinalMolarityUnit] = useState<ConcentrationUnit>(ConcentrationUnit.MOLAR);
  const [initialVolumeUnit, setInitialVolumeUnit] = useState<VolumeUnit>(VolumeUnit.MILLILITER);
  const [finalVolumeUnit, setFinalVolumeUnit] = useState<VolumeUnit>(VolumeUnit.MILLILITER);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Solubility checking
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [solubilityCheck, setSolubilityCheck] = useState<Awaited<ReturnType<typeof checkSolubilityAsync>> | null>(null);
  const [solubilityLoading, setSolubilityLoading] = useState(false);
  const [pubchemCid, setPubchemCid] = useState<string | null>(null);

  // Update calculation mode when changed
  useEffect(() => {
    setCalculation((prev) => ({ ...prev, mode: selectedMode }));
    setResult(null);
  }, [selectedMode]);

  // Handle input changes
  const handleInputChange = (field: keyof MolarityCalculation, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setCalculation((prev) => ({ ...prev, [field]: numValue }));
    setResult(null); // Clear result when inputs change
  };

  // Handle chemical selection
  const handleChemicalSelect = (chemical: Chemical) => {
    setCalculation((prev) => ({ ...prev, molecularWeight: chemical.molecularWeight }));
    setSelectedChemical(chemical);
    addToRecentChemicals(chemical.id);
    setSolubilityCheck(null); // Clear previous solubility check
  };

  // Perform calculation with unit conversion
  const handleCalculate = async () => {
    // Convert to base units (M, mL, and g) before calculation
    const convertedCalculation: MolarityCalculation = {
      ...calculation,
      molarity: calculation.molarity !== undefined
        ? convertToMolarity(calculation.molarity, molarityUnit, calculation.molecularWeight)
        : undefined,
      volume: calculation.volume !== undefined
        ? convertToMilliliters(calculation.volume, volumeUnit)
        : undefined,
      mass: calculation.mass !== undefined
        ? convertToGrams(calculation.mass, massUnit)
        : undefined,
      initialMolarity: calculation.initialMolarity !== undefined
        ? convertToMolarity(calculation.initialMolarity, initialMolarityUnit, calculation.molecularWeight)
        : undefined,
      finalMolarity: calculation.finalMolarity !== undefined
        ? convertToMolarity(calculation.finalMolarity, finalMolarityUnit, calculation.molecularWeight)
        : undefined,
      initialVolume: calculation.initialVolume !== undefined
        ? convertToMilliliters(calculation.initialVolume, initialVolumeUnit)
        : undefined,
      finalVolume: calculation.finalVolume !== undefined
        ? convertToMilliliters(calculation.finalVolume, finalVolumeUnit)
        : undefined,
    };

    const calcResult = performCalculation(convertedCalculation);
    setResult(calcResult);

    // Check solubility if calculation was successful and we have the necessary data
    // Note: Solubility check only applies to mass-based calculations (preparing solutions from solids)
    // It doesn't apply to dilution (C1V1=C2V2) since you're diluting an already-dissolved stock
    let concentrationMgML: number | null = null;

    if (calcResult.success && selectedChemical && selectedMode !== CalculationMode.DILUTION) {
      if (calcResult.value && convertedCalculation.volume) {
        // For mass-based calculations (MASS_FROM_MOLARITY, etc.)
        // Note: calcResult.value can be in grams OR milligrams depending on the magnitude
        // The unit is indicated by calcResult.unit ('g' or 'mg')
        const massInGrams = calcResult.unit === 'mg'
          ? calcResult.value / 1000  // convert mg to g
          : calcResult.value;        // already in grams
        const volumeML = convertedCalculation.volume; // in mL
        concentrationMgML = (massInGrams / volumeML) * 1000; // convert g/mL to mg/mL
      }
    }

    if (concentrationMgML !== null && selectedChemical) {
      // Extract PubChem CID if available
      let cidForCheck: string | undefined;
      if (selectedChemical.id.startsWith('pubchem-')) {
        cidForCheck = selectedChemical.id.replace('pubchem-', '');
        setPubchemCid(cidForCheck); // Store for linking
      } else {
        setPubchemCid(null);
      }

      // Use async solubility check with loading state
      setSolubilityLoading(true);
      setSolubilityCheck(null);
      try {
        const solubilityResult = await checkSolubilityAsync(
          selectedChemical.id,
          concentrationMgML,
          cidForCheck,
          selectedChemical.commonName, // Pass the chemical name for fallback lookup
          selectedChemical.smiles // Pass SMILES for ML-based prediction
        );
        setSolubilityCheck(solubilityResult);
      } catch (error) {
        console.error('Solubility check failed:', error);
        setSolubilityCheck(null);
        setPubchemCid(null);
      } finally {
        setSolubilityLoading(false);
      }
    } else {
      setSolubilityCheck(null);
      setSolubilityLoading(false);
      setPubchemCid(null);
    }

    if (calcResult.success) {
      showToast('success', 'Calculation completed');
    } else {
      showToast('error', calcResult.error || 'Calculation failed');
    }

    if (onCalculate) {
      onCalculate(calcResult);
    }
  };

  // Clear all inputs
  const handleClear = () => {
    setCalculation({
      mode: selectedMode,
      molarity: undefined,
      volume: 1000,
      mass: undefined,
      molecularWeight: undefined,
      initialMolarity: undefined,
      initialVolume: undefined,
      finalMolarity: undefined,
      finalVolume: undefined,
    });
    setMolarityUnit(ConcentrationUnit.MOLAR);
    setVolumeUnit(VolumeUnit.MILLILITER);
    setMassUnit(MassUnit.GRAM);
    setInitialMolarityUnit(ConcentrationUnit.MOLAR);
    setFinalMolarityUnit(ConcentrationUnit.MOLAR);
    setInitialVolumeUnit(VolumeUnit.MILLILITER);
    setFinalVolumeUnit(VolumeUnit.MILLILITER);
    setResult(null);
    setSolubilityCheck(null);
    setSolubilityLoading(false);
    setPubchemCid(null);
  };

  // Render input fields based on calculation mode
  const renderInputFields = () => {
    switch (selectedMode) {
      case CalculationMode.MASS_FROM_MOLARITY:
        return (
          <div className="space-y-4">
            <div>
              <label className="input-label">
                Desired Molarity *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder="e.g., 0.5"
                  step="any"
                  value={calculation.molarity ?? ''}
                  onChange={(e) => handleInputChange('molarity', e.target.value)}
                />
                <select
                  className="select-field w-32"
                  value={molarityUnit}
                  onChange={(e) => setMolarityUnit(e.target.value as ConcentrationUnit)}
                >
                  <option value={ConcentrationUnit.MOLAR}>M</option>
                  <option value={ConcentrationUnit.MILLIMOLAR}>mM</option>
                  <option value={ConcentrationUnit.MICROMOLAR}>μM</option>
                  <option value={ConcentrationUnit.NANOMOLAR}>nM</option>
                  <option value={ConcentrationUnit.PICOMOLAR}>pM</option>
                  <option value={ConcentrationUnit.PERCENT_W_V}>% w/v</option>
                  <option value={ConcentrationUnit.MG_ML}>mg/mL</option>
                  <option value={ConcentrationUnit.UG_ML}>μg/mL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Final Volume *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={`input-field flex-1 ${
                    calculation.volume === 1000 && volumeUnit === VolumeUnit.MILLILITER
                      ? 'text-slate-400 dark:text-slate-500'
                      : ''
                  }`}
                  placeholder="1000"
                  step="any"
                  value={calculation.volume ?? ''}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                />
                <select
                  className="select-field w-24"
                  value={volumeUnit}
                  onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                >
                  <option value={VolumeUnit.LITER}>L</option>
                  <option value={VolumeUnit.MILLILITER}>mL</option>
                  <option value={VolumeUnit.MICROLITER}>μL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={handleChemicalSelect}
                placeholder="Search chemical or enter MW manually"
                allowCustom={true}
              />
              <input
                type="number"
                className="input-field mt-2"
                placeholder="Or enter manually"
                step="any"
                value={calculation.molecularWeight ?? ''}
                onChange={(e) =>
                  handleInputChange('molecularWeight', e.target.value)
                }
              />
            </div>
          </div>
        );

      case CalculationMode.MOLARITY_FROM_MASS:
        return (
          <div className="space-y-4">
            <div>
              <label className="input-label">
                Mass *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder={massUnit === MassUnit.GRAM ? "e.g., 0.292" : massUnit === MassUnit.MILLIGRAM ? "e.g., 292" : "e.g., 292000"}
                  step="any"
                  value={calculation.mass ?? ''}
                  onChange={(e) => handleInputChange('mass', e.target.value)}
                />
                <select
                  className="select-field w-20"
                  value={massUnit}
                  onChange={(e) => setMassUnit(e.target.value as MassUnit)}
                >
                  <option value={MassUnit.GRAM}>g</option>
                  <option value={MassUnit.MILLIGRAM}>mg</option>
                  <option value={MassUnit.MICROGRAM}>μg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Volume *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className={`input-field flex-1 ${
                    calculation.volume === 1000 && volumeUnit === VolumeUnit.MILLILITER
                      ? 'text-slate-400 dark:text-slate-500'
                      : ''
                  }`}
                  placeholder="1000"
                  step="any"
                  value={calculation.volume ?? ''}
                  onChange={(e) => handleInputChange('volume', e.target.value)}
                />
                <select
                  className="select-field w-24"
                  value={volumeUnit}
                  onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                >
                  <option value={VolumeUnit.LITER}>L</option>
                  <option value={VolumeUnit.MILLILITER}>mL</option>
                  <option value={VolumeUnit.MICROLITER}>μL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={handleChemicalSelect}
                placeholder="Search chemical"
                allowCustom={true}
              />
              <input
                type="number"
                className="input-field mt-2"
                placeholder="Or enter manually"
                step="any"
                value={calculation.molecularWeight ?? ''}
                onChange={(e) =>
                  handleInputChange('molecularWeight', e.target.value)
                }
              />
            </div>
          </div>
        );

      case CalculationMode.VOLUME_FROM_MASS:
        return (
          <div className="space-y-4">
            <div>
              <label className="input-label">
                Mass Available *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder={massUnit === MassUnit.GRAM ? "e.g., 0.292" : massUnit === MassUnit.MILLIGRAM ? "e.g., 292" : "e.g., 292000"}
                  step="any"
                  value={calculation.mass ?? ''}
                  onChange={(e) => handleInputChange('mass', e.target.value)}
                />
                <select
                  className="select-field w-20"
                  value={massUnit}
                  onChange={(e) => setMassUnit(e.target.value as MassUnit)}
                >
                  <option value={MassUnit.GRAM}>g</option>
                  <option value={MassUnit.MILLIGRAM}>mg</option>
                  <option value={MassUnit.MICROGRAM}>μg</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Desired Molarity *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder="e.g., 0.5"
                  step="any"
                  value={calculation.molarity ?? ''}
                  onChange={(e) => handleInputChange('molarity', e.target.value)}
                />
                <select
                  className="select-field w-32"
                  value={molarityUnit}
                  onChange={(e) => setMolarityUnit(e.target.value as ConcentrationUnit)}
                >
                  <option value={ConcentrationUnit.MOLAR}>M</option>
                  <option value={ConcentrationUnit.MILLIMOLAR}>mM</option>
                  <option value={ConcentrationUnit.MICROMOLAR}>μM</option>
                  <option value={ConcentrationUnit.NANOMOLAR}>nM</option>
                  <option value={ConcentrationUnit.PICOMOLAR}>pM</option>
                  <option value={ConcentrationUnit.PERCENT_W_V}>% w/v</option>
                  <option value={ConcentrationUnit.MG_ML}>mg/mL</option>
                  <option value={ConcentrationUnit.UG_ML}>μg/mL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={handleChemicalSelect}
                placeholder="Search chemical"
                allowCustom={true}
              />
              <input
                type="number"
                className="input-field mt-2"
                placeholder="Or enter manually"
                step="any"
                value={calculation.molecularWeight ?? ''}
                onChange={(e) =>
                  handleInputChange('molecularWeight', e.target.value)
                }
              />
            </div>
          </div>
        );

      case CalculationMode.DILUTION:
        return (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              Enter 3 out of 4 values. The calculator will find the missing value.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  Initial Concentration (C₁)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    placeholder="C₁"
                    step="any"
                    value={calculation.initialMolarity ?? ''}
                    onChange={(e) =>
                      handleInputChange('initialMolarity', e.target.value)
                    }
                  />
                  <select
                    className="select-field w-28"
                    value={initialMolarityUnit}
                    onChange={(e) => setInitialMolarityUnit(e.target.value as ConcentrationUnit)}
                  >
                    <option value={ConcentrationUnit.MOLAR}>M</option>
                    <option value={ConcentrationUnit.MILLIMOLAR}>mM</option>
                    <option value={ConcentrationUnit.MICROMOLAR}>μM</option>
                    <option value={ConcentrationUnit.NANOMOLAR}>nM</option>
                    <option value={ConcentrationUnit.PICOMOLAR}>pM</option>
                    <option value={ConcentrationUnit.PERCENT_W_V}>% w/v</option>
                    <option value={ConcentrationUnit.MG_ML}>mg/mL</option>
                    <option value={ConcentrationUnit.UG_ML}>μg/mL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">
                  Initial Volume (V₁)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    placeholder="V₁"
                    step="any"
                    value={calculation.initialVolume ?? ''}
                    onChange={(e) =>
                      handleInputChange('initialVolume', e.target.value)
                    }
                  />
                  <select
                    className="select-field w-20"
                    value={initialVolumeUnit}
                    onChange={(e) => setInitialVolumeUnit(e.target.value as VolumeUnit)}
                  >
                    <option value={VolumeUnit.LITER}>L</option>
                    <option value={VolumeUnit.MILLILITER}>mL</option>
                    <option value={VolumeUnit.MICROLITER}>μL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">
                  Final Concentration (C₂)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    placeholder="C₂"
                    step="any"
                    value={calculation.finalMolarity ?? ''}
                    onChange={(e) =>
                      handleInputChange('finalMolarity', e.target.value)
                    }
                  />
                  <select
                    className="select-field w-28"
                    value={finalMolarityUnit}
                    onChange={(e) => setFinalMolarityUnit(e.target.value as ConcentrationUnit)}
                  >
                    <option value={ConcentrationUnit.MOLAR}>M</option>
                    <option value={ConcentrationUnit.MILLIMOLAR}>mM</option>
                    <option value={ConcentrationUnit.MICROMOLAR}>μM</option>
                    <option value={ConcentrationUnit.NANOMOLAR}>nM</option>
                    <option value={ConcentrationUnit.PICOMOLAR}>pM</option>
                    <option value={ConcentrationUnit.PERCENT_W_V}>% w/v</option>
                    <option value={ConcentrationUnit.MG_ML}>mg/mL</option>
                    <option value={ConcentrationUnit.UG_ML}>μg/mL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">
                  Final Volume (V₂)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={`input-field flex-1 ${
                      calculation.finalVolume === 1000 && finalVolumeUnit === VolumeUnit.MILLILITER
                        ? 'text-slate-400 dark:text-slate-500'
                        : ''
                    }`}
                    placeholder="V₂"
                    step="any"
                    value={calculation.finalVolume ?? ''}
                    onChange={(e) =>
                      handleInputChange('finalVolume', e.target.value)
                    }
                  />
                  <select
                    className="select-field w-20"
                    value={finalVolumeUnit}
                    onChange={(e) => setFinalVolumeUnit(e.target.value as VolumeUnit)}
                  >
                    <option value={VolumeUnit.LITER}>L</option>
                    <option value={VolumeUnit.MILLILITER}>mL</option>
                    <option value={VolumeUnit.MICROLITER}>μL</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Handle recipe selection
  const handleRecipeSelect = (recipe: Recipe) => {
    console.log('Selected recipe:', recipe);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Tab Navigation */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <CalcIcon className="w-7 h-7" />
          Molarity Calculator & Solutions
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Calculate solution preparation and browse recipes
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`calc-mode-tab ${activeTab === 'calculator' ? 'active' : ''}`}
          >
            <CalcIcon className="w-4 h-4 inline mr-2" />
            Calculator
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`calc-mode-tab ${activeTab === 'recipes' ? 'active' : ''}`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('dilution')}
            className={`calc-mode-tab ${activeTab === 'dilution' ? 'active' : ''}`}
          >
            <GitBranch className="w-4 h-4 inline mr-2" />
            Serial Dilution
          </button>
          <button
            onClick={() => setActiveTab('ph')}
            className={`calc-mode-tab ${activeTab === 'ph' ? 'active' : ''}`}
          >
            <Droplet className="w-4 h-4 inline mr-2" />
            pH Calculator
          </button>
        </div>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="card max-w-4xl mx-auto">
          {/* Mode Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
              Calculation Mode
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {CALCULATION_MODES.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`calc-mode-tab ${selectedMode === mode ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

      {/* Input Fields */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          {CALCULATION_MODES.find((m) => m.mode === selectedMode)?.description}
        </h3>
        {renderInputFields()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button onClick={handleCalculate} className="btn-primary flex-1">
          <CalcIcon className="w-5 h-5 mr-2" />
          Calculate
        </button>
        <button onClick={handleClear} className="btn-secondary">
          Clear
        </button>
      </div>

      {/* Result Display */}
      {result && result.success && (
        <div className="result-display animate-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Result
            </h3>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showSteps ? 'Hide' : 'Show'} Calculation Steps
            </button>
          </div>

          <div className="result-value mb-2">
            {formatResult(result, preferences?.decimalPlaces)}
          </div>

          {/* PPM Conversion Display */}
          {calculation.molecularWeight && calculation.molarity && selectedMode === CalculationMode.MASS_FROM_MOLARITY && (
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              = {convertMolarityToPpm(calculation.molarity, calculation.molecularWeight).toFixed(2)} ppm (mg/L)
            </div>
          )}

          {result.value !== undefined && calculation.molecularWeight && selectedMode === CalculationMode.MOLARITY_FROM_MASS && (
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              = {convertMolarityToPpm(result.value, calculation.molecularWeight).toFixed(2)} ppm (mg/L)
            </div>
          )}

          {selectedMode === CalculationMode.DILUTION && calculation.molecularWeight && (calculation.initialMolarity || calculation.finalMolarity) && (
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              {calculation.initialMolarity && (
                <div>C₁ = {convertMolarityToPpm(calculation.initialMolarity, calculation.molecularWeight).toFixed(2)} ppm</div>
              )}
              {calculation.finalMolarity && (
                <div>C₂ = {convertMolarityToPpm(calculation.finalMolarity, calculation.molecularWeight).toFixed(2)} ppm</div>
              )}
            </div>
          )}

          {showSteps && result.steps && (
            <div className="mt-4 p-4 bg-white/50 dark:bg-slate-900/50 rounded-lg">
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">
                Calculation Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 font-mono">
                {result.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Solubility Loading State */}
      {solubilityLoading && (
        <div className="p-4 border-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800 dark:text-blue-200">Analyzing Solubility...</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Checking database, PubChem, and running ML prediction</p>
            </div>
          </div>
        </div>
      )}

      {/* Solubility Information */}
      {solubilityCheck && !solubilityLoading && (
        <div className={`p-4 border-2 rounded-lg animate-in ${
          solubilityCheck.isExceeded
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : solubilityCheck.warning
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              solubilityCheck.isExceeded
                ? 'text-red-600 dark:text-red-400'
                : solubilityCheck.warning
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            }`} />
            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${
                solubilityCheck.isExceeded
                  ? 'text-red-800 dark:text-red-200'
                  : solubilityCheck.warning
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {solubilityCheck.isExceeded ? 'Solubility Limit Exceeded' : solubilityCheck.warning ? 'Approaching Solubility Limit' : 'Solubility Check: Safe'}
              </h4>
              {solubilityCheck.warning && (
                <p className={`text-sm mb-2 ${
                  solubilityCheck.isExceeded
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {solubilityCheck.warning}
                </p>
              )}
              {!solubilityCheck.warning && (
                <p className="text-sm mb-2 text-green-700 dark:text-green-300">
                  Concentration is within safe limits for water solubility.
                </p>
              )}
              {solubilityCheck.suggestions.length > 0 && (
                <div className={`mt-3 p-3 rounded-lg ${
                  solubilityCheck.isExceeded
                    ? 'bg-red-100 dark:bg-red-900/40'
                    : 'bg-yellow-100 dark:bg-yellow-900/40'
                }`}>
                  <p className={`text-sm font-semibold mb-2 ${
                    solubilityCheck.isExceeded
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-yellow-800 dark:text-yellow-200'
                  }`}>
                    Recommendations:
                  </p>
                  <ul className={`text-sm space-y-1 ${
                    solubilityCheck.isExceeded
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {solubilityCheck.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="whitespace-pre-line">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              {solubilityCheck.solubilityData && solubilityCheck.solubilityData.temperature && (
                <p className={`text-xs mt-2 ${
                  solubilityCheck.isExceeded
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  Solubility data at {solubilityCheck.solubilityData.temperature}
                </p>
              )}
              {/* Data source indicator */}
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-400">
                {solubilityCheck.source === 'database' && (
                  <>
                    <Database className="w-4 h-4" />
                    <span>From curated laboratory database</span>
                  </>
                )}
                {solubilityCheck.source === 'pubchem' && (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>From PubChem experimental data</span>
                    {pubchemCid && (
                      <>
                        {' - '}
                        <a
                          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${pubchemCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View source ↗
                        </a>
                      </>
                    )}
                  </>
                )}
                {solubilityCheck.source === 'aqsoldb' && (
                  <>
                    <Database className="w-4 h-4" />
                    <span>From AqSolDB (9,982 curated experimental values)</span>
                    {' - '}
                    <a
                      href="https://doi.org/10.1038/s41597-019-0151-1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View source ↗
                    </a>
                  </>
                )}
                {solubilityCheck.source === 'prediction' && (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>ML prediction (CatBoost model, ~93% accuracy on ESOL dataset)</span>
                  </>
                )}
                {solubilityCheck.source === 'general' && (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>General guidelines - no specific data available</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 font-medium">
            Error: {result.error}
          </p>
        </div>
      )}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div>
          {/* Recipe Sub-Navigation */}
          <div className="card mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setRecipeSubTab('browse')}
                className={`calc-mode-tab ${recipeSubTab === 'browse' ? 'active' : ''}`}
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                Browse Recipes
              </button>
              <button
                onClick={() => setRecipeSubTab('builder')}
                className={`calc-mode-tab ${recipeSubTab === 'builder' ? 'active' : ''}`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Recipe Builder
              </button>
              <button
                onClick={() => setRecipeSubTab('myrecipes')}
                className={`calc-mode-tab ${recipeSubTab === 'myrecipes' ? 'active' : ''}`}
              >
                <FolderHeart className="w-4 h-4 inline mr-2" />
                My Recipes
              </button>
            </div>
          </div>

          {/* Browse Recipes Sub-Tab */}
          {recipeSubTab === 'browse' && (
            <div>
              <div className="mb-6">
                <h2 className="section-title">Buffer & Solution Recipes</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Browse pre-configured recipes for common laboratory solutions
                </p>
              </div>
              <RecipeList onSelectRecipe={handleRecipeSelect} />
            </div>
          )}

          {/* Recipe Builder Sub-Tab */}
          {recipeSubTab === 'builder' && (
            <RecipeBuilder />
          )}

          {/* My Recipes Sub-Tab */}
          {recipeSubTab === 'myrecipes' && (
            <MyRecipes />
          )}
        </div>
      )}

      {/* Serial Dilution Tab */}
      {activeTab === 'dilution' && (
        <SerialDilution />
      )}

      {/* pH Calculator Tab */}
      {activeTab === 'ph' && (
        <PhCalculator />
      )}
    </div>
  );
}
