/**
 * Sequence Input Component
 * Handles DNA/protein sequence input with validation
 */

import React, { useState } from 'react';
import { Clipboard, FileText, Dna } from 'lucide-react';
import { detectSequenceType, getSequenceLength } from '../../utils/sequenceValidator';
import { extractSequence, isFastaFormat } from '../../utils/fastaParser';
import { GFP_EXAMPLE } from '../../constants/examples';
import { reverseTranslate } from '../../utils/codonOptimizer';
import { loadCodonUsageData } from '../../data/codonData';

interface SequenceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSequenceTypeChange?: (type: 'dna' | 'protein' | 'unknown') => void;
}

export const SequenceInput: React.FC<SequenceInputProps> = ({
  value,
  onChange,
  onSequenceTypeChange,
}) => {
  const [inputMode, setInputMode] = useState<'dna' | 'protein'>('dna');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Detect sequence type
    const extracted = extractSequence(newValue);
    const type = detectSequenceType(extracted);
    onSequenceTypeChange?.(type);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      onChange(text);

      // Detect sequence type
      const extracted = extractSequence(text);
      const type = detectSequenceType(extracted);
      onSequenceTypeChange?.(type);
    };
    reader.readAsText(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);

      // Detect sequence type
      const extracted = extractSequence(text);
      const type = detectSequenceType(extracted);
      onSequenceTypeChange?.(type);
    } catch (err) {
      console.error('Failed to read from clipboard:', err);
      alert('Failed to read from clipboard. Please paste manually.');
    }
  };

  const handleLoadExample = () => {
    onChange(GFP_EXAMPLE);
    const extracted = extractSequence(GFP_EXAMPLE);
    const type = detectSequenceType(extracted);
    onSequenceTypeChange?.(type);
  };

  const handleClear = () => {
    onChange('');
    onSequenceTypeChange?.('unknown');
  };

  const handleModeChange = (mode: 'dna' | 'protein') => {
    setInputMode(mode);

    // If switching to DNA mode and we have protein sequence, convert it
    if (mode === 'dna' && value) {
      const extracted = extractSequence(value);
      const type = detectSequenceType(extracted);

      if (type === 'protein') {
        try {
          const codonUsage = loadCodonUsageData();
          const dnaSequence = reverseTranslate(extracted, codonUsage);
          onChange(`>Reverse translated from protein\n${dnaSequence}`);
          onSequenceTypeChange?.('dna');
        } catch (err) {
          console.error('Failed to reverse translate:', err);
        }
      }
    }
  };

  const sequenceType = detectSequenceType(extractSequence(value));
  const sequenceLength = getSequenceLength(extractSequence(value));
  const isFasta = isFastaFormat(value);

  return (
    <div className="sequence-input">
      <div className="input-header">
        <h3>Sequence Input</h3>
        <div className="input-mode-toggle">
          <button
            className={`mode-btn ${inputMode === 'dna' ? 'active' : ''}`}
            onClick={() => handleModeChange('dna')}
            title="DNA sequence input"
          >
            <Dna size={16} />
            DNA
          </button>
          <button
            className={`mode-btn ${inputMode === 'protein' ? 'active' : ''}`}
            onClick={() => handleModeChange('protein')}
            title="Protein sequence input (will be reverse translated)"
          >
            Protein
          </button>
        </div>
      </div>

      <div className="input-actions">
        <button onClick={handlePasteFromClipboard} className="action-btn-compact" title="Paste from clipboard">
          <Clipboard size={14} />
        </button>
        <label className="action-btn-compact file-upload-btn" title="Upload file">
          <FileText size={14} />
          <input type="file" accept=".txt,.fasta,.fa,.seq" onChange={handleFileUpload} />
        </label>
        <button onClick={handleLoadExample} className="action-btn-compact" title="Load GFP example">
          Example
        </button>
        <button onClick={handleClear} className="action-btn-compact btn-clear" title="Clear">
          ×
        </button>
      </div>

      <textarea
        className="sequence-textarea"
        placeholder={
          inputMode === 'dna'
            ? "Enter DNA sequence (FASTA format supported)\nExample:\n>my_gene\nATGGCCATG..."
            : "Enter protein sequence\nExample:\n>my_protein\nMSKGEELFTG..."
        }
        value={value}
        onChange={handleChange}
        rows={10}
      />

      {value && (
        <div className="sequence-info-bar">
          <span className={`info-badge type-${sequenceType}`}>
            {sequenceType.toUpperCase()}{isFasta && ' (FASTA)'}
          </span>
          <span className="info-text">
            {sequenceLength} {sequenceType === 'dna' ? 'bp' : 'aa'}
            {sequenceType === 'dna' && ` · ${Math.floor(sequenceLength / 3)} codons`}
          </span>
        </div>
      )}
    </div>
  );
};
