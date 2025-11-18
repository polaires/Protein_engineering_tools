/**
 * Advanced Codon Optimization Tool
 * Integrates features from Condon_adapation_web with existing app
 */

import { useState } from 'react';
import { Zap, ArrowRight, Copy, AlertCircle, Info, Download, Shield, Edit3, BarChart3, FileText } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { OptimizationRequest, OptimizationResponse } from '@/types/codon';
import { optimizeCodonSequence } from '@/utils/optimizationService';
import { extractSequence } from '@/utils/fastaParser';
import { ManualCodonEditor } from '@/components/CodonOptimizerNew/ManualCodonEditor';
import { EnhancedCAIChart, CodonUsageHeatmap, GCContentWindow } from '@/components/AdvancedVisualizations';
import { EnhancedComparisonTable } from '@/components/EnhancedComparisonTable';
import { Tooltip as TooltipComponent } from '@/components/CodonOptimizerNew/Tooltip';
import { SessionManager } from '@/components/CodonOptimizerNew/SessionManager';
import { HelpPanel } from '@/components/CodonOptimizerNew/HelpPanel';
import { GFP_EXAMPLE, GFP_PROTEIN_EXAMPLE } from '@/constants/examples';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import '@/components/CodonOptimizerNew/CodonOptimizer.css';

// Helper functions for CAI and GC interpretation
const categorizeCAI = (cai: number): { category: string; color: string; message: string } => {
  if (cai >= 0.92) {
    return {
      category: 'Excellent',
      color: '#28a745',
      message: 'Highly optimized for E. coli expression'
    };
  } else if (cai >= 0.80) {
    return {
      category: 'Good',
      color: '#28a745',
      message: 'Well optimized for E. coli'
    };
  } else if (cai >= 0.50) {
    return {
      category: 'Moderate',
      color: '#ffc107',
      message: 'Average codon usage'
    };
  } else {
    return {
      category: 'Poor',
      color: '#dc3545',
      message: 'Sub-optimal codon usage for E. coli'
    };
  }
};

const interpretGC = (gc: number): { status: string; color: string; message: string } => {
  const gcPercent = gc * 100;
  if (gcPercent >= 48 && gcPercent <= 54) {
    return {
      status: 'Optimal',
      color: '#28a745',
      message: 'Within E. coli optimal range (48-54%)'
    };
  } else if (gcPercent >= 40 && gcPercent <= 60) {
    return {
      status: 'Acceptable',
      color: '#28a745',
      message: 'Acceptable for E. coli expression'
    };
  } else if (gcPercent >= 30 && gcPercent <= 70) {
    return {
      status: 'Caution',
      color: '#ffc107',
      message: 'May affect expression efficiency'
    };
  } else {
    return {
      status: 'Warning',
      color: '#dc3545',
      message: 'Extreme GC content - may cause issues'
    };
  }
};

