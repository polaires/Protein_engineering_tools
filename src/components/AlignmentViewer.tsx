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
  const [colorScheme, setColorScheme] = useState<ColorScheme>('consurf');
  const [showConservation, setShowConservation] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [showAllCompositions, setShowAllCompositions] = useState(false);
  const [showModerateCore, setShowModerateCore] = useState(false);
  const [showVariableCore, setShowVariableCore] = useState(false);

  if (!result.alignment) {
    return <div className="text-gray-500">No alignment data available</div>;
  }

  // Parse alignment based on format
  let sequences =
    result.alignmentFormat === 'clustal'
      ? parseClustalAlignment(result.alignment)
      : parseAlignedFasta(result.alignment);

  if (sequences.length === 0) {
    return <div className="text-gray-500">Could not parse alignment</div>;
  }

  // Elevate query protein to first position
  const queryIndex = sequences.findIndex(seq => {
    const id = seq.id.toLowerCase();
    return id.includes('query') ||
           id === 'query' ||
           id.includes('your_protein') ||
           id.includes('your protein');
  });
  if (queryIndex > 0) {
    const querySeq = sequences[queryIndex];
    sequences = [querySeq, ...sequences.slice(0, queryIndex), ...sequences.slice(queryIndex + 1)];
  }

  // Fixed width for sequence names (ConSurf-style)
  const NAME_WIDTH = 25; // characters
  const alignmentLength = sequences[0].sequence.length;

  // Calculate conservation at each position
  const conservation = calculateConservation(sequences.map(s => s.sequence));

  // Truncate or pad sequence name to fixed width
  const formatSequenceName = (name: string): string => {
    if (name.length > NAME_WIDTH) {
      return name.substring(0, NAME_WIDTH - 3) + '...';
    }
    return name.padEnd(NAME_WIDTH, ' ');
  };

  // Render continuous alignment (ConSurf-style - NO blocks, continuous horizontal lines)
  const renderAlignment = () => {
    // Position ruler - continuous, marks every 10 positions
    const rulerMarks: JSX.Element[] = [];
    for (let i = 0; i < alignmentLength; i++) {
      if (i % 10 === 0) {
        const label = String(i + 1);
        rulerMarks.push(
          <span key={i} className="inline-block text-center" style={{ width: `${label.length}ch` }}>
            {label}
          </span>
        );
        // Add spacing to reach next mark
        for (let j = 0; j < 10 - label.length && i + j < alignmentLength; j++) {
          rulerMarks.push(
            <span key={`${i}-space-${j}`} className="inline-block" style={{ width: '1ch' }}>
              {' '}
            </span>
          );
        }
      }
    }

    return (
      <div className="space-y-0">
        {/* Position ruler */}
        <div className="flex font-mono sticky top-0 bg-white border-b border-gray-200 z-10 pb-1" style={{ fontSize: `${fontSize}px` }}>
          <span className="text-gray-600 select-none flex-shrink-0 bg-white" style={{ width: `${NAME_WIDTH}ch` }}>
            {' '}
          </span>
          <span className="text-gray-600 whitespace-nowrap">
            {rulerMarks}
          </span>
        </div>

        {/* Each sequence as one continuous line */}
        {sequences.map((seq, seqIdx) => {
          const formattedName = formatSequenceName(seq.id);

          return (
            <div key={seqIdx} className="flex font-mono hover:bg-gray-50" style={{ fontSize: `${fontSize}px` }}>
              {/* Sticky name column */}
              <span
                className="text-gray-700 select-none flex-shrink-0 sticky left-0 bg-white pr-1"
                style={{ width: `${NAME_WIDTH}ch` }}
                title={seq.id}
              >
                {formattedName}
              </span>
              {/* Entire sequence as one continuous line */}
              <span className="whitespace-nowrap">
                {seq.sequence.split('').map((aa, aaIdx) => {
                  const cons = conservation[aaIdx];
                  const color = getAAColor(aa, colorScheme, cons);

                  // Determine text color based on background for readability
                  let textColor = '#000';
                  if (colorScheme === 'consurf') {
                    // ConSurf: dark text on light colors, light text on dark colors
                    textColor = cons > 0.5 ? '#fff' : '#000';
                  } else if (colorScheme !== 'none') {
                    textColor = '#fff';
                  }

                  return (
                    <span
                      key={aaIdx}
                      className="inline-block text-center relative group cursor-help border-r border-gray-100"
                      style={{
                        backgroundColor: color,
                        color: textColor,
                        fontWeight: cons > 0.8 ? 'bold' : 'normal',
                        width: '1ch',
                      }}
                      title={`Position ${aaIdx + 1}\nResidue: ${aa}\nConservation: ${(cons * 100).toFixed(0)}%`}
                    >
                      {aa}
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}

        {/* Conservation line - one continuous line */}
        {showConservation && (
          <div className="flex font-mono text-xs border-t border-gray-300 pt-1 mt-1">
            <span className="text-gray-700 select-none flex-shrink-0 sticky left-0 bg-white pr-1" style={{ width: `${NAME_WIDTH}ch` }}>
              Conservation
            </span>
            <span className="whitespace-nowrap text-gray-600 font-mono" style={{ fontSize: `${fontSize}px` }}>
              {conservation.map((cons, idx) => (
                <span
                  key={idx}
                  className="inline-block text-center border-r border-gray-100"
                  style={{ width: '1ch' }}
                  title={`Position ${idx + 1}: ${(cons * 100).toFixed(0)}%`}
                >
                  {cons > 0.9 ? '*' : cons > 0.7 ? ':' : cons > 0.5 ? '.' : ' '}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    );
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
            className="border border-gray-300 rounded px-3 py-1 text-sm bg-white"
          >
            {Object.entries(COLOR_SCHEMES).map(([value, info]) => (
              <option key={value} value={value}>
                {info.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Font Size:</label>
          <div className="flex items-center gap-1 border border-gray-300 rounded">
            <button
              onClick={() => setFontSize(Math.max(8, fontSize - 1))}
              className="px-2 py-1 hover:bg-gray-100 text-sm"
              title="Decrease font size"
            >
              −
            </button>
            <span className="px-2 text-sm font-mono">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(20, fontSize + 1))}
              className="px-2 py-1 hover:bg-gray-100 text-sm"
              title="Increase font size"
            >
              +
            </button>
          </div>
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
          className="ml-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center gap-2 shadow-md transition-all hover:shadow-lg"
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

      {/* Alignment Display with Conservation Bar Graph */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        {/* Conservation Bar Graph */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Conservation Profile
          </h5>
          <div className="flex items-end gap-px h-24 bg-white p-2 rounded border border-gray-200">
            {conservation.map((cons, idx) => (
              <div
                key={idx}
                className="flex-1 min-w-[2px] relative group cursor-pointer transition-all hover:opacity-80"
                style={{
                  height: `${cons * 100}%`,
                  backgroundColor:
                    cons > 0.9
                      ? '#10b981'
                      : cons > 0.7
                      ? '#3b82f6'
                      : cons > 0.5
                      ? '#f59e0b'
                      : '#94a3b8',
                }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                  Pos {idx + 1}: {(cons * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">{'>'}90% conserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-600">70-90%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-gray-600">50-70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span className="text-gray-600">{'<'}50%</span>
            </div>
          </div>
        </div>

        {/* Conserved Core Sequence */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-semibold text-blue-900 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Conserved Core Sequence
            </h5>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModerateCore(!showModerateCore)}
                className={`text-xs px-3 py-1 rounded ${showModerateCore ? 'bg-gray-500 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
              >
                {showModerateCore ? 'Hide' : 'Show'} Moderate (70-90%)
              </button>
              <button
                onClick={() => setShowVariableCore(!showVariableCore)}
                className={`text-xs px-3 py-1 rounded ${showVariableCore ? 'bg-gray-300 text-gray-700' : 'bg-white text-gray-700 border border-gray-300'}`}
              >
                {showVariableCore ? 'Hide' : 'Show'} Variable (&lt;70%)
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded border border-blue-200 overflow-x-auto">
            {/* Position Ruler - aligned with sequence characters */}
            <div className="font-mono text-xs text-gray-400 mb-2 whitespace-nowrap">
              {sequences[0].sequence.split('').map((_, idx) => {
                // Show position number every 10 positions
                if ((idx + 1) % 10 === 0) {
                  const label = String(idx + 1);
                  // Right-align the number so it ends at this position
                  return (
                    <span key={idx} className="inline-block text-right" style={{ width: `${label.length}ch` }}>
                      {label}
                    </span>
                  );
                } else if ((idx + 2) % 10 === 0) {
                  // Skip the position before a label (for 2-digit numbers)
                  const nextLabel = String(idx + 2);
                  if (nextLabel.length === 2) {
                    return <span key={idx} style={{ width: '1ch', display: 'inline-block' }}> </span>;
                  }
                } else if ((idx + 3) % 10 === 0) {
                  // Skip 2 positions before a label (for 3-digit numbers)
                  const nextLabel = String(idx + 3);
                  if (nextLabel.length === 3) {
                    return <span key={idx} style={{ width: '1ch', display: 'inline-block' }}> </span>;
                  }
                }
                // Default: show tick mark or space
                return (
                  <span key={idx} className="inline-block text-center" style={{ width: '1ch' }}>
                    {(idx + 1) % 5 === 0 ? '·' : ' '}
                  </span>
                );
              })}
            </div>

            {/* Core Sequence */}
            <div className="font-mono text-sm whitespace-nowrap">
              {sequences[0].sequence.split('').map((_, idx) => {
                const cons = conservation[idx];
                const aa = sequences[0].sequence[idx]; // Use first sequence as reference

                // Highly conserved (>90%)
                if (cons > 0.9 && aa !== '-' && aa !== '.') {
                  return (
                    <span
                      key={idx}
                      className="inline-block text-white font-bold text-center relative group cursor-help"
                      style={{ backgroundColor: '#10b981', width: '1ch' }}
                    >
                      {aa}
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                        Position {idx + 1}: {aa} ({(cons * 100).toFixed(0)}%)
                      </span>
                    </span>
                  );
                }
                // Moderately conserved (70-90%)
                else if (cons > 0.7 && aa !== '-' && aa !== '.') {
                  return (
                    <span
                      key={idx}
                      className="inline-block text-center relative group cursor-help"
                      style={{
                        color: showModerateCore ? '#6b7280' : 'transparent',
                        width: '1ch'
                      }}
                    >
                      {showModerateCore ? aa : '-'}
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                        Position {idx + 1}: {aa} ({(cons * 100).toFixed(0)}%)
                      </span>
                    </span>
                  );
                }
                // Variable (<70%)
                else {
                  return (
                    <span
                      key={idx}
                      className="inline-block text-center relative group cursor-help"
                      style={{
                        color: showVariableCore ? '#d1d5db' : '#e5e7eb',
                        width: '1ch'
                      }}
                    >
                      {showVariableCore && aa !== '-' && aa !== '.' ? aa : '-'}
                      {aa !== '-' && aa !== '.' && (
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                          Position {idx + 1}: {aa} ({(cons * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  );
                }
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Highly conserved (&gt;90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span>Moderately conserved (70-90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>Variable (&lt;70%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alignment Display with Horizontal Scrolling (ConSurf-style) */}
        <div className="relative">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-gray-300 rounded-lg">
            <div className="bg-white p-4 inline-block min-w-full">
              <div className="font-mono whitespace-nowrap">{renderAlignment()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Composition with Stacked Bars */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Sequence Composition
          </h5>
          {sequences.length > 5 && (
            <button
              onClick={() => setShowAllCompositions(!showAllCompositions)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAllCompositions ? 'Show Less' : `Show All (${sequences.length})`}
            </button>
          )}
        </div>
        <div className="space-y-3">
          {(showAllCompositions ? sequences : sequences.slice(0, 5)).map((seq, idx) => {
            const cleanSeq = seq.sequence.replace(/-/g, '');
            const comp = analyzeSequenceComposition(cleanSeq);
            return (
              <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-gray-700 truncate flex-1 mr-2">
                    {seq.id}
                  </span>
                  <span className="text-xs text-gray-500">{cleanSeq.length} AA</span>
                </div>
                {/* Stacked Bar */}
                <div className="flex h-8 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                  <div
                    className="flex items-center justify-center text-white text-xs font-semibold transition-all hover:opacity-90 cursor-help"
                    style={{ width: `${comp.hydrophobic}%`, backgroundColor: '#10b981' }}
                    title={`Hydrophobic: ${comp.hydrophobic}%`}
                  >
                    {comp.hydrophobic > 10 && `${comp.hydrophobic}%`}
                  </div>
                  <div
                    className="flex items-center justify-center text-white text-xs font-semibold transition-all hover:opacity-90 cursor-help"
                    style={{ width: `${comp.charged}%`, backgroundColor: '#ef4444' }}
                    title={`Charged: ${comp.charged}%`}
                  >
                    {comp.charged > 10 && `${comp.charged}%`}
                  </div>
                  <div
                    className="flex items-center justify-center text-white text-xs font-semibold transition-all hover:opacity-90 cursor-help"
                    style={{ width: `${comp.polar}%`, backgroundColor: '#3b82f6' }}
                    title={`Polar: ${comp.polar}%`}
                  >
                    {comp.polar > 10 && `${comp.polar}%`}
                  </div>
                  <div
                    className="flex items-center justify-center text-gray-700 text-xs font-semibold transition-all hover:opacity-90 cursor-help"
                    style={{ width: `${comp.other}%`, backgroundColor: '#d1d5db' }}
                    title={`Other: ${comp.other}%`}
                  >
                    {comp.other > 10 && `${comp.other}%`}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
                    <span className="text-gray-600">Hydrophobic</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-gray-600">Charged</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-gray-600">Polar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#d1d5db' }}></div>
                    <span className="text-gray-600">Other</span>
                  </div>
                </div>
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
