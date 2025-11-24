/**
 * DNA Tools - Golden Gate Assembly Calculator & Codon Optimization
 * Based on NEB NEBuilder Ligase Master Mix protocol
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Dna, Plus, Trash2, AlertCircle, Zap, FlaskRound, Info, Star, Sparkles, GitMerge } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import CodonOptimizerAdvanced from './CodonOptimizerAdvanced';
import LibraryDesign from './LibraryDesign';

type DNATab = 'assembly' | 'hifi' | 'codon' | 'library';
type VectorSelection = 'largest' | 'smallest' | 'manual';
type GoldenGateEnzyme = 'BsaI-HFv2' | 'BsmBI-v2' | 'BbsI-HF' | 'Esp3I' | 'SapI' | 'PaqCI';
type BufferSystem = 'T4-ligase-buffer' | 'NEBridge-master-mix';
type AssemblyComplexity = 'standard' | 'complex' | 'library';

// Enzyme information database (base info only - cycling depends on fragment count)
const ENZYME_INFO: Record<GoldenGateEnzyme, {
  temp: number;
  overhang: number;
  recognition: string;
  notes: string;
  heatInactivation: number; // °C for final heat inactivation
}> = {
  'BsaI-HFv2': {
    temp: 37, overhang: 4, recognition: "GGTCTC",
    notes: 'Most common, Time-Saver qualified',
    heatInactivation: 60
  },
  'BsmBI-v2': {
    temp: 42, overhang: 4, recognition: "CGTCTC",
    notes: 'Higher temp, good for GC-rich',
    heatInactivation: 60
  },
  'Esp3I': {
    temp: 37, overhang: 4, recognition: "CGTCTC",
    notes: 'BsmBI isoschizomer, faster at 37°C',
    heatInactivation: 60
  },
  'BbsI-HF': {
    temp: 37, overhang: 4, recognition: "GAAGAC",
    notes: 'Alternative recognition site',
    heatInactivation: 65
  },
  'SapI': {
    temp: 37, overhang: 3, recognition: "GCTCTTC",
    notes: '7bp recognition, 3bp overhang',
    heatInactivation: 65
  },
  'PaqCI': {
    temp: 37, overhang: 4, recognition: "CACCTGC",
    notes: '7bp recognition, reduces internal sites',
    heatInactivation: 60
  },
};

// Generate cycling protocol based on fragment count, enzyme, and complexity
// Based on NEB recommendations: https://www.neb.com/tools-and-resources/usage-guidelines/technical-tips-for-optimizing-golden-gate-assembly-reactions
interface CyclingProtocol {
  method: 'isothermal' | 'cycling';
  digestTemp: number;
  ligationTemp: number;
  digestTime: string;
  ligationTime: string;
  cycles: number;
  heatInactivation: { temp: number; time: string };
  notes: string;
  summary: string;
}

function getCyclingProtocol(
  enzyme: GoldenGateEnzyme,
  fragmentCount: number,
  complexity: AssemblyComplexity
): CyclingProtocol {
  const enzymeInfo = ENZYME_INFO[enzyme];
  const digestTemp = enzymeInfo.temp;
  const heatInactivation = { temp: enzymeInfo.heatInactivation, time: '5 min' };

  // Library assembly - isothermal for maximum diversity representation
  if (complexity === 'library') {
    return {
      method: 'isothermal',
      digestTemp,
      ligationTemp: digestTemp, // Same temp for isothermal
      digestTime: fragmentCount > 10 ? '16 hr' : '5 hr',
      ligationTime: '-',
      cycles: 1,
      heatInactivation,
      notes: 'Isothermal incubation for library diversity. Use high-conc T4 ligase for >10 parts.',
      summary: `${digestTemp}°C for ${fragmentCount > 10 ? '16 hr' : '5 hr'}, then ${heatInactivation.temp}°C ${heatInactivation.time}`
    };
  }

  // Simple assembly (1-4 fragments) - can use short isothermal
  if (fragmentCount <= 4 && complexity === 'standard') {
    return {
      method: 'isothermal',
      digestTemp,
      ligationTemp: digestTemp,
      digestTime: '1 hr',
      ligationTime: '-',
      cycles: 1,
      heatInactivation,
      notes: 'Simple 1-4 fragment assembly works well with isothermal incubation.',
      summary: `${digestTemp}°C for 1 hr, then ${heatInactivation.temp}°C ${heatInactivation.time}`
    };
  }

  // Standard cycling protocol for 5-10 fragments
  if (fragmentCount <= 10) {
    return {
      method: 'cycling',
      digestTemp,
      ligationTemp: 16,
      digestTime: '1 min',
      ligationTime: '1 min',
      cycles: 30,
      heatInactivation,
      notes: 'Standard cycling for 5-10 fragments. 1 µL enzyme mix per 20 µL.',
      summary: `30× (${digestTemp}°C 1min → 16°C 1min), then ${heatInactivation.temp}°C ${heatInactivation.time}`
    };
  }

  // Complex assembly (>10 fragments) - extended cycling with longer times
  const cycles = complexity === 'complex' ? 60 : 45;
  return {
    method: 'cycling',
    digestTemp,
    ligationTemp: 16,
    digestTime: '5 min',
    ligationTime: '5 min',
    cycles,
    heatInactivation,
    notes: `Extended cycling for ${fragmentCount} fragments. Use 2 µL enzyme mix per 20 µL. Consider overnight protocol.`,
    summary: `${cycles}× (${digestTemp}°C 5min → 16°C 5min), then ${heatInactivation.temp}°C ${heatInactivation.time}`
  };
}

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
  isVector: boolean;
  appliedRatio: number; // actual ratio applied (1 for vector, insertRatio for inserts)
}

interface RatioRecommendation {
  ratio: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// HiFi Assembly specific interfaces
interface HiFiFragment {
  id: string;
  name: string;
  size: number; // base pairs
  concentration: number; // ng/µl
  isVector: boolean;
  overlapLength: number; // bp overlap with adjacent fragment
}

interface HiFiCalculationResult {
  fragment: HiFiFragment;
  targetPmol: number;
  massNeeded: number; // ng
  volumeNeeded: number; // µL
  needsDilution: boolean;
  smartDilution?: SmartDilution;
}

// HiFi Assembly protocol info based on NEB recommendations
function getHiFiProtocol(fragmentCount: number): {
  overlapRecommendation: string;
  pmolRange: string;
  insertRatio: string;
  incubationTime: string;
  notes: string;
} {
  if (fragmentCount <= 3) {
    return {
      overlapRecommendation: '15-20 bp',
      pmolRange: '0.03-0.2 pmol total',
      insertRatio: '2:1 (insert:vector)',
      incubationTime: '15 min at 50°C',
      notes: 'Simple assembly - short incubation sufficient'
    };
  } else if (fragmentCount <= 6) {
    return {
      overlapRecommendation: '20-30 bp',
      pmolRange: '0.2-0.5 pmol total',
      insertRatio: '1:1 (equimolar)',
      incubationTime: '60 min at 50°C',
      notes: 'Multi-fragment assembly - longer overlaps improve efficiency'
    };
  } else {
    return {
      overlapRecommendation: '25-40 bp',
      pmolRange: '0.5-1.0 pmol total',
      insertRatio: '1:1 (equimolar)',
      incubationTime: '60 min at 50°C',
      notes: 'Complex assembly - consider splitting into sub-assemblies'
    };
  }
}

export default function DNA() {
  const { showToast } = useApp();

  // Tab state
  const [activeTab, setActiveTab] = useState<DNATab>('assembly');

  // Input state
  const [fragments, setFragments] = useState<DNAFragment[]>([
    { id: '1', name: 'Vector', size: 5000, concentration: 100 },
    { id: '2', name: 'Insert 1', size: 1000, concentration: 100 },
  ]);
  const [insertRatio, setInsertRatio] = useState(2); // Default 2:1 insert:vector (NEB recommended)
  const [totalVolume, setTotalVolume] = useState(20); // µl - T4 buffer: 20 µL, NEBridge: 15 µL
  const [vectorSelection, setVectorSelection] = useState<VectorSelection>('largest');
  const [manualVectorId, setManualVectorId] = useState<string | null>(null);
  const [enzyme, setEnzyme] = useState<GoldenGateEnzyme>('BsaI-HFv2');
  const [bufferSystem, setBufferSystem] = useState<BufferSystem>('T4-ligase-buffer');
  const [assemblyComplexity, setAssemblyComplexity] = useState<AssemblyComplexity>('standard');

  // Results
  const [results, setResults] = useState<CalculationResult[] | null>(null);

  // ============ HiFi Assembly State ============
  const [hifiFragments, setHifiFragments] = useState<HiFiFragment[]>([
    { id: '1', name: 'Vector', size: 5000, concentration: 100, isVector: true, overlapLength: 20 },
    { id: '2', name: 'Insert 1', size: 1500, concentration: 50, isVector: false, overlapLength: 20 },
  ]);
  const [hifiTotalVolume, setHifiTotalVolume] = useState(20); // Standard 20 µL reaction
  const [hifiResults, setHifiResults] = useState<HiFiCalculationResult[] | null>(null);

  // HiFi protocol recommendation based on fragment count
  const hifiProtocol = useMemo(() => {
    return getHiFiProtocol(hifiFragments.length);
  }, [hifiFragments.length]);

  // Track if recommendation should be highlighted (after size change)
  const [showRecommendationHighlight, setShowRecommendationHighlight] = useState(false);
  const prevRecommendationRef = useRef<number>(2);

  // Standard volumes for each buffer system (NEB protocols)
  // T4 DNA Ligase Buffer: 20 µL standard reaction
  // NEBridge Ligase Master Mix: 15 µL standard reaction
  const getStandardVolume = (buffer: BufferSystem): number => {
    return buffer === 'NEBridge-master-mix' ? 15 : 20;
  };

  // Update total volume when buffer system changes (only if at standard volume)
  const prevBufferRef = useRef<BufferSystem>(bufferSystem);
  useEffect(() => {
    const oldStandard = getStandardVolume(prevBufferRef.current);
    const newStandard = getStandardVolume(bufferSystem);
    // Only auto-update if user hasn't changed volume from the previous standard
    if (totalVolume === oldStandard) {
      setTotalVolume(newStandard);
    }
    prevBufferRef.current = bufferSystem;
  }, [bufferSystem, totalVolume]);

  // Determine which fragment is the vector
  const vectorId = useMemo(() => {
    if (fragments.length === 0) return null;
    if (vectorSelection === 'manual' && manualVectorId) {
      return fragments.find(f => f.id === manualVectorId) ? manualVectorId : fragments[0].id;
    }
    // Auto-select based on size
    const sorted = [...fragments].sort((a, b) => b.size - a.size);
    return vectorSelection === 'largest' ? sorted[0].id : sorted[sorted.length - 1].id;
  }, [fragments, vectorSelection, manualVectorId]);

  // Get smart ratio recommendation based on fragment sizes
  const ratioRecommendation = useMemo((): RatioRecommendation => {
    if (fragments.length < 2 || !vectorId) {
      return { ratio: 1, reason: 'Single fragment - equimolar', confidence: 'high' };
    }

    const vector = fragments.find(f => f.id === vectorId);
    const inserts = fragments.filter(f => f.id !== vectorId);
    if (!vector || inserts.length === 0) {
      return { ratio: 1, reason: 'No inserts - equimolar', confidence: 'high' };
    }

    const smallestInsert = Math.min(...inserts.map(i => i.size));
    const largestInsert = Math.max(...inserts.map(i => i.size));
    const avgInsertSize = inserts.reduce((sum, i) => sum + i.size, 0) / inserts.length;

    // NEB recommendations based on insert characteristics
    // Small fragments (<250 bp): use 3:1 to 5:1
    // Standard PCR amplicons (250-3000 bp): use 2:1
    // Large fragments (>3000 bp): use 1:1 or consider precloning
    // Multi-fragment: equimolar often works best

    if (inserts.length > 3) {
      return {
        ratio: 1,
        reason: 'Multi-fragment assembly (>3 inserts) - equimolar recommended for balanced ligation',
        confidence: 'high'
      };
    }

    if (smallestInsert < 250) {
      return {
        ratio: 5,
        reason: `Small insert detected (${smallestInsert} bp < 250 bp) - higher ratio improves assembly`,
        confidence: 'high'
      };
    }

    if (largestInsert > 3000) {
      return {
        ratio: 1,
        reason: `Large insert (${largestInsert} bp > 3 kb) - equimolar or consider precloning`,
        confidence: 'medium'
      };
    }

    if (avgInsertSize < 500) {
      return {
        ratio: 3,
        reason: `Short inserts (avg ${Math.round(avgInsertSize)} bp) - 3:1 ratio recommended`,
        confidence: 'high'
      };
    }

    // Standard recommendation for typical inserts
    return {
      ratio: 2,
      reason: 'Standard PCR amplicons - 2:1 insert:vector (NEB recommended)',
      confidence: 'high'
    };
  }, [fragments, vectorId]);

  // Get dynamic cycling protocol based on fragment count, enzyme, and complexity
  const cyclingProtocol = useMemo(() => {
    return getCyclingProtocol(enzyme, fragments.length, assemblyComplexity);
  }, [enzyme, fragments.length, assemblyComplexity]);

  // Show notification when recommendation changes
  useEffect(() => {
    if (ratioRecommendation.ratio !== prevRecommendationRef.current && fragments.length >= 2) {
      setShowRecommendationHighlight(true);
      if (ratioRecommendation.ratio !== insertRatio) {
        showToast('info', `Recommended ratio updated to ${ratioRecommendation.ratio}:1 based on fragment sizes`);
      }
      prevRecommendationRef.current = ratioRecommendation.ratio;
    }
  }, [ratioRecommendation.ratio, fragments.length, insertRatio, showToast]);

  // Apply recommended ratio and calculate
  const applyRecommendationAndCalculate = () => {
    setInsertRatio(ratioRecommendation.ratio);
    setShowRecommendationHighlight(false);
    // Need to use setTimeout to ensure state is updated before calculate runs
    setTimeout(() => {
      calculateWithRatio(ratioRecommendation.ratio);
    }, 0);
  };

  // Add new fragment
  const addFragment = () => {
    const newId = Date.now().toString();
    const insertNum = fragments.filter(f => f.id !== vectorId).length + 1;
    setFragments([...fragments, {
      id: newId,
      name: `Insert ${insertNum}`,
      size: 1000,
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

  // Calculate Golden Gate Assembly (with optional ratio override)
  const calculateWithRatio = (ratioOverride?: number) => {
    const ratioToUse = ratioOverride ?? insertRatio;

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

    // Base pmol for vector (0.05 pmol at standard reaction volume)
    // Scale proportionally with total volume to maintain proper DNA concentration
    // T4 buffer: 20 µL standard, NEBridge: 15 µL standard
    const standardVolume = getStandardVolume(bufferSystem);
    const basePmol = 0.05 * (totalVolume / standardVolume);

    // Calculate for each fragment with proper insert:vector ratio
    // Vector gets 1x, inserts get ratioToUse x
    const calculationResults: CalculationResult[] = fragments.map(fragment => {
      const isVector = fragment.id === vectorId;
      const appliedRatio = isVector ? 1 : ratioToUse;
      const targetPmol = basePmol * appliedRatio;

      const massNeeded = calculateMass(fragment.size, targetPmol);
      const volumeNeeded = massNeeded / fragment.concentration;

      let result: CalculationResult = {
        fragment,
        targetPmol,
        massNeeded,
        volumeNeeded,
        needsDilution: volumeNeeded < 1,
        isVector,
        appliedRatio,
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

  // Wrapper for calculate button
  const calculate = () => calculateWithRatio();

  // Calculate total DNA volume
  const totalDNAVolume = results ? results.reduce((sum, r) => {
    return sum + (r.needsDilution && r.smartDilution
      ? r.smartDilution.volumeToUse
      : r.volumeNeeded);
  }, 0) : 0;

  // ============ HiFi Assembly Functions ============

  // Add HiFi fragment
  const addHifiFragment = () => {
    const newId = Date.now().toString();
    const insertNum = hifiFragments.filter(f => !f.isVector).length + 1;
    setHifiFragments([...hifiFragments, {
      id: newId,
      name: `Insert ${insertNum}`,
      size: 1000,
      concentration: 50,
      isVector: false,
      overlapLength: hifiFragments.length <= 3 ? 20 : 25, // Longer overlaps for more fragments
    }]);
  };

  // Remove HiFi fragment
  const removeHifiFragment = (id: string) => {
    if (hifiFragments.length > 1) {
      setHifiFragments(hifiFragments.filter(f => f.id !== id));
    } else {
      showToast('error', 'At least one fragment is required');
    }
  };

  // Update HiFi fragment
  const updateHifiFragment = (id: string, field: keyof HiFiFragment, value: string | number | boolean) => {
    setHifiFragments(hifiFragments.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  // Set vector for HiFi
  const setHifiVector = (id: string) => {
    setHifiFragments(hifiFragments.map(f => ({
      ...f,
      isVector: f.id === id
    })));
  };

  // Calculate HiFi Assembly
  // Based on NEB: pmol = (weight in ng) × 1000 / (bp × 650)
  // Rearranged: ng = pmol × bp × 650 / 1000 = pmol × bp × 0.65
  const calculateHifi = () => {
    if (hifiFragments.length === 0) {
      showToast('error', 'Please add at least one DNA fragment');
      return;
    }

    // Validate inputs
    for (const fragment of hifiFragments) {
      if (!fragment.size || fragment.size <= 0) {
        showToast('error', `Invalid size for ${fragment.name}`);
        return;
      }
      if (!fragment.concentration || fragment.concentration <= 0) {
        showToast('error', `Invalid concentration for ${fragment.name}`);
        return;
      }
    }

    const vectorFragment = hifiFragments.find(f => f.isVector);
    if (!vectorFragment) {
      showToast('error', 'Please select a vector fragment');
      return;
    }

    // NEB recommendations for pmol amounts
    // 2-3 fragments: 0.03-0.2 pmol total, 2:1 insert:vector
    // 4-6 fragments: 0.2-0.5 pmol total, equimolar
    // >6 fragments: 0.5-1.0 pmol total, equimolar
    const fragmentCount = hifiFragments.length;
    let vectorPmol: number;
    let insertPmol: number;

    if (fragmentCount <= 3) {
      // 2:1 ratio, ~0.05 pmol vector, ~0.1 pmol each insert
      vectorPmol = 0.05;
      insertPmol = 0.1;
    } else if (fragmentCount <= 6) {
      // Equimolar, ~0.05 pmol each (total ~0.2-0.3 pmol)
      vectorPmol = 0.05;
      insertPmol = 0.05;
    } else {
      // Equimolar but slightly higher for complex assemblies
      vectorPmol = 0.075;
      insertPmol = 0.075;
    }

    const calculationResults: HiFiCalculationResult[] = hifiFragments.map(fragment => {
      const targetPmol = fragment.isVector ? vectorPmol : insertPmol;
      // mass (ng) = pmol × bp × 650 / 1000
      const massNeeded = targetPmol * fragment.size * 0.65;
      const volumeNeeded = massNeeded / fragment.concentration;

      let result: HiFiCalculationResult = {
        fragment,
        targetPmol,
        massNeeded,
        volumeNeeded,
        needsDilution: volumeNeeded < 1,
      };

      // Smart dilution for small volumes
      if (volumeNeeded < 1) {
        const stockVolume = 1;
        const targetDilutedVolume = 2;
        const totalDilutionVolume = (stockVolume * fragment.concentration * targetDilutedVolume) / massNeeded;
        const waterForDilution = totalDilutionVolume - stockVolume;
        const dilutedConcentration = (stockVolume * fragment.concentration) / totalDilutionVolume;
        const volumeToUse = targetDilutedVolume;
        const waterSaved = volumeToUse - volumeNeeded;

        result.smartDilution = {
          stockVolume,
          waterForDilution: Math.round(waterForDilution * 10) / 10,
          totalDilutionVolume: Math.round(totalDilutionVolume * 10) / 10,
          dilutedConcentration,
          volumeToUse,
          waterSaved,
        };
      }

      return result;
    });

    setHifiResults(calculationResults);
    showToast('success', 'HiFi Assembly calculated');
  };

  // Calculate HiFi total DNA volume
  const hifiTotalDNAVolume = hifiResults ? hifiResults.reduce((sum, r) => {
    return sum + (r.needsDilution && r.smartDilution
      ? r.smartDilution.volumeToUse
      : r.volumeNeeded);
  }, 0) : 0;

  // HiFi master mix is 2X, so use 10 µL for 20 µL reaction
  const hifiMasterMixVolume = hifiTotalVolume / 2;
  const hifiWaterVolume = hifiTotalVolume - hifiMasterMixVolume - hifiTotalDNAVolume;

  // NEB Golden Gate Assembly reagent volumes
  // Enzyme amount is based on fragment count, not volume (NEB protocol)
  // ≤10 inserts: 1 µL enzyme mix, >10 inserts: 2 µL enzyme mix
  const reagentVolumes = useMemo(() => {
    // Enzyme volume based on fragment count (NEB recommendation)
    const enzymeVol = fragments.length > 10 ? 2 : 1;

    if (bufferSystem === 'NEBridge-master-mix') {
      // NEBridge Ligase Master Mix is 3X, so use 1/3 of total volume
      // Standard 15 µL reaction = 5 µL master mix
      const masterMixVolume = totalVolume / 3;
      return {
        masterMixVolume,
        bufferVolume: 0,
        ligaseVolume: 0,
        enzymeVolume: enzymeVol,
        totalReagentVolume: masterMixVolume + enzymeVol,
      };
    } else {
      // T4 DNA Ligase Buffer system (individual components)
      // Standard 20 µL reaction: 2 µL buffer, 1 µL ligase, 1 µL enzyme
      const bufferVol = totalVolume / 10; // 10X buffer
      const ligaseVol = 1; // T4 DNA Ligase: 1 µL per reaction (NEB)
      return {
        masterMixVolume: 0,
        bufferVolume: bufferVol,
        ligaseVolume: ligaseVol,
        enzymeVolume: enzymeVol,
        totalReagentVolume: bufferVol + ligaseVol + enzymeVol,
      };
    }
  }, [bufferSystem, totalVolume, fragments.length]);

  const { masterMixVolume, bufferVolume, ligaseVolume, enzymeVolume, totalReagentVolume } = reagentVolumes;

  // Water volume (total - reagents - DNA)
  const waterVolume = totalVolume - totalReagentVolume - totalDNAVolume;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Dna className="w-7 h-7" />
          DNA Tools
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          DNA Assembly, Codon Optimization, and Library Design
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('assembly')}
            className={`calc-mode-tab ${activeTab === 'assembly' ? 'active' : ''}`}
          >
            <Dna className="w-4 h-4 inline mr-2" />
            Golden Gate
          </button>
          <button
            onClick={() => setActiveTab('hifi')}
            className={`calc-mode-tab ${activeTab === 'hifi' ? 'active' : ''}`}
          >
            <GitMerge className="w-4 h-4 inline mr-2" />
            HiFi Assembly
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="space-y-1">
            <p><strong>Enzyme:</strong> {enzyme} ({ENZYME_INFO[enzyme].recognition}, {ENZYME_INFO[enzyme].overhang}bp overhang)</p>
            <p><strong>Temperature:</strong> {ENZYME_INFO[enzyme].temp}°C</p>
            <p><strong>Notes:</strong> {ENZYME_INFO[enzyme].notes}</p>
          </div>
          <div className="space-y-1">
            <p><strong>Buffer:</strong> {bufferSystem === 'NEBridge-master-mix' ? 'NEBridge Ligase Master Mix (3X)' : 'T4 DNA Ligase Buffer (10X)'}</p>
            <p><strong>Ratio:</strong> {insertRatio}:1 insert:vector</p>
            <p><strong>Base:</strong> 0.05 pmol vector at {getStandardVolume(bufferSystem)} µL (scales with volume)</p>
          </div>
          <div className="space-y-1">
            <p><strong>Cycling Protocol ({cyclingProtocol.method}):</strong></p>
            <p className="text-xs font-mono bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 p-2 rounded border border-blue-200 dark:border-blue-700">{cyclingProtocol.summary}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{cyclingProtocol.notes}</p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Reaction Setup
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="input-label">Total Reaction Volume (µL) *</label>
            <input
              type="number"
              className="input-field"
              placeholder={bufferSystem === 'NEBridge-master-mix' ? '15' : '20'}
              step="5"
              min="10"
              value={totalVolume}
              onChange={(e) => setTotalVolume(parseFloat(e.target.value) || getStandardVolume(bufferSystem))}
            />
            <div className="text-xs text-slate-500 mt-1">
              Standard: {getStandardVolume(bufferSystem)} µL for {bufferSystem === 'NEBridge-master-mix' ? 'NEBridge' : 'T4 buffer'}
            </div>
          </div>
          <div>
            <label className="input-label">Buffer System</label>
            <select
              className="input-field"
              value={bufferSystem}
              onChange={(e) => setBufferSystem(e.target.value as BufferSystem)}
            >
              <option value="T4-ligase-buffer">T4 DNA Ligase Buffer (10X)</option>
              <option value="NEBridge-master-mix">NEBridge Ligase Master Mix (3X)</option>
            </select>
            <div className="text-xs text-slate-500 mt-1">
              {bufferSystem === 'NEBridge-master-mix' ? 'Better fidelity for complex assemblies' : 'Standard, economical option'}
            </div>
          </div>
          <div>
            <label className="input-label">Type IIS Enzyme</label>
            <select
              className="input-field"
              value={enzyme}
              onChange={(e) => setEnzyme(e.target.value as GoldenGateEnzyme)}
            >
              <optgroup label="4-bp overhang (common)">
                <option value="BsaI-HFv2">BsaI-HFv2 (37°C) - Most common</option>
                <option value="BsmBI-v2">BsmBI-v2 (42°C) - GC-rich DNA</option>
                <option value="Esp3I">Esp3I (37°C) - BsmBI isoschizomer</option>
                <option value="BbsI-HF">BbsI-HF (37°C) - Alternative site</option>
                <option value="PaqCI">PaqCI (37°C) - 7bp recognition</option>
              </optgroup>
              <optgroup label="3-bp overhang">
                <option value="SapI">SapI (37°C) - 7bp recognition, frame-conserving</option>
              </optgroup>
            </select>
            <div className="text-xs text-slate-500 mt-1">
              {ENZYME_INFO[enzyme].recognition} | {ENZYME_INFO[enzyme].notes}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="input-label">Assembly Complexity</label>
            <select
              className="input-field"
              value={assemblyComplexity}
              onChange={(e) => setAssemblyComplexity(e.target.value as AssemblyComplexity)}
            >
              <option value="standard">Standard (default protocol)</option>
              <option value="complex">Complex (extended cycling)</option>
              <option value="library">Library (isothermal, max diversity)</option>
            </select>
            <div className="text-xs text-slate-500 mt-1">
              {assemblyComplexity === 'standard' && 'Auto-selects isothermal (≤4 parts) or cycling (5+ parts)'}
              {assemblyComplexity === 'complex' && 'Extended 60-cycle protocol for >10 fragments'}
              {assemblyComplexity === 'library' && 'Long isothermal incubation for library diversity'}
            </div>
          </div>
          <div>
            <label className="input-label">
              Insert:Vector Ratio *
              <span className="text-xs text-slate-500 ml-2">(e.g., 2 = 2:1)</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="2"
              step="0.5"
              min="0.5"
              max="10"
              value={insertRatio}
              onChange={(e) => {
                setInsertRatio(parseFloat(e.target.value) || 2);
                setShowRecommendationHighlight(false);
              }}
            />
            <div className="text-xs text-slate-500 mt-1">
              Inserts at {insertRatio}× pmol vs vector at 1×
            </div>
          </div>
          <div>
            <label className="input-label">Vector Selection</label>
            <select
              className="input-field"
              value={vectorSelection}
              onChange={(e) => setVectorSelection(e.target.value as VectorSelection)}
            >
              <option value="largest">Auto: Largest fragment</option>
              <option value="smallest">Auto: Smallest fragment</option>
              <option value="manual">Manual selection</option>
            </select>
          </div>
        </div>

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
          {fragments.map((fragment, index) => {
            const isVector = fragment.id === vectorId;
            return (
            <div key={fragment.id} className={`p-4 rounded-lg border-2 ${
              isVector
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    {fragment.name || `Fragment ${index + 1}`}
                  </h4>
                  {isVector && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                      <Star className="w-3 h-3" />
                      Vector (1×)
                    </span>
                  )}
                  {!isVector && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                      Insert ({insertRatio}×)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {vectorSelection === 'manual' && !isVector && (
                    <button
                      onClick={() => setManualVectorId(fragment.id)}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Set as vector
                    </button>
                  )}
                  {fragments.length > 1 && (
                    <button
                      onClick={() => removeFragment(fragment.id)}
                      className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
                    onBlur={() => {
                      // Trigger recommendation highlight when user finishes editing size
                      if (fragments.length >= 2 && insertRatio !== ratioRecommendation.ratio) {
                        setShowRecommendationHighlight(true);
                      }
                    }}
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
          )})}
        </div>

        {/* Smart Recommendation - Inline */}
        {fragments.length >= 2 && (
          <div className={`mt-4 p-3 rounded-lg border transition-all duration-300 ${
            showRecommendationHighlight && insertRatio !== ratioRecommendation.ratio
              ? 'ring-2 ring-primary-400'
              : ''
          } ${
            ratioRecommendation.confidence === 'high'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
              : ratioRecommendation.confidence === 'medium'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Info className={`w-4 h-4 ${
                  ratioRecommendation.confidence === 'high' ? 'text-green-600 dark:text-green-400' :
                  ratioRecommendation.confidence === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-slate-500'
                }`} />
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Recommended: {ratioRecommendation.ratio}:1
                  </span>
                  {insertRatio === ratioRecommendation.ratio && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">(applied)</span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    — {ratioRecommendation.reason}
                  </span>
                </div>
              </div>
              {insertRatio !== ratioRecommendation.ratio && (
                <button
                  onClick={applyRecommendationAndCalculate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply & Calculate
                </button>
              )}
            </div>
          </div>
        )}

        <button onClick={calculate} className="btn-primary w-full mt-4">
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

          {/* Reagents - changes based on buffer system */}
          <div className={`grid grid-cols-2 ${bufferSystem === 'NEBridge-master-mix' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-3 mb-6`}>
            {bufferSystem === 'NEBridge-master-mix' ? (
              // NEBridge Master Mix system
              <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                  NEBridge Ligase Master Mix (3X)
                </div>
                <div className="text-xl font-bold text-primary-700 dark:text-primary-300">
                  {masterMixVolume.toFixed(1)} µL
                </div>
                <div className="text-xs text-slate-500 mt-1">Contains T4 Ligase + Buffer</div>
              </div>
            ) : (
              // T4 Ligase Buffer system (individual components)
              <>
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    T4 DNA Ligase Buffer (10X)
                  </div>
                  <div className="text-xl font-bold text-primary-700 dark:text-primary-300">
                    {bufferVolume.toFixed(1)} µL
                  </div>
                </div>
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    T4 DNA Ligase
                  </div>
                  <div className="text-xl font-bold text-primary-700 dark:text-primary-300">
                    {ligaseVolume.toFixed(1)} µL
                  </div>
                </div>
              </>
            )}
            <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                {enzyme}
              </div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {enzymeVolume.toFixed(1)} µL
              </div>
              <div className="text-xs text-slate-500 mt-1">{ENZYME_INFO[enzyme].temp}°C</div>
            </div>
            <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                Nuclease-free Water
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                {waterVolume >= 0 ? waterVolume.toFixed(1) : '0.0'} µL
              </div>
              {waterVolume < 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  ⚠️ Volume exceeds capacity
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
              <div key={result.fragment.id} className={`p-4 rounded-lg border-2 ${
                result.isVector
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                        {result.fragment.name}
                      </h5>
                      {result.isVector ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                          <Star className="w-3 h-3" />
                          Vector
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                          Insert
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {result.fragment.size} bp • {result.fragment.concentration} ng/µL • {result.appliedRatio}× ratio
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total Volume</div>
                <div className="font-mono font-bold">{totalVolume} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Reagents</div>
                <div className="font-mono font-bold">{totalReagentVolume.toFixed(1)} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Total DNA</div>
                <div className="font-mono font-bold">{totalDNAVolume.toFixed(2)} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Water</div>
                <div className="font-mono font-bold">{waterVolume >= 0 ? waterVolume.toFixed(1) : '0.0'} µL</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Enzyme</div>
                <div className="font-mono font-bold text-orange-600 dark:text-orange-400">{enzyme}</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Buffer</div>
                <div className="font-mono font-bold text-xs">{bufferSystem === 'NEBridge-master-mix' ? 'NEBridge 3X' : 'T4 Buffer'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* HiFi Assembly Tab */}
      {activeTab === 'hifi' && (
        <>
          {/* Protocol Information */}
          <div className="card bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">
              NEBuilder HiFi DNA Assembly Protocol
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <p><strong>Method:</strong> Exonuclease + Polymerase + Ligase</p>
                <p><strong>Temperature:</strong> 50°C (isothermal)</p>
                <p><strong>Master Mix:</strong> NEBuilder HiFi (2X)</p>
              </div>
              <div className="space-y-1">
                <p><strong>Overlaps:</strong> {hifiProtocol.overlapRecommendation}</p>
                <p><strong>DNA Amount:</strong> {hifiProtocol.pmolRange}</p>
                <p><strong>Ratio:</strong> {hifiProtocol.insertRatio}</p>
              </div>
              <div className="space-y-1">
                <p><strong>Incubation:</strong></p>
                <p className="text-xs font-mono bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 p-2 rounded border border-green-200 dark:border-green-700">
                  {hifiProtocol.incubationTime}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{hifiProtocol.notes}</p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
              Reaction Setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="input-label">Total Reaction Volume (µL) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="20"
                  step="5"
                  min="10"
                  value={hifiTotalVolume}
                  onChange={(e) => setHifiTotalVolume(parseFloat(e.target.value) || 20)}
                />
                <div className="text-xs text-slate-500 mt-1">
                  Standard: 20 µL (10 µL master mix + DNA + water)
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
                  Fragments: {hifiFragments.length}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  {hifiFragments.length <= 3 ? '2-3 fragments: 15 min incubation' :
                   hifiFragments.length <= 6 ? '4-6 fragments: 60 min incubation' :
                   '>6 fragments: 60 min, consider sub-assemblies'}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                DNA Fragments
              </h3>
              <button onClick={addHifiFragment} className="btn-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Add Fragment
              </button>
            </div>

            <div className="space-y-4">
              {hifiFragments.map((fragment, index) => (
                <div key={fragment.id} className={`p-4 rounded-lg border-2 ${
                  fragment.isVector
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                        {fragment.name || `Fragment ${index + 1}`}
                      </h4>
                      {fragment.isVector && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                          <Star className="w-3 h-3" />
                          Vector
                        </span>
                      )}
                      {!fragment.isVector && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                          Insert
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!fragment.isVector && (
                        <button
                          onClick={() => setHifiVector(fragment.id)}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Set as vector
                        </button>
                      )}
                      {hifiFragments.length > 1 && (
                        <button
                          onClick={() => removeHifiFragment(fragment.id)}
                          className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="input-label">Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Fragment name"
                        value={fragment.name}
                        onChange={(e) => updateHifiFragment(fragment.id, 'name', e.target.value)}
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
                        onChange={(e) => updateHifiFragment(fragment.id, 'size', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Concentration (ng/µL) *</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="e.g., 50"
                        step="any"
                        min="0.01"
                        value={fragment.concentration}
                        onChange={(e) => updateHifiFragment(fragment.id, 'concentration', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Overlap (bp)</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="20"
                        step="1"
                        min="15"
                        max="40"
                        value={fragment.overlapLength}
                        onChange={(e) => updateHifiFragment(fragment.id, 'overlapLength', parseFloat(e.target.value) || 20)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={calculateHifi} className="btn-primary w-full mt-4">
              <GitMerge className="w-5 h-5 mr-2" />
              Calculate HiFi Assembly
            </button>
          </div>

          {/* Results */}
          {hifiResults && (
            <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
              <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200">
                Assembly Protocol
              </h3>

              {/* Reagents */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    NEBuilder HiFi Master Mix (2X)
                  </div>
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">
                    {hifiMasterMixVolume.toFixed(1)} µL
                  </div>
                </div>
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Total DNA
                  </div>
                  <div className="text-xl font-bold text-primary-700 dark:text-primary-300">
                    {hifiTotalDNAVolume.toFixed(2)} µL
                  </div>
                </div>
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Nuclease-free Water
                  </div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {hifiWaterVolume >= 0 ? hifiWaterVolume.toFixed(1) : '0.0'} µL
                  </div>
                  {hifiWaterVolume < 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Volume exceeds capacity
                    </div>
                  )}
                </div>
              </div>

              {/* DNA Fragments */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  DNA Fragments
                </h4>

                {hifiResults.map((result) => (
                  <div key={result.fragment.id} className={`p-4 rounded-lg border-2 ${
                    result.fragment.isVector
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                            {result.fragment.name}
                          </h5>
                          {result.fragment.isVector ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                              <Star className="w-3 h-3" />
                              Vector
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                              Insert
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {result.fragment.size} bp • {result.fragment.concentration} ng/µL • {result.fragment.overlapLength} bp overlap
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
                        <div className="font-mono font-bold text-lg text-green-700 dark:text-green-300">
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
                            <strong>Step 2:</strong> Add <span className="font-mono font-bold">{result.smartDilution.waterForDilution} µL</span> water → {result.smartDilution.totalDilutionVolume} µL total
                          </div>
                          <div className="p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                            <strong>Step 3:</strong> Use <span className="font-mono font-bold">{result.smartDilution.volumeToUse} µL</span> of diluted stock in reaction
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">
                  Reaction Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Total Volume</div>
                    <div className="font-mono font-bold">{hifiTotalVolume} µL</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Master Mix</div>
                    <div className="font-mono font-bold">{hifiMasterMixVolume.toFixed(1)} µL</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Total DNA</div>
                    <div className="font-mono font-bold">{hifiTotalDNAVolume.toFixed(2)} µL</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400">Incubation</div>
                    <div className="font-mono font-bold text-green-600 dark:text-green-400">{hifiProtocol.incubationTime}</div>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded text-xs text-slate-600 dark:text-slate-400">
                  <strong>Next:</strong> Transform 2 µL into competent cells. Use NEB 5-alpha for routine assemblies, NEB 10-beta for &gt;15 kb constructs.
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
