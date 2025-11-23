/**
 * Codon Optimization Tool
 * Uses CodonTransformer API when available, falls back to browser-based optimization
 */

import { useState, useEffect } from 'react';
import { Zap, ArrowRight, Copy, AlertCircle, Info, Wifi, WifiOff, Shield } from 'lucide-react';
import { CodonTransformerAPI } from '@/services/codonApi';
import { optimizeForEcoli, reverseTranslate, CodonOptimizationResult, RESTRICTION_SITES, checkRestrictionSites } from '@/utils/codonOptimization';
import { useApp } from '@/contexts/AppContext';

type OptimizationMethod = 'api' | 'browser';
type InputMode = 'dna' | 'protein';

export default function CodonOptimizer() {
  const { showToast } = useApp();

  // API state
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [organisms, setOrganisms] = useState<string[]>([]);
  const [selectedOrganism, setSelectedOrganism] = useState('Escherichia coli str. K-12 substr. MG1655');

  // Optimization method
  const [method, setMethod] = useState<OptimizationMethod>('api');
  const [inputMode, setInputMode] = useState<InputMode>('protein');

  // Input
  const [inputSequence, setInputSequence] = useState('');

  // Restriction site avoidance
  const [avoidRestrictionSites, setAvoidRestrictionSites] = useState<string[]>([]);

  // Results
  const [result, setResult] = useState<CodonOptimizationResult | null>(null);
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [apiAvoidedSites, setApiAvoidedSites] = useState<string[] | null>(null);
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check API health on mount
  useEffect(() => {
    checkAPIHealth();
  }, []);

  const checkAPIHealth = async () => {
    try {
      await CodonTransformerAPI.checkHealth();
      setApiStatus('online');
      loadOrganisms();
    } catch (err) {
      setApiStatus('offline');
      // Automatically switch to browser method if API is offline
      setMethod('browser');
    }
  };

  const loadOrganisms = async () => {
    try {
      const data = await CodonTransformerAPI.listOrganisms();
      setOrganisms(data.organisms);
      // Set E. coli K-12 as default if available
      const k12Strain = data.organisms.find(org =>
        org === 'Escherichia coli str. K-12 substr. MG1655'
      );
      if (k12Strain) {
        setSelectedOrganism(k12Strain);
      } else {
        // Fallback to any E. coli variant
        const ecoliVariants = data.organisms.filter(org =>
          org.toLowerCase().includes('escherichia coli')
        );
        if (ecoliVariants.length > 0) {
          setSelectedOrganism(ecoliVariants[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load organisms:', err);
    }
  };

  const handleOptimizeAPI = async () => {
    if (!inputSequence.trim()) {
      setError('Please enter a sequence');
      return;
    }

    setLoading(true);
    setError(null);
    setApiResult(null);
    setApiWarning(null);

    try {
      // Clean protein sequence - remove any non-amino acid characters
      const cleanedProtein = inputSequence.trim().toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY*]/g, '');

      const response = await CodonTransformerAPI.optimizeCodon({
        protein: cleanedProtein,
        organism: selectedOrganism,
        deterministic: true,
        avoid_restriction_sites: avoidRestrictionSites.length > 0 ? avoidRestrictionSites : undefined,
      });

      if (response.success) {
        const optimizedDNA = response.dna_sequence || response.sequences?.[0] || '';
        setApiResult(optimizedDNA);
        setApiAvoidedSites(response.restriction_sites_avoided || null);
        setApiWarning(response.warning || null);

        // Show success message with restriction site info
        if (avoidRestrictionSites.length > 0) {
          const avoided = response.restriction_sites_avoided || [];
          if (avoided.length === avoidRestrictionSites.length) {
            showToast('success', `Sequence optimized. All ${avoided.length} restriction sites avoided!`);
          } else if (avoided.length > 0) {
            showToast('success', `Sequence optimized. ${avoided.length}/${avoidRestrictionSites.length} restriction sites avoided.`);
          } else {
            showToast('success', 'Sequence optimized using CodonTransformer');
          }
        } else {
          showToast('success', 'Sequence optimized using CodonTransformer');
        }
      } else {
        setError(response.error || 'Optimization failed');
        showToast('error', 'Optimization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API request failed');
      showToast('error', 'API request failed. Try browser-based method.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeBrowser = () => {
    setError(null);
    setResult(null);

    try {
      if (!inputSequence.trim()) {
        setError('Please enter a sequence');
        return;
      }

      if (inputMode === 'dna') {
        const optimizationResult = optimizeForEcoli(inputSequence, avoidRestrictionSites);
        setResult(optimizationResult);

        // Check if restriction sites were avoided
        if (avoidRestrictionSites.length > 0 && optimizationResult.restrictionSitesAvoided) {
          const avoided = optimizationResult.restrictionSitesAvoided.length;
          const total = avoidRestrictionSites.length;
          if (avoided === total) {
            showToast('success', `DNA sequence optimized. All ${total} restriction sites avoided!`);
          } else {
            showToast('success', `DNA sequence optimized. ${avoided}/${total} restriction sites avoided.`);
          }
        } else {
          showToast('success', 'DNA sequence optimized for E. coli');
        }
      } else {
        // Reverse translate protein to DNA
        const optimizedDNA = reverseTranslate(inputSequence, avoidRestrictionSites);
        const cleanedProtein = inputSequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY*]/g, '').replace(/\*+/g, '');
        const dummyResult: CodonOptimizationResult = {
          originalSequence: '',
          optimizedSequence: optimizedDNA,
          proteinSequence: cleanedProtein,
          originalGC: 0,
          optimizedGC: calculateGC(optimizedDNA),
          originalCAI: 0,
          optimizedCAI: 1.0,
          identicalCodons: 0,
          changedCodons: 0,
          percentIdentity: 0,
        };

        // Check restriction sites
        if (avoidRestrictionSites.length > 0) {
          const foundSites = checkRestrictionSites(optimizedDNA, avoidRestrictionSites);
          const avoided = avoidRestrictionSites.filter(site => !foundSites.includes(site));
          dummyResult.restrictionSitesAvoided = avoided;

          if (foundSites.length === 0) {
            showToast('success', `Protein reverse translated. All ${avoidRestrictionSites.length} restriction sites avoided!`);
          } else {
            showToast('success', `Protein reverse translated. ${avoided.length}/${avoidRestrictionSites.length} restriction sites avoided.`);
          }
        } else {
          showToast('success', 'Protein sequence reverse translated');
        }

        setResult(dummyResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
      showToast('error', 'Optimization failed');
    }
  };

  const handleOptimize = () => {
    if (method === 'api' && apiStatus === 'online') {
      handleOptimizeAPI();
    } else {
      handleOptimizeBrowser();
    }
  };

  const calculateGC = (seq: string): number => {
    const gcCount = (seq.match(/[GC]/g) || []).length;
    return (gcCount / seq.length) * 100;
  };

  const handleClear = () => {
    setInputSequence('');
    setResult(null);
    setApiResult(null);
    setApiAvoidedSites(null);
    setApiWarning(null);
    setError(null);
  };

  const toggleRestrictionSite = (site: string) => {
    setAvoidRestrictionSites(prev =>
      prev.includes(site)
        ? prev.filter(s => s !== site)
        : [...prev, site]
    );
  };

  const handleLoadExample = () => {
    if (method === 'api' || inputMode === 'protein') {
      // GFP protein sequence
      setInputSequence('MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITHGMDELYK');
    } else {
      // GFP gene fragment (non-optimized)
      setInputSequence('ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTGATGCAACATACGGAAAACTTACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCCATGGCCAACACTTGTCACTACTTTCGGTTATGGTGTTCAATGCTTTGCGAGATACCCAGATCATATGAAACAGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAAAGAACTATATTTTTCAAAGATGACGGGAACTACAAGACACGTGCTGAAGTCAAGTTTGAAGGTGATACCCTTGTTAATAGAATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTTGGACACAAATTGGAATACAACTATAACTCACACAATGTATACATCATGGCAGACAAACAAAAGAATGGAATCAAAGTTAACTTCAAAATTAGACACAACATTGAAGATGGAAGCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCCACACAATCTGCCCTTTCGAAAGATCCCAACGAAAAGAGAGACCACATGGTCCTTCTTGAGTTTGTAACAGCTGCTGGGATTACACATGGCATGGATGAACTATACAAATAA');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', `${label} copied to clipboard`);
    } catch (err) {
      showToast('error', 'Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Codon Optimization
          </h3>

          {/* API Status Indicator */}
          <div className="flex items-center gap-2">
            {apiStatus === 'online' ? (
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : apiStatus === 'offline' ? (
              <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            )}
            <span className={`text-sm font-medium ${
              apiStatus === 'online' ? 'text-green-700 dark:text-green-300' :
              apiStatus === 'offline' ? 'text-red-700 dark:text-red-300' :
              'text-yellow-700 dark:text-yellow-300'
            }`}>
              API {apiStatus === 'online' ? 'Connected' : apiStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>

        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p><strong>CodonTransformer API:</strong> Deep learning-based optimization for 164 organisms</p>
          <p><strong>Browser Method:</strong> E. coli K-12 codon usage table (works offline)</p>
          {apiStatus === 'offline' && (
            <p className="text-amber-700 dark:text-amber-300 mt-2">
              💡 To use CodonTransformer API, start the server: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">python scripts/codon_api.py</code>
            </p>
          )}
        </div>
      </div>

      {/* Method Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Optimization Method
        </h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMethod('api')}
            disabled={apiStatus !== 'online'}
            className={`calc-mode-tab ${method === 'api' ? 'active' : ''} ${
              apiStatus !== 'online' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Wifi className="w-4 h-4 inline mr-2" />
            CodonTransformer API
            {apiStatus !== 'online' && ' (Offline)'}
          </button>
          <button
            onClick={() => setMethod('browser')}
            className={`calc-mode-tab ${method === 'browser' ? 'active' : ''}`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Browser-Based (E. coli)
          </button>
        </div>

        {/* API Method Options */}
        {method === 'api' && apiStatus === 'online' && (
          <div className="mb-4">
            <label className="input-label">Target Organism</label>
            <select
              value={selectedOrganism}
              onChange={(e) => setSelectedOrganism(e.target.value)}
              className="input-field"
            >
              {organisms.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {organisms.length} organisms available
            </div>
          </div>
        )}

        {/* Browser Method Options */}
        {method === 'browser' && (
          <div className="mb-4">
            <label className="input-label">Input Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('dna')}
                className={`calc-mode-tab ${inputMode === 'dna' ? 'active' : ''}`}
              >
                DNA Sequence
              </button>
              <button
                onClick={() => setInputMode('protein')}
                className={`calc-mode-tab ${inputMode === 'protein' ? 'active' : ''}`}
              >
                Protein Sequence
              </button>
            </div>
          </div>
        )}

        {/* Input Sequence */}
        <div className="mb-4">
          <label className="input-label">
            {method === 'api' ? 'Protein Sequence *' :
             inputMode === 'dna' ? 'DNA Sequence (to optimize) *' :
             'Protein Sequence (to reverse translate) *'}
          </label>
          <textarea
            className="input-field font-mono text-sm h-40 resize-y"
            placeholder={method === 'api'
              ? "Enter protein sequence (single letter codes)\nExample: MSKGEELFTGVVPILVELDGDVNGHK..."
              : inputMode === 'dna'
              ? "Enter DNA sequence (ATGC)\nExample: ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTT..."
              : "Enter protein sequence (single letter codes)\nExample: MSKGEELFTGVVPILVELDGDVNGHK..."
            }
            value={inputSequence}
            onChange={(e) => setInputSequence(e.target.value)}
          />
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Length: {inputSequence.length} {method === 'api' || inputMode === 'protein' ? 'amino acids' : 'nucleotides'}
          </div>
        </div>

        {/* Restriction Site Avoidance */}
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <label className="font-semibold text-slate-800 dark:text-slate-200">
              Avoid Restriction Sites (Golden Gate)
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.keys(RESTRICTION_SITES).map((site) => (
              <label key={site} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidRestrictionSites.includes(site)}
                  onChange={() => toggleRestrictionSite(site)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {site}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    ({RESTRICTION_SITES[site]})
                  </span>
                </span>
              </label>
            ))}
          </div>
          {avoidRestrictionSites.length > 0 && (
            <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
              ✓ Avoiding {avoidRestrictionSites.length} restriction site{avoidRestrictionSites.length > 1 ? 's' : ''}
              {method === 'api' && ': Note that API mode may not guarantee avoidance'}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleOptimize}
            disabled={loading || (method === 'api' && apiStatus !== 'online')}
            className="btn-primary flex-1"
          >
            <Zap className="w-5 h-5 mr-2" />
            {loading ? 'Optimizing...' : method === 'api' ? 'Optimize with API' : 'Optimize for E. coli'}
          </button>
          <button onClick={handleLoadExample} className="btn-secondary">
            Load Example
          </button>
          <button onClick={handleClear} className="btn-secondary">
            Clear
          </button>
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

      {/* API Warning Display */}
      {apiWarning && !error && (
        <div className="card bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Warning</h3>
              <p className="text-amber-700 dark:text-amber-300">{apiWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Results Display */}
      {apiResult && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Info className="w-5 h-5" />
              CodonTransformer Result
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Organism</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrganism}
                </div>
              </div>
              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">GC Content</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {calculateGC(apiResult).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {apiResult.length} bp
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-700 dark:text-green-300">
                  Optimized DNA Sequence
                </h4>
                <button
                  onClick={() => copyToClipboard(apiResult, 'Optimized sequence')}
                  className="btn-icon"
                  title="Copy optimized sequence"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="font-mono text-sm break-all leading-relaxed text-green-900 dark:text-green-100">
                  {apiResult}
                </div>
              </div>
            </div>

            {/* Restriction Sites Avoided (API) */}
            {apiAvoidedSites && apiAvoidedSites.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    Restriction Sites Successfully Avoided
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {apiAvoidedSites.map(site => (
                    <span key={site} className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 text-xs font-medium rounded">
                      {site} ({RESTRICTION_SITES[site]})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Usage Information */}
          <div className="card bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">
              📋 Next Steps
            </h3>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
              <p><strong>1.</strong> Copy the optimized DNA sequence above</p>
              <p><strong>2.</strong> Order as a gene synthesis or gBlock from your preferred vendor</p>
              <p><strong>3.</strong> Clone into your expression vector</p>
              <p><strong>4.</strong> The sequence has been optimized using deep learning for {selectedOrganism}</p>
            </div>
          </div>
        </div>
      )}

      {/* Browser-Based Results Display */}
      {result && method === 'browser' && (
        <div className="space-y-6">
          {/* Optimization Metrics */}
          {inputMode === 'dna' && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Optimization Metrics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">GC Content</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {result.originalGC.toFixed(1)}%
                    </span>
                    <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.optimizedGC.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">CAI (Codon Adaptation Index)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {result.originalCAI.toFixed(3)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.optimizedCAI.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Codons Changed</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {result.changedCodons}
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                      ({result.percentIdentity.toFixed(1)}% identical)
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sequence Length</div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {result.optimizedSequence.length} bp
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                      ({result.proteinSequence.length} aa)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                <div className="font-semibold mb-1">Note:</div>
                <div>CAI (Codon Adaptation Index) measures how well the codon usage matches E. coli preferences. Higher values (closer to 1.0) indicate better optimization.</div>
              </div>

              {/* Restriction Sites Avoided */}
              {result.restrictionSitesAvoided && result.restrictionSitesAvoided.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="font-semibold text-green-800 dark:text-green-200">
                      Restriction Sites Successfully Avoided
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.restrictionSitesAvoided.map(site => (
                      <span key={site} className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 text-xs font-medium rounded">
                        {site} ({RESTRICTION_SITES[site]})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sequences Display */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
              Optimized Sequence
            </h3>

            {/* Protein Sequence */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                  Protein Sequence ({result.proteinSequence.length} amino acids)
                </h4>
                <button
                  onClick={() => copyToClipboard(result.proteinSequence, 'Protein sequence')}
                  className="btn-icon"
                  title="Copy protein sequence"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                  {result.proteinSequence}
                </div>
              </div>
            </div>

            {/* Original DNA (if available) */}
            {inputMode === 'dna' && result.originalSequence && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                    Original DNA Sequence ({result.originalSequence.length} bp)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(result.originalSequence, 'Original sequence')}
                    className="btn-icon"
                    title="Copy original sequence"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="font-mono text-sm break-all leading-relaxed text-slate-700 dark:text-slate-300">
                    {result.originalSequence}
                  </div>
                </div>
              </div>
            )}

            {/* Optimized DNA */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-700 dark:text-green-300">
                  Optimized DNA Sequence ({result.optimizedSequence.length} bp)
                </h4>
                <button
                  onClick={() => copyToClipboard(result.optimizedSequence, 'Optimized sequence')}
                  className="btn-icon"
                  title="Copy optimized sequence"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="font-mono text-sm break-all leading-relaxed text-green-900 dark:text-green-100">
                  {result.optimizedSequence}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Information */}
          <div className="card bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800">
            <h3 className="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">
              📋 Next Steps
            </h3>
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
              <p><strong>1.</strong> Copy the optimized DNA sequence above</p>
              <p><strong>2.</strong> Order as a gene synthesis or gBlock from your preferred vendor</p>
              <p><strong>3.</strong> Clone into your expression vector</p>
              <p><strong>4.</strong> The optimized sequence should express better in E. coli due to improved codon usage</p>
              <p className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700">
                <strong>Note:</strong> While codon optimization typically improves expression, actual results may vary depending on other factors like protein folding, toxicity, and culture conditions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
