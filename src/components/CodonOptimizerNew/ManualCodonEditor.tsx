/**
 * Manual Codon Editor Component
 * Allows manual editing of individual codons with dropdown selectors
 */

import React, { useState, useMemo } from 'react';
import { OptimizationResponse } from '../../types/codon';
import { loadCodonUsageData, calculateRelativeAdaptiveness } from '../../data/codonData';
import { calculateCAI } from '../../utils/caiCalculator';

interface ManualCodonEditorProps {
  result: OptimizationResponse;
  onSequenceUpdate?: (newSequence: string) => void;
}

export const ManualCodonEditor: React.FC<ManualCodonEditorProps> = ({ result, onSequenceUpdate }) => {
  const [editedCodons, setEditedCodons] = useState<string[]>(
    result.codons_final.length > 0 ? result.codons_final : result.codons_optimized
  );
  const [filterChanged, setFilterChanged] = useState(false);
  const codonUsageData = loadCodonUsageData();

  // Calculate w_i values once
  const wValues = useMemo(() => calculateRelativeAdaptiveness(codonUsageData), []);

  const handleCodonChange = (position: number, newCodon: string) => {
    const newCodons = [...editedCodons];
    newCodons[position] = newCodon;
    setEditedCodons(newCodons);

    // Notify parent of sequence update
    const newSequence = newCodons.join('');
    onSequenceUpdate?.(newSequence);
  };

  const getAlternativeCodons = (aa: string): string[] => {
    return codonUsageData.amino_acid_groups[aa] || [];
  };

  const getCodonInfo = (codon: string) => {
    return codonUsageData.codons[codon];
  };

  const getChangedPositions = (): number[] => {
    const changed: number[] = [];
    editedCodons.forEach((codon, index) => {
      if (codon !== result.codons_optimized[index]) {
        changed.push(index);
      }
    });
    return changed;
  };

  const changedPositions = getChangedPositions();
  const displayCodons = filterChanged
    ? changedPositions.map(pos => ({ position: pos, codon: editedCodons[pos] }))
    : editedCodons.map((codon, position) => ({ position, codon }));

  // Calculate current CAI
  const currentSequence = editedCodons.join('');
  let currentCAI = 0;
  try {
    const caiResult = calculateCAI(currentSequence, codonUsageData);
    currentCAI = caiResult.cai;
  } catch (e) {
    // Ignore errors
  }

  return (
    <div className="manual-codon-editor">
      <div className="editor-header">
        <h3>Manual Codon Editor</h3>
        <div className="editor-controls">
          <label>
            <input
              type="checkbox"
              checked={filterChanged}
              onChange={(e) => setFilterChanged(e.target.checked)}
            />
            Show only manual edits ({changedPositions.length} changes)
          </label>
          <div className="current-cai">
            Current CAI: <strong>{currentCAI.toFixed(4)}</strong>
          </div>
        </div>
      </div>

      <div className="editor-description">
        <p>Select alternative codons from the dropdowns to manually fine-tune optimization.</p>
      </div>

      <div className="codon-table-container">
        <table className="codon-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>AA</th>
              <th>Original</th>
              <th>Auto-Optimized</th>
              <th>Manual Selection</th>
              <th>Freq (‰)</th>
              <th>w_i</th>
            </tr>
          </thead>
          <tbody>
            {displayCodons.map(({ position, codon }) => {
              const aa = result.protein_sequence.charAt(position);
              const originalCodon = result.codons_original[position];
              const optimizedCodon = result.codons_optimized[position];
              const alternativeCodons = getAlternativeCodons(aa);
              const currentInfo = getCodonInfo(codon);
              const isManuallyEdited = codon !== optimizedCodon;

              return (
                <tr key={position} className={isManuallyEdited ? 'manually-edited' : ''}>
                  <td>{position + 1}</td>
                  <td className="aa-cell">{aa}</td>
                  <td className="codon-cell original">{originalCodon}</td>
                  <td className="codon-cell optimized">{optimizedCodon}</td>
                  <td className="codon-cell manual">
                    <select
                      value={codon}
                      onChange={(e) => handleCodonChange(position, e.target.value)}
                      className="codon-selector"
                    >
                      {alternativeCodons.map((altCodon) => {
                        const info = getCodonInfo(altCodon);
                        const freqPer1000 = info ? (info.frequency * 1000).toFixed(1) : '?';
                        return (
                          <option key={altCodon} value={altCodon}>
                            {altCodon} ({freqPer1000}‰)
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="frequency-cell">
                    {currentInfo ? (currentInfo.frequency * 1000).toFixed(1) : '-'}
                  </td>
                  <td className="wi-cell">
                    {currentInfo && wValues[codon] ? (
                      <span className={`wi-value ${wValues[codon] > 0.7 ? 'high' : wValues[codon] > 0.4 ? 'medium' : 'low'}`}>
                        {wValues[codon].toFixed(3)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="editor-footer">
        <div className="editor-stats">
          <div className="stat-item">
            <span className="stat-label">Total Codons:</span>
            <span className="stat-value">{editedCodons.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Manual Edits:</span>
            <span className="stat-value">{changedPositions.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Original CAI:</span>
            <span className="stat-value">{result.original_cai.toFixed(4)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Auto-Optimized CAI:</span>
            <span className="stat-value">{result.optimized_cai.toFixed(4)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Current CAI:</span>
            <span className="stat-value">{currentCAI.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
