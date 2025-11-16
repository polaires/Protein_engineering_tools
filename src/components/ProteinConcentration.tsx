/**
 * Protein Concentration Calculator
 * Based on Beer-Lambert Law: A = ε × c × l
 * Stores measurements for tracking different protein batches
 */

import { useState, useEffect } from 'react';
import { Beaker, Save, Trash2, Download, Upload } from 'lucide-react';
import { ConcentrationMeasurement } from '@/types';
import { useApp } from '@/contexts/AppContext';

export default function ProteinConcentration() {
  const { showToast } = useApp();

  // Input fields
  const [proteinName, setProteinName] = useState('');
  const [absorbance280, setAbsorbance280] = useState<number | ''>('');
  const [extinctionCoefficient, setExtinctionCoefficient] = useState<number | ''>('');
  const [molecularWeight, setMolecularWeight] = useState<number | ''>('');
  const [pathLength, setPathLength] = useState<number>(0.1); // Default NanoDrop
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [sequence, setSequence] = useState('');

  // Results
  const [concentration, setConcentration] = useState<number | null>(null);
  const [concentrationMolar, setConcentrationMolar] = useState<number | null>(null);

  // Measurements history
  const [measurements, setMeasurements] = useState<ConcentrationMeasurement[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);

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

  // Save measurements to localStorage
  const saveMeasurements = (newMeasurements: ConcentrationMeasurement[]) => {
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
    // c is in M (mol/L)
    const concMolar = absorbance280 / (extinctionCoefficient * pathLength);

    // Convert to mg/mL: concentration (mg/mL) = c (M) × MW (g/mol) × 1000 (mg/g) / 1000 (mL/L)
    // Simplifies to: concentration (mg/mL) = c (M) × MW (g/mol)
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
    saveMeasurements(updated);
    showToast('success', `Measurement saved for ${proteinName}`);

    // Clear form after saving
    handleClear();
  };

  // Delete measurement
  const deleteMeasurement = (id: string) => {
    const updated = measurements.filter(m => m.id !== id);
    saveMeasurements(updated);
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
    setSequence(measurement.sequence || '');
    setConcentration(measurement.concentration);
    setConcentrationMolar(measurement.concentrationMolar);
    setSelectedMeasurement(measurement.id);
  };

  // Clear form
  const handleClear = () => {
    setProteinName('');
    setAbsorbance280('');
    setExtinctionCoefficient('');
    setMolecularWeight('');
    setPathLength(0.1);
    setBatchNumber('');
    setNotes('');
    setSequence('');
    setConcentration(null);
    setConcentrationMolar(null);
    setSelectedMeasurement(null);
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
          saveMeasurements(imported);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Beaker className="w-7 h-7" />
          Protein Concentration Calculator
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Calculate protein concentration using Beer-Lambert Law (A = ε × c × l) from A280 measurements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Input Form */}
          <div className="card">
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
                />
                <div className="text-xs text-slate-500 mt-1">
                  Calculate from sequence using ProtParam tab
                </div>
              </div>

              <div>
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
                />
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

              <div className="md:col-span-2">
                <label className="input-label">Protein Sequence (optional)</label>
                <textarea
                  className="input-field font-mono text-sm h-16 resize-y"
                  placeholder="MKTAY... (for reference)"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={calculateConcentration} className="btn-primary flex-1">
                <Beaker className="w-5 h-5 mr-2" />
                Calculate Concentration
              </button>
              <button onClick={handleClear} className="btn-secondary">
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
          <div className="card sticky top-24">
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
                        : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 bg-slate-50 dark:bg-slate-800/50'
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
  );
}
