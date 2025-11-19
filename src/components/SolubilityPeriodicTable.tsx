/**
 * Enhanced Periodic Table with Comprehensive Solubility Database
 *
 * Features:
 * - Temperature-dependent solubility data for 87 inorganic compounds
 * - Interactive visualization with compound count badges
 * - Detailed element modal with solubility tables
 * - Temperature control slider
 * - Data quality indicators
 */

import { useState, useEffect } from 'react';
import { Atom, X, Thermometer, Beaker, TrendingUp } from 'lucide-react';
import { elements, categoryColors, categoryNames, Element as ElementType } from '@/data/elements';
import type { SolubilityDatabase, SolubilityStats, TemperatureDataPoint } from '@/types/solubility';

export default function SolubilityPeriodicTable() {
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const [solubilityData, setSolubilityData] = useState<SolubilityDatabase | null>(null);
  const [stats, setStats] = useState<SolubilityStats | null>(null);
  const [temperature, setTemperature] = useState<number>(25);

  // Load solubility database
  useEffect(() => {
    Promise.all([
      fetch('/data/solubility-database.json').then(r => r.json()),
      fetch('/data/solubility-stats.json').then(r => r.json())
    ])
      .then(([db, st]) => {
        setSolubilityData(db);
        setStats(st);
      })
      .catch(err => {
        console.error('Failed to load solubility data:', err);
      });
  }, []);

  // Get compound count for an element
  const getCompoundCount = (symbol: string): number => {
    if (!solubilityData) return 0;
    const elementData = solubilityData[symbol];
    return elementData ? Object.keys(elementData.compounds).length : 0;
  };

  // Check if element has solubility data
  const hasSolubilityData = (symbol: string): boolean => {
    return getCompoundCount(symbol) > 0;
  };

  // Get solubility data at specific temperature
  const getSolubilityAtTemp = (compound: any, temp: number): TemperatureDataPoint | null => {
    const tempKey = temp.toString();
    if (compound.temperatureData[tempKey]) {
      return compound.temperatureData[tempKey];
    }

    // Find closest temperature
    const temps = Object.keys(compound.temperatureData).map(Number).sort((a, b) => a - b);
    const closest = temps.reduce((prev, curr) =>
      Math.abs(curr - temp) < Math.abs(prev - temp) ? curr : prev
    );

    return compound.temperatureData[closest.toString()] || null;
  };

  // Helper to get element by atomic number
  const getElement = (num: number): ElementType | null => {
    return elements.find(el => el.number === num) || null;
  };

  // Main periodic table (Periods 1-7)
  const periodicTable: (ElementType | null | 'lanthanide-marker' | 'actinide-marker')[][] = [
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
    [getElement(55), getElement(56), 'lanthanide-marker', getElement(72), getElement(73), getElement(74), getElement(75), getElement(76), getElement(77), getElement(78), getElement(79), getElement(80), getElement(81), getElement(82), getElement(83), getElement(84), getElement(85), getElement(86)],
    // Period 7
    [getElement(87), getElement(88), 'actinide-marker', getElement(104), getElement(105), getElement(106), getElement(107), getElement(108), getElement(109), getElement(110), getElement(111), getElement(112), getElement(113), getElement(114), getElement(115), getElement(116), getElement(117), getElement(118)],
  ];

  // Lanthanides (elements 57-71)
  const lanthanides: (ElementType | null)[] = [];
  for (let i = 57; i <= 71; i++) {
    lanthanides.push(getElement(i));
  }

  // Actinides (elements 89-103)
  const actinides: (ElementType | null)[] = [];
  for (let i = 89; i <= 103; i++) {
    actinides.push(getElement(i));
  }

  // Render element tile
  const renderElementTile = (element: ElementType) => {
    const compoundCount = getCompoundCount(element.symbol);
    const hasData = hasSolubilityData(element.symbol);

    return (
      <button
        onClick={() => setSelectedElement(element)}
        className={`
          w-full h-full ${categoryColors[element.category]} text-slate-900 rounded shadow
          hover:shadow-lg transition-all duration-200 transform hover:scale-105
          flex flex-col items-center justify-center text-xs font-semibold
          border-2 ${hasData ? 'border-blue-500' : 'border-slate-300'}
          relative
        `}
        title={`${element.name}${hasData ? ` - ${compoundCount} compounds` : ''}`}
      >
        <div className="text-[10px] font-normal">{element.number}</div>
        <div className="text-lg font-bold">{element.symbol}</div>
        <div className="text-[9px] font-normal truncate max-w-full px-1">{element.name}</div>

        {/* Compound count badge */}
        {hasData && (
          <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md">
            {compoundCount}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Atom className="w-7 h-7" />
          Interactive Periodic Table with Solubility Database
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Comprehensive solubility data for {stats?.totalCompounds || 87} inorganic compounds across {stats?.totalElements || 22} elements.
          Click any highlighted element to explore temperature-dependent solubility data.
        </p>
      </div>

      {/* Temperature Control */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-2 text-slate-800 dark:text-slate-200">
              Temperature: {temperature}°C
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
              <span>0°C</span>
              <span>25°C</span>
              <span>50°C</span>
              <span>75°C</span>
              <span>100°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Periodic Table Grid */}
      <div className="card overflow-x-auto">
        <div className="min-w-max">
          {/* Main table */}
          {periodicTable.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 mb-1">
              {row.map((element, colIndex) => (
                <div key={colIndex} className="w-14 h-16">
                  {element && typeof element === 'object' && 'symbol' in element ? (
                    renderElementTile(element)
                  ) : element === 'lanthanide-marker' ? (
                    <div className="w-full h-full bg-pink-200 dark:bg-pink-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      57-71
                    </div>
                  ) : element === 'actinide-marker' ? (
                    <div className="w-full h-full bg-rose-200 dark:bg-rose-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      89-103
                    </div>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Spacer */}
          <div className="h-4"></div>

          {/* Lanthanides */}
          <div className="flex gap-1 mb-1">
            <div className="w-14 h-16"></div>
            <div className="w-14 h-16"></div>
            {lanthanides.map((element, idx) => (
              <div key={idx} className="w-14 h-16">
                {element ? renderElementTile(element) : <div className="w-full h-full" />}
              </div>
            ))}
          </div>

          {/* Actinides */}
          <div className="flex gap-1">
            <div className="w-14 h-16"></div>
            <div className="w-14 h-16"></div>
            {actinides.map((element, idx) => (
              <div key={idx} className="w-14 h-16">
                {element ? renderElementTile(element) : <div className="w-full h-full" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Element Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(categoryNames).slice(0, 5).map(([key, name]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${categoryColors[key]} border border-slate-300`} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Solubility Data</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">Has solubility data (badge shows compound count)</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Temperature-dependent data (0-100°C)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Element Details Modal */}
      {selectedElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`${categoryColors[selectedElement.category]} p-6 rounded-t-lg relative`}>
              <button
                onClick={() => setSelectedElement(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>
              <div className="flex items-center gap-4">
                <div className="text-7xl font-bold text-slate-900">{selectedElement.symbol}</div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{selectedElement.name}</div>
                  <div className="text-xl text-slate-700">Atomic Number: {selectedElement.number}</div>
                  <div className="text-lg text-slate-700">{categoryNames[selectedElement.category]}</div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Solubility Data Section */}
              {solubilityData && solubilityData[selectedElement.symbol] ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
                    <Beaker className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Solubility Data ({Object.keys(solubilityData[selectedElement.symbol].compounds).length} compounds)
                  </div>

                  {/* Compounds Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Compound</th>
                          <th className="px-4 py-2 text-left">Anion</th>
                          <th className="px-4 py-2 text-right">MW (g/mol)</th>
                          <th className="px-4 py-2 text-right">Solubility at {temperature}°C</th>
                          <th className="px-4 py-2 text-center">Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {Object.values(solubilityData[selectedElement.symbol].compounds).map((compound: any, idx) => {
                          const tempData = getSolubilityAtTemp(compound, temperature);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-2 font-mono">{compound.formula}</td>
                              <td className="px-4 py-2">{compound.anion}</td>
                              <td className="px-4 py-2 text-right">{compound.molecularWeight?.toFixed(2) || 'N/A'}</td>
                              <td className="px-4 py-2 text-right">
                                {tempData ? (
                                  <div>
                                    <div className="font-semibold">{tempData.gPer100mL?.toFixed(2)} g/100mL</div>
                                    <div className="text-xs text-slate-500">{tempData.molarity?.toFixed(3)} M</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">No data</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {compound.quality}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Temperature note */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                    * All compounds have temperature data from 0°C to 100°C in 10°C increments
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  <Beaker className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No solubility data available for this element yet.</p>
                  <p className="text-sm mt-2">This element will be added in future database updates.</p>
                </div>
              )}

              {/* Basic Properties */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Basic Properties</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-slate-700 dark:text-slate-300"><strong>Atomic Mass:</strong> {selectedElement.atomicMass} u</p>
                    <p className="text-slate-700 dark:text-slate-300"><strong>Period:</strong> {selectedElement.period}</p>
                    {selectedElement.group && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Group:</strong> {selectedElement.group}</p>
                    )}
                    <p className="text-slate-700 dark:text-slate-300"><strong>Block:</strong> {selectedElement.block}-block</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Physical Properties</h4>
                  <div className="text-sm space-y-1">
                    {selectedElement.meltingPoint && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Melting Point:</strong> {selectedElement.meltingPoint} K</p>
                    )}
                    {selectedElement.boilingPoint && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Boiling Point:</strong> {selectedElement.boilingPoint} K</p>
                    )}
                    {selectedElement.density && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Density:</strong> {selectedElement.density} g/cm³</p>
                    )}
                    {selectedElement.electronegativity && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Electronegativity:</strong> {selectedElement.electronegativity}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          About This Database
        </h3>
        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p>
            <strong>Dataset:</strong> Curated solubility database with {stats?.totalCompounds || 87} inorganic compounds
          </p>
          <p>
            <strong>Coverage:</strong> {stats?.totalElements || 22} elements with comprehensive temperature data (0-100°C)
          </p>
          <p>
            <strong>Quality:</strong> All measurements rated G5 (highest quality) with multiple temperature points
          </p>
          <p>
            <strong>Last Updated:</strong> {stats?.lastUpdated || 'November 2025'}
          </p>
        </div>
      </div>
    </div>
  );
}
