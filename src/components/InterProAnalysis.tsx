import React, { useState } from 'react';
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

  const handleToggleMatch = (index: number) => {
    setExpandedMatch(expandedMatch === index ? null : index);
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

    const maxNameLen = Math.max(...sequences.map(s => s.name.length));
    const seqLength = sequences[0].sequence.length;
    const blockSize = 60;

    const blocks: JSX.Element[] = [];

    for (let pos = 0; pos < seqLength; pos += blockSize) {
      const end = Math.min(pos + blockSize, seqLength);

      // Position ruler
      const ruler: string[] = [];
      for (let i = pos; i < end; i += 10) {
        ruler.push(String(i + 1).padEnd(10, ' '));
      }

      const blockElements: JSX.Element[] = [];

      blockElements.push(
        <div key={`ruler-${pos}`} className="text-gray-400 ml-2 font-mono text-xs">
          {' '.repeat((maxNameLen + 2) * 0.6)}{ruler.join('')}
        </div>
      );

      // Sequences
      sequences.forEach((seq, seqIdx) => {
        const seqBlock = seq.sequence.substring(pos, end);
        const paddedName = seq.name.padEnd(maxNameLen, ' ');

        blockElements.push(
          <div key={`${pos}-${seqIdx}`} className="font-mono text-xs flex items-center gap-1 mb-0.5">
            <span className="text-gray-500">{paddedName}</span>
            <span className="flex">
              {seqBlock.split('').map((aa, aaIdx) => {
                const color = getAAColor(aa, scheme);
                return (
                  <span
                    key={aaIdx}
                    className="px-0.5"
                    style={{
                      backgroundColor: color,
                      color: scheme === 'none' ? 'inherit' : '#fff',
                    }}
                  >
                    {aa}
                  </span>
                );
              })}
            </span>
          </div>
        );
      });

      blocks.push(
        <div key={`block-${pos}`} className="mb-4">
          {blockElements}
        </div>
      );
    }

    return <div>{blocks}</div>;
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
              return (
                <p key={idx} className="text-sm text-blue-800 leading-relaxed">
                  {text}
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
            <h4 className="font-semibold text-gray-900 mb-3">Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {meta.counters.proteins && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">
                    {meta.counters.proteins.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Proteins</div>
                </div>
              )}
              {meta.counters.structures && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {meta.counters.structures.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Structures</div>
                </div>
              )}
              {meta.counters.taxa && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">
                    {meta.counters.taxa.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Taxa</div>
                </div>
              )}
            </div>
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
              onClick={() => handleToggleMatch(index)}
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
                      {signature.description}
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
                  <h4 className="font-semibold text-gray-900 mb-3">Domain Locations</h4>

                  {/* Linear Domain Map (SVG) */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <svg
                      width="100%"
                      height="120"
                      viewBox={`0 0 ${Math.max(600, sequenceLength + 100)} 120`}
                      className="overflow-visible"
                    >
                      {/* Protein sequence line */}
                      <line
                        x1="50"
                        y1="60"
                        x2={50 + sequenceLength}
                        y2="60"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />

                      {/* Start position marker */}
                      <text x="50" y="80" fontSize="10" fill="#64748b" textAnchor="middle">
                        1
                      </text>

                      {/* End position marker */}
                      <text
                        x={50 + sequenceLength}
                        y="80"
                        fontSize="10"
                        fill="#64748b"
                        textAnchor="middle"
                      >
                        {sequenceLength}
                      </text>

                      {/* Domain blocks */}
                      {match.locations.map((loc, locIdx) => {
                        const colors = [
                          '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
                          '#ef4444', '#14b8a6', '#f97316', '#8b5cf6'
                        ];
                        const color = colors[locIdx % colors.length];
                        const xStart = 50 + (loc.start - 1);
                        const width = loc.end - loc.start + 1;

                        return (
                          <g key={locIdx}>
                            {/* Domain rectangle */}
                            <rect
                              x={xStart}
                              y="40"
                              width={width}
                              height="40"
                              fill={color}
                              fillOpacity="0.7"
                              stroke={color}
                              strokeWidth="2"
                              rx="3"
                            >
                              <title>
                                Region {locIdx + 1}: {loc.start}-{loc.end}
                                {loc.evalue && `\nE-value: ${loc.evalue.toExponential(2)}`}
                                {loc.score && `\nScore: ${loc.score.toFixed(1)}`}
                              </title>
                            </rect>

                            {/* Region label */}
                            <text
                              x={xStart + width / 2}
                              y="55"
                              fontSize="9"
                              fill="white"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              R{locIdx + 1}
                            </text>

                            {/* Position labels on domain */}
                            <text
                              x={xStart + width / 2}
                              y="30"
                              fontSize="8"
                              fill={color}
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

                    {/* Alignment Visualization */}
                    <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                      {renderAlignment(alignment[key]!, colorScheme[key] || 'clustal2')}
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
