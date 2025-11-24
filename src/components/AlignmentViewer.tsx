import React, { useState } from 'react';
import { Download, Info } from 'lucide-react';
import {
  parseAlignedFasta,
  parseClustalAlignment,
  AlignmentResult,
} from '../services/alignmentApi';
import {
  ColorScheme,
  COLOR_SCHEMES,
  getAAColor,
  analyzeSequenceComposition,
} from '../utils/alignmentColors';

interface AlignmentViewerProps {
  result: AlignmentResult;
}

const AlignmentViewer: React.FC<AlignmentViewerProps> = ({ result }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('clustal2');
  const [showConservation, setShowConservation] = useState(true);

  if (!result.alignment) {
    return <div className="text-gray-500">No alignment data available</div>;
  }

  // Parse alignment based on format
  const sequences =
    result.alignmentFormat === 'clustal'
      ? parseClustalAlignment(result.alignment)
      : parseAlignedFasta(result.alignment);

  if (sequences.length === 0) {
    return <div className="text-gray-500">Could not parse alignment</div>;
  }

  const maxNameLen = Math.max(...sequences.map(s => s.id.length));
  const alignmentLength = sequences[0].sequence.length;
  const blockSize = 60;

  // Calculate conservation at each position
  const conservation = calculateConservation(sequences.map(s => s.sequence));

  // Render alignment in blocks
  const renderAlignment = () => {
    const blocks: JSX.Element[] = [];

    for (let pos = 0; pos < alignmentLength; pos += blockSize) {
      const end = Math.min(pos + blockSize, alignmentLength);

      // Position ruler
      const ruler: string[] = [];
      for (let i = pos; i < end; i += 10) {
        ruler.push(String(i + 1).padEnd(10, ' '));
      }

      const blockElements: JSX.Element[] = [];

      // Add ruler
      blockElements.push(
        <div key={`ruler-${pos}`} className="text-gray-400 font-mono text-xs mb-1">
          {' '.repeat((maxNameLen + 2) * 0.6)}{ruler.join('')}
        </div>
      );

      // Add sequences
      sequences.forEach((seq, seqIdx) => {
        const seqBlock = seq.sequence.substring(pos, end);
        const paddedName = seq.id.padEnd(maxNameLen, ' ');

        blockElements.push(
          <div key={`${pos}-${seqIdx}`} className="font-mono text-xs flex items-center gap-1 mb-0.5">
            <span className="text-gray-500 text-xs">{paddedName}</span>
            <span className="flex">
              {seqBlock.split('').map((aa, aaIdx) => {
                const color = getAAColor(aa, colorScheme);
                const globalPos = pos + aaIdx;
                const cons = conservation[globalPos];

                return (
                  <span
                    key={aaIdx}
                    className="px-0.5 relative group cursor-help"
                    style={{
                      backgroundColor: color,
                      color: colorScheme === 'none' ? 'inherit' : '#fff',
                      fontWeight: cons > 0.8 ? 'bold' : 'normal',
                    }}
                    title={`Position ${globalPos + 1}\nResidue: ${aa}\nConservation: ${(cons * 100).toFixed(0)}%`}
                  >
                    {aa}
                  </span>
                );
              })}
            </span>
          </div>
        );
      });

      // Add conservation line if enabled
      if (showConservation) {
        const consBlock = conservation.slice(pos, end);
        blockElements.push(
          <div key={`cons-${pos}`} className="font-mono text-xs flex items-center gap-1 mb-1">
            <span className="text-gray-400 text-xs">{' '.repeat(maxNameLen)}</span>
            <span className="flex text-xs text-gray-600">
              {consBlock.map((cons, idx) => (
                <span key={idx} className="px-0.5">
                  {cons > 0.9 ? '*' : cons > 0.7 ? ':' : cons > 0.5 ? '.' : ' '}
                </span>
              ))}
            </span>
          </div>
        );
      }

      blocks.push(
        <div key={`block-${pos}`} className="mb-6">
          {blockElements}
        </div>
      );
    }

    return blocks;
  };

  // Download alignment
  const handleDownload = () => {
    const blob = new Blob([result.alignment!], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alignment_${result.tool}_${result.jobId}.${result.alignmentFormat === 'clustal' ? 'aln' : 'fasta'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const avgIdentity = calculateAverageIdentity(sequences.map(s => s.sequence));
  const gapPercentage = calculateGapPercentage(sequences.map(s => s.sequence));

  return (
    <div className="space-y-4">
      {/* Header with statistics */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Alignment Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Tool:</span>
            <span className="ml-2 font-bold text-purple-700">{result.tool.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-gray-600">Sequences:</span>
            <span className="ml-2 font-bold text-purple-700">{sequences.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Length:</span>
            <span className="ml-2 font-bold text-purple-700">{alignmentLength} aa</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Identity:</span>
            <span className="ml-2 font-bold text-purple-700">{avgIdentity.toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-600">Gaps:</span>
            <span className="ml-2 font-bold text-purple-700">{gapPercentage.toFixed(1)}%</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Job ID:</span>
            <span className="ml-2 font-mono text-xs text-purple-700">{result.jobId}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Color Scheme:</label>
          <select
            value={colorScheme}
            onChange={e => setColorScheme(e.target.value as ColorScheme)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            {Object.entries(COLOR_SCHEMES).map(([value, info]) => (
              <option key={value} value={value}>
                {info.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showConservation}
            onChange={e => setShowConservation(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-700">Show Conservation</span>
        </label>

        <button
          onClick={handleDownload}
          className="ml-auto px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Alignment
        </button>
      </div>

      {/* Conservation Legend */}
      {showConservation && (
        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
          <strong>Conservation:</strong> * = &gt;90%, : = 70-90%, . = 50-70%, space = &lt;50%
        </div>
      )}

      {/* Alignment Display */}
      <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
        <div className="text-white">{renderAlignment()}</div>
      </div>

      {/* Sequence Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-semibold text-gray-900 mb-3">Sequence Composition</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {sequences.map((seq, idx) => {
            const cleanSeq = seq.sequence.replace(/-/g, '');
            const comp = analyzeSequenceComposition(cleanSeq);
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                <span className="font-mono text-xs font-semibold text-gray-700">
                  {seq.id.substring(0, 30)}
                </span>
                <span className="text-xs text-gray-600">
                  H:{comp.hydrophobic}% C:{comp.charged}% P:{comp.polar}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Calculate conservation at each position
 */
function calculateConservation(sequences: string[]): number[] {
  if (sequences.length === 0) return [];

  const length = sequences[0].length;
  const conservation: number[] = [];

  for (let pos = 0; pos < length; pos++) {
    const residues: Map<string, number> = new Map();
    let validCount = 0;

    for (const seq of sequences) {
      const aa = seq[pos];
      if (aa && aa !== '-' && aa !== '.') {
        residues.set(aa, (residues.get(aa) || 0) + 1);
        validCount++;
      }
    }

    if (validCount === 0) {
      conservation.push(0);
      continue;
    }

    // Calculate conservation as frequency of most common residue
    const maxCount = Math.max(...Array.from(residues.values()));
    conservation.push(maxCount / validCount);
  }

  return conservation;
}

/**
 * Calculate average pairwise identity
 */
function calculateAverageIdentity(sequences: string[]): number {
  if (sequences.length < 2) return 100;

  let totalIdentity = 0;
  let pairs = 0;

  for (let i = 0; i < sequences.length; i++) {
    for (let j = i + 1; j < sequences.length; j++) {
      totalIdentity += calculatePairwiseIdentity(sequences[i], sequences[j]);
      pairs++;
    }
  }

  return pairs > 0 ? totalIdentity / pairs : 0;
}

/**
 * Calculate pairwise identity between two sequences
 */
function calculatePairwiseIdentity(seq1: string, seq2: string): number {
  let matches = 0;
  let validPositions = 0;

  for (let i = 0; i < Math.min(seq1.length, seq2.length); i++) {
    if (seq1[i] !== '-' && seq2[i] !== '-' && seq1[i] !== '.' && seq2[i] !== '.') {
      validPositions++;
      if (seq1[i] === seq2[i]) {
        matches++;
      }
    }
  }

  return validPositions > 0 ? (matches / validPositions) * 100 : 0;
}

/**
 * Calculate gap percentage across all sequences
 */
function calculateGapPercentage(sequences: string[]): number {
  let totalGaps = 0;
  let totalPositions = 0;

  for (const seq of sequences) {
    for (const aa of seq) {
      totalPositions++;
      if (aa === '-' || aa === '.') {
        totalGaps++;
      }
    }
  }

  return totalPositions > 0 ? (totalGaps / totalPositions) * 100 : 0;
}

export default AlignmentViewer;
