/**
 * Enhanced Periodic Table with Comprehensive Solubility Database
 *
 * Features:
 * - 10,928 solubility entries across 107 elements
 * - Temperature-dependent data (0-100°C)
 * - Anion filters, quality filters, source filters
 * - Units selector (g/100mL, Molarity, log S, Mass %)
 * - Search functionality
 * - Comparison mode for multiple elements
 * - SMILES data for organic compounds
 */

import { useState, useEffect } from 'react';
import { Atom, X, Thermometer, Beaker, TrendingUp, Search, Filter, GitCompare } from 'lucide-react';
import { elements, categoryColors, categoryNames, Element as ElementType } from '@/data/elements';
import type { SolubilityDatabase, SolubilityStats, TemperatureDataPoint } from '@/types/solubility';

type SolubilityUnit = 'gPer100mL' | 'molarity' | 'logS' | 'massPct';
type DataQuality = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
type DataSource = 'CRC' | 'Wikipedia' | 'Curated';

export default function SolubilityPeriodicTable() {
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const [solubilityData, setSolubilityData] = useState<SolubilityDatabase | null>(null);
  const [stats, setStats] = useState<SolubilityStats | null>(null);
  const [temperature, setTemperature] = useState<number>(25);

  // Filter states
  const [selectedAnions, setSelectedAnions] = useState<string[]>([]);
  const [selectedQualities, setSelectedQualities] = useState<DataQuality[]>([]);
  const [selectedSources, setSelectedSources] = useState<DataSource[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<SolubilityUnit>('gPer100mL');
  const [searchQuery, setSearchQuery] = useState('');

  // Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparedElements, setComparedElements] = useState<string[]>([]);

  // Load solubility database
  useEffect(() => {
    Promise.all([
      fetch('/data/solubility-database-comprehensive.json').then(r => r.json()),
      fetch('/data/solubility-stats-comprehensive.json').then(r => r.json())
    ])
      .then(([db, st]) => {
        setSolubilityData(db);
        setStats(st);
      })
      .catch(err => {
        console.error('Failed to load solubility data:', err);
      });
  }, []);

  // Get filtered compound count for an element
  const getCompoundCount = (symbol: string): number => {
    if (!solubilityData) return 0;
    const elementData = solubilityData[symbol];
    if (!elementData) return 0;

    return Object.values(elementData.compounds).filter(compound => {
      // Apply filters
      if (selectedAnions.length > 0 && !selectedAnions.includes(compound.anion || '')) return false;
      if (selectedQualities.length > 0 && !selectedQualities.includes(compound.dataQuality as DataQuality)) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(compound.source as DataSource)) return false;
      if (searchQuery && !compound.formula.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).length;
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
    if (temps.length === 0) return null;

    const closest = temps.reduce((prev, curr) =>
      Math.abs(curr - temp) < Math.abs(prev - temp) ? curr : prev
    );

    return compound.temperatureData[closest.toString()] || null;
  };

  // Format solubility value based on selected unit
  const formatSolubility = (tempData: TemperatureDataPoint | null): string => {
    if (!tempData) return 'N/A';

    switch (selectedUnit) {
      case 'gPer100mL':
        return tempData.gPer100mL ? `${tempData.gPer100mL.toFixed(2)} g/100mL` : 'N/A';
      case 'molarity':
        return tempData.molarity ? `${tempData.molarity.toFixed(3)} M` : 'N/A';
      case 'logS':
        return tempData.logS !== null && tempData.logS !== undefined ? `${tempData.logS.toFixed(3)}` : 'N/A';
      case 'massPct':
        return tempData.massPct ? `${tempData.massPct.toFixed(2)} %` : 'N/A';
      default:
        return 'N/A';
    }
  };

  // Get quality badge color
  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case 'G5': return 'bg-green-600 text-white';
      case 'G4': return 'bg-blue-600 text-white';
      case 'G3': return 'bg-yellow-600 text-white';
      case 'G2': return 'bg-orange-600 text-white';
      case 'G1': return 'bg-gray-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Toggle element in comparison
  const toggleComparison = (symbol: string) => {
    if (comparedElements.includes(symbol)) {
      setComparedElements(comparedElements.filter(s => s !== symbol));
    } else {
      setComparedElements([...comparedElements, symbol]);
    }
  };

  // Helper to get element by atomic number
  const getElement = (num: number): ElementType | null => {
    return elements.find(el => el.number === num) || null;
  };

  // Main periodic table (Periods 1-7)
  const periodicTable: (ElementType | null | 'lanthanide-marker' | 'actinide-marker')[][] = [
    [getElement(1), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, getElement(2)],
    [getElement(3), getElement(4), null, null, null, null, null, null, null, null, null, null, getElement(5), getElement(6), getElement(7), getElement(8), getElement(9), getElement(10)],
    [getElement(11), getElement(12), null, null, null, null, null, null, null, null, null, null, getElement(13), getElement(14), getElement(15), getElement(16), getElement(17), getElement(18)],
    [getElement(19), getElement(20), getElement(21), getElement(22), getElement(23), getElement(24), getElement(25), getElement(26), getElement(27), getElement(28), getElement(29), getElement(30), getElement(31), getElement(32), getElement(33), getElement(34), getElement(35), getElement(36)],
    [getElement(37), getElement(38), getElement(39), getElement(40), getElement(41), getElement(42), getElement(43), getElement(44), getElement(45), getElement(46), getElement(47), getElement(48), getElement(49), getElement(50), getElement(51), getElement(52), getElement(53), getElement(54)],
    [getElement(55), getElement(56), 'lanthanide-marker', getElement(72), getElement(73), getElement(74), getElement(75), getElement(76), getElement(77), getElement(78), getElement(79), getElement(80), getElement(81), getElement(82), getElement(83), getElement(84), getElement(85), getElement(86)],
    [getElement(87), getElement(88), 'actinide-marker', getElement(104), getElement(105), getElement(106), getElement(107), getElement(108), getElement(109), getElement(110), getElement(111), getElement(112), getElement(113), getElement(114), getElement(115), getElement(116), getElement(117), getElement(118)],
  ];

  const lanthanides: (ElementType | null)[] = [];
  for (let i = 57; i <= 71; i++) lanthanides.push(getElement(i));

  const actinides: (ElementType | null)[] = [];
  for (let i = 89; i <= 103; i++) actinides.push(getElement(i));

  // Render element tile
  const renderElementTile = (element: ElementType) => {
    const compoundCount = getCompoundCount(element.symbol);
    const hasData = hasSolubilityData(element.symbol);
    const isCompared = comparedElements.includes(element.symbol);

    return (
      <button
        onClick={() => {
          if (comparisonMode) {
            toggleComparison(element.symbol);
          } else {
            setSelectedElement(element);
          }
        }}
        className={`
          w-full h-full ${categoryColors[element.category]} text-slate-900 rounded shadow
          hover:shadow-lg transition-all duration-200 transform hover:scale-105
          flex flex-col items-center justify-center text-xs font-semibold
          border-2 ${hasData ? 'border-blue-500' : 'border-slate-300'}
          ${isCompared ? 'ring-4 ring-purple-500' : ''}
          relative
        `}
        title={`${element.name}${hasData ? ` - ${compoundCount} compounds` : ''}`}
      >
        <div className="text-[10px] font-normal">{element.number}</div>
        <div className="text-lg font-bold">{element.symbol}</div>
        <div className="text-[9px] font-normal truncate max-w-full px-1">{element.name}</div>

        {hasData && (
          <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md">
            {compoundCount}
          </div>
        )}
      </button>
    );
  };

  // Get filtered compounds for modal
  const getFilteredCompounds = (elementSymbol: string) => {
    if (!solubilityData || !solubilityData[elementSymbol]) return [];

    return Object.values(solubilityData[elementSymbol].compounds).filter(compound => {
      if (selectedAnions.length > 0 && !selectedAnions.includes(compound.anion || '')) return false;
      if (selectedQualities.length > 0 && !selectedQualities.includes(compound.dataQuality as DataQuality)) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(compound.source as DataSource)) return false;
      if (searchQuery && !compound.formula.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Atom className="w-7 h-7" />
          Interactive Periodic Table with Comprehensive Solubility Database
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {stats?.totalEntries.toLocaleString() || '10,928'} solubility measurements across {stats?.totalElements || 107} elements including lanthanides and organic compounds with SMILES data.
        </p>
      </div>

      {/* Control Panel */}
      <div className="card space-y-4">
        {/* Row 1: Temperature & Comparison Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <Thermometer className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <GitCompare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={comparisonMode}
                onChange={(e) => {
                  setComparisonMode(e.target.checked);
                  if (!e.target.checked) setComparedElements([]);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Comparison Mode {comparisonMode && `(${comparedElements.length} selected)`}
              </span>
            </label>
          </div>
        </div>

        {/* Row 2: Search & Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search compounds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              Units:
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value as SolubilityUnit)}
              className="select-field flex-1"
            >
              <option value="gPer100mL">g/100mL</option>
              <option value="molarity">Molarity (M)</option>
              <option value="logS">log S</option>
              <option value="massPct">Mass %</option>
            </select>
          </div>
        </div>

        {/* Row 3: Filters */}
        <div className="flex items-start gap-2">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-2" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Anion Filter */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">
                Anions
              </label>
              <select
                multiple
                value={selectedAnions}
                onChange={(e) => setSelectedAnions(Array.from(e.target.selectedOptions, option => option.value))}
                className="select-field h-20 text-sm"
              >
                {stats?.anions.map(anion => (
                  <option key={anion} value={anion}>{anion}</option>
                ))}
              </select>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">
                Data Quality
              </label>
              <select
                multiple
                value={selectedQualities}
                onChange={(e) => setSelectedQualities(Array.from(e.target.selectedOptions, option => option.value) as DataQuality[])}
                className="select-field h-20 text-sm"
              >
                <option value="G5">G5 (Highest)</option>
                <option value="G4">G4 (High)</option>
                <option value="G3">G3 (Medium)</option>
                <option value="G2">G2 (Low)</option>
                <option value="G1">G1 (Lowest)</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200">
                Data Source
              </label>
              <select
                multiple
                value={selectedSources}
                onChange={(e) => setSelectedSources(Array.from(e.target.selectedOptions, option => option.value) as DataSource[])}
                className="select-field h-20 text-sm"
              >
                <option value="CRC">CRC Handbook</option>
                <option value="Wikipedia">Wikipedia</option>
                <option value="Curated">Curated Dataset</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedAnions.length > 0 || selectedQualities.length > 0 || selectedSources.length > 0 || searchQuery) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active filters:</span>
            {selectedAnions.map(anion => (
              <span key={anion} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                {anion}
              </span>
            ))}
            {selectedQualities.map(quality => (
              <span key={quality} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                {quality}
              </span>
            ))}
            {selectedSources.map(source => (
              <span key={source} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                {source}
              </span>
            ))}
            {searchQuery && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs">
                Search: {searchQuery}
              </span>
            )}
            <button
              onClick={() => {
                setSelectedAnions([]);
                setSelectedQualities([]);
                setSelectedSources([]);
                setSearchQuery('');
              }}
              className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Periodic Table Grid */}
      <div className="card overflow-x-auto">
        <div className="min-w-max">
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

      {/* Element Details Modal */}
      {selectedElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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

            <div className="p-6 space-y-6">
              {solubilityData && solubilityData[selectedElement.symbol] ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
                    <Beaker className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Solubility Data ({getFilteredCompounds(selectedElement.symbol).length} compounds)
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Compound</th>
                          <th className="px-4 py-2 text-left">Anion</th>
                          <th className="px-4 py-2 text-right">MW</th>
                          <th className="px-4 py-2 text-right">Solubility at {temperature}°C</th>
                          <th className="px-4 py-2 text-center">Quality</th>
                          <th className="px-4 py-2 text-center">Source</th>
                          <th className="px-4 py-2 text-center">SMILES</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {getFilteredCompounds(selectedElement.symbol).map((compound: any, idx) => {
                          const tempData = getSolubilityAtTemp(compound, temperature);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-2 font-mono text-xs">{compound.formula}</td>
                              <td className="px-4 py-2">{compound.anion || 'N/A'}</td>
                              <td className="px-4 py-2 text-right">{compound.molecularWeight?.toFixed(2) || 'N/A'}</td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {formatSolubility(tempData)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getQualityColor(compound.dataQuality)}`}>
                                  {compound.dataQuality}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center text-xs">{compound.source}</td>
                              <td className="px-4 py-2 text-center">
                                {compound.smiles ? (
                                  <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  <Beaker className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No solubility data available for this element.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparisonMode && comparedElements.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
            Comparing {comparedElements.length} Elements
          </h3>
          <div className="flex flex-wrap gap-2">
            {comparedElements.map(symbol => {
              const elem = elements.find(e => e.symbol === symbol);
              return elem ? (
                <div key={symbol} className="px-3 py-2 bg-purple-100 dark:bg-purple-900 rounded flex items-center gap-2">
                  <span className="font-semibold">{elem.symbol}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{elem.name}</span>
                  <span className="text-xs bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded">
                    {getCompoundCount(symbol)} compounds
                  </span>
                  <button
                    onClick={() => toggleComparison(symbol)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Legend & Info */}
      <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          Comprehensive Database Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="space-y-2">
            <p><strong>Total Entries:</strong> {stats?.totalEntries.toLocaleString() || '10,928'}</p>
            <p><strong>Unique Compounds:</strong> {stats?.totalCompounds.toLocaleString() || '701'}</p>
            <p><strong>Elements:</strong> {stats?.totalElements || 107} (including lanthanides)</p>
            <p><strong>Organic Compounds:</strong> {stats?.organicCount || 614} with SMILES</p>
          </div>
          <div className="space-y-2">
            <p><strong>Anions:</strong> {stats?.anions.join(', ')}</p>
            <p><strong>Sources:</strong> {stats?.sources.join(', ')}</p>
            <p><strong>Quality Levels:</strong> {stats?.qualities.join(', ')}</p>
            <p><strong>Temperature Range:</strong> 0-100°C</p>
          </div>
        </div>
      </div>
    </div>
  );
}
