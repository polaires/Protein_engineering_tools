/**
 * Protein Viewer Component - COMPLETE Mol* Integration
 * Full-featured 3D molecular structure visualization and analysis
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Upload, Search, Download, Trash2, RotateCcw, Camera, Info, Database,
  Microscope, ChevronDown, ChevronUp, Ruler, Focus, FileDown, Palette,
  Droplet, Atom, Hexagon, HelpCircle, X, Target, Pill, AlertTriangle,
  Highlighter, Zap, Layers, Activity, Shield, Lightbulb
} from 'lucide-react';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import type { PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { StateObjectRef } from 'molstar/lib/mol-state';
import { Sequence } from 'molstar/lib/mol-model/sequence';
import { StructureElement, StructureProperties as SP, Structure } from 'molstar/lib/mol-model/structure';
import { OrderedSet } from 'molstar/lib/mol-data/int';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { getPalette } from 'molstar/lib/mol-util/color/palette';
import { Color } from 'molstar/lib/mol-util/color';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import {
  saveStructure, getAllStructures, deleteStructure, generateStructureId,
} from '@/services/proteinViewer';
import { ProteinStructure, ProteinInfo, ColorScheme, RepresentationStyle } from '@/types/protein-viewer';
import { useApp } from '@/contexts/AppContext';
import { analyzeProtein } from '@/utils/proteinAnalysis';

// Import Mol* CSS
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

export default function ProteinViewer() {
  const { showToast } = useApp();
  const viewerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track structure reference for manipulation
  const structureRef = useRef<StateObjectRef<any> | null>(null);

  // State management
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [currentStructure, setCurrentStructure] = useState<ProteinStructure | null>(null);
  const [savedStructures, setSavedStructures] = useState<ProteinStructure[]>([]);
  const [proteinInfo, setProteinInfo] = useState<ProteinInfo | null>(null);
  const [pdbSearchQuery, setPdbSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStructureList, setShowStructureList] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedColorScheme, setSelectedColorScheme] = useState('chain-id');
  const [selectedRepresentation, setSelectedRepresentation] = useState('cartoon');
  const [measurementMode, setMeasurementMode] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUpdatingVisualization, setIsUpdatingVisualization] = useState(false);
  const [selectedLoci, setSelectedLoci] = useState<any[]>([]);

  // Store actual structure metadata for dynamic legends and analysis
  const [structureMetadata, setStructureMetadata] = useState<{
    chains?: string[];
    residueCount?: number;
    sequences?: Record<string, string>; // Per-chain sequences
    uniqueSequence?: string; // Single unique sequence if all chains identical
    aminoAcidComposition?: Record<string, number>;
  } | null>(null);

  // State for selected chain in analysis panel
  const [selectedAnalysisChain, setSelectedAnalysisChain] = useState<string>('');

  // Store protein analysis results
  const [showProteinAnalysis, setShowProteinAnalysis] = useState(false);

  // Ligand, ion, water controls
  const [showLigands, setShowLigands] = useState(true);
  const [showIons, setShowIons] = useState(true);
  const [showWater, setShowWater] = useState(false);

  // Metal coordination highlighting mode (on by default)
  const [showCoordinationHighlight, setShowCoordinationHighlight] = useState(true);
  const [coordinationRadius, setCoordinationRadius] = useState(3.0); // Å - typical metal coordination distance

  // Coordination data for persistent panel (shows when showCoordinationHighlight is true)
  const [coordinationData, setCoordinationData] = useState<{
    metals: {
      element: string;
      info: string;
      coordinating: { atom: string; residue: string; chain: string; distance: number; isWater: boolean; position: Vec3 }[];
      geometry: {
        coordinationNumber: number;
        geometryType: string;
        idealGeometry: string;
        angles: { atom1: string; atom2: string; angle: number }[];
        avgAngle: number;
        rmsd: number;
        distortion: 'ideal' | 'low' | 'moderate' | 'high' | 'severe';
      } | null;
      bindingSiteType: 'functional' | 'crystal_artifact' | 'uncertain';
      bindingSiteReason: string;
      hydrationAnalysis: {
        waterCount: number;
        proteinLigandCount: number;
        hydrationState: 'fully_hydrated' | 'partially_hydrated' | 'dehydrated';
        expectedHydration: number;
        waterDisplacement: number;
        hydrationNote: string;
      };
      // Shell analysis for protein engineering
      shellAnalysis: {
        // Primary shell (1st coordination sphere) - direct ligands
        primaryShell: {
          ligandTypes: { type: string; count: number; residues: string[] }[]; // e.g., carboxylate, imidazole, thiolate
          totalLigands: number;
          proteinLigands: number;
          waterLigands: number;
          avgDistance: number;
        };
        // Secondary shell (2nd coordination sphere) - H-bonding network
        secondaryShell: {
          residues: { residue: string; chain: string; role: string; hBondCount: number; distance: number }[];
          totalResidues: number;
          chargedResidues: number; // nearby Asp, Glu, Lys, Arg, His
          hBondNetwork: number; // total H-bonds supporting primary shell
          waterBridges: number; // waters bridging primary to secondary
        };
        // Engineering insights
        siteCharacteristics: {
          netCharge: number; // electrostatic environment
          burialDepth: 'surface' | 'shallow' | 'buried' | 'deep';
          shellCompleteness: number; // percentage of expected positions filled
          stabilityScore: 'weak' | 'moderate' | 'strong' | 'very_strong';
        };
        engineeringNotes: string[]; // actionable insights for protein engineers
      } | null;
    }[];
    totalResidues: number;
    totalWaters: number;
  } | null>(null);

  // Ligand analysis mode
  const [showLigandAnalysis, setShowLigandAnalysis] = useState(false);
  const [ligandRadius, setLigandRadius] = useState(4.0); // Å - typical ligand contact distance

  // Ligand analysis data
  const [ligandData, setLigandData] = useState<{
    ligands: {
      name: string;
      info: string; // e.g., "ATP A 501"
      atoms: number;
      contacts: {
        residue: string;
        chain: string;
        atom: string;
        distance: number;
        interactionType: 'hydrogen_bond' | 'hydrophobic' | 'salt_bridge' | 'pi_stacking' | 'other';
      }[];
      bindingSiteType: 'functional' | 'crystal_artifact' | 'uncertain';
      bindingSiteReason: string;
      proteinContactCount: number;
      waterContactCount: number;
    }[];
    totalLigands: number;
  } | null>(null);

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Custom residue highlighting
  const [showResidueHighlight, setShowResidueHighlight] = useState(false);
  const [selectedResidueTypes, setSelectedResidueTypes] = useState<string[]>([]);
  const [highlightColor, setHighlightColor] = useState('#FF6B6B'); // Default highlight color (used when "Use custom color" is enabled)
  const [useCustomColor, setUseCustomColor] = useState(false); // Toggle between category colors and custom color

  // All standard amino acids for selection - each with unique color within category
  const AMINO_ACIDS = [
    // Positive (Blues) - different shades of blue
    { code: 'ARG', name: 'Arginine', short: 'R', category: 'positive', color: '#2E86AB' },
    { code: 'LYS', name: 'Lysine', short: 'K', category: 'positive', color: '#4A90D9' },
    { code: 'HIS', name: 'Histidine', short: 'H', category: 'positive', color: '#6BAED6' },
    // Negative (Reds) - different shades of red
    { code: 'ASP', name: 'Aspartate', short: 'D', category: 'negative', color: '#C0392B' },
    { code: 'GLU', name: 'Glutamate', short: 'E', category: 'negative', color: '#E74C3C' },
    // Polar (Greens) - different shades of green
    { code: 'SER', name: 'Serine', short: 'S', category: 'polar', color: '#27AE60' },
    { code: 'THR', name: 'Threonine', short: 'T', category: 'polar', color: '#2ECC71' },
    { code: 'ASN', name: 'Asparagine', short: 'N', category: 'polar', color: '#58D68D' },
    { code: 'GLN', name: 'Glutamine', short: 'Q', category: 'polar', color: '#82E0AA' },
    { code: 'CYS', name: 'Cysteine', short: 'C', category: 'polar', color: '#F4D03F' }, // Yellow-ish for sulfur
    // Hydrophobic (Oranges/Browns) - different shades
    { code: 'ALA', name: 'Alanine', short: 'A', category: 'hydrophobic', color: '#E67E22' },
    { code: 'VAL', name: 'Valine', short: 'V', category: 'hydrophobic', color: '#F39C12' },
    { code: 'LEU', name: 'Leucine', short: 'L', category: 'hydrophobic', color: '#D35400' },
    { code: 'ILE', name: 'Isoleucine', short: 'I', category: 'hydrophobic', color: '#CA6F1E' },
    { code: 'MET', name: 'Methionine', short: 'M', category: 'hydrophobic', color: '#B9770E' },
    // Aromatic (Purples) - different shades of purple
    { code: 'PHE', name: 'Phenylalanine', short: 'F', category: 'aromatic', color: '#8E44AD' },
    { code: 'TYR', name: 'Tyrosine', short: 'Y', category: 'aromatic', color: '#9B59B6' },
    { code: 'TRP', name: 'Tryptophan', short: 'W', category: 'aromatic', color: '#A569BD' },
    // Special (Grays)
    { code: 'GLY', name: 'Glycine', short: 'G', category: 'special', color: '#7F8C8D' },
    { code: 'PRO', name: 'Proline', short: 'P', category: 'special', color: '#95A5A6' },
  ];

  // Quick select categories
  const RESIDUE_CATEGORIES = [
    { id: 'positive', name: 'Positive (+)', residues: ['ARG', 'LYS', 'HIS'], color: '#4A90D9' },
    { id: 'negative', name: 'Negative (-)', residues: ['ASP', 'GLU'], color: '#D94A4A' },
    { id: 'polar', name: 'Polar', residues: ['SER', 'THR', 'ASN', 'GLN', 'CYS'], color: '#6BD94A' },
    { id: 'hydrophobic', name: 'Hydrophobic', residues: ['ALA', 'VAL', 'LEU', 'ILE', 'MET'], color: '#FFB347' },
    { id: 'aromatic', name: 'Aromatic', residues: ['PHE', 'TYR', 'TRP'], color: '#9B59B6' },
    { id: 'special', name: 'Special', residues: ['GLY', 'PRO'], color: '#7F8C8D' },
  ];

  // Track when component visibility changes to update visualization
  const [componentsNeedUpdate, setComponentsNeedUpdate] = useState(false);

  // Ref to prevent drag overlay from showing during/after file load
  const allowDragOverlayRef = useRef(true);

  // Color schemes
  const colorSchemes: ColorScheme[] = [
    { id: 'uniform', name: 'Uniform', description: 'Single solid color' },
    { id: 'chain-id', name: 'By Chain', description: 'Color by chain ID' },
    { id: 'residue-name', name: 'By Residue Type', description: 'Color by amino acid type (Jmol colors)' },
    { id: 'secondary-structure', name: 'Secondary Structure', description: 'Helix, sheet, coil' },
    { id: 'hydrophobicity', name: 'Hydrophobicity', description: 'Hydrophobic (red) to hydrophilic (green)' },
    { id: 'electrostatic', name: 'Electrostatic', description: 'Charge: Blue (+), Red (-), White (neutral)' },
  ];

  // Representation styles
  const representations: RepresentationStyle[] = [
    { id: 'cartoon', name: 'Cartoon', description: 'Ribbon diagram' },
    { id: 'ball-and-stick', name: 'Ball & Stick', description: 'Atomic detail' },
    { id: 'spacefill', name: 'Spacefill', description: 'Van der Waals spheres' },
    { id: 'surface', name: 'Surface', description: 'Molecular surface' },
    { id: 'gaussian-surface', name: 'Gaussian Surface', description: 'Smooth surface' },
    { id: 'point', name: 'Point', description: 'Point cloud' },
    { id: 'backbone', name: 'Backbone', description: 'Backbone trace' },
  ];

  // Initialize Mol* viewer
  useEffect(() => {
    if (!viewerRef.current || pluginRef.current) return;

    const initViewer = async () => {
      try {
        const spec: PluginUISpec = {
          ...DefaultPluginUISpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: true,          // Enable control regions
              controlsDisplay: 'reactive', // Reactive display mode
              regionState: {
                top: 'full',               // Show sequence panel at top
                left: 'hidden',
                right: 'hidden',
                bottom: 'hidden',
              },
            },
          },
          components: {
            remoteState: 'none',
            controls: {
              left: 'none',                // Hide left panel
              right: 'none',               // Hide right panel
              bottom: 'none',              // Hide bottom log panel
              // top defaults to sequence viewer when not specified
            },
          },
          config: [
            [PluginConfig.Viewport.ShowExpand, false],
            [PluginConfig.Viewport.ShowControls, false],
            [PluginConfig.Viewport.ShowSettings, false],
            [PluginConfig.Viewport.ShowSelectionMode, false],
            [PluginConfig.Viewport.ShowAnimation, false],
          ],
        };

        const plugin = await createPluginUI({
          target: viewerRef.current!,
          render: renderReact18,
          spec,
        });

        pluginRef.current = plugin;
        setIsViewerReady(true);

        // Debug: Verify sequence panel configuration
        console.log('Mol* plugin initialized with sequence viewer');
        console.log('Layout state:', plugin.layout.state);
        console.log('Sequence panel using default top control (sequence viewer)');

        // Load saved structures list
        const structures = await getAllStructures();
        setSavedStructures(structures);

        showToast('success', 'Protein viewer initialized');
      } catch (error) {
        console.error('Failed to initialize Mol* viewer:', error);
        showToast('error', 'Failed to initialize protein viewer');
      }
    };

    initViewer();

    return () => {
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, []);

  // Ensure drag overlay clears when loading starts and stays cleared
  useEffect(() => {
    if (isLoading) {
      setIsDraggingOver(false);
      allowDragOverlayRef.current = false;
    }
    // Don't automatically re-enable - let user initiate new drag
  }, [isLoading]);

  // Re-enable drag overlay only when loading completes AND structure is loaded
  useEffect(() => {
    if (!isLoading && currentStructure) {
      const timeout = setTimeout(() => {
        allowDragOverlayRef.current = true;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, currentStructure]);

  // Update visualization when component visibility changes
  useEffect(() => {
    if (componentsNeedUpdate && currentStructure && !isLoading && !isUpdatingVisualization) {
      updateVisualization(selectedRepresentation, selectedColorScheme);
      setComponentsNeedUpdate(false);
    }
  }, [componentsNeedUpdate, showLigands, showIons, showWater]);

  // Setup measurement mode click handler
  useEffect(() => {
    if (!pluginRef.current || !measurementMode) {
      // Reset selected loci and clear order labels when measurement mode is disabled
      if (!measurementMode && pluginRef.current) {
        setSelectedLoci([]);
        // Clear order labels when exiting measurement mode (Molstar approach)
        pluginRef.current.managers.structure.measurement.addOrderLabels([]);
      }
      return;
    }

    const plugin = pluginRef.current;

    // Subscribe to click events
    const subscription = plugin.behaviors.interaction.click.subscribe((event: any) => {
      if (!measurementMode) return;

      // Get the clicked loci
      const loci = event.current.loci;

      if (!loci || loci.kind === 'empty-loci') {
        return;
      }

      // Only handle element-loci (atoms, ions, residues) - skip bonds
      if (loci.kind !== 'element-loci') {
        console.log('Skipping non-element loci:', loci.kind);
        return;
      }

      console.log('===== CLICKED LOCI =====');
      console.log('Loci:', loci);
      console.log('Loci.elements:', loci.elements);
      if (loci.elements && loci.elements[0]) {
        const elem = loci.elements[0];
        console.log('First element:', elem);
        console.log('element.unit:', elem.unit);
        console.log('element.indices:', elem.indices);
        if (elem.unit) {
          console.log('unit.elements:', elem.unit.elements);
          console.log('unit.elements length:', elem.unit.elements?.length);
        }
      }

      // Extract immutable data IMMEDIATELY before Molstar mutates the reference
      const position = getLociPosition(loci);
      const atomInfo = getAtomInfo(loci);

      console.log('Extracted position:', position);
      console.log('Extracted atomInfo:', atomInfo);

      if (!position) {
        showToast('error', 'Could not extract atom position');
        return;
      }

      // Serialize loci to bundle immediately (prevents mutation issues)
      const bundle = StructureElement.Bundle.fromLoci(loci);

      // Get the PARENT structure using Molstar's substructureParent helper
      // This is critical for measurements between different components (polymer, ion, ligand)
      // Each component creates a substructure, but they share the same parent structure
      const parentCell = plugin.helpers.substructureParent.get(loci.structure);
      const parentStructure = parentCell?.obj?.data;

      if (!parentStructure) {
        console.error('Could not get parent structure for loci');
        showToast('error', 'Could not resolve structure for measurement');
        return;
      }

      console.log('Parent structure resolved:', parentCell?.transform.ref);

      // Store the ORIGINAL loci - don't reconstruct with parent structure
      // The original loci correctly references the clicked atom in its substructure
      // Molstar's addDistance() internally handles parent structure resolution via MultiStructureSelectionFromBundle

      // Store immutable data with original loci
      const atomData = {
        position,
        atomInfo,
        bundle: bundle,  // Serialized bundle (immutable)
        structure: parentStructure,  // Parent structure reference for API calls
        parentRef: parentCell?.transform.ref,  // Keep ref for debugging
        loci: loci  // Store ORIGINAL loci - it correctly references the clicked atom
      };

      setSelectedLoci((prev: any[]) => {
        // Check if this atom is already selected (dedupe by atomInfo)
        // This allows repeated clicks on calcium to keep it as "1"
        const alreadySelected = prev.find((item: any) => item.atomInfo === atomData.atomInfo);
        if (alreadySelected) {
          console.log('Atom already selected, skipping:', atomData.atomInfo);
          showToast('info', `${atomData.atomInfo} is already selected as #${prev.indexOf(alreadySelected) + 1}`);
          return prev;
        }

        const newLoci = [...prev, atomData];

        console.log('Selected loci count:', newLoci.length);
        console.log('New atom data:', atomData);

        // Update order labels in 3D scene (Molstar approach - shows "1", "2", "3"... on atoms)
        const lociForLabels = newLoci.map((item: any) => item.loci);
        plugin.managers.structure.measurement.addOrderLabels(lociForLabels);

        // If we have 2 or more atoms, measure between FIRST and LATEST atom
        // This enables calcium coordination measurements: Ca(1) → Atom2, Ca(1) → Atom3, etc.
        if (newLoci.length >= 2) {
          const first = newLoci[0];  // Always measure from first (reference) atom
          const second = newLoci[newLoci.length - 1];  // To the latest selected atom

          console.log('===== MEASURING DISTANCE =====');
          console.log('First atom:', first);
          console.log('Second atom:', second);

          // Calculate distance from stored positions
          const dx = second.position[0] - first.position[0];
          const dy = second.position[1] - first.position[1];
          const dz = second.position[2] - first.position[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          console.log('Delta:', { dx, dy, dz });
          console.log('Distance:', distance);

          const measurementText = `${first.atomInfo} ↔ ${second.atomInfo}: ${distance.toFixed(2)} Å`;
          showToast('success', measurementText, 6000); // Show for 6 seconds

          // Add visual measurement asynchronously
          (async () => {
            try {
              console.log('===== ADDING VISUAL MEASUREMENT =====');
              // Use stored ORIGINAL loci - Molstar's addDistance handles parent structure internally
              const firstLoci = first.loci;
              const secondLoci = second.loci;

              console.log('Using stored firstLoci:', firstLoci);
              console.log('Using stored secondLoci:', secondLoci);

              // Check if measurement manager exists
              if (!plugin.managers?.structure?.measurement) {
                console.error('Measurement manager not available');
                return;
              }

              // Don't clear order labels - keep them for multi-measurement mode
              // User can measure multiple distances from reference atom (e.g., calcium coordination)

              // Add distance measurement with unique tags to prevent conflicts
              const measurementId = Date.now().toString();
              const result = await plugin.managers.structure.measurement.addDistance(firstLoci, secondLoci, {
                reprTags: [`measurement-${measurementId}`],
                selectionTags: [`measurement-selection-${measurementId}`]
              });
              console.log('AddDistance result:', result);

              if (result) {
                console.log('Successfully added distance measurement to scene');

                // Use Molstar's selection manager for persistent selection (Molstar approach)
                // This creates a proper selection highlight that persists
                plugin.managers.structure.selection.fromLoci('add', firstLoci);
                plugin.managers.structure.selection.fromLoci('add', secondLoci);
                console.log('Added persistent selections for both atoms');
              } else {
                console.warn('AddDistance returned undefined - measurement may have failed');
              }
            } catch (error) {
              console.error('Error adding measurement:', error);
              showToast('error', 'Failed to add visual measurement');
            }
          })();

          // Keep all selected atoms for multi-measurement (don't clear)
          return newLoci;
        }

        // For first atom: The order labels already provide visual feedback (shows "1")
        // Also add temporary highlight using the original loci
        plugin.managers.interactivity.lociHighlights.highlight({ loci }, false);

        if (newLoci.length === 1) {
          showToast('info', `Reference atom selected: ${atomInfo}. Click other atoms to measure distances.`);
        }

        return newLoci;
      });
    });

    // Cleanup subscription and clear order labels
    return () => {
      subscription.unsubscribe();
      // Clear order labels when subscription is cleaned up
      if (plugin.managers?.structure?.measurement) {
        plugin.managers.structure.measurement.addOrderLabels([]);
      }
    };
  }, [measurementMode, showToast]);

  // Extract structure metadata using Molstar's proper sequence API
  const extractStructureMetadata = (structureRefToUse: StateObjectRef<any>) => {
    if (!pluginRef.current) {
      console.warn('extractStructureMetadata: Plugin not available');
      return;
    }

    console.log('Extracting structure metadata using Molstar API...');

    try {
      const state = pluginRef.current.state.data;
      const cell = state.cells.get(structureRefToUse as any);

      if (!cell || !cell.obj?.data) {
        console.warn('extractStructureMetadata: Cell not found');
        setStructureMetadata(null);
        return;
      }

      const structure = cell.obj.data;

      if (!structure.units || structure.units.length === 0) {
        console.warn('extractStructureMetadata: No units');
        setStructureMetadata(null);
        return;
      }

      console.log('Structure units found:', structure.units.length);

      // Use Molstar's StructureElement API to get chain IDs and sequences
      const l = StructureElement.Location.create(structure);
      const chainSet = new Set<string>();
      const chainSequences: Record<string, string> = {};
      const aminoAcidCounts: Record<string, number> = {};
      const entitySequenceMap = new Map<string, string>();

      // Iterate through units to extract chain and sequence info (ONLY polymers/proteins)
      for (const unit of structure.units) {
        if (!unit.model) continue;

        StructureElement.Location.set(l, structure, unit, unit.elements[0]);

        // FILTER: Only include polymer entities (exclude ligands, ions, water)
        const entityType = SP.entity.type(l);
        if (entityType !== 'polymer') {
          continue; // Skip non-polymer entities (ligands, ions, water)
        }

        // Get chain ID using Molstar's API
        const chainId = SP.chain.label_asym_id(l);
        const entityKey = SP.entity.key(l);

        if (chainId) {
          const chainIdStr = String(chainId);

          // Skip if we've already processed this chain
          if (chainSet.has(chainIdStr)) {
            console.log(`  ⊳ Skipping duplicate chain ${chainIdStr}`);
            continue;
          }

          chainSet.add(chainIdStr);

          // Get entity sequence using Molstar's Sequence API
          const entitySeq = unit.model.sequence.byEntityKey[entityKey];

          if (entitySeq && entitySeq.sequence) {
            // Use Molstar's getSequenceString function
            const seqString = Sequence.getSequenceString(entitySeq.sequence);

            if (seqString && seqString.length > 0) {
              entitySequenceMap.set(String(entityKey), seqString);
              chainSequences[chainIdStr] = seqString;

              // Count amino acids
              for (const aa of seqString) {
                if (aa !== '-' && aa !== 'X') {
                  aminoAcidCounts[aa] = (aminoAcidCounts[aa] || 0) + 1;
                }
              }

              console.log(`✓ Polymer chain ${chainIdStr}: ${seqString.length} residues`);
            }
          }
        }
      }

      // Detect if all sequences are identical
      const uniqueSeqs = new Set(Object.values(chainSequences));
      const allIdentical = uniqueSeqs.size === 1;
      const uniqueSequence = allIdentical ? Array.from(uniqueSeqs)[0] : undefined;
      const representativeSequence = uniqueSequence || Object.values(chainSequences)[0];

      // Debug sequence comparison
      if (!allIdentical && Object.keys(chainSequences).length > 1) {
        console.warn('⚠️ Chains have different sequences:');
        Object.entries(chainSequences).forEach(([chain, seq]) => {
          console.log(`  Chain ${chain}: ${seq.substring(0, 20)}... (${seq.length} residues)`);
        });
      }

      const metadata = {
        chains: Array.from(chainSet).sort(),
        residueCount: structure.elementCount,
        sequences: chainSequences,
        uniqueSequence: representativeSequence,
        aminoAcidComposition: aminoAcidCounts,
      };

      setStructureMetadata(metadata);

      // Set default selected chain for analysis
      if (metadata.chains.length > 0 && !selectedAnalysisChain) {
        setSelectedAnalysisChain(metadata.chains[0]);
      }

      console.log('✓ Structure metadata extracted using Molstar API:', {
        polymerChainsOnly: true,
        totalUnits: structure.units.length,
        uniquePolymerChains: metadata.chains,
        chainCount: metadata.chains.length,
        residueCount: metadata.residueCount,
        allChainsIdentical: allIdentical,
        chainSequences: Object.keys(chainSequences),
      });
    } catch (error) {
      console.error('Error extracting structure metadata:', error);
      setStructureMetadata(null);
    }
  };

  // Export sequences as FASTA using Molstar's sequence API
  const exportFASTA = () => {
    if (!structureMetadata || !currentStructure) {
      showToast('error', 'No structure loaded');
      return;
    }

    try {
      const { sequences } = structureMetadata;

      if (!sequences || Object.keys(sequences).length === 0) {
        showToast('error', 'No sequences available');
        return;
      }

      // Generate FASTA format
      let fastaContent = '';
      const structureName = currentStructure.pdbId || currentStructure.name;

      Object.entries(sequences).forEach(([chainId, sequence]: [string, string]) => {
        // FASTA header format: >PDB|Chain|Description
        fastaContent += `>${structureName}|Chain_${chainId}|Length_${sequence.length}\n`;

        // Split sequence into lines of 60 characters (FASTA standard)
        for (let i = 0; i < sequence.length; i += 60) {
          fastaContent += sequence.substring(i, i + 60) + '\n';
        }
      });

      // Download the FASTA file
      const blob = new Blob([fastaContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${structureName}_sequences.fasta`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('success', 'FASTA file exported');
    } catch (error) {
      console.error('Failed to export FASTA:', error);
      showToast('error', 'Failed to export FASTA');
    }
  };

  // Apply representation and color scheme
  const applyVisualization = async (structureRefToUse: StateObjectRef<any>, representation: string, colorScheme: string) => {
    if (!pluginRef.current) return;

    // Extract structure metadata for dynamic legends
    extractStructureMetadata(structureRefToUse);

    const plugin = pluginRef.current;

    console.log('Applying visualization:', { representation, colorScheme });

    try {
      // Create structure components
      const polymer = await plugin.builders.structure.tryCreateComponentStatic(structureRefToUse, 'polymer', { label: 'Polymer' });
      const ligand = await plugin.builders.structure.tryCreateComponentStatic(structureRefToUse, 'ligand', { label: 'Ligand' });
      const ion = await plugin.builders.structure.tryCreateComponentStatic(structureRefToUse, 'ion', { label: 'Ion' });
      const water = await plugin.builders.structure.tryCreateComponentStatic(structureRefToUse, 'water', { label: 'Water' });

      // Add main polymer representation
      // For electrostatic coloring, we use a special approach with separate components
      if (colorScheme === 'electrostatic') {
        // Apply electrostatic coloring using separate components for +/-/neutral
        await applyElectrostaticColoring(structureRefToUse);
      } else if (polymer) {
        switch (representation) {
          case 'cartoon':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'cartoon',
              color: colorScheme as any,
              typeParams: { alpha: 1 },
            }, { tag: 'polymer' });
            break;
          case 'ball-and-stick':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'ball-and-stick',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          case 'spacefill':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'spacefill',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          case 'surface':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'molecular-surface',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          case 'gaussian-surface':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'gaussian-surface',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          case 'point':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'point',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          case 'backbone':
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'backbone',
              color: colorScheme as any,
            }, { tag: 'polymer' });
            break;
          default:
            await plugin.builders.structure.representation.addRepresentation(polymer, {
              type: 'cartoon',
              color: colorScheme as any,
            }, { tag: 'polymer' });
        }
      }

      // Add ligands if enabled
      if (showLigands && ligand) {
        await plugin.builders.structure.representation.addRepresentation(ligand, {
          type: 'ball-and-stick',
          color: 'element-symbol' as any,
          typeParams: {
            sizeFactor: 0.2,  // Smaller size for ligands
            alpha: 1
          },
        }, { tag: 'ligand' });
      }

      // Add ions if enabled
      if (showIons && ion) {
        await plugin.builders.structure.representation.addRepresentation(ion, {
          type: 'ball-and-stick',
          color: 'element-symbol' as any,
          typeParams: {
            sizeFactor: 0.4,  // Smaller size for ions
            alpha: 1
          },
        }, { tag: 'ion' });
      }

      // Add water if enabled
      if (showWater && water) {
        await plugin.builders.structure.representation.addRepresentation(water, {
          type: 'ball-and-stick',
          color: 'element-symbol' as any,
          typeParams: {
            sizeFactor: 0.2,
            alpha: 0.6
          },
        }, { tag: 'water' });
      }

      console.log('Visualization applied successfully');

      // Apply coordination highlighting if enabled
      if (showCoordinationHighlight) {
        await applyCoordinationHighlighting(structureRefToUse);
      }
    } catch (error) {
      console.error('Failed to apply visualization:', error);
    }
  };

  // Apply metal coordination highlighting - highlights residues coordinating metal ions
  const applyCoordinationHighlighting = async (structureRefToUse: StateObjectRef<any>) => {
    if (!pluginRef.current) return;

    const plugin = pluginRef.current;
    const state = plugin.state.data;
    const cell = state.cells.get(structureRefToUse as any);

    if (!cell || !cell.obj?.data) {
      console.warn('applyCoordinationHighlighting: Structure not found');
      return;
    }

    const structure: Structure = cell.obj.data;
    console.log('Applying coordination highlighting...');

    try {
      // Find all metal ions and their coordinating atoms
      const metalCoordination = findMetalCoordination(structure, coordinationRadius);

      if (metalCoordination.metalCount === 0) {
        showToast('info', 'No metal ions found in structure');
        setCoordinationData(null);
        return;
      }

      console.log(`Found ${metalCoordination.metalCount} metal ions with ${metalCoordination.coordinatingResidues.size} coordinating residues`);

      // Store coordination data for panel display (panel shows automatically when data exists and mode is on)
      setCoordinationData({
        metals: metalCoordination.metalDetails.map(m => ({
          element: m.element,
          info: m.info,
          coordinating: m.coordinating,
          geometry: m.geometry,
          bindingSiteType: m.bindingSiteType,
          bindingSiteReason: m.bindingSiteReason,
          hydrationAnalysis: m.hydrationAnalysis,
          shellAnalysis: m.shellAnalysis
        })),
        totalResidues: metalCoordination.coordinatingResidues.size,
        totalWaters: metalCoordination.coordinatingWaters.size
      });

      // Create a custom selection for coordinating residues
      const coordinatingLoci = createCoordinatingLoci(structure, metalCoordination.coordinatingAtomIndices);

      if (coordinatingLoci && StructureElement.Loci.size(coordinatingLoci) > 0) {
        // Highlight coordinating residues using selection manager
        plugin.managers.structure.selection.clear();
        plugin.managers.structure.selection.fromLoci('add', coordinatingLoci);

        // Show coordinating waters if they exist (even if bulk water is hidden)
        if (metalCoordination.coordinatingWaters.size > 0) {
          await showCoordinatingWaters(structureRefToUse, metalCoordination.coordinatingWaterIndices);
        }

        showToast('success',
          `Highlighted ${metalCoordination.coordinatingResidues.size} coordinating residues around ${metalCoordination.metalCount} metal ion(s)` +
          (metalCoordination.coordinatingWaters.size > 0 ? ` (+ ${metalCoordination.coordinatingWaters.size} waters)` : '')
        );
      }
    } catch (error) {
      console.error('Failed to apply coordination highlighting:', error);
      showToast('error', 'Failed to apply coordination highlighting');
    }
  };

  // ============================================================================
  // Continuous Shape Measures (CShM) Implementation
  // Based on Alvarez et al. methodology for accurate coordination geometry analysis
  // Reference: Coord. Chem. Rev. 249 (2005) 1693-1708
  // CShM = 100 × min[Σ|qi - pi|²] / Σ|qi - q0|²
  // Values: 0 = perfect, <1 = minor distortion, 1-3 = moderate, >3 = significant
  // ============================================================================

  // Reference polyhedra coordinates (normalized, centered at origin)
  // These are ideal vertex positions for each geometry type
  const REFERENCE_POLYHEDRA: {
    [cn: number]: { name: string; vertices: number[][] }[];
  } = {
    2: [
      { name: 'Linear', vertices: [[0, 0, 1], [0, 0, -1]] }
    ],
    3: [
      { name: 'Trigonal Planar', vertices: [
        [1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0]
      ]},
      { name: 'T-shaped', vertices: [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0]
      ]},
      { name: 'Trigonal Pyramidal', vertices: [
        [0.943, 0, -0.333], [-0.471, 0.816, -0.333], [-0.471, -0.816, -0.333]
      ]}
    ],
    4: [
      { name: 'Tetrahedral', vertices: [
        [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
      ].map(v => v.map(c => c / Math.sqrt(3)))},
      { name: 'Square Planar', vertices: [
        [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]
      ]},
      { name: 'See-saw', vertices: [
        [0, 0, 1], [0, 0, -1], [1, 0, 0], [-0.5, 0.866, 0]
      ]}
    ],
    5: [
      { name: 'Trigonal Bipyramidal', vertices: [
        [0, 0, 1], [0, 0, -1], // axial
        [1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0] // equatorial
      ]},
      { name: 'Square Pyramidal', vertices: [
        [0, 0, 1], // apex
        [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0] // base
      ]},
      { name: 'Pentagonal Planar', vertices: [
        [1, 0, 0], [0.309, 0.951, 0], [-0.809, 0.588, 0], [-0.809, -0.588, 0], [0.309, -0.951, 0]
      ]}
    ],
    6: [
      { name: 'Octahedral', vertices: [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
      ]},
      { name: 'Trigonal Prismatic', vertices: [
        [1, 0, 0.5], [-0.5, 0.866, 0.5], [-0.5, -0.866, 0.5],
        [1, 0, -0.5], [-0.5, 0.866, -0.5], [-0.5, -0.866, -0.5]
      ]},
      { name: 'Pentagonal Pyramidal', vertices: [
        [0, 0, 1], // apex
        [1, 0, 0], [0.309, 0.951, 0], [-0.809, 0.588, 0], [-0.809, -0.588, 0], [0.309, -0.951, 0]
      ]}
    ],
    7: [
      { name: 'Pentagonal Bipyramidal', vertices: [
        [0, 0, 1], [0, 0, -1], // axial
        [1, 0, 0], [0.309, 0.951, 0], [-0.809, 0.588, 0], [-0.809, -0.588, 0], [0.309, -0.951, 0]
      ]},
      { name: 'Capped Octahedral', vertices: [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
        [0.577, 0.577, 0.577] // cap
      ]},
      { name: 'Capped Trigonal Prismatic', vertices: [
        [1, 0, 0.5], [-0.5, 0.866, 0.5], [-0.5, -0.866, 0.5],
        [1, 0, -0.5], [-0.5, 0.866, -0.5], [-0.5, -0.866, -0.5],
        [0, 0, 0] // face cap (rectangular face)
      ]}
    ],
    8: [
      { name: 'Square Antiprismatic', vertices: (() => {
        // Two squares rotated 45° relative to each other
        const h = 0.5;
        const r = 1;
        const top = [[r, 0, h], [0, r, h], [-r, 0, h], [0, -r, h]];
        const a = Math.PI / 4; // 45° rotation
        const bottom = [
          [r * Math.cos(a), r * Math.sin(a), -h],
          [-r * Math.sin(a), r * Math.cos(a), -h],
          [-r * Math.cos(a), -r * Math.sin(a), -h],
          [r * Math.sin(a), -r * Math.cos(a), -h]
        ];
        return [...top, ...bottom];
      })()},
      { name: 'Dodecahedral', vertices: [
        // D2d dodecahedron (bicapped trigonal antiprism)
        [1, 0, 0.5], [-1, 0, 0.5], [0, 1, -0.5], [0, -1, -0.5],
        [0.707, 0.707, 0], [-0.707, 0.707, 0], [-0.707, -0.707, 0], [0.707, -0.707, 0]
      ]},
      { name: 'Bicapped Trigonal Prismatic', vertices: [
        [1, 0, 0.577], [-0.5, 0.866, 0.577], [-0.5, -0.866, 0.577],
        [1, 0, -0.577], [-0.5, 0.866, -0.577], [-0.5, -0.866, -0.577],
        [0, 0, 1], [0, 0, -1] // caps on triangular faces
      ]},
      { name: 'Cubic', vertices: [
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
      ].map(v => v.map(c => c / Math.sqrt(3)))}
    ],
    9: [
      { name: 'Tricapped Trigonal Prismatic', vertices: [
        // Trigonal prism (D3h) - most common for lanthanides
        [1, 0, 0.816], [-0.5, 0.866, 0.816], [-0.5, -0.866, 0.816],
        [1, 0, -0.816], [-0.5, 0.866, -0.816], [-0.5, -0.866, -0.816],
        // Three caps on rectangular faces
        [0.25, 0.433, 0], [-0.5, 0, 0], [0.25, -0.433, 0]
      ]},
      { name: 'Capped Square Antiprismatic', vertices: (() => {
        const h = 0.5;
        const r = 1;
        const top = [[r, 0, h], [0, r, h], [-r, 0, h], [0, -r, h]];
        const a = Math.PI / 4;
        const bottom = [
          [r * Math.cos(a), r * Math.sin(a), -h],
          [-r * Math.sin(a), r * Math.cos(a), -h],
          [-r * Math.cos(a), -r * Math.sin(a), -h],
          [r * Math.sin(a), -r * Math.cos(a), -h]
        ];
        return [...top, ...bottom, [0, 0, 1]]; // cap on top
      })()},
      { name: 'Muffin', vertices: [
        // 9-coordinate "muffin" shape (Cs symmetry)
        [1, 0, 0], [0.5, 0.866, 0], [-0.5, 0.866, 0], [-1, 0, 0], [-0.5, -0.866, 0], [0.5, -0.866, 0],
        [0.5, 0.289, 0.816], [-0.5, 0.289, 0.816], [0, -0.577, 0.816]
      ]}
    ],
    10: [
      { name: 'Bicapped Square Antiprismatic', vertices: (() => {
        const h = 0.5;
        const r = 1;
        const top = [[r, 0, h], [0, r, h], [-r, 0, h], [0, -r, h]];
        const a = Math.PI / 4;
        const bottom = [
          [r * Math.cos(a), r * Math.sin(a), -h],
          [-r * Math.sin(a), r * Math.cos(a), -h],
          [-r * Math.cos(a), -r * Math.sin(a), -h],
          [r * Math.sin(a), -r * Math.cos(a), -h]
        ];
        return [...top, ...bottom, [0, 0, 1], [0, 0, -1]]; // two caps
      })()},
      { name: 'Sphenocorona', vertices: [
        // Johnson solid J86
        [1, 0, 0], [-1, 0, 0], [0.5, 0.866, 0.3], [-0.5, 0.866, 0.3],
        [0.5, -0.866, 0.3], [-0.5, -0.866, 0.3], [0, 0.5, 0.8], [0, -0.5, 0.8],
        [0, 0.5, -0.5], [0, -0.5, -0.5]
      ]},
      { name: 'Pentagonal Antiprismatic', vertices: (() => {
        const h = 0.5;
        const top: number[][] = [];
        const bottom: number[][] = [];
        for (let i = 0; i < 5; i++) {
          const angle1 = (2 * Math.PI * i) / 5;
          const angle2 = (2 * Math.PI * i) / 5 + Math.PI / 5;
          top.push([Math.cos(angle1), Math.sin(angle1), h]);
          bottom.push([Math.cos(angle2), Math.sin(angle2), -h]);
        }
        return [...top, ...bottom];
      })()}
    ],
    11: [
      { name: 'Capped Pentagonal Antiprismatic', vertices: (() => {
        const h = 0.5;
        const top: number[][] = [];
        const bottom: number[][] = [];
        for (let i = 0; i < 5; i++) {
          const angle1 = (2 * Math.PI * i) / 5;
          const angle2 = (2 * Math.PI * i) / 5 + Math.PI / 5;
          top.push([Math.cos(angle1), Math.sin(angle1), h]);
          bottom.push([Math.cos(angle2), Math.sin(angle2), -h]);
        }
        return [...top, ...bottom, [0, 0, 1]]; // cap
      })()},
      { name: 'Elongated Pentagonal Pyramidal', vertices: (() => {
        const vertices: number[][] = [];
        // Pentagon base
        for (let i = 0; i < 5; i++) {
          const angle = (2 * Math.PI * i) / 5;
          vertices.push([Math.cos(angle), Math.sin(angle), 0]);
        }
        // Second pentagon layer
        for (let i = 0; i < 5; i++) {
          const angle = (2 * Math.PI * i) / 5 + Math.PI / 5;
          vertices.push([0.8 * Math.cos(angle), 0.8 * Math.sin(angle), 0.6]);
        }
        // Apex
        vertices.push([0, 0, 1.2]);
        return vertices;
      })()}
    ],
    12: [
      { name: 'Icosahedral', vertices: (() => {
        // Regular icosahedron vertices
        const phi = (1 + Math.sqrt(5)) / 2; // golden ratio
        const vertices: number[][] = [
          [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
          [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
          [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]
        ];
        // Normalize
        const norm = Math.sqrt(1 + phi * phi);
        return vertices.map(v => v.map(c => c / norm));
      })()},
      { name: 'Cuboctahedral', vertices: [
        [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
        [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
        [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]
      ].map(v => v.map(c => c / Math.sqrt(2)))},
      { name: 'Anticuboctahedral', vertices: (() => {
        // Triangular orthobicupola
        const vertices: number[][] = [];
        const h = 0.4;
        // Top hexagon
        for (let i = 0; i < 6; i++) {
          const angle = (2 * Math.PI * i) / 6;
          vertices.push([Math.cos(angle), Math.sin(angle), h]);
        }
        // Bottom hexagon (rotated)
        for (let i = 0; i < 6; i++) {
          const angle = (2 * Math.PI * i) / 6 + Math.PI / 6;
          vertices.push([Math.cos(angle), Math.sin(angle), -h]);
        }
        return vertices;
      })()}
    ]
  };

  // Calculate angle between three points (in degrees) - angle at point B
  const calculateAngle = (a: Vec3, b: Vec3, c: Vec3): number => {
    const ba = Vec3.sub(Vec3(), a, b);
    const bc = Vec3.sub(Vec3(), c, b);

    const dot = Vec3.dot(ba, bc);
    const magBA = Vec3.magnitude(ba);
    const magBC = Vec3.magnitude(bc);

    if (magBA === 0 || magBC === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  };

  // Calculate centroid of a set of points
  const calculateCentroid = (points: number[][]): number[] => {
    const n = points.length;
    const centroid = [0, 0, 0];
    for (const p of points) {
      centroid[0] += p[0];
      centroid[1] += p[1];
      centroid[2] += p[2];
    }
    return centroid.map(c => c / n);
  };

  // Center points at origin
  const centerPoints = (points: number[][]): number[][] => {
    const centroid = calculateCentroid(points);
    return points.map(p => [p[0] - centroid[0], p[1] - centroid[1], p[2] - centroid[2]]);
  };

  // Scale points to unit RMS distance from origin
  const normalizeScale = (points: number[][]): number[][] => {
    let sumSq = 0;
    for (const p of points) {
      sumSq += p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    }
    const rms = Math.sqrt(sumSq / points.length);
    if (rms === 0) return points;
    return points.map(p => [p[0] / rms, p[1] / rms, p[2] / rms]);
  };

  // Calculate CShM for a specific permutation
  const calculateCShMForPermutation = (
    observed: number[][],
    reference: number[][],
    permutation: number[]
  ): number => {
    // Calculate sum of squared distances from centroid (denominator)
    let denominator = 0;
    for (const p of observed) {
      denominator += p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    }
    if (denominator === 0) return 100;

    // Calculate sum of squared deviations (numerator)
    let numerator = 0;
    for (let i = 0; i < observed.length; i++) {
      const obs = observed[i];
      const ref = reference[permutation[i]];
      const dx = obs[0] - ref[0];
      const dy = obs[1] - ref[1];
      const dz = obs[2] - ref[2];
      numerator += dx * dx + dy * dy + dz * dz;
    }

    return 100 * numerator / denominator;
  };

  // Simple rotation matrix application
  const rotatePoint = (p: number[], rotMatrix: number[][]): number[] => {
    return [
      rotMatrix[0][0] * p[0] + rotMatrix[0][1] * p[1] + rotMatrix[0][2] * p[2],
      rotMatrix[1][0] * p[0] + rotMatrix[1][1] * p[1] + rotMatrix[1][2] * p[2],
      rotMatrix[2][0] * p[0] + rotMatrix[2][1] * p[1] + rotMatrix[2][2] * p[2]
    ];
  };

  // Generate rotation matrix from Euler angles
  const eulerRotationMatrix = (alpha: number, beta: number, gamma: number): number[][] => {
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const cb = Math.cos(beta), sb = Math.sin(beta);
    const cg = Math.cos(gamma), sg = Math.sin(gamma);
    return [
      [ca * cb * cg - sa * sg, -ca * cb * sg - sa * cg, ca * sb],
      [sa * cb * cg + ca * sg, -sa * cb * sg + ca * cg, sa * sb],
      [-sb * cg, sb * sg, cb]
    ];
  };

  // Calculate CShM with optimal rotation (simplified Kabsch-like approach)
  const calculateCShMWithRotation = (
    observed: number[][],
    reference: number[][],
    permutation: number[]
  ): number => {
    // Try multiple rotations to find minimum CShM
    let minCShM = Infinity;
    const nTrials = 50; // Number of random rotation trials

    for (let t = 0; t < nTrials; t++) {
      // Generate rotation angles
      const alpha = (t === 0) ? 0 : Math.random() * 2 * Math.PI;
      const beta = (t === 0) ? 0 : Math.random() * Math.PI;
      const gamma = (t === 0) ? 0 : Math.random() * 2 * Math.PI;

      const rotMatrix = eulerRotationMatrix(alpha, beta, gamma);
      const rotatedRef = reference.map(p => rotatePoint(p, rotMatrix));

      const cshm = calculateCShMForPermutation(observed, rotatedRef, permutation);
      if (cshm < minCShM) {
        minCShM = cshm;
      }
    }

    return minCShM;
  };

  // Generate permutations (for small n) or sample permutations (for large n)
  const generatePermutations = (n: number, maxPerm: number = 5000): number[][] => {
    if (n <= 6) {
      // Full permutation for small n
      const result: number[][] = [];
      const permute = (arr: number[], start: number) => {
        if (start === arr.length) {
          result.push([...arr]);
          return;
        }
        for (let i = start; i < arr.length; i++) {
          [arr[start], arr[i]] = [arr[i], arr[start]];
          permute(arr, start + 1);
          [arr[start], arr[i]] = [arr[i], arr[start]];
        }
      };
      permute(Array.from({ length: n }, (_, i) => i), 0);
      return result;
    } else {
      // Sample random permutations for larger n
      const result: number[][] = [];
      const identity = Array.from({ length: n }, (_, i) => i);
      result.push([...identity]);

      for (let i = 0; i < maxPerm - 1; i++) {
        const perm = [...identity];
        // Fisher-Yates shuffle
        for (let j = n - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [perm[j], perm[k]] = [perm[k], perm[j]];
        }
        result.push(perm);
      }
      return result;
    }
  };

  // Main CShM calculation function
  const calculateCShM = (
    observedPositions: Vec3[],
    referenceGeometry: { name: string; vertices: number[][] }
  ): { cshm: number; geometryName: string } => {
    const n = observedPositions.length;
    if (n !== referenceGeometry.vertices.length) {
      return { cshm: 100, geometryName: referenceGeometry.name };
    }

    // Convert Vec3 to number arrays and normalize
    let observed = observedPositions.map(v => [v[0], v[1], v[2]]);
    let reference = referenceGeometry.vertices.map(v => [...v]);

    // Center and normalize both sets
    observed = normalizeScale(centerPoints(observed));
    reference = normalizeScale(centerPoints(reference));

    // Try permutations to find best match
    const permutations = generatePermutations(n, n <= 8 ? 5000 : 1000);
    let minCShM = Infinity;

    for (const perm of permutations) {
      const cshm = calculateCShMWithRotation(observed, reference, perm);
      if (cshm < minCShM) {
        minCShM = cshm;
      }
      // Early termination if we found a very good match
      if (minCShM < 0.1) break;
    }

    return { cshm: minCShM, geometryName: referenceGeometry.name };
  };

  // Analyze coordination geometry for a metal center using CShM
  const analyzeCoordinationGeometry = (
    metalPos: Vec3,
    ligandPositions: { atom: string; pos: Vec3 }[]
  ): {
    coordinationNumber: number;
    geometryType: string;
    idealGeometry: string;
    angles: { atom1: string; atom2: string; angle: number }[];
    avgAngle: number;
    rmsd: number;
    distortion: 'ideal' | 'low' | 'moderate' | 'high' | 'severe';
  } | null => {
    const cn = ligandPositions.length;

    if (cn < 2) {
      return {
        coordinationNumber: cn,
        geometryType: cn === 1 ? 'Monocoordinate' : 'None',
        idealGeometry: cn === 1 ? 'Terminal' : 'N/A',
        angles: [],
        avgAngle: 0,
        rmsd: 0,
        distortion: 'ideal'
      };
    }

    // Calculate all L-M-L angles (for display purposes)
    const angles: { atom1: string; atom2: string; angle: number }[] = [];
    for (let i = 0; i < cn; i++) {
      for (let j = i + 1; j < cn; j++) {
        const angle = calculateAngle(ligandPositions[i].pos, metalPos, ligandPositions[j].pos);
        angles.push({
          atom1: ligandPositions[i].atom,
          atom2: ligandPositions[j].atom,
          angle: angle
        });
      }
    }

    const avgAngle = angles.reduce((sum, a) => sum + a.angle, 0) / angles.length;

    // Get reference geometries for this CN
    const referenceGeometries = REFERENCE_POLYHEDRA[cn];

    if (!referenceGeometries || referenceGeometries.length === 0) {
      // No reference for this CN
      return {
        coordinationNumber: cn,
        geometryType: `CN-${cn} (no reference)`,
        idealGeometry: `CN-${cn}`,
        angles: angles.sort((a, b) => a.angle - b.angle),
        avgAngle,
        rmsd: 0,
        distortion: 'moderate'
      };
    }

    // Calculate CShM for each reference geometry
    const ligandVectors = ligandPositions.map(lp => lp.pos);
    let bestGeometry = '';
    let bestCShM = Infinity;

    for (const refGeom of referenceGeometries) {
      const result = calculateCShM(ligandVectors, refGeom);
      if (result.cshm < bestCShM) {
        bestCShM = result.cshm;
        bestGeometry = result.geometryName;
      }
    }

    // Determine distortion level based on CShM value
    // CShM interpretation: 0 = perfect, <1 = minor, 1-3 = moderate, >3 = significant
    let distortion: 'ideal' | 'low' | 'moderate' | 'high' | 'severe';
    if (bestCShM < 0.5) distortion = 'ideal';
    else if (bestCShM < 1.0) distortion = 'low';
    else if (bestCShM < 3.0) distortion = 'moderate';
    else if (bestCShM < 5.0) distortion = 'high';
    else distortion = 'severe';

    return {
      coordinationNumber: cn,
      geometryType: bestGeometry,
      idealGeometry: bestGeometry,
      angles: angles.sort((a, b) => a.angle - b.angle),
      avgAngle,
      rmsd: bestCShM, // Using CShM value instead of angle RMSD
      distortion
    };
  };

  // Find metal ions and their coordinating atoms within the given radius
  const findMetalCoordination = (structure: Structure, radius: number) => {
    // Comprehensive list of ALL metal elements (alkali, alkaline earth, transition, post-transition, lanthanides, actinides)
    const metalElements = new Set([
      // Alkali metals
      'LI', 'NA', 'K', 'RB', 'CS', 'FR',
      // Alkaline earth metals
      'BE', 'MG', 'CA', 'SR', 'BA', 'RA',
      // Transition metals (3d, 4d, 5d)
      'SC', 'TI', 'V', 'CR', 'MN', 'FE', 'CO', 'NI', 'CU', 'ZN',
      'Y', 'ZR', 'NB', 'MO', 'TC', 'RU', 'RH', 'PD', 'AG', 'CD',
      'HF', 'TA', 'W', 'RE', 'OS', 'IR', 'PT', 'AU', 'HG',
      // Post-transition metals
      'AL', 'GA', 'IN', 'SN', 'TL', 'PB', 'BI', 'PO',
      // Lanthanides (rare earths)
      'LA', 'CE', 'PR', 'ND', 'PM', 'SM', 'EU', 'GD', 'TB', 'DY', 'HO', 'ER', 'TM', 'YB', 'LU',
      // Actinides
      'AC', 'TH', 'PA', 'U', 'NP', 'PU', 'AM', 'CM', 'BK', 'CF', 'ES', 'FM', 'MD', 'NO', 'LR'
    ]);

    const coordinatingAtomIndices: Map<number, Set<number>> = new Map(); // unitId -> elementIndices
    const coordinatingWaterIndices: Map<number, Set<number>> = new Map();
    const coordinatingResidues = new Set<string>(); // "chainId:resSeq:resName"
    const coordinatingWaters = new Set<string>();
    let metalCount = 0;

    // Store detailed metal info with positions for geometry analysis
    const metalDetails: {
      element: string;
      info: string;
      pos: Vec3;
      coordinating: { atom: string; residue: string; chain: string; distance: number; isWater: boolean; position: Vec3 }[];
    }[] = [];

    // First pass: find all metal ions and their positions
    const l = StructureElement.Location.create(structure);
    for (const unit of structure.units) {
      if (!unit.model) continue;

      for (let i = 0; i < unit.elements.length; i++) {
        const elementIdx = unit.elements[i];
        StructureElement.Location.set(l, structure, unit, elementIdx);

        const element = SP.atom.type_symbol(l).toUpperCase();

        if (metalElements.has(element)) {
          const pos = Vec3();
          unit.conformation.position(elementIdx, pos);
          const chainId = SP.chain.label_asym_id(l);
          const resSeq = SP.residue.label_seq_id(l);
          const resName = SP.atom.label_comp_id(l);

          metalDetails.push({
            pos: Vec3.clone(pos),
            element,
            info: `${element} (${resName}${resSeq}, Chain ${chainId})`,
            coordinating: []
          });
          metalCount++;
        }
      }
    }

    console.log(`Found ${metalCount} metal ions:`, metalDetails.map(m => m.info));

    // Second pass: find atoms within coordination distance of metals
    for (const unit of structure.units) {
      if (!unit.model) continue;

      const unitId = unit.id;

      for (let i = 0; i < unit.elements.length; i++) {
        const elementIdx = unit.elements[i];
        StructureElement.Location.set(l, structure, unit, elementIdx);

        const atomPos = Vec3();
        unit.conformation.position(elementIdx, atomPos);

        // Check distance to each metal
        for (const metal of metalDetails) {
          const dist = Vec3.distance(atomPos, metal.pos);

          if (dist > 0.1 && dist <= radius) { // Exclude self (dist > 0.1)
            const entityType = SP.entity.type(l);
            const chainId = SP.chain.label_asym_id(l);
            const resSeq = SP.residue.label_seq_id(l);
            const resName = SP.atom.label_comp_id(l);
            const atomName = SP.atom.label_atom_id(l);
            const resKey = `${chainId}:${resSeq}:${resName}`;
            const isWater = entityType === 'water' || resName === 'HOH' || resName === 'WAT';

            // Track coordinating atom
            if (!coordinatingAtomIndices.has(unitId)) {
              coordinatingAtomIndices.set(unitId, new Set());
            }
            coordinatingAtomIndices.get(unitId)!.add(i);

            // Add to metal's coordinating list with position
            metal.coordinating.push({
              atom: atomName,
              residue: `${resName}${resSeq}`,
              chain: chainId,
              distance: dist,
              isWater,
              position: Vec3.clone(atomPos)
            });

            // Check if it's water
            if (isWater) {
              coordinatingWaters.add(resKey);
              if (!coordinatingWaterIndices.has(unitId)) {
                coordinatingWaterIndices.set(unitId, new Set());
              }
              coordinatingWaterIndices.get(unitId)!.add(i);
              console.log(`  Coordinating water: ${atomName} (${resName}${resSeq}) at ${dist.toFixed(2)}Å from ${metal.element}`);
            } else {
              coordinatingResidues.add(resKey);
              console.log(`  Coordinating atom: ${atomName} (${resName}${resSeq}, Chain ${chainId}) at ${dist.toFixed(2)}Å from ${metal.element}`);
            }
          }
        }
      }
    }

    // Sort coordinating atoms by distance for each metal and analyze geometry
    const metalDetailsWithGeometry = metalDetails.map(metal => {
      metal.coordinating.sort((a, b) => a.distance - b.distance);

      // Analyze coordination geometry
      const ligandPositions = metal.coordinating.map(c => ({
        atom: `${c.atom}(${c.residue})`,
        pos: c.position
      }));

      const geometry = analyzeCoordinationGeometry(metal.pos, ligandPositions);

      // Classify binding site: functional vs crystal artifact
      const proteinContacts = metal.coordinating.filter(c => !c.isWater).length;
      const waterContacts = metal.coordinating.filter(c => c.isWater).length;
      const totalContacts = metal.coordinating.length;

      // Binding site classification criteria:
      // 1. Functional: >=3 protein contacts OR (>=2 protein contacts with proper geometry)
      // 2. Crystal artifact: 0-1 protein contacts, mostly/all water
      // 3. Uncertain: 2 protein contacts without clear geometry
      let bindingSiteType: 'functional' | 'crystal_artifact' | 'uncertain';
      let bindingSiteReason: string;

      if (proteinContacts >= 3) {
        bindingSiteType = 'functional';
        bindingSiteReason = `${proteinContacts} protein contacts - likely functional binding site`;
      } else if (proteinContacts === 0 && waterContacts > 0) {
        bindingSiteType = 'crystal_artifact';
        bindingSiteReason = `Only water coordination (${waterContacts}) - likely crystal additive`;
      } else if (proteinContacts === 1 && waterContacts >= 3) {
        bindingSiteType = 'crystal_artifact';
        bindingSiteReason = `Minimal protein contact (1), mostly water (${waterContacts}) - likely adventitious`;
      } else if (proteinContacts >= 2 && geometry && geometry.distortion !== 'severe') {
        bindingSiteType = 'functional';
        bindingSiteReason = `${proteinContacts} protein contacts with ${geometry.geometryType} geometry`;
      } else if (proteinContacts === 2 && waterContacts >= 2) {
        bindingSiteType = 'uncertain';
        bindingSiteReason = `Mixed coordination (${proteinContacts} protein, ${waterContacts} water) - needs manual review`;
      } else if (totalContacts <= 2) {
        bindingSiteType = 'uncertain';
        bindingSiteReason = `Low coordination number (${totalContacts}) - incomplete or artifact`;
      } else {
        bindingSiteType = 'uncertain';
        bindingSiteReason = `${proteinContacts} protein, ${waterContacts} water contacts`;
      }

      // Hydration analysis
      // Expected hydration numbers based on metal type (from literature)
      const expectedHydrationByMetal: Record<string, number> = {
        // Alkali metals - high hydration
        'NA': 6, 'K': 6, 'LI': 4, 'RB': 8, 'CS': 8,
        // Alkaline earth - variable
        'MG': 6, 'CA': 7, 'SR': 8, 'BA': 8,
        // Common transition metals
        'ZN': 4, 'CU': 4, 'FE': 6, 'MN': 6, 'CO': 6, 'NI': 6,
        // Lanthanides - high coordination
        'LA': 9, 'CE': 9, 'PR': 9, 'ND': 9, 'EU': 9, 'GD': 9, 'TB': 9, 'DY': 9,
        // Default
        'DEFAULT': 6
      };

      const expectedHydration = expectedHydrationByMetal[metal.element] || expectedHydrationByMetal['DEFAULT'];
      const waterDisplacement = expectedHydration > 0
        ? Math.round(((expectedHydration - waterContacts) / expectedHydration) * 100)
        : 0;

      // Determine hydration state
      let hydrationState: 'fully_hydrated' | 'partially_hydrated' | 'dehydrated';
      let hydrationNote: string;

      if (proteinContacts === 0 && waterContacts > 0) {
        hydrationState = 'fully_hydrated';
        hydrationNote = `All ${waterContacts} coordination sites occupied by water - metal is solvated, not protein-bound`;
      } else if (waterContacts === 0 && proteinContacts > 0) {
        hydrationState = 'dehydrated';
        hydrationNote = `Complete water displacement by ${proteinContacts} protein ligands - mature binding site`;
      } else if (proteinContacts > 0 && waterContacts > 0) {
        hydrationState = 'partially_hydrated';
        const ratio = proteinContacts / (proteinContacts + waterContacts);
        if (ratio >= 0.7) {
          hydrationNote = `High protein occupancy (${Math.round(ratio * 100)}%) - ${waterDisplacement}% water displaced`;
        } else if (ratio >= 0.4) {
          hydrationNote = `Mixed coordination (${proteinContacts} protein, ${waterContacts} water) - binding site may be incomplete`;
        } else {
          hydrationNote = `Low protein occupancy (${Math.round(ratio * 100)}%) - mostly hydrated, weak binding`;
        }
      } else {
        hydrationState = 'dehydrated';
        hydrationNote = 'No coordination detected';
      }

      const hydrationAnalysis = {
        waterCount: waterContacts,
        proteinLigandCount: proteinContacts,
        hydrationState,
        expectedHydration,
        waterDisplacement: Math.max(0, waterDisplacement),
        hydrationNote
      };

      // ========== SHELL ANALYSIS ==========
      // Analyze primary and secondary coordination shells for protein engineering insights

      // Ligand type classification
      const ligandTypeMap: Record<string, { residues: string[]; type: string }> = {};
      const classifyLigand = (residue: string, atom: string): string => {
        if (residue === 'HOH' || residue === 'WAT') return 'Water';
        if (['ASP', 'GLU'].includes(residue) && ['OD1', 'OD2', 'OE1', 'OE2'].includes(atom)) return 'Carboxylate (O)';
        if (residue === 'HIS' && ['ND1', 'NE2'].includes(atom)) return 'Imidazole (N)';
        if (residue === 'CYS' && atom === 'SG') return 'Thiolate (S)';
        if (residue === 'MET' && atom === 'SD') return 'Thioether (S)';
        if (['SER', 'THR', 'TYR'].includes(residue) && ['OG', 'OG1', 'OH'].includes(atom)) return 'Hydroxyl (O)';
        if (['ASN', 'GLN'].includes(residue) && ['OD1', 'OE1', 'ND2', 'NE2'].includes(atom)) return 'Amide (O/N)';
        if (atom === 'O' || atom === 'OXT') return 'Backbone (O)';
        if (atom === 'N') return 'Backbone (N)';
        return 'Other';
      };

      // Analyze primary shell ligand types
      for (const coord of metal.coordinating) {
        const ligType = classifyLigand(coord.residue, coord.atom);
        if (!ligandTypeMap[ligType]) {
          ligandTypeMap[ligType] = { residues: [], type: ligType };
        }
        ligandTypeMap[ligType].residues.push(`${coord.residue}${coord.chain ? '-' + coord.chain : ''}`);
      }

      const ligandTypes = Object.values(ligandTypeMap).map(lt => ({
        type: lt.type,
        count: lt.residues.length,
        residues: lt.residues
      }));

      const avgDistance = metal.coordinating.length > 0
        ? metal.coordinating.reduce((sum, c) => sum + c.distance, 0) / metal.coordinating.length
        : 0;

      // Find secondary shell residues (within 6Å of metal, H-bonding to primary shell)
      const secondaryShellResidues: { residue: string; chain: string; role: string; hBondCount: number; distance: number }[] = [];
      const secondaryShellSet = new Set<string>();
      const primaryResidueSet = new Set(metal.coordinating.map(c => `${c.chain}:${c.residue}`));
      let totalHBonds = 0;
      let waterBridges = 0;
      let chargedInSecondary = 0;

      // Scan for secondary shell (simplified - residues within 6Å not in primary shell)
      const l2 = StructureElement.Location.create(structure);
      const metalPos = metal.coordinating[0]?.position || Vec3.zero();

      for (const unit of structure.units) {
        if (!unit.model) continue;
        for (let i = 0; i < unit.elements.length; i++) {
          const elementIdx = unit.elements[i];
          StructureElement.Location.set(l2, structure, unit, elementIdx);

          const entityType = SP.entity.type(l2);
          if (entityType !== 'polymer') continue;

          const chainId = SP.chain.label_asym_id(l2);
          const resName = SP.atom.label_comp_id(l2);
          const resSeq = SP.residue.label_seq_id(l2);
          const atomName = SP.atom.label_atom_id(l2);
          const resKey = `${chainId}:${resName}${resSeq}`;

          // Skip if already in primary shell or already counted
          if (primaryResidueSet.has(`${chainId}:${resName}`) || secondaryShellSet.has(resKey)) continue;

          // Only consider potential H-bond donors/acceptors
          if (!['N', 'O', 'NE', 'NH1', 'NH2', 'ND1', 'ND2', 'NE2', 'OD1', 'OD2', 'OE1', 'OE2', 'OG', 'OG1', 'OH', 'NZ'].includes(atomName)) continue;

          const atomPos = Vec3();
          unit.conformation.position(elementIdx, atomPos);

          // Check distance to metal (secondary shell: 4-7Å)
          const distToMetal = Vec3.distance(atomPos, metalPos);
          if (distToMetal < 4.0 || distToMetal > 7.0) continue;

          // Check if H-bonding to any primary shell atom
          let hBondCount = 0;
          for (const primary of metal.coordinating) {
            const distToPrimary = Vec3.distance(atomPos, primary.position);
            if (distToPrimary >= 2.4 && distToPrimary <= 3.5) {
              hBondCount++;
              totalHBonds++;
            }
          }

          if (hBondCount > 0) {
            secondaryShellSet.add(resKey);

            // Determine role
            let role = 'H-bond support';
            if (['ASP', 'GLU'].includes(resName)) {
              role = 'Negative charge';
              chargedInSecondary++;
            } else if (['LYS', 'ARG'].includes(resName)) {
              role = 'Positive charge';
              chargedInSecondary++;
            } else if (resName === 'HIS') {
              role = 'His (pH-dependent)';
              chargedInSecondary++;
            } else if (['SER', 'THR', 'TYR'].includes(resName)) {
              role = 'H-bond donor/acceptor';
            } else if (['ASN', 'GLN'].includes(resName)) {
              role = 'Polar contact';
            }

            secondaryShellResidues.push({
              residue: `${resName}${resSeq}`,
              chain: chainId,
              role,
              hBondCount,
              distance: distToMetal
            });
          }
        }
      }

      // Count water bridges (waters coordinating metal that also H-bond to secondary shell)
      for (const coord of metal.coordinating) {
        if (coord.isWater && secondaryShellResidues.length > 0) {
          // Simplified check - waters coordinating metal can bridge to secondary shell
          waterBridges++;
        }
      }

      // Calculate site characteristics
      const chargedPrimary = metal.coordinating.filter(c =>
        ['ASP', 'GLU', 'LYS', 'ARG', 'HIS'].includes(c.residue)
      ).length;

      // Net charge estimation (simplified)
      let netCharge = 0;
      for (const coord of metal.coordinating) {
        if (['ASP', 'GLU'].includes(coord.residue)) netCharge -= 1;
        if (['LYS', 'ARG'].includes(coord.residue)) netCharge += 1;
      }
      for (const sec of secondaryShellResidues) {
        if (sec.role === 'Negative charge') netCharge -= 1;
        if (sec.role === 'Positive charge') netCharge += 1;
      }

      // Burial depth based on secondary shell size and water content
      let burialDepth: 'surface' | 'shallow' | 'buried' | 'deep';
      if (secondaryShellResidues.length >= 8 && waterContacts === 0) {
        burialDepth = 'deep';
      } else if (secondaryShellResidues.length >= 5 && waterContacts <= 1) {
        burialDepth = 'buried';
      } else if (secondaryShellResidues.length >= 2) {
        burialDepth = 'shallow';
      } else {
        burialDepth = 'surface';
      }

      // Shell completeness (based on expected coordination number)
      const shellCompleteness = Math.min(100, Math.round((totalContacts / expectedHydration) * 100));

      // Stability score
      let stabilityScore: 'weak' | 'moderate' | 'strong' | 'very_strong';
      const stabilityPoints = proteinContacts * 2 + totalHBonds + (chargedPrimary * 1.5) + (secondaryShellResidues.length * 0.5);
      if (stabilityPoints >= 12) stabilityScore = 'very_strong';
      else if (stabilityPoints >= 8) stabilityScore = 'strong';
      else if (stabilityPoints >= 4) stabilityScore = 'moderate';
      else stabilityScore = 'weak';

      // Generate engineering notes
      const engineeringNotes: string[] = [];

      if (waterContacts > proteinContacts) {
        engineeringNotes.push('⚠️ High water content - consider mutations to increase protein contacts');
      }
      if (proteinContacts >= 3 && waterContacts === 0) {
        engineeringNotes.push('✓ Mature binding site with complete water displacement');
      }
      if (chargedInSecondary === 0 && proteinContacts > 0) {
        engineeringNotes.push('💡 No charged residues in secondary shell - adding Asp/Glu may increase affinity');
      }
      if (totalHBonds < 2 && proteinContacts > 0) {
        engineeringNotes.push('💡 Weak H-bond network - secondary shell mutations could improve stability');
      }
      if (ligandTypes.some(lt => lt.type === 'Carboxylate (O)' && lt.count >= 2)) {
        engineeringNotes.push('✓ Multiple carboxylate ligands - typical for Ca²⁺/Mg²⁺ sites');
      }
      if (ligandTypes.some(lt => lt.type === 'Thiolate (S)')) {
        engineeringNotes.push('✓ Cysteine thiolate coordination - typical for Zn²⁺ structural sites');
      }
      if (ligandTypes.some(lt => lt.type === 'Imidazole (N)' && lt.count >= 2)) {
        engineeringNotes.push('✓ Multiple His ligands - common in catalytic Zn²⁺ or Cu²⁺ sites');
      }
      if (burialDepth === 'surface' && proteinContacts > 0) {
        engineeringNotes.push('⚠️ Surface-exposed site - may have lower metal affinity');
      }
      if (geometry && geometry.distortion === 'severe') {
        engineeringNotes.push('⚠️ Highly distorted geometry - may indicate strain or incomplete site');
      }

      const shellAnalysis = {
        primaryShell: {
          ligandTypes,
          totalLigands: totalContacts,
          proteinLigands: proteinContacts,
          waterLigands: waterContacts,
          avgDistance: Math.round(avgDistance * 100) / 100
        },
        secondaryShell: {
          residues: secondaryShellResidues.slice(0, 10), // Limit to top 10
          totalResidues: secondaryShellResidues.length,
          chargedResidues: chargedInSecondary,
          hBondNetwork: totalHBonds,
          waterBridges
        },
        siteCharacteristics: {
          netCharge,
          burialDepth,
          shellCompleteness,
          stabilityScore
        },
        engineeringNotes
      };

      console.log(`  ${metal.info}: CN=${geometry?.coordinationNumber}, Geometry=${geometry?.geometryType}, CShM=${geometry?.rmsd.toFixed(2)}, Type=${bindingSiteType}, Hydration=${hydrationState}, 2ndShell=${secondaryShellResidues.length}`);

      return {
        ...metal,
        geometry,
        bindingSiteType,
        bindingSiteReason,
        hydrationAnalysis,
        shellAnalysis
      };
    });

    return {
      metalCount,
      metalDetails: metalDetailsWithGeometry,
      coordinatingAtomIndices,
      coordinatingWaterIndices,
      coordinatingResidues,
      coordinatingWaters
    };
  };

  // Common crystallization additives and buffers to flag
  const CRYSTAL_ADDITIVES = new Set([
    'SO4', 'PO4', 'GOL', 'EDO', 'PEG', 'MPD', 'DMS', 'ACT', 'CIT', 'TRS',
    'BME', 'MES', 'EPE', 'IMD', 'SCN', 'NO3', 'CL', 'BR', 'IOD', 'F',
    'BU3', 'PG4', '1PE', 'P6G', 'PGE', 'ARS'
  ]);

  // Find ligands and their protein contacts
  const findLigandContacts = (structure: Structure, radius: number) => {
    // Atoms that can form H-bonds
    const hBondDonors = new Set(['N', 'O', 'S']);
    const hBondAcceptors = new Set(['N', 'O', 'S', 'F']);
    // Hydrophobic atoms
    const hydrophobicAtoms = new Set(['C']);
    // Charged atoms for salt bridges
    const positiveResidues = new Set(['ARG', 'LYS', 'HIS']);
    const negativeResidues = new Set(['ASP', 'GLU']);

    // Metal elements to exclude from ligand analysis (metals are handled by metal coordination analysis)
    const metalElements = new Set([
      // Alkali metals
      'LI', 'NA', 'K', 'RB', 'CS', 'FR',
      // Alkaline earth metals
      'BE', 'MG', 'CA', 'SR', 'BA', 'RA',
      // Transition metals (3d, 4d, 5d)
      'SC', 'TI', 'V', 'CR', 'MN', 'FE', 'CO', 'NI', 'CU', 'ZN',
      'Y', 'ZR', 'NB', 'MO', 'TC', 'RU', 'RH', 'PD', 'AG', 'CD',
      'HF', 'TA', 'W', 'RE', 'OS', 'IR', 'PT', 'AU', 'HG',
      // Post-transition metals
      'AL', 'GA', 'IN', 'SN', 'TL', 'PB', 'BI', 'PO',
      // Lanthanides (rare earths)
      'LA', 'CE', 'PR', 'ND', 'PM', 'SM', 'EU', 'GD', 'TB', 'DY', 'HO', 'ER', 'TM', 'YB', 'LU',
      // Actinides
      'AC', 'TH', 'PA', 'U', 'NP', 'PU', 'AM', 'CM', 'BK', 'CF', 'ES', 'FM', 'MD', 'NO', 'LR'
    ]);

    const ligandDetails: {
      name: string;
      info: string;
      atoms: number;
      chainId: string;
      resSeq: number;
      contacts: {
        residue: string;
        chain: string;
        atom: string;
        distance: number;
        interactionType: 'hydrogen_bond' | 'hydrophobic' | 'salt_bridge' | 'pi_stacking' | 'other';
      }[];
      proteinContactCount: number;
      waterContactCount: number;
      bindingSiteType: 'functional' | 'crystal_artifact' | 'uncertain';
      bindingSiteReason: string;
    }[] = [];

    // First pass: identify all ligand residues
    const ligandResidues = new Map<string, { name: string; chainId: string; resSeq: number; atomIndices: number[]; unitId: number }>();
    const l = StructureElement.Location.create(structure);

    for (const unit of structure.units) {
      if (!unit.model) continue;

      for (let i = 0; i < unit.elements.length; i++) {
        const elementIdx = unit.elements[i];
        StructureElement.Location.set(l, structure, unit, elementIdx);

        const entityType = SP.entity.type(l);
        const resName = SP.atom.label_comp_id(l);

        // Check if this is a ligand (non-polymer, non-water, non-metal)
        // Metal ions are handled by metal coordination analysis
        const isMetal = metalElements.has(resName) || metalElements.has(resName.toUpperCase());
        if (entityType === 'non-polymer' && resName !== 'HOH' && resName !== 'WAT' && !isMetal) {
          const chainId = SP.chain.label_asym_id(l);
          const resSeq = SP.residue.label_seq_id(l);
          const key = `${chainId}:${resSeq}:${resName}`;

          if (!ligandResidues.has(key)) {
            ligandResidues.set(key, {
              name: resName,
              chainId,
              resSeq,
              atomIndices: [],
              unitId: unit.id
            });
          }
          ligandResidues.get(key)!.atomIndices.push(i);
        }
      }
    }

    console.log(`Found ${ligandResidues.size} ligands:`, Array.from(ligandResidues.keys()));

    // Second pass: find contacts for each ligand
    for (const [ligKey, ligand] of ligandResidues) {
      const contacts: typeof ligandDetails[0]['contacts'] = [];
      const contactedResidues = new Set<string>();
      let proteinContactCount = 0;
      let waterContactCount = 0;

      // Get positions of all ligand atoms
      const ligandAtomPositions: Vec3[] = [];
      for (const unit of structure.units) {
        if (unit.id !== ligand.unitId) continue;

        for (const atomIdx of ligand.atomIndices) {
          const pos = Vec3();
          unit.conformation.position(unit.elements[atomIdx], pos);
          ligandAtomPositions.push(Vec3.clone(pos));
        }
      }

      // Check all protein/water atoms for contacts
      for (const unit of structure.units) {
        if (!unit.model) continue;

        for (let i = 0; i < unit.elements.length; i++) {
          const elementIdx = unit.elements[i];
          StructureElement.Location.set(l, structure, unit, elementIdx);

          const entityType = SP.entity.type(l);
          const chainId = SP.chain.label_asym_id(l);
          const resSeq = SP.residue.label_seq_id(l);
          const resName = SP.atom.label_comp_id(l);
          const atomName = SP.atom.label_atom_id(l);
          const resKey = `${chainId}:${resSeq}:${resName}`;

          // Skip if same residue as ligand
          if (resKey === ligKey) continue;

          const atomPos = Vec3();
          unit.conformation.position(elementIdx, atomPos);

          // Check distance to any ligand atom
          let minDist = Infinity;
          for (const ligPos of ligandAtomPositions) {
            const dist = Vec3.distance(atomPos, ligPos);
            if (dist < minDist) minDist = dist;
          }

          if (minDist <= radius) {
            const isWater = entityType === 'water' || resName === 'HOH' || resName === 'WAT';
            const isProtein = entityType === 'polymer';

            if (isWater) {
              waterContactCount++;
            } else if (isProtein) {
              proteinContactCount++;

              // Determine interaction type
              let interactionType: 'hydrogen_bond' | 'hydrophobic' | 'salt_bridge' | 'pi_stacking' | 'other' = 'other';
              const atomElement = SP.atom.type_symbol(l);

              if (minDist <= 3.5 && (hBondDonors.has(atomElement) || hBondAcceptors.has(atomElement))) {
                interactionType = 'hydrogen_bond';
              } else if (minDist <= 4.0 && hydrophobicAtoms.has(atomElement)) {
                interactionType = 'hydrophobic';
              } else if (minDist <= 4.0 && (positiveResidues.has(resName) || negativeResidues.has(resName))) {
                interactionType = 'salt_bridge';
              }

              // Only add unique residue contacts
              if (!contactedResidues.has(resKey)) {
                contactedResidues.add(resKey);
                contacts.push({
                  residue: `${resName}${resSeq}`,
                  chain: chainId,
                  atom: atomName,
                  distance: minDist,
                  interactionType
                });
              }
            }
          }
        }
      }

      // Sort contacts by distance
      contacts.sort((a, b) => a.distance - b.distance);

      // Classify binding site
      let bindingSiteType: 'functional' | 'crystal_artifact' | 'uncertain';
      let bindingSiteReason: string;
      const uniqueProteinResidues = contacts.length;
      const isCrystalAdditive = CRYSTAL_ADDITIVES.has(ligand.name);

      if (isCrystalAdditive && uniqueProteinResidues < 3) {
        bindingSiteType = 'crystal_artifact';
        bindingSiteReason = `Known crystallization additive (${ligand.name}) with few contacts`;
      } else if (uniqueProteinResidues >= 5) {
        bindingSiteType = 'functional';
        bindingSiteReason = `${uniqueProteinResidues} protein residue contacts - well-defined binding pocket`;
      } else if (uniqueProteinResidues >= 3) {
        bindingSiteType = isCrystalAdditive ? 'uncertain' : 'functional';
        bindingSiteReason = `${uniqueProteinResidues} protein contacts${isCrystalAdditive ? ' (common additive - verify)' : ''}`;
      } else if (uniqueProteinResidues <= 1) {
        bindingSiteType = 'crystal_artifact';
        bindingSiteReason = `Minimal protein contacts (${uniqueProteinResidues}) - likely surface-bound additive`;
      } else {
        bindingSiteType = 'uncertain';
        bindingSiteReason = `${uniqueProteinResidues} protein contacts - needs manual inspection`;
      }

      ligandDetails.push({
        name: ligand.name,
        info: `${ligand.name} (Chain ${ligand.chainId}, ${ligand.resSeq})`,
        atoms: ligand.atomIndices.length,
        chainId: ligand.chainId,
        resSeq: ligand.resSeq,
        contacts,
        proteinContactCount,
        waterContactCount,
        bindingSiteType,
        bindingSiteReason
      });
    }

    return {
      ligandCount: ligandDetails.length,
      ligandDetails
    };
  };

  // Toggle ligand analysis
  const toggleLigandAnalysis = async () => {
    const newState = !showLigandAnalysis;
    setShowLigandAnalysis(newState);

    if (pluginRef.current && structureRef.current && newState) {
      await analyzeLigands(structureRef.current);
    } else if (!newState) {
      // Clear selection highlighting when turning off
      if (pluginRef.current) {
        pluginRef.current.managers.structure.selection.clear();
        // Re-apply normal visualization to clear the highlighting colors
        await updateVisualization(selectedRepresentation, selectedColorScheme);
      }
      setLigandData(null);
    }
  };

  // Analyze ligands in the structure
  const analyzeLigands = async (structureRefToUse: StateObjectRef<any>) => {
    if (!pluginRef.current) return;

    const plugin = pluginRef.current;
    const state = plugin.state.data;
    const cell = state.cells.get(structureRefToUse as any);

    if (!cell || !cell.obj?.data) return;

    const structure: Structure = cell.obj.data;
    const result = findLigandContacts(structure, ligandRadius);

    if (result.ligandCount > 0) {
      setLigandData({
        ligands: result.ligandDetails,
        totalLigands: result.ligandCount
      });
    } else {
      setLigandData(null);
      showToast('info', 'No ligands found in structure');
    }
  };

  // Apply electrostatic coloring (charge-based: Blue +, Red -, White neutral)
  const applyElectrostaticColoring = async (structureRefToUse: StateObjectRef<any>) => {
    if (!pluginRef.current) return;

    const plugin = pluginRef.current;

    try {
      // Positive residues (Lys, Arg, His) - Blue
      const positiveResidues = ['LYS', 'ARG', 'HIS'];
      const positiveComponent = await plugin.builders.structure.tryCreateComponentFromExpression(
        structureRefToUse,
        MS.struct.modifier.union([
          MS.struct.generator.atomGroups({
            'residue-test': MS.core.set.has([MS.set(...positiveResidues), MS.ammp('label_comp_id')])
          })
        ]),
        'electrostatic-positive',
        { label: 'Positive Residues (+)' }
      );
      if (positiveComponent) {
        await plugin.builders.structure.representation.addRepresentation(positiveComponent, {
          type: selectedRepresentation === 'surface' ? 'molecular-surface' :
                selectedRepresentation === 'gaussian-surface' ? 'gaussian-surface' :
                selectedRepresentation === 'spacefill' ? 'spacefill' :
                selectedRepresentation === 'ball-and-stick' ? 'ball-and-stick' : 'cartoon',
          color: 'uniform' as any,
          colorParams: { value: Color(0x4A90D9) }, // Blue
        }, { tag: 'electrostatic-positive' });
      }

      // Negative residues (Asp, Glu) - Red
      const negativeResidues = ['ASP', 'GLU'];
      const negativeComponent = await plugin.builders.structure.tryCreateComponentFromExpression(
        structureRefToUse,
        MS.struct.modifier.union([
          MS.struct.generator.atomGroups({
            'residue-test': MS.core.set.has([MS.set(...negativeResidues), MS.ammp('label_comp_id')])
          })
        ]),
        'electrostatic-negative',
        { label: 'Negative Residues (-)' }
      );
      if (negativeComponent) {
        await plugin.builders.structure.representation.addRepresentation(negativeComponent, {
          type: selectedRepresentation === 'surface' ? 'molecular-surface' :
                selectedRepresentation === 'gaussian-surface' ? 'gaussian-surface' :
                selectedRepresentation === 'spacefill' ? 'spacefill' :
                selectedRepresentation === 'ball-and-stick' ? 'ball-and-stick' : 'cartoon',
          color: 'uniform' as any,
          colorParams: { value: Color(0xD94A4A) }, // Red
        }, { tag: 'electrostatic-negative' });
      }

      // Neutral residues - White/Light gray
      const neutralResidues = ['ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'TYR',
                               'SER', 'THR', 'CYS', 'ASN', 'GLN', 'GLY', 'PRO'];
      const neutralComponent = await plugin.builders.structure.tryCreateComponentFromExpression(
        structureRefToUse,
        MS.struct.modifier.union([
          MS.struct.generator.atomGroups({
            'residue-test': MS.core.set.has([MS.set(...neutralResidues), MS.ammp('label_comp_id')])
          })
        ]),
        'electrostatic-neutral',
        { label: 'Neutral Residues' }
      );
      if (neutralComponent) {
        await plugin.builders.structure.representation.addRepresentation(neutralComponent, {
          type: selectedRepresentation === 'surface' ? 'molecular-surface' :
                selectedRepresentation === 'gaussian-surface' ? 'gaussian-surface' :
                selectedRepresentation === 'spacefill' ? 'spacefill' :
                selectedRepresentation === 'ball-and-stick' ? 'ball-and-stick' : 'cartoon',
          color: 'uniform' as any,
          colorParams: { value: Color(0xF5F5F5) }, // White/Light gray
        }, { tag: 'electrostatic-neutral' });
      }
    } catch (error) {
      console.error('Failed to apply electrostatic coloring:', error);
    }
  };

  // Apply custom residue highlighting
  const applyResidueHighlighting = async (structureRefToUse: StateObjectRef<any>, residueTypes: string[], customColor: string, useCustom: boolean) => {
    if (!pluginRef.current || residueTypes.length === 0) return;

    const plugin = pluginRef.current;

    try {
      // First remove any existing custom highlights
      await removeCustomHighlights();

      if (useCustom) {
        // Use single custom color for all selected residues
        const highlightComponent = await plugin.builders.structure.tryCreateComponentFromExpression(
          structureRefToUse,
          MS.struct.modifier.union([
            MS.struct.generator.atomGroups({
              'residue-test': MS.core.set.has([MS.set(...residueTypes), MS.ammp('label_comp_id')])
            })
          ]),
          'custom-residue-highlight',
          { label: `Highlighted: ${residueTypes.join(', ')}` }
        );

        if (highlightComponent) {
          const hexColor = customColor.replace('#', '');
          const colorValue = Color(parseInt(hexColor, 16));

          await plugin.builders.structure.representation.addRepresentation(highlightComponent, {
            type: 'ball-and-stick',
            color: 'uniform' as any,
            colorParams: { value: colorValue },
            typeParams: { sizeFactor: 0.4, sizeAspectRatio: 0.73 },
          }, { tag: 'custom-residue-highlight' });

          await plugin.builders.structure.representation.addRepresentation(highlightComponent, {
            type: 'molecular-surface',
            color: 'uniform' as any,
            colorParams: { value: colorValue },
            typeParams: { alpha: 0.35 },
          }, { tag: 'custom-residue-highlight-surface' });
        }
      } else {
        // Use individual category colors for each residue type
        for (const resType of residueTypes) {
          const aaInfo = AMINO_ACIDS.find(aa => aa.code === resType);
          const resColor = aaInfo?.color || '#FF6B6B';

          const component = await plugin.builders.structure.tryCreateComponentFromExpression(
            structureRefToUse,
            MS.struct.modifier.union([
              MS.struct.generator.atomGroups({
                'residue-test': MS.core.rel.eq([MS.ammp('label_comp_id'), resType])
              })
            ]),
            `custom-residue-highlight-${resType}`,
            { label: `${resType}` }
          );

          if (component) {
            const hexColor = resColor.replace('#', '');
            const colorValue = Color(parseInt(hexColor, 16));

            await plugin.builders.structure.representation.addRepresentation(component, {
              type: 'ball-and-stick',
              color: 'uniform' as any,
              colorParams: { value: colorValue },
              typeParams: { sizeFactor: 0.4, sizeAspectRatio: 0.73 },
            }, { tag: 'custom-residue-highlight' });

            await plugin.builders.structure.representation.addRepresentation(component, {
              type: 'molecular-surface',
              color: 'uniform' as any,
              colorParams: { value: colorValue },
              typeParams: { alpha: 0.35 },
            }, { tag: 'custom-residue-highlight-surface' });
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply residue highlighting:', error);
    }
  };

  // Remove custom highlights
  const removeCustomHighlights = async () => {
    if (!pluginRef.current) return;

    const plugin = pluginRef.current;
    const state = plugin.state.data;

    // Find and remove custom highlight components
    const toRemove: string[] = [];
    state.cells.forEach((cell: any, ref: string) => {
      if (cell?.obj?.tags?.includes('custom-residue-highlight') ||
          cell?.obj?.tags?.includes('custom-residue-highlight-surface')) {
        toRemove.push(ref);
      }
    });

    if (toRemove.length > 0) {
      const update = state.build();
      for (const ref of toRemove) {
        update.delete(ref);
      }
      await update.commit();
    }
  };

  // Toggle residue highlight panel
  const toggleResidueHighlight = () => {
    const newState = !showResidueHighlight;
    setShowResidueHighlight(newState);

    if (!newState) {
      // Clear highlights when closing panel
      removeCustomHighlights();
      setSelectedResidueTypes([]);
    }
  };

  // Handle residue type selection
  const handleResidueTypeToggle = (residueCode: string) => {
    setSelectedResidueTypes(prev => {
      if (prev.includes(residueCode)) {
        return prev.filter(r => r !== residueCode);
      } else {
        return [...prev, residueCode];
      }
    });
  };

  // Handle category quick select
  const handleCategorySelect = (categoryResidues: string[]) => {
    setSelectedResidueTypes(prev => {
      const allSelected = categoryResidues.every(r => prev.includes(r));
      if (allSelected) {
        // Deselect all in category
        return prev.filter(r => !categoryResidues.includes(r));
      } else {
        // Select all in category
        const newSelection = new Set([...prev, ...categoryResidues]);
        return Array.from(newSelection);
      }
    });
  };

  // Apply highlighting when selection changes
  useEffect(() => {
    if (showResidueHighlight && structureRef.current && selectedResidueTypes.length > 0) {
      applyResidueHighlighting(structureRef.current, selectedResidueTypes, highlightColor, useCustomColor);
    } else if (showResidueHighlight && selectedResidueTypes.length === 0) {
      removeCustomHighlights();
    }
  }, [selectedResidueTypes, highlightColor, useCustomColor, showResidueHighlight]);

  // Create a StructureElement.Loci for coordinating atoms
  const createCoordinatingLoci = (structure: Structure, atomIndices: Map<number, Set<number>>): StructureElement.Loci | null => {
    if (atomIndices.size === 0) return null;

    // Build elements array (mutable, will be passed to Loci constructor)
    const elements: { unit: any; indices: OrderedSet<number> }[] = [];

    for (const unit of structure.units) {
      const indices = atomIndices.get(unit.id);
      if (indices && indices.size > 0) {
        // Convert Set to sorted array for OrderedSet
        const sortedIndices = Array.from(indices).sort((a, b) => a - b);
        elements.push({
          unit,
          indices: OrderedSet.ofSortedArray(sortedIndices)
        });
      }
    }

    if (elements.length === 0) return null;

    return StructureElement.Loci(structure, elements as any);
  };

  // Show coordinating waters even when bulk water is hidden
  const showCoordinatingWaters = async (structureRefToUse: StateObjectRef<any>, waterIndices: Map<number, Set<number>>) => {
    if (!pluginRef.current || waterIndices.size === 0) return;

    const plugin = pluginRef.current;
    const state = plugin.state.data;
    const cell = state.cells.get(structureRefToUse as any);

    if (!cell || !cell.obj?.data) return;

    const structure: Structure = cell.obj.data;

    // Create loci for coordinating waters
    const waterLoci = createCoordinatingLoci(structure, waterIndices);

    if (waterLoci && StructureElement.Loci.size(waterLoci) > 0) {
      // Add waters to selection so they're highlighted
      plugin.managers.structure.selection.fromLoci('add', waterLoci);

      // If water component doesn't exist or is hidden, we need to create a representation for coordinating waters
      if (!showWater) {
        try {
          // Create a custom component for coordinating waters only
          const waterComponent = await plugin.builders.structure.tryCreateComponentFromExpression(
            structureRefToUse,
            MS.struct.modifier.union([
              MS.struct.generator.atomGroups({
                'entity-test': MS.core.rel.eq([MS.ammp('entityType'), 'water'])
              })
            ]),
            'coordinating-water',
            { label: 'Coordinating Waters' }
          );

          if (waterComponent) {
            await plugin.builders.structure.representation.addRepresentation(waterComponent, {
              type: 'ball-and-stick',
              color: 'element-symbol' as any,
              typeParams: {
                sizeFactor: 0.25,
                alpha: 1.0
              },
            }, { tag: 'coordinating-water' });
          }
        } catch (error) {
          console.error('Failed to show coordinating waters:', error);
        }
      }
    }
  };

  // Toggle coordination highlighting
  const toggleCoordinationHighlight = async () => {
    const newState = !showCoordinationHighlight;
    setShowCoordinationHighlight(newState);

    if (pluginRef.current && structureRef.current) {
      if (newState) {
        await applyCoordinationHighlighting(structureRef.current);
      } else {
        // Clear highlighting and data
        pluginRef.current.managers.structure.selection.clear();
        setCoordinationData(null);

        // Remove coordinating water representation if it exists
        const state = pluginRef.current.state.data;
        const waterReps = state.select(state.tree.root.ref).filter(
          (cell: any) => cell.obj?.tags?.includes('coordinating-water')
        );
        for (const rep of waterReps) {
          await PluginCommands.State.RemoveObject(pluginRef.current, { state, ref: rep.transform.ref });
        }

        // Re-apply normal visualization to clear the highlighting colors
        await updateVisualization(selectedRepresentation, selectedColorScheme);

        showToast('info', 'Coordination highlighting cleared');
      }
    }
  };

  // Re-apply coordination highlighting when radius changes
  const handleRadiusChange = async (newRadius: number) => {
    setCoordinationRadius(newRadius);
    if (showCoordinationHighlight && pluginRef.current && structureRef.current) {
      // Small delay to allow state update
      setTimeout(async () => {
        await applyCoordinationHighlighting(structureRef.current!);
      }, 100);
    }
  };

  // Update visualization by reloading structure with new settings
  const updateVisualization = async (representation: string, colorScheme: string) => {
    if (!pluginRef.current || !currentStructure) return;

    const plugin = pluginRef.current;

    // Use a simple flag instead of isLoading to avoid drag overlay issues
    setIsUpdatingVisualization(true);

    try {
      // Clear the entire viewer
      await plugin.clear();
      structureRef.current = null;

      // Reload structure with new visualization settings
      // This is the most reliable approach - fully reload but from cache
      if (currentStructure.source === 'pdb' && currentStructure.pdbId) {
        // Reload from PDB with new settings
        const data = await plugin.builders.data.download({
          url: `https://files.rcsb.org/download/${currentStructure.pdbId.toUpperCase()}.cif`,
          isBinary: false,
          label: currentStructure.pdbId.toUpperCase(),
        }, { state: { isGhost: true } });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, representation, colorScheme);

      } else if (currentStructure.data) {
        // Reload from cached file data with new settings
        const fileType = currentStructure.name.toLowerCase().endsWith('.cif') ? 'mmcif' : 'pdb';

        const data = await plugin.builders.data.rawData({
          data: currentStructure.data,
          label: currentStructure.name,
        }, { state: { isGhost: true } });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, fileType);
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, representation, colorScheme);
      }

      // Reset camera
      PluginCommands.Camera.Reset(plugin, { durationMs: 0 });

    } catch (error) {
      console.error('Failed to update visualization:', error);
      showToast('error', 'Failed to update visualization');
      throw error;
    } finally {
      setIsUpdatingVisualization(false);
    }
  };

  // Load structure from PDB ID
  const loadFromPDB = async (pdbId: string, representation?: string, colorScheme?: string, shouldSave: boolean = true) => {
    if (!pluginRef.current) return;

    setIsLoading(true);
    // Reset selected chain when loading new structure
    setSelectedAnalysisChain('');
    try {
      const plugin = pluginRef.current;

      // Clear existing structure
      await plugin.clear();
      structureRef.current = null;

      // Load from RCSB PDB
      const data = await plugin.builders.data.download({
        url: `https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`,
        isBinary: false,
        label: pdbId.toUpperCase(),
      }, { state: { isGhost: true } });

      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);

      // Store structure reference
      structureRef.current = structure.ref;

      // Apply visualization with provided or current values
      const rep = representation || selectedRepresentation;
      const color = colorScheme || selectedColorScheme;
      await applyVisualization(structure.ref, rep, color);

      // Fetch protein info from RCSB API (only on initial load)
      if (shouldSave) {
        try {
          const infoResponse = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbId.toUpperCase()}`);
          if (infoResponse.ok) {
            const info = await infoResponse.json();
            setProteinInfo({
              title: info.struct?.title,
              experimentalMethod: info.exptl?.[0]?.method,
              resolution: info.rcsb_entry_info?.resolution_combined?.[0],
              depositionDate: info.rcsb_accession_info?.deposit_date,
              organism: info.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch PDB metadata:', err);
        }
      }

      // Only save structure on initial load, not when changing representation/color
      if (shouldSave) {
        const newStructure: ProteinStructure = {
          id: generateStructureId(),
          name: pdbId.toUpperCase(),
          source: 'pdb',
          pdbId: pdbId.toUpperCase(),
          uploadDate: new Date(),
        };

        await saveStructure(newStructure);
        setCurrentStructure(newStructure);

        const structures = await getAllStructures();
        setSavedStructures(structures);

        showToast('success', `Loaded ${pdbId.toUpperCase()} from PDB`);
        setPdbSearchQuery('');
      }
    } catch (error) {
      console.error('Failed to load PDB:', error);
      showToast('error', `Failed to load ${pdbId}. Please check the PDB ID.`);
    } finally {
      setIsLoading(false);
      // Force clear drag overlay
      setIsDraggingOver(false);
    }
  };

  // Load structure from file
  const loadFromFile = async (file: File, representation?: string, colorScheme?: string, shouldSave: boolean = true) => {
    if (!pluginRef.current) {
      console.warn('Plugin not initialized');
      return;
    }

    console.log('Starting file load:', file.name);
    setIsLoading(true);
    // Reset selected chain when loading new structure
    setSelectedAnalysisChain('');

    // Immediately clear drag state
    setIsDraggingOver(false);
    allowDragOverlayRef.current = false;

    try {
      const plugin = pluginRef.current;

      console.log('Clearing existing structure...');
      // Clear existing structure
      await plugin.clear();
      structureRef.current = null;

      console.log('Reading file...');
      const text = await file.text();
      const fileType = file.name.toLowerCase().endsWith('.cif') ? 'mmcif' : 'pdb';

      console.log('Parsing structure data...');
      // Load from data
      const data = await plugin.builders.data.rawData({
        data: text,
        label: file.name,
      }, { state: { isGhost: true } });

      console.log('Building trajectory...');
      const trajectory = await plugin.builders.structure.parseTrajectory(data, fileType);

      console.log('Creating model...');
      const model = await plugin.builders.structure.createModel(trajectory);

      console.log('Creating structure...');
      const structure = await plugin.builders.structure.createStructure(model);

      // Store structure reference
      structureRef.current = structure.ref;

      console.log('Applying visualization...');
      // Apply visualization with provided or current values
      const rep = representation || selectedRepresentation;
      const color = colorScheme || selectedColorScheme;
      await applyVisualization(structure.ref, rep, color);

      // Only save structure on initial load, not when changing representation/color
      if (shouldSave) {
        console.log('Saving structure...');
        const newStructure: ProteinStructure = {
          id: generateStructureId(),
          name: file.name,
          source: 'file',
          data: text,
          uploadDate: new Date(),
          fileSize: file.size,
        };

        await saveStructure(newStructure);
        setCurrentStructure(newStructure);

        const structures = await getAllStructures();
        setSavedStructures(structures);

        setProteinInfo({ title: file.name });
        showToast('success', `Loaded ${file.name}`);
      }
      console.log('File load complete!');
    } catch (error) {
      console.error('Failed to load file:', error);
      showToast('error', 'Failed to load structure file');
      // Re-enable drag overlay on error
      setTimeout(() => {
        allowDragOverlayRef.current = true;
      }, 500);
    } finally {
      console.log('Cleaning up, setting isLoading to false');
      setIsLoading(false);
      // Ensure drag overlay stays cleared
      setIsDraggingOver(false);
    }
  };

  // Handle representation change
  const handleRepresentationChange = async (repId: string) => {
    if (!pluginRef.current || !currentStructure || !structureRef.current) return;

    setSelectedRepresentation(repId);

    try {
      // Update visualization without reloading the structure
      await updateVisualization(repId, selectedColorScheme);
      showToast('success', `Representation changed to ${repId}`);
    } catch (error) {
      console.error('Failed to change representation:', error);
      showToast('error', 'Failed to change representation');
    }
  };

  // Handle color scheme change
  const handleColorSchemeChange = async (schemeId: string) => {
    if (!pluginRef.current || !currentStructure || !structureRef.current) return;

    setSelectedColorScheme(schemeId);

    try {
      // Update visualization without reloading the structure
      await updateVisualization(selectedRepresentation, schemeId);
      showToast('success', `Color scheme changed to ${schemeId}`);
    } catch (error) {
      console.error('Failed to change color scheme:', error);
      showToast('error', 'Failed to change color scheme');
    }
  };

  // Reset camera
  const resetCamera = () => {
    if (!pluginRef.current) return;
    PluginCommands.Camera.Reset(pluginRef.current, {});
  };

  // Focus on structure
  const focusOnStructure = () => {
    if (!pluginRef.current) return;

    try {
      PluginCommands.Camera.Reset(pluginRef.current, { durationMs: 250 });
      showToast('success', 'Focused on structure');
    } catch (error) {
      console.error('Failed to focus:', error);
    }
  };

  // Toggle measurement mode
  const toggleMeasurement = () => {
    if (!pluginRef.current) return;

    const newMode = !measurementMode;
    setMeasurementMode(newMode);

    if (newMode) {
      setSelectedLoci([]);
      showToast('info', 'Measurement mode enabled. Click two atoms to measure distance. Selected atoms will be highlighted.');
    } else {
      // Clear highlights when disabling measurement mode
      // Note: Measurement visuals persist in the scene (as in Molstar's default behavior)
      // Users can manage them through Molstar's UI or by reloading the structure
      if (pluginRef.current.managers.interactivity?.lociHighlights) {
        pluginRef.current.managers.interactivity.lociHighlights.clearHighlights();
      }

      setSelectedLoci([]);
      showToast('info', 'Measurement mode disabled');
    }
  };

  // Get atom information for display (works with all loci types)
  const getAtomInfo = (loci: any): string => {
    try {
      if (!loci || loci.kind === 'empty-loci') return 'Unknown';

      if (loci.kind === 'element-loci') {
        const { structure, elements } = loci;

        if (!elements || elements.length === 0) return 'Unknown';

        // Get the first element from the loci.elements array
        const element = elements[0];

        // The unit is the Unit object itself (not an index)
        const unit = element.unit;

        // The indices is an OrderedSet - use OrderedSet module methods
        const { indices } = element;

        // Get first index from OrderedSet
        const elementIndex = unit.elements[OrderedSet.getAt(indices, 0)];

        if (!unit || elementIndex === undefined) return 'Unknown';

        // Create location and extract atom details
        const l = StructureElement.Location.create(structure, unit, elementIndex);

        const atomName = SP.atom.label_atom_id(l);
        const resName = SP.atom.label_comp_id(l); // Residue name accessed via atom
        const resSeq = SP.residue.label_seq_id(l);
        const chainId = SP.chain.label_asym_id(l);

        return `${atomName} (${resName}${resSeq}, Chain ${chainId})`;
      }

      return 'Selected element';
    } catch (error) {
      console.error('Error getting atom info:', error, loci);
      return 'Unknown';
    }
  };

  // Get position from any loci type (works for atoms, ions, bonds, etc.)
  const getLociPosition = (loci: any): [number, number, number] | null => {
    try {
      if (!loci || loci.kind === 'empty-loci') return null;

      // Handle element-loci (atoms, residues, ions, etc.)
      if (loci.kind === 'element-loci') {
        const { structure, elements } = loci;

        if (!structure || !elements || elements.length === 0) return null;

        // Get the first element from the loci.elements array
        const element = elements[0];

        // The unit is the Unit object itself (not an index)
        const unit = element.unit;

        // The indices is an OrderedSet - use OrderedSet module methods
        const { indices } = element;

        // Get first index from OrderedSet
        const elementIndex = unit.elements[OrderedSet.getAt(indices, 0)];

        if (!unit || elementIndex === undefined) {
          console.error('Invalid unit or elementIndex:', { unit, elementIndex });
          return null;
        }

        // Create a proper Vec3 and use conformation.position to fill it
        const pos = Vec3();
        unit.conformation.position(elementIndex, pos);

        console.log('Position extracted:', pos, 'for elementIndex:', elementIndex);

        return [pos[0], pos[1], pos[2]];
      }

      // Handle bond-loci
      if (loci.kind === 'bond-loci') {
        const { structure, bonds } = loci;
        if (!bonds || bonds.length === 0) return null;

        const bond = bonds[0];
        const unit = structure.units[bond.aUnit];
        const elementIndex = unit.elements[bond.aIndex];

        if (!unit || elementIndex === undefined) return null;

        const pos = Vec3();
        unit.conformation.position(elementIndex, pos);
        return [pos[0], pos[1], pos[2]];
      }

      return null;
    } catch (error) {
      console.error('Error getting loci position:', error, loci);
      return null;
    }
  };

  // Get color legend data based on selected color scheme
  const getColorLegend = () => {
    switch (selectedColorScheme) {
      case 'chain-id':
        // DYNAMIC: Show only chains present in the loaded structure
        if (!structureMetadata?.chains || structureMetadata.chains.length === 0) {
          return null; // No chains info available
        }

        // Use Molstar's actual palette system (same as ChainIdColorTheme)
        // This is the 'many-distinct' color list from Molstar
        const manyDistinctColors = [
          // dark-2
          Color(0x1b9e77), Color(0xd95f02), Color(0x7570b3), Color(0xe7298a), Color(0x66a61e), Color(0xe6ab02), Color(0xa6761d), Color(0x666666),
          // set-1
          Color(0xe41a1c), Color(0x377eb8), Color(0x4daf4a), Color(0x984ea3), Color(0xff7f00), Color(0xffff33), Color(0xa65628), Color(0xf781bf), Color(0x999999),
          // set-2
          Color(0x66c2a5), Color(0xfc8d62), Color(0x8da0cb), Color(0xe78ac3), Color(0xa6d854), Color(0xffd92f), Color(0xe5c494), Color(0xb3b3b3)
        ];

        const chains = structureMetadata.chains;
        const chainCount = chains.length;
        const palette = getPalette(chainCount, {
          palette: {
            name: 'colors',
            params: {
              list: {
                kind: 'set',
                colors: manyDistinctColors
              }
            }
          }
        }, {
          valueLabel: (i: number) => chains[i]
        });

        return structureMetadata.chains.map((chainId: string, index: number) => {
          const color = palette.color(index);
          return {
            label: `Chain ${chainId}`,
            color: Color.toHexStyle(color),
          };
        });
      case 'residue-name':
        // Jmol standard amino acid colors (from Molstar)
        return [
          { label: 'Hydrophobic', color: '#8CFF8C', description: 'ALA, ILE, LEU, VAL' },
          { label: 'Aromatic', color: '#534C52', description: 'PHE, TRP, TYR' },
          { label: 'Polar', color: '#FF7042', description: 'SER, THR, CYS, MET' },
          { label: 'Positive', color: '#4747B8', description: 'ARG, LYS, HIS' },
          { label: 'Negative', color: '#660000', description: 'ASP, GLU' },
          { label: 'Special', color: '#525252', description: 'GLY, PRO' },
        ];
      case 'secondary-structure':
        return [
          { label: 'α-Helix', color: '#FF00FF' }, // Magenta
          { label: 'β-Sheet', color: '#FFFF00' }, // Yellow
          { label: 'Coil/Loop', color: '#DCDCDC' }, // Light gray
        ];
      case 'hydrophobicity':
        // Red-Yellow-Green diverging scale from Molstar
        return [
          { label: 'Hydrophobic', color: Color.toHexStyle(Color(0xa50026)) }, // Deep red
          { label: 'Neutral', color: Color.toHexStyle(Color(0xffffbf)) }, // Yellow
          { label: 'Hydrophilic', color: Color.toHexStyle(Color(0x006837)) }, // Green
        ];
      case 'electrostatic':
        // Electrostatic coloring by charge
        return [
          { label: 'Positive (+)', color: '#4A90D9', description: 'Lys, Arg, His' },
          { label: 'Negative (-)', color: '#D94A4A', description: 'Asp, Glu' },
          { label: 'Neutral', color: '#F5F5F5', description: 'All others' },
        ];
      default:
        return null;
    }
  };

  // Take snapshot
  const takeSnapshot = async () => {
    if (!pluginRef.current?.canvas3d) return;

    try {
      // Find the canvas element in the viewer
      const canvasElement = viewerRef.current?.querySelector('canvas');
      if (!canvasElement) {
        showToast('error', 'Canvas not available');
        return;
      }

      // Convert canvas to blob and download
      (canvasElement as HTMLCanvasElement).toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentStructure?.name || 'structure'}_snapshot.png`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('success', 'Snapshot saved');
        }
      });
    } catch (error) {
      console.error('Failed to take snapshot:', error);
      showToast('error', 'Failed to save snapshot');
    }
  };

  // Export structure - NOW FULLY WORKING
  const exportStructure = async (format: 'pdb' | 'cif') => {
    if (!currentStructure) return;

    try {
      const filename = `${currentStructure.name.replace(/\.[^/.]+$/, '')}.${format === 'pdb' ? 'pdb' : 'cif'}`;

      if (currentStructure.data) {
        // Export the original file data
        const blob = new Blob([currentStructure.data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', `Exported to ${format.toUpperCase()}`);
      } else if (currentStructure.source === 'pdb' && currentStructure.pdbId) {
        // Download from PDB
        const pdbUrl = `https://files.rcsb.org/download/${currentStructure.pdbId}.${format === 'pdb' ? 'pdb' : 'cif'}`;
        const a = document.createElement('a');
        a.href = pdbUrl;
        a.download = filename;
        a.click();
        showToast('success', `Downloading ${format.toUpperCase()} from PDB...`);
      } else {
        showToast('error', 'No data available for export');
      }
    } catch (error) {
      console.error('Failed to export:', error);
      showToast('error', `Failed to export to ${format.toUpperCase()}`);
    }
  };

  // Delete saved structure
  const handleDeleteStructure = async (structureId: string) => {
    try {
      await deleteStructure(structureId);
      const structures = await getAllStructures();
      setSavedStructures(structures);

      if (currentStructure?.id === structureId) {
        setCurrentStructure(null);
        setProteinInfo(null);
        structureRef.current = null;
        if (pluginRef.current) {
          await pluginRef.current.clear();
        }
      }

      showToast('success', 'Structure deleted');
    } catch (error) {
      console.error('Failed to delete structure:', error);
      showToast('error', 'Failed to delete structure');
    }
  };

  // Load saved structure
  const handleLoadSavedStructure = async (structure: ProteinStructure) => {
    if (structure.source === 'pdb' && structure.pdbId) {
      // Don't save again - we're loading an existing saved structure
      await loadFromPDB(structure.pdbId, undefined, undefined, false);
    } else if (structure.data) {
      // Create a pseudo-file from saved data
      const blob = new Blob([structure.data], { type: 'text/plain' });
      const file = new File([blob], structure.name);
      // Don't save again - we're loading an existing saved structure
      await loadFromFile(file, undefined, undefined, false);
    }
    // Set the current structure to the one we just loaded
    setCurrentStructure(structure);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show overlay if we're allowed to (not during/after loading)
    if (allowDragOverlayRef.current) {
      setIsDraggingOver(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show overlay if we're allowed to (not during/after loading)
    if (allowDragOverlayRef.current) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Always clear on drag leave to be safe
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Immediately clear drag state and prevent it from being re-enabled
    setIsDraggingOver(false);
    allowDragOverlayRef.current = false;

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      showToast('error', 'No files found');
      return;
    }

    // Get the first file (we only support loading one structure at a time)
    const file = files[0];

    // Check file extension
    const validExtensions = ['.pdb', '.cif', '.mmcif'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      showToast('error', 'Invalid file format. Please use .pdb, .cif, or .mmcif files');
      return;
    }

    // Load the file (isLoading will be set to true, hiding the overlay)
    await loadFromFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <div>
              <h2 className="section-title mb-0">Protein Structure Viewer</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                3D molecular visualization powered by Mol*
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowControls(!showControls)}
            className="btn-secondary"
          >
            {showControls ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Controls */}
        {showControls && (
          <div className="space-y-4 mb-6">
            {/* PDB Search */}
            <div>
              <label className="label">Load from PDB</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pdbSearchQuery}
                  onChange={(e) => setPdbSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pdbSearchQuery.trim()) {
                      loadFromPDB(pdbSearchQuery.trim());
                    }
                  }}
                  placeholder="Enter PDB ID (e.g., 1CRN, 7BV2)"
                  className="input flex-1"
                  disabled={isLoading}
                />
                <button
                  onClick={() => pdbSearchQuery.trim() && loadFromPDB(pdbSearchQuery.trim())}
                  className="btn-primary"
                  disabled={!pdbSearchQuery.trim() || isLoading}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Load
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Examples: 1CRN (crambin), 1UBQ (ubiquitin), 7BV2 (spike protein)
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="label">Or Upload Structure File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdb,.cif,.mmcif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFromFile(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary w-full"
                disabled={isLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDB/CIF File
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                💡 Tip: You can also drag & drop files directly onto the viewer
              </p>
            </div>

            {/* Saved Structures */}
            {savedStructures.length > 0 && (
              <div>
                <button
                  onClick={() => setShowStructureList(!showStructureList)}
                  className="label flex items-center justify-between w-full cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Saved Structures ({savedStructures.length})
                  </span>
                  {showStructureList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showStructureList && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {savedStructures.map((structure) => (
                      <div
                        key={structure.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <button
                          onClick={() => handleLoadSavedStructure(structure)}
                          className="flex-1 text-left text-sm hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <div className="font-medium">{structure.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {structure.source === 'pdb' ? 'PDB' : 'File'} • {new Date(structure.uploadDate).toLocaleString()}
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteStructure(structure.id)}
                          className="btn-icon text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Viewer Container with Drag-and-Drop */}
        <div
          className="relative"
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div
            ref={viewerRef}
            className={`w-full h-[600px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 transition-all ${
              isDraggingOver
                ? 'border-primary-500 border-dashed border-4 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700'
            }`}
            style={{ position: 'relative', overflow: 'visible' }}
          />

          {/* Drag Overlay */}
          {isDraggingOver && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-500 bg-opacity-10 backdrop-blur-sm rounded-lg pointer-events-none">
              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-primary-600 dark:text-primary-400 animate-bounce" />
                <p className="text-xl font-semibold text-primary-700 dark:text-primary-300">
                  Drop structure file here
                </p>
                <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
                  Supports PDB, CIF, mmCIF formats
                </p>
              </div>
            </div>
          )}

          {/* Minimal Overlay Controls - Only Help button */}
          {isViewerReady && currentStructure && (
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowHelpModal(true)}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Help & Controls"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <div className="text-center text-white">
                <div className="spinner mb-4 mx-auto border-white"></div>
                <p>Loading structure...</p>
              </div>
            </div>
          )}

          {/* Visualization Update Indicator */}
          {isUpdatingVisualization && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none">
              <div className="text-center text-white">
                <div className="spinner mb-2 mx-auto border-white"></div>
                <p className="text-sm">Updating visualization...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !currentStructure && !isDraggingOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Microscope className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No structure loaded</p>
                <p className="text-sm mt-2">Search for a PDB ID, upload a file, or drag & drop here</p>
              </div>
            </div>
          )}
        </div>

        {/* Unified Toolbar - Consolidated Controls */}
        {currentStructure && (
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              {/* Representation Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Representation:
                </label>
                <select
                  value={selectedRepresentation}
                  onChange={(e) => handleRepresentationChange(e.target.value)}
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {representations.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Scheme Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Color:
                </label>
                <select
                  value={selectedColorScheme}
                  onChange={(e) => handleColorSchemeChange(e.target.value)}
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {colorSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vertical Separator */}
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />

              {/* Additional Components - Icon Toggles */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Components:
                </span>
                <div className="flex gap-1">
                  {/* Ligands Toggle */}
                  <button
                    onClick={() => {
                      setShowLigands(!showLigands);
                      setComponentsNeedUpdate(true);
                    }}
                    className={`p-2 rounded transition-colors ${
                      showLigands
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Ligands & Small Molecules"
                  >
                    <Hexagon className="w-4 h-4" />
                  </button>

                  {/* Ions Toggle */}
                  <button
                    onClick={() => {
                      setShowIons(!showIons);
                      setComponentsNeedUpdate(true);
                    }}
                    className={`p-2 rounded transition-colors ${
                      showIons
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Ions & Metal Centers"
                  >
                    <Atom className="w-4 h-4" />
                  </button>

                  {/* Water Toggle */}
                  <button
                    onClick={() => {
                      setShowWater(!showWater);
                      setComponentsNeedUpdate(true);
                    }}
                    className={`p-2 rounded transition-colors ${
                      showWater
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Water Molecules"
                  >
                    <Droplet className="w-4 h-4" />
                  </button>

                  {/* Separator */}
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

                  {/* Metal Coordination Highlighting Toggle */}
                  <button
                    onClick={toggleCoordinationHighlight}
                    className={`p-2 rounded transition-colors ${
                      showCoordinationHighlight
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title={`Metal Coordination Analysis (within ${coordinationRadius}Å)`}
                  >
                    <Target className="w-4 h-4" />
                  </button>

                  {/* Ligand Analysis Toggle */}
                  <button
                    onClick={toggleLigandAnalysis}
                    className={`p-2 rounded transition-colors ${
                      showLigandAnalysis
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title={`Ligand Binding Analysis (within ${ligandRadius}Å)`}
                  >
                    <Pill className="w-4 h-4" />
                  </button>

                  {/* Custom Residue Highlighting Toggle */}
                  <button
                    onClick={toggleResidueHighlight}
                    className={`p-2 rounded transition-colors ${
                      showResidueHighlight
                        ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 ring-2 ring-pink-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title="Custom Residue Highlighting"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />

              {/* Tools Section */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tools:
                </span>
                <div className="flex gap-1">
                  {/* Measurement Tool */}
                  <button
                    onClick={toggleMeasurement}
                    className={`p-2 rounded transition-colors relative ${
                      measurementMode
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title={measurementMode ? `Measurement mode (${selectedLoci.length}/2 atoms)` : 'Distance Measurement'}
                  >
                    <Ruler className="w-4 h-4" />
                    {measurementMode && selectedLoci.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {selectedLoci.length}
                      </span>
                    )}
                  </button>

                  {/* Reset Camera */}
                  <button
                    onClick={resetCamera}
                    className="p-2 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                    title="Reset Camera"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Focus on Structure */}
                  <button
                    onClick={focusOnStructure}
                    className="p-2 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                    title="Focus on Structure"
                  >
                    <Focus className="w-4 h-4" />
                  </button>

                  {/* Take Snapshot */}
                  <button
                    onClick={takeSnapshot}
                    className="p-2 rounded transition-colors bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                    title="Take Snapshot"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  {/* Structure Info Toggle */}
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className={`p-2 rounded transition-colors ${
                      showInfo
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    title="Structure Info Panel"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Color Legend - Horizontal Pills/Tags Layout */}
        {currentStructure && selectedColorScheme !== 'uniform' && getColorLegend() && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Color Legend
                {selectedColorScheme === 'chain-id' && structureMetadata?.chains && (
                  <span className="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400">
                    ({structureMetadata.chains.length} {structureMetadata.chains.length === 1 ? 'chain' : 'chains'})
                  </span>
                )}
              </span>
            </div>
            {/* Horizontal Pill Layout */}
            <div className="flex flex-wrap gap-2">
              {getColorLegend()!.map((item, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600"
                >
                  <div
                    className="w-3 h-3 rounded-full border border-slate-400 dark:border-slate-500 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{item.label}</span>
                    {(item as any).description && (
                      <span className="text-[9px] text-slate-500 dark:text-slate-400">
                        {(item as any).description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sequence Analysis - Full Width Below Grid */}
        {currentStructure && structureMetadata?.sequences && Object.keys(structureMetadata.sequences).length > 0 && (() => {
          try {
            // Check if all chain sequences are identical
            const sequences = structureMetadata.sequences || {};
            const uniqueSeqs = new Set(Object.values(sequences));
            const allIdentical = uniqueSeqs.size === 1;
            const chainCount = structureMetadata.chains?.length || 0;
            const allChains = structureMetadata.chains?.join(', ') || '';

            // Use selected chain or first chain
            const chainToAnalyze = selectedAnalysisChain || structureMetadata.chains?.[0] || '';
            const seq = sequences[chainToAnalyze] || '';

            if (!seq) return null; // No sequence available

            const analysis = analyzeProtein(seq);

            // Determine structure type for display
            let structureTypeLabel = '';
            if (chainCount === 1) {
              structureTypeLabel = `Chain ${allChains}`;
            } else if (allIdentical) {
              structureTypeLabel = `Homomer: ${chainCount} identical chains (${allChains})`;
            } else {
              structureTypeLabel = `Heteromer: ${chainCount} chains with different sequences`;
            }

            return (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <button
                  onClick={() => setShowProteinAnalysis(!showProteinAnalysis)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Sequence Analysis
                    <span className="text-xs font-normal text-blue-600 dark:text-blue-400">
                      {structureTypeLabel}
                    </span>
                  </span>
                  {showProteinAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showProteinAnalysis && (
                  <div className="mt-3 space-y-3">
                    {/* Chain selector for multiple chains */}
                    {chainCount > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-blue-900 dark:text-blue-200">
                          Analyzing Chain:
                        </label>
                        <select
                          value={chainToAnalyze}
                          onChange={(e) => setSelectedAnalysisChain(e.target.value)}
                          className="text-xs border border-blue-300 dark:border-blue-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100"
                        >
                          {structureMetadata.chains?.map((chain) => (
                            <option key={chain} value={chain}>
                              Chain {chain} ({sequences[chain]?.length || 0} aa)
                            </option>
                          ))}
                        </select>
                        {allIdentical && (
                          <span className="text-[10px] text-green-600 dark:text-green-400">
                            (All chains identical)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Info banner for heteromers */}
                    {!allIdentical && chainCount > 1 && (
                      <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded border border-blue-300 dark:border-blue-600">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          <Info className="w-3 h-3 inline mr-1" />
                          <strong>Heteromer:</strong> This structure contains {chainCount} chains with different sequences.
                          Use the selector above to analyze different chains. Export FASTA to see all sequences.
                        </p>
                      </div>
                    )}

                    {/* Homomer info banner */}
                    {allIdentical && chainCount > 1 && (
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
                        <p className="text-xs text-green-800 dark:text-green-200">
                          <Info className="w-3 h-3 inline mr-1" />
                          <strong>Homomer:</strong> All {chainCount} chains have identical sequences. Analysis applies to all chains.
                        </p>
                      </div>
                    )}

                    {/* Key Properties - Highlighted */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-600">
                      <div className="text-center">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Length</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analysis.length}</div>
                        <div className="text-[9px] text-blue-500 dark:text-blue-400">amino acids</div>
                      </div>
                      <div className="text-center border-l border-blue-200 dark:border-blue-600">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Molecular Weight</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{(analysis.molecularWeight / 1000).toFixed(2)}</div>
                        <div className="text-[9px] text-blue-500 dark:text-blue-400">kDa</div>
                      </div>
                      <div className="text-center border-l border-blue-200 dark:border-blue-600">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Isoelectric Point</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analysis.theoreticalPI.toFixed(2)}</div>
                        <div className="text-[9px] text-blue-500 dark:text-blue-400">pH units</div>
                      </div>
                      <div className="text-center border-l border-blue-200 dark:border-blue-600">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Aromaticity</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{(analysis.aromaticity * 100).toFixed(1)}%</div>
                        <div className="text-[9px] text-blue-500 dark:text-blue-400">Phe, Trp, Tyr</div>
                      </div>
                    </div>

                    {/* Physicochemical Properties with Visual Gauges */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Physicochemical Properties
                      </h4>
                      <div className="space-y-3">
                        {/* GRAVY */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">GRAVY (Hydrophobicity)</span>
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{analysis.gravy.toFixed(3)}</span>
                          </div>
                          <div className="text-[9px] text-blue-600 dark:text-blue-400 mb-1">
                            {analysis.gravy < 0 ? 'Hydrophilic (negative values)' : 'Hydrophobic (positive values)'}
                          </div>
                        </div>

                        {/* Aliphatic Index with Gauge */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Aliphatic Index</span>
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{analysis.aliphaticIndex.toFixed(2)}</span>
                          </div>
                          <div className="relative h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className="absolute h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (analysis.aliphaticIndex / 120) * 100)}%`,
                                background: analysis.aliphaticIndex > 100 ? '#10b981' :
                                           analysis.aliphaticIndex > 80 ? '#3b82f6' :
                                           analysis.aliphaticIndex > 60 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-blue-600 dark:text-blue-400 mt-1">
                            <span>Low (0)</span>
                            <span className="font-medium">
                              {analysis.aliphaticIndex > 100 ? 'High thermostability' :
                               analysis.aliphaticIndex > 80 ? 'Good thermostability' :
                               analysis.aliphaticIndex > 60 ? 'Moderate' : 'Low'}
                            </span>
                            <span>High (120+)</span>
                          </div>
                        </div>

                        {/* Instability Index with Gauge */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Instability Index</span>
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{analysis.instabilityIndex.toFixed(2)}</span>
                          </div>
                          <div className="relative h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className="absolute h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (analysis.instabilityIndex / 80) * 100)}%`,
                                background: analysis.instabilityIndex < 40 ? '#10b981' : '#ef4444'
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-blue-600 dark:text-blue-400 mt-1">
                            <span>Stable (0)</span>
                            <span className="font-medium">
                              {analysis.instabilityIndex > 40 ? 'Unstable in vitro' : 'Stable in vitro'}
                            </span>
                            <span>Unstable (80+)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amino Acid Composition - Grouped by Property */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Amino Acid Composition (Grouped by Property)
                      </h4>
                      <div className="space-y-2">
                        {(() => {
                          // Group amino acids by property type
                          const groups = {
                            'Hydrophobic': { aas: ['A', 'I', 'L', 'V'], color: '#8CFF8C' },
                            'Aromatic': { aas: ['F', 'W', 'Y'], color: '#534C52' },
                            'Polar': { aas: ['S', 'T', 'C', 'M', 'N', 'Q'], color: '#FF7042' },
                            'Positive': { aas: ['R', 'K', 'H'], color: '#4747B8' },
                            'Negative': { aas: ['D', 'E'], color: '#660000' },
                            'Special': { aas: ['G', 'P'], color: '#525252' }
                          };

                          return Object.entries(groups).map(([groupName, { aas, color }]) => (
                            <div key={groupName}>
                              <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                {groupName}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {aas.map(aa => {
                                  const percent = analysis.aminoAcidPercent[aa] || 0;
                                  return (
                                    <div
                                      key={aa}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded"
                                      style={{ backgroundColor: color + '40' }}
                                      title={`${aa}: ${percent.toFixed(1)}%`}
                                    >
                                      <span className="font-bold text-xs font-mono" style={{ color }}>{aa}</span>
                                      <span className="text-[10px] text-slate-700 dark:text-slate-300">{percent.toFixed(1)}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Sequence with Color Coding and Ruler */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1 flex items-center justify-between">
                        <span>
                          {chainCount === 1 ? (
                            `Sequence ({seq.length} aa)`
                          ) : allIdentical ? (
                            <>
                              Sequence ({seq.length} aa)
                              <span className="ml-2 text-[10px] font-normal text-green-600 dark:text-green-400">
                                — Same for all {chainCount} chains
                              </span>
                            </>
                          ) : (
                            <>
                              Chain {chainToAnalyze} Sequence ({seq.length} aa)
                            </>
                          )}
                        </span>
                      </h4>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700 max-h-40 overflow-y-auto">
                        {/* Sequence with color coding */}
                        <div className="font-mono text-xs leading-relaxed">
                          {seq.split('').map((aa, index) => {
                            // Get color based on residue type (Jmol colors)
                            const getAAColor = (residue: string) => {
                              const colors: Record<string, string> = {
                                // Hydrophobic
                                'A': '#8CFF8C', 'I': '#8CFF8C', 'L': '#8CFF8C', 'V': '#8CFF8C',
                                // Aromatic
                                'F': '#534C52', 'W': '#534C52', 'Y': '#534C52',
                                // Polar
                                'S': '#FF7042', 'T': '#FF7042', 'C': '#FF7042', 'M': '#FF7042', 'N': '#FF7042', 'Q': '#FF7042',
                                // Positive
                                'R': '#4747B8', 'K': '#4747B8', 'H': '#4747B8',
                                // Negative
                                'D': '#660000', 'E': '#660000',
                                // Special
                                'G': '#525252', 'P': '#525252'
                              };
                              return colors[residue] || '#888888';
                            };

                            const color = getAAColor(aa);
                            const position = index + 1;

                            return (
                              <span
                                key={index}
                                className="inline-block cursor-default transition-all hover:scale-125 hover:font-bold"
                                style={{ color }}
                                title={`${aa}${position}`}
                              >
                                {aa}
                                {/* Add ruler markers every 10 residues */}
                                {position % 10 === 0 && (
                                  <span className="relative">
                                    <span className="absolute -top-3 -left-2 text-[8px] text-blue-500 dark:text-blue-400 font-sans">
                                      {position}
                                    </span>
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-600">
                          <div className="text-[9px] text-blue-600 dark:text-blue-400 space-x-3">
                            <span><span style={{ color: '#8CFF8C' }}>●</span> Hydrophobic</span>
                            <span><span style={{ color: '#534C52' }}>●</span> Aromatic</span>
                            <span><span style={{ color: '#FF7042' }}>●</span> Polar</span>
                            <span><span style={{ color: '#4747B8' }}>●</span> Positive</span>
                            <span><span style={{ color: '#660000' }}>●</span> Negative</span>
                            <span><span style={{ color: '#525252' }}>●</span> Special</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          } catch (err) {
            console.error('Error rendering protein analysis:', err);
            return null;
          }
        })()}

        {/* Structure Info Panel */}
        {showInfo && proteinInfo && currentStructure && (
          <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <h3 className="font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Structure Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {proteinInfo.title && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Title:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{proteinInfo.title}</p>
                </div>
              )}
              {proteinInfo.experimentalMethod && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Method:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{proteinInfo.experimentalMethod}</p>
                </div>
              )}
              {proteinInfo.resolution && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Resolution:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{proteinInfo.resolution.toFixed(2)} Å</p>
                </div>
              )}
              {proteinInfo.organism && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Organism:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{proteinInfo.organism}</p>
                </div>
              )}
              {proteinInfo.depositionDate && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Deposition:</span>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(proteinInfo.depositionDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Options */}
        {currentStructure && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="label mb-0">Export Options</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => exportStructure('pdb')} className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Export PDB
              </button>
              <button onClick={() => exportStructure('cif')} className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Export mmCIF
              </button>
              <button onClick={exportFASTA} className="btn-secondary" disabled={!structureMetadata?.sequences}>
                <Download className="w-4 h-4 mr-2" />
                Export FASTA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metal Coordination Analysis Panel - Persistent section below viewer */}
      {showCoordinationHighlight && coordinationData && (
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-700 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Metal Coordination Analysis
              </h3>
              {/* Radius Adjuster */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs text-slate-500 dark:text-slate-400">Radius:</span>
                <input
                  type="range"
                  min="2.0"
                  max="5.0"
                  step="0.1"
                  value={coordinationRadius}
                  onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  title={`Coordination radius: ${coordinationRadius}Å`}
                />
                <span className="text-sm font-mono text-amber-700 dark:text-amber-300 min-w-[3rem]">
                  {coordinationRadius.toFixed(1)}Å
                </span>
                {/* Help tooltip for coordination radius */}
                <div className="group relative">
                  <button
                    className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center justify-center text-[10px] font-bold"
                    title="Typical metal-ligand distances"
                  >
                    ?
                  </button>
                  {/* Tooltip content */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="font-semibold mb-2 text-amber-400">Typical Metal-Ligand Distances</div>
                    <table className="w-full text-[10px]">
                      <tbody>
                        <tr className="border-b border-slate-700">
                          <td className="py-1 text-slate-300">Alkali (Na⁺, K⁺)</td>
                          <td className="py-1 text-right font-mono">2.3-2.8 Å</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="py-1 text-slate-300">Alkaline earth (Mg²⁺, Ca²⁺)</td>
                          <td className="py-1 text-right font-mono">2.0-2.5 Å</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="py-1 text-slate-300">1st row TM (Fe, Cu, Zn)</td>
                          <td className="py-1 text-right font-mono">1.9-2.3 Å</td>
                        </tr>
                        <tr className="border-b border-slate-700">
                          <td className="py-1 text-slate-300">Lanthanides (La-Lu)</td>
                          <td className="py-1 text-right font-mono">2.3-2.6 Å</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-300">Heavy metals (Pb, Hg)</td>
                          <td className="py-1 text-right font-mono">2.3-2.8 Å</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-2 pt-2 border-t border-slate-700 text-[9px] text-slate-400">
                      Ref: CRC Handbook; Shannon ionic radii (1976)
                    </div>
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 dark:bg-slate-900 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Summary badges */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 rounded">
                <Atom className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {coordinationData.metals.length} Metal{coordinationData.metals.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded">
                <Hexagon className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {coordinationData.totalResidues} Residue{coordinationData.totalResidues !== 1 ? 's' : ''}
                </span>
              </div>
              {coordinationData.totalWaters > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/40 rounded">
                  <Droplet className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="font-medium text-cyan-700 dark:text-cyan-300">
                    {coordinationData.totalWaters} Water{coordinationData.totalWaters !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content - Scrollable with max height */}
          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-3 space-y-3">
              {coordinationData.metals.map((metal, metalIdx) => (
                <div key={metalIdx} className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                  {/* Metal Header with Geometry Info */}
                  <div className={`px-3 py-2 ${
                    metal.bindingSiteType === 'crystal_artifact'
                      ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400'
                      : metal.bindingSiteType === 'uncertain'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400'
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs">
                          {metal.element}
                        </span>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                          {metal.info}
                        </span>
                        {/* Binding Site Classification Badge */}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          metal.bindingSiteType === 'functional'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : metal.bindingSiteType === 'crystal_artifact'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                        }`} title={metal.bindingSiteReason}>
                          {metal.bindingSiteType === 'functional' ? '✓ Functional' :
                           metal.bindingSiteType === 'crystal_artifact' ? (
                             <><AlertTriangle className="w-3 h-3" /> Crystal Artifact</>
                           ) : (
                             <><AlertTriangle className="w-3 h-3" /> Uncertain</>
                           )}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {metal.coordinating.length} atom{metal.coordinating.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Geometry Analysis Section */}
                    {metal.geometry && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Coordination Number */}
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/40 rounded text-purple-700 dark:text-purple-300 font-medium">
                            CN: {metal.geometry.coordinationNumber}
                          </span>

                          {/* Geometry Type */}
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 rounded text-indigo-700 dark:text-indigo-300 font-medium">
                            {metal.geometry.geometryType}
                          </span>

                          {/* Distortion Level */}
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-medium ${
                            metal.geometry.distortion === 'ideal' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                            metal.geometry.distortion === 'low' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                            metal.geometry.distortion === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                            metal.geometry.distortion === 'high' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
                            'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                          }`}>
                            {metal.geometry.distortion === 'ideal' ? '✓ Ideal' :
                             metal.geometry.distortion === 'low' ? '○ Low distortion' :
                             metal.geometry.distortion === 'moderate' ? '△ Moderate' :
                             metal.geometry.distortion === 'high' ? '▲ High distortion' :
                             '⚠ Severe distortion'}
                          </span>

                          {/* CShM (Continuous Shape Measure) */}
                          {metal.geometry.rmsd > 0 && (
                            <span className="text-slate-500 dark:text-slate-400">
                              CShM: {metal.geometry.rmsd.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* L-M-L Angles (expandable) */}
                        {metal.geometry.angles.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                              View L-M-L angles ({metal.geometry.angles.length})
                            </summary>
                            <div className="mt-1 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 max-h-32 overflow-y-auto">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px]">
                                {metal.geometry.angles.map((angle, angleIdx) => (
                                  <div key={angleIdx} className="flex justify-between gap-1 px-1 py-0.5 bg-slate-50 dark:bg-slate-700/50 rounded">
                                    <span className="text-slate-600 dark:text-slate-400 truncate" title={`${angle.atom1} - M - ${angle.atom2}`}>
                                      {angle.atom1.split('(')[0]}-M-{angle.atom2.split('(')[0]}
                                    </span>
                                    <span className="font-mono text-slate-800 dark:text-slate-200">
                                      {angle.angle.toFixed(1)}°
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Hydration Analysis Section */}
                    {metal.hydrationAnalysis && (
                      <div className="mt-2 pt-2 border-t border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center gap-2 mb-1">
                          <Droplet className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Hydration Analysis</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Hydration State Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-medium ${
                            metal.hydrationAnalysis.hydrationState === 'fully_hydrated'
                              ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                              : metal.hydrationAnalysis.hydrationState === 'dehydrated'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                              : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                          }`}>
                            {metal.hydrationAnalysis.hydrationState === 'fully_hydrated' ? (
                              <><Droplet className="w-3 h-3" /> Fully Hydrated</>
                            ) : metal.hydrationAnalysis.hydrationState === 'dehydrated' ? (
                              <>○ Dehydrated</>
                            ) : (
                              <><Droplet className="w-3 h-3" /> Partial</>
                            )}
                          </span>

                          {/* Water Count */}
                          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                            {metal.hydrationAnalysis.waterCount} H₂O
                          </span>

                          {/* Protein Ligands */}
                          <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-300">
                            {metal.hydrationAnalysis.proteinLigandCount} protein
                          </span>

                          {/* Water Displacement */}
                          {metal.hydrationAnalysis.waterDisplacement > 0 && (
                            <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300">
                              {metal.hydrationAnalysis.waterDisplacement}% displaced
                            </span>
                          )}

                          {/* Expected vs Actual */}
                          <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                            (expected CN: {metal.hydrationAnalysis.expectedHydration})
                          </span>
                        </div>

                        {/* Hydration Note */}
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 italic">
                          {metal.hydrationAnalysis.hydrationNote}
                        </p>
                      </div>
                    )}

                    {/* Shell Analysis Section */}
                    {metal.shellAnalysis && (
                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Shell Analysis</span>
                        </div>

                        {/* Primary Shell (1st Coordination Sphere) */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Target className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Primary Shell (1st Sphere)</span>
                            <span className="text-[10px] text-slate-500">— Direct ligands</span>
                          </div>

                          {/* Ligand Types */}
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {metal.shellAnalysis.primaryShell.ligandTypes.map((lt, ltIdx) => (
                              <span
                                key={ltIdx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                  lt.type === 'Water'
                                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                                    : lt.type.includes('Carboxylate')
                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                    : lt.type.includes('Imidazole')
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                    : lt.type.includes('Thiolate')
                                    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                                    : lt.type.includes('Amide') || lt.type.includes('Backbone')
                                    ? 'bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300'
                                    : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                }`}
                                title={lt.residues.join(', ')}
                              >
                                {lt.type}: {lt.count}
                              </span>
                            ))}
                          </div>

                          {/* Primary Shell Stats */}
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <span className="text-slate-600 dark:text-slate-400">
                              Total: <span className="font-medium text-slate-700 dark:text-slate-300">{metal.shellAnalysis.primaryShell.totalLigands}</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              Protein: <span className="font-medium text-purple-600 dark:text-purple-400">{metal.shellAnalysis.primaryShell.proteinLigands}</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              Water: <span className="font-medium text-cyan-600 dark:text-cyan-400">{metal.shellAnalysis.primaryShell.waterLigands}</span>
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              Avg dist: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{metal.shellAnalysis.primaryShell.avgDistance.toFixed(2)}Å</span>
                            </span>
                          </div>
                        </div>

                        {/* Secondary Shell (2nd Coordination Sphere) */}
                        {metal.shellAnalysis.secondaryShell.residues.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Shield className="w-3 h-3 text-green-500" />
                              <span className="text-[10px] font-semibold text-green-700 dark:text-green-300">Secondary Shell (2nd Sphere)</span>
                              <span className="text-[10px] text-slate-500">— H-bond network</span>
                            </div>

                            {/* Secondary Shell Summary */}
                            <div className="flex flex-wrap gap-2 text-[10px] mb-1">
                              <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300">
                                {metal.shellAnalysis.secondaryShell.totalResidues} residues
                              </span>
                              {metal.shellAnalysis.secondaryShell.chargedResidues > 0 && (
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                                  {metal.shellAnalysis.secondaryShell.chargedResidues} charged
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 rounded text-amber-700 dark:text-amber-300">
                                {metal.shellAnalysis.secondaryShell.hBondNetwork} H-bonds
                              </span>
                              {metal.shellAnalysis.secondaryShell.waterBridges > 0 && (
                                <span className="px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 rounded text-cyan-700 dark:text-cyan-300">
                                  {metal.shellAnalysis.secondaryShell.waterBridges} water bridges
                                </span>
                              )}
                            </div>

                            {/* Secondary Shell Residues Table */}
                            <div className="max-h-24 overflow-y-auto">
                              <div className="flex flex-wrap gap-1">
                                {metal.shellAnalysis.secondaryShell.residues.slice(0, 8).map((res, resIdx) => (
                                  <span
                                    key={resIdx}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] ${
                                      res.role.includes('charge')
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : res.role.includes('polar')
                                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                        : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400'
                                    }`}
                                    title={`${res.role} | ${res.hBondCount} H-bonds | ${res.distance.toFixed(1)}Å from metal`}
                                  >
                                    {res.residue}:{res.chain}
                                  </span>
                                ))}
                                {metal.shellAnalysis.secondaryShell.residues.length > 8 && (
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5">
                                    +{metal.shellAnalysis.secondaryShell.residues.length - 8} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Site Characteristics */}
                        <div className="mb-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Activity className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-300">Site Characteristics</span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {/* Net Charge */}
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              metal.shellAnalysis.siteCharacteristics.netCharge > 0
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : metal.shellAnalysis.siteCharacteristics.netCharge < 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400'
                            }`}>
                              Charge: {metal.shellAnalysis.siteCharacteristics.netCharge > 0 ? '+' : ''}{metal.shellAnalysis.siteCharacteristics.netCharge}
                            </span>

                            {/* Burial Depth */}
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              metal.shellAnalysis.siteCharacteristics.burialDepth === 'deep'
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                : metal.shellAnalysis.siteCharacteristics.burialDepth === 'buried'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : metal.shellAnalysis.siteCharacteristics.burialDepth === 'shallow'
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                            }`}>
                              {metal.shellAnalysis.siteCharacteristics.burialDepth.charAt(0).toUpperCase() + metal.shellAnalysis.siteCharacteristics.burialDepth.slice(1)}
                            </span>

                            {/* Shell Completeness */}
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              metal.shellAnalysis.siteCharacteristics.shellCompleteness >= 80
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : metal.shellAnalysis.siteCharacteristics.shellCompleteness >= 50
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {metal.shellAnalysis.siteCharacteristics.shellCompleteness}% complete
                            </span>

                            {/* Stability Score */}
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              metal.shellAnalysis.siteCharacteristics.stabilityScore === 'very_strong'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : metal.shellAnalysis.siteCharacteristics.stabilityScore === 'strong'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : metal.shellAnalysis.siteCharacteristics.stabilityScore === 'moderate'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                              {metal.shellAnalysis.siteCharacteristics.stabilityScore.replace('_', ' ')} stability
                            </span>
                          </div>
                        </div>

                        {/* Engineering Notes */}
                        {metal.shellAnalysis.engineeringNotes.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-purple-100 dark:border-purple-800/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Lightbulb className="w-3 h-3 text-yellow-500" />
                              <span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-300">Engineering Insights</span>
                            </div>
                            <ul className="space-y-0.5">
                              {metal.shellAnalysis.engineeringNotes.map((note, noteIdx) => (
                                <li key={noteIdx} className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coordinating Atoms Table - Compact */}
                  {metal.coordinating.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                            <th className="px-3 py-1.5 text-left font-medium">Atom</th>
                            <th className="px-3 py-1.5 text-left font-medium">Residue</th>
                            <th className="px-3 py-1.5 text-left font-medium">Chain</th>
                            <th className="px-3 py-1.5 text-right font-medium">Distance (Å)</th>
                            <th className="px-3 py-1.5 text-center font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metal.coordinating.map((coord, coordIdx) => (
                            <tr
                              key={coordIdx}
                              className={`border-t border-slate-100 dark:border-slate-700 ${
                                coord.isWater
                                  ? 'bg-cyan-50 dark:bg-cyan-900/10'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                              }`}
                            >
                              <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                                {coord.atom}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">
                                {coord.residue}
                              </td>
                              <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">
                                {coord.chain}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                {coord.distance.toFixed(2)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {coord.isWater ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-[10px]">
                                    <Droplet className="w-2.5 h-2.5" />
                                    H₂O
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">
                                    <Hexagon className="w-2.5 h-2.5" />
                                    Res
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs italic">
                      No coordinating atoms found within {coordinationRadius}Å
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              💡 Click the <Target className="w-3 h-3 inline text-amber-600" /> button to hide this panel • Typical metal-ligand bonds: 1.8-2.8Å
            </span>
          </div>
        </div>
      )}

      {/* Ligand Binding Analysis Panel - Persistent section below viewer */}
      {showLigandAnalysis && ligandData && (
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg border border-purple-300 dark:border-purple-700 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-purple-800 dark:text-purple-200">
                Ligand Binding Analysis
              </h3>
              {/* Radius Adjuster */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs text-slate-500 dark:text-slate-400">Radius:</span>
                <input
                  type="range"
                  min="2.5"
                  max="6"
                  step="0.1"
                  value={ligandRadius}
                  onChange={(e) => {
                    const newRadius = parseFloat(e.target.value);
                    setLigandRadius(newRadius);
                    if (structureRef.current) {
                      analyzeLigands(structureRef.current);
                    }
                  }}
                  className="w-16 h-1.5 accent-purple-600"
                />
                <span className="text-xs font-mono text-purple-600 dark:text-purple-400 w-10">
                  {ligandRadius.toFixed(1)}Å
                </span>
                {/* Help tooltip */}
                <div className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-purple-500 cursor-help" />
                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-white dark:bg-slate-800 rounded shadow-lg border border-slate-200 dark:border-slate-700 text-xs z-50">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Typical contact distances:</p>
                    <ul className="space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>• H-bonds: 2.5-3.5 Å</li>
                      <li>• Salt bridges: 2.8-4.0 Å</li>
                      <li>• Hydrophobic: 3.5-4.5 Å</li>
                      <li>• π-stacking: 3.3-4.0 Å</li>
                    </ul>
                    <p className="text-slate-500 dark:text-slate-500 mt-1 text-[10px] italic">
                      Default 4.0Å captures most interactions
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {ligandData.totalLigands} ligand{ligandData.totalLigands !== 1 ? 's' : ''} found
              </span>
              <button
                onClick={toggleLigandAnalysis}
                className="p-1 rounded text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30"
                title="Close ligand analysis"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Ligand List */}
          <div className="max-h-64 overflow-y-auto">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {ligandData.ligands.map((ligand, idx) => (
                <div key={idx} className="p-3">
                  {/* Ligand Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {ligand.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {ligand.info}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {ligand.atoms} atoms
                      </span>
                    </div>
                    {/* Binding Site Classification Badge */}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      ligand.bindingSiteType === 'functional'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : ligand.bindingSiteType === 'crystal_artifact'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                    }`} title={ligand.bindingSiteReason}>
                      {ligand.bindingSiteType === 'functional' ? '✓ Functional' :
                       ligand.bindingSiteType === 'crystal_artifact' ? (
                         <><AlertTriangle className="w-3 h-3" /> Crystal Artifact</>
                       ) : (
                         <><AlertTriangle className="w-3 h-3" /> Uncertain</>
                       )}
                    </span>
                  </div>

                  {/* Contact Summary */}
                  <div className="flex items-center gap-3 mb-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      {ligand.proteinContactCount} protein contacts
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
                      {ligand.waterContactCount} water contacts
                    </span>
                    {/* Interaction type summary */}
                    {ligand.contacts.length > 0 && (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400">
                          {ligand.contacts.filter(c => c.interactionType === 'hydrogen_bond').length} H-bonds
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                          {ligand.contacts.filter(c => c.interactionType === 'salt_bridge').length} salt bridges
                        </span>
                      </>
                    )}
                  </div>

                  {/* Binding Site Reason */}
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mb-2">
                    {ligand.bindingSiteReason}
                  </p>

                  {/* Contacts Table */}
                  {ligand.contacts.length > 0 ? (
                    <details className="group">
                      <summary className="text-xs text-purple-600 dark:text-purple-400 cursor-pointer hover:text-purple-700 dark:hover:text-purple-300 mb-1">
                        Show {ligand.contacts.length} contact{ligand.contacts.length !== 1 ? 's' : ''}
                      </summary>
                      <div className="overflow-x-auto mt-1">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                              <th className="px-2 py-1 text-left font-medium">Residue</th>
                              <th className="px-2 py-1 text-left font-medium">Chain</th>
                              <th className="px-2 py-1 text-left font-medium">Atom</th>
                              <th className="px-2 py-1 text-right font-medium">Dist (Å)</th>
                              <th className="px-2 py-1 text-center font-medium">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ligand.contacts.slice(0, 10).map((contact, contactIdx) => (
                              <tr
                                key={contactIdx}
                                className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                              >
                                <td className="px-2 py-1 text-slate-700 dark:text-slate-300">
                                  {contact.residue}
                                </td>
                                <td className="px-2 py-1 text-slate-500 dark:text-slate-400">
                                  {contact.chain}
                                </td>
                                <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-300">
                                  {contact.atom}
                                </td>
                                <td className="px-2 py-1 text-right font-mono text-slate-700 dark:text-slate-300">
                                  {contact.distance.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                    contact.interactionType === 'hydrogen_bond'
                                      ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                                      : contact.interactionType === 'salt_bridge'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                      : contact.interactionType === 'hydrophobic'
                                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                      : contact.interactionType === 'pi_stacking'
                                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                  }`}>
                                    {contact.interactionType === 'hydrogen_bond' ? 'H-bond' :
                                     contact.interactionType === 'salt_bridge' ? 'Salt' :
                                     contact.interactionType === 'hydrophobic' ? 'Hydro' :
                                     contact.interactionType === 'pi_stacking' ? 'π-stack' : 'Other'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {ligand.contacts.length > 10 && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-2">
                            ... and {ligand.contacts.length - 10} more contacts
                          </p>
                        )}
                      </div>
                    </details>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No protein contacts within {ligandRadius}Å
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              💡 Click the <Pill className="w-3 h-3 inline text-purple-600" /> button to hide this panel •
              <span className="text-green-600 dark:text-green-400"> ✓ Functional</span> = likely biological binding site,
              <span className="text-red-600 dark:text-red-400"> ⚠ Crystal Artifact</span> = likely crystallization additive
            </span>
          </div>
        </div>
      )}

      {/* Custom Residue Highlighting Panel */}
      {showResidueHighlight && (
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg border border-pink-300 dark:border-pink-700 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-pink-50 dark:bg-pink-900/20 border-b border-pink-200 dark:border-pink-800">
            <div className="flex items-center gap-3">
              <Highlighter className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h3 className="font-semibold text-pink-800 dark:text-pink-200">
                Residue Highlighting
              </h3>
              {/* Color Mode Toggle */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => setUseCustomColor(false)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    !useCustomColor
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  title="Use category-based colors (different shades for each amino acid)"
                >
                  Category Colors
                </button>
                <button
                  onClick={() => setUseCustomColor(true)}
                  className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                    useCustomColor
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  title="Use single custom color for all selected residues"
                >
                  Custom
                  {useCustomColor && (
                    <input
                      type="color"
                      value={highlightColor}
                      onChange={(e) => { e.stopPropagation(); setHighlightColor(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded cursor-pointer border-0"
                      title="Pick custom color"
                    />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedResidueTypes.length} selected
              </span>
              <button
                onClick={() => setSelectedResidueTypes([])}
                className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                title="Clear selection"
              >
                Clear
              </button>
              <button
                onClick={toggleResidueHighlight}
                className="p-1 rounded text-pink-600 hover:bg-pink-100 dark:text-pink-400 dark:hover:bg-pink-900/30"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Category Selection */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Quick Select:</span>
              {RESIDUE_CATEGORIES.map(category => {
                const allSelected = category.residues.every(r => selectedResidueTypes.includes(r));
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.residues)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      allSelected
                        ? 'ring-2 ring-offset-1 dark:ring-offset-slate-800'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: allSelected ? category.color : `${category.color}40`,
                      color: allSelected ? 'white' : category.color,
                      borderColor: category.color,
                    }}
                    title={`${category.residues.join(', ')}`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Amino Acid Selection */}
          <div className="p-4">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
              {AMINO_ACIDS.map(aa => {
                const isSelected = selectedResidueTypes.includes(aa.code);
                // Use individual amino acid color or custom color based on mode
                const displayColor = useCustomColor ? highlightColor : aa.color;
                return (
                  <button
                    key={aa.code}
                    onClick={() => handleResidueTypeToggle(aa.code)}
                    className={`p-2 text-xs rounded transition-all ${
                      isSelected
                        ? 'ring-2 shadow-md transform scale-105'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: isSelected ? displayColor : `${aa.color}30`,
                      color: isSelected ? 'white' : aa.color,
                      borderColor: aa.color,
                      // Ring color is controlled via Tailwind classes
                    }}
                    title={`${aa.name} (${aa.short}) - ${aa.category}`}
                  >
                    <div className="font-bold">{aa.short}</div>
                    <div className="text-[9px] opacity-70">{aa.code}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer with selection info */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                💡 Click amino acids to highlight • Use quick select buttons for categories
              </span>
              {selectedResidueTypes.length > 0 && (
                <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                  Showing: {selectedResidueTypes.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full m-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Quick Guide & Controls
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="btn-icon text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Mouse Controls</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong>Left drag:</strong> Rotate</li>
                    <li>• <strong>Right drag:</strong> Pan</li>
                    <li>• <strong>Scroll:</strong> Zoom</li>
                    <li>• <strong>Click:</strong> Select atom/residue</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Toolbar Icons</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong><Hexagon className="w-3 h-3 inline" /></strong> Ligands</li>
                    <li>• <strong><Atom className="w-3 h-3 inline" /></strong> Ions/Metals</li>
                    <li>• <strong><Droplet className="w-3 h-3 inline" /></strong> Waters</li>
                    <li>• <strong><Target className="w-3 h-3 inline text-amber-600" /></strong> Metal Analysis</li>
                    <li>• <strong><Pill className="w-3 h-3 inline text-purple-600" /></strong> Ligand Analysis</li>
                    <li>• <strong><Highlighter className="w-3 h-3 inline text-pink-600" /></strong> Residue Highlight</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Tools</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong><Ruler className="w-3 h-3 inline" /></strong> Measure distance (click 2 atoms)</li>
                    <li>• <strong><RotateCcw className="w-3 h-3 inline" /></strong> Reset camera view</li>
                    <li>• <strong><Focus className="w-3 h-3 inline" /></strong> Focus on structure</li>
                    <li>• <strong><Camera className="w-3 h-3 inline" /></strong> Take snapshot</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">PDB Examples</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong>1CRN:</strong> Crambin</li>
                    <li>• <strong>1HHO:</strong> Hemoglobin</li>
                    <li>• <strong>6LU7:</strong> SARS-CoV-2 Mpro</li>
                    <li>• <strong>4XEY:</strong> Lanmodulin</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Metal Coordination Analysis
                  </h4>
                  <ul className="space-y-1 text-sm text-amber-600 dark:text-amber-400">
                    <li>• Uses CShM (Continuous Shape Measures) for geometry classification</li>
                    <li>• Supports CN 2-12 including lanthanide geometries</li>
                    <li>• Distinguishes functional sites vs crystal artifacts</li>
                    <li>• Adjustable radius (2-5Å)</li>
                  </ul>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Ligand Binding Analysis
                  </h4>
                  <ul className="space-y-1 text-sm text-purple-600 dark:text-purple-400">
                    <li>• Detects H-bonds, salt bridges, hydrophobic contacts, π-stacking</li>
                    <li>• Classifies binding sites: functional vs crystal artifact</li>
                    <li>• Identifies common crystallization additives (SO4, PEG, GOL...)</li>
                    <li>• Adjustable contact radius (2.5-6Å)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Distance Measurement
                  </h4>
                  <ul className="space-y-1 text-sm text-primary-600 dark:text-primary-400">
                    <li>• Click <Ruler className="w-3 h-3 inline" /> to enable measurement mode</li>
                    <li>• Select first atom (labeled "1"), then second atom (labeled "2")</li>
                    <li>• Distance line and label appear automatically</li>
                    <li>• Continue clicking to measure multiple distances from atom 1</li>
                  </ul>
                </div>
                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-700">
                  <h4 className="font-semibold text-pink-700 dark:text-pink-300 mb-2 flex items-center gap-2">
                    <Highlighter className="w-4 h-4" />
                    Custom Residue Highlighting
                  </h4>
                  <ul className="space-y-1 text-sm text-pink-600 dark:text-pink-400">
                    <li>• Click <Highlighter className="w-3 h-3 inline" /> to open highlight panel</li>
                    <li>• Quick select by category (positive, negative, polar, etc.)</li>
                    <li>• Click individual amino acids to toggle</li>
                    <li>• Custom color picker for highlight color</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Electrostatic Coloring
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
                    <li>• Select "Electrostatic" from color dropdown</li>
                    <li>• <span className="text-blue-600">Blue (+)</span>: Lys, Arg, His</li>
                    <li>• <span className="text-red-600">Red (-)</span>: Asp, Glu</li>
                    <li>• <span className="text-slate-400">White (neutral)</span>: All others</li>
                  </ul>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Crystal Artifact Detection
                  </h4>
                  <ul className="space-y-1 text-sm text-green-600 dark:text-green-400">
                    <li>• <span className="text-green-600">✓ Functional</span>: Many protein contacts, specific pocket</li>
                    <li>• <span className="text-red-600">⚠ Crystal Artifact</span>: Known additives, surface/water-only</li>
                    <li>• <span className="text-yellow-600">? Uncertain</span>: Ambiguous binding pattern</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
