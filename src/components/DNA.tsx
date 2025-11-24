/**
 * DNA Tools - Golden Gate Assembly Calculator & Codon Optimization
 * Based on NEB NEBuilder Ligase Master Mix protocol
 */

import { useState } from 'react';
import { Dna, Plus, Trash2, AlertCircle, Zap, FlaskRound } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import CodonOptimizerAdvanced from './CodonOptimizerAdvanced';
import LibraryDesign from './LibraryDesign';

type DNATab = 'assembly' | 'codon' | 'library';

interface DNAFragment {
  id: string;
  name: string;
  size: number; // base pairs
  concentration: number; // ng/µl
}

interface SmartDilution {
  stockVolume: number; // µL of stock DNA to take (round number like 1)
  waterForDilution: number; // µL of water to add for dilution
  totalDilutionVolume: number; // total volume of diluted stock
  dilutedConcentration: number; // ng/µL after dilution
  volumeToUse: number; // µL of diluted stock to add to reaction
  waterSaved: number; // µL of water replaced by using diluted stock
}

interface CalculationResult {
  fragment: DNAFragment;
  targetPmol: number; // pmol
  massNeeded: number; // ng
  volumeNeeded: number; // µl
  needsDilution: boolean;
  smartDilution?: SmartDilution;
}

