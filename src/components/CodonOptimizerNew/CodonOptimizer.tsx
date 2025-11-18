/**
 * Main Codon Optimizer Component
 * Ties all sub-components together
 */

import React, { useState } from 'react';
import { OptimizationRequest, OptimizationResponse } from '../../types/codon';
import { optimizeCodonSequence } from '../../utils/optimizationService';
import { extractSequence } from '../../utils/fastaParser';
import { SequenceInput } from './SequenceInput';
import { OptimizationOptions } from './OptimizationOptions';
import { ResultsSummary } from './ResultsSummary';
import { CAIChart } from './CAIChart';
import { SequenceComparison } from './SequenceComparison';
import { ManualCodonEditor } from './ManualCodonEditor';
import { EnzymeSelector } from './EnzymeSelector';
import { SessionManager } from './SessionManager';
import './CodonOptimizer.css';

export const CodonOptimizer: React.FC = () => {
  const [sequence, setSequence] = useState('');
  const [, setSequenceType] = useState<'dna' | 'protein' | 'unknown'>('unknown');
  const [options, setOptions] = useState<Partial<OptimizationRequest>>({
    remove_restriction_sites: false,
    remove_terminators: false,
    optimize_ends: false,
    end_length: 24,
  });
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>([]);
  const [showEnzymeSelector, setShowEnzymeSelector] = useState(false);
  const [result, setResult] = useState<OptimizationResponse | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'chart' | 'comparison' | 'manual'>('summary');

  const handleOptimize = async () => {
    try {
      setIsOptimizing(true);
      setError(null);

      const cleanedSequence = extractSequence(sequence);

      if (!cleanedSequence) {
        throw new Error('Please enter a sequence');
      }

      const request: OptimizationRequest = {
        sequence: cleanedSequence,
        remove_restriction_sites: options.remove_restriction_sites || false,
        remove_terminators: options.remove_terminators || false,
        selected_enzymes: selectedEnzymes.length > 0 ? selectedEnzymes : undefined,
        optimize_ends: options.optimize_ends || false,
        end_length: options.end_length || 24,
      };

      // Perform optimization
      const optimizationResult = optimizeCodonSequence(request);
      setResult(optimizationResult);
      setActiveTab('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during optimization');
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReset = () => {
    setSequence('');
    setResult(null);
    setError(null);
    setSequenceType('unknown');
  };

  const handleLoadSession = (loadedResult: OptimizationResponse) => {
    setResult(loadedResult);
    setSequence(loadedResult.original_sequence);
    setActiveTab('summary');
  };

  return (
    <div className="codon-optimizer">
      <header className="optimizer-header">
        <h1>Codon Optimizer for E. coli</h1>
        <p className="subtitle">
          Optimize DNA sequences for heterologous expression in <em>E. coli</em>
        </p>
      </header>

      <div className="optimizer-content">
        <div className="input-section">
          <SequenceInput
            value={sequence}
            onChange={setSequence}
            onSequenceTypeChange={setSequenceType}
          />

          <OptimizationOptions options={options} onChange={setOptions} />

          {options.remove_restriction_sites && (
            <div className="enzyme-selector-section">
              <button
                className="btn-secondary"
                onClick={() => setShowEnzymeSelector(!showEnzymeSelector)}
              >
                {showEnzymeSelector ? 'Hide' : 'Select'} Restriction Enzymes ({selectedEnzymes.length} selected)
              </button>
              {showEnzymeSelector && (
                <EnzymeSelector
                  selectedEnzymes={selectedEnzymes}
                  onEnzymesChange={setSelectedEnzymes}
                />
              )}
            </div>
          )}

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={handleOptimize}
              disabled={!sequence || isOptimizing}
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Sequence'}
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <SessionManager result={result} onLoadSession={handleLoadSession} />

        {result && (
          <div className="results-section">
            <div className="results-tabs">
              <button
                className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button
                className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => setActiveTab('chart')}
              >
                CAI Analysis
              </button>
              <button
                className={`tab ${activeTab === 'comparison' ? 'active' : ''}`}
                onClick={() => setActiveTab('comparison')}
              >
                Sequence Comparison
              </button>
              <button
                className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                Manual Editor
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'summary' && <ResultsSummary result={result} />}

              {activeTab === 'chart' && (
                <div className="charts-container">
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

              {activeTab === 'comparison' && <SequenceComparison result={result} />}

              {activeTab === 'manual' && <ManualCodonEditor result={result} />}
            </div>
          </div>
        )}
      </div>

      <footer className="optimizer-footer">
        <p>
          <strong>References:</strong> Sharp &amp; Li (1987) CAI algorithm; Carbone et al. (2003)
          E. coli codon usage
        </p>
      </footer>
    </div>
  );
};
