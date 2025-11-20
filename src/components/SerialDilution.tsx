/**
 * Serial Dilution Calculator & Planner
 * Design and visualize serial dilution experiments with plate layouts
 */

import { useState } from 'react';
import { Beaker, RotateCcw } from 'lucide-react';

type DilutionStrategy = 'serial-2' | 'serial-10' | 'custom' | 'specific' | 'smart-range';
type LayoutOrientation = 'horizontal' | 'vertical';
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface DilutionStep {
  concentration: number;
  unit: string;
  stockVolume: number;
  diluentVolume: number;
  totalVolume: number;
  dilutionFactor: number;
  sourceStep: number | null; // null for first step (from stock)
}

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  strategy: DilutionStrategy;
  params: {
    concentrations?: string;
    factor?: string;
    numPoints?: string;
    rangeMax?: string;
    rangeMin?: string;
    spacing?: 'logarithmic' | 'linear';
  };
}

export default function SerialDilution() {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Input states
  const [originalStockConcentration, setOriginalStockConcentration] = useState<string>('100');
  const [stockConcentration, setStockConcentration] = useState<string>('20');
  const [stockUnit, setStockUnit] = useState<string>('mM');
  const [finalVolume, setFinalVolume] = useState<string>('200');
  const [sampleVolume, setSampleVolume] = useState<string>('20');
  const [volumeUnit, setVolumeUnit] = useState<string>('μL');
  const [dilutionStrategy, setDilutionStrategy] = useState<DilutionStrategy>('serial-2');
  const [customFactor, setCustomFactor] = useState<string>('2');
  const [numberOfDilutions, setNumberOfDilutions] = useState<string>('8');
  const [replicates, setReplicates] = useState<string>('3');
  const [layoutOrientation, setLayoutOrientation] = useState<LayoutOrientation>('horizontal');
  const [excessFactor, setExcessFactor] = useState<string>('1.2');

  // Specific concentrations mode
  const [specificConcentrations, setSpecificConcentrations] = useState<string>('20, 10, 5, 2.5, 1, 0.5');

  // Smart range mode
  const [smartRangeMax, setSmartRangeMax] = useState<string>('20');
  const [smartRangeMin, setSmartRangeMin] = useState<string>('0.5');
  const [smartRangeSpacing, setSmartRangeSpacing] = useState<'logarithmic' | 'linear'>('logarithmic');

  // Hover state for tooltips
  const [hoveredWell, setHoveredWell] = useState<{row: number; col: number} | null>(null);

  // Template presets (for future wizard implementation)
  // @ts-expect-error - Prepared for wizard UI implementation
  const _templates: TemplatePreset[] = [
    {
      id: 'ic50-standard',
      name: 'IC50/EC50 Curve',
      description: '10-point dose-response with half-log spacing',
      icon: '📊',
      strategy: 'specific',
      params: {
        concentrations: '100, 30, 10, 3, 1, 0.3, 0.1, 0.03, 0.01, 0',
        numPoints: '10'
      }
    },
    {
      id: 'serial-2fold',
      name: '2-Fold Serial',
      description: 'Classic doubling dilution series',
      icon: '🔢',
      strategy: 'serial-2',
      params: {
        factor: '2',
        numPoints: '8'
      }
    },
    {
      id: 'serial-10fold',
      name: '10-Fold Serial',
      description: 'Log scale serial dilution',
      icon: '📐',
      strategy: 'serial-10',
      params: {
        factor: '10',
        numPoints: '7'
      }
    },
    {
      id: 'mictesting',
      name: 'MIC Testing',
      description: '2-fold dilution for minimal inhibitory concentration',
      icon: '🦠',
      strategy: 'serial-2',
      params: {
        factor: '2',
        numPoints: '12'
      }
    },
    {
      id: 'antibody-titration',
      name: 'Antibody Titration',
      description: '3-fold dilution series for antibody optimization',
      icon: '🧬',
      strategy: 'custom',
      params: {
        factor: '3',
        numPoints: '8'
      }
    },
    {
      id: 'smart-range',
      name: 'Smart Range Design',
      description: 'Auto-calculate from concentration range',
      icon: '✨',
      strategy: 'smart-range',
      params: {
        rangeMax: '20',
        rangeMin: '0.5',
        spacing: 'logarithmic',
        numPoints: '8'
      }
    }
  ];

  // Calculate dilution series
  const calculateDilutionSeries = (): DilutionStep[] => {
    const originalStock = parseFloat(originalStockConcentration);
    const stock = parseFloat(stockConcentration);
    const volPerWell = parseFloat(sampleVolume); // Volume of sample (not total well volume)
    const excess = parseFloat(excessFactor);
    const numDilutions = parseInt(numberOfDilutions);
    const numReplicates = parseInt(replicates);

    if (isNaN(originalStock) || isNaN(stock) || isNaN(volPerWell) || isNaN(excess) || isNaN(numReplicates)) {
      return [];
    }

    const steps: DilutionStep[] = [];
    const totalVolumeNeeded = volPerWell * numReplicates * excess;

    if (dilutionStrategy === 'smart-range') {
      // Smart range mode: auto-calculate concentrations from concentration range
      const maxConc = parseFloat(smartRangeMax);
      const minConc = parseFloat(smartRangeMin);

      if (isNaN(maxConc) || isNaN(minConc) || isNaN(numDilutions) || numDilutions < 2) {
        return [];
      }

      if (maxConc <= minConc) {
        return [];
      }

      // Generate concentration array based on spacing mode
      const concentrations: number[] = [];

      if (smartRangeSpacing === 'linear') {
        // Linear spacing: evenly spaced concentrations
        const step = (maxConc - minConc) / (numDilutions - 1);
        for (let i = 0; i < numDilutions; i++) {
          concentrations.push(maxConc - (step * i));
        }
      } else {
        // Logarithmic spacing: evenly spaced in log scale (geometric progression)
        const dilutionFactor = Math.pow(maxConc / minConc, 1 / (numDilutions - 1));
        for (let i = 0; i < numDilutions; i++) {
          concentrations.push(maxConc / Math.pow(dilutionFactor, i));
        }
      }

      // Calculate volumes for each concentration
      concentrations.forEach((conc, index) => {
        if (index === 0) {
          // First dilution - check if we need to dilute from original stock
          if (conc < originalStock) {
            const dilFactorFromStock = originalStock / conc;
            const stockVol = totalVolumeNeeded / dilFactorFromStock;
            const diluentVol = totalVolumeNeeded - stockVol;

            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: stockVol,
              diluentVolume: diluentVol,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: dilFactorFromStock,
              sourceStep: null
            });
          } else {
            // First concentration equals or exceeds stock
            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: totalVolumeNeeded,
              diluentVolume: 0,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: 1,
              sourceStep: null
            });
          }
        } else {
          // Dilute from previous step
          const prevConc = concentrations[index - 1];
          const dilFactorFromPrev = prevConc / conc;
          const prevStepVol = totalVolumeNeeded / dilFactorFromPrev;
          const diluentVol = totalVolumeNeeded - prevStepVol;

          steps.push({
            concentration: conc,
            unit: stockUnit,
            stockVolume: prevStepVol,
            diluentVolume: diluentVol,
            totalVolume: totalVolumeNeeded,
            dilutionFactor: dilFactorFromPrev,
            sourceStep: index - 1
          });
        }
      });
    } else if (dilutionStrategy === 'specific') {
      // Parse specific concentrations
      const concentrations = specificConcentrations
        .split(',')
        .map(c => parseFloat(c.trim()))
        .filter(c => !isNaN(c))
        .sort((a, b) => b - a); // Sort descending

      concentrations.forEach((conc, index) => {
        if (index === 0) {
          // First dilution - check if we need to dilute from original stock
          if (conc < originalStock) {
            const dilutionFactor = originalStock / conc;
            const stockVol = totalVolumeNeeded / dilutionFactor;
            const diluentVol = totalVolumeNeeded - stockVol;

            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: stockVol,
              diluentVolume: diluentVol,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: dilutionFactor,
              sourceStep: null
            });
          } else {
            // Concentration equals or exceeds stock
            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: totalVolumeNeeded,
              diluentVolume: 0,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: 1,
              sourceStep: null
            });
          }
        } else {
          // Dilute from previous step
          const prevConc = concentrations[index - 1];
          const dilutionFactor = prevConc / conc;
          const prevStepVol = totalVolumeNeeded / dilutionFactor;
          const diluentVol = totalVolumeNeeded - prevStepVol;

          steps.push({
            concentration: conc,
            unit: stockUnit,
            stockVolume: prevStepVol,
            diluentVolume: diluentVol,
            totalVolume: totalVolumeNeeded,
            dilutionFactor: dilutionFactor,
            sourceStep: index - 1
          });
        }
      });
    } else {
      // Serial dilution with fixed factor
      let factor = 2;
      if (dilutionStrategy === 'serial-10') factor = 10;
      else if (dilutionStrategy === 'custom') factor = parseFloat(customFactor);

      for (let i = 0; i < numDilutions; i++) {
        const conc = stock / Math.pow(factor, i);

        if (i === 0) {
          // First dilution - check if we need to dilute from original stock
          if (stock < originalStock) {
            const dilutionFactor = originalStock / stock;
            const stockVol = totalVolumeNeeded / dilutionFactor;
            const diluentVol = totalVolumeNeeded - stockVol;

            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: stockVol,
              diluentVolume: diluentVol,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: dilutionFactor,
              sourceStep: null
            });
          } else {
            // First concentration equals stock
            steps.push({
              concentration: conc,
              unit: stockUnit,
              stockVolume: totalVolumeNeeded,
              diluentVolume: 0,
              totalVolume: totalVolumeNeeded,
              dilutionFactor: 1,
              sourceStep: null
            });
          }
        } else {
          // Serial dilution from previous
          const prevStepVol = totalVolumeNeeded / factor;
          const diluentVol = totalVolumeNeeded - prevStepVol;

          steps.push({
            concentration: conc,
            unit: stockUnit,
            stockVolume: prevStepVol,
            diluentVolume: diluentVol,
            totalVolume: totalVolumeNeeded,
            dilutionFactor: factor,
            sourceStep: i - 1
          });
        }
      }
    }

    return steps;
  };

  const dilutionSteps = calculateDilutionSeries();

  // Apply template preset (for future wizard implementation)
  // @ts-expect-error - Prepared for wizard UI implementation
  const _applyTemplate = (template: TemplatePreset) => {
    setDilutionStrategy(template.strategy);

    if (template.params.concentrations) {
      setSpecificConcentrations(template.params.concentrations);
    }
    if (template.params.factor) {
      setCustomFactor(template.params.factor);
    }
    if (template.params.numPoints) {
      setNumberOfDilutions(template.params.numPoints);
    }
    if (template.params.rangeMax) {
      setSmartRangeMax(template.params.rangeMax);
    }
    if (template.params.rangeMin) {
      setSmartRangeMin(template.params.rangeMin);
    }
    if (template.params.spacing) {
      setSmartRangeSpacing(template.params.spacing);
    }

    // Mark step 1 as complete and move to step 2
    setCompletedSteps(new Set([1]));
    setCurrentStep(2);
  };

  // Validate current step (for future wizard implementation)
  const _validateStep = (step: WizardStep): boolean => {
    switch (step) {
      case 1:
        return true; // Strategy is always selected
      case 2:
        const stock = parseFloat(originalStockConcentration);
        if (isNaN(stock) || stock <= 0) return false;

        if (dilutionStrategy === 'smart-range') {
          const max = parseFloat(smartRangeMax);
          const min = parseFloat(smartRangeMin);
          return !isNaN(max) && !isNaN(min) && max > min;
        } else if (dilutionStrategy === 'specific') {
          return specificConcentrations.length > 0;
        } else if (dilutionStrategy === 'custom') {
          const factor = parseFloat(customFactor);
          return !isNaN(factor) && factor > 1;
        }
        return true;
      case 3:
        const reps = parseInt(replicates);
        return !isNaN(reps) && reps > 0 && reps <= 12;
      case 4:
        const finalVol = parseFloat(finalVolume);
        const sampleVol = parseFloat(sampleVolume);
        return !isNaN(finalVol) && !isNaN(sampleVol) && finalVol > sampleVol && sampleVol > 0;
      case 5:
        return dilutionSteps.length > 0;
      default:
        return false;
    }
  };

  // Step navigation (for future wizard implementation)
  // @ts-expect-error - Prepared for wizard UI implementation
  const _goToNextStep = () => {
    if (_validateStep(currentStep) && currentStep < 5) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep((curr) => Math.min(5, curr + 1) as WizardStep);
    }
  };

  // @ts-expect-error - Prepared for wizard UI implementation
  const _goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((curr) => Math.max(1, curr - 1) as WizardStep);
    }
  };

  // @ts-expect-error - Prepared for wizard UI implementation
  const _goToStep = (step: WizardStep) => {
    // Allow going to any completed step or the next step after last completed
    const maxAccessibleStep = Math.max(...Array.from(completedSteps), 0) + 1;
    if (step <= maxAccessibleStep && step <= 5) {
      setCurrentStep(step);
    }
  };

  // Get step title (for future wizard implementation)
  // @ts-expect-error - Prepared for wizard UI implementation
  const _getStepTitle = (step: WizardStep): string => {
    const titles = {
      1: 'Choose Strategy',
      2: 'Configure Parameters',
      3: 'Design Plate Layout',
      4: 'Set Volumes',
      5: 'Review & Optimize'
    };
    return titles[step];
  };

  // Get color for concentration (heat map)
  const getConcentrationColor = (concentration: number, maxConc: number): string => {
    const intensity = concentration / maxConc;
    // Blue gradient: high concentration = dark blue, low = light blue
    const blue = Math.round(255 - (intensity * 155)); // 100-255
    const green = Math.round(150 + (intensity * 105)); // 150-255
    return `rgb(${blue}, ${green}, 255)`;
  };

  // Format concentration for display
  const formatConcentration = (conc: number): string => {
    if (conc >= 1000) return `${(conc / 1000).toFixed(1)} M`;
    if (conc >= 1) return `${conc.toFixed(2)} ${stockUnit}`;
    if (conc >= 0.001) return `${(conc * 1000).toFixed(1)} μ${stockUnit}`;
    return `${(conc * 1000000).toFixed(1)} n${stockUnit}`;
  };

  // Generate concentration legend
  const generateConcentrationLegend = () => {
    if (dilutionSteps.length === 0) return null;

    const maxConc = dilutionStrategy === 'smart-range'
      ? parseFloat(smartRangeMax)
      : parseFloat(stockConcentration);
    const minConc = dilutionSteps[dilutionSteps.length - 1]?.concentration || 0;

    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
          Concentration:
        </span>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {formatConcentration(minConc)}
          </span>
          <div className="flex-1 h-6 rounded" style={{
            background: `linear-gradient(to right, ${getConcentrationColor(minConc, maxConc)}, ${getConcentrationColor(maxConc, maxConc)})`
          }}></div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {formatConcentration(maxConc)}
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          (Darker = Higher)
        </span>
      </div>
    );
  };

  // Generate visual dilution workflow diagram
  const generateDilutionWorkflow = () => {
    if (dilutionSteps.length === 0) return null;

    const maxConc = dilutionSteps[0]?.concentration || 1;

    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex items-center gap-4 min-w-max px-4">
          {/* Original Stock */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Stock
            </div>
            <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-md">
              {/* Tube outline */}
              <rect x="15" y="10" width="30" height="70" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="2"/>
              {/* Liquid */}
              <rect x="15" y="30" width="30" height="50" fill="#3b82f6" opacity="0.8"/>
              {/* Cap */}
              <rect x="12" y="5" width="36" height="8" rx="2" fill="#475569"/>
            </svg>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {originalStockConcentration} {stockUnit}
              </div>
            </div>
          </div>

          {/* Dilution Steps */}
          {dilutionSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-4">
              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <svg width="60" height="40" viewBox="0 0 60 40" className="text-primary-500 dark:text-primary-400">
                  <defs>
                    <marker
                      id={`arrowhead-${index}`}
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
                    </marker>
                  </defs>
                  <line
                    x1="5"
                    y1="20"
                    x2="50"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="2"
                    markerEnd={`url(#arrowhead-${index})`}
                  />
                </svg>
                <div className="text-xs text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {step.stockVolume.toFixed(1)} {volumeUnit}
                  {step.diluentVolume > 0 && (
                    <>
                      <br />+ {step.diluentVolume.toFixed(1)} {volumeUnit} buffer
                    </>
                  )}
                </div>
              </div>

              {/* Dilution Tube */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Step {index + 1}
                </div>
                <svg width="60" height="100" viewBox="0 0 60 100" className="drop-shadow-md">
                  {/* Tube outline */}
                  <rect x="15" y="10" width="30" height="70" rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="2"/>
                  {/* Liquid - color based on concentration */}
                  <rect
                    x="15"
                    y="30"
                    width="30"
                    height="50"
                    fill={getConcentrationColor(step.concentration, maxConc)}
                    opacity="0.9"
                  />
                  {/* Cap */}
                  <rect x="12" y="5" width="36" height="8" rx="2" fill="#475569"/>
                  {/* Volume label inside tube */}
                  <text x="30" y="60" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                    {step.totalVolume.toFixed(0)}
                  </text>
                  <text x="30" y="70" textAnchor="middle" fill="#fff" fontSize="8">
                    {volumeUnit}
                  </text>
                  {/* Mixing indicator - swirl */}
                  {step.diluentVolume > 0 && (
                    <g opacity="0.7">
                      <path
                        d="M 25 45 Q 28 40, 30 45 T 35 45"
                        stroke="#fff"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <circle cx="35" cy="45" r="1" fill="#fff" />
                    </g>
                  )}
                </svg>
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {formatConcentration(step.concentration)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {step.dilutionFactor.toFixed(2)}x
                    {step.diluentVolume > 0 && ' 🌀'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate plate layout
  const generatePlateLayout = () => {
    const numReps = parseInt(replicates);
    if (isNaN(numReps) || dilutionSteps.length === 0) return null;

    const maxConc = dilutionStrategy === 'smart-range'
      ? parseFloat(smartRangeMax)
      : parseFloat(stockConcentration);
    const totalWellVol = parseFloat(finalVolume);

    return (
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse border-2 border-slate-400 dark:border-slate-500">
            <thead>
              <tr>
                <th className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold"></th>
                {layoutOrientation === 'horizontal' ? (
                  <>
                    {dilutionSteps.map((_, idx) => (
                      <th key={idx} className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold">
                        {idx + 1}
                      </th>
                    ))}
                    <th className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold">
                      Blank
                    </th>
                  </>
                ) : (
                  <>
                    {Array.from({ length: numReps }, (_, idx) => (
                      <th key={idx} className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold">
                        {idx + 1}
                      </th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {layoutOrientation === 'horizontal' ? (
                // Horizontal layout: concentrations across columns
                Array.from({ length: numReps }, (_, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold">
                      {String.fromCharCode(65 + rowIdx)}
                    </td>
                    {dilutionSteps.map((step, colIdx) => (
                      <td
                        key={colIdx}
                        className="border-2 border-slate-400 dark:border-slate-500 p-0 text-xs text-center hover:ring-2 hover:ring-primary-500 transition-all relative group cursor-pointer"
                        style={{ backgroundColor: getConcentrationColor(step.concentration, maxConc) }}
                        onMouseEnter={() => setHoveredWell({row: rowIdx, col: colIdx})}
                        onMouseLeave={() => setHoveredWell(null)}
                      >
                        <div className="px-3 py-3 min-w-[80px]">
                          <div className="font-bold text-sm">{formatConcentration(step.concentration)}</div>
                        </div>
                        {/* Tooltip */}
                        {hoveredWell?.row === rowIdx && hoveredWell?.col === colIdx && (
                          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                            <div className="font-semibold mb-1">Well {String.fromCharCode(65 + rowIdx)}{colIdx + 1}</div>
                            <div>Concentration: {formatConcentration(step.concentration)}</div>
                            <div>Sample: {sampleVolume} {volumeUnit}</div>
                            <div>Assay: {getAssayVolume()} {volumeUnit}</div>
                            <div className="border-t border-slate-600 mt-1 pt-1">Total: {totalWellVol} {volumeUnit}</div>
                            {/* Arrow pointing down */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                              <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 text-xs text-center bg-slate-300 dark:bg-slate-600 font-semibold">
                      <div className="min-w-[80px]">
                        <div className="font-bold text-sm mb-1">Blank</div>
                        <div className="text-xs">{totalWellVol} {volumeUnit}</div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Vertical layout: concentrations down rows
                dilutionSteps.map((step, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border-2 border-slate-400 dark:border-slate-500 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-sm font-bold">
                      {String.fromCharCode(65 + rowIdx)}
                    </td>
                    {Array.from({ length: numReps }, (_, colIdx) => (
                      <td
                        key={colIdx}
                        className="border-2 border-slate-400 dark:border-slate-500 p-0 text-xs text-center hover:ring-2 hover:ring-primary-500 transition-all relative group cursor-pointer"
                        style={{ backgroundColor: getConcentrationColor(step.concentration, maxConc) }}
                        onMouseEnter={() => setHoveredWell({row: rowIdx, col: colIdx})}
                        onMouseLeave={() => setHoveredWell(null)}
                      >
                        <div className="px-3 py-3 min-w-[80px]">
                          <div className="font-bold text-sm">{formatConcentration(step.concentration)}</div>
                        </div>
                        {/* Tooltip */}
                        {hoveredWell?.row === rowIdx && hoveredWell?.col === colIdx && (
                          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                            <div className="font-semibold mb-1">Well {String.fromCharCode(65 + rowIdx)}{colIdx + 1}</div>
                            <div>Concentration: {formatConcentration(step.concentration)}</div>
                            <div>Sample: {sampleVolume} {volumeUnit}</div>
                            <div>Assay: {getAssayVolume()} {volumeUnit}</div>
                            <div className="border-t border-slate-600 mt-1 pt-1">Total: {totalWellVol} {volumeUnit}</div>
                            {/* Arrow pointing down */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                              <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Reset all inputs
  const resetInputs = () => {
    setOriginalStockConcentration('100');
    setStockConcentration('20');
    setStockUnit('mM');
    setFinalVolume('200');
    setSampleVolume('20');
    setVolumeUnit('μL');
    setDilutionStrategy('serial-2');
    setNumberOfDilutions('6');
    setReplicates('4');
    setLayoutOrientation('horizontal');
    setExcessFactor('1.2');
    setSpecificConcentrations('20, 10, 5, 2.5, 1, 0.5');
    setSmartRangeMax('20');
    setSmartRangeMin('0.5');
    setSmartRangeSpacing('logarithmic');
  };

  // Calculate assay volume (total - sample)
  const getAssayVolume = (): number => {
    const total = parseFloat(finalVolume);
    const sample = parseFloat(sampleVolume);
    if (isNaN(total) || isNaN(sample)) return 0;
    return total - sample;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Beaker className="w-7 h-7" />
          Serial Dilution Calculator & Planner
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Design and visualize serial dilution experiments with plate layout, calculate volumes, and generate step-by-step protocols
        </p>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Input Parameters
          </h3>
          <button onClick={resetInputs} className="btn-secondary text-sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Original Stock Concentration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Original Stock Concentration
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={originalStockConcentration}
                onChange={(e) => setOriginalStockConcentration(e.target.value)}
                className="input-field flex-1"
                step="0.1"
              />
              <select
                value={stockUnit}
                onChange={(e) => setStockUnit(e.target.value)}
                className="input-field w-24"
              >
                <option value="M">M</option>
                <option value="mM">mM</option>
                <option value="μM">μM</option>
                <option value="nM">nM</option>
                <option value="mg/mL">mg/mL</option>
                <option value="μg/mL">μg/mL</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Concentration of your stock solution
            </p>
          </div>

          {/* Starting Dilution Concentration */}
          {dilutionStrategy !== 'smart-range' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Highest Plate Concentration
              </label>
              <input
                type="number"
                value={stockConcentration}
                onChange={(e) => setStockConcentration(e.target.value)}
                className="input-field"
                step="0.1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                First concentration in dilution series
              </p>
            </div>
          )}

          {/* Total Well Volume */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Total Well Volume
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={finalVolume}
                onChange={(e) => setFinalVolume(e.target.value)}
                className="input-field flex-1"
                step="10"
              />
              <select
                value={volumeUnit}
                onChange={(e) => setVolumeUnit(e.target.value)}
                className="input-field w-20"
              >
                <option value="μL">μL</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total volume in each well
            </p>
          </div>

          {/* Sample Volume */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sample Volume
            </label>
            <input
              type="number"
              value={sampleVolume}
              onChange={(e) => setSampleVolume(e.target.value)}
              className="input-field"
              step="1"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Volume of diluted sample per well
            </p>
          </div>

          {/* Assay Volume (calculated) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Assay/Buffer Volume
            </label>
            <input
              type="number"
              value={getAssayVolume()}
              className="input-field bg-slate-100 dark:bg-slate-800"
              disabled
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Auto-calculated: {finalVolume} - {sampleVolume} {volumeUnit}
            </p>
          </div>

          {/* Number of Replicates */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Number of Replicates
            </label>
            <input
              type="number"
              value={replicates}
              onChange={(e) => setReplicates(e.target.value)}
              className="input-field"
              min="1"
              max="12"
            />
          </div>

          {/* Dilution Strategy */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Dilution Strategy
            </label>
            <select
              value={dilutionStrategy}
              onChange={(e) => setDilutionStrategy(e.target.value as DilutionStrategy)}
              className={`input-field ${dilutionStrategy === 'smart-range' ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''}`}
            >
              <option value="serial-2">Serial 2-fold</option>
              <option value="serial-10">Serial 10-fold</option>
              <option value="custom">Custom Factor</option>
              <option value="smart-range">✨ Smart Range Design</option>
              <option value="specific">Specific Concentrations</option>
            </select>
            {dilutionStrategy === 'smart-range' && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-medium">
                🎯 Automatically calculates optimal dilution series
              </p>
            )}
          </div>

          {/* Custom Factor (if custom) */}
          {dilutionStrategy === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Dilution Factor
              </label>
              <input
                type="number"
                value={customFactor}
                onChange={(e) => setCustomFactor(e.target.value)}
                className="input-field"
                step="0.1"
                min="1.1"
              />
            </div>
          )}

          {/* Smart Range Inputs */}
          {dilutionStrategy === 'smart-range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Spacing Mode
                </label>
                <select
                  value={smartRangeSpacing}
                  onChange={(e) => setSmartRangeSpacing(e.target.value as 'logarithmic' | 'linear')}
                  className="input-field"
                >
                  <option value="logarithmic">Logarithmic (recommended)</option>
                  <option value="linear">Linear</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {smartRangeSpacing === 'logarithmic'
                    ? '📊 Evenly spaced in log scale (ideal for dose-response)'
                    : '📏 Evenly spaced concentrations (constant intervals)'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Concentration
                </label>
                <input
                  type="number"
                  value={smartRangeMax}
                  onChange={(e) => setSmartRangeMax(e.target.value)}
                  className="input-field"
                  step="0.1"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Highest concentration to test
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Min Concentration
                </label>
                <input
                  type="number"
                  value={smartRangeMin}
                  onChange={(e) => setSmartRangeMin(e.target.value)}
                  className="input-field"
                  step="0.1"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lowest concentration to test
                </p>
              </div>
            </>
          )}

          {/* Number of Dilutions (if not specific) */}
          {dilutionStrategy !== 'specific' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Number of Dilutions
              </label>
              <input
                type="number"
                value={numberOfDilutions}
                onChange={(e) => setNumberOfDilutions(e.target.value)}
                className="input-field"
                min="2"
                max="12"
              />
              {dilutionStrategy === 'smart-range' && (
                <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded">
                  <p className="text-xs text-primary-700 dark:text-primary-300 font-medium">
                    {(() => {
                      const max = parseFloat(smartRangeMax);
                      const min = parseFloat(smartRangeMin);
                      const num = parseInt(numberOfDilutions);
                      if (!isNaN(max) && !isNaN(min) && !isNaN(num) && num >= 2 && max > min) {
                        if (smartRangeSpacing === 'logarithmic') {
                          const factor = Math.pow(max / min, 1 / (num - 1));
                          return `📐 Dilution factor: ${factor.toFixed(2)}x (geometric progression)`;
                        } else {
                          const step = (max - min) / (num - 1);
                          return `📐 Concentration step: ${step.toFixed(2)} ${stockUnit} (linear progression)`;
                        }
                      }
                      return 'Enter valid range to see calculation';
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Layout Orientation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Layout Orientation
            </label>
            <select
              value={layoutOrientation}
              onChange={(e) => setLayoutOrientation(e.target.value as LayoutOrientation)}
              className="input-field"
            >
              <option value="horizontal">Horizontal (across columns)</option>
              <option value="vertical">Vertical (down rows)</option>
            </select>
          </div>

          {/* Excess Factor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Excess Factor
            </label>
            <input
              type="number"
              value={excessFactor}
              onChange={(e) => setExcessFactor(e.target.value)}
              className="input-field"
              step="0.1"
              min="1"
              max="2"
            />
          </div>
        </div>

        {/* Smart Range Design Info Banner */}
        {dilutionStrategy === 'smart-range' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30 border-2 border-primary-200 dark:border-primary-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div>
                <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">
                  Smart Range Design Active
                </h4>
                <p className="text-xs text-primary-700 dark:text-primary-300">
                  {smartRangeSpacing === 'logarithmic'
                    ? 'Using logarithmic spacing: concentrations are evenly distributed in log scale, ideal for dose-response curves and typical dilution experiments.'
                    : 'Using linear spacing: concentrations are evenly distributed with constant intervals, useful for testing specific concentration ranges.'}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                  💡 The calculator will automatically determine the optimal dilution volumes to achieve your desired concentration range.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Specific Concentrations Input */}
        {dilutionStrategy === 'specific' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Specific Concentrations (comma-separated, in {stockUnit})
            </label>
            <input
              type="text"
              value={specificConcentrations}
              onChange={(e) => setSpecificConcentrations(e.target.value)}
              className="input-field w-full"
              placeholder="e.g., 20, 10, 5, 2.5, 1, 0.5"
            />
          </div>
        )}
      </div>

      {/* Dilution Workflow Visualization */}
      {dilutionSteps.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            🧪 Dilution Workflow
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Visual representation of the serial dilution process. Each tube shows the concentration and dilution factor.
          </p>
          {generateDilutionWorkflow()}
        </div>
      )}

      {/* Plate Layout Visualization */}
      {dilutionSteps.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Plate Layout
          </h3>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-semibold">Well Composition:</span>
            </p>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li><span className="font-medium">{sampleVolume} {volumeUnit}</span> diluted sample (colored by concentration)</li>
              <li><span className="font-medium">{getAssayVolume()} {volumeUnit}</span> assay reagent/buffer</li>
              <li><span className="font-medium">{finalVolume} {volumeUnit}</span> total well volume</li>
            </ul>
          </div>
          {/* Color Legend */}
          <div className="mb-4">
            {generateConcentrationLegend()}
          </div>
          {generatePlateLayout()}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            💡 Hover over wells to see detailed composition. Click and drag to plan custom well arrangements.
          </p>
        </div>
      )}

      {/* Calculation Display Panel */}
      {dilutionSteps.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Dilution Steps
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Step
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Concentration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Source
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Dilution Factor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Stock/Source Vol
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Diluent Vol
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">
                    Total Volume
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {dilutionSteps.map((step, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatConcentration(step.concentration)}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {step.sourceStep === null ? 'Stock' : `Step ${step.sourceStep + 1}`}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {step.dilutionFactor.toFixed(2)}x
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {step.stockVolume.toFixed(1)} {volumeUnit}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {step.diluentVolume.toFixed(1)} {volumeUnit}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                      {step.totalVolume.toFixed(1)} {volumeUnit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Master Mix Calculator */}
      {dilutionSteps.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Master Mix Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Stock Required</p>
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                {dilutionSteps[0]?.stockVolume.toFixed(1)} {volumeUnit}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Diluent Required</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {dilutionSteps.reduce((sum, step) => sum + step.diluentVolume, 0).toFixed(1)} {volumeUnit}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Number of Wells</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {dilutionSteps.length * parseInt(replicates)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Workflow */}
      {dilutionSteps.length > 0 && (() => {
        const needsInitialDilution = parseFloat(stockConcentration) < parseFloat(originalStockConcentration);
        let stepNum = 1;

        return (
          <div className="card">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Step-by-Step Protocol
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {stepNum++}. Prepare Original Stock Solution
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Ensure you have {originalStockConcentration} {stockUnit} stock solution ready.
                  {needsInitialDilution && (
                    <span className="block mt-1 font-medium text-primary-600 dark:text-primary-400">
                      ⚠️ You will need to dilute this to {stockConcentration} {stockUnit} for the first plate concentration.
                    </span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {stepNum++}. Prepare Dilution Buffer
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Have at least {dilutionSteps.reduce((sum, step) => sum + step.diluentVolume, 0).toFixed(1)} {volumeUnit} of buffer/diluent ready for serial dilutions.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {stepNum++}. Prepare Assay Reagent
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Prepare {(getAssayVolume() * dilutionSteps.length * parseInt(replicates) * parseFloat(excessFactor)).toFixed(1)} {volumeUnit} of assay reagent/buffer.
                  This will be added to each well ({getAssayVolume()} {volumeUnit} per well).
                </p>
              </div>

              {dilutionSteps.map((step, idx) => (
                <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {stepNum++}. Prepare {formatConcentration(step.concentration)} Dilution
                  </p>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                    {step.diluentVolume > 0 && (
                      <li>Add {step.diluentVolume.toFixed(1)} {volumeUnit} diluent to tube/well</li>
                    )}
                    <li>Add {step.stockVolume.toFixed(1)} {volumeUnit} from {step.sourceStep === null ? `${originalStockConcentration} ${stockUnit} stock` : `previous dilution (${formatConcentration(dilutionSteps[step.sourceStep].concentration)})`}</li>
                    <li>Mix thoroughly (vortex or pipette mixing)</li>
                    <li>Total volume prepared: {step.totalVolume.toFixed(1)} {volumeUnit}</li>
                  </ul>
                </div>
              ))}

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {stepNum++}. Add Samples to Plate
                </p>
                <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                  <li>Add {getAssayVolume()} {volumeUnit} assay reagent to all wells first</li>
                  <li>Add {sampleVolume} {volumeUnit} of each diluted sample to appropriate wells</li>
                  <li>Use multi-channel pipette if available for replicates</li>
                  <li>Remember to include blank wells ({finalVolume} {volumeUnit} assay reagent only)</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  {stepNum++}. Final Check
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Verify plate layout matches your design. Each well should contain {finalVolume} {volumeUnit} total ({sampleVolume} {volumeUnit} sample + {getAssayVolume()} {volumeUnit} assay).
                  Mix gently if needed and proceed with your assay.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
