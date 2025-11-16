/**
 * Main calculator component with multiple calculation modes
 */

import { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Beaker, FlaskConical, Droplet } from 'lucide-react';
import {
  CalculationMode,
  MolarityCalculation,
  CalculationResult,
  CalculatorProps,
} from '@/types';
import { performCalculation, formatResult } from '@/utils/calculations';
import { useApp } from '@/contexts/AppContext';
import ChemicalSearch from './ChemicalSearch';

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

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);

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
  const handleChemicalSelect = (chemicalId: string, molecularWeight: number) => {
    setCalculation((prev) => ({ ...prev, molecularWeight }));
    addToRecentChemicals(chemicalId);
  };

  // Perform calculation
  const handleCalculate = () => {
    const calcResult = performCalculation(calculation);
    setResult(calcResult);

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
    setResult(null);
  };

  // Render input fields based on calculation mode
  const renderInputFields = () => {
    switch (selectedMode) {
      case CalculationMode.MASS_FROM_MOLARITY:
        return (
          <div className="space-y-4">
            <div>
              <label className="input-label">
                Desired Molarity (M) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 0.5"
                step="any"
                value={calculation.molarity ?? ''}
                onChange={(e) => handleInputChange('molarity', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Final Volume (mL) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="1000"
                step="any"
                value={calculation.volume ?? ''}
                onChange={(e) => handleInputChange('volume', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={(chemical) =>
                  handleChemicalSelect(chemical.id, chemical.molecularWeight)
                }
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
                Mass (g) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 5.0"
                step="any"
                value={calculation.mass ?? ''}
                onChange={(e) => handleInputChange('mass', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Volume (mL) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="1000"
                step="any"
                value={calculation.volume ?? ''}
                onChange={(e) => handleInputChange('volume', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={(chemical) =>
                  handleChemicalSelect(chemical.id, chemical.molecularWeight)
                }
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
                Mass Available (g) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 5.0"
                step="any"
                value={calculation.mass ?? ''}
                onChange={(e) => handleInputChange('mass', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Desired Molarity (M) *
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 0.5"
                step="any"
                value={calculation.molarity ?? ''}
                onChange={(e) => handleInputChange('molarity', e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                Molecular Weight (g/mol) *
              </label>
              <ChemicalSearch
                onSelect={(chemical) =>
                  handleChemicalSelect(chemical.id, chemical.molecularWeight)
                }
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">
                  Initial Concentration (C₁) M
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="C₁"
                  step="any"
                  value={calculation.initialMolarity ?? ''}
                  onChange={(e) =>
                    handleInputChange('initialMolarity', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="input-label">
                  Initial Volume (V₁) mL
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="V₁"
                  step="any"
                  value={calculation.initialVolume ?? ''}
                  onChange={(e) =>
                    handleInputChange('initialVolume', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="input-label">
                  Final Concentration (C₂) M
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="C₂"
                  step="any"
                  value={calculation.finalMolarity ?? ''}
                  onChange={(e) =>
                    handleInputChange('finalMolarity', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="input-label">
                  Final Volume (V₂) mL
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="V₂"
                  step="any"
                  value={calculation.finalVolume ?? ''}
                  onChange={(e) =>
                    handleInputChange('finalVolume', e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card max-w-4xl mx-auto">
      {/* Mode Selection */}
      <div className="mb-6">
        <h2 className="section-title flex items-center gap-2">
          <CalcIcon className="w-7 h-7" />
          Molarity Calculator
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Select calculation mode and enter parameters
        </p>

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

          {result.formula && (
            <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              Formula: {result.formula}
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

      {result && !result.success && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 font-medium">
            Error: {result.error}
          </p>
        </div>
      )}
    </div>
  );
}
