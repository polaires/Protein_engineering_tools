/**
 * Stability Constant Component
 * Interactive periodic table focused on metal-ligand stability constants from NIST SRD 46 database
 */

import { useState, useEffect } from 'react';
import { TestTube2 } from 'lucide-react';
import { elements } from '@/data/elements';

// Define the structure of stability constant data
interface StabilityRecord {
  element: string;
  metalIon: string;
  ligandName: string;
  ligandFormula: string;
  stabilityConstant: number;
  temperature: number;
  ionicStrength: number;
  error: string;
  constantType: string;
  betaDefinition: string;
}

// Metal categories (all metals from the periodic table)
const METAL_CATEGORIES = [
  'alkali-metal',
  'alkaline-earth',
  'transition-metal',
  'post-transition',
  'lanthanide',
  'actinide'
];

interface StabilityConstantProps {
  hideHeader?: boolean;
}

export default function StabilityConstant({ hideHeader = false }: StabilityConstantProps = {}) {
  const [stabilityData, setStabilityData] = useState<StabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedLigand, setSelectedLigand] = useState<string>('All');
  const [temperature, setTemperature] = useState<number>(25);
  const [constantType, setConstantType] = useState<string>('All');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Reset filters to default
  const resetFilters = () => {
    setSelectedLigand('All');
    setTemperature(25);
    setConstantType('All');
  };

  // Available ligands and constant types from the data
  const [availableLigands, setAvailableLigands] = useState<string[]>([]);
  const [availableConstantTypes, setAvailableConstantTypes] = useState<string[]>([]);

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/nist_stability_constants.csv');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const lines = text.split('\n').slice(1); // Skip header
        const records: StabilityRecord[] = [];
        const ligandsSet = new Set<string>();
        const typesSet = new Set<string>();

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split(',');
          if (parts.length < 10) continue;

          const temp = parseFloat(parts[5]);
          const ionic = parseFloat(parts[6]);
          const constant = parseFloat(parts[4]);

          if (isNaN(constant)) continue;

          const record: StabilityRecord = {
            element: parts[0].trim(),
            metalIon: parts[1].trim(),
            ligandName: parts[2].trim(),
            ligandFormula: parts[3].trim(),
            stabilityConstant: constant,
            temperature: isNaN(temp) ? 25 : temp,
            ionicStrength: isNaN(ionic) ? 0 : ionic,
            error: parts[7].trim(),
            constantType: parts[8].trim(),
            betaDefinition: parts[9].trim()
          };

          records.push(record);
          if (record.ligandName) ligandsSet.add(record.ligandName);
          if (record.constantType) typesSet.add(record.constantType);
        }

        console.log(`Loaded ${records.length} stability constant records`);
        console.log(`Available elements:`, [...new Set(records.map(r => r.element))].sort().join(', '));

        setStabilityData(records);

        // Limit ligands to top 100 most common to avoid overwhelming the dropdown
        const ligandCounts = new Map<string, number>();
        records.forEach(r => {
          if (r.ligandName) {
            ligandCounts.set(r.ligandName, (ligandCounts.get(r.ligandName) || 0) + 1);
          }
        });
        const topLigands = Array.from(ligandCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 100)
          .map(([ligand]) => ligand);

        setAvailableLigands(['All', ...topLigands.sort()]);
        setAvailableConstantTypes(['All', ...Array.from(typesSet).sort()]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading stability constant data:', err);
        setError(`Failed to load stability constant data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get average stability constant for an element
  const getStabilityForElement = (elementSymbol: string): number | null => {
    const filtered = stabilityData.filter(record => {
      const matchesElement = record.element === elementSymbol;
      const matchesLigand = selectedLigand === 'All' || record.ligandName === selectedLigand;
      const matchesType = constantType === 'All' || record.constantType === constantType;
      const matchesTemp = Math.abs(record.temperature - temperature) <= 5; // Within 5°C
      return matchesElement && matchesLigand && matchesType && matchesTemp;
    });

    if (filtered.length === 0) {
      return null;
    }

    // Calculate average log K value
    const sum = filtered.reduce((acc, r) => acc + r.stabilityConstant, 0);
    return sum / filtered.length;
  };

  // Get color intensity based on stability constant value
  const getColorIntensity = (value: number | null): string => {
    // Return gray for no data
    if (value === null) return 'rgb(203, 213, 225)'; // slate-300

    // Stability constants (log K) typically range from -5 to 40
    // Normalize to 0-1 range
    const normalized = Math.max(0, Math.min(1, (value + 5) / 45));

    // Color gradient: low stability (red) -> medium (yellow) -> high (green)
    if (normalized < 0.5) {
      const intensity = Math.round(normalized * 2 * 255);
      return `rgb(255, ${intensity}, 0)`; // Red to Yellow
    } else {
      const intensity = Math.round((1 - normalized) * 2 * 255);
      return `rgb(${intensity}, 255, 0)`; // Yellow to Green
    }
  };

  // Check if element is a metal
  const isMetal = (category: string): boolean => {
    return METAL_CATEGORIES.includes(category);
  };

  // Helper to get element by atomic number
  const getElement = (num: number) => {
    return elements.find(el => el.number === num) || null;
  };

  // Periodic table layout (same as Element component)
  const periodicTable = [
    // Period 1
    [getElement(1), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, getElement(2)],
    // Period 2
    [getElement(3), getElement(4), null, null, null, null, null, null, null, null, null, null, getElement(5), getElement(6), getElement(7), getElement(8), getElement(9), getElement(10)],
    // Period 3
    [getElement(11), getElement(12), null, null, null, null, null, null, null, null, null, null, getElement(13), getElement(14), getElement(15), getElement(16), getElement(17), getElement(18)],
    // Period 4
    [getElement(19), getElement(20), getElement(21), getElement(22), getElement(23), getElement(24), getElement(25), getElement(26), getElement(27), getElement(28), getElement(29), getElement(30), getElement(31), getElement(32), getElement(33), getElement(34), getElement(35), getElement(36)],
    // Period 5
    [getElement(37), getElement(38), getElement(39), getElement(40), getElement(41), getElement(42), getElement(43), getElement(44), getElement(45), getElement(46), getElement(47), getElement(48), getElement(49), getElement(50), getElement(51), getElement(52), getElement(53), getElement(54)],
    // Period 6
    [getElement(55), getElement(56), 'lanthanide-marker' as const, getElement(72), getElement(73), getElement(74), getElement(75), getElement(76), getElement(77), getElement(78), getElement(79), getElement(80), getElement(81), getElement(82), getElement(83), getElement(84), getElement(85), getElement(86)],
    // Period 7
    [getElement(87), getElement(88), 'actinide-marker' as const, getElement(104), getElement(105), getElement(106), getElement(107), getElement(108), getElement(109), getElement(110), getElement(111), getElement(112), getElement(113), getElement(114), getElement(115), getElement(116), getElement(117), getElement(118)],
  ];

  // Lanthanides (elements 57-71)
  const lanthanides = Array.from({ length: 15 }, (_, i) => getElement(57 + i));

  // Actinides (elements 89-103)
  const actinides = Array.from({ length: 15 }, (_, i) => getElement(89 + i));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="spinner"></div>
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading stability constant data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="card">
          <div className="text-center text-red-600 dark:text-red-400 py-12">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!hideHeader && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2">
            <TestTube2 className="w-7 h-7" />
            Stability Constants - Interactive Periodic Table
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Explore metal-ligand stability constants from the NIST SRD 46 database. Filter by specific ligands, adjust temperature (±5°C tolerance), and filter by constant type. Colors dynamically update based on average log K values - elements without data for the selected conditions appear gray.
          </p>
          {stabilityData.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Loaded {stabilityData.length.toLocaleString()} data points for {[...new Set(stabilityData.map(r => r.element))].length} elements • Data from NIST Critically Selected Stability Constants of Metal Complexes
            </p>
          )}
        </div>
      )}

      {/* Control Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Filters
          </h3>
          <button
            onClick={resetFilters}
            className="btn-secondary text-sm"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ligand Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ligand Filter (Top 100)
            </label>
            <select
              value={selectedLigand}
              onChange={(e) => setSelectedLigand(e.target.value)}
              className="input-field w-full text-xs"
            >
              {availableLigands.map(ligand => (
                <option key={ligand} value={ligand}>
                  {ligand.length > 40 ? ligand.substring(0, 40) + '...' : ligand}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature Slider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature: {temperature}°C (±5°C)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={temperature}
              onChange={(e) => setTemperature(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>0°C</span>
              <span>100°C</span>
            </div>
          </div>

          {/* Constant Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Constant Type
            </label>
            <select
              value={constantType}
              onChange={(e) => setConstantType(e.target.value)}
              className="input-field w-full"
            >
              {availableConstantTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Legend */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Stability Legend (log K)
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: 'rgb(255, 0, 0)' }}></div>
                  <span className="text-slate-600 dark:text-slate-400">Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: 'rgb(255, 255, 0)' }}></div>
                  <span className="text-slate-600 dark:text-slate-400">Med</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: 'rgb(0, 255, 0)' }}></div>
                  <span className="text-slate-600 dark:text-slate-400">High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: 'rgb(203, 213, 225)' }}></div>
                  <span className="text-slate-600 dark:text-slate-400">No data</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                Colors show average log K values
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Periodic Table */}
      <div className="card overflow-x-auto">
        <div className="min-w-max">
          {/* Main table */}
          {periodicTable.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 mb-1">
              {row.map((element, colIndex) => {
                if (!element) {
                  return <div key={colIndex} className="w-14 h-16" />;
                }

                if (element === 'lanthanide-marker') {
                  return (
                    <div key={colIndex} className="w-14 h-16 bg-pink-200 dark:bg-pink-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      57-71
                    </div>
                  );
                }

                if (element === 'actinide-marker') {
                  return (
                    <div key={colIndex} className="w-14 h-16 bg-rose-200 dark:bg-rose-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      89-103
                    </div>
                  );
                }

                const isMetalElement = isMetal(element.category);
                const stability = isMetalElement ? getStabilityForElement(element.symbol) : null;
                const bgColor = isMetalElement ? getColorIntensity(stability) : 'rgb(200, 200, 200)';
                const isGrayedOut = !isMetalElement;

                return (
                  <div key={colIndex} className="w-14 h-16">
                    <button
                      onClick={() => setSelectedElement(element.symbol)}
                      className={`w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300 ${
                        isGrayedOut ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                      style={{ backgroundColor: bgColor }}
                      title={`${element.name}${stability !== null ? ` - log K: ${stability.toFixed(2)}` : ' - No data'}`}
                      disabled={isGrayedOut}
                    >
                      <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                      <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                      {stability !== null && !isGrayedOut && (
                        <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                          {stability.toFixed(1)}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Spacer */}
          <div className="h-4"></div>

          {/* Lanthanides */}
          <div className="flex gap-1 mb-1">
            <div className="w-14 h-16"></div>
            {lanthanides.map((element, idx) => {
              if (!element) return <div key={idx} className="w-14 h-16" />;

              const stability = getStabilityForElement(element.symbol);
              const bgColor = getColorIntensity(stability);

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={() => setSelectedElement(element.symbol)}
                    className="w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300"
                    style={{ backgroundColor: bgColor }}
                    title={`${element.name}${stability !== null ? ` - log K: ${stability.toFixed(2)}` : ' - No data'}`}
                  >
                    <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                    <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                    {stability !== null && (
                      <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                        {stability.toFixed(1)}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actinides */}
          <div className="flex gap-1">
            <div className="w-14 h-16"></div>
            {actinides.map((element, idx) => {
              if (!element) return <div key={idx} className="w-14 h-16" />;

              const stability = getStabilityForElement(element.symbol);
              const bgColor = getColorIntensity(stability);

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={() => setSelectedElement(element.symbol)}
                    className="w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300"
                    style={{ backgroundColor: bgColor }}
                    title={`${element.name}${stability !== null ? ` - log K: ${stability.toFixed(2)}` : ' - No data'}`}
                  >
                    <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                    <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                    {stability !== null && (
                      <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                        {stability.toFixed(1)}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedElement && (() => {
        const elementData = stabilityData
          .filter(record => record.element === selectedElement)
          .filter(record => selectedLigand === 'All' || record.ligandName === selectedLigand)
          .filter(record => constantType === 'All' || record.constantType === constantType)
          .sort((a, b) => b.stabilityConstant - a.stabilityConstant)
          .slice(0, 100); // Limit to top 100 for performance

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Stability Constants for {selectedElement}
                {elementData.length > 0 && (
                  <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-2">
                    (showing top 100 of {stabilityData.filter(r => r.element === selectedElement).length} total records)
                  </span>
                )}
              </h3>
              <button
                onClick={() => setSelectedElement(null)}
                className="btn-secondary text-sm"
              >
                Close
              </button>
            </div>

            {elementData.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                <p className="text-lg mb-2">No data available for {selectedElement}</p>
                <p className="text-sm">Try selecting "All" in the ligand and constant type filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Metal Ion
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Ligand
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Formula
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        log K
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Temp (°C)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        I (M)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {elementData.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.metalIon}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100 max-w-xs truncate" title={record.ligandName}>
                          {record.ligandName}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.ligandFormula}
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {record.stabilityConstant.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.temperature || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.ionicStrength || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.constantType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
