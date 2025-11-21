/**
 * Stability Constant Component
 * Interactive periodic table focused on metal-ligand stability constants from NIST SRD 46 database
 * Features: Hierarchical ligand filtering, debounced search, Kd conversion
 * OPTIMIZED VERSION - Performance improvements with memoization, pre-indexing, and score-based filtering
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TestTube2, Info, Search, Loader2, BarChart3, X } from 'lucide-react';
import { elements } from '@/data/elements';

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
  const [ionicStrengthFilter, setIonicStrengthFilter] = useState<number | null>(null);
  const [constantType, setConstantType] = useState<string>('All');
  const [betaDefinitionFilter, setBetaDefinitionFilter] = useState<string>('All');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showKd, setShowKd] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [fuzzyMatchCount, setFuzzyMatchCount] = useState<number>(0);
  const [selectedSearchLigand, setSelectedSearchLigand] = useState<string>('All');

  // Comparison mode states
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [comparisonType, setComparisonType] = useState<'elements' | 'ligands' | 'conditions'>('elements');
  const [selectedElementsForComparison, setSelectedElementsForComparison] = useState<string[]>([]);
  const [selectedLigandsForComparison, setSelectedLigandsForComparison] = useState<string[]>([]);
  const [comparisonLigand, setComparisonLigand] = useState<string>(''); // Single ligand when comparing elements
  const [comparisonElement, setComparisonElement] = useState<string>(''); // Single element when comparing ligands
  const [comparisonLigandSearch, setComparisonLigandSearch] = useState<string>(''); // Search for ligands in comparison
  const [selectedConditionsForComparison, setSelectedConditionsForComparison] = useState<string[]>([]); // For conditions mode
  const [comparisonPlotType, setComparisonPlotType] = useState<'bar' | 'scatter'>('bar');
  const [showAllConditions, setShowAllConditions] = useState<boolean>(false); // Show all conditions in elements mode
  const [showReference, setShowReference] = useState<boolean>(true); // Show reference line in scatter when same conditions

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
    setIonicStrengthFilter(null);
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

  // Simple substring search (like original repo's Pos() function)
  // Searches unique ligand names for substring match (case-insensitive)
  const matchedLigands = useMemo<Set<string>>(() => {
    if (!debouncedSearchText || debouncedSearchText.length < 2 || uniqueLigands.length === 0) {
      setFuzzyMatchCount(0);
      return new Set();
    }

    const searchLower = debouncedSearchText.toLowerCase();
    console.log(`Running substring search for: "${debouncedSearchText}"`);

    // Find ligands containing the search text (case-insensitive substring match)
    const matches = new Set(
      uniqueLigands
        .filter(ligand => ligand.name.toLowerCase().includes(searchLower))
        .map(ligand => ligand.name)
    );

    console.log(`Found ${matches.size} ligands containing "${debouncedSearchText}"`);
    setFuzzyMatchCount(matches.size);
    return matches;
  }, [uniqueLigands, debouncedSearchText]);

  // Reset selected search ligand when search changes
  useEffect(() => {
    if (!debouncedSearchText || debouncedSearchText.length < 2) {
      setSelectedSearchLigand('All');
    } else if (selectedSearchLigand !== 'All' && !matchedLigands.has(selectedSearchLigand)) {
      setSelectedSearchLigand('All');
    }
  }, [debouncedSearchText, matchedLigands, selectedSearchLigand]);

  // Create sorted array of matched ligand names for inline display (limit to 50 for usability)
  const matchedLigandNames = useMemo<string[]>(() => {
    const sortedLigands = Array.from(matchedLigands).sort();
    const limited = sortedLigands.slice(0, 50);
    return limited;
  }, [matchedLigands]);

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
        // Common filters
        const matchesType = constantType === 'All' || record.constantType === constantType;
        const matchesBeta = betaDefinitionFilter === 'All' || record.betaDefinition === betaDefinitionFilter;
        const matchesTemp = Math.abs(record.temperature - temperature) <= 5; // Within 5°C
        const matchesIonic = ionicStrengthFilter === null || record.ionicStrength === ionicStrengthFilter;

        if (debouncedSearchText && selectedSearchLigand !== 'All') {
          const matchesSearch = record.ligandName === selectedSearchLigand;
          matches = matchesSearch && matchesType && matchesBeta && matchesTemp && matchesIonic;
        }
        // If using search but no specific ligand selected yet (show nothing until user selects)
        else if (debouncedSearchText && matchedLigands.size > 0) {
          matches = false; // Don't show any results until user selects a ligand
        }
        // Otherwise use dropdown selections (class/specific ligand)
        else {
          const matchesClass = selectedLigandClass === 'All' || record.ligandClass === selectedLigandClass;
          const matchesSpecific = selectedSpecificLigand === 'All' || record.ligandName === selectedSpecificLigand;
          matches = matchesClass && matchesSpecific && matchesType && matchesBeta && matchesTemp && matchesIonic;
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
    matchedLigands,
    debouncedSearchText,
    selectedSearchLigand,
    selectedLigandClass,
    selectedSpecificLigand,
    constantType,
    betaDefinitionFilter,
    temperature,
    ionicStrengthFilter
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
        else if (debouncedSearchText && matchedLigands.size > 0) {
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

  // Get available ionic strengths based on current ligand selection
  const getAvailableIonicStrengths = (): number[] => {
    const filtered: StabilityRecord[] = [];
    dataByElement.forEach((records) => {
      records.forEach(record => {
        if (debouncedSearchText && selectedSearchLigand !== 'All') {
          if (record.ligandName === selectedSearchLigand) {
            filtered.push(record);
          }
        } else if (debouncedSearchText && matchedLigands.size > 0) {
          // Don't include anything until user selects a ligand
        } else {
          const matchesClass = selectedLigandClass === 'All' || record.ligandClass === selectedLigandClass;
          const matchesSpecific = selectedSpecificLigand === 'All' || record.ligandName === selectedSpecificLigand;
          if (matchesClass && matchesSpecific) {
            filtered.push(record);
          }
        }
      });
    });

    const ionicSet = new Set(filtered.map(r => r.ionicStrength));
    return Array.from(ionicSet).sort((a, b) => a - b);
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

  // Get comparison data for chart
  const comparisonData = useMemo(() => {
    if (!comparisonMode) return [];

    interface ComparisonItem {
      label: string;
      logK: number | null;
      kd: number | null;
      details: string;
      subLabel?: string;
      condition?: string; // For grouping in scatter plot
      element?: string; // For grouping
      constantType?: string; // Equilibrium type (K1, β2, etc.)
    }

    const results: ComparisonItem[] = [];

    if (comparisonType === 'elements' && comparisonLigand && selectedElementsForComparison.length > 0) {
      if (showAllConditions) {
        // Show ALL data points for each element, grouped by condition
        selectedElementsForComparison.forEach(element => {
          const records = dataByElement.get(element) || [];
          const matching = records.filter(r => r.ligandName === comparisonLigand);
          if (matching.length > 0) {
            matching.forEach(record => {
              const condition = `T=${record.temperature}°C, I=${record.ionicStrength}M`;
              results.push({
                label: element,
                logK: record.stabilityConstant,
                kd: Math.pow(10, -record.stabilityConstant),
                details: `${record.constantType}, ${condition}`,
                subLabel: record.metalIon,
                condition: condition,
                element: element,
                constantType: record.constantType
              });
            });
          } else {
            results.push({
              label: element,
              logK: null,
              kd: null,
              details: 'No data',
              element: element
            });
          }
        });
      } else {
        // Single best match per element - progressively relax filters
        selectedElementsForComparison.forEach(element => {
          const records = dataByElement.get(element) || [];

          // First: just filter by ligand name (most permissive)
          let matching = records.filter(r => r.ligandName === comparisonLigand);

          // If we have data, try to find best match with filters
          if (matching.length > 0) {
            // Try with all filters
            let filtered = matching.filter(r =>
              (constantType === 'All' || r.constantType === constantType) &&
              (ionicStrengthFilter === null || r.ionicStrength === ionicStrengthFilter) &&
              Math.abs(r.temperature - temperature) <= 5
            );
            // If no match, try without temp filter
            if (filtered.length === 0) {
              filtered = matching.filter(r =>
                (constantType === 'All' || r.constantType === constantType) &&
                (ionicStrengthFilter === null || r.ionicStrength === ionicStrengthFilter)
              );
            }
            // If still no match, try without ionic filter
            if (filtered.length === 0) {
              filtered = matching.filter(r =>
                (constantType === 'All' || r.constantType === constantType)
              );
            }
            // If still no match, use all matching records
            if (filtered.length === 0) {
              filtered = matching;
            }

            const best = filtered.sort((a, b) =>
              Math.abs(a.temperature - temperature) - Math.abs(b.temperature - temperature)
            )[0];
            results.push({
              label: element,
              logK: best.stabilityConstant,
              kd: Math.pow(10, -best.stabilityConstant),
              details: `${best.constantType}, T=${best.temperature}°C, I=${best.ionicStrength}M`,
              subLabel: best.metalIon,
              element: element,
              constantType: best.constantType
            });
          } else {
            results.push({
              label: element,
              logK: null,
              kd: null,
              details: 'No data for this ligand',
              element: element
            });
          }
        });
      }
    } else if (comparisonType === 'ligands' && comparisonElement && selectedLigandsForComparison.length > 0) {
      // Compare different ligands with same element - progressively relax filters
      const records = dataByElement.get(comparisonElement) || [];
      selectedLigandsForComparison.forEach(ligand => {
        // First: just filter by ligand name
        let matching = records.filter(r => r.ligandName === ligand);

        if (matching.length > 0) {
          // Try with all filters
          let filtered = matching.filter(r =>
            (constantType === 'All' || r.constantType === constantType) &&
            (ionicStrengthFilter === null || r.ionicStrength === ionicStrengthFilter) &&
            Math.abs(r.temperature - temperature) <= 5
          );
          if (filtered.length === 0) {
            filtered = matching.filter(r =>
              (constantType === 'All' || r.constantType === constantType) &&
              (ionicStrengthFilter === null || r.ionicStrength === ionicStrengthFilter)
            );
          }
          if (filtered.length === 0) {
            filtered = matching.filter(r =>
              (constantType === 'All' || r.constantType === constantType)
            );
          }
          if (filtered.length === 0) {
            filtered = matching;
          }

          const best = filtered.sort((a, b) =>
            Math.abs(a.temperature - temperature) - Math.abs(b.temperature - temperature)
          )[0];
          results.push({
            label: ligand.length > 25 ? ligand.substring(0, 25) + '...' : ligand,
            logK: best.stabilityConstant,
            kd: Math.pow(10, -best.stabilityConstant),
            details: `${best.constantType}, T=${best.temperature}°C, I=${best.ionicStrength}M`,
            constantType: best.constantType
          });
        } else {
          results.push({
            label: ligand.length > 25 ? ligand.substring(0, 25) + '...' : ligand,
            logK: null,
            kd: null,
            details: 'No data for this ligand'
          });
        }
      });
    } else if (comparisonType === 'conditions' && comparisonElement && comparisonLigand && selectedConditionsForComparison.length > 0) {
      // Compare same element + ligand at selected conditions
      const records = dataByElement.get(comparisonElement) || [];
      selectedConditionsForComparison.forEach(condition => {
        // Parse condition string "T=25°C, I=0.1M"
        const tempMatch = condition.match(/T=(\d+)/);
        const ionicMatch = condition.match(/I=([\d.]+)/);
        const temp = tempMatch ? parseFloat(tempMatch[1]) : null;
        const ionic = ionicMatch ? parseFloat(ionicMatch[1]) : null;

        const matching = records.filter(r =>
          r.ligandName === comparisonLigand &&
          (temp === null || r.temperature === temp) &&
          (ionic === null || r.ionicStrength === ionic)
        );

        if (matching.length > 0) {
          const record = matching[0];
          results.push({
            label: condition,
            logK: record.stabilityConstant,
            kd: Math.pow(10, -record.stabilityConstant),
            details: record.constantType + (record.betaDefinition ? ` (${record.betaDefinition})` : ''),
            constantType: record.constantType
          });
        } else {
          results.push({
            label: condition,
            logK: null,
            kd: null,
            details: 'No data'
          });
        }
      });
    }

    // Preserve user input order (don't sort)
    return results;
  }, [comparisonMode, comparisonType, comparisonLigand, comparisonElement,
      selectedElementsForComparison, selectedLigandsForComparison, selectedConditionsForComparison,
      dataByElement, temperature, constantType, ionicStrengthFilter, showAllConditions]);

  // Get available ligands for a set of elements (union - allow partial matches)
  const getAvailableLigands = useCallback((elementList: string[], searchFilter?: string): string[] => {
    if (elementList.length === 0) return [];

    // Get union of all ligands (not intersection)
    const allLigands = new Set<string>();
    elementList.forEach(el => {
      const records = dataByElement.get(el) || [];
      records.forEach(r => allLigands.add(r.ligandName));
    });

    let result = Array.from(allLigands).sort();

    // Apply search filter if provided
    if (searchFilter && searchFilter.length >= 2) {
      const searchLower = searchFilter.toLowerCase();
      result = result.filter(lig => lig.toLowerCase().includes(searchLower));
    }

    return result;
  }, [dataByElement]);

  // Get available conditions for element+ligand pair
  const getAvailableConditions = useCallback((element: string, ligand: string): { key: string; count: number }[] => {
    if (!element || !ligand) return [];

    const records = dataByElement.get(element) || [];
    const matching = records.filter(r => r.ligandName === ligand);

    // Group by condition
    const conditionCounts = new Map<string, number>();
    matching.forEach(r => {
      const key = `T=${r.temperature}°C, I=${r.ionicStrength}M`;
      conditionCounts.set(key, (conditionCounts.get(key) || 0) + 1);
    });

    // Sort by count (most data first)
    return Array.from(conditionCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [dataByElement]);

  // Get ligands for single element with search filter
  const getElementLigands = useCallback((element: string, searchFilter?: string): string[] => {
    if (!element) return [];

    const records = dataByElement.get(element) || [];
    const ligands = [...new Set(records.map(r => r.ligandName))].sort();

    if (searchFilter && searchFilter.length >= 2) {
      const searchLower = searchFilter.toLowerCase();
      return ligands.filter(lig => lig.toLowerCase().includes(searchLower));
    }

    return ligands;
  }, [dataByElement]);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`btn-secondary text-sm flex items-center gap-2 ${comparisonMode ? 'bg-primary-100 dark:bg-primary-900' : ''}`}
              >
                <BarChart3 className="w-4 h-4" />
                {comparisonMode ? 'Exit Compare' : 'Compare'}
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Info className="w-4 h-4" />
                {showInfo ? 'Hide' : 'Show'} Info
              </button>
            </div>
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
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`btn-secondary text-sm flex items-center gap-2 ${comparisonMode ? 'bg-primary-100 dark:bg-primary-900' : ''}`}
            >
              <BarChart3 className="w-4 h-4" />
              {comparisonMode ? 'Exit Compare' : 'Compare'}
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

          {/* Ligand Search - with inline collapsing results */}
          <div className="lg:col-span-2">
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
                placeholder="Type 2+ chars (e.g., glycine, EDTA)..."
                className="input-field w-full pl-10 text-sm"
              />
            </div>
            {/* Inline search results - collapses down below input */}
            {debouncedSearchText && debouncedSearchText.length >= 2 && (
              <div className="mt-2">
                {fuzzyMatchCount > 0 ? (
                  <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                      {fuzzyMatchCount} result{fuzzyMatchCount !== 1 ? 's' : ''} for "{debouncedSearchText}"
                      {fuzzyMatchCount > 50 && ' (showing first 50)'}
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {matchedLigandNames.map(ligand => (
                        <button
                          key={ligand}
                          onClick={() => setSelectedSearchLigand(ligand)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-primary-100 dark:hover:bg-primary-900 border-b border-slate-200 dark:border-slate-700 last:border-b-0 ${
                            selectedSearchLigand === ligand ? 'bg-primary-200 dark:bg-primary-800 font-medium' : ''
                          }`}
                        >
                          {ligand.length > 60 ? ligand.substring(0, 60) + '...' : ligand}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No ligands found containing "{debouncedSearchText}"
                  </p>
                )}
              </div>
            )}
            {!debouncedSearchText && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Substring search (min. 2 characters)
              </p>
            )}
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

          {/* Ionic Strength Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ionic Strength (M)
            </label>
            <select
              value={ionicStrengthFilter === null ? 'All' : ionicStrengthFilter.toString()}
              onChange={(e) => {
                const val = e.target.value;
                setIonicStrengthFilter(val === 'All' ? null : parseFloat(val));
              }}
              className="input-field w-full text-sm"
            >
              <option value="All">All</option>
              {getAvailableIonicStrengths().map(ionic => (
                <option key={ionic} value={ionic.toString()}>
                  {ionic}
                </option>
              ))}
            </select>
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

      {/* Comparison Panel */}
      {comparisonMode && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Comparison Mode
            </h3>
            <button onClick={() => setComparisonMode(false)} className="btn-secondary text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comparison Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Compare:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setComparisonType('elements');
                  setSelectedLigandsForComparison([]);
                }}
                className={`px-3 py-1 text-sm rounded ${comparisonType === 'elements' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                Different Elements
              </button>
              <button
                onClick={() => {
                  setComparisonType('ligands');
                  setSelectedElementsForComparison([]);
                }}
                className={`px-3 py-1 text-sm rounded ${comparisonType === 'ligands' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                Different Ligands
              </button>
              <button
                onClick={() => {
                  setComparisonType('conditions');
                  setSelectedElementsForComparison([]);
                  setSelectedLigandsForComparison([]);
                }}
                className={`px-3 py-1 text-sm rounded ${comparisonType === 'conditions' ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                Different Conditions
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {comparisonType === 'elements' && 'Compare how different metals bind to the same ligand'}
              {comparisonType === 'ligands' && 'Compare how different ligands bind to the same metal'}
              {comparisonType === 'conditions' && 'Compare same metal-ligand pair at different temperatures/ionic strengths'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {comparisonType === 'elements' && (
              <>
                {/* Select Elements */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Elements to Compare (click on periodic table)
                  </label>
                  <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border border-slate-300 dark:border-slate-600 rounded">
                    {selectedElementsForComparison.length === 0 ? (
                      <span className="text-sm text-slate-500">Click elements below...</span>
                    ) : (
                      selectedElementsForComparison.map(el => (
                        <span key={el} className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 rounded text-sm flex items-center gap-1">
                          {el}
                          <button onClick={() => setSelectedElementsForComparison(prev => prev.filter(e => e !== el))} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {/* Select Ligand with Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search & Select Ligand
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={comparisonLigandSearch}
                      onChange={(e) => setComparisonLigandSearch(e.target.value)}
                      placeholder="Search ligands..."
                      className="input-field w-full pl-10 text-sm"
                    />
                  </div>
                  <select
                    value={comparisonLigand}
                    onChange={(e) => setComparisonLigand(e.target.value)}
                    className="input-field w-full text-sm"
                    size={5}
                  >
                    <option value="">-- Select a ligand --</option>
                    {getAvailableLigands(selectedElementsForComparison, comparisonLigandSearch).slice(0, 100).map(lig => (
                      <option key={lig} value={lig}>{lig.length > 50 ? lig.substring(0, 50) + '...' : lig}</option>
                    ))}
                  </select>
                  {selectedElementsForComparison.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {getAvailableLigands(selectedElementsForComparison, comparisonLigandSearch).length} ligand(s) {comparisonLigandSearch ? 'matching' : 'available'}
                    </p>
                  )}
                </div>
              </>
            )}

            {comparisonType === 'ligands' && (
              <>
                {/* Select Element */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Element (click on periodic table)
                  </label>
                  <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border border-slate-300 dark:border-slate-600 rounded">
                    {!comparisonElement ? (
                      <span className="text-sm text-slate-500">Click an element below...</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 rounded text-sm flex items-center gap-1">
                        {comparisonElement}
                        <button onClick={() => setComparisonElement('')} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
                {/* Select Ligands with Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search & Add Ligands to Compare
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={comparisonLigandSearch}
                      onChange={(e) => setComparisonLigandSearch(e.target.value)}
                      placeholder="Search ligands..."
                      className="input-field w-full pl-10 text-sm"
                    />
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value && !selectedLigandsForComparison.includes(e.target.value)) {
                        setSelectedLigandsForComparison(prev => [...prev, e.target.value]);
                      }
                    }}
                    className="input-field w-full text-sm"
                    value=""
                    size={5}
                  >
                    <option value="">-- Click to add ligand --</option>
                    {getElementLigands(comparisonElement, comparisonLigandSearch).slice(0, 100).map(lig => (
                      <option key={lig} value={lig}>{lig.length > 50 ? lig.substring(0, 50) + '...' : lig}</option>
                    ))}
                  </select>
                  {comparisonElement && (
                    <p className="text-xs text-slate-500 mt-1">
                      {getElementLigands(comparisonElement, comparisonLigandSearch).length} ligand(s) available
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedLigandsForComparison.map(lig => (
                      <span key={lig} className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 rounded text-xs flex items-center gap-1">
                        {lig.length > 20 ? lig.substring(0, 20) + '...' : lig}
                        <button onClick={() => setSelectedLigandsForComparison(prev => prev.filter(l => l !== lig))} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {comparisonType === 'conditions' && (
              <>
                {/* Select Element */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Element (click on periodic table)
                  </label>
                  <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border border-slate-300 dark:border-slate-600 rounded">
                    {!comparisonElement ? (
                      <span className="text-sm text-slate-500">Click an element below...</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 rounded text-sm flex items-center gap-1">
                        {comparisonElement}
                        <button onClick={() => { setComparisonElement(''); setSelectedConditionsForComparison([]); }} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
                {/* Select Ligand with Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Search & Select Ligand
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={comparisonLigandSearch}
                      onChange={(e) => setComparisonLigandSearch(e.target.value)}
                      placeholder="Search ligands..."
                      className="input-field w-full pl-10 text-sm"
                    />
                  </div>
                  <select
                    value={comparisonLigand}
                    onChange={(e) => { setComparisonLigand(e.target.value); setSelectedConditionsForComparison([]); }}
                    className="input-field w-full text-sm"
                    size={5}
                  >
                    <option value="">-- Select a ligand --</option>
                    {getElementLigands(comparisonElement, comparisonLigandSearch).slice(0, 100).map(lig => (
                      <option key={lig} value={lig}>{lig.length > 50 ? lig.substring(0, 50) + '...' : lig}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Condition Selection for conditions mode */}
          {comparisonType === 'conditions' && comparisonElement && comparisonLigand && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Conditions to Compare
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {getAvailableConditions(comparisonElement, comparisonLigand).map(({ key, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedConditionsForComparison(prev =>
                        prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded border ${
                      selectedConditionsForComparison.includes(key)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {key} ({count})
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {selectedConditionsForComparison.length} condition(s) selected. Numbers in parentheses show data point count.
              </p>
            </div>
          )}

          {/* Chart Options */}
          {comparisonData.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-4">
              {/* Bar/Scatter toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Chart:</span>
                <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-600">
                  <button
                    onClick={() => setComparisonPlotType('bar')}
                    className={`px-3 py-1 text-sm ${comparisonPlotType === 'bar' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setComparisonPlotType('scatter')}
                    className={`px-3 py-1 text-sm ${comparisonPlotType === 'scatter' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-700'}`}
                  >
                    Scatter
                  </button>
                </div>
              </div>

              {/* Show all conditions (elements mode only) */}
              {comparisonType === 'elements' && comparisonLigand && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showAllConditions}
                    onChange={(e) => setShowAllConditions(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Show all conditions
                </label>
              )}

              {/* Reference toggle - show when not showing all conditions (same condition comparison) */}
              {comparisonPlotType === 'scatter' && !showAllConditions && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showReference}
                    onChange={(e) => setShowReference(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Show reference line
                </label>
              )}
            </div>
          )}

          {/* Comparison Chart */}
          {comparisonData.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-800 dark:text-slate-200">
                  Comparison Results ({showKd ? 'Kd' : 'log K'}) - {comparisonData.length} data points
                </h4>
                <button
                  onClick={() => setShowKd(!showKd)}
                  className="btn-secondary text-xs"
                >
                  Show {showKd ? 'log K' : 'Kd'}
                </button>
              </div>

              {/* Scatter Plot View */}
              {comparisonPlotType === 'scatter' ? (
                <div className={`relative bg-slate-100 dark:bg-slate-800 rounded-lg p-6 min-h-[300px] ${comparisonType === 'ligands' ? 'pb-24' : 'pb-12'}`}>
                  {(() => {
                    const validData = comparisonData.filter(d => d.logK !== null);
                    if (validData.length === 0) return <p className="text-center text-slate-500 py-8">No data</p>;

                    const maxLogK = Math.max(...validData.map(d => d.logK!));
                    const minLogK = Math.min(...validData.map(d => d.logK!));
                    const padding = (maxLogK - minLogK) * 0.1 || 1;
                    const yMax = maxLogK + padding;
                    const yMin = minLogK - padding;
                    const range = yMax - yMin || 1;

                    // Get x-axis labels based on comparison type
                    const xLabels = showAllConditions && comparisonType === 'elements'
                      ? selectedElementsForComparison.filter(el => validData.some(d => d.element === el))
                      : validData.map(d => d.label);
                    const uniqueXLabels = [...new Set(xLabels)];

                    const conditions = [...new Set(validData.map(d => d.condition))].filter(Boolean) as string[];
                    const hasSameCondition = conditions.length <= 1;
                    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#14b8a6', '#f97316'];

                    // Calculate average for reference line
                    const avgLogK = validData.reduce((sum, d) => sum + d.logK!, 0) / validData.length;

                    return (
                      <div className="flex h-full">
                        {/* Y-axis */}
                        <div className="w-12 flex flex-col justify-between text-xs text-slate-600 dark:text-slate-400 pr-2 py-2">
                          <span>{yMax.toFixed(1)}</span>
                          <span>{((yMax + yMin) / 2).toFixed(1)}</span>
                          <span>{yMin.toFixed(1)}</span>
                        </div>
                        {/* Plot area */}
                        <div className="flex-1 relative border-l border-b border-slate-400 dark:border-slate-500 min-h-[220px]">
                          {/* Grid lines */}
                          {[0.25, 0.5, 0.75].map(pct => (
                            <div
                              key={pct}
                              className="absolute w-full border-t border-slate-300 dark:border-slate-600 border-dashed"
                              style={{ top: `${pct * 100}%` }}
                            />
                          ))}
                          {/* Reference line (average) - shown when same conditions */}
                          {showReference && hasSameCondition && (
                            <>
                              <div
                                className="absolute w-full border-t-2 border-amber-500"
                                style={{ top: `${((yMax - avgLogK) / range) * 100}%` }}
                              />
                              <span
                                className="absolute text-xs text-amber-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 px-1"
                                style={{ top: `${((yMax - avgLogK) / range) * 100 - 3}%`, right: 0 }}
                              >
                                avg: {avgLogK.toFixed(2)}
                              </span>
                            </>
                          )}
                          {/* Vertical grid lines */}
                          {uniqueXLabels.map((_, i) => (
                            <div
                              key={i}
                              className="absolute h-full border-l border-slate-300 dark:border-slate-600 border-dashed"
                              style={{ left: `${((i + 1) / uniqueXLabels.length) * 100}%` }}
                            />
                          ))}
                          {/* Data points */}
                          {(() => {
                            // Group points by x-label to calculate jitter
                            const pointsByX: Record<string, typeof validData> = {};
                            validData.forEach(item => {
                              const xLabel = showAllConditions && comparisonType === 'elements' ? item.element! : item.label;
                              if (!pointsByX[xLabel]) pointsByX[xLabel] = [];
                              pointsByX[xLabel].push(item);
                            });

                            return validData.map((item, idx) => {
                              const xLabel = showAllConditions && comparisonType === 'elements' ? item.element! : item.label;
                              const xIndex = uniqueXLabels.indexOf(xLabel);
                              if (xIndex === -1) return null;

                              // Calculate jitter for multiple points at same x
                              const pointsAtX = pointsByX[xLabel] || [];
                              const pointIdxInGroup = pointsAtX.indexOf(item);
                              const jitterSpread = Math.min(0.4, 0.8 / uniqueXLabels.length); // Max spread within column
                              const jitter = pointsAtX.length > 1
                                ? (pointIdxInGroup / (pointsAtX.length - 1) - 0.5) * jitterSpread
                                : 0;

                              const x = ((xIndex + 0.5 + jitter) / uniqueXLabels.length) * 100;
                              const y = ((yMax - item.logK!) / range) * 100;
                              // Color by condition if multiple, otherwise by index
                              const colorIdx = (showAllConditions && conditions.length > 1)
                                ? conditions.indexOf(item.condition!) % colors.length
                                : xIndex % colors.length;
                              return (
                                <div
                                  key={idx}
                                  className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform shadow-md"
                                  style={{
                                    left: `${x}%`,
                                    top: `${Math.max(2, Math.min(98, y))}%`,
                                    backgroundColor: colors[colorIdx],
                                    border: '2px solid rgba(255,255,255,0.8)'
                                  }}
                                  title={`${item.label}: ${showKd ? convertToKd(item.logK!) : item.logK!.toFixed(2)} (${item.details})`}
                                />
                              );
                            });
                          })()}
                          {/* X-axis labels */}
                          <div className="absolute top-full left-0 right-0 flex pt-2" style={{ height: comparisonType === 'ligands' ? '80px' : 'auto' }}>
                            {uniqueXLabels.map((label) => (
                              <div
                                key={label}
                                className={`flex-1 text-xs text-slate-600 dark:text-slate-400 font-medium ${
                                  comparisonType === 'ligands' ? 'writing-mode-vertical' : 'text-center truncate'
                                }`}
                                style={comparisonType === 'ligands' ? {
                                  writingMode: 'vertical-rl',
                                  transform: 'rotate(180deg)',
                                  textAlign: 'left',
                                  paddingLeft: '2px',
                                  overflow: 'hidden',
                                  maxHeight: '75px'
                                } : {}}
                                title={label}
                              >
                                {comparisonType === 'ligands'
                                  ? (label.length > 25 ? label.substring(0, 25) + '...' : label)
                                  : (label.length > 10 ? label.substring(0, 10) + '...' : label)
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Legend - show conditions when multiple */}
                        {showAllConditions && conditions.length > 1 && (
                          <div className="ml-4 text-xs bg-white dark:bg-slate-700 p-2 rounded shadow max-h-48 overflow-y-auto min-w-[120px]">
                            <div className="font-medium mb-1 text-slate-700 dark:text-slate-300">Conditions:</div>
                            {conditions.map((cond, i) => (
                              <div key={cond} className="flex items-center gap-1 py-0.5">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                <span className="truncate text-slate-600 dark:text-slate-400">{cond}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Bar Chart View */
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {comparisonData.map((item, idx) => {
                    const validData = comparisonData.filter(d => d.logK !== null);
                    const maxLogK = validData.length > 0 ? Math.max(...validData.map(d => d.logK!)) : 0;
                    const minLogK = validData.length > 0 ? Math.min(...validData.map(d => d.logK!)) : 0;
                    const range = maxLogK - minLogK || 1;
                    const percentage = item.logK !== null ? ((item.logK - minLogK) / range) * 100 : 0;

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-24 text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={item.label}>
                          {item.label}
                        </div>
                        <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden relative">
                          {item.logK !== null ? (
                            <>
                              <div
                                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                                style={{ width: `${Math.max(5, percentage)}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                {showKd ? convertToKd(item.logK) : item.logK.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 italic">
                              No data
                            </span>
                          )}
                        </div>
                        <div className="w-36 text-xs text-slate-500 truncate" title={item.details}>
                          {item.details}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {comparisonData.length === 0 && (
            (comparisonType === 'elements' && comparisonLigand && selectedElementsForComparison.length > 0) ||
            (comparisonType === 'ligands' && comparisonElement && selectedLigandsForComparison.length > 0) ||
            (comparisonType === 'conditions' && comparisonElement && comparisonLigand && selectedConditionsForComparison.length > 0)
          ) && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
              No data found for the selected comparison. Try different selections or adjust temperature.
            </p>
          )}
        </div>
      )}

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
                const isSelectedForComparison = comparisonMode && (
                  (comparisonType === 'elements' && selectedElementsForComparison.includes(element.symbol)) ||
                  ((comparisonType === 'ligands' || comparisonType === 'conditions') && comparisonElement === element.symbol)
                );

                const handleElementClick = () => {
                  if (comparisonMode) {
                    if (comparisonType === 'elements') {
                      setSelectedElementsForComparison(prev =>
                        prev.includes(element.symbol)
                          ? prev.filter(e => e !== element.symbol)
                          : [...prev, element.symbol]
                      );
                    } else {
                      // For 'ligands' and 'conditions' modes, select single element
                      setComparisonElement(element.symbol);
                    }
                  } else {
                    setSelectedElement(element.symbol);
                  }
                };

                return (
                  <div key={colIndex} className="w-14 h-16">
                    <button
                      onClick={handleElementClick}
                      className={`w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border-2 ${
                        isGrayedOut ? 'opacity-40 cursor-not-allowed' : ''
                      } ${isSelectedForComparison ? 'border-primary-500 ring-2 ring-primary-300' : 'border-slate-300'}`}
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
              const isSelectedForComparison = comparisonMode && (
                (comparisonType === 'elements' && selectedElementsForComparison.includes(element.symbol)) ||
                ((comparisonType === 'ligands' || comparisonType === 'conditions') && comparisonElement === element.symbol)
              );

              const handleClick = () => {
                if (comparisonMode) {
                  if (comparisonType === 'elements') {
                    setSelectedElementsForComparison(prev =>
                      prev.includes(element.symbol) ? prev.filter(e => e !== element.symbol) : [...prev, element.symbol]
                    );
                  } else {
                    setComparisonElement(element.symbol);
                  }
                } else {
                  setSelectedElement(element.symbol);
                }
              };

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={handleClick}
                    className={`w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border-2 ${isSelectedForComparison ? 'border-primary-500 ring-2 ring-primary-300' : 'border-slate-300'}`}
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
              const isSelectedForComparison = comparisonMode && (
                (comparisonType === 'elements' && selectedElementsForComparison.includes(element.symbol)) ||
                ((comparisonType === 'ligands' || comparisonType === 'conditions') && comparisonElement === element.symbol)
              );

              const handleClick = () => {
                if (comparisonMode) {
                  if (comparisonType === 'elements') {
                    setSelectedElementsForComparison(prev =>
                      prev.includes(element.symbol) ? prev.filter(e => e !== element.symbol) : [...prev, element.symbol]
                    );
                  } else {
                    setComparisonElement(element.symbol);
                  }
                } else {
                  setSelectedElement(element.symbol);
                }
              };

              return (
                <div key={idx} className="w-14 h-16">
                  <button
                    onClick={handleClick}
                    className={`w-full h-full rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border-2 ${isSelectedForComparison ? 'border-primary-500 ring-2 ring-primary-300' : 'border-slate-300'}`}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKd(!showKd)}
                  className="btn-secondary text-sm"
                >
                  Show {showKd ? 'log K' : 'Kd'}
                </button>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
              </div>
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
