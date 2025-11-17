/**
 * Library Design Component
 * Amino acid codon library simulator for protein engineering
 */

import { useState } from 'react';
import { Dna, Plus, Trash2, Calculator, Download, HelpCircle, AlertTriangle } from 'lucide-react';

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
  'A': ['A'],
  'C': ['C'],
  'G': ['G'],
  'T': ['T'],
  'R': ['A', 'G'],        // puRine
  'Y': ['C', 'T'],        // pYrimidine
  'W': ['A', 'T'],        // Weak
  'S': ['G', 'C'],        // Strong
  'M': ['A', 'C'],        // aMino
  'K': ['G', 'T'],        // Keto
  'H': ['A', 'C', 'T'],   // not G
  'B': ['C', 'G', 'T'],   // not A
  'V': ['A', 'C', 'G'],   // not T
  'D': ['A', 'G', 'T'],   // not C
  'N': ['A', 'C', 'G', 'T'] // aNy
};

// Amino acid names
const AA_NAMES: Record<string, string> = {
  'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartic acid',
  'C': 'Cysteine', 'Q': 'Glutamine', 'E': 'Glutamic acid', 'G': 'Glycine',
  'H': 'Histidine', 'I': 'Isoleucine', 'L': 'Leucine', 'K': 'Lysine',
  'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline', 'S': 'Serine',
  'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine',
  '*': 'STOP'
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

export default function LibraryDesign() {
  const [positions, setPositions] = useState<Position[]>([
    { id: '1', name: 'Position 1', codon: 'NNK' },
    { id: '2', name: 'Position 2', codon: 'NNK' },
    { id: '3', name: 'Position 3', codon: 'NNK' }
  ]);
  const [results, setResults] = useState<PositionResult[]>([]);
  const [totalLibrarySize, setTotalLibrarySize] = useState<number>(0);
  const [showIUPAC, setShowIUPAC] = useState(false);

  // Expand degenerate codon to all possible combinations
  const expandDegenerateCodon = (degenerateCodon: string): string[] => {
    if (degenerateCodon.length !== 3) {
      throw new Error('Codon must be exactly 3 bases long');
    }

    const upper = degenerateCodon.toUpperCase();

    // Validate IUPAC codes
    for (const base of upper) {
      if (!IUPAC_CODES[base]) {
        throw new Error(`Invalid IUPAC code: ${base}`);
      }
    }

    // Expand each position
    const expandedPositions = upper.split('').map(base => IUPAC_CODES[base]);

    // Generate all combinations using Cartesian product
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
      // Expand the degenerate codon
      const allCodons = expandDegenerateCodon(position.codon);

      // Count amino acids
      const aaCounts: Record<string, number> = {};
      for (const codon of allCodons) {
        const aa = GENETIC_CODE[codon] || '?';
        aaCounts[aa] = (aaCounts[aa] || 0) + 1;
      }

      // Calculate frequencies
      const totalCodons = allCodons.length;
      const aaResults: AAResult[] = Object.entries(aaCounts).map(([aa, count]) => ({
        aa,
        count,
        frequency: (count / totalCodons) * 100,
        name: AA_NAMES[aa] || 'Unknown',
        properties: AA_PROPERTIES[aa] || { charge: 'unknown', polarity: 'unknown', size: 'unknown' }
      }));

      // Sort by frequency
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
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add position
  const addPosition = () => {
    const newId = String(Math.max(...positions.map(p => parseInt(p.id)), 0) + 1);
    setPositions([...positions, {
      id: newId,
      name: `Position ${positions.length + 1}`,
      codon: 'NNK'
    }]);
  };

  // Remove position
  const removePosition = (id: string) => {
    if (positions.length > 1) {
      setPositions(positions.filter(p => p.id !== id));
    }
  };

  // Update position
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

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.position.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {result.position.name}
                  </h3>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mt-1">
                    <div>
                      Degenerate Codon: <span className="font-mono font-semibold">{result.position.codon}</span>
                    </div>
                    <div>
                      Possible Codons: <span className="font-semibold">{result.totalCodons}</span> |
                      Unique Amino Acids: <span className="font-semibold">{result.uniqueAAs}</span>
                    </div>
                  </div>
                </div>
                {result.hasStopCodon && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      Stop: {result.stopFrequency.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {/* AA Distribution Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3">AA</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-right py-2 px-3">Frequency</th>
                      <th className="text-right py-2 px-3">Count</th>
                      <th className="text-left py-2 px-3">Charge</th>
                      <th className="text-left py-2 px-3">Polarity</th>
                      <th className="text-left py-2 px-3">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.aaResults.map((aa, aaIdx) => (
                      <tr
                        key={aaIdx}
                        className={`border-b border-slate-100 dark:border-slate-800 ${aa.aa === '*' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                      >
                        <td className="py-2 px-3 font-mono font-bold">
                          {aa.aa}
                        </td>
                        <td className="py-2 px-3">{aa.name}</td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {aa.frequency.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                          {aa.count}/{result.totalCodons}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            aa.properties.charge === 'positive' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            aa.properties.charge === 'negative' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {aa.properties.charge}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            aa.properties.polarity === 'polar' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {aa.properties.polarity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {aa.properties.size}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Summary Statistics */}
          <div className="card bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
              Library Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total Positions</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {results.length}
                </div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Library Size</div>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatLibrarySize(totalLibrarySize)}
                </div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Positions with Stop Codons</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
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
