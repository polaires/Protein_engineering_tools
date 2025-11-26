/**
 * Protein Viewer Component - COMPLETE Mol* Integration
 * Full-featured 3D molecular structure visualization and analysis
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Upload, Search, Download, Trash2, RotateCcw, Camera, Info, Database,
  Microscope, ChevronDown, ChevronUp, Ruler, Focus, FileDown, Palette,
  Droplet, Atom, Hexagon, HelpCircle, X, Target
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

  // Metal coordination highlighting mode
  const [showCoordinationHighlight, setShowCoordinationHighlight] = useState(false);
  const coordinationRadius = 3.0; // Å - typical metal coordination distance

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

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
      if (polymer) {
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
        return;
      }

      console.log(`Found ${metalCoordination.metalCount} metal ions with ${metalCoordination.coordinatingResidues.size} coordinating residues`);

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

  // Find metal ions and their coordinating atoms within the given radius
  const findMetalCoordination = (structure: Structure, radius: number) => {
    const metalElements = new Set(['CA', 'MG', 'ZN', 'FE', 'MN', 'CO', 'NI', 'CU', 'NA', 'K', 'CD', 'HG', 'PB', 'SR', 'BA']);
    const coordinatingAtomIndices: Map<number, Set<number>> = new Map(); // unitId -> elementIndices
    const coordinatingWaterIndices: Map<number, Set<number>> = new Map();
    const coordinatingResidues = new Set<string>(); // "chainId:resSeq:resName"
    const coordinatingWaters = new Set<string>();
    let metalCount = 0;
    const metalPositions: { pos: Vec3; element: string; info: string }[] = [];

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

          metalPositions.push({
            pos: Vec3.clone(pos),
            element,
            info: `${element} (${resName}${resSeq}, Chain ${chainId})`
          });
          metalCount++;
        }
      }
    }

    console.log(`Found ${metalCount} metal ions:`, metalPositions.map(m => m.info));

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
        for (const metal of metalPositions) {
          const dist = Vec3.distance(atomPos, metal.pos);

          if (dist > 0.1 && dist <= radius) { // Exclude self (dist > 0.1)
            const entityType = SP.entity.type(l);
            const chainId = SP.chain.label_asym_id(l);
            const resSeq = SP.residue.label_seq_id(l);
            const resName = SP.atom.label_comp_id(l);
            const atomName = SP.atom.label_atom_id(l);
            const resKey = `${chainId}:${resSeq}:${resName}`;

            // Track coordinating atom
            if (!coordinatingAtomIndices.has(unitId)) {
              coordinatingAtomIndices.set(unitId, new Set());
            }
            coordinatingAtomIndices.get(unitId)!.add(i);

            // Check if it's water
            if (entityType === 'water' || resName === 'HOH' || resName === 'WAT') {
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

    return {
      metalCount,
      metalPositions,
      coordinatingAtomIndices,
      coordinatingWaterIndices,
      coordinatingResidues,
      coordinatingWaters
    };
  };

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
        // Clear highlighting
        pluginRef.current.managers.structure.selection.clear();

        // Remove coordinating water representation if it exists
        const state = pluginRef.current.state.data;
        const waterReps = state.select(state.tree.root.ref).filter(
          (cell: any) => cell.obj?.tags?.includes('coordinating-water')
        );
        for (const rep of waterReps) {
          await PluginCommands.State.RemoveObject(pluginRef.current, { state, ref: rep.transform.ref });
        }

        showToast('info', 'Coordination highlighting cleared');
      }
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

          {/* Overlay Controls */}
          {isViewerReady && currentStructure && (
            <div className="absolute top-4 right-4 space-y-2">
              <button
                onClick={resetCamera}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Reset Camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={focusOnStructure}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Focus on Structure"
              >
                <Focus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMeasurement}
                className={`btn-icon bg-white dark:bg-slate-800 shadow-lg relative ${measurementMode ? 'ring-2 ring-primary-500 bg-primary-100 dark:bg-primary-900' : ''}`}
                title={measurementMode ? `Measurement mode active${selectedLoci.length > 0 ? ` (${selectedLoci.length}/2 atoms selected)` : ''}` : 'Enable measurement tool'}
              >
                <Ruler className={`w-5 h-5 ${measurementMode ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                {measurementMode && selectedLoci.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {selectedLoci.length}
                  </span>
                )}
              </button>
              <button
                onClick={takeSnapshot}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Take Snapshot"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Structure Info"
              >
                <Info className="w-5 h-5" />
              </button>
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
                    title="Metal Coordination Highlight - Highlights residues coordinating metal ions (within 3Å)"
                  >
                    <Target className="w-4 h-4" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Features</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong>Drag & drop:</strong> File upload</li>
                    <li>• <strong>Representations:</strong> 7 styles</li>
                    <li>• <strong>Color schemes:</strong> 5 themes</li>
                    <li>• <strong>Export:</strong> PDB, CIF, FASTA</li>
                  </ul>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Popular Examples</h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li>• <strong>1CRN:</strong> Crambin (small)</li>
                    <li>• <strong>1UBQ:</strong> Ubiquitin</li>
                    <li>• <strong>7BV2:</strong> Spike protein</li>
                    <li>• <strong>1HHO:</strong> Hemoglobin</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">Tips</h4>
                <ul className="space-y-1 text-sm text-primary-600 dark:text-primary-400">
                  <li>• Use the toolbar below the viewer to quickly change representation and color schemes</li>
                  <li>• Toggle additional components (ligands, ions, water) with the icon buttons</li>
                  <li>• Color legend only appears when relevant to the selected color scheme</li>
                  <li>• For heteromers, use the chain selector to analyze different chains individually</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