export default function CodonOptimizerAdvanced() {
  const { showToast } = useApp();

  // Input state
  const [inputSequence, setInputSequence] = useState('');
  const [inputMode, setInputMode] = useState<'dna' | 'protein'>('protein');

  // Optimization options
  const [removeRestrictionSites, setRemoveRestrictionSites] = useState(false);
  const [removeTerminators, setRemoveTerminators] = useState(false);
  const [optimizeEnds, setOptimizeEnds] = useState(false);
  const [endLength, setEndLength] = useState(24);

  // Enzyme selection (simplified - all common enzymes)
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>([]);

  // Results
  const [result, setResult] = useState<OptimizationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizationTime, setOptimizationTime] = useState<number | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'comparison' | 'manual' | 'advanced'>('summary');

  const commonEnzymes = ['BsaI', 'BbsI', 'BsmBI', 'SapI', 'BtgZI', 'Esp3I'];

  const handleOptimize = () => {
    setError(null);
    setResult(null);

    try {
      if (!inputSequence.trim()) {
        setError('Please enter a sequence');
        return;
      }

      setLoading(true);

      // Extract sequence from FASTA if needed
      const cleanedSequence = extractSequence(inputSequence);

      if (!cleanedSequence) {
        throw new Error('Invalid sequence');
      }

      const request: OptimizationRequest = {
        sequence: cleanedSequence,
        remove_restriction_sites: removeRestrictionSites,
        remove_terminators: removeTerminators,
        selected_enzymes: selectedEnzymes.length > 0 ? selectedEnzymes : undefined,
        optimize_ends: optimizeEnds,
        end_length: endLength,
      };

      // Perform optimization with timing
      const startTime = performance.now();
      const optimizationResult = optimizeCodonSequence(request);
      const endTime = performance.now();

      setResult(optimizationResult);
      setOptimizationTime(endTime - startTime);
      setActiveTab('summary');

      showToast('success', `Sequence optimized! CAI improved from ${optimizationResult.original_cai.toFixed(3)} to ${optimizationResult.final_cai.toFixed(3)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      showToast('error', 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputSequence('');
    setResult(null);
    setError(null);
  };

  const handleLoadExample = () => {
    // Load different example based on input mode
    const exampleSequence = inputMode === 'dna' ? GFP_EXAMPLE : GFP_PROTEIN_EXAMPLE;
    // Extract just the sequence part (without FASTA header)
    const cleanExample = extractSequence(exampleSequence);
    setInputSequence(cleanExample);
  };

  const handleLoadSession = (loadedResult: OptimizationResponse) => {
    setResult(loadedResult);
    setInputSequence(loadedResult.original_sequence);
    setActiveTab('summary');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', `${label} copied to clipboard`);
    } catch (err) {
      showToast('error', 'Failed to copy to clipboard');
    }
  };

  const downloadFasta = (sequence: string, filename: string, header: string) => {
    const fastaContent = `>${header}\n${sequence.match(/.{1,60}/g)?.join('\n') || sequence}`;
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleEnzyme = (enzyme: string) => {
    setSelectedEnzymes(prev =>
      prev.includes(enzyme)
        ? prev.filter(e => e !== enzyme)
        : [...prev, enzyme]
    );
  };

  const exportReport = () => {
    if (!result) return;

    const timestamp = new Date().toLocaleString();
    const caiCat = categorizeCAI(result.final_cai);
    const gcInterp = interpretGC(result.gc_content_final);
    const caiImprovement = ((result.final_cai - result.original_cai) / result.original_cai) * 100;

    const report = `# Codon Optimization Report
Generated: ${timestamp}

## Optimization Summary

### Performance
${optimizationTime ? `- Optimization Time: ${optimizationTime.toFixed(0)}ms` : ''}
- CAI Improvement: ${caiImprovement >= 0 ? '+' : ''}${caiImprovement.toFixed(1)}%
- Codons Changed: ${result.changes.length} / ${result.codons_final.length}
- Change Rate: ${((result.changes.length / result.codons_final.length) * 100).toFixed(1)}%
${result.restriction_sites_removed > 0 ? `- Restriction Sites Removed: ${result.restriction_sites_removed}` : ''}
${result.terminators_removed > 0 ? `- Terminators Removed: ${result.terminators_removed}` : ''}

## Metrics Analysis

### CAI Score
- Original: ${result.original_cai.toFixed(4)}
- Optimized: ${result.optimized_cai.toFixed(4)}
- Final: ${result.final_cai.toFixed(4)} (${caiCat.category})
- Interpretation: ${caiCat.message}

### GC Content
- Original: ${(result.gc_content_original * 100).toFixed(2)}%
- Final: ${(result.gc_content_final * 100).toFixed(2)}%
- Status: ${gcInterp.status}
- Interpretation: ${gcInterp.message}

### Sequence Changes
- Codons Modified: ${result.changes.length}
- Total Codons: ${result.codons_final.length}
${result.restriction_sites_found > 0 ? `- Restriction Sites Found: ${result.restriction_sites_found}` : ''}
${result.restriction_sites_removed > 0 ? `- Restriction Sites Removed: ${result.restriction_sites_removed}` : ''}
${result.terminators_found > 0 ? `- Terminators Found: ${result.terminators_found}` : ''}
${result.terminators_removed > 0 ? `- Terminators Removed: ${result.terminators_removed}` : ''}

## Result Interpretation

**Your CAI: ${result.final_cai.toFixed(4)} (${caiCat.category})**
${caiCat.message}

### Expected CAI Ranges for E. coli
- Native genes: 0.2 - 0.8 (varies by expression level)
- Optimized sequences: 0.92 - 0.98 (with constraints)
- Perfect optimization: ~1.0 (rarely achieved with constraints)

## Sequences

### Original Sequence
\`\`\`
>${result.original_sequence.length}bp
${result.original_sequence.match(/.{1,60}/g)?.join('\n') || result.original_sequence}
\`\`\`

### Optimized Sequence
\`\`\`
>${result.final_sequence.length}bp (CAI: ${result.final_cai.toFixed(4)})
${(result.final_sequence || result.optimized_sequence).match(/.{1,60}/g)?.join('\n') || (result.final_sequence || result.optimized_sequence)}
\`\`\`

### Protein Sequence
\`\`\`
>${result.protein_sequence.length}aa
${result.protein_sequence.match(/.{1,60}/g)?.join('\n') || result.protein_sequence}
\`\`\`

## Codon Changes Detail

${result.changes.length > 0 ? result.changes.slice(0, 20).map((change, idx) =>
  `${idx + 1}. Position ${change.position}: ${change.original} → ${change.optimized} (${change.amino_acid})`
).join('\n') : 'No changes made'}
${result.changes.length > 20 ? `\n... and ${result.changes.length - 20} more changes` : ''}

## Scientific References

- Sharp, P. M., & Li, W. H. (1987). The codon Adaptation Index--a measure of directional synonymous codon usage bias, and its potential applications. Nucleic Acids Research, 15(3), 1281-1295.
- Carbone, A., Zinovyev, A., & Képès, F. (2003). Codon adaptation index as a measure of dominating codon bias. Bioinformatics, 19(16), 2005-2015.

---
Generated by Codon Optimizer for E. coli
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codon_optimization_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CAI Chart Component
  const CAIChart = ({ w_i_values, codons, title }: { w_i_values: number[]; codons: string[]; title: string }) => {
    if (!w_i_values || w_i_values.length === 0) {
      return <div className="text-slate-500">No data to display</div>;
    }

    const mean = w_i_values.reduce((sum, val) => sum + val, 0) / w_i_values.length;
    const variance = w_i_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / w_i_values.length;
    const stdDev = Math.sqrt(variance);
    const maxWi = Math.max(...w_i_values);
    const minWi = Math.min(...w_i_values);

    const chartData = w_i_values.map((wi, index) => ({
      position: index + 1,
      w_i: wi,
      codon: codons[index],
      mean: mean,
    }));

    const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-lg border border-slate-200 dark:border-slate-700">
            <p className="text-sm"><strong>Position:</strong> {data.position}</p>
            <p className="text-sm"><strong>Codon:</strong> {data.codon}</p>
            <p className="text-sm"><strong>w_i:</strong> {data.w_i.toFixed(3)}</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-slate-600 dark:text-slate-400">Mean</div>
            <div className="text-lg font-bold">{mean.toFixed(3)}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-slate-600 dark:text-slate-400">Std Dev</div>
            <div className="text-lg font-bold">{stdDev.toFixed(3)}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-slate-600 dark:text-slate-400">Min</div>
            <div className="text-lg font-bold">{minWi.toFixed(3)}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-slate-600 dark:text-slate-400">Max</div>
            <div className="text-lg font-bold">{maxWi.toFixed(3)}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
            <div className="text-xs text-slate-600 dark:text-slate-400">Codons</div>
            <div className="text-lg font-bold">{w_i_values.length}</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 20, right: 60, left: 100, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="position"
              label={{ value: 'Codon Position', position: 'insideBottom', offset: -10 }}
            />
            <YAxis
              label={{ value: 'Relative Adaptiveness (w_i)', angle: -90, position: 'insideLeft', offset: 15 }}
              domain={[0, 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine
              y={mean}
              stroke="#666"
              strokeDasharray="5 5"
              label={{ value: 'Mean', position: 'right' }}
            />
            <ReferenceLine
              y={mean + stdDev}
              stroke="#999"
              strokeDasharray="3 3"
              label={{ value: '+1σ', position: 'right' }}
            />
            <ReferenceLine
              y={mean - stdDev}
              stroke="#999"
              strokeDasharray="3 3"
              label={{ value: '-1σ', position: 'right' }}
            />
            <Line
              type="monotone"
              dataKey="w_i"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name="w_i"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Help Panel */}
      <HelpPanel />

      {/* Info Card */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Advanced Codon Optimization for E. coli
          </h3>
        </div>

        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p><strong>CAI-Based Optimization:</strong> Uses Codon Adaptation Index (Sharp & Li, 1987) with E. coli K-12 codon usage</p>
          <p><strong>Features:</strong> Restriction site removal, terminator detection, terminal region optimization for PCR</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Sequence Input
          </h3>

          {/* DNA/Protein Toggle */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setInputMode('dna')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                inputMode === 'dna'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              DNA
            </button>
            <button
              onClick={() => setInputMode('protein')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                inputMode === 'protein'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Protein
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="input-label">
            {inputMode === 'dna' ? 'DNA Sequence (to optimize) *' : 'Protein Sequence (to reverse translate) *'}
          </label>
          <textarea
            className="input-field font-mono text-sm h-40 resize-y"
            placeholder={inputMode === 'dna'
              ? "Enter DNA sequence (ATGC) or FASTA format\nExample: ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTT..."
              : "Enter protein sequence (single letter codes) or FASTA format\nExample: MSKGEELFTGVVPILVELDGDVNGHK..."
            }
            value={inputSequence}
            onChange={(e) => setInputSequence(e.target.value)}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Length: {inputSequence.replace(/\s/g, '').length} {inputMode === 'dna' ? 'bp' : 'aa'}
            </div>
            {inputMode === 'dna' && inputSequence.replace(/\s/g, '').length > 0 && (
              <div className={`text-sm ${inputSequence.replace(/\s/g, '').length % 3 === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {inputSequence.replace(/\s/g, '').length % 3 === 0 ? '✓ Valid codon length' : '⚠ Length not divisible by 3'}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setInputSequence(text);
                  showToast('success', 'Sequence pasted from clipboard');
                } catch (err) {
                  showToast('error', 'Failed to read clipboard');
                }
              }}
              className="btn-secondary text-sm"
            >
              Paste from Clipboard
            </button>
            <label className="btn-secondary text-sm cursor-pointer">
              Load from File
              <input
                type="file"
                accept=".txt,.fasta,.fa,.seq"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      // Remove FASTA headers and whitespace
                      const cleanedText = text
                        .split('\n')
                        .filter(line => !line.startsWith('>'))
                        .join('')
                        .replace(/\s/g, '');
                      setInputSequence(cleanedText);
                      showToast('success', 'File loaded successfully');
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setInputSequence('');
              }}
              className="btn-secondary text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Optimization Options */}
        <div className="space-y-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200">Optimization Options</h4>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={removeRestrictionSites}
              onChange={(e) => setRemoveRestrictionSites(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Remove Restriction Sites</span>
          </label>

          {removeRestrictionSites && (
            <div className="ml-6 p-3 bg-white dark:bg-slate-700 rounded">
              <div className="text-sm font-semibold mb-2">Select Enzymes to Avoid:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonEnzymes.map(enzyme => (
                  <label key={enzyme} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEnzymes.includes(enzyme)}
                      onChange={() => toggleEnzyme(enzyme)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{enzyme}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {selectedEnzymes.length > 0 ? `${selectedEnzymes.length} selected` : 'All enzymes will be checked if none selected'}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={removeTerminators}
              onChange={(e) => setRemoveTerminators(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Remove Rho-independent Terminators</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optimizeEnds}
              onChange={(e) => setOptimizeEnds(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Optimize Terminal Regions for PCR</span>
          </label>

          {optimizeEnds && (
            <div className="ml-6">
              <label className="text-sm">
                Terminal region length (bp):
                <input
                  type="number"
                  value={endLength}
                  onChange={(e) => setEndLength(parseInt(e.target.value) || 24)}
                  min={12}
                  max={60}
                  className="input-field w-24 ml-2"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="btn-primary flex-1"
          >
            <Zap className="w-5 h-5 mr-2" />
            {loading ? 'Optimizing...' : 'Optimize for E. coli'}
          </button>
          <button onClick={handleLoadExample} className="btn-secondary">
            Load Example
          </button>
          <button onClick={handleClear} className="btn-secondary">
            Clear
          </button>
        </div>
      </div>

      {/* Session Manager */}
      <SessionManager result={result} onLoadSession={handleLoadSession} />

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
          {/* Results Summary */}
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Optimization Results
              </h3>
              <button
                onClick={exportReport}
                className="export-report-btn"
                title="Export full report as Markdown"
              >
                <FileText size={16} />
                Export Report
              </button>
            </div>

            {optimizationTime && (
              <div className="performance-metrics">
                <span>⚡ Optimization completed in {optimizationTime.toFixed(0)}ms</span>
                <span className="performance-note">
                  Expected: &lt;1000ms for 1000bp, &lt;5000ms for 5000bp
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <TooltipComponent text="Codon Adaptation Index (CAI) measures how similar your codon usage is to highly expressed E. coli genes. Values range from 0 to 1, where 1 indicates optimal codon usage. Higher CAI typically correlates with improved protein expression.">
                    <span>CAI Score</span>
                  </TooltipComponent>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {result.original_cai.toFixed(3)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-2xl font-bold" style={{ color: categorizeCAI(result.final_cai).color }}>
                    {result.final_cai.toFixed(3)}
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: categorizeCAI(result.final_cai).color }}>
                  {categorizeCAI(result.final_cai).category}
                </div>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <TooltipComponent text="GC Content is the percentage of guanine (G) and cytosine (C) bases in the DNA sequence. E. coli typically has ~50-52% GC content. Extreme GC content can affect expression, stability, and synthesis efficiency.">
                    <span>GC Content</span>
                  </TooltipComponent>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                    {(result.gc_content_original * 100).toFixed(1)}%
                  </span>
                  <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-2xl font-bold" style={{ color: interpretGC(result.gc_content_final).color }}>
                    {(result.gc_content_final * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: interpretGC(result.gc_content_final).color }}>
                  {interpretGC(result.gc_content_final).status}: {interpretGC(result.gc_content_final).message}
                </div>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Codons Changed</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {result.changes.length}
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                    / {result.codons_final.length}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {result.final_sequence.length} bp
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                    ({result.protein_sequence.length} aa)
                  </span>
                </div>
              </div>
            </div>

            {/* Additional metrics */}
            {(result.restriction_sites_found > 0 || result.terminators_found > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {result.restriction_sites_found > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        Restriction Sites
                      </div>
                    </div>
                    <div className="text-sm">
                      Found: {result.restriction_sites_found}, Removed: {result.restriction_sites_removed}
                    </div>
                  </div>
                )}

                {result.terminators_found > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      Terminators
                    </div>
                    <div className="text-sm">
                      Found: {result.terminators_found}, Removed: {result.terminators_removed}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interpretation Panel */}
            <div className="expected-results-panel">
              <h4>Result Interpretation</h4>
              <div className="interpretation-grid">
                <div className="interpretation-item">
                  <span className="interpretation-label">Your CAI:</span>
                  <span className="interpretation-value" style={{ color: categorizeCAI(result.final_cai).color }}>
                    {result.final_cai.toFixed(4)} ({categorizeCAI(result.final_cai).category})
                  </span>
                </div>
                <div className="interpretation-message" style={{ color: categorizeCAI(result.final_cai).color }}>
                  {categorizeCAI(result.final_cai).message}
                </div>
              </div>

              <div className="expected-ranges">
                <h5>Expected CAI Ranges for E. coli</h5>
                <ul>
                  <li><strong>Native genes:</strong> 0.2 - 0.8 (varies by expression level)</li>
                  <li><strong>Optimized sequences:</strong> 0.92 - 0.98 (with constraints)</li>
                  <li><strong>Perfect optimization:</strong> ~1.0 (rarely achieved with constraints)</li>
                </ul>
              </div>

              <div className="scientific-references">
                <h5>Scientific References</h5>
                <ul>
                  <li>Sharp & Li (1987) - CAI algorithm</li>
                  <li>Carbone et al. (2003) - E. coli codon usage tables</li>
                </ul>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'summary'
                    ? 'text-green-700 dark:text-green-300 border-b-2 border-green-700 dark:border-green-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sequences
              </button>
              <button
                onClick={() => setActiveTab('chart')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'chart'
                    ? 'text-green-700 dark:text-green-300 border-b-2 border-green-700 dark:border-green-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                CAI Analysis
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'comparison'
                    ? 'text-green-700 dark:text-green-300 border-b-2 border-green-700 dark:border-green-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Comparison ({result.changes.length} changes)
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === 'manual'
                    ? 'text-green-700 dark:text-green-300 border-b-2 border-green-700 dark:border-green-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Manual Editor
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === 'advanced'
                    ? 'text-green-700 dark:text-green-300 border-b-2 border-green-700 dark:border-green-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Advanced Analysis
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                {/* Optimized Sequence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-700 dark:text-green-300">
                      Optimized DNA Sequence ({result.final_sequence.length} bp)
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(result.final_sequence, 'Optimized sequence')}
                        className="btn-icon"
                        title="Copy optimized sequence"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadFasta(
                          result.final_sequence,
                          'optimized_sequence.fasta',
                          `Optimized DNA Sequence (CAI: ${result.final_cai.toFixed(4)})`
                        )}
                        className="btn-icon"
                        title="Download FASTA"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <div className="font-mono text-sm break-all leading-relaxed text-green-900 dark:text-green-100">
                      {result.final_sequence}
                    </div>
                  </div>
                </div>

                {/* Protein Sequence */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                      Protein Sequence ({result.protein_sequence.length} amino acids)
                    </h4>
                    <button
                      onClick={() => copyToClipboard(result.protein_sequence, 'Protein sequence')}
                      className="btn-icon"
                      title="Copy protein sequence"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                      {result.protein_sequence}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chart' && (
              <div className="space-y-6">
                {result.w_i_values_original.length > 0 && (
                  <CAIChart
                    w_i_values={result.w_i_values_original}
                    codons={result.codons_original}
                    title="Original Sequence"
                  />
                )}
                <CAIChart
                  w_i_values={result.w_i_values_final}
                  codons={result.codons_final}
                  title="Optimized Sequence"
                />
              </div>
            )}

            {activeTab === 'comparison' && (
              <div>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Enhanced Comparison Table
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Sort, filter, and analyze codon changes. Select specific changes for batch operations or export the full comparison data to CSV.
                  </p>
                </div>
                <EnhancedComparisonTable result={result} />
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="manual-editor-wrapper">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    Interactive Manual Codon Editor
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Fine-tune the optimization by manually selecting alternative codons from the dropdowns.
                    The CAI score updates in real-time as you make changes. All replacements are validated to ensure synonymous substitutions only.
                  </p>
                </div>
                <ManualCodonEditor
                  result={result}
                  onSequenceUpdate={() => {
                    showToast('success', 'Sequence updated - CAI recalculated');
                  }}
                />
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-8">
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Advanced Sequence Analysis
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Explore detailed visualizations including enhanced CAI charts with zoom/pan,
                    codon usage heatmaps, and GC content sliding window analysis.
                  </p>
                </div>

                {/* Enhanced CAI Charts with zoom and export */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    Enhanced CAI Visualization
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Interactive charts with zoom, pan, brush selection, and export capabilities (CSV/SVG).
                    Click the zoom icon to enable brush selection for detailed analysis.
                  </p>

                  {result.w_i_values_original.length > 0 && (
                    <EnhancedCAIChart result={result} type="original" />
                  )}

                  <EnhancedCAIChart result={result} type="optimized" />

                  {(result.restriction_sites_removed > 0 || result.terminators_removed > 0) && (
                    <EnhancedCAIChart result={result} type="final" />
                  )}
                </div>

                <div className="divider" />

                {/* Codon Usage Heatmap */}
                <div>
                  <CodonUsageHeatmap result={result} />
                </div>

                <div className="divider" />

                {/* GC Content Sliding Window */}
                <div>
                  <GCContentWindow result={result} windowSize={50} />
                </div>
              </div>
            )}
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
              <p><strong>4.</strong> The sequence has been optimized using CAI algorithm for E. coli K-12</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
