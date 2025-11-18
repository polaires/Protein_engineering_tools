/**
 * Sequence Comparison Component
 * Shows before/after diff with highlighting
 */

import React, { useState } from 'react';
import { OptimizationResponse } from '../../types/codon';

interface SequenceComparisonProps {
  result: OptimizationResponse;
}

export const SequenceComparison: React.FC<SequenceComparisonProps> = ({ result }) => {
  const [showChangesOnly, setShowChangesOnly] = useState(false);

  const getCodonChanges = () => {
    const changes = new Map<number, { original: string; optimized: string }>();
    result.changes.forEach((change) => {
      changes.set(change.position, {
        original: change.original,
        optimized: change.optimized,
      });
    });
    return changes;
  };

  const renderCodonComparison = () => {
    const changes = getCodonChanges();
    const originalCodons = result.codons_original;
    const finalCodons = result.codons_final.length > 0 ? result.codons_final : result.codons_optimized;

    const codonsToShow = showChangesOnly
      ? Array.from(changes.keys())
      : Array.from({ length: finalCodons.length }, (_, i) => i);

    return (
      <div className="codon-comparison">
        <div className="comparison-info">
          <p>Changed codons are highlighted in <span className="highlight-changed">yellow</span>. Colors indicate w_i values.</p>
        </div>

        <table className="comparison-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>AA</th>
              <th>Original Codon</th>
              <th>Original w_i</th>
              <th>Optimized Codon</th>
              <th>Optimized w_i</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {codonsToShow.map((position) => {
              const change = changes.get(position);
              const isChanged = !!change;
              const aa = result.protein_sequence.charAt(position);
              const originalCodon = originalCodons[position] || '-';
              const finalCodon = finalCodons[position];
              const originalWi = result.w_i_values_original[position] || 0;
              const finalWi = result.w_i_values_final[position] || 0;

              // Color coding based on w_i value
              const getWiClass = (wi: number) => {
                if (wi > 0.7) return 'wi-high';
                if (wi > 0.4) return 'wi-medium';
                return 'wi-low';
              };

              return (
                <tr key={position} className={isChanged ? 'changed' : ''}>
                  <td className="position-cell">{position + 1}</td>
                  <td className="aa-cell">{aa}</td>
                  <td className="codon-cell original">{originalCodon}</td>
                  <td className={`wi-cell ${getWiClass(originalWi)}`}>
                    {originalWi.toFixed(3)}
                  </td>
                  <td className="codon-cell optimized">{finalCodon}</td>
                  <td className={`wi-cell ${getWiClass(finalWi)}`}>
                    {finalWi.toFixed(3)}
                  </td>
                  <td className="status-cell">
                    {isChanged ? (
                      <span className="status-changed" title="Codon was optimized">
                        Changed
                      </span>
                    ) : (
                      <span className="status-same" title="Codon unchanged">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="comparison-legend">
          <h4>Legend:</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-box wi-high"></span>
              <span>High w_i (&gt; 0.7)</span>
            </div>
            <div className="legend-item">
              <span className="legend-box wi-medium"></span>
              <span>Medium w_i (0.4 - 0.7)</span>
            </div>
            <div className="legend-item">
              <span className="legend-box wi-low"></span>
              <span>Low w_i (&lt; 0.4)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sequence-comparison-container">
      <div className="comparison-header">
        <h3>Sequence Comparison</h3>
        <div className="comparison-controls">
          <label>
            <input
              type="checkbox"
              checked={showChangesOnly}
              onChange={(e) => setShowChangesOnly(e.target.checked)}
            />
            Show changes only ({result.changes.length} changes)
          </label>
        </div>
      </div>

      <div className="comparison-tabs">
        <button className="tab-button">Codon Table</button>
      </div>

      {renderCodonComparison()}
    </div>
  );
};
