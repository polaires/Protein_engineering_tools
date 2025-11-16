/**
 * ProtParam - Protein Parameter Analysis Tool
 * Computes various physical and chemical parameters for proteins
 */

import { useState, useEffect } from 'react';
import { Dna, Info, AlertCircle, Beaker, Save, Trash2, Download, Upload } from 'lucide-react';
import { analyzeProtein, ProteinAnalysisResult } from '@/utils/proteinAnalysis';
import { ConcentrationMeasurement } from '@/types';
import { useApp } from '@/contexts/AppContext';

export default function ProtParam() {
  const { showToast } = useApp();
  const [sequence, setSequence] = useState('');
  const [result, setResult] = useState<ProteinAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Concentration calculator state
  const [manualMode, setManualMode] = useState(false);
  const [proteinName, setProteinName] = useState('');
  const [absorbance280, setAbsorbance280] = useState<number | ''>('');
  const [extinctionCoefficient, setExtinctionCoefficient] = useState<number | ''>('');
  const [cysState, setCysState] = useState<'reduced' | 'oxidized'>('reduced');
  const [molecularWeight, setMolecularWeight] = useState<number | ''>('');
  const [pathLength, setPathLength] = useState<number>(0.1); // Default NanoDrop
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Concentration results
  const [concentration, setConcentration] = useState<number | null>(null);
  const [concentrationMolar, setConcentrationMolar] = useState<number | null>(null);

  // Measurements history
  const [measurements, setMeasurements] = useState<ConcentrationMeasurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);

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
  };

  const handleLoadExample = () => {
    // Example: Human Insulin A chain
    const exampleSeq = 'GIVEQCCTSICSLYQLENYCN';
    setSequence(exampleSeq);
  };

  // Load measurements from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('concentrationMeasurements');
    if (stored) {
      try {
        setMeasurements(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading measurements:', error);
      }
    }
  }, []);

  // Auto-fill MW and extinction coefficient when protein is analyzed
  useEffect(() => {
    if (result && !manualMode) {
      setMolecularWeight(result.molecularWeight);
      setExtinctionCoefficient(
        cysState === 'reduced'
          ? result.extinctionCoefficient.reduced
          : result.extinctionCoefficient.oxidized
      );
    }
  }, [result, cysState, manualMode]);

  // Save measurements to localStorage
  const saveMeasurementsToStorage = (newMeasurements: ConcentrationMeasurement[]) => {
    localStorage.setItem('concentrationMeasurements', JSON.stringify(newMeasurements));
    setMeasurements(newMeasurements);
  };

  // Calculate concentration using Beer-Lambert Law
  const calculateConcentration = () => {
    if (!absorbance280 || !extinctionCoefficient || !molecularWeight || !pathLength) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    // Beer-Lambert Law: A = ε × c × l
    // Solving for c: c = A / (ε × l)
    const concMolar = absorbance280 / (extinctionCoefficient * pathLength);

    // Convert to mg/mL: concentration (mg/mL) = c (M) × MW (g/mol)
    const concMgMl = concMolar * molecularWeight;

    setConcentration(concMgMl);
    setConcentrationMolar(concMolar);
    showToast('success', 'Concentration calculated');
  };

  // Save current measurement
  const saveMeasurement = () => {
    if (!proteinName || !absorbance280 || !extinctionCoefficient || !molecularWeight || concentration === null) {
      showToast('error', 'Please calculate concentration first and provide protein name');
      return;
    }

    const newMeasurement: ConcentrationMeasurement = {
      id: Date.now().toString(),
      proteinName,
      date: new Date().toISOString(),
      absorbance280: Number(absorbance280),
      extinctionCoefficient: Number(extinctionCoefficient),
      molecularWeight: Number(molecularWeight),
      pathLength,
      concentration,
      concentrationMolar: concentrationMolar!,
      notes: notes || undefined,
      sequence: sequence || undefined,
      batchNumber: batchNumber || undefined,
    };

    const updated = [newMeasurement, ...measurements];
    saveMeasurementsToStorage(updated);
    showToast('success', `Measurement saved for ${proteinName}`);

    // Clear concentration form after saving
    clearConcentrationForm();
  };

  // Delete measurement
  const deleteMeasurement = (id: string) => {
    const updated = measurements.filter(m => m.id !== id);
    saveMeasurementsToStorage(updated);
    showToast('success', 'Measurement deleted');
  };

  // Load measurement into form
  const loadMeasurement = (measurement: ConcentrationMeasurement) => {
    setProteinName(measurement.proteinName);
    setAbsorbance280(measurement.absorbance280);
    setExtinctionCoefficient(measurement.extinctionCoefficient);
    setMolecularWeight(measurement.molecularWeight);
    setPathLength(measurement.pathLength);
    setBatchNumber(measurement.batchNumber || '');
    setNotes(measurement.notes || '');
    setConcentration(measurement.concentration);
    setConcentrationMolar(measurement.concentrationMolar);
    setSelectedMeasurement(measurement.id);
    setManualMode(true); // Enable manual mode when loading
  };

  // Clear concentration form only
  const clearConcentrationForm = () => {
    setProteinName('');
    setAbsorbance280('');
    setBatchNumber('');
    setNotes('');
    setConcentration(null);
    setConcentrationMolar(null);
    setSelectedMeasurement(null);
    if (manualMode) {
      setExtinctionCoefficient('');
      setMolecularWeight('');
    }
  };

  // Export measurements as JSON
  const exportMeasurements = () => {
    const dataStr = JSON.stringify(measurements, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protein_measurements_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Measurements exported');
  };

  // Import measurements from JSON
  const importMeasurements = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          saveMeasurementsToStorage(imported);
          showToast('success', `Imported ${imported.length} measurements`);
        } else {
          showToast('error', 'Invalid file format');
        }
      } catch (error) {
        showToast('error', 'Error importing file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          ProtParam - Protein Analysis Tool
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Compute various physical and chemical parameters for a protein sequence
        </p>
      </div>

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

        <div className="flex gap-3">
          <button onClick={handleAnalyze} className="btn-primary flex-1">
            <Dna className="w-5 h-5 mr-2" />
            Analyze Protein
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

      {/* Protein Concentration Calculator Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Beaker className="w-7 h-7" />
              Protein Concentration Calculator
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Calculate protein concentration using Beer-Lambert Law (A = ε × c × l) from A280 measurements
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-slate-700 dark:text-slate-300">Manual input mode</span>
          </label>
        </div>

        {!manualMode && !result && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> Analyze a protein sequence above to automatically populate molecular weight and extinction coefficient values. Or enable "Manual input mode" to enter values directly.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Calculator Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-slate-50 dark:bg-slate-800/30">
              <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
                Measurement Input
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="input-label">Protein Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., His-GFP, GST-Protein X"
                    value={proteinName}
                    onChange={(e) => setProteinName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">A280 (Absorbance at 280 nm) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 0.654"
                    step="any"
                    min="0"
                    value={absorbance280}
                    onChange={(e) => setAbsorbance280(e.target.value ? parseFloat(e.target.value) : '')}
                  />
                </div>

                <div>
                  <label className="input-label">
                    Path Length (cm) *
                    <span className="text-xs text-slate-500 ml-2">NanoDrop: 0.1 cm, Cuvette: 1 cm</span>
                  </label>
                  <select
                    className="select-field"
                    value={pathLength}
                    onChange={(e) => setPathLength(parseFloat(e.target.value))}
                  >
                    <option value={0.1}>0.1 cm (NanoDrop)</option>
                    <option value={1}>1 cm (Cuvette)</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">
                    Extinction Coefficient (ε) *
                    <span className="text-xs text-slate-500 ml-2">M⁻¹cm⁻¹</span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 43824"
                    step="any"
                    min="0"
                    value={extinctionCoefficient}
                    onChange={(e) => setExtinctionCoefficient(e.target.value ? parseFloat(e.target.value) : '')}
                    disabled={!manualMode && result !== null}
                  />
                  {!manualMode && result && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Auto-filled from sequence analysis
                    </div>
                  )}
                </div>

                {!manualMode && result && (
                  <div>
                    <label className="input-label">Cysteine State</label>
                    <select
                      className="select-field"
                      value={cysState}
                      onChange={(e) => setCysState(e.target.value as 'reduced' | 'oxidized')}
                    >
                      <option value="reduced">All Cys reduced</option>
                      <option value="oxidized">All Cys oxidized</option>
                    </select>
                  </div>
                )}

                <div className={!manualMode && result ? '' : 'md:col-span-1'}>
                  <label className="input-label">
                    Molecular Weight (MW) *
                    <span className="text-xs text-slate-500 ml-2">Da or g/mol</span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 26900"
                    step="any"
                    min="0"
                    value={molecularWeight}
                    onChange={(e) => setMolecularWeight(e.target.value ? parseFloat(e.target.value) : '')}
                    disabled={!manualMode && result !== null}
                  />
                  {!manualMode && result && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Auto-filled from sequence analysis
                    </div>
                  )}
                </div>

                <div>
                  <label className="input-label">Batch Number (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Batch-001, 2024-01-15"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="input-label">Notes (optional)</label>
                  <textarea
                    className="input-field h-20 resize-y"
                    placeholder="Any additional information about this measurement..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={calculateConcentration} className="btn-primary flex-1">
                  <Beaker className="w-5 h-5 mr-2" />
                  Calculate Concentration
                </button>
                <button onClick={clearConcentrationForm} className="btn-secondary">
                  Clear
                </button>
              </div>
            </div>

            {/* Results Display */}
            {concentration !== null && (
              <div className="card bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-primary-200 dark:border-primary-800">
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
                  Calculated Concentration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Concentration
                    </div>
                    <div className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                      {concentration.toFixed(3)} mg/mL
                    </div>
                  </div>
                  <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Molar Concentration
                    </div>
                    <div className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                      {concentrationMolar ? (concentrationMolar * 1e6).toFixed(2) : '0'} μM
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm mb-4">
                  <div className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Calculation:</div>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    <div>Beer-Lambert Law: A = ε × c × l</div>
                    <div>Molar concentration: c = A / (ε × l)</div>
                    <div>c = {absorbance280} / ({extinctionCoefficient} × {pathLength})</div>
                    <div>c = {concentrationMolar?.toExponential(3)} M = {concentrationMolar ? (concentrationMolar * 1e6).toFixed(2) : '0'} μM</div>
                    <div className="mt-2">Concentration (mg/mL) = c × MW</div>
                    <div>= {concentrationMolar?.toExponential(3)} × {molecularWeight}</div>
                    <div>= {concentration.toFixed(3)} mg/mL</div>
                  </div>
                </div>

                <button onClick={saveMeasurement} className="btn-primary w-full">
                  <Save className="w-5 h-5 mr-2" />
                  Save Measurement
                </button>
              </div>
            )}
          </div>

          {/* Measurements History */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24 bg-slate-50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Saved Measurements
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportMeasurements}
                    className="btn-icon"
                    title="Export measurements"
                    disabled={measurements.length === 0}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <label className="btn-icon cursor-pointer" title="Import measurements">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={importMeasurements}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {measurements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No measurements saved yet</p>
                  </div>
                ) : (
                  measurements.map((measurement) => (
                    <div
                      key={measurement.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMeasurement === measurement.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-slate-800/50'
                      }`}
                      onClick={() => loadMeasurement(measurement)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {measurement.proteinName}
                          </div>
                          {measurement.batchNumber && (
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              Batch: {measurement.batchNumber}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMeasurement(measurement.id);
                          }}
                          className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Concentration:</span>
                          <span className="font-semibold">{measurement.concentration.toFixed(2)} mg/mL</span>
                        </div>
                        <div className="flex justify-between">
                          <span>A280:</span>
                          <span className="font-mono">{measurement.absorbance280.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span>{new Date(measurement.date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {measurement.notes && (
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic">
                          "{measurement.notes}"
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
