/**
 * Library Design Component
 * Amino acid codon library simulator for protein engineering
 */

import { useState } from 'react';
import { Dna, Plus, Trash2, Calculator, Download, HelpCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

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

// IUPAC degenerate base codes
const IUPAC_CODES: Record<string, string[]> = {
  'A': ['A'], 'C': ['C'], 'G': ['G'], 'T': ['T'],
  'R': ['A', 'G'], 'Y': ['C', 'T'], 'W': ['A', 'T'], 'S': ['G', 'C'],
  'M': ['A', 'C'], 'K': ['G', 'T'], 'H': ['A', 'C', 'T'], 'B': ['C', 'G', 'T'],
  'V': ['A', 'C', 'G'], 'D': ['A', 'G', 'T'], 'N': ['A', 'C', 'G', 'T']
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

export default function LibraryDesign() {
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', name: 'Position 1', codon: 'NNK' },
    { id: '2', name: 'Position 2', codon: 'NNK' },
    { id: '3', name: 'Position 3', codon: 'NNK' }
  ]);
  const [results, setResults] = useState<PositionResult[]>([]);
  const [totalLibrarySize, setTotalLibrarySize] = useState<number>(0);
  const [showIUPAC, setShowIUPAC] = useState(false);
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

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
          Use IUPAC notation to specify amino acid diversity at each position.
        </p>
      </div>

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
    </div>
  );
}
