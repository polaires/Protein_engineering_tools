/**
 * pH Calculator Component
 *
 * Features:
 * - Buffer preparation calculator (Henderson-Hasselbalch)
 * - Strong acid/base pH calculator
 * - pH adjustment calculator
 * - Temperature correction with warnings
 * - Ionic strength correction (Davies equation)
 * - Species distribution for polyprotic acids
 * - Buffer zone visualization
 */

import { useState, useMemo } from 'react';
import {
  Droplet,
  Thermometer,
  AlertTriangle,
  Beaker,
  FlaskConical,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { PHCalculatorMode } from '@/types';
import {
  BIOLOGICAL_BUFFERS,
  COMMON_BUFFERS,
  getAllBuffers,
  getBufferById,
  getPKaAtTemperature,
  getTemperatureSensitivity,
  isInDeadZone,
  BufferSystem,
} from '@/data/bufferData';
import {
  calculateBufferPreparation,
  calculatePolyproticBufferPreparation,
  calculateStrongAcidPH,
  calculateStrongBasePH,
  calculateAcidNeededForPHAdjustment,
  calculateSpeciesDistribution,
  PhCalculationResult,
  getSuggestedBuffers,
} from '@/utils/phCalculations';

// ============================================================================
// Mode Configuration
// ============================================================================

const CALCULATION_MODES = [
  {
    mode: 'buffer' as PHCalculatorMode,
    label: 'Buffer Maker',
    icon: Beaker,
    description: 'Prepare buffer at target pH',
  },
  {
    mode: 'strong' as PHCalculatorMode,
    label: 'Strong Acid/Base',
    icon: FlaskConical,
    description: 'Calculate pH from concentration',
  },
  {
    mode: 'adjust' as PHCalculatorMode,
    label: 'pH Adjustment',
    icon: Droplet,
    description: 'Adjust existing solution pH',
  },
  {
    mode: 'titration' as PHCalculatorMode,
    label: 'Species Distribution',
    icon: Info,
    description: 'View species distribution at pH',
  },
];

// ============================================================================
// Component
// ============================================================================

export default function PhCalculator() {
  const { showToast } = useApp();

  // Mode state
  const [selectedMode, setSelectedMode] = useState<PHCalculatorMode>('buffer');

  // Buffer maker state
  const [bufferSystemId, setBufferSystemId] = useState<string>('phosphate');
  const [targetPH, setTargetPH] = useState<number | undefined>(7.4);
  const [totalConcentration, setTotalConcentration] = useState<number | undefined>(50); // mM
  const [finalVolume, setFinalVolume] = useState<number | undefined>(1000); // mL
  const [temperature, setTemperature] = useState<number>(25);
  const [useIonicStrength, setUseIonicStrength] = useState<boolean>(false);
  const [ionicStrength, setIonicStrength] = useState<number | undefined>(undefined);

  // Strong acid/base state
  const [acidBaseType, setAcidBaseType] = useState<'acid' | 'base'>('acid');
  const [concentration, setConcentration] = useState<number | undefined>(0.1); // M

  // pH adjustment state
  const [currentPH, setCurrentPH] = useState<number | undefined>(undefined);
  const [adjustTargetPH, setAdjustTargetPH] = useState<number | undefined>(undefined);
  const [bufferConc, setBufferConc] = useState<number | undefined>(50); // mM
  const [bufferPKa, setBufferPKa] = useState<number | undefined>(7.2);
  const [adjustVolume, setAdjustVolume] = useState<number | undefined>(100); // mL
  const [adjustingConc, setAdjustingConc] = useState<number | undefined>(1); // M
  const [adjustingType, setAdjustingType] = useState<'acid' | 'base'>('acid');

  // Species distribution state
  const [speciesPH, setSpeciesPH] = useState<number | undefined>(7.0);
  const [speciesConc, setSpeciesConc] = useState<number | undefined>(100); // mM

  // Result state
  const [result, setResult] = useState<PhCalculationResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Get selected buffer system
  const selectedBuffer = useMemo(() => getBufferById(bufferSystemId), [bufferSystemId]);

  // Get suggested buffers for target pH
  const suggestedBuffers = useMemo(() => {
    if (targetPH === undefined) return [];
    return getSuggestedBuffers(targetPH, getAllBuffers());
  }, [targetPH]);

  // Check if target pH is in dead zone
  const inDeadZone = useMemo(() => {
    if (!selectedBuffer || targetPH === undefined) return false;
    return isInDeadZone(selectedBuffer, targetPH);
  }, [selectedBuffer, targetPH]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCalculate = () => {
    try {
      let calcResult: PhCalculationResult;

      switch (selectedMode) {
        case 'buffer':
          if (!selectedBuffer || targetPH === undefined || totalConcentration === undefined || finalVolume === undefined) {
            showToast('error', 'Please fill in all required fields');
            return;
          }

          // Use species solver for polyprotic acids with close pKa values
          const useSpeciesSolver = selectedBuffer.pKa.length > 1 &&
            selectedBuffer.pKa.some((pKa, i) =>
              i > 0 && Math.abs(pKa - selectedBuffer.pKa[i - 1]) < 2.5
            );

          if (useSpeciesSolver) {
            calcResult = calculatePolyproticBufferPreparation({
              bufferSystem: selectedBuffer,
              targetPH,
              totalConcentration: totalConcentration / 1000, // Convert mM to M
              finalVolume,
              temperature,
              ionicStrength: useIonicStrength ? ionicStrength : undefined,
            });
          } else {
            calcResult = calculateBufferPreparation({
              bufferSystem: selectedBuffer,
              targetPH,
              totalConcentration: totalConcentration / 1000, // Convert mM to M
              finalVolume,
              temperature,
              ionicStrength: useIonicStrength ? ionicStrength : undefined,
            });
          }
          break;

        case 'strong':
          if (concentration === undefined || concentration <= 0) {
            showToast('error', 'Please enter a valid concentration');
            return;
          }

          calcResult = acidBaseType === 'acid'
            ? calculateStrongAcidPH(concentration, temperature)
            : calculateStrongBasePH(concentration, temperature);
          break;

        case 'adjust':
          if (currentPH === undefined || adjustTargetPH === undefined ||
              bufferConc === undefined || bufferPKa === undefined ||
              adjustVolume === undefined || adjustingConc === undefined) {
            showToast('error', 'Please fill in all required fields');
            return;
          }

          calcResult = calculateAcidNeededForPHAdjustment(
            {
              currentPH,
              targetPH: adjustTargetPH,
              bufferConcentration: bufferConc / 1000, // mM to M
              bufferPKa,
              volume: adjustVolume,
              adjustingWith: adjustingType,
              adjustingConcentration: adjustingConc,
            },
            temperature
          );
          break;

        case 'titration':
          if (!selectedBuffer || speciesPH === undefined) {
            showToast('error', 'Please select a buffer and enter pH');
            return;
          }

          const pKaValues = selectedBuffer.pKa.map((_, idx) =>
            getPKaAtTemperature(selectedBuffer, temperature, idx)
          );
          const species = calculateSpeciesDistribution(
            pKaValues,
            speciesPH,
            speciesConc ? speciesConc / 1000 : undefined
          );

          calcResult = {
            success: true,
            pH: speciesPH,
            warnings: [],
            steps: [
              `Buffer: ${selectedBuffer.name}`,
              `pH: ${speciesPH.toFixed(2)}`,
              `Temperature: ${temperature}°C`,
              `pKa values: ${pKaValues.map(p => p.toFixed(2)).join(', ')}`,
              '',
              'Species Distribution:',
              ...species.map(s => `  ${s.formula}: ${(s.fraction * 100).toFixed(1)}%${s.concentration ? ` (${(s.concentration * 1000).toFixed(3)} mM)` : ''}`),
            ],
            speciesDistribution: species,
          };
          break;

        default:
          return;
      }

      setResult(calcResult);

      if (calcResult.success) {
        showToast('success', 'Calculation completed');
      } else {
        showToast('error', calcResult.warnings[0] || 'Calculation failed');
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Calculation error');
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowSteps(false);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {CALCULATION_MODES.map(({ mode, label, icon: Icon, description }) => (
            <button
              key={mode}
              onClick={() => {
                setSelectedMode(mode);
                handleReset();
              }}
              className={`calc-mode-tab ${selectedMode === mode ? 'active' : ''}`}
              title={description}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Buffer Maker Mode */}
      {selectedMode === 'buffer' && (
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Beaker className="w-5 h-5" />
            Buffer Preparation
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Calculate amounts needed to prepare a buffer solution at your target pH
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buffer System Selection */}
            <div className="md:col-span-2">
              <label className="input-label">Buffer System *</label>
              <select
                className="select-field w-full"
                value={bufferSystemId}
                onChange={(e) => {
                  setBufferSystemId(e.target.value);
                  handleReset();
                }}
              >
                <optgroup label="Good's Biological Buffers">
                  {BIOLOGICAL_BUFFERS.map((buffer) => (
                    <option key={buffer.id} value={buffer.id}>
                      {buffer.name} (pKa {buffer.pKa.map(p => p.toFixed(1)).join(', ')}, pH {buffer.effectiveRange[0]}-{buffer.effectiveRange[1]})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Common Laboratory Buffers">
                  {COMMON_BUFFERS.map((buffer) => (
                    <option key={buffer.id} value={buffer.id}>
                      {buffer.name} (pKa {buffer.pKa.map(p => p.toFixed(1)).join(', ')}, pH {buffer.effectiveRange[0]}-{buffer.effectiveRange[1]})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Target pH */}
            <div>
              <label className="input-label">Target pH *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 7.4"
                step="0.1"
                min="0"
                max="14"
                value={targetPH ?? ''}
                onChange={(e) => {
                  setTargetPH(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Total Concentration */}
            <div>
              <label className="input-label">Total Concentration (mM) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 50"
                step="any"
                min="0"
                value={totalConcentration ?? ''}
                onChange={(e) => {
                  setTotalConcentration(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Final Volume */}
            <div>
              <label className="input-label">Final Volume (mL) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 1000"
                step="any"
                min="0"
                value={finalVolume ?? ''}
                onChange={(e) => {
                  setFinalVolume(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="input-label flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperature (°C)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder="25"
                  step="1"
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(parseFloat(e.target.value) || 25);
                    handleReset();
                  }}
                />
                <div className="flex gap-1">
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 4 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => setTemperature(4)}
                    title="Cold room"
                  >
                    4°C
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 25 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => setTemperature(25)}
                    title="Room temperature"
                  >
                    25°C
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 37 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => setTemperature(37)}
                    title="Incubator"
                  >
                    37°C
                  </button>
                </div>
              </div>
            </div>

            {/* Ionic Strength (optional) */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useIonicStrength}
                  onChange={(e) => setUseIonicStrength(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Apply ionic strength correction (Davies equation)
                </span>
              </label>
              {useIonicStrength && (
                <div className="mt-2">
                  <input
                    type="number"
                    className="input-field w-48"
                    placeholder="Ionic strength (M)"
                    step="0.01"
                    min="0"
                    max="1"
                    value={ionicStrength ?? ''}
                    onChange={(e) => setIonicStrength(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  />
                  {ionicStrength !== undefined && ionicStrength > 0.5 && (
                    <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Davies equation is only valid up to ~0.5 M
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Buffer Zone Visualization */}
          {selectedBuffer && targetPH !== undefined && (
            <BufferZoneVisualization
              buffer={selectedBuffer}
              targetPH={targetPH}
              temperature={temperature}
            />
          )}

          {/* Warnings */}
          {selectedBuffer && (
            <BufferWarnings
              buffer={selectedBuffer}
              temperature={temperature}
              targetPH={targetPH}
              inDeadZone={inDeadZone}
              suggestedBuffers={suggestedBuffers}
            />
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="btn-primary w-full mt-4"
          >
            Calculate Buffer
          </button>
        </div>
      )}

      {/* Strong Acid/Base Mode */}
      {selectedMode === 'strong' && (
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Strong Acid/Base pH
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Calculate the pH of a strong acid or base solution
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type Selection */}
            <div>
              <label className="input-label">Type</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    acidBaseType === 'acid'
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                  onClick={() => {
                    setAcidBaseType('acid');
                    handleReset();
                  }}
                >
                  Strong Acid
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    acidBaseType === 'base'
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                  onClick={() => {
                    setAcidBaseType('base');
                    handleReset();
                  }}
                >
                  Strong Base
                </button>
              </div>
            </div>

            {/* Concentration */}
            <div>
              <label className="input-label">Concentration (M) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 0.1"
                step="any"
                min="0"
                value={concentration ?? ''}
                onChange={(e) => {
                  setConcentration(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="input-label flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperature (°C)
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="25"
                step="1"
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value) || 25);
                  handleReset();
                }}
              />
            </div>

            {/* Common acids/bases reference */}
            <div>
              <label className="input-label">Common Stock Solutions</label>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {acidBaseType === 'acid' ? (
                  <>
                    <p>HCl (37%): ~12.1 M</p>
                    <p>H₂SO₄ (98%): ~18.0 M</p>
                    <p>HNO₃ (70%): ~15.8 M</p>
                  </>
                ) : (
                  <>
                    <p>NaOH (50%): ~12.5 M</p>
                    <p>NaOH pellets: dissolve to make 10 M</p>
                    <p>KOH (50%): ~12.5 M</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="btn-primary w-full mt-4"
          >
            Calculate pH
          </button>
        </div>
      )}

      {/* pH Adjustment Mode */}
      {selectedMode === 'adjust' && (
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Droplet className="w-5 h-5" />
            pH Adjustment
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Calculate how much acid or base to add to reach your target pH
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current pH */}
            <div>
              <label className="input-label">Current pH *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 8.0"
                step="0.1"
                min="0"
                max="14"
                value={currentPH ?? ''}
                onChange={(e) => {
                  setCurrentPH(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Target pH */}
            <div>
              <label className="input-label">Target pH *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 7.4"
                step="0.1"
                min="0"
                max="14"
                value={adjustTargetPH ?? ''}
                onChange={(e) => {
                  setAdjustTargetPH(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Adjust With Selection */}
            <div className="md:col-span-2">
              <label className="input-label">Adjust With *</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    adjustingType === 'acid'
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                  onClick={() => {
                    setAdjustingType('acid');
                    handleReset();
                  }}
                >
                  HCl (Lower pH)
                </button>
                <button
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    adjustingType === 'base'
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                  onClick={() => {
                    setAdjustingType('base');
                    handleReset();
                  }}
                >
                  NaOH (Raise pH)
                </button>
              </div>
            </div>

            {/* Buffer Concentration */}
            <div>
              <label className="input-label">Buffer Concentration (mM) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 50"
                step="any"
                min="0"
                value={bufferConc ?? ''}
                onChange={(e) => {
                  setBufferConc(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Buffer pKa */}
            <div>
              <label className="input-label">Buffer pKa *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 7.2"
                step="0.01"
                value={bufferPKa ?? ''}
                onChange={(e) => {
                  setBufferPKa(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
              <p className="text-xs text-slate-500 mt-1">
                Common pKa values: Phosphate 7.2, HEPES 7.55, Tris 8.06
              </p>
            </div>

            {/* Solution Volume */}
            <div>
              <label className="input-label">Solution Volume (mL) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 100"
                step="any"
                min="0"
                value={adjustVolume ?? ''}
                onChange={(e) => {
                  setAdjustVolume(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Adjusting Stock Concentration */}
            <div>
              <label className="input-label">{adjustingType === 'acid' ? 'HCl' : 'NaOH'} Stock Concentration (M) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 1"
                step="any"
                min="0"
                value={adjustingConc ?? ''}
                onChange={(e) => {
                  setAdjustingConc(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="btn-primary w-full mt-4"
          >
            Calculate Adjustment
          </button>
        </div>
      )}

      {/* Species Distribution Mode */}
      {selectedMode === 'titration' && (
        <div className="card">
          <h3 className="section-title flex items-center gap-2">
            <Info className="w-5 h-5" />
            Species Distribution
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            Visualize the distribution of protonation states at a given pH.
            Essential for polyprotic acids like citric acid where pKa values overlap.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Buffer System Selection */}
            <div className="md:col-span-2">
              <label className="input-label">Buffer System *</label>
              <select
                className="select-field w-full"
                value={bufferSystemId}
                onChange={(e) => {
                  setBufferSystemId(e.target.value);
                  handleReset();
                }}
              >
                <optgroup label="Polyprotic Acids (Complex)">
                  {COMMON_BUFFERS.filter(b => b.pKa.length > 1).map((buffer) => (
                    <option key={buffer.id} value={buffer.id}>
                      {buffer.name} (pKa: {buffer.pKa.map(p => p.toFixed(1)).join(', ')})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Good's Biological Buffers">
                  {BIOLOGICAL_BUFFERS.map((buffer) => (
                    <option key={buffer.id} value={buffer.id}>
                      {buffer.name} (pKa {buffer.pKa[0].toFixed(2)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Common Laboratory Buffers">
                  {COMMON_BUFFERS.filter(b => b.pKa.length === 1).map((buffer) => (
                    <option key={buffer.id} value={buffer.id}>
                      {buffer.name} (pKa {buffer.pKa[0].toFixed(2)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* pH */}
            <div>
              <label className="input-label">pH *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 7.0"
                step="0.1"
                min="0"
                max="14"
                value={speciesPH ?? ''}
                onChange={(e) => {
                  setSpeciesPH(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Concentration (optional) */}
            <div>
              <label className="input-label">Total Concentration (mM, optional)</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g., 100"
                step="any"
                min="0"
                value={speciesConc ?? ''}
                onChange={(e) => {
                  setSpeciesConc(e.target.value === '' ? undefined : parseFloat(e.target.value));
                  handleReset();
                }}
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="input-label flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperature (°C)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder="25"
                  step="1"
                  value={temperature}
                  onChange={(e) => {
                    setTemperature(parseFloat(e.target.value) || 25);
                    handleReset();
                  }}
                />
                <div className="flex gap-1">
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 4 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => { setTemperature(4); handleReset(); }}
                  >
                    4°C
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 25 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => { setTemperature(25); handleReset(); }}
                  >
                    25°C
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-xs ${temperature === 37 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                    onClick={() => { setTemperature(37); handleReset(); }}
                  >
                    37°C
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info about polyprotic complexity */}
          {selectedBuffer && selectedBuffer.pKa.length > 1 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>{selectedBuffer.name}</strong> has {selectedBuffer.pKa.length} pKa values
                ({selectedBuffer.pKa.map(p => p.toFixed(2)).join(', ')}).
                {Math.min(...selectedBuffer.pKa.slice(1).map((p, i) => Math.abs(p - selectedBuffer.pKa[i]))) < 2.5 && (
                  <> The pKa values are close together, meaning multiple species coexist at most pH values.
                  Simple Henderson-Hasselbalch calculations would be inaccurate.</>
                )}
              </p>
            </div>
          )}

          <button
            onClick={handleCalculate}
            className="btn-primary w-full mt-4"
          >
            Calculate Species Distribution
          </button>
        </div>
      )}

      {/* Results Display */}
      {result && result.success && (
        <div className="card animate-in">
          <h3 className="section-title text-green-700 dark:text-green-400">
            Result
          </h3>

          {/* pH Result */}
          {result.pH !== undefined && (
            <div className="result-display mb-4">
              <span className="text-4xl font-bold">pH {result.pH.toFixed(2)}</span>
              {result.pOH !== undefined && (
                <span className="text-slate-500 ml-4">pOH {result.pOH.toFixed(2)}</span>
              )}
            </div>
          )}

          {/* Amounts */}
          {(result.acidAmount || result.baseAmount) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {result.acidAmount && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">
                    {result.acidAmount.form}
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {result.acidAmount.value >= 1
                      ? result.acidAmount.value.toFixed(4)
                      : (result.acidAmount.value * 1000).toFixed(2)}{' '}
                    {result.acidAmount.value >= 1 ? result.acidAmount.unit : 'mg'}
                  </p>
                </div>
              )}
              {result.baseAmount && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {result.baseAmount.form}
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {result.baseAmount.value >= 1
                      ? result.baseAmount.value.toFixed(4)
                      : (result.baseAmount.value * 1000).toFixed(2)}{' '}
                    {result.baseAmount.value >= 1 ? result.baseAmount.unit : 'mg'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Species Distribution */}
          {result.speciesDistribution && result.speciesDistribution.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Species Distribution
              </h4>
              <div className="flex gap-1 h-6 rounded overflow-hidden">
                {result.speciesDistribution.map((species, idx) => (
                  <div
                    key={idx}
                    className="relative group"
                    style={{
                      width: `${species.fraction * 100}%`,
                      backgroundColor: getSpeciesColor(idx),
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {species.formula}: {(species.fraction * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {result.speciesDistribution.map((species, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getSpeciesColor(idx) }}
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {species.formula}: {(species.fraction * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="mb-4 space-y-2">
              {result.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    warning.includes('CRITICAL') || warning.includes('TRIS')
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    warning.includes('CRITICAL') || warning.includes('TRIS')
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`} />
                  <p className={`text-sm ${
                    warning.includes('CRITICAL') || warning.includes('TRIS')
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {warning}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Calculation Steps */}
          <div>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showSteps ? 'Hide' : 'Show'} calculation steps
            </button>
            {showSteps && (
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                  {result.steps.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {result && !result.success && (
        <div className="card border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-700 dark:text-red-300">Calculation Failed</h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                {result.warnings[0] || 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface BufferZoneVisualizationProps {
  buffer: BufferSystem;
  targetPH: number;
  temperature: number;
}

function BufferZoneVisualization({ buffer, targetPH, temperature }: BufferZoneVisualizationProps) {
  const correctedPKa = buffer.pKa.map((_, idx) =>
    getPKaAtTemperature(buffer, temperature, idx)
  );

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-8 flex items-center gap-2">
        <Info className="w-4 h-4" />
        Buffer Effective Range
      </h4>

      {/* pH scale visualization */}
      <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 rounded">
        {/* Effective range highlight */}
        <div
          className="absolute top-0 bottom-0 bg-green-500/30 border-2 border-green-500 rounded"
          style={{
            left: `${(buffer.effectiveRange[0] / 14) * 100}%`,
            width: `${((buffer.effectiveRange[1] - buffer.effectiveRange[0]) / 14) * 100}%`,
          }}
        />

        {/* pKa markers */}
        {correctedPKa.map((pKa, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-white"
            style={{ left: `${(pKa / 14) * 100}%` }}
            title={`pKa${idx + 1} = ${pKa.toFixed(2)}`}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
              pKa{buffer.pKa.length > 1 ? idx + 1 : ''} = {pKa.toFixed(1)}
            </div>
          </div>
        ))}

        {/* Target pH marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-primary-600 rounded"
          style={{ left: `${(targetPH / 14) * 100}%` }}
        >
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold text-primary-600 whitespace-nowrap">
            Target: {targetPH.toFixed(1)}
          </div>
        </div>
      </div>

      {/* pH scale labels */}
      <div className="flex justify-between mt-6 text-xs text-slate-500">
        <span>0</span>
        <span>2</span>
        <span>4</span>
        <span>6</span>
        <span>7</span>
        <span>8</span>
        <span>10</span>
        <span>12</span>
        <span>14</span>
      </div>
    </div>
  );
}

interface BufferWarningsProps {
  buffer: BufferSystem;
  temperature: number;
  targetPH?: number;
  inDeadZone: boolean;
  suggestedBuffers: BufferSystem[];
}

function BufferWarnings({ buffer, temperature, targetPH, inDeadZone, suggestedBuffers }: BufferWarningsProps) {
  const tempSensitivity = getTemperatureSensitivity(buffer);
  const showTrisWarning = buffer.id === 'tris' && temperature !== 25;

  if (!showTrisWarning && !inDeadZone && !buffer.warnings?.length && !buffer.incompatibilities?.length) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Tris temperature warning */}
      {showTrisWarning && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-300">
                CRITICAL: Tris Temperature Sensitivity
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Tris has extreme temperature sensitivity (dpKa/dT = {buffer.dpKadT}).
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                A solution at pH 8.0 (25°C) will be:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 list-disc ml-4 mt-1">
                <li>pH ~8.6 at 4°C (cold room) - <strong>+0.6 units higher!</strong></li>
                <li>pH ~7.8 at 37°C (incubator) - 0.2 units lower</li>
              </ul>
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mt-2">
                ALWAYS prepare Tris buffers at the temperature you will use them!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dead zone warning */}
      {inDeadZone && targetPH !== undefined && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Poor Buffering Capacity at pH {targetPH.toFixed(1)}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                {buffer.name} has optimal buffering at pH {buffer.pKa.map(p => p.toFixed(1)).join(', ')} (±1 unit).
                Your target pH is outside this range.
              </p>
              {suggestedBuffers.filter(b => b.id !== buffer.id).length > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                  <strong>Suggested alternatives:</strong>{' '}
                  {suggestedBuffers.filter(b => b.id !== buffer.id).slice(0, 3).map(b => b.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General warnings */}
      {buffer.warnings?.filter(w => !w.includes('CRITICAL')).map((warning, idx) => (
        <div key={idx} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-400">{warning}</p>
          </div>
        </div>
      ))}

      {/* Incompatibilities */}
      {buffer.incompatibilities && buffer.incompatibilities.length > 0 && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Incompatible with:</strong> {buffer.incompatibilities.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Temperature sensitivity indicator */}
      {tempSensitivity === 'high' || tempSensitivity === 'very_high' ? (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
          <Thermometer className="w-3 h-3 inline mr-1" />
          High temperature sensitivity - prepare at intended use temperature
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getSpeciesColor(index: number): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
  ];
  return colors[index % colors.length];
}
