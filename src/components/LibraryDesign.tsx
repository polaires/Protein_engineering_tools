/**
 * Library Design Component
 * Amino acid codon library simulator for protein engineering
 */

import { useState } from 'react';
import { Dna, Plus, Trash2, Calculator, Download, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

// Genetic code table
const GENETIC_CODE: Record<string, string> = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

// Reverse genetic code: AA -> codons
const AA_TO_CODONS: Record<string, string[]> = {
  'F': ['TTT', 'TTC'],
  'L': ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
  'I': ['ATT', 'ATC', 'ATA'],
  'M': ['ATG'],
  'V': ['GTT', 'GTC', 'GTA', 'GTG'],
  'S': ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
  'P': ['CCT', 'CCC', 'CCA', 'CCG'],
  'T': ['ACT', 'ACC', 'ACA', 'ACG'],
  'A': ['GCT', 'GCC', 'GCA', 'GCG'],
  'Y': ['TAT', 'TAC'],
  'H': ['CAT', 'CAC'],
  'Q': ['CAA', 'CAG'],
  'N': ['AAT', 'AAC'],
  'K': ['AAA', 'AAG'],
  'D': ['GAT', 'GAC'],
  'E': ['GAA', 'GAG'],
  'C': ['TGT', 'TGC'],
  'W': ['TGG'],
  'R': ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  'G': ['GGT', 'GGC', 'GGA', 'GGG']
};

// IUPAC degenerate base codes
const IUPAC_CODES: Record<string, string[]> = {
  'A': ['A'], 'C': ['C'], 'G': ['G'], 'T': ['T'],
  'R': ['A', 'G'], 'Y': ['C', 'T'], 'W': ['A', 'T'], 'S': ['G', 'C'],
  'M': ['A', 'C'], 'K': ['G', 'T'], 'H': ['A', 'C', 'T'], 'B': ['C', 'G', 'T'],
  'V': ['A', 'C', 'G'], 'D': ['A', 'G', 'T'], 'N': ['A', 'C', 'G', 'T']
};

// Reverse IUPAC: sorted bases -> IUPAC code
const BASES_TO_IUPAC: Record<string, string> = {
  'A': 'A', 'C': 'C', 'G': 'G', 'T': 'T',
  'AG': 'R', 'CT': 'Y', 'AT': 'W', 'CG': 'S',
  'AC': 'M', 'GT': 'K', 'ACT': 'H', 'CGT': 'B',
  'ACG': 'V', 'AGT': 'D', 'ACGT': 'N'
};

// Amino acid names
const AA_NAMES: Record<string, string> = {
  'A': 'Ala', 'R': 'Arg', 'N': 'Asn', 'D': 'Asp', 'C': 'Cys', 'Q': 'Gln',
  'E': 'Glu', 'G': 'Gly', 'H': 'His', 'I': 'Ile', 'L': 'Leu', 'K': 'Lys',
  'M': 'Met', 'F': 'Phe', 'P': 'Pro', 'S': 'Ser', 'T': 'Thr', 'W': 'Trp',
  'Y': 'Tyr', 'V': 'Val', '*': 'STOP'
};

// Amino acid properties
const AA_PROPERTIES: Record<string, { charge: string; polarity: string; size: string }> = {
  'A': { charge: 'neutral', polarity: 'nonpolar', size: 'small' },
  'R': { charge: 'positive', polarity: 'polar', size: 'large' },
  'N': { charge: 'neutral', polarity: 'polar', size: 'small' },
  'D': { charge: 'negative', polarity: 'polar', size: 'small' },
  'C': { charge: 'neutral', polarity: 'slightly_polar', size: 'small' },
  'Q': { charge: 'neutral', polarity: 'polar', size: 'medium' },
  'E': { charge: 'negative', polarity: 'polar', size: 'medium' },
  'G': { charge: 'neutral', polarity: 'nonpolar', size: 'tiny' },
  'H': { charge: 'slightly_positive', polarity: 'polar', size: 'medium' },
  'I': { charge: 'neutral', polarity: 'nonpolar', size: 'medium' },
  'L': { charge: 'neutral', polarity: 'nonpolar', size: 'medium' },
  'K': { charge: 'positive', polarity: 'polar', size: 'large' },
  'M': { charge: 'neutral', polarity: 'nonpolar', size: 'medium' },
  'F': { charge: 'neutral', polarity: 'nonpolar', size: 'large' },
  'P': { charge: 'neutral', polarity: 'nonpolar', size: 'medium' },
  'S': { charge: 'neutral', polarity: 'polar', size: 'small' },
  'T': { charge: 'neutral', polarity: 'polar', size: 'small' },
  'W': { charge: 'neutral', polarity: 'nonpolar', size: 'large' },
  'Y': { charge: 'neutral', polarity: 'slightly_polar', size: 'large' },
  'V': { charge: 'neutral', polarity: 'nonpolar', size: 'medium' },
  '*': { charge: 'none', polarity: 'none', size: 'none' }
};

// Property grouping
const PROPERTY_GROUPS = {
  'charged_positive': ['R', 'K', 'H'],
  'charged_negative': ['D', 'E'],
  'polar': ['S', 'T', 'N', 'Q', 'Y', 'C'],
  'nonpolar': ['A', 'V', 'L', 'I', 'M', 'F', 'W', 'P', 'G']
};

interface Position {
  id: string;
  name: string;
  codon: string;
}

interface AAResult {
  aa: string;
  count: number;
  frequency: number;
  name: string;
  properties: { charge: string; polarity: string; size: string };
}

interface PositionResult {
  position: Position;
  totalCodons: number;
  uniqueAAs: number;
  aaResults: AAResult[];
  hasStopCodon: boolean;
  stopFrequency: number;
}

interface PropertyGroup {
  name: string;
  aas: AAResult[];
  totalFrequency: number;
  color: string;
  icon: string;
}

interface GeneratorResult {
  inputAminoAcids: string[];
  optimalCodons: string[];
  analysis: {
    totalCodons: number;
    aminoAcidCounts: Record<string, number>;
    extraAminoAcids: string[];
  };
}

type LibraryMode = 'analyzer' | 'generator';
type OptimizationStrategy = 'minimal' | 'all' | 'balanced';

export default function LibraryDesign() {
  const [mode, setMode] = useState<LibraryMode>('analyzer');

  // Analyzer mode state
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', name: 'Position 1', codon: 'NNK' },
    { id: '2', name: 'Position 2', codon: 'NNK' },
    { id: '3', name: 'Position 3', codon: 'NNK' }
  ]);
  const [results, setResults] = useState<PositionResult[]>([]);
  const [totalLibrarySize, setTotalLibrarySize] = useState<number>(0);
  const [showIUPAC, setShowIUPAC] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  // Generator mode state
  const [aminoAcidInput, setAminoAcidInput] = useState<string>('');
  const [generatorResult, setGeneratorResult] = useState<GeneratorResult | null>(null);
  const [optimizationStrategy, setOptimizationStrategy] = useState<OptimizationStrategy>('minimal');
  const [selectedCodonIndex, setSelectedCodonIndex] = useState<number>(0);

  // Expand degenerate codon to all possible combinations
  const expandDegenerateCodon = (degenerateCodon: string): string[] => {
    if (degenerateCodon.length !== 3) {
      throw new Error('Codon must be exactly 3 bases long');
    }

    const upper = degenerateCodon.toUpperCase();
    for (const base of upper) {
      if (!IUPAC_CODES[base]) {
        throw new Error(`Invalid IUPAC code: ${base}`);
      }
    }

    const expandedPositions = upper.split('').map(base => IUPAC_CODES[base]);
    const cartesianProduct = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(b => [...a, b]));
      }, [[]] as string[][]);
    };

    const allCombos = cartesianProduct(expandedPositions);
    return allCombos.map(combo => combo.join(''));
  };

  // Analyze a single position
  const analyzePosition = (position: Position): PositionResult => {
    try {
      const allCodons = expandDegenerateCodon(position.codon);
      const aaCounts: Record<string, number> = {};

      for (const codon of allCodons) {
        const aa = GENETIC_CODE[codon] || '?';
        aaCounts[aa] = (aaCounts[aa] || 0) + 1;
      }

      const totalCodons = allCodons.length;
      const aaResults: AAResult[] = Object.entries(aaCounts).map(([aa, count]) => ({
        aa,
        count,
        frequency: (count / totalCodons) * 100,
        name: AA_NAMES[aa] || 'Unknown',
        properties: AA_PROPERTIES[aa] || { charge: 'unknown', polarity: 'unknown', size: 'unknown' }
      }));

      aaResults.sort((a, b) => b.frequency - a.frequency);

      const hasStopCodon = aaCounts['*'] > 0;
      const stopFrequency = hasStopCodon ? (aaCounts['*'] / totalCodons) * 100 : 0;

      return {
        position,
        totalCodons,
        uniqueAAs: Object.keys(aaCounts).length,
        aaResults,
        hasStopCodon,
        stopFrequency
      };
    } catch (error) {
      throw error;
    }
  };

  // Group amino acids by properties
  const groupByProperties = (aaResults: AAResult[]): PropertyGroup[] => {
    const groups: PropertyGroup[] = [
      { name: 'Positive (+)', aas: [], totalFrequency: 0, color: 'bg-blue-500', icon: '+' },
      { name: 'Negative (−)', aas: [], totalFrequency: 0, color: 'bg-red-500', icon: '−' },
      { name: 'Polar', aas: [], totalFrequency: 0, color: 'bg-green-500', icon: '○' },
      { name: 'Nonpolar', aas: [], totalFrequency: 0, color: 'bg-yellow-500', icon: '●' }
    ];

    aaResults.forEach(aa => {
      if (aa.aa === '*') return;

      if (PROPERTY_GROUPS.charged_positive.includes(aa.aa)) {
        groups[0].aas.push(aa);
        groups[0].totalFrequency += aa.frequency;
      } else if (PROPERTY_GROUPS.charged_negative.includes(aa.aa)) {
        groups[1].aas.push(aa);
        groups[1].totalFrequency += aa.frequency;
      } else if (PROPERTY_GROUPS.polar.includes(aa.aa)) {
        groups[2].aas.push(aa);
        groups[2].totalFrequency += aa.frequency;
      } else if (PROPERTY_GROUPS.nonpolar.includes(aa.aa)) {
        groups[3].aas.push(aa);
        groups[3].totalFrequency += aa.frequency;
      }
    });

    return groups.filter(g => g.aas.length > 0);
  };

  // Calculate entire library
  const calculateLibrary = () => {
    try {
      const newResults: PositionResult[] = [];
      let libSize = 1;

      for (const position of positions) {
        const result = analyzePosition(position);
        newResults.push(result);
        libSize *= result.totalCodons;
      }

      setResults(newResults);
      setTotalLibrarySize(libSize);
      setExpandedPositions(new Set()); // Collapse all on new calculation
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Toggle position expansion
  const togglePosition = (positionId: string) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);
    }
    setExpandedPositions(newExpanded);
  };

  // Add/remove/update positions (keeping original functions)
  const addPosition = () => {
    const newId = String(Math.max(...positions.map(p => parseInt(p.id)), 0) + 1);
    setPositions([...positions, {
      id: newId,
      name: `Position ${positions.length + 1}`,
      codon: 'NNK'
    }]);
  };

  const removePosition = (id: string) => {
    if (positions.length > 1) {
      setPositions(positions.filter(p => p.id !== id));
    }
  };

  const updatePosition = (id: string, field: 'name' | 'codon', value: string) => {
    setPositions(positions.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Export results as CSV
  const exportResults = () => {
    if (results.length === 0) {
      alert('Please calculate the library first');
      return;
    }

    let csv = 'Position,Position_Name,Degenerate_Codon,Amino_Acid,AA_Name,Frequency_%,Count,Charge,Polarity,Size\n';

    results.forEach((result, idx) => {
      result.aaResults.forEach(aa => {
        csv += `${idx + 1},${result.position.name},${result.position.codon},${aa.aa},${aa.name},${aa.frequency.toFixed(2)},${aa.count},${aa.properties.charge},${aa.properties.polarity},${aa.properties.size}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library_design_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Format library size
  const formatLibrarySize = (size: number): string => {
    if (size >= 1000) {
      return size.toExponential(2);
    }
    return size.toLocaleString();
  };

  // ============ DEGENERATE CODON GENERATOR FUNCTIONS ============

  // Get amino acid property category
  const getAAPropertyCategory = (aa: string): string => {
    if (PROPERTY_GROUPS.charged_positive.includes(aa)) return 'charged_positive';
    if (PROPERTY_GROUPS.charged_negative.includes(aa)) return 'charged_negative';
    if (PROPERTY_GROUPS.polar.includes(aa)) return 'polar';
    if (PROPERTY_GROUPS.nonpolar.includes(aa)) return 'nonpolar';
    return 'unknown';
  };

  // Get amino acids with same properties for balanced strategy
  const getAAsWithSameProperties = (aminoAcids: string[]): string[] => {
    const categories = new Set(aminoAcids.map(aa => getAAPropertyCategory(aa)));
    const result: string[] = [];

    for (const category of categories) {
      if (category === 'charged_positive') result.push(...PROPERTY_GROUPS.charged_positive);
      else if (category === 'charged_negative') result.push(...PROPERTY_GROUPS.charged_negative);
      else if (category === 'polar') result.push(...PROPERTY_GROUPS.polar);
      else if (category === 'nonpolar') result.push(...PROPERTY_GROUPS.nonpolar);
    }

    return Array.from(new Set(result));
  };

  // Get all bases required at each position for the input amino acids
  const getRequiredBases = (aminoAcids: string[]): { first: string[]; second: string[]; third: string[] } => {
    const firstBases = new Set<string>();
    const secondBases = new Set<string>();
    const thirdBases = new Set<string>();

    for (const aa of aminoAcids) {
      const codons = AA_TO_CODONS[aa];
      if (!codons) continue;

      for (const codon of codons) {
        firstBases.add(codon[0]);
        secondBases.add(codon[1]);
        thirdBases.add(codon[2]);
      }
    }

    return {
      first: Array.from(firstBases).sort(),
      second: Array.from(secondBases).sort(),
      third: Array.from(thirdBases).sort()
    };
  };

  // Check if a single base can cover all amino acids at a position
  const canBaseCoverAllAminoAcids = (base: string, aminoAcids: string[], position: number): boolean => {
    for (const aa of aminoAcids) {
      const codons = AA_TO_CODONS[aa];
      if (!codons) continue;

      const hasCodonWithBase = codons.some(codon => codon[position] === base);
      if (!hasCodonWithBase) return false;
    }
    return true;
  };

  // Check if a set of bases can cover all amino acids at a position
  const canBasesCoverAllAminoAcids = (
    bases: string[],
    aminoAcids: string[],
    position: number,
    firstBase?: string[],
    secondBase?: string[]
  ): boolean => {
    for (const aa of aminoAcids) {
      const codons = AA_TO_CODONS[aa];
      if (!codons) continue;

      let validCodons = codons;

      // For third position, filter codons by first and second bases
      if (position === 2 && firstBase && secondBase) {
        validCodons = codons.filter(codon =>
          firstBase.includes(codon[0]) && secondBase.includes(codon[1])
        );
      }

      const hasCodonWithBases = validCodons.some(codon => bases.includes(codon[position]));
      if (!hasCodonWithBases) return false;
    }
    return true;
  };

  // Find minimum set of bases that covers all amino acids
  const findMinimumBasesSet = (
    bases: string[],
    aminoAcids: string[],
    position: number,
    firstBase?: string[],
    secondBase?: string[]
  ): string[][] => {
    // Try increasing set sizes
    for (let size = 1; size <= bases.length; size++) {
      const combinations = getCombinations(bases, size);
      const validCombos: string[][] = [];

      for (const combo of combinations) {
        if (canBasesCoverAllAminoAcids(combo, aminoAcids, position, firstBase, secondBase)) {
          validCombos.push(combo);
        }
      }

      if (validCombos.length > 0) {
        return validCombos;
      }
    }

    return [bases]; // If no smaller set found, return all bases
  };

  // Get all combinations of size k from array
  const getCombinations = <T,>(array: T[], k: number): T[][] => {
    if (k === 1) return array.map(x => [x]);
    if (k === array.length) return [array];

    const result: T[][] = [];

    const combine = (start: number, combo: T[]) => {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }

      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    };

    combine(0, []);
    return result;
  };

  // Optimize bases for a position
  const optimizeBases = (
    bases: string[],
    aminoAcids: string[],
    position: number,
    firstBase?: string[],
    secondBase?: string[]
  ): string[][] => {
    // Check if single base can cover all
    for (const base of bases) {
      if (canBaseCoverAllAminoAcids(base, aminoAcids, position)) {
        return [[base]];
      }
    }

    // Find minimum set of bases
    return findMinimumBasesSet(bases, aminoAcids, position, firstBase, secondBase);
  };

  // Convert bases to optimal IUPAC code
  const findOptimalDegenerateBase = (bases: string[]): string => {
    const sortedBases = bases.sort().join('');
    return BASES_TO_IUPAC[sortedBases] || sortedBases;
  };

  // Generate optimal degenerate codons
  const generateOptimalDegenerateCodons = (
    firstBaseSets: string[][],
    secondBaseSets: string[][],
    thirdBaseSets: string[][]
  ): string[] => {
    const codons: string[] = [];

    for (const firstBases of firstBaseSets) {
      for (const secondBases of secondBaseSets) {
        for (const thirdBases of thirdBaseSets) {
          const first = findOptimalDegenerateBase(firstBases);
          const second = findOptimalDegenerateBase(secondBases);
          const third = findOptimalDegenerateBase(thirdBases);
          codons.push(`${first}${second}${third}`);
        }
      }
    }

    return Array.from(new Set(codons)); // Remove duplicates
  };

  // Analyze the generated solution
  const analyzeSolution = (optimalCodons: string[], inputAminoAcids: string[]): GeneratorResult['analysis'] => {
    const aminoAcidCounts: Record<string, number> = {};
    let totalCodons = 0;

    for (const degenerateCodon of optimalCodons) {
      const expandedCodons = expandDegenerateCodon(degenerateCodon);

      for (const codon of expandedCodons) {
        totalCodons++;
        const aa = GENETIC_CODE[codon];
        aminoAcidCounts[aa] = (aminoAcidCounts[aa] || 0) + 1;
      }
    }

    const foundAAs = Object.keys(aminoAcidCounts).filter(aa => aa !== '*');
    const extraAminoAcids = foundAAs.filter(aa => !inputAminoAcids.includes(aa));

    return {
      totalCodons,
      aminoAcidCounts,
      extraAminoAcids
    };
  };

  // Generate all possible degenerate codons (no optimization)
  const generateAllCombinations = (aminoAcids: string[]): string[] => {
    const requiredBases = getRequiredBases(aminoAcids);
    const codons: string[] = [];

    // Generate all combinations of bases at each position
    for (const first of requiredBases.first) {
      for (const second of requiredBases.second) {
        for (const third of requiredBases.third) {
          const firstCode = findOptimalDegenerateBase([first]);
          const secondCode = findOptimalDegenerateBase([second]);
          const thirdCode = findOptimalDegenerateBase([third]);
          codons.push(`${firstCode}${secondCode}${thirdCode}`);
        }
      }
    }

    // Also try combinations of bases
    const firstCode = findOptimalDegenerateBase(requiredBases.first);
    const secondCode = findOptimalDegenerateBase(requiredBases.second);
    const thirdCode = findOptimalDegenerateBase(requiredBases.third);
    codons.push(`${firstCode}${secondCode}${thirdCode}`);

    return Array.from(new Set(codons));
  };

  // Generate balanced degenerate codons (property-based with stop codon minimization)
  const generateBalancedCodons = (aminoAcids: string[]): string[] => {
    // Get amino acids with same properties
    const expandedAAs = getAAsWithSameProperties(aminoAcids);

    // Get required bases for expanded set
    const requiredBases = getRequiredBases(expandedAAs);

    // Try to find combinations that minimize stop codons
    const candidateCodons: { codon: string; stopFreq: number; extraAAs: number }[] = [];

    // Test various combinations
    for (let i = 1; i <= Math.min(requiredBases.first.length, 3); i++) {
      for (let j = 1; j <= Math.min(requiredBases.second.length, 3); j++) {
        for (let k = 1; k <= Math.min(requiredBases.third.length, 3); k++) {
          const firstSets = getCombinations(requiredBases.first, i);
          const secondSets = getCombinations(requiredBases.second, j);
          const thirdSets = getCombinations(requiredBases.third, k);

          for (const firstBases of firstSets) {
            for (const secondBases of secondSets) {
              for (const thirdBases of thirdSets) {
                const first = findOptimalDegenerateBase(firstBases);
                const second = findOptimalDegenerateBase(secondBases);
                const third = findOptimalDegenerateBase(thirdBases);
                const codon = `${first}${second}${third}`;

                const testAnalysis = analyzeSolution([codon], aminoAcids);
                const stopCount = testAnalysis.aminoAcidCounts['*'] || 0;
                const stopFreq = (stopCount / testAnalysis.totalCodons) * 100;

                candidateCodons.push({
                  codon,
                  stopFreq,
                  extraAAs: testAnalysis.extraAminoAcids.length
                });
              }
            }
          }
        }
      }
    }

    // Sort by stop frequency (ascending) then by extra AAs (ascending)
    candidateCodons.sort((a, b) => {
      if (Math.abs(a.stopFreq - b.stopFreq) > 0.1) return a.stopFreq - b.stopFreq;
      return a.extraAAs - b.extraAAs;
    });

    // Return top candidates (max 5)
    return candidateCodons.slice(0, 5).map(c => c.codon);
  };

  // Main generator function
  const generateDegenerateCodons = () => {
    try {
      // Parse and validate input
      const aminoAcids = Array.from(new Set(aminoAcidInput.toUpperCase().split('')))
        .filter(aa => AA_TO_CODONS[aa]);

      if (aminoAcids.length === 0) {
        alert('Please enter valid amino acids (e.g., ACDEFGHIKLMNPQRSTVWY)');
        return;
      }

      let optimalCodons: string[];

      if (optimizationStrategy === 'minimal') {
        // Original minimal optimization
        const requiredBases = getRequiredBases(aminoAcids);
        const optimizedFirst = optimizeBases(requiredBases.first, aminoAcids, 0);
        const optimizedSecond = optimizeBases(requiredBases.second, aminoAcids, 1);
        const optimizedThird = optimizeBases(
          requiredBases.third,
          aminoAcids,
          2,
          optimizedFirst[0],
          optimizedSecond[0]
        );
        optimalCodons = generateOptimalDegenerateCodons(
          optimizedFirst,
          optimizedSecond,
          optimizedThird
        );
      } else if (optimizationStrategy === 'all') {
        // Generate all possible combinations
        optimalCodons = generateAllCombinations(aminoAcids);
      } else {
        // Balanced approach
        optimalCodons = generateBalancedCodons(aminoAcids);
      }

      // Analyze solution
      const analysis = analyzeSolution(optimalCodons, aminoAcids);

      setGeneratorResult({
        inputAminoAcids: aminoAcids,
        optimalCodons,
        analysis
      });
      setSelectedCodonIndex(0); // Reset to first codon
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Get analysis for the selected codon only
  const getSelectedCodonAnalysis = (): GeneratorResult['analysis'] | null => {
    if (!generatorResult || selectedCodonIndex >= generatorResult.optimalCodons.length) {
      return null;
    }
    const selectedCodon = generatorResult.optimalCodons[selectedCodonIndex];
    return analyzeSolution([selectedCodon], generatorResult.inputAminoAcids);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          Codon Library Design
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Design and analyze degenerate codon libraries for protein engineering.
          {mode === 'analyzer'
            ? ' Use IUPAC notation to specify amino acid diversity at each position.'
            : ' Enter amino acids to generate optimal degenerate codons.'}
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setMode('analyzer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'analyzer'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Codon → Amino Acids
          </button>
          <button
            onClick={() => setMode('generator')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'generator'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            Amino Acids → Codon
          </button>
        </div>
      </div>

      {/* ANALYZER MODE */}
      {mode === 'analyzer' && (
        <>
          {/* Controls */}
          <div className="card">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <button onClick={addPosition} className="btn-secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </button>
                <button onClick={calculateLibrary} className="btn-primary">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Library
                </button>
                {results.length > 0 && (
                  <button onClick={exportResults} className="btn-secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowIUPAC(!showIUPAC)}
                className="btn-icon"
                title="IUPAC Reference"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

        {/* Library Size */}
        {totalLibrarySize > 0 && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Library Size</div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {formatLibrarySize(totalLibrarySize)} variants
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IUPAC Reference */}
      {showIUPAC && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
            IUPAC Degenerate Base Codes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Two-Base Codes</h4>
              <ul className="space-y-1 font-mono text-xs">
                <li><strong>R</strong> = A or G (puRine)</li>
                <li><strong>Y</strong> = C or T (pYrimidine)</li>
                <li><strong>W</strong> = A or T (Weak)</li>
                <li><strong>S</strong> = G or C (Strong)</li>
                <li><strong>M</strong> = A or C (aMino)</li>
                <li><strong>K</strong> = G or T (Keto)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Three-Base Codes</h4>
              <ul className="space-y-1 font-mono text-xs">
                <li><strong>H</strong> = A or C or T (not G)</li>
                <li><strong>B</strong> = C or G or T (not A)</li>
                <li><strong>V</strong> = A or C or G (not T)</li>
                <li><strong>D</strong> = A or G or T (not C)</li>
                <li><strong>N</strong> = A or C or G or T (aNy)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Common Examples</h4>
              <ul className="space-y-1 font-mono text-xs">
                <li><strong>NNK</strong> = 32 codons (20 AA + 1 stop)</li>
                <li><strong>NNS</strong> = 32 codons (20 AA + 1 stop)</li>
                <li><strong>NNN</strong> = 64 codons (all)</li>
                <li><strong>NNM</strong> = 32 codons (20 AA, no stop)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Position Inputs */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Library Positions
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 px-2">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Position Name</div>
            <div className="col-span-3">Degenerate Codon</div>
            <div className="col-span-3"></div>
            <div className="col-span-1"></div>
          </div>
          {positions.map((position, idx) => (
            <div key={position.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-1 text-center font-semibold text-slate-600 dark:text-slate-400">
                {idx + 1}
              </div>
              <input
                type="text"
                value={position.name}
                onChange={(e) => updatePosition(position.id, 'name', e.target.value)}
                className="col-span-4 input-field"
                placeholder="Position name"
              />
              <input
                type="text"
                value={position.codon}
                onChange={(e) => updatePosition(position.id, 'codon', e.target.value.toUpperCase())}
                className="col-span-3 input-field font-mono"
                placeholder="NNK"
                maxLength={3}
              />
              <div className="col-span-3"></div>
              <button
                onClick={() => removePosition(position.id)}
                className="col-span-1 btn-icon text-red-600 hover:text-red-700"
                disabled={positions.length === 1}
                title="Remove position"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Results - Compact View */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => {
            const groups = groupByProperties(result.aaResults);
            const isExpanded = expandedPositions.has(result.position.id);
            const topAAs = result.aaResults.filter(aa => aa.aa !== '*').slice(0, 5);

            return (
              <div key={result.position.id} className="card">
                {/* Compact Summary */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {result.position.name}
                        </h3>
                        <span className="font-mono text-sm font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                          {result.position.codon}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        <span>{result.totalCodons} codons</span>
                        <span>•</span>
                        <span>{result.uniqueAAs} amino acids</span>
                        {result.hasStopCodon && (
                          <>
                            <span>•</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Stop {result.stopFrequency.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => togglePosition(result.position.id)}
                      className="btn-secondary"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Show Details
                        </>
                      )}
                    </button>
                  </div>

                  {/* Top 5 AAs - Always Visible */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Most Frequent
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topAAs.map((aa) => (
                        <div
                          key={aa.aa}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
                        >
                          <span className="font-mono font-bold text-lg">{aa.aa}</span>
                          <div className="text-xs">
                            <div className="font-semibold">{aa.frequency.toFixed(1)}%</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              {aa.count}/{result.totalCodons}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Property Groups - Always Visible */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Property Distribution
                    </div>
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <div key={group.name}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {group.name}
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {group.totalFrequency.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${group.color} h-full transition-all duration-300`}
                                style={{ width: `${group.totalFrequency}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 min-w-[60px]">
                              {group.aas.map(aa => aa.aa).join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Table - Expandable */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Complete Amino Acid Distribution
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {result.aaResults.map((aa) => (
                          <div
                            key={aa.aa}
                            className={`p-3 rounded-lg border ${
                              aa.aa === '*'
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold text-lg">{aa.aa}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {aa.name}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {aa.frequency.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              {aa.count}/{result.totalCodons} codons
                            </div>
                            {aa.aa !== '*' && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    aa.properties.charge === 'positive'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                      : aa.properties.charge === 'negative'
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {aa.properties.charge === 'positive'
                                    ? '+'
                                    : aa.properties.charge === 'negative'
                                    ? '−'
                                    : '○'}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {aa.properties.size}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Overall Summary */}
          <div className="card bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
              Library Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Positions</div>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                  {results.length}
                </div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Library Size</div>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {formatLibrarySize(totalLibrarySize)}
                </div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">Stop Codons</div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {results.filter(r => r.hasStopCodon).length}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Recommendations</h4>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {totalLibrarySize < 1e6 ? (
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    Library size is manageable for complete screening
                  </li>
                ) : totalLibrarySize < 1e9 ? (
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">⚠</span>
                    Library size requires sampling strategies
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-400">⚠</span>
                    Very large library - consider reducing diversity
                  </li>
                )}
                {results.some(r => r.hasStopCodon) && (
                  <li className="flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-400">⚠</span>
                    Some positions contain stop codons - consider using NNK/NNS instead of NNN
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* GENERATOR MODE */}
      {mode === 'generator' && (
        <>
          {/* Input Section */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
              Input Amino Acids
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enter the amino acids you want to encode (e.g., ACDEFGHIKLMNPQRSTVWY). The tool will find the optimal degenerate codon(s).
            </p>

            {/* Optimization Strategy Selector */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Optimization Strategy:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOptimizationStrategy('minimal')}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    optimizationStrategy === 'minimal'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  Minimal
                </button>
                <button
                  onClick={() => setOptimizationStrategy('all')}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    optimizationStrategy === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  All Combinations
                </button>
                <button
                  onClick={() => setOptimizationStrategy('balanced')}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    optimizationStrategy === 'balanced'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  Balanced
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {optimizationStrategy === 'minimal' && 'Most optimal/minimized combination'}
                {optimizationStrategy === 'all' && 'All possible combinations (may include extra amino acids)'}
                {optimizationStrategy === 'balanced' && 'Balanced with same-property alternatives, minimizing stop codons'}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aminoAcidInput}
                onChange={(e) => setAminoAcidInput(e.target.value.toUpperCase())}
                className="input-field flex-1 font-mono text-lg"
                placeholder="Enter amino acids (e.g., ACDEFG)"
              />
              <button onClick={generateDegenerateCodons} className="btn-primary">
                <ArrowRight className="w-4 h-4 mr-2" />
                Generate Codons
              </button>
              <button
                onClick={() => setShowIUPAC(!showIUPAC)}
                className="btn-icon"
                title="IUPAC Reference"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Quick examples */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Common Degenerate Codons:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  onClick={() => setAminoAcidInput('ACDEFGHIKLMNPQRSTVWY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">NNK</span> - Hard randomization - All 20 a.a.
                </button>
                <button
                  onClick={() => setAminoAcidInput('ACDFGHILNPRSTVYACDFGHILNPRSTVYACDFGHILNPRSTVY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">NNC</span> - 15 a.a. - A,C,D,F,G,H,I,L,N,P,R,S,T,V,Y
                </button>
                <button
                  onClick={() => setAminoAcidInput('DEFHIKLNQVY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">NWW</span> - Charged, hydrophobic - D,E,F,H,I,K,L,N,Q,V,Y
                </button>
                <button
                  onClick={() => setAminoAcidInput('ADEGHNRST')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">RVK</span> - Charge, hydrophilic - A,D,E,G,H,K,N,R,S,T
                </button>
                <button
                  onClick={() => setAminoAcidInput('ACDGNSTY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">DVT</span> - Hydrophilic - A,C,D,G,N,S,T,Y
                </button>
                <button
                  onClick={() => setAminoAcidInput('CDGHNPRSTY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">NVT</span> - Charge, hydrophilic - C,D,G,H,N,P,R,S,T,Y
                </button>
                <button
                  onClick={() => setAminoAcidInput('ADGHNPRST')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">VVC</span> - Hydrophilic - A,D,G,H,N,P,R,S,T
                </button>
                <button
                  onClick={() => setAminoAcidInput('AGST')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">RST</span> - Small side chains - A,G,S,T
                </button>
                <button
                  onClick={() => setAminoAcidInput('FILV')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">NTT</span> - Hydrophobic - F,I,L,V
                </button>
                <button
                  onClick={() => setAminoAcidInput('CFLWY')}
                  className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-left"
                >
                  <span className="font-mono font-bold">TDK</span> - Hydrophobic - C,F,L,W,Y
                </button>
              </div>
            </div>
          </div>

          {/* IUPAC Reference */}
          {showIUPAC && (
            <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
                IUPAC Degenerate Base Codes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Two-Base Codes</h4>
                  <ul className="space-y-1 font-mono text-xs">
                    <li><strong>R</strong> = A or G (puRine)</li>
                    <li><strong>Y</strong> = C or T (pYrimidine)</li>
                    <li><strong>W</strong> = A or T (Weak)</li>
                    <li><strong>S</strong> = G or C (Strong)</li>
                    <li><strong>M</strong> = A or C (aMino)</li>
                    <li><strong>K</strong> = G or T (Keto)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Three-Base Codes</h4>
                  <ul className="space-y-1 font-mono text-xs">
                    <li><strong>H</strong> = A or C or T (not G)</li>
                    <li><strong>B</strong> = C or G or T (not A)</li>
                    <li><strong>V</strong> = A or C or G (not T)</li>
                    <li><strong>D</strong> = A or G or T (not C)</li>
                    <li><strong>N</strong> = A or C or G or T (aNy)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Common Examples</h4>
                  <ul className="space-y-1 font-mono text-xs">
                    <li><strong>NNK</strong> = 32 codons (20 AA + 1 stop)</li>
                    <li><strong>NNS</strong> = 32 codons (20 AA + 1 stop)</li>
                    <li><strong>NNN</strong> = 64 codons (all)</li>
                    <li><strong>NNM</strong> = 32 codons (20 AA, no stop)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {generatorResult && (
            <>
              {/* Optimal Codons */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
                  Optimal Degenerate Codons
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Input Amino Acids: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {generatorResult.inputAminoAcids.join('')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Generated Codon{generatorResult.optimalCodons.length > 1 ? 's' : ''}
                      {generatorResult.optimalCodons.length > 1 && (
                        <span className="text-xs font-normal ml-2">(Click to select for analysis)</span>
                      )}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generatorResult.optimalCodons.map((codon, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCodonIndex(idx)}
                          className={`px-4 py-3 rounded-lg border-2 transition-all ${
                            selectedCodonIndex === idx
                              ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 ring-2 ring-primary-400 dark:ring-primary-500'
                              : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                          }`}
                        >
                          <div className="font-mono text-2xl font-bold text-primary-700 dark:text-primary-300">
                            {codon}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {selectedCodonIndex === idx ? '✓ Selected' : `Codon #${idx + 1}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Library Analysis
                  </h3>
                  {generatorResult.optimalCodons.length > 1 && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Analyzing: <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                        {generatorResult.optimalCodons[selectedCodonIndex]}
                      </span>
                    </div>
                  )}
                </div>

                {(() => {
                  const selectedAnalysis = getSelectedCodonAnalysis();
                  if (!selectedAnalysis) return null;

                  return (
                    <>
                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Total Codons</div>
                          <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                            {selectedAnalysis.totalCodons}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Unique Amino Acids</div>
                          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                            {Object.keys(selectedAnalysis.aminoAcidCounts).filter(aa => aa !== '*').length}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-white dark:bg-slate-700 rounded-lg">
                          <div className="text-sm text-slate-600 dark:text-slate-400">Extra Amino Acids</div>
                          <div className={`text-3xl font-bold ${
                            selectedAnalysis.extraAminoAcids.length === 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {selectedAnalysis.extraAminoAcids.length}
                          </div>
                        </div>
                      </div>

                      {/* Amino Acid Distribution */}
                      <div>
                        <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">
                          Amino Acid Distribution
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {Object.entries(selectedAnalysis.aminoAcidCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([aa, count]) => {
                              const frequency = (count / selectedAnalysis.totalCodons) * 100;
                              const isTarget = generatorResult.inputAminoAcids.includes(aa);
                              const isStop = aa === '*';
                              const isCysteine = aa === 'C';

                              // Get property-based colors
                              let bgColor = 'bg-slate-50 dark:bg-slate-800';
                              let borderColor = 'border-slate-200 dark:border-slate-700';
                              let highlightText = '';

                              if (isStop) {
                                bgColor = 'bg-red-100 dark:bg-red-900/30';
                                borderColor = 'border-red-400 dark:border-red-700';
                                highlightText = 'STOP';
                              } else if (isCysteine) {
                                bgColor = 'bg-orange-100 dark:bg-orange-900/30';
                                borderColor = 'border-orange-400 dark:border-orange-700';
                                highlightText = 'CYS';
                              } else if (PROPERTY_GROUPS.charged_positive.includes(aa)) {
                                bgColor = 'bg-blue-100 dark:bg-blue-900/30';
                                borderColor = 'border-blue-300 dark:border-blue-700';
                              } else if (PROPERTY_GROUPS.charged_negative.includes(aa)) {
                                bgColor = 'bg-red-100 dark:bg-red-900/30';
                                borderColor = 'border-red-300 dark:border-red-700';
                              } else if (PROPERTY_GROUPS.polar.includes(aa)) {
                                bgColor = 'bg-green-100 dark:bg-green-900/30';
                                borderColor = 'border-green-300 dark:border-green-700';
                              } else if (PROPERTY_GROUPS.nonpolar.includes(aa)) {
                                bgColor = 'bg-amber-100 dark:bg-amber-900/30';
                                borderColor = 'border-amber-300 dark:border-amber-700';
                              }

                              return (
                                <div
                                  key={aa}
                                  className={`p-3 rounded-lg border-2 ${bgColor} ${borderColor} ${
                                    (isStop || isCysteine) ? 'ring-2 ring-offset-2 ring-red-400 dark:ring-red-600' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono font-bold text-lg">{aa}</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {AA_NAMES[aa]}
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {frequency.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {count}/{selectedAnalysis.totalCodons} codons
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {highlightText && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                                        isStop
                                          ? 'bg-red-600 text-white'
                                          : 'bg-orange-600 text-white'
                                      }`}>
                                        {highlightText}
                                      </span>
                                    )}
                                    {!isTarget && !isStop && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-600 text-white font-semibold">
                                        Extra
                                      </span>
                                    )}
                                    {isTarget && !isStop && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-600 text-white font-semibold">
                                        Target
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        {/* Color Legend */}
                        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Property Colors:
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300"></div>
                              <span>Positive (+)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300"></div>
                              <span>Negative (−)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300"></div>
                              <span>Polar</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300"></div>
                              <span>Nonpolar</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 ring-1 ring-red-400"></div>
                              <span>Cysteine</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warnings */}
                      {(selectedAnalysis.extraAminoAcids.length > 0 || selectedAnalysis.aminoAcidCounts['*']) && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Warnings
                          </h4>
                          <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                            {selectedAnalysis.extraAminoAcids.length > 0 && (
                              <li>
                                The degenerate codon also encodes {selectedAnalysis.extraAminoAcids.length} extra amino acid{selectedAnalysis.extraAminoAcids.length > 1 ? 's' : ''}: {selectedAnalysis.extraAminoAcids.join(', ')}
                              </li>
                            )}
                            {selectedAnalysis.aminoAcidCounts['*'] && (
                              <li>
                                Stop codon (*) is present: {selectedAnalysis.aminoAcidCounts['*']} codon(s) ({((selectedAnalysis.aminoAcidCounts['*'] / selectedAnalysis.totalCodons) * 100).toFixed(1)}%)
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
