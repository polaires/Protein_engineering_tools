/**
 * Results Summary Component
 * Displays CAI metrics and optimization results
 */

import React from 'react';
import { Download, Copy } from 'lucide-react';
import { OptimizationResponse } from '../../types/codon';
import { Tooltip } from './Tooltip';

interface ResultsSummaryProps {
  result: OptimizationResponse;
  optimizationTime?: number | null;
}

// Helper function to categorize CAI
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

// Helper function to interpret GC content
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

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ result, optimizationTime }) => {
  const caiImprovement = ((result.final_cai - result.original_cai) / result.original_cai) * 100;
  const gcChange = ((result.gc_content_final - result.gc_content_original) * 100).toFixed(2);
  const caiCategory = categorizeCAI(result.final_cai);
  const gcInterpretation = interpretGC(result.gc_content_final);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="results-summary">
      <h3>Optimization Results</h3>

      {optimizationTime && (
        <div className="performance-metrics">
          <span>⚡ Optimization completed in {optimizationTime.toFixed(0)}ms</span>
          <span className="performance-note">
            Expected: &lt;1000ms for 1000bp, &lt;5000ms for 5000bp
          </span>
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <h4>
            <Tooltip text="Codon Adaptation Index (CAI) measures how similar your codon usage is to highly expressed E. coli genes. Values range from 0 to 1, where 1 indicates optimal codon usage. Higher CAI typically correlates with improved protein expression.">
              CAI Score
            </Tooltip>
          </h4>
          <div className="metric-comparison">
            <div className="metric-value">
              <span className="label">Original:</span>
              <span className="value">{result.original_cai.toFixed(4)}</span>
            </div>
            <div className="metric-value">
              <span className="label">Optimized:</span>
              <span className="value">{result.optimized_cai.toFixed(4)}</span>
            </div>
            <div className="metric-value">
              <span className="label">Final:</span>
              <span className="value highlight" style={{ color: caiCategory.color }}>
                {result.final_cai.toFixed(4)}
              </span>
            </div>
            {result.original_cai > 0 && (
              <div className="metric-improvement">
                <span className={caiImprovement >= 0 ? 'positive' : 'negative'}>
                  {caiImprovement >= 0 ? '↑' : '↓'} {Math.abs(caiImprovement).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="metric-card">
          <h4>
            <Tooltip text="GC Content is the percentage of guanine (G) and cytosine (C) bases in the DNA sequence. E. coli typically has ~50-52% GC content. Extreme GC content can affect expression, stability, and synthesis efficiency.">
              GC Content
            </Tooltip>
          </h4>
          <div className="metric-comparison">
            <div className="metric-value">
              <span className="label">Original:</span>
              <span className="value">{(result.gc_content_original * 100).toFixed(2)}%</span>
            </div>
            <div className="metric-value">
              <span className="label">Final:</span>
              <span className="value highlight" style={{ color: gcInterpretation.color }}>
                {(result.gc_content_final * 100).toFixed(2)}%
              </span>
            </div>
            <div className="metric-improvement">
              <span>{gcChange >= '0' ? '↑' : '↓'} {Math.abs(parseFloat(gcChange)).toFixed(2)}%</span>
            </div>
            <div className="gc-status" style={{ fontSize: '12px', color: gcInterpretation.color, marginTop: '8px' }}>
              {gcInterpretation.status}: {gcInterpretation.message}
            </div>
          </div>
        </div>

        <div className="metric-card">
          <h4>Sequence Changes</h4>
          <div className="metric-value">
            <span className="label">Codons modified:</span>
            <span className="value highlight">{result.changes.length}</span>
          </div>
          <div className="metric-value">
            <span className="label">Total codons:</span>
            <span className="value">{result.codons_final.length}</span>
          </div>
        </div>

        {result.restriction_sites_found > 0 && (
          <div className="metric-card">
            <h4>Restriction Sites</h4>
            <div className="metric-value">
              <span className="label">Found:</span>
              <span className="value">{result.restriction_sites_found}</span>
            </div>
            <div className="metric-value">
              <span className="label">Removed:</span>
              <span className="value highlight">{result.restriction_sites_removed}</span>
            </div>
          </div>
        )}

        {result.terminators_found > 0 && (
          <div className="metric-card">
            <h4>Terminators</h4>
            <div className="metric-value">
              <span className="label">Found:</span>
              <span className="value">{result.terminators_found}</span>
            </div>
            <div className="metric-value">
              <span className="label">Removed:</span>
              <span className="value highlight">{result.terminators_removed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Optimization Statistics Summary */}
      <div className="optimization-stats">
        <h4>Optimization Summary</h4>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-label">CAI Improvement:</span>
            <span className={`stat-value ${caiImprovement >= 0 ? 'positive' : 'negative'}`}>
              {caiImprovement >= 0 ? '+' : ''}{caiImprovement.toFixed(1)}%
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Codons Changed:</span>
            <span className="stat-value">
              {result.changes.length} / {result.codons_final.length}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Change Rate:</span>
            <span className="stat-value">
              {((result.changes.length / result.codons_final.length) * 100).toFixed(1)}%
            </span>
          </div>
          {result.restriction_sites_removed > 0 && (
            <div className="stat-box">
              <span className="stat-label">Restriction Sites Removed:</span>
              <span className="stat-value highlight-success">{result.restriction_sites_removed}</span>
            </div>
          )}
          {result.terminators_removed > 0 && (
            <div className="stat-box">
              <span className="stat-label">Terminators Removed:</span>
              <span className="stat-value highlight-success">{result.terminators_removed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expected Results Panel */}
      <div className="expected-results-panel">
        <h4>Result Interpretation</h4>
        <div className="interpretation-grid">
          <div className="interpretation-item">
            <span className="interpretation-label">Your CAI:</span>
            <span className="interpretation-value" style={{ color: caiCategory.color }}>
              {result.final_cai.toFixed(4)} ({caiCategory.category})
            </span>
          </div>
          <div className="interpretation-message" style={{ color: caiCategory.color }}>
            {caiCategory.message}
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

      <div className="sequence-output">
        <div className="output-section">
          <h4>Original Sequence</h4>
          <div className="sequence-box">
            <code>{result.original_sequence}</code>
          </div>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => copyToClipboard(result.original_sequence)}
              title="Copy to clipboard"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              className="action-btn"
              onClick={() => downloadFasta(
                result.original_sequence,
                'original_sequence.fasta',
                'Original DNA Sequence'
              )}
              title="Download FASTA"
            >
              <Download size={16} />
              Download FASTA
            </button>
          </div>
        </div>

        <div className="output-section">
          <h4>Optimized Sequence</h4>
          <div className="sequence-box">
            <code>{result.final_sequence || result.optimized_sequence}</code>
          </div>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => copyToClipboard(result.final_sequence || result.optimized_sequence)}
              title="Copy to clipboard"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              className="action-btn"
              onClick={() => downloadFasta(
                result.final_sequence || result.optimized_sequence,
                'optimized_sequence.fasta',
                `Optimized DNA Sequence (CAI: ${result.final_cai.toFixed(4)})`
              )}
              title="Download FASTA"
            >
              <Download size={16} />
              Download FASTA
            </button>
          </div>
        </div>

        <div className="output-section">
          <h4>Protein Sequence</h4>
          <div className="sequence-box">
            <code>{result.protein_sequence}</code>
          </div>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() => copyToClipboard(result.protein_sequence)}
              title="Copy to clipboard"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              className="action-btn"
              onClick={() => downloadFasta(
                result.protein_sequence,
                'protein_sequence.fasta',
                'Protein Sequence'
              )}
              title="Download FASTA"
            >
              <Download size={16} />
              Download FASTA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
