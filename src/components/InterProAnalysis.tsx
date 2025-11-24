import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
  InterProMatch,
  InterProMetadata,
  AlignmentSequence,
  fetchInterProMetadata,
  fetchSeedAlignment,
} from '../services/interProApi';
import {
  ColorScheme,
  COLOR_SCHEMES,
  getAAColor,
} from '../utils/alignmentColors';

/**
 * Clean XML/HTML encoded text from InterPro descriptions
 * Converts dbxref tags, cite tags, and removes HTML tags
 */
function cleanInterProDescription(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove <p> and </p> tags
  cleaned = cleaned.replace(/<\/?p>/g, '');

  // Convert <dbxref db="X" id="Y"/> to [X:Y]
  cleaned = cleaned.replace(/<dbxref\s+db="([^"]+)"\s+id="([^"]+)"\s*\/?>/g, '[$1:$2]');

  // Convert [[cite:PUBXXXXX]] to [PUBXXXXX]
  cleaned = cleaned.replace(/\[\[cite:([^\]]+)\]\]/g, '[$1]');

  // Decode common HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, ' ');

  // Remove any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

interface InterProAnalysisProps {
  matches: InterProMatch[];
  sequenceLength: number;
  querySequence: string;
}

const InterProAnalysis: React.FC<InterProAnalysisProps> = ({
  matches,
  sequenceLength,
  querySequence,
}) => {
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<Record<string, InterProMetadata | null>>({});
  const [alignment, setAlignment] = useState<Record<string, AlignmentSequence[] | null>>({});
  const [colorScheme, setColorScheme] = useState<Record<string, ColorScheme>>({});
  const [loadingMetadata, setLoadingMetadata] = useState<Record<string, boolean>>({});
  const [loadingAlignment, setLoadingAlignment] = useState<Record<string, boolean>>({});
  const [metadataError, setMetadataError] = useState<Record<string, string>>({});
  const [alignmentError, setAlignmentError] = useState<Record<string, string>>({});
  const [elapsedTime, setElapsedTime] = useState<Record<string, number>>({});
  const timerRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Timer effect for loading operations
  useEffect(() => {
    // Start timers for any active loading operations
    Object.keys(loadingMetadata).forEach((key) => {
      if (loadingMetadata[key] && !timerRef.current[key]) {
        setElapsedTime((prev) => ({ ...prev, [key]: 0 }));
        timerRef.current[key] = setInterval(() => {
          setElapsedTime((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        }, 1000);
      } else if (!loadingMetadata[key] && timerRef.current[key]) {
        clearInterval(timerRef.current[key]!);
        timerRef.current[key] = null;
      }
    });

    Object.keys(loadingAlignment).forEach((key) => {
      const alignKey = `align_${key}`;
      if (loadingAlignment[key] && !timerRef.current[alignKey]) {
        setElapsedTime((prev) => ({ ...prev, [alignKey]: 0 }));
        timerRef.current[alignKey] = setInterval(() => {
          setElapsedTime((prev) => ({ ...prev, [alignKey]: (prev[alignKey] || 0) + 1 }));
        }, 1000);
      } else if (!loadingAlignment[key] && timerRef.current[alignKey]) {
        clearInterval(timerRef.current[alignKey]!);
        timerRef.current[alignKey] = null;
      }
    });

    // Cleanup on unmount
    return () => {
      Object.values(timerRef.current).forEach((timer) => {
        if (timer) clearInterval(timer);
      });
    };
  }, [loadingMetadata, loadingAlignment]);

  const handleToggleMatch = (index: number, accession?: string, database?: string) => {
    const newExpandedState = expandedMatch === index ? null : index;
    setExpandedMatch(newExpandedState);

    // Don't auto-fetch - let user manually click "Fetch Detailed Info" button
  };

  // Format elapsed time for loading operations
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFetchMetadata = async (accession: string, database: string) => {
    const key = `${accession}_${database}`;

    if (metadata[key]) {
      return; // Already loaded
    }

    // Clear any previous error
    setMetadataError((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });

    // Set loading state using functional update
    setLoadingMetadata((prev) => ({ ...prev, [key]: true }));

    try {
      // Ensure database name is lowercase for API
      const dbLower = database.toLowerCase();
      const meta = await fetchInterProMetadata(accession, dbLower);

      if (!meta) {
        throw new Error('No metadata available for this entry. It may be deprecated or unavailable.');
      }

      // Update metadata using functional update
      setMetadata((prev) => ({ ...prev, [key]: meta }));
    } catch (error) {
      console.error('Metadata fetch error:', error);
      // Store error message
      setMetadataError((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : 'Failed to fetch metadata',
      }));
    } finally {
      // Clear loading state using functional update
      setLoadingMetadata((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleFetchAlignment = async (accession: string, database: string) => {
    const key = `${accession}_${database}`;

    if (alignment[key]) {
      return; // Already loaded
    }

    // Clear any previous error
    setAlignmentError((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });

    // Set loading state using functional update
    setLoadingAlignment((prev) => ({ ...prev, [key]: true }));

    try {
      // Strip version number if present (e.g., PF00001.21 -> PF00001)
      const baseAccession = accession.split('.')[0];
      const dbLower = database.toLowerCase();

      const align = await fetchSeedAlignment(baseAccession, dbLower);

      if (!align || align.length === 0) {
        throw new Error('No seed alignment available for this domain. The alignment may not exist or may be unavailable.');
      }

      // Update alignment and color scheme using functional updates
      setAlignment((prev) => ({ ...prev, [key]: align }));
      setColorScheme((prev) => ({ ...prev, [key]: 'clustal2' })); // Default color scheme
    } catch (error) {
      console.error('Alignment fetch error:', error);
      setAlignment((prev) => ({ ...prev, [key]: null }));
      setAlignmentError((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : 'Failed to fetch seed alignment',
      }));
    } finally {
      // Clear loading state using functional update
      setLoadingAlignment((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleColorSchemeChange = (key: string, scheme: ColorScheme) => {
    setColorScheme((prev) => ({ ...prev, [key]: scheme }));
  };

  const renderAlignment = (sequences: AlignmentSequence[], scheme: ColorScheme) => {
    if (sequences.length === 0) {
      return <p className="text-gray-500">No alignment data available</p>;
    }

    // Fixed width for sequence names (ConSurf-style)
    const NAME_WIDTH = 25;
    const seqLength = sequences[0].sequence.length;

    // Truncate or pad sequence name to fixed width
    const formatSequenceName = (name: string): string => {
      if (name.length > NAME_WIDTH) {
        return name.substring(0, NAME_WIDTH - 3) + '...';
      }
      return name.padEnd(NAME_WIDTH, ' ');
    };

    // Position ruler - continuous, marks every 10 positions
    const rulerMarks: JSX.Element[] = [];
    for (let i = 0; i < seqLength; i++) {
      if (i % 10 === 0) {
        const label = String(i + 1);
        rulerMarks.push(
          <span key={i} className="inline-block text-center" style={{ width: `${label.length}ch` }}>
            {label}
          </span>
        );
        // Add spacing to reach next mark
        for (let j = 0; j < 10 - label.length && i + j < seqLength; j++) {
          rulerMarks.push(
            <span key={`${i}-space-${j}`} className="inline-block" style={{ width: '1ch' }}>
              {' '}
            </span>
          );
        }
      }
    }

    // Calculate conservation for ConSurf coloring
    const conservation = calculateConservationLocal(sequences.map(s => s.sequence));

    return (
      <div className="space-y-0">
        {/* Position ruler */}
        <div className="flex font-mono text-xs sticky top-0 bg-white border-b border-gray-200 z-10 pb-1">
          <span className="text-gray-600 select-none flex-shrink-0 bg-white" style={{ width: `${NAME_WIDTH}ch` }}>
            {' '}
          </span>
          <span className="text-gray-600 whitespace-nowrap pl-1">
            {rulerMarks}
          </span>
        </div>

        {/* Each sequence as one continuous line */}
        {sequences.map((seq, seqIdx) => {
          const formattedName = formatSequenceName(seq.name);

          return (
            <div key={seqIdx} className="flex font-mono text-xs hover:bg-gray-50">
              {/* Sticky name column */}
              <span
                className="text-gray-700 select-none flex-shrink-0 sticky left-0 bg-white pr-1"
                style={{ width: `${NAME_WIDTH}ch` }}
                title={seq.name}
              >
                {formattedName}
              </span>
              {/* Entire sequence as one continuous line */}
              <span className="whitespace-nowrap">
                {seq.sequence.split('').map((aa, aaIdx) => {
                  const cons = conservation[aaIdx] || 0;
                  const color = getAAColor(aa, scheme, cons);

                  // Determine text color based on scheme
                  let textColor = '#000';
                  if (scheme === 'consurf') {
                    textColor = cons > 0.5 ? '#fff' : '#000';
                  } else if (scheme !== 'none') {
                    textColor = '#fff';
                  }

                  return (
                    <span
                      key={aaIdx}
                      className="cursor-help border-r border-gray-100"
                      style={{
                        backgroundColor: color,
                        color: textColor,
                        fontWeight: cons > 0.8 ? 'bold' : 'normal',
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
      </div>
    );
  };

  // Local conservation calculation helper
  function calculateConservationLocal(sequences: string[]): number[] {
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
  };

  const renderMetadata = (meta: InterProMetadata) => {
    return (
      <div className="space-y-4">
        {/* Description */}
        {meta.description && meta.description.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Description</h4>
            {meta.description.map((desc, idx) => {
              // Description can be string or object with {text, llm, checked, updated}
              const text = typeof desc === 'string' ? desc : (desc as any)?.text || '';
              const cleanedText = cleanInterProDescription(text);
              return (
                <p key={idx} className="text-sm text-blue-800 leading-relaxed">
                  {cleanedText}
                </p>
              );
            })}
          </div>
        )}

        {/* Wikipedia */}
        {meta.wikipedia && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Wikipedia Summary</h4>
            <p className="text-sm text-yellow-800">{meta.wikipedia.extract}</p>
            <p className="text-xs text-yellow-600 mt-2">
              Source: {meta.wikipedia.title}
            </p>
          </div>
        )}

        {/* Statistics */}
        {meta.counters && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Database Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {meta.counters.proteins && (
                <div className="bg-white p-3 rounded shadow-sm border-l-4 border-purple-500">
                  <div className="text-2xl font-bold text-purple-600">
                    {meta.counters.proteins.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Proteins</div>
                </div>
              )}
              {meta.counters.structures && (
                <div className="bg-white p-3 rounded shadow-sm border-l-4 border-green-500">
                  <div className="text-2xl font-bold text-green-600">
                    {meta.counters.structures.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">3D Structures</div>
                </div>
              )}
              {meta.counters.taxa && (
                <div className="bg-white p-3 rounded shadow-sm border-l-4 border-blue-500">
                  <div className="text-2xl font-bold text-blue-600">
                    {meta.counters.taxa.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Organisms</div>
                </div>
              )}
              {meta.counters.proteomes && (
                <div className="bg-white p-3 rounded shadow-sm border-l-4 border-orange-500">
                  <div className="text-2xl font-bold text-orange-600">
                    {meta.counters.proteomes.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Proteomes</div>
                </div>
              )}
              {meta.counters.domain_architectures && (
                <div className="bg-white p-3 rounded shadow-sm border-l-4 border-pink-500">
                  <div className="text-2xl font-bold text-pink-600">
                    {meta.counters.domain_architectures.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Architectures</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Set Information (for InterPro entries that are part of a set) */}
        {meta.set_info && (
          <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-500">
            <h4 className="font-semibold text-teal-900 mb-2">Member of Set</h4>
            <p className="text-sm text-teal-800">
              <strong>{meta.set_info.name}</strong> ({meta.set_info.accession})
            </p>
          </div>
        )}

        {/* Alignment Info */}
        {meta.entry_annotations && (
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="font-semibold text-indigo-900 mb-2">Alignment Information</h4>
            <ul className="text-sm text-indigo-800 space-y-1">
              {meta.entry_annotations['alignment:seed'] && (
                <li>Seed Alignment: {meta.entry_annotations['alignment:seed']} sequences</li>
              )}
              {meta.entry_annotations['alignment:full'] && (
                <li>Full Alignment: {meta.entry_annotations['alignment:full']} sequences</li>
              )}
              {meta.entry_annotations['alignment:uniprot'] && (
                <li>UniProt Alignment: {meta.entry_annotations['alignment:uniprot']} sequences</li>
              )}
            </ul>
          </div>
        )}

        {/* Literature */}
        {meta.literature && Object.keys(meta.literature).length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Literature References</h4>
            <ul className="text-sm text-green-800 space-y-2">
              {Object.entries(meta.literature).slice(0, 3).map(([key, ref]: [string, any]) => (
                <li key={key}>
                  <strong>{ref.title}</strong>
                  <br />
                  <span className="text-xs">
                    {ref.authors?.join(', ') || 'No authors'} ({ref.year || 'N/A'})
                  </span>
                  {ref.PMID && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${ref.PMID}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-green-600 hover:underline"
                    >
                      PMID: {ref.PMID}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <p className="text-green-800">
          <strong>Analysis Complete!</strong> Found {matches.length} domain match(es) in your
          sequence ({sequenceLength} AA)
        </p>
      </div>

      {matches.map((match, index) => {
        const signature = match.signature;
        const database = signature.signatureLibraryRelease?.library || 'unknown';
        const accession = signature.accession;
        const key = `${accession}_${database}`;
        const isExpanded = expandedMatch === index;
        // Only show seed alignment button for PFAM (other databases often don't have seed alignments)
        const hasSeedAlignment = database.toUpperCase() === 'PFAM';

        // Helper to extract string from name field (can be string or {name, short} object)
        const getNameString = (name: any): string => {
          if (!name) return '';
          if (typeof name === 'string') return name;
          if (typeof name === 'object' && name.name) return name.name;
          return '';
        };

        const displayName = getNameString(signature.name) || accession;
        const entryName = signature.entry ? getNameString(signature.entry.name) : '';

        // Calculate coverage
        const totalCoverage = match.locations.reduce(
          (sum, loc) => sum + (loc.end - loc.start + 1),
          0
        );
        const coveragePercent = ((totalCoverage / sequenceLength) * 100).toFixed(1);

        return (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Match Header */}
            <button
              onClick={() => handleToggleMatch(index, accession, database)}
              className="w-full bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 p-4 text-left transition-colors border-b-2 border-purple-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">
                    {displayName}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                      {database}
                    </span>
                    <span className="px-3 py-1 bg-gray-600 text-white text-xs font-mono rounded-full">
                      {accession}
                    </span>
                    {signature.signatureLibraryRelease?.version && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                        v{signature.signatureLibraryRelease.version}
                      </span>
                    )}
                    {match.evalue && (
                      <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">
                        E: {match.evalue.toExponential(2)}
                      </span>
                    )}
                    {match.score && (
                      <span className="px-3 py-1 bg-orange-600 text-white text-xs rounded-full">
                        Score: {match.score.toFixed(1)}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-full">
                      {match.locations.length} region{match.locations.length !== 1 ? 's' : ''}
                    </span>
                    <span className="px-3 py-1 bg-teal-600 text-white text-xs rounded-full">
                      {coveragePercent}% coverage
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-6 h-6 text-purple-600 transform transition-transform flex-shrink-0 ml-4 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Match Details */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Description */}
                {signature.description && (
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm text-blue-900">
                      {cleanInterProDescription(signature.description)}
                    </p>
                  </div>
                )}

                {/* InterPro Entry */}
                {signature.entry && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm">
                      <strong>InterPro Entry:</strong>{' '}
                      <a
                        href={`https://www.ebi.ac.uk/interpro/entry/${signature.entry.accession}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {signature.entry.accession}
                      </a>
                      {entryName && ` - ${entryName}`}
                    </p>
                    {signature.entry.type && (
                      <p className="text-sm text-gray-600 mt-1">Type: {signature.entry.type}</p>
                    )}
                  </div>
                )}

                {/* Domain Visualization */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Domain Locations on Protein Sequence</h4>

                  {/* Linear Domain Map (SVG) - Fixed scaling */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <svg
                      width="100%"
                      height="120"
                      viewBox="0 0 1000 120"
                      preserveAspectRatio="xMidYMid meet"
                      className="overflow-visible"
                    >
                      {/* Protein sequence line */}
                      <line
                        x1="50"
                        y1="60"
                        x2="950"
                        y2="60"
                        stroke="#94a3b8"
                        strokeWidth="3"
                      />

                      {/* Start position marker */}
                      <text x="50" y="85" fontSize="12" fill="#64748b" textAnchor="middle" fontWeight="bold">
                        1
                      </text>

                      {/* End position marker */}
                      <text
                        x="950"
                        y="85"
                        fontSize="12"
                        fill="#64748b"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {sequenceLength}
                      </text>

                      {/* Middle marker */}
                      <text
                        x="500"
                        y="85"
                        fontSize="11"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        {Math.floor(sequenceLength / 2)}
                      </text>

                      {/* Domain blocks */}
                      {match.locations.map((loc, locIdx) => {
                        const colors = [
                          '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
                          '#ef4444', '#14b8a6', '#f97316', '#6366f1'
                        ];
                        const color = colors[locIdx % colors.length];
                        // Scale positions to fit in the 50-950 range
                        const scale = 900 / sequenceLength;
                        const xStart = 50 + ((loc.start - 1) * scale);
                        const width = (loc.end - loc.start + 1) * scale;

                        return (
                          <g key={locIdx}>
                            {/* Domain rectangle */}
                            <rect
                              x={xStart}
                              y="40"
                              width={Math.max(width, 3)}
                              height="40"
                              fill={color}
                              fillOpacity="0.8"
                              stroke={color}
                              strokeWidth="2"
                              rx="4"
                            >
                              <title>
                                Region {locIdx + 1}: {loc.start}-{loc.end}
                                {loc.evalue && `\nE-value: ${loc.evalue.toExponential(2)}`}
                                {loc.score && `\nScore: ${loc.score.toFixed(1)}`}
                              </title>
                            </rect>

                            {/* Region label */}
                            {width > 20 && (
                              <text
                                x={xStart + width / 2}
                                y="63"
                                fontSize="10"
                                fill="white"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                R{locIdx + 1}
                              </text>
                            )}

                            {/* Position labels on domain */}
                            <text
                              x={xStart + width / 2}
                              y="30"
                              fontSize="10"
                              fill={color}
                              fontWeight="600"
                              textAnchor="middle"
                            >
                              {loc.start}-{loc.end}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Domain Details Table */}
                  <div className="space-y-2">
                    {match.locations.map((loc, locIdx) => {
                      const alignedSeq = querySequence.substring(loc.start - 1, loc.end);
                      const colors = [
                        '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
                        '#ef4444', '#14b8a6', '#f97316', '#8b5cf6'
                      ];
                      const color = colors[locIdx % colors.length];

                      return (
                        <div
                          key={locIdx}
                          className="bg-gray-50 p-3 rounded border-l-4"
                          style={{ borderLeftColor: color }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">
                              Region {locIdx + 1}
                            </p>
                            <p className="text-sm text-gray-600">
                              Position {loc.start}-{loc.end} ({loc.end - loc.start + 1} AA)
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                            {loc.score && (
                              <p>
                                <strong>Score:</strong> {loc.score.toFixed(1)}
                              </p>
                            )}
                            {loc.evalue && (
                              <p>
                                <strong>E-value:</strong> {loc.evalue.toExponential(2)}
                              </p>
                            )}
                            {loc.hmmStart && loc.hmmEnd && (
                              <p>
                                <strong>HMM:</strong> {loc.hmmStart}-{loc.hmmEnd}
                              </p>
                            )}
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                              Show sequence
                            </summary>
                            <p className="mt-2 break-all bg-white p-2 rounded font-mono text-xs">
                              {alignedSeq}
                            </p>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleFetchMetadata(accession, database)}
                    disabled={loadingMetadata[key]}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    {loadingMetadata[key]
                      ? 'Loading...'
                      : metadata[key]
                      ? '✓ Detailed Info Loaded'
                      : 'Fetch Detailed Info'}
                  </button>

                  {hasSeedAlignment && (
                    <button
                      onClick={() => handleFetchAlignment(accession, database)}
                      disabled={loadingAlignment[key]}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                      {loadingAlignment[key]
                        ? 'Loading...'
                        : alignment[key]
                        ? '✓ Alignment Loaded'
                        : 'Fetch Seed Alignment'}
                    </button>
                  )}
                </div>

                {/* Prominent Loading UI for Metadata */}
                {loadingMetadata[key] && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 p-4 rounded-lg shadow-md">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-1">
                          Fetching Detailed Information
                        </h4>
                        <p className="text-sm text-blue-700">
                          Retrieving metadata for {accession} from {database}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Time elapsed: {formatElapsedTime(elapsedTime[key] || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prominent Loading UI for Alignment */}
                {loadingAlignment[key] && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 p-4 rounded-lg shadow-md">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-purple-900 mb-1">
                          Fetching Seed Alignment
                        </h4>
                        <p className="text-sm text-purple-700">
                          Retrieving sequence alignment for {accession}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Time elapsed: {formatElapsedTime(elapsedTime[`align_${key}`] || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {metadataError[key] && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          <strong>Error fetching metadata:</strong> {metadataError[key]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {alignmentError[key] && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          <strong>Error fetching alignment:</strong> {alignmentError[key]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata Display */}
                {metadata[key] && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Detailed Information</h4>
                    {renderMetadata(metadata[key]!)}
                  </div>
                )}

                {/* Alignment Display */}
                {alignment[key] && alignment[key]!.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Seed Alignment ({alignment[key]!.length} sequences)
                    </h4>

                    {/* Color Scheme Selector */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mr-2">
                        Color Scheme:
                      </label>
                      <select
                        value={colorScheme[key] || 'clustal2'}
                        onChange={(e) =>
                          handleColorSchemeChange(key, e.target.value as ColorScheme)
                        }
                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                      >
                        {Object.entries(COLOR_SCHEMES).map(([value, info]) => (
                          <option key={value} value={value}>
                            {info.name} - {info.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alignment Visualization (ConSurf-style with horizontal scrolling) */}
                    <div className="bg-white border border-gray-300 p-4 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto">
                      <div className="inline-block min-w-full">
                        {renderAlignment(alignment[key]!, colorScheme[key] || 'consurf')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InterProAnalysis;