export default function DNA() {
  const { showToast } = useApp();

  // Tab state
  const [activeTab, setActiveTab] = useState<DNATab>('assembly');

  // Input state
  const [fragments, setFragments] = useState<DNAFragment[]>([
    { id: '1', name: 'Fragment 1', size: 3000, concentration: 100 },
  ]);
  const [molarRatio, setMolarRatio] = useState(1); // Default 1:1
  const [totalVolume, setTotalVolume] = useState(15); // µl

  // Results
  const [results, setResults] = useState<CalculationResult[] | null>(null);

  // Add new fragment
  const addFragment = () => {
    const newId = (fragments.length + 1).toString();
    setFragments([...fragments, {
      id: newId,
      name: `Fragment ${newId}`,
      size: 3000,
      concentration: 100,
    }]);
  };

  // Remove fragment
  const removeFragment = (id: string) => {
    if (fragments.length > 1) {
      setFragments(fragments.filter(f => f.id !== id));
    } else {
      showToast('error', 'At least one fragment is required');
    }
  };

  // Update fragment
  const updateFragment = (id: string, field: keyof DNAFragment, value: string | number) => {
    setFragments(fragments.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  // Calculate mass of DNA needed for target pmol
  // Formula from NEB: mass (g) = pmol × ((size × 615.96) + 36.04)
  // We need mass in ng, so: mass (ng) = pmol × 1e-12 × ((size × 615.96) + 36.04) × 1e9
  // Simplifies to: mass (ng) = pmol × 1e-3 × ((size × 615.96) + 36.04)
  const calculateMass = (size: number, pmol: number): number => {
    return pmol * 1e-3 * ((size * 615.96) + 36.04);
  };

  // Calculate Golden Gate Assembly
  const calculate = () => {
    if (fragments.length === 0) {
      showToast('error', 'Please add at least one DNA fragment');
      return;
    }

    // Validate inputs
    for (const fragment of fragments) {
      if (!fragment.size || fragment.size <= 0) {
        showToast('error', `Invalid size for ${fragment.name}`);
        return;
      }
      if (!fragment.concentration || fragment.concentration <= 0) {
        showToast('error', `Invalid concentration for ${fragment.name}`);
        return;
      }
    }

    if (!totalVolume || totalVolume <= 0) {
      showToast('error', 'Invalid total volume');
      return;
    }

    // Target pmol for each fragment (0.05 pmol for equimolar ratio at 15 µL standard reaction)
    // Scale proportionally with total volume to maintain proper DNA concentration
    const standardVolume = 15; // µL - NEB standard reaction volume
    const targetPmol = 0.05 * molarRatio * (totalVolume / standardVolume);

    // Calculate for each fragment
    const calculationResults: CalculationResult[] = fragments.map(fragment => {
      const massNeeded = calculateMass(fragment.size, targetPmol);
      const volumeNeeded = massNeeded / fragment.concentration;

      let result: CalculationResult = {
        fragment,
        targetPmol,
        massNeeded,
        volumeNeeded,
        needsDilution: volumeNeeded < 1,
      };

      // If volume is too small (<1 µl), suggest smart dilution
      // Smart dilution: take 1 µL of stock, dilute with water, use more of diluted stock
      // This replaces part of the water addition and makes pipetting easier
      if (volumeNeeded < 1) {
        // Use 1 µL of stock DNA (easy to pipette)
        const stockVolume = 1;
        // Target: use 2-3 µL of diluted stock for easy pipetting
        const targetDilutedVolume = 2;

        // Calculate dilution factor: we have stockVolume µL, want to pipette targetDilutedVolume µL
        // massNeeded = stockVolume * concentration / dilutionFactor * (targetDilutedVolume / totalDilutionVolume)
        // Actually: stockVolume * concentration = total mass in diluted stock
        // We need massNeeded, so: volumeToUse = massNeeded / dilutedConcentration
        // dilutedConcentration = (stockVolume * concentration) / totalDilutionVolume
        // For easy math: if we want volumeToUse = targetDilutedVolume,
        // then totalDilutionVolume = (stockVolume * concentration * targetDilutedVolume) / massNeeded

        const totalDilutionVolume = (stockVolume * fragment.concentration * targetDilutedVolume) / massNeeded;
        const waterForDilution = totalDilutionVolume - stockVolume;
        const dilutedConcentration = (stockVolume * fragment.concentration) / totalDilutionVolume;
        const volumeToUse = targetDilutedVolume;

        // Water saved = (volumeToUse from diluted stock) - (original volumeNeeded)
        // This extra volume replaces water in the reaction
        const waterSaved = volumeToUse - volumeNeeded;

        result.smartDilution = {
          stockVolume,
          waterForDilution: Math.round(waterForDilution * 10) / 10, // Round to 0.1 µL
          totalDilutionVolume: Math.round(totalDilutionVolume * 10) / 10,
          dilutedConcentration,
          volumeToUse,
          waterSaved,
        };
      }

      return result;
    });

    setResults(calculationResults);
    showToast('success', 'Golden Gate Assembly calculated');
  };

  // Calculate total DNA volume
  const totalDNAVolume = results ? results.reduce((sum, r) => {
    return sum + (r.needsDilution && r.smartDilution
      ? r.smartDilution.volumeToUse
      : r.volumeNeeded);
  }, 0) : 0;

  // NEBuilder Master Mix volume (1/3 of total)
  const masterMixVolume = totalVolume / 3;

  // Water volume
  const waterVolume = totalVolume - masterMixVolume - totalDNAVolume;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          DNA Tools
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Golden Gate Assembly and Codon Optimization for E. coli
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('assembly')}
            className={`calc-mode-tab ${activeTab === 'assembly' ? 'active' : ''}`}
          >
            <Dna className="w-4 h-4 inline mr-2" />
            Golden Gate Assembly
          </button>
          <button
            onClick={() => setActiveTab('codon')}
            className={`calc-mode-tab ${activeTab === 'codon' ? 'active' : ''}`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Codon Optimization
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`calc-mode-tab ${activeTab === 'library' ? 'active' : ''}`}
          >
            <FlaskRound className="w-4 h-4 inline mr-2" />
            Library Design
          </button>
        </div>
      </div>

      {/* Golden Gate Assembly Tab */}
      {activeTab === 'assembly' && (
        <>
      {/* Protocol Information */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
          Protocol Information
        </h3>
        <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p><strong>Based on:</strong> NEB NEBuilder Ligase Master Mix Protocol</p>
          <p><strong>Target:</strong> 0.05 pmol of each fragment at 15 µL (scales with volume)</p>
          <p><strong>Master Mix:</strong> 1/3 of total reaction volume</p>
          <p><strong>Smart Dilution:</strong> Volumes &lt;1 µL trigger smart dilutions using easy-to-pipette volumes</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Reaction Setup
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="input-label">Total Reaction Volume (µL) *</label>
            <input
              type="number"
              className="input-field"
              placeholder="15"
              step="any"
              min="1"
              value={totalVolume}
              onChange={(e) => setTotalVolume(parseFloat(e.target.value) || 15)}
            />
          </div>
          <div>
            <label className="input-label">
              Molar Ratio *
              <span className="text-xs text-slate-500 ml-2">(1 = equimolar)</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="1"
              step="0.1"
              min="0.1"
              value={molarRatio}
              onChange={(e) => setMolarRatio(parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            DNA Fragments
          </h3>
          <button onClick={addFragment} className="btn-secondary">
            <Plus className="w-4 h-4 mr-2" />
            Add Fragment
          </button>
        </div>

        <div className="space-y-4">
          {fragments.map((fragment, index) => (
            <div key={fragment.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Fragment {index + 1}
                </h4>
                {fragments.length > 1 && (
                  <button
                    onClick={() => removeFragment(fragment.id)}
                    className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="input-label">Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Fragment name"
                    value={fragment.name}
                    onChange={(e) => updateFragment(fragment.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">Size (bp) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 3000"
                    step="1"
                    min="1"
                    value={fragment.size}
                    onChange={(e) => updateFragment(fragment.id, 'size', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="input-label">Concentration (ng/µL) *</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 100"
                    step="any"
                    min="0.01"
                    value={fragment.concentration}
                    onChange={(e) => updateFragment(fragment.id, 'concentration', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={calculate} className="btn-primary w-full mt-6">
          <Dna className="w-5 h-5 mr-2" />
          Calculate Assembly
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="card bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-2 border-primary-200 dark:border-primary-800">
          <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200">
            Assembly Protocol
          </h3>

          {/* Master Mix and Water */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                NEBuilder Ligase Master Mix
              </div>
              <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                {masterMixVolume.toFixed(2)} µL
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                (1/3 of total volume)
              </div>
            </div>
            <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Nuclease-free Water
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {waterVolume >= 0 ? waterVolume.toFixed(2) : '0.00'} µL
              </div>
              {waterVolume < 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠️ Total DNA volume exceeds capacity
                </div>
              )}
            </div>
          </div>

          {/* DNA Fragments */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">
              DNA Fragments
            </h4>

            {results.map((result) => (
              <div key={result.fragment.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                      {result.fragment.name}
                    </h5>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {result.fragment.size} bp • {result.fragment.concentration} ng/µL
                    </div>
                  </div>
                  {result.needsDilution && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">Dilution needed</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Target</div>
                    <div className="font-mono font-semibold">{result.targetPmol.toFixed(3)} pmol</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Mass needed</div>
                    <div className="font-mono font-semibold">{result.massNeeded.toFixed(2)} ng</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Volume needed</div>
                    <div className="font-mono font-semibold">{result.volumeNeeded.toFixed(2)} µL</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Add to reaction</div>
                    <div className="font-mono font-bold text-lg text-primary-700 dark:text-primary-300">
                      {result.needsDilution && result.smartDilution
                        ? result.smartDilution.volumeToUse.toFixed(1)
                        : result.volumeNeeded.toFixed(2)} µL
                      {result.needsDilution && <span className="text-xs font-normal ml-1">(diluted)</span>}
                    </div>
                  </div>
                </div>

                {result.needsDilution && result.smartDilution && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                      Smart Dilution (Easy Pipetting)
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                        <strong>Step 1:</strong> Take <span className="font-mono font-bold">{result.smartDilution.stockVolume} µL</span> of stock DNA ({result.fragment.concentration} ng/µL)
                      </div>
                      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                        <strong>Step 2:</strong> Add <span className="font-mono font-bold">{result.smartDilution.waterForDilution} µL</span> water → {result.smartDilution.totalDilutionVolume} µL total at {result.smartDilution.dilutedConcentration.toFixed(2)} ng/µL
                      </div>
                      <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                        <strong>Step 3:</strong> Use <span className="font-mono font-bold">{result.smartDilution.volumeToUse} µL</span> of diluted stock in reaction
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-2 italic">
                        This replaces {result.smartDilution.waterSaved.toFixed(1)} µL of water in the reaction (already accounted for above)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">
              Reaction Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total Volume</div>
                <div className="font-mono font-bold">{totalVolume} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Master Mix</div>
                <div className="font-mono font-bold">{masterMixVolume.toFixed(2)} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total DNA</div>
                <div className="font-mono font-bold">{totalDNAVolume.toFixed(2)} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Water</div>
                <div className="font-mono font-bold">{waterVolume >= 0 ? waterVolume.toFixed(2) : '0.00'} µL</div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Codon Optimization Tab */}
      {activeTab === 'codon' && (
        <CodonOptimizerAdvanced />
      )}

      {/* Library Design Tab */}
      {activeTab === 'library' && (
        <LibraryDesign />
      )}
    </div>
  );
}
