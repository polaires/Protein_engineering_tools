/**
 * ProtParam - Protein Parameter Analysis Tool
 * Computes various physical and chemical parameters for proteins
 */

import { useState } from 'react';
import { Dna, Info, AlertCircle, Droplet } from 'lucide-react';
import { analyzeProtein, ProteinAnalysisResult } from '@/utils/proteinAnalysis';
import ProteinConcentration from './ProteinConcentration';

type ProtParamTab = 'analysis' | 'concentration';

export default function ProtParam() {
  const [activeTab, setActiveTab] = useState<ProtParamTab>('analysis');
  const [sequence, setSequence] = useState('');
  const [result, setResult] = useState<ProteinAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = () => {
    setError(null);
    setResult(null);

    try {
      const analysis = analyzeProtein(sequence);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const handleClear = () => {
    setSequence('');
    setResult(null);
    setError(null);
  };

  const handleLoadExample = () => {
    // Example: Human Insulin A chain
    const exampleSeq = 'GIVEQCCTSICSLYQLENYCN';
    setSequence(exampleSeq);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          ProtParam - Protein Analysis Tool
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Compute various physical and chemical parameters for a protein sequence
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`calc-mode-tab ${activeTab === 'analysis' ? 'active' : ''}`}
          >
            <Info className="w-4 h-4 inline mr-2" />
            Sequence Analysis
          </button>
          <button
            onClick={() => setActiveTab('concentration')}
            className={`calc-mode-tab ${activeTab === 'concentration' ? 'active' : ''}`}
          >
            <Droplet className="w-4 h-4 inline mr-2" />
            Concentration Calculator
          </button>
        </div>
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <>
          {/* Input Section */}
          <div className="card">
        <div className="mb-4">
          <label className="input-label">
            Protein Sequence *
          </label>
          <textarea
            className="input-field font-mono text-sm h-32 resize-y"
            placeholder="Enter protein sequence (single letter amino acid codes)&#10;Example: MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWSTPSELGHAGLNGDILVWNPVLEDAFELSSMGIRVDADTLKHQLALTGDEDRLELEWHQALLRGEMPQTIGGGIGQSRLTMLLLQLPHIGQVQAGVWPAAVRESVPSLL"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter sequence using single-letter amino acid codes. Numbers and spaces will be removed automatically.
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleAnalyze} className="btn-primary flex-1">
            <Dna className="w-5 h-5 mr-2" />
            Analyze Protein
          </button>
          <button onClick={handleLoadExample} className="btn-secondary">
            Load Example
          </button>
          <button onClick={handleClear} className="btn-secondary">
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {result.length} aa
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Molecular Weight</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {result.molecularWeight.toFixed(2)} Da
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Theoretical pI</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {result.theoreticalPI.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Aromaticity</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {(result.aromaticity * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Physicochemical Properties */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Physicochemical Properties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">Instability Index</span>
                  <span className="font-mono font-bold text-lg">
                    {result.instabilityIndex.toFixed(2)}
                    <span className={`ml-2 text-sm ${result.instabilityIndex > 40 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {result.instabilityIndex > 40 ? 'Unstable' : 'Stable'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">Aliphatic Index</span>
                  <span className="font-mono font-bold text-lg">{result.aliphaticIndex.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">GRAVY (Hydropathicity)</span>
                  <span className="font-mono font-bold text-lg">
                    {result.gravy.toFixed(3)}
                    <span className={`ml-2 text-sm ${result.gravy > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {result.gravy > 0 ? 'Hydrophobic' : 'Hydrophilic'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="text-slate-700 dark:text-slate-300 mb-2">Extinction Coefficient (280 nm)</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">All Cys reduced:</span>
                      <span className="font-mono font-semibold">{result.extinctionCoefficient.reduced} M⁻¹cm⁻¹</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">All Cys oxidized:</span>
                      <span className="font-mono font-semibold">{result.extinctionCoefficient.oxidized} M⁻¹cm⁻¹</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                  <div className="font-semibold mb-1">Note:</div>
                  <div>Instability index &gt; 40 indicates the protein may be unstable in vitro.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Atomic Composition */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Atomic Composition
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(result.atomicComposition).map(([atom, count]) => (
                <div key={atom} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {atom}
                  </div>
                  <div className="text-lg font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {count}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Formula: C<sub>{result.atomicComposition.C}</sub>
              H<sub>{result.atomicComposition.H}</sub>
              N<sub>{result.atomicComposition.N}</sub>
              O<sub>{result.atomicComposition.O}</sub>
              S<sub>{result.atomicComposition.S}</sub>
            </div>
          </div>

          {/* Amino Acid Composition */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Amino Acid Composition
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Amino Acid</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Count</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Percentage</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.aminoAcidComposition)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([aa, count]) => {
                      const percent = result.aminoAcidPercent[aa];
                      return (
                        <tr key={aa} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-lg text-primary-700 dark:text-primary-300">{aa}</span>
                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                              {getAminoAcidName(aa)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">{count}</td>
                          <td className="p-3 text-right font-mono">{percent.toFixed(1)}%</td>
                          <td className="p-3">
                            <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                              <div
                                className="bg-primary-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sequence Display */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Cleaned Sequence
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                {result.sequence}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Concentration Calculator Tab */}
      {activeTab === 'concentration' && (
        <ProteinConcentration
          prefillProteinName={result?.sequence ? `Protein-${result.sequence.substring(0, 10)}` : undefined}
          prefillMolecularWeight={result?.molecularWeight}
          prefillExtinctionCoefficient={result?.extinctionCoefficient.reduced}
          prefillSequence={result?.sequence}
        />
      )}
    </div>
  );
}

// Helper function to get full amino acid name
function getAminoAcidName(code: string): string {
  const names: Record<string, string> = {
    A: 'Alanine',
    C: 'Cysteine',
    D: 'Aspartic acid',
    E: 'Glutamic acid',
    F: 'Phenylalanine',
    G: 'Glycine',
    H: 'Histidine',
    I: 'Isoleucine',
    K: 'Lysine',
    L: 'Leucine',
    M: 'Methionine',
    N: 'Asparagine',
    P: 'Proline',
    Q: 'Glutamine',
    R: 'Arginine',
    S: 'Serine',
    T: 'Threonine',
    V: 'Valine',
    W: 'Tryptophan',
    Y: 'Tyrosine',
  };
  return names[code] || code;
}
