/**
 * Stability Constant Component
 * Interactive periodic table focused on metal-ligand stability constants from NIST SRD 46 database
 * Features: Hierarchical ligand filtering, debounced search, Kd conversion
 * OPTIMIZED VERSION - Performance improvements with memoization, pre-indexing, and score-based filtering
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TestTube2, Info, Search, Loader2 } from 'lucide-react';
import { elements } from '@/data/elements';
import Fuse from 'fuse.js';

// Define the structure of stability constant data
interface StabilityRecord {
  element: string;
  metalIon: string;
  ligandName: string;
  ligandFormula: string;
  ligandClass: string;
  stabilityConstant: number;
  temperature: number;
  ionicStrength: number;
  error: string;
  constantType: string;
  betaDefinition: string;
  refCode: string;
  reference: string;
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current); // Add the last field
  return result;
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

// Constant type explanations
const CONSTANT_TYPE_INFO: { [key: string]: string } = {
  'K': 'Equilibrium constant (formation constant)',
  'H': 'Protonation constant',
  '*': 'Special or mixed constant',
  'S': 'Solubility product'
};

interface StabilityConstantProps {
  hideHeader?: boolean;
}

export default function StabilityConstant({ hideHeader = false }: StabilityConstantProps = {}) {
  const [stabilityData, setStabilityData] = useState<StabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedLigandClass, setSelectedLigandClass] = useState<string>('All');
  const [selectedSpecificLigand, setSelectedSpecificLigand] = useState<string>('All');
  const [ligandSearchText, setLigandSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(25);
  const [constantType, setConstantType] = useState<string>('All');
  const [betaDefinitionFilter, setBetaDefinitionFilter] = useState<string>('All');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showKd, setShowKd] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [fuzzyMatchCount, setFuzzyMatchCount] = useState<number>(0);
  const [selectedSearchLigand, setSelectedSearchLigand] = useState<string>('All');

  // Debounce search text to avoid filtering on every keystroke
  useEffect(() => {
    if (ligandSearchText !== debouncedSearchText) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedSearchText(ligandSearchText);
      setIsSearching(false);
    }, 300); // 300ms debounce for better responsiveness

    return () => clearTimeout(timer);
  }, [ligandSearchText, debouncedSearchText]);

  // Reset filters to default
  const resetFilters = () => {
    setSelectedLigandClass('All');
    setSelectedSpecificLigand('All');
    setLigandSearchText('');
    setDebouncedSearchText('');
    setSelectedSearchLigand('All');
    setTemperature(25);
    setConstantType('All');
    setBetaDefinitionFilter('All');
  };

  // Available ligand classes, constant types, and beta definitions
  const [availableLigandClasses, setAvailableLigandClasses] = useState<string[]>([]);
  const [availableConstantTypes, setAvailableConstantTypes] = useState<string[]>([]);
  const [availableBetaDefinitions, setAvailableBetaDefinitions] = useState<string[]>([]);

  // OPTIMIZATION 1: Pre-index data by element on load (reduces filtering from 722k to ~few thousand per element)
  const dataByElement = useMemo(() => {
    if (stabilityData.length === 0) return new Map<string, StabilityRecord[]>();

    const map = new Map<string, StabilityRecord[]>();
    stabilityData.forEach(record => {
      if (!map.has(record.element)) {
        map.set(record.element, []);
      }
      map.get(record.element)!.push(record);
    });

    console.log(`Pre-indexed data: ${map.size} elements with ${stabilityData.length} total records`);
    return map;
  }, [stabilityData]);

  // Create unique ligand list for efficient searching (instead of searching all 722k records)
  const uniqueLigands = useMemo(() => {
    if (stabilityData.length === 0) return [];

    const ligandSet = new Set<string>();
    stabilityData.forEach(record => {
      if (record.ligandName) {
        ligandSet.add(record.ligandName);
      }
    });

    const uniqueList = Array.from(ligandSet).map(name => ({ name }));
    console.log(`Created unique ligand list: ${uniqueList.length} unique ligands (from ${stabilityData.length} total records)`);
    return uniqueList;
  }, [stabilityData]);

  // Create Fuse instance for fuzzy searching - only searches unique ligands (much faster!)
  const fuse = useMemo(() => {
    if (uniqueLigands.length === 0) return null;

    return new Fuse(uniqueLigands, {
      keys: ['name'],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      distance: 100,
      shouldSort: true,
    });
  }, [uniqueLigands]);

  // OPTIMIZATION 2: Memoize fuzzy-matched ligands with score-based filtering
  // This prevents re-running the Fuse.js search for every element on every render
  const fuzzyMatchedLigands = useMemo<Set<string>>(() => {
    if (!fuse || !debouncedSearchText || debouncedSearchText.length < 2) {
      setFuzzyMatchCount(0);
      return new Set();
    }

    console.log(`Running fuzzy search for: "${debouncedSearchText}"`);
    // Use score-based filtering for quality matches
    const results = fuse.search(debouncedSearchText);
    const SCORE_THRESHOLD = 0.5; // Only include matches with score < 0.5 (lower is better, stricter)
    const matches = new Set(
      results
        .filter(result => result.score! < SCORE_THRESHOLD)
        .map(result => result.item.name)
    );

    console.log(`Found ${matches.size} quality fuzzy matches (score < ${SCORE_THRESHOLD})`);
    setFuzzyMatchCount(matches.size);
    return matches;
  }, [fuse, debouncedSearchText]);

  // Reset selected search ligand when search changes
  useEffect(() => {
    if (!debouncedSearchText || debouncedSearchText.length < 2) {
      setSelectedSearchLigand('All');
    } else if (selectedSearchLigand !== 'All' && !fuzzyMatchedLigands.has(selectedSearchLigand)) {
      setSelectedSearchLigand('All');
    }
  }, [debouncedSearchText, fuzzyMatchedLigands, selectedSearchLigand]);

  // Create sorted array of matched ligand names for dropdown display (limit to 100 for usability)
  const fuzzyMatchedLigandNames = useMemo<string[]>(() => {
    const sortedLigands = Array.from(fuzzyMatchedLigands).sort();
    const limited = sortedLigands.slice(0, 100);
    return ['All', ...limited];
  }, [fuzzyMatchedLigands]);

  // Load and parse CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/nist_stability_constants.csv.gz');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Decompress gzipped data
        const blob = await response.blob();
        const ds = new DecompressionStream('gzip');
        const decompressedStream = blob.stream().pipeThrough(ds);
        const decompressedBlob = await new Response(decompressedStream).blob();
        const text = await decompressedBlob.text();
        const lines = text.split('\n').slice(1); // Skip header
        const records: StabilityRecord[] = [];
        const classesSet = new Set<string>();
        const typesSet = new Set<string>();
        const betaSet = new Set<string>();

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = parseCSVLine(line);
          if (parts.length < 13) continue; // Now we have 13 fields

          const temp = parseFloat(parts[6]);
          const ionic = parseFloat(parts[7]);
          const constant = parseFloat(parts[5]);

          if (isNaN(constant)) continue;

          const record: StabilityRecord = {
            element: parts[0].trim(),
            metalIon: parts[1].trim(),
            ligandName: parts[2].trim(),
            ligandFormula: parts[3].trim(),
            ligandClass: parts[4].trim() || 'Uncategorized',
            stabilityConstant: constant,
            temperature: isNaN(temp) ? 25 : temp,
            ionicStrength: isNaN(ionic) ? 0 : ionic,
            error: parts[8].trim(),
            constantType: parts[9].trim(),
            betaDefinition: parts[10].trim(),
            refCode: parts[11].trim(),
            reference: parts[12].trim()
          };

          records.push(record);
          if (record.ligandClass) classesSet.add(record.ligandClass);
          if (record.constantType) typesSet.add(record.constantType);
          if (record.betaDefinition) betaSet.add(record.betaDefinition);
        }

        console.log(`Loaded ${records.length} stability constant records`);
        console.log(`Available elements:`, [...new Set(records.map(r => r.element))].sort().join(', '));

        setStabilityData(records);
        setAvailableLigandClasses(['All', ...Array.from(classesSet).sort()]);
        setAvailableConstantTypes(['All', ...Array.from(typesSet).sort()]);
        setAvailableBetaDefinitions(['All', ...Array.from(betaSet).filter(b => b).sort().slice(0, 50)]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading stability constant data:', err);
        setError(`Failed to load stability constant data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // OPTIMIZATION 3: Memoize filtered data by element
  // This creates a Map of element -> filtered records, calculated only when dependencies change
  const elementStabilityMap = useMemo<Map<string, StabilityRecord[]>>(() => {
    console.log('Recalculating element stability map...');
    const map = new Map<string, StabilityRecord[]>();

    // Iterate through pre-indexed data by element (much faster than all records!)
    dataByElement.forEach((records, element) => {
      const filtered = records.filter(record => {
        // Apply filters
        let matches = true;

        // If using search with a specific ligand selected from search results
        if (debouncedSearchText && selectedSearchLigand !== 'All') {
          const matchesSearch = record.ligandName === selectedSearchLigand;
          const matchesType = constantType === 'All' || record.constantType === constantType;
          const matchesBeta = betaDefinitionFilter === 'All' || record.betaDefinition === betaDefinitionFilter;
          const matchesTemp = Math.abs(record.temperature - temperature) <= 5; // Within 5°C
          matches = matchesSearch && matchesType && matchesBeta && matchesTemp;
        }
        // If using search but no specific ligand selected yet (show nothing until user selects)
        else if (debouncedSearchText && fuzzyMatchedLigands.size > 0) {
          matches = false; // Don't show any results until user selects a ligand
        }
        // Otherwise use dropdown selections (class/specific ligand)
        else {
          const matchesClass = selectedLigandClass === 'All' || record.ligandClass === selectedLigandClass;
          const matchesSpecific = selectedSpecificLigand === 'All' || record.ligandName === selectedSpecificLigand;
          const matchesType = constantType === 'All' || record.constantType === constantType;
          const matchesBeta = betaDefinitionFilter === 'All' || record.betaDefinition === betaDefinitionFilter;
          const matchesTemp = Math.abs(record.temperature - temperature) <= 5; // Within 5°C
          matches = matchesClass && matchesSpecific && matchesType && matchesBeta && matchesTemp;
        }

        return matches;
      });

      if (filtered.length > 0) {
        map.set(element, filtered);
      }
    });

    console.log(`Element stability map created with ${map.size} elements (filtered from ${dataByElement.size} total)`);
    return map;
  }, [
    dataByElement,
    fuzzyMatchedLigands,
    debouncedSearchText,
    selectedSearchLigand,
    selectedLigandClass,
    selectedSpecificLigand,
    constantType,
    betaDefinitionFilter,
    temperature
  ]);

  // OPTIMIZATION 4: Memoize average stability calculations
  // This calculates the average stability for each element only once per filter change
  const elementAverageStability = useMemo<Map<string, number>>(() => {
    console.log('Calculating average stabilities...');
    const avgMap = new Map<string, number>();

    elementStabilityMap.forEach((records, element) => {
      if (records.length > 0) {
        const sum = records.reduce((acc, r) => acc + r.stabilityConstant, 0);
        avgMap.set(element, sum / records.length);
      }
    });

    console.log(`Average stabilities calculated for ${avgMap.size} elements`);
    return avgMap;
  }, [elementStabilityMap]);

  // Get available specific ligands based on selected class
  const getAvailableSpecificLigands = (): string[] => {
    if (selectedLigandClass === 'All') {
      return ['All'];
    }

    const filtered = stabilityData.filter(record =>
      record.ligandClass === selectedLigandClass
    );

    const ligandSet = new Set(filtered.map(r => r.ligandName).filter(name => name));
    return ['All', ...Array.from(ligandSet).sort()];
  };

  // Get filtered beta definitions based on current ligand selection
  const getFilteredBetaDefinitions = () => {
    if (selectedLigandClass === 'All' && selectedSpecificLigand === 'All' && !debouncedSearchText) {
      return availableBetaDefinitions;
    }

    // Use pre-indexed data for faster filtering
    const filtered: StabilityRecord[] = [];
    dataByElement.forEach((records) => {
      records.forEach(record => {
        // If using search with a specific ligand selected
        if (debouncedSearchText && selectedSearchLigand !== 'All') {
          if (record.ligandName === selectedSearchLigand) {
            filtered.push(record);
          }
        }
        // If using search but no specific ligand selected yet
        else if (debouncedSearchText && fuzzyMatchedLigands.size > 0) {
          // Don't include anything until user selects a ligand
        }
        // Otherwise use class/specific ligand
        else {
          const matchesClass = selectedLigandClass === 'All' || record.ligandClass === selectedLigandClass;
          const matchesSpecific = selectedSpecificLigand === 'All' || record.ligandName === selectedSpecificLigand;
          if (matchesClass && matchesSpecific) {
            filtered.push(record);
          }
        }
      });
    });

    const betaSet = new Set(filtered.map(r => r.betaDefinition).filter(b => b));
    return ['All', ...Array.from(betaSet).sort().slice(0, 50)];
  };

  // OPTIMIZATION 5: Optimized function to get stability for an element (now just a lookup!)
  const getStabilityForElement = useCallback((elementSymbol: string): number | null => {
    return elementAverageStability.get(elementSymbol) ?? null;
  }, [elementAverageStability]);

  // Convert log K to Kd (dissociation constant in M)
  const convertToKd = (logK: number): string => {
    // Kd = 1/Ka = 10^(-logK)
    const kd = Math.pow(10, -logK);
    if (kd < 1e-15) return kd.toExponential(2);
    if (kd < 1e-6) return (kd * 1e9).toFixed(2) + ' nM';
    if (kd < 1e-3) return (kd * 1e6).toFixed(2) + ' μM';
    if (kd < 1) return (kd * 1e3).toFixed(2) + ' mM';
    return kd.toFixed(2) + ' M';
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <TestTube2 className="w-7 h-7" />
              Stability Constants - Interactive Periodic Table
            </h2>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              {showInfo ? 'Hide' : 'Show'} Info
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Explore metal-ligand stability constants from the NIST SRD 46 database. Filter by ligand class, then select specific ligands from that class, or use text search. Adjust temperature (±5°C tolerance) and filter by equilibrium type. Colors dynamically update based on average log K values - elements without data for the selected conditions appear gray.
          </p>
          {stabilityData.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Loaded {stabilityData.length.toLocaleString()} data points for {[...new Set(stabilityData.map(r => r.element))].length} elements • Data from NIST Critically Selected Stability Constants of Metal Complexes
            </p>
          )}

          {/* Info Panel */}
          {showInfo && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Understanding Constant Types:</h4>
              <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>K</strong> - Equilibrium/formation constant: M + L ⇌ ML (Ka = [ML]/[M][L])</li>
                <li><strong>H</strong> - Protonation constant: HL ⇌ H<sup>+</sup> + L<sup>-</sup></li>
                <li><strong>*</strong> - Special or mixed constant (see beta definition)</li>
                <li><strong>S</strong> - Solubility product</li>
              </ul>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-3">
                <strong>log K vs Kd:</strong> log K (stability constant) measures complex formation strength. Higher log K = more stable complex.
                Kd (dissociation constant) = 1/Ka = 10<sup>-logK</sup>. Lower Kd = stronger binding.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Control Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Filters
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKd(!showKd)}
              className="btn-secondary text-sm"
            >
              Show {showKd ? 'log K' : 'Kd'}
            </button>
            <button
              onClick={resetFilters}
              className="btn-secondary text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ligand Class Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ligand Class
            </label>
            <select
              value={selectedLigandClass}
              onChange={(e) => {
                setSelectedLigandClass(e.target.value);
                setSelectedSpecificLigand('All'); // Reset specific ligand when class changes
                setLigandSearchText(''); // Clear search when using dropdown
                setDebouncedSearchText(''); // Clear debounced search too
                setBetaDefinitionFilter('All'); // Reset beta filter when class changes
              }}
              className="input-field w-full text-sm"
            >
              {availableLigandClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Specific Ligand Filter - Only show when a class is selected */}
          {selectedLigandClass !== 'All' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Specific Ligand
              </label>
              <select
                value={selectedSpecificLigand}
                onChange={(e) => {
                  setSelectedSpecificLigand(e.target.value);
                  setLigandSearchText(''); // Clear search when using dropdown
                  setDebouncedSearchText(''); // Clear debounced search too
                  setBetaDefinitionFilter('All'); // Reset beta filter when ligand changes
                }}
                className="input-field w-full text-sm"
              >
                {getAvailableSpecificLigands().map(ligand => (
                  <option key={ligand} value={ligand}>
                    {ligand.length > 50 ? ligand.substring(0, 50) + '...' : ligand}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ligand Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search Ligand Name {isSearching && <span className="text-xs text-slate-500">(searching...)</span>}
            </label>
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <input
                type="text"
                value={ligandSearchText}
                onChange={(e) => {
                  setLigandSearchText(e.target.value);
                  // Clear dropdown selections when using search
                  if (e.target.value) {
                    setSelectedLigandClass('All');
                    setSelectedSpecificLigand('All');
                  }
                  setBetaDefinitionFilter('All'); // Reset beta filter when search changes
                }}
                placeholder="Type 2+ chars (e.g., glycine, EDTA, glysine)..."
                className="input-field w-full pl-10 text-sm"
              />
            </div>
            {/* Search result count feedback */}
            {debouncedSearchText && debouncedSearchText.length >= 2 && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {fuzzyMatchCount > 0 ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Found {fuzzyMatchCount} ligand{fuzzyMatchCount !== 1 ? 's' : ''} matching "{debouncedSearchText}"
                    {fuzzyMatchCount > 100 && ' (showing top 100)'} - select one below
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    No ligands found matching "{debouncedSearchText}" - try a different search
                  </span>
                )}
              </p>
            )}
            {!debouncedSearchText && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fuzzy search (min. 2 characters) - try misspellings!
              </p>
            )}
          </div>

          {/* Search Results Dropdown - shown when search has results */}
          {debouncedSearchText && fuzzyMatchCount > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Ligand from Search Results
              </label>
              <select
                value={selectedSearchLigand}
                onChange={(e) => setSelectedSearchLigand(e.target.value)}
                className="input-field w-full text-sm"
                size={Math.min(fuzzyMatchedLigandNames.length, 8)}
              >
                {fuzzyMatchedLigandNames.map(ligand => (
                  <option key={ligand} value={ligand}>
                    {ligand === 'All' ? 'Select a ligand...' : (ligand.length > 60 ? ligand.substring(0, 60) + '...' : ligand)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {fuzzyMatchCount > 100
                  ? `Showing top 100 results (${fuzzyMatchCount} total found). Try a more specific search for better results.`
                  : 'Choose a specific ligand to see which elements have data for it'}
              </p>
            </div>
          )}

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
                <option key={type} value={type}>
                  {type} {type !== 'All' && CONSTANT_TYPE_INFO[type] ? `- ${CONSTANT_TYPE_INFO[type]}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Equilibrium/Beta Definition Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Equilibrium Type
            </label>
            <select
              value={betaDefinitionFilter}
              onChange={(e) => setBetaDefinitionFilter(e.target.value)}
              className="input-field w-full text-xs"
            >
              {getFilteredBetaDefinitions().map((beta, idx) => (
                <option key={idx} value={beta}>
                  {beta === 'All' ? 'All' : (beta.length > 60 ? beta.substring(0, 60) + '...' : beta)}
                </option>
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
        // OPTIMIZATION 6: Get pre-filtered data from the memoized map
        const elementRecords = elementStabilityMap.get(selectedElement) || [];

        // Sort and limit for display
        const elementData = elementRecords
          .sort((a, b) => b.stabilityConstant - a.stabilityConstant)
          .slice(0, 100); // Limit to top 100 for performance

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Stability Constants for {selectedElement}
                {elementData.length > 0 && (
                  <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-2">
                    (showing top 100 of {elementRecords.length} filtered records)
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
                <p className="text-sm">Try adjusting your filters (ligand class, search, or constant type)</p>
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
                        Class
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Formula
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {showKd ? 'Kd' : 'log K'}
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {elementData.map((record, idx) => {
                      const refDisplay = record.refCode && record.reference
                        ? `[${record.refCode}] ${record.reference}`
                        : (record.reference || 'N/A');

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                            {record.metalIon}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100 max-w-xs truncate" title={record.ligandName}>
                            {record.ligandName}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300">
                            {record.ligandClass}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                            {record.ligandFormula}
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {showKd ? convertToKd(record.stabilityConstant) : record.stabilityConstant.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                            {record.temperature || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                            {record.ionicStrength || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100" title={CONSTANT_TYPE_INFO[record.constantType]}>
                            {record.constantType}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300 max-w-md" title={refDisplay}>
                            <div className="truncate">{refDisplay}</div>
                          </td>
                        </tr>
                      );
                    })}
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
