/**
 * MultipleSequenceAlignment - Standalone Multiple Sequence Alignment Tool
 * Aligns multiple protein sequences using MUSCLE or Clustal Omega
 */

import { useState } from 'react';
import { GitCompare, Loader2, AlertCircle } from 'lucide-react';
import { submitAlignment, AlignmentResult, AlignmentTool, AlignmentSequence } from '@/services/alignmentApi';
import AlignmentViewer from './AlignmentViewer';

export default function MultipleSequenceAlignment() {
  const [sequences, setSequences] = useState('');
  const [alignmentTool, setAlignmentTool] = useState<AlignmentTool>('muscle');
  const [alignmentResult, setAlignmentResult] = useState<AlignmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAlign = async () => {
    setError(null);
    setLoading(true);

    try {
      // Parse input - expect multiple FASTA sequences
      const cleanSeq = sequences.trim();
      const parsedSequences: AlignmentSequence[] = [];

      if (!cleanSeq.includes('>')) {
        setError('Please provide sequences in FASTA format (starting with > followed by a header)');
        setLoading(false);
        return;
      }

      // Parse FASTA format
      const lines = cleanSeq.split('\n');
      let currentSeq: AlignmentSequence | null = null;

      for (const line of lines) {
        if (line.startsWith('>')) {
          if (currentSeq && currentSeq.sequence) {
            parsedSequences.push(currentSeq);
          }
          currentSeq = { id: line.substring(1).trim() || `Seq${parsedSequences.length + 1}`, sequence: '' };
        } else if (currentSeq) {
          currentSeq.sequence += line.replace(/\s/g, '').toUpperCase();
        }
      }

      if (currentSeq && currentSeq.sequence) {
        parsedSequences.push(currentSeq);
      }

      if (parsedSequences.length < 2) {
        setError('At least 2 sequences required for alignment. Use FASTA format with > headers.');
        setLoading(false);
        return;
      }

      // Submit alignment
      const alignData = await submitAlignment(parsedSequences, alignmentTool);
      setAlignmentResult(alignData);

      if (!alignData.success && alignData.error) {
        setError(alignData.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alignment failed');
      setAlignmentResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSequences('');
    setAlignmentResult(null);
    setError(null);
  };

  const handleLoadExample = () => {
    const example = `>Human_Insulin_A_Chain
GIVEQCCTSICSLYQLENYCN
>Porcine_Insulin_A_Chain
GIVEQCCTSICSLYQLENYCN
>Bovine_Insulin_A_Chain
GIVEQCCASVCSLYQLENYCN
>Rat_Insulin_A_Chain
GIVDQCCTSICSLYQLENYCN`;
    setSequences(example);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <GitCompare className="w-7 h-7" />
          Multiple Sequence Alignment
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Align multiple protein sequences using MUSCLE or Clustal Omega
        </p>
      </div>

      {/* Input Section */}
      <div className="card">
        <div className="mb-4">
          <label className="input-label">
            Sequences (FASTA format) *
          </label>
          <textarea
            className="input-field font-mono text-sm h-64 resize-y"
            placeholder="Enter multiple sequences in FASTA format:&#10;>Sequence_1&#10;MKTAYIAKQRQISFVKSHFSRQ...&#10;>Sequence_2&#10;MKTAYIAKQRQISFVKTHFSRQ..."
            value={sequences}
            onChange={(e) => setSequences(e.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter at least 2 sequences in FASTA format. Each sequence must start with {'>'} followed by a header.
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Alignment Tool:
            </label>
            <select
              value={alignmentTool}
              onChange={(e) => setAlignmentTool(e.target.value as AlignmentTool)}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800"
              disabled={loading}
            >
              <option value="muscle">MUSCLE (fast, recommended)</option>
              <option value="clustalo">Clustal Omega</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAlign}
              className="btn-primary flex-1"
              disabled={loading || !sequences.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Aligning with {alignmentTool.toUpperCase()}...
                </>
              ) : (
                <>
                  <GitCompare className="w-5 h-5 mr-2" />
                  Align Sequences
                </>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={handleLoadExample} className="btn-secondary">
              Load Example
            </button>
            <button onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          </div>
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

      {/* Alignment Results */}
      {alignmentResult && alignmentResult.success && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Alignment Results
          </h3>

          <AlignmentViewer result={alignmentResult} />
        </div>
      )}
    </div>
  );
}
