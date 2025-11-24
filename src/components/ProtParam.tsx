/**
 * ProtParam - Protein Parameter Analysis Tool
 * Computes various physical and chemical parameters for proteins
 */

import { useState, useEffect, useRef } from 'react';
import { Dna, Info, AlertCircle, Droplet, Search, Loader2, Database, GitCompare } from 'lucide-react';
import { analyzeProtein, ProteinAnalysisResult } from '@/utils/proteinAnalysis';
import { searchPfamDomains, PfamSearchResult } from '@/services/pfamApi';
import { submitInterProScan, InterProResult, fetchSeedAlignment, fetchInterProMetadata, InterProMetadata } from '@/services/interProApi';
import { submitAlignment, AlignmentResult, AlignmentTool, AlignmentSequence } from '@/services/alignmentApi';
import ProteinConcentration from './ProteinConcentration';
import InterProAnalysis from './InterProAnalysis';
import AlignmentViewer from './AlignmentViewer';
import MultipleSequenceAlignment from './MultipleSequenceAlignment';

type ProtParamTab = 'analysis' | 'concentration' | 'alignment';

export default function ProtParam() {
  const [activeTab, setActiveTab] = useState<ProtParamTab>('analysis');
  const [sequence, setSequence] = useState('');
  const [result, setResult] = useState<ProteinAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pfamResult, setPfamResult] = useState<PfamSearchResult | null>(null);
  const [pfamLoading, setPfamLoading] = useState(false);
  const [interProResult, setInterProResult] = useState<InterProResult | null>(null);
  const [interProLoading, setInterProLoading] = useState(false);
  const [interProElapsedTime, setInterProElapsedTime] = useState(0);
  const alignmentTool: AlignmentTool = 'muscle'; // Default alignment tool for Pfam domains
  const [pfamAlignmentLoading, setPfamAlignmentLoading] = useState<Record<string, boolean>>({});
  const [pfamAlignmentResults, setPfamAlignmentResults] = useState<Record<string, AlignmentResult | null>>({});
  const [pfamMetadata, setPfamMetadata] = useState<Record<string, InterProMetadata | null>>({});
  const interProTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect for InterProScan
  useEffect(() => {
    if (interProLoading) {
      setInterProElapsedTime(0);
      interProTimerRef.current = setInterval(() => {
        setInterProElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (interProTimerRef.current) {
        clearInterval(interProTimerRef.current);
        interProTimerRef.current = null;
      }
    }

    return () => {
      if (interProTimerRef.current) {
        clearInterval(interProTimerRef.current);
      }
    };
  }, [interProLoading]);

  // Format elapsed time and estimate
  const formatInterProProgress = (elapsedSeconds: number) => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeStr = minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${seconds}s`;

    // Estimate: InterProScan typically takes 2-10 minutes
    // Provide estimate based on sequence length
    const sequenceLength = sequence.replace(/^>.*$/gm, '').replace(/\s/g, '').length;
    const estimatedMinutes = Math.max(2, Math.min(10, Math.ceil(sequenceLength / 100)));
    const estimateStr = estimatedMinutes === 1 ? '1 minute' : `${estimatedMinutes} minutes`;

    return { timeStr, estimateStr };
  };

  const handleAnalyze = () => {
    setError(null);
    setResult(null);

    try {
      const analysis = analyzeProtein(sequence);
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const handleClear = () => {
    setSequence('');
    setResult(null);
    setError(null);
    setPfamResult(null);
    setInterProResult(null);
    setPfamAlignmentResults({});
    setPfamAlignmentLoading({});
    setPfamMetadata({});
  };

  const handleLoadExample = () => {
    // Example: Human Insulin A chain
    const exampleSeq = 'GIVEQCCTSICSLYQLENYCN';
    setSequence(exampleSeq);
  };

  const handleSearchPfam = async () => {
    setError(null);
    setPfamLoading(true);

    try {
      const pfamData = await searchPfamDomains(sequence);
      setPfamResult(pfamData);

      if (!pfamData.success && pfamData.error) {
        setError(pfamData.error);
      } else if (pfamData.success && pfamData.domains.length > 0) {
        // Automatically fetch metadata for each Pfam domain to enrich results
        enrichPfamResults(pfamData.domains);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pfam search failed');
      setPfamResult(null);
    } finally {
      setPfamLoading(false);
    }
  };

  // Fetch InterPro metadata and auto-align Pfam results
  const enrichPfamResults = async (domains: any[]) => {
    for (const domain of domains) {
      const accession = domain.acc.split('.')[0]; // Strip version number

      // Fetch metadata
      try {
        const meta = await fetchInterProMetadata(accession, 'pfam');
        if (meta) {
          setPfamMetadata((prev) => ({ ...prev, [accession]: meta }));
        }
      } catch (error) {
        console.error(`Failed to fetch metadata for ${accession}:`, error);
      }

      // Auto-trigger alignment for this domain
      handleAlignPfamDomain(domain.acc);
    }
  };

  const handleSearchInterPro = async () => {
    setError(null);
    setInterProLoading(true);

    try {
      const interProData = await submitInterProScan(sequence);
      setInterProResult(interProData);

      if (!interProData.success && interProData.error) {
        setError(interProData.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'InterPro search failed');
      setInterProResult(null);
    } finally {
      setInterProLoading(false);
    }
  };

  const handleAlignPfamDomain = async (pfamAccession: string) => {
    const baseAccession = pfamAccession.split('.')[0];

    // Set loading state for this domain
    setPfamAlignmentLoading((prev) => ({ ...prev, [baseAccession]: true }));

    try {
      console.log(`Fetching seed alignment for ${pfamAccession} (using base accession: ${baseAccession})`);

      // Fetch seed alignment for this Pfam domain
      const seedAlignment = await fetchSeedAlignment(baseAccession, 'pfam');

      if (!seedAlignment || seedAlignment.length === 0) {
        console.error(`No seed alignment available for ${baseAccession}`);
        setPfamAlignmentLoading((prev) => ({ ...prev, [baseAccession]: false }));
        setPfamAlignmentResults((prev) => ({ ...prev, [baseAccession]: null }));
        return;
      }

      console.log(`Found ${seedAlignment.length} sequences in seed alignment for ${baseAccession}`);

      // Convert to AlignmentSequence format and include query sequence
      const sequences: AlignmentSequence[] = [
        {
          id: 'Your_Protein',
          sequence: sequence.replace(/^>.*$/gm, '').replace(/\s/g, '').toUpperCase(),
        },
        ...seedAlignment.slice(0, 50).map(seq => ({
          id: seq.name,
          sequence: seq.sequence.replace(/-/g, ''), // Remove existing gaps
        })),
      ];

      // Run alignment
      const alignData = await submitAlignment(sequences, alignmentTool);

      // Store result for this domain
      setPfamAlignmentResults((prev) => ({ ...prev, [baseAccession]: alignData }));

      if (!alignData.success && alignData.error) {
        console.error(`Alignment failed for ${baseAccession}: ${alignData.error}`);
      }
    } catch (err) {
      console.error(`Pfam alignment failed for ${baseAccession}:`, err);
      setPfamAlignmentResults((prev) => ({ ...prev, [baseAccession]: null }));
    } finally {
      setPfamAlignmentLoading((prev) => ({ ...prev, [baseAccession]: false }));
    }
  };

  // Helper functions for interpreting E-values and bit scores
  const interpretEvalue = (evalue: number): { text: string; color: string } => {
    if (evalue < 1e-100) {
      return { text: 'Extremely significant', color: 'text-green-700 dark:text-green-400' };
    } else if (evalue < 1e-50) {
      return { text: 'Highly significant', color: 'text-green-600 dark:text-green-400' };
    } else if (evalue < 1e-10) {
      return { text: 'Very significant', color: 'text-blue-600 dark:text-blue-400' };
    } else if (evalue < 1e-5) {
      return { text: 'Significant', color: 'text-blue-500 dark:text-blue-400' };
    } else if (evalue < 0.01) {
      return { text: 'Marginally significant', color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { text: 'Not significant', color: 'text-gray-500 dark:text-gray-400' };
    }
  };

  const interpretBitScore = (bitScore: number): { text: string; color: string } => {
    if (bitScore > 200) {
      return { text: 'Excellent match', color: 'text-green-700 dark:text-green-400' };
    } else if (bitScore > 100) {
      return { text: 'Very good match', color: 'text-green-600 dark:text-green-400' };
    } else if (bitScore > 50) {
      return { text: 'Good match', color: 'text-blue-600 dark:text-blue-400' };
    } else if (bitScore > 30) {
      return { text: 'Moderate match', color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { text: 'Weak match', color: 'text-gray-500 dark:text-gray-400' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          ProtParam - Protein Analysis Tool
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Compute various physical and chemical parameters for a protein sequence
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`calc-mode-tab ${activeTab === 'analysis' ? 'active' : ''}`}
          >
            <Info className="w-4 h-4 inline mr-2" />
            Sequence Analysis
          </button>
          <button
            onClick={() => setActiveTab('concentration')}
            className={`calc-mode-tab ${activeTab === 'concentration' ? 'active' : ''}`}
          >
            <Droplet className="w-4 h-4 inline mr-2" />
            Concentration Calculator
          </button>
          <button
            onClick={() => setActiveTab('alignment')}
            className={`calc-mode-tab ${activeTab === 'alignment' ? 'active' : ''}`}
          >
            <GitCompare className="w-4 h-4 inline mr-2" />
            Multiple Sequence Alignment
          </button>
        </div>
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <>
          {/* Input Section */}
          <div className="card">
        <div className="mb-4">
          <label className="input-label">
            Protein Sequence *
          </label>
          <textarea
            className="input-field font-mono text-sm h-32 resize-y"
            placeholder="Enter protein sequence (single letter amino acid codes)&#10;Example: MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWSTPSELGHAGLNGDILVWNPVLEDAFELSSMGIRVDADTLKHQLALTGDEDRLELEWHQALLRGEMPQTIGGGIGQSRLTMLLLQLPHIGQVQAGVWPAAVRESVPSLL"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter sequence using single-letter amino acid codes. Numbers and spaces will be removed automatically.
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button onClick={handleAnalyze} className="btn-primary flex-1">
              <Dna className="w-5 h-5 mr-2" />
              Analyze Protein
            </button>
            <button
              onClick={handleSearchPfam}
              className="btn-primary flex-1"
              disabled={pfamLoading || !sequence.trim()}
            >
              {pfamLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Searching Pfam...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Search Pfam Domains
                </>
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSearchInterPro}
              className="btn-primary flex-1"
              disabled={interProLoading || !sequence.trim()}
            >
              {interProLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span className="flex flex-col items-start">
                    <span>Analysis in progress</span>
                    <span className="text-xs opacity-80">
                      {formatInterProProgress(interProElapsedTime).timeStr} elapsed
                      (est. {formatInterProProgress(interProElapsedTime).estimateStr})
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Full InterProScan Analysis
                </>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={handleLoadExample} className="btn-secondary">
              Load Example
            </button>
            <button onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {result.length} aa
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Molecular Weight</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {result.molecularWeight.toFixed(2)} Da
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Theoretical pI</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {result.theoreticalPI.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Aromaticity</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {(result.aromaticity * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Physicochemical Properties */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Physicochemical Properties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">Instability Index</span>
                  <span className="font-mono font-bold text-lg">
                    {result.instabilityIndex.toFixed(2)}
                    <span className={`ml-2 text-sm ${result.instabilityIndex > 40 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {result.instabilityIndex > 40 ? 'Unstable' : 'Stable'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">Aliphatic Index</span>
                  <span className="font-mono font-bold text-lg">{result.aliphaticIndex.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-700 dark:text-slate-300">GRAVY (Hydropathicity)</span>
                  <span className="font-mono font-bold text-lg">
                    {result.gravy.toFixed(3)}
                    <span className={`ml-2 text-sm ${result.gravy > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {result.gravy > 0 ? 'Hydrophobic' : 'Hydrophilic'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="text-slate-700 dark:text-slate-300 mb-2">Extinction Coefficient (280 nm)</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">All Cys reduced:</span>
                      <span className="font-mono font-semibold">{result.extinctionCoefficient.reduced} M⁻¹cm⁻¹</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">All Cys oxidized:</span>
                      <span className="font-mono font-semibold">{result.extinctionCoefficient.oxidized} M⁻¹cm⁻¹</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                  <div className="font-semibold mb-1">Note:</div>
                  <div>Instability index &gt; 40 indicates the protein may be unstable in vitro.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Atomic Composition */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Atomic Composition
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(result.atomicComposition).map(([atom, count]) => (
                <div key={atom} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {atom}
                  </div>
                  <div className="text-lg font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {count}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Formula: C<sub>{result.atomicComposition.C}</sub>
              H<sub>{result.atomicComposition.H}</sub>
              N<sub>{result.atomicComposition.N}</sub>
              O<sub>{result.atomicComposition.O}</sub>
              S<sub>{result.atomicComposition.S}</sub>
            </div>
          </div>

          {/* Amino Acid Composition */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Amino Acid Composition
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Amino Acid</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Count</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Percentage</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.aminoAcidComposition)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([aa, count]) => {
                      const percent = result.aminoAcidPercent[aa];
                      return (
                        <tr key={aa} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <span className="font-mono font-bold text-lg text-primary-700 dark:text-primary-300">{aa}</span>
                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                              {getAminoAcidName(aa)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">{count}</td>
                          <td className="p-3 text-right font-mono">{percent.toFixed(1)}%</td>
                          <td className="p-3">
                            <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                              <div
                                className="bg-primary-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sequence Display */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Cleaned Sequence
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                {result.sequence}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pfam Domain Results */}
      {/* InterProScan Results */}
      {interProResult && interProResult.success && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Database className="w-5 h-5" />
            InterProScan Analysis Results
          </h3>

          {interProResult.matches.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <Info className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                No domains found for this sequence in InterPro databases.
              </p>
            </div>
          ) : (
            <InterProAnalysis
              matches={interProResult.matches}
              sequenceLength={interProResult.sequenceLength}
              querySequence={sequence.replace(/^>.*$/gm, '').replace(/\s/g, '').toUpperCase()}
            />
          )}
        </div>
      )}

      {pfamResult && pfamResult.success && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Pfam Domain Search Results
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Alignments are performed automatically with {alignmentTool.toUpperCase()}
            </div>
          </div>

          {pfamResult.domains.length === 0 ? (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              <Info className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                No Pfam domains found for this sequence.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Domains Found:</span>
                    <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">
                      {pfamResult.domains.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Sequence Length:</span>
                    <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">
                      {pfamResult.sequenceLength} aa
                    </span>
                  </div>
                  {pfamResult.searchTime && (
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Search Time:</span>
                      <span className="ml-2 font-bold text-blue-700 dark:text-blue-300">
                        {(pfamResult.searchTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {pfamResult.domains.map((domain, idx) => {
                  const baseAccession = domain.acc.split('.')[0];
                  const meta = pfamMetadata[baseAccession];

                  // Helper to strip HTML tags from description
                  const stripHtml = (html: string): string => {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = html;
                    return tmp.textContent || tmp.innerText || '';
                  };

                  // Description can be string or object with {text, llm, checked, updated}
                  const descItem = meta?.description?.[0];
                  let description = descItem
                    ? (typeof descItem === 'string' ? descItem : (descItem as any)?.text || 'Loading...')
                    : (domain.description || 'Loading...');

                  // Strip HTML tags if present
                  if (description && description.includes('<')) {
                    description = stripHtml(description);
                  }

                  // Handle name being either string or object {name, short}
                  const displayName = meta?.name
                    ? (typeof meta.name === 'string' ? meta.name : meta.name.name)
                    : domain.name;

                  // Get interpretations
                  const evalueInterpretation = interpretEvalue(domain.evalue);
                  const bitScoreInterpretation = interpretBitScore(domain.bitscore);

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {/* Header line with domain name */}
                      <div className="mb-2">
                        <a
                          href={`https://www.ebi.ac.uk/interpro/entry/pfam/${domain.acc}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-bold text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {displayName}
                        </a>
                      </div>

                      {/* Description line */}
                      <div className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                        {description}
                        {meta?.literature && Object.keys(meta.literature).length > 0 && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            📚 {Object.keys(meta.literature).length} reference(s)
                          </span>
                        )}
                      </div>

                      {/* Accession, Position, E-value, Bit Score on same line */}
                      <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">Accession:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                            {domain.acc}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">Position:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                            {domain.start}-{domain.end}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">E-value:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {domain.evalue.toExponential(2)}
                          </span>
                          <span className={`text-xs font-medium ${evalueInterpretation.color}`}>
                            ({evalueInterpretation.text})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400">Bit Score:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {domain.bitscore.toFixed(1)}
                          </span>
                          <span className={`text-xs font-medium ${bitScoreInterpretation.color}`}>
                            ({bitScoreInterpretation.text})
                          </span>
                        </div>
                      </div>

                      {/* Alignment section */}
                      <div className="border-t border-slate-300 dark:border-slate-600 pt-3 mt-3">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                          <GitCompare className="w-4 h-4" />
                          Seed Alignment
                        </h4>
                        {pfamAlignmentLoading[baseAccession] ? (
                          <div className="flex flex-col items-center justify-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                            <p className="text-lg font-medium text-blue-800 dark:text-blue-200">
                              Aligning sequences with {alignmentTool.toUpperCase()}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                              Fetching seed alignment and running analysis...
                            </p>
                          </div>
                        ) : pfamAlignmentResults[baseAccession]?.success ? (
                          <AlignmentViewer result={pfamAlignmentResults[baseAccession]!} />
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
                            No alignment available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">
                  Domain Coverage Map
                </h4>
                <div className="relative h-16 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  {/* Position scale markers */}
                  <div className="absolute top-0 left-0 right-0 h-4 flex items-center text-xs text-slate-600 dark:text-slate-400">
                    <span className="absolute left-2">1</span>
                    <span className="absolute left-1/4">|</span>
                    <span className="absolute left-1/2">|</span>
                    <span className="absolute left-3/4">|</span>
                    <span className="absolute right-2">{pfamResult.sequenceLength}</span>
                  </div>

                  {/* Domain bars */}
                  <div className="absolute top-4 bottom-0 left-0 right-0">
                    {pfamResult.domains.map((domain, idx) => {
                      const start = (domain.start / pfamResult.sequenceLength) * 100;
                      const width = ((domain.end - domain.start + 1) / pfamResult.sequenceLength) * 100;
                      const colors = [
                        'bg-blue-500',
                        'bg-green-500',
                        'bg-purple-500',
                        'bg-orange-500',
                        'bg-pink-500',
                        'bg-cyan-500',
                      ];
                      const color = colors[idx % colors.length];

                      return (
                        <div
                          key={idx}
                          className={`absolute h-full ${color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer group`}
                          style={{ left: `${start}%`, width: `${width}%` }}
                          title={`${domain.name}: ${domain.start}-${domain.end} (${domain.end - domain.start + 1} aa)`}
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                            {domain.name}<br/>
                            {domain.start}-{domain.end}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Residue 1</span>
                  <span className="text-center">Sequence Length: {pfamResult.sequenceLength} aa</span>
                  <span>Residue {pfamResult.sequenceLength}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

        </>
      )}

      {/* Concentration Calculator Tab */}
      {activeTab === 'concentration' && (
        <ProteinConcentration
          prefillProteinName={result?.sequence ? `Protein-${result.sequence.substring(0, 10)}` : undefined}
          prefillMolecularWeight={result?.molecularWeight}
          prefillExtinctionCoefficient={result?.extinctionCoefficient.reduced}
          prefillSequence={result?.sequence}
        />
      )}

      {/* Multiple Sequence Alignment Tab */}
      {activeTab === 'alignment' && (
        <MultipleSequenceAlignment />
      )}
    </div>
  );
}

// Helper function to get full amino acid name
function getAminoAcidName(code: string): string {
  const names: Record<string, string> = {
    A: 'Alanine',
    C: 'Cysteine',
    D: 'Aspartic acid',
    E: 'Glutamic acid',
    F: 'Phenylalanine',
    G: 'Glycine',
    H: 'Histidine',
    I: 'Isoleucine',
    K: 'Lysine',
    L: 'Leucine',
    M: 'Methionine',
    N: 'Asparagine',
    P: 'Proline',
    Q: 'Glutamine',
    R: 'Arginine',
    S: 'Serine',
    T: 'Threonine',
    V: 'Valine',
    W: 'Tryptophan',
    Y: 'Tyrosine',
  };
  return names[code] || code;
}
