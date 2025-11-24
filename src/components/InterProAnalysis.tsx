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
  analyzeSequenceComposition,
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

  const handleToggleMatch = (index: number) => {
    setExpandedMatch(expandedMatch === index ? null : index);
  };

  const handleFetchMetadata = async (accession: string, database: string) => {
    const key = `${accession}_${database}`;

    if (metadata[key]) {
      return; // Already loaded
    }

    setLoadingMetadata({ ...loadingMetadata, [key]: true });

    const meta = await fetchInterProMetadata(accession, database);
    setMetadata({ ...metadata, [key]: meta });
    setLoadingMetadata({ ...loadingMetadata, [key]: false });
  };

  const handleFetchAlignment = async (accession: string, database: string) => {
    const key = `${accession}_${database}`;

    if (alignment[key]) {
      return; // Already loaded
    }

    setLoadingAlignment({ ...loadingAlignment, [key]: true });

    const align = await fetchSeedAlignment(accession, database);
    setAlignment({ ...alignment, [key]: align });
    setColorScheme({ ...colorScheme, [key]: 'clustal2' }); // Default color scheme
    setLoadingAlignment({ ...loadingAlignment, [key]: false });
  };

  const handleColorSchemeChange = (key: string, scheme: ColorScheme) => {
    setColorScheme({ ...colorScheme, [key]: scheme });
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
            {meta.description.map((desc, idx) => (
              <p key={idx} className="text-sm text-blue-800 leading-relaxed">
                {desc}
              </p>
            ))}
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
        const hasPfamLikeDB = database === 'PFAM' || database === 'NCBIFAM';

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
              className="w-full bg-yellow-50 hover:bg-yellow-100 p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900">
                    Match {index + 1}: {signature.name || accession}
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    <strong>Accession:</strong> {accession} | <strong>Database:</strong> {database}
                    {signature.signatureLibraryRelease?.version &&
                      ` (v${signature.signatureLibraryRelease.version})`}
                  </p>
                </div>
                <svg
                  className={`w-6 h-6 text-yellow-600 transform transition-transform ${
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
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {signature.description && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {signature.description}
                      </p>
                    </div>
                  )}
                  {match.evalue && (
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>E-value:</strong> {match.evalue.toExponential(2)}
                      </p>
                    </div>
                  )}
                  {match.score && (
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Score:</strong> {match.score.toFixed(1)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">
                      <strong>Regions:</strong> {match.locations.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <strong>Coverage:</strong> {coveragePercent}%
                    </p>
                  </div>
                </div>

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
                      {signature.entry.name && ` - ${signature.entry.name}`}
                    </p>
                    {signature.entry.type && (
                      <p className="text-sm text-gray-600 mt-1">Type: {signature.entry.type}</p>
                    )}
                  </div>
                )}

                {/* Locations */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Domain Locations</h4>
                  {match.locations.map((loc, locIdx) => {
                    const alignedSeq = querySequence.substring(loc.start - 1, loc.end);
                    const composition = analyzeSequenceComposition(alignedSeq);

                    return (
                      <div
                        key={locIdx}
                        className="bg-gray-50 p-3 rounded mb-2 font-mono text-sm"
                      >
                        <p>
                          <strong>Region {locIdx + 1}:</strong> Position {loc.start}-{loc.end} (
                          {loc.end - loc.start + 1} AA)
                        </p>
                        {loc.score && <p>Score: {loc.score.toFixed(1)}</p>}
                        {loc.evalue && <p>E-value: {loc.evalue.toExponential(2)}</p>}
                        {loc.hmmStart && loc.hmmEnd && (
                          <p>
                            HMM: {loc.hmmStart}-{loc.hmmEnd}
                          </p>
                        )}
                        <p className="mt-2 break-all bg-white p-2 rounded">{alignedSeq}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Composition: {composition.hydrophobic}% hydrophobic, {composition.charged}%
                          charged, {composition.polar}% polar
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleFetchMetadata(accession, database)}
                    disabled={loadingMetadata[key]}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMetadata[key]
                      ? 'Loading...'
                      : metadata[key]
                      ? 'Detailed Info Loaded'
                      : 'Fetch Detailed Info'}
                  </button>

                  {hasPfamLikeDB && (
                    <button
                      onClick={() => handleFetchAlignment(accession, database)}
                      disabled={loadingAlignment[key]}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAlignment[key]
                        ? 'Loading...'
                        : alignment[key]
                        ? 'Alignment Loaded'
                        : 'Fetch Seed Alignment'}
                    </button>
                  )}

                  <a
                    href={`https://www.ebi.ac.uk/interpro/entry/${database.toLowerCase()}/${accession}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    View on InterPro
                  </a>
                </div>

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
