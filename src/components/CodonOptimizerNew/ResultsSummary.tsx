/**
 * Results Summary Component
 * Displays CAI metrics and optimization results
 */

import React from 'react';
import { Download, Copy } from 'lucide-react';
import { OptimizationResponse } from '../../types/codon';

interface ResultsSummaryProps {
  result: OptimizationResponse;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ result }) => {
  const caiImprovement = ((result.final_cai - result.original_cai) / result.original_cai) * 100;
  const gcChange = ((result.gc_content_final - result.gc_content_original) * 100).toFixed(2);

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

      <div className="metrics-grid">
        <div className="metric-card">
          <h4>CAI Score</h4>
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
              <span className="value highlight">{result.final_cai.toFixed(4)}</span>
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
          <h4>GC Content</h4>
          <div className="metric-comparison">
            <div className="metric-value">
              <span className="label">Original:</span>
              <span className="value">{(result.gc_content_original * 100).toFixed(2)}%</span>
            </div>
            <div className="metric-value">
              <span className="label">Final:</span>
              <span className="value highlight">{(result.gc_content_final * 100).toFixed(2)}%</span>
            </div>
            <div className="metric-improvement">
              <span>{gcChange >= '0' ? '↑' : '↓'} {Math.abs(parseFloat(gcChange)).toFixed(2)}%</span>
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
