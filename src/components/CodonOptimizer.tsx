/**
 * Codon Optimization Tool for E. coli
 * Optimizes DNA sequences for E. coli expression
 */

import { useState } from 'react';
import { Zap, ArrowRight, Copy, AlertCircle, Info } from 'lucide-react';
import { optimizeForEcoli, reverseTranslate, CodonOptimizationResult } from '@/utils/codonOptimization';
import { useApp } from '@/contexts/AppContext';

type InputMode = 'dna' | 'protein';

export default function CodonOptimizer() {
  const { showToast } = useApp();

  const [inputMode, setInputMode] = useState<InputMode>('dna');
  const [inputSequence, setInputSequence] = useState('');
  const [result, setResult] = useState<CodonOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = () => {
    setError(null);
    setResult(null);

    try {
      if (!inputSequence.trim()) {
        setError('Please enter a sequence');
        return;
      }

      if (inputMode === 'dna') {
        const optimizationResult = optimizeForEcoli(inputSequence);
        setResult(optimizationResult);
        showToast('success', 'DNA sequence optimized for E. coli');
      } else {
        // Reverse translate protein to DNA
        const optimizedDNA = reverseTranslate(inputSequence);
        const dummyResult: CodonOptimizationResult = {
          originalSequence: '',
          optimizedSequence: optimizedDNA,
          proteinSequence: inputSequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY*]/g, ''),
          originalGC: 0,
          optimizedGC: calculateGC(optimizedDNA),
          originalCAI: 0,
          optimizedCAI: 1.0,
          identicalCodons: 0,
          changedCodons: 0,
          percentIdentity: 0,
        };
        setResult(dummyResult);
        showToast('success', 'Protein sequence reverse translated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      showToast('error', 'Optimization failed');
    }
  };

  const calculateGC = (seq: string): number => {
    const gcCount = (seq.match(/[GC]/g) || []).length;
    return (gcCount / seq.length) * 100;
  };

  const handleClear = () => {
    setInputSequence('');
    setResult(null);
    setError(null);
  };

  const handleLoadExample = () => {
    if (inputMode === 'dna') {
      // GFP gene fragment (non-optimized)
      setInputSequence('ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTGATGCAACATACGGAAAACTTACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCCATGGCCAACACTTGTCACTACTTTCGGTTATGGTGTTCAATGCTTTGCGAGATACCCAGATCATATGAAACAGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAAAGAACTATATTTTTCAAAGATGACGGGAACTACAAGACACGTGCTGAAGTCAAGTTTGAAGGTGATACCCTTGTTAATAGAATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTTGGACACAAATTGGAATACAACTATAACTCACACAATGTATACATCATGGCAGACAAACAAAAGAATGGAATCAAAGTTAACTTCAAAATTAGACACAACATTGAAGATGGAAGCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCCACACAATCTGCCCTTTCGAAAGATCCCAACGAAAAGAGAGACCACATGGTCCTTCTTGAGTTTGTAACAGCTGCTGGGATTACACATGGCATGGATGAACTATACAAATAA');
    } else {
      // GFP protein sequence
      setInputSequence('MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', `${label} copied to clipboard`);
    } catch (err) {
      showToast('error', 'Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
          E. coli Codon Optimization
        </h3>
        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p><strong>Purpose:</strong> Optimize DNA sequences for improved protein expression in E. coli</p>
          <p><strong>Method:</strong> Replaces codons with E. coli preferred codons based on K-12 strain usage frequencies</p>
          <p><strong>Input:</strong> DNA sequence (will be optimized) or Protein sequence (will be reverse translated)</p>
          <p><strong>Output:</strong> Optimized DNA sequence with improved CAI and GC content metrics</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Input Sequence
        </h3>

        {/* Mode Selection */}
        <div className="mb-4">
          <label className="input-label">Input Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('dna')}
              className={`calc-mode-tab ${inputMode === 'dna' ? 'active' : ''}`}
            >
              DNA Sequence
            </button>
            <button
              onClick={() => setInputMode('protein')}
              className={`calc-mode-tab ${inputMode === 'protein' ? 'active' : ''}`}
            >
              Protein Sequence
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="input-label">
            {inputMode === 'dna' ? 'DNA Sequence (to optimize)' : 'Protein Sequence (to reverse translate)'} *
          </label>
          <textarea
            className="input-field font-mono text-sm h-40 resize-y"
            placeholder={inputMode === 'dna'
              ? "Enter DNA sequence (ATGC)\nExample: ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTT..."
              : "Enter protein sequence (single letter codes)\nExample: MSKGEELFTGVVPILVELDGDVNGHK..."
            }
            value={inputSequence}
            onChange={(e) => setInputSequence(e.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {inputMode === 'dna'
              ? 'Enter DNA sequence. Whitespace and numbers will be removed automatically.'
              : 'Enter protein sequence using single-letter amino acid codes.'
            }
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleOptimize} className="btn-primary flex-1">
            <Zap className="w-5 h-5 mr-2" />
            {inputMode === 'dna' ? 'Optimize for E. coli' : 'Reverse Translate'}
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
          {/* Optimization Metrics */}
          {inputMode === 'dna' && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Optimization Metrics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">GC Content</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {result.originalGC.toFixed(1)}%
                    </span>
                    <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.optimizedGC.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">CAI (Codon Adaptation Index)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {result.originalCAI.toFixed(3)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.optimizedCAI.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Codons Changed</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {result.changedCodons}
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                      ({result.percentIdentity.toFixed(1)}% identical)
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {result.optimizedSequence.length} bp
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                      ({result.proteinSequence.length} aa)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                <div className="font-semibold mb-1">Note:</div>
                <div>CAI (Codon Adaptation Index) measures how well the codon usage matches E. coli preferences. Higher values (closer to 1.0) indicate better optimization.</div>
              </div>
            </div>
          )}

          {/* Sequences Display */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Optimized Sequence
            </h3>

            {/* Protein Sequence */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                  Protein Sequence ({result.proteinSequence.length} amino acids)
                </h4>
                <button
                  onClick={() => copyToClipboard(result.proteinSequence, 'Protein sequence')}
                  className="btn-icon"
                  title="Copy protein sequence"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                  {result.proteinSequence}
                </div>
              </div>
            </div>

            {/* Original DNA (if available) */}
            {inputMode === 'dna' && result.originalSequence && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                    Original DNA Sequence ({result.originalSequence.length} bp)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(result.originalSequence, 'Original sequence')}
                    className="btn-icon"
                    title="Copy original sequence"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                    {result.originalSequence}
                  </div>
                </div>
              </div>
            )}

            {/* Optimized DNA */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-700 dark:text-green-300">
                  Optimized DNA Sequence ({result.optimizedSequence.length} bp)
                </h4>
                <button
                  onClick={() => copyToClipboard(result.optimizedSequence, 'Optimized sequence')}
                  className="btn-icon"
                  title="Copy optimized sequence"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="font-mono text-sm break-all leading-relaxed text-green-900 dark:text-green-100">
                  {result.optimizedSequence}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Information */}
          <div className="card bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">
              📋 Next Steps
            </h3>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
              <p><strong>1.</strong> Copy the optimized DNA sequence above</p>
              <p><strong>2.</strong> Order as a gene synthesis or gBlock from your preferred vendor</p>
              <p><strong>3.</strong> Clone into your expression vector</p>
              <p><strong>4.</strong> The optimized sequence should express better in E. coli due to improved codon usage</p>
              <p className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700">
                <strong>Note:</strong> While codon optimization typically improves expression, actual results may vary depending on other factors like protein folding, toxicity, and culture conditions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
