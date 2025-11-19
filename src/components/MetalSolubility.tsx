/**
 * Metal Solubility Component
 * Interactive periodic table focused on metal solubility data from CRC database
 */

import { useState, useEffect } from 'react';
import { Beaker } from 'lucide-react';
import { elements } from '@/data/elements';

// Define the structure of solubility data
interface SolubilityRecord {
  compound: string;
  element: string;
  anion: string;
  mw: number;
  temp: number;
  massPercent: number;
  molarity: number;
  logS: number;
  gPer100mL: number;
  source: string;
}

// Unit type for display
type Unit = 'g/100mL' | 'Molarity' | 'logS' | 'Mass%';

// Metal categories (all metals from the periodic table)
const METAL_CATEGORIES = [
  'alkali-metal',
  'alkaline-earth',
  'transition-metal',
  'post-transition',
  'lanthanide',
  'actinide'
];

export default function MetalSolubility() {
  const [solubilityData, setSolubilityData] = useState<SolubilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedAnion, setSelectedAnion] = useState<string>('All');
  const [temperature, setTemperature] = useState<number>(25);
  const [unit, setUnit] = useState<Unit>('Molarity');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Reset filters to default
  const resetFilters = () => {
    setSelectedAnion('All');
    setTemperature(25);
    setUnit('Molarity');
  };

  // Available anions from the data
  const [availableAnions, setAvailableAnions] = useState<string[]>([]);

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/crc_complete_solubility.csv');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const lines = text.split('\n').slice(1); // Skip header
        const records: SolubilityRecord[] = [];
        const anionsSet = new Set<string>();

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split(',');
          if (parts.length < 10) continue;

          const record: SolubilityRecord = {
            compound: parts[0].trim(),
            element: parts[1].trim(),
            anion: parts[2].trim(),
            mw: parseFloat(parts[3]),
            temp: parseFloat(parts[4]),
            massPercent: parseFloat(parts[5]),
            molarity: parseFloat(parts[6]),
            logS: parseFloat(parts[7]),
            gPer100mL: parseFloat(parts[8]),
            source: parts[9].trim()
          };

          records.push(record);
          anionsSet.add(record.anion);
        }

        console.log(`Loaded ${records.length} solubility records`);
        console.log(`Available elements:`, [...new Set(records.map(r => r.element))].sort().join(', '));

        setSolubilityData(records);
        setAvailableAnions(['All', ...Array.from(anionsSet).sort()]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading solubility data:', err);
        setError(`Failed to load solubility data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get solubility value for an element at current temperature and anion
  const getSolubilityForElement = (elementSymbol: string): number | null => {
    const filtered = solubilityData.filter(record => {
      const matchesElement = record.element === elementSymbol;
      const matchesAnion = selectedAnion === 'All' || record.anion === selectedAnion;
      return matchesElement && matchesAnion;
    });

    if (filtered.length === 0) {
      return null;
    }

    // Find closest temperature match or interpolate
    const sortedByTemp = filtered.sort((a, b) => Math.abs(a.temp - temperature) - Math.abs(b.temp - temperature));
    const closest = sortedByTemp[0];

    // Return value based on selected unit
    switch (unit) {
      case 'g/100mL':
        return closest.gPer100mL;
      case 'Molarity':
        return closest.molarity;
      case 'logS':
        return closest.logS;
      case 'Mass%':
        return closest.massPercent;
      default:
        return closest.gPer100mL;
    }
  };

  // Get color intensity based on solubility value
  const getColorIntensity = (value: number | null, unitType: Unit): string => {
    // Return gray for no data
    if (value === null) return 'rgb(203, 213, 225)'; // slate-300

    let normalized = 0;

    switch (unitType) {
      case 'g/100mL':
        // Normalize to 0-1 range (assuming max ~1000 g/100mL for highly soluble salts)
        normalized = Math.min(value / 100, 1);
        break;
      case 'Molarity':
        // Normalize to 0-1 range (assuming max ~5M for highly soluble salts)
        normalized = Math.min(value / 5, 1);
        break;
      case 'logS':
        // logS typically ranges from -4 to 1
        normalized = (value + 4) / 5;
        break;
      case 'Mass%':
        // Percentage 0-100
        normalized = value / 100;
        break;
    }

    normalized = Math.max(0, Math.min(1, normalized));

    // Color gradient: low solubility (red) -> medium (yellow) -> high (green)
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
            <span className="ml-3 text-slate-600 dark:text-slate-400">Loading solubility data...</span>
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Beaker className="w-7 h-7" />
          Metal Solubility - Interactive Periodic Table
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Explore metal salt solubility data from the CRC Handbook. Filter by specific anions, adjust temperature (0-100°C), and view solubility in different units. Colors dynamically update based on your filters - elements without data for the selected conditions appear gray.
        </p>
        {solubilityData.length > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Loaded {solubilityData.length} data points for {[...new Set(solubilityData.map(r => r.element))].length} elements • Default: All anions at 25°C in Molarity
          </p>
        )}
      </div>

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
          {/* Anion Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Anion Filter
            </label>
            <select
              value={selectedAnion}
              onChange={(e) => setSelectedAnion(e.target.value)}
              className="input-field w-full"
            >
              {availableAnions.map(anion => (
                <option key={anion} value={anion}>{anion}</option>
              ))}
            </select>
          </div>

          {/* Temperature Slider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Temperature: {temperature}°C
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

          {/* Units Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Units
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="input-field w-full"
            >
              <option value="Molarity">Molarity (M)</option>
              <option value="g/100mL">g/100mL H₂O</option>
              <option value="Mass%">Mass %</option>
              <option value="logS">log S</option>
            </select>
          </div>

          {/* Legend */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Solubility Legend
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
                Colors update based on selected filters
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
                const solubility = isMetalElement ? getSolubilityForElement(element.symbol) : null;
                const bgColor = isMetalElement ? getColorIntensity(solubility, unit) : 'rgb(200, 200, 200)';
                const isGrayedOut = !isMetalElement;

                return (
                  <div key={colIndex} className="w-14 h-16">
                    <button
                      onClick={() => setSelectedElement(element.symbol)}
                      className={`w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300 ${
                        isGrayedOut ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                      style={{ backgroundColor: bgColor }}
                      title={`${element.name}${solubility !== null ? ` - ${solubility.toFixed(3)} ${unit}` : ' - No data'}`}
                      disabled={isGrayedOut}
                    >
                      <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                      <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                      {solubility !== null && !isGrayedOut && (
                        <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                          {solubility < 0.01 ? solubility.toExponential(1) : solubility.toFixed(2)}
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

              const solubility = getSolubilityForElement(element.symbol);
              const bgColor = getColorIntensity(solubility, unit);

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={() => setSelectedElement(element.symbol)}
                    className="w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300"
                    style={{ backgroundColor: bgColor }}
                    title={`${element.name}${solubility !== null ? ` - ${solubility.toFixed(3)} ${unit}` : ' - No data'}`}
                  >
                    <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                    <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                    {solubility !== null && (
                      <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                        {solubility < 0.01 ? solubility.toExponential(1) : solubility.toFixed(2)}
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

              const solubility = getSolubilityForElement(element.symbol);
              const bgColor = getColorIntensity(solubility, unit);

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={() => setSelectedElement(element.symbol)}
                    className="w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300"
                    style={{ backgroundColor: bgColor }}
                    title={`${element.name}${solubility !== null ? ` - ${solubility.toFixed(3)} ${unit}` : ' - No data'}`}
                  >
                    <div className="text-[10px] font-normal text-slate-900">{element.number}</div>
                    <div className="text-lg font-bold text-slate-900">{element.symbol}</div>
                    {solubility !== null && (
                      <div className="text-[8px] font-normal text-slate-900 truncate max-w-full px-1">
                        {solubility < 0.01 ? solubility.toExponential(1) : solubility.toFixed(2)}
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
        const elementData = solubilityData
          .filter(record => record.element === selectedElement)
          .filter(record => selectedAnion === 'All' || record.anion === selectedAnion)
          .sort((a, b) => a.temp - b.temp);

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Solubility Data for {selectedElement}
                {elementData.length > 0 && (
                  <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-2">
                    ({elementData.length} records)
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
                <p className="text-sm">Try selecting "All" in the anion filter or choose a different element</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Compound
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Anion
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Temp (°C)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        g/100mL
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Molarity (M)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Mass %
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        log S
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {elementData.map((record, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.compound}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.anion}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.temp}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.gPer100mL.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.molarity.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.massPercent.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {record.logS.toFixed(3)}
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
