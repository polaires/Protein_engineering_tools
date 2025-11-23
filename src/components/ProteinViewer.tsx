/**
 * Protein Viewer Component - COMPLETE Mol* Integration
 * Full-featured 3D molecular structure visualization and analysis
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Upload, Search, Download, Trash2, RotateCcw, Camera, Info, Database,
  Microscope, ChevronDown, ChevronUp, Ruler, Focus, FileDown, Palette
} from 'lucide-react';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import type { PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { StateObjectRef } from 'molstar/lib/mol-state';
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

  // Store actual structure metadata for dynamic legends and analysis
  const [structureMetadata, setStructureMetadata] = useState<{
    chains?: string[];
    residueCount?: number;
    sequence?: string;
    aminoAcidComposition?: Record<string, number>;
  } | null>(null);

  // Store protein analysis results
  const [showProteinAnalysis, setShowProteinAnalysis] = useState(false);

  // Ligand, ion, water controls
  const [showLigands, setShowLigands] = useState(true);
  const [showIons, setShowIons] = useState(true);
  const [showWater, setShowWater] = useState(false);

  // Track when component visibility changes to update visualization
  const [componentsNeedUpdate, setComponentsNeedUpdate] = useState(false);

  // Ref to prevent drag overlay from showing during/after file load
  const allowDragOverlayRef = useRef(true);

  // Color schemes
  const colorSchemes: ColorScheme[] = [
    { id: 'uniform', name: 'Uniform', description: 'Single solid color' },
    { id: 'chain-id', name: 'By Chain', description: 'Color by chain ID' },
    { id: 'entity-id', name: 'By Entity', description: 'Color by entity' },
    { id: 'residue-name', name: 'By Residue', description: 'Color by residue type' },
    { id: 'secondary-structure', name: 'Secondary Structure', description: 'Helix, sheet, coil' },
    { id: 'hydrophobicity', name: 'Hydrophobicity', description: 'Hydrophobic to hydrophilic' },
    { id: 'element-symbol', name: 'By Element', description: 'Color by atom element' },
    { id: 'uncertainty', name: 'B-factor/pLDDT', description: 'Crystallographic B-factor or AlphaFold confidence' },
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
              showControls: true,       // Must be true to show any control regions
              controlsDisplay: 'reactive', // CRITICAL: Required for proper panel display
              regionState: {
                top: 'full',            // Required field - show sequence panel
                left: 'hidden',
                right: 'hidden',
                bottom: 'hidden',
              },
            },
          },
          components: {
            remoteState: 'none',
            controls: {
              left: 'none',             // Hide left panel
              right: 'none',            // Hide right panel
              bottom: 'none',           // Hide bottom log panel
              // top is not set, defaults to sequence viewer
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

        // Debug: Check if sequence panel is in the layout
        console.log('Mol* plugin initialized');
        console.log('Layout state:', plugin.layout.state);
        console.log('Sequence panel should be visible if showControls=true and controls.top is not "none"');

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

  // Extract structure metadata for dynamic legends and protein analysis
  const extractStructureMetadata = (structureRefToUse: StateObjectRef<any>) => {
    if (!pluginRef.current) {
      console.warn('extractStructureMetadata: Plugin not available');
      return;
    }

    console.log('Extracting structure metadata...');

    try {
      const state = pluginRef.current.state.data;
      // StateObjectRef can be used directly as the cells Map key
      const cell = state.cells.get(structureRefToUse as any);

      if (!cell) {
        console.warn('extractStructureMetadata: Cell not found for structure ref');
        setStructureMetadata(null);
        return;
      }

      const structure = cell?.obj?.data;

      if (!structure) {
        console.warn('extractStructureMetadata: Structure data not available');
        setStructureMetadata(null);
        return;
      }

      if (!structure.units || structure.units.length === 0) {
        console.warn('extractStructureMetadata: Structure has no units');
        setStructureMetadata(null);
        return;
      }

      console.log('Structure units found:', structure.units.length);

      // Extract unique chain IDs
      const chainSet = new Set<string>();
      const { units } = structure;

      // Extract sequence for protein analysis
      let fullSequence = '';
      const aminoAcidCounts: Record<string, number> = {};

      // Iterate through all models in the structure
      for (const unit of units) {
        if (!unit.model) continue;

        const { model } = unit;
        const { atomicHierarchy } = model;

        if (!atomicHierarchy) continue;

        // Extract chain information from this unit
        const { chainAtomSegments, residues, chains } = atomicHierarchy;

        // Get chain ID for this unit - prioritize proper letter labels
        try {
          let chainId = null;

          // Method 1 (BEST): Try getting proper chain label from chains.label_asym_id
          if (chainAtomSegments && chains && chains.label_asym_id && unit.elements && unit.elements.length > 0) {
            try {
              const firstElement = unit.elements[0];
              const segmentIndex = chainAtomSegments.index[firstElement];
              if (segmentIndex !== undefined) {
                chainId = chains.label_asym_id.value(segmentIndex);
                if (chainId) {
                  console.log('Found chain (label_asym_id):', chainId);
                }
              }
            } catch (e) {
              console.warn('Method 1 failed:', e);
            }
          }

          // Method 2: Try auth_asym_id as alternative
          if (!chainId && chains && chains.auth_asym_id && chainAtomSegments && unit.elements && unit.elements.length > 0) {
            try {
              const firstElement = unit.elements[0];
              const segmentIndex = chainAtomSegments.index[firstElement];
              if (segmentIndex !== undefined) {
                chainId = chains.auth_asym_id.value(segmentIndex);
                if (chainId) {
                  console.log('Found chain (auth_asym_id):', chainId);
                }
              }
            } catch (e) {
              console.warn('Method 2 failed:', e);
            }
          }

          // Method 3: Fallback to sequential naming (only if above methods fail)
          if (!chainId) {
            chainId = String.fromCharCode(65 + chainSet.size); // A, B, C...
            console.log('Found chain (fallback):', chainId);
          }

          if (chainId) {
            chainSet.add(String(chainId));
          }
        } catch (err) {
          console.warn('Could not extract chain ID:', err);
        }

        // Extract residue sequence - only from polymer/protein units
        try {
          // Check if this unit is a polymer (not a ligand, ion, or water)
          const isPolymer = unit.kind === 0; // 0 = atomic, check if it's polymer
          const hasResidues = residues && residues._rowCount > 0;

          if (hasResidues) {
            console.log(`Unit has ${residues._rowCount} residues, isPolymer: ${isPolymer}`);

            // Debug: Log available properties on residues
            console.log('Residues object properties:', Object.keys(residues).filter(k => !k.startsWith('_')));

            let extractedInThisUnit = 0;

            for (let rI = 0; rI < residues._rowCount; rI++) {
              // Try to get residue name - check multiple properties
              let compId = null;

              // Debug first residue in detail
              if (rI === 0) {
                console.log('First residue debug:');
                console.log('  - label_comp_id exists?', !!residues.label_comp_id);
                console.log('  - auth_comp_id exists?', !!residues.auth_comp_id);
                console.log('  - comp_id exists?', !!(residues as any).comp_id);

                if (residues.label_comp_id) {
                  try {
                    const testValue = residues.label_comp_id.value(rI);
                    console.log('  - label_comp_id.value(0):', testValue);
                  } catch (e) {
                    console.log('  - label_comp_id.value(0) ERROR:', e);
                  }
                }
              }

              // Try multiple ways to get composition ID
              if (residues.label_comp_id) {
                try {
                  compId = residues.label_comp_id.value(rI);
                } catch (e) {
                  if (rI === 0) console.log('  - Failed to get label_comp_id:', e);
                }
              }

              if (!compId && residues.auth_comp_id) {
                try {
                  compId = residues.auth_comp_id.value(rI);
                } catch (e) {
                  if (rI === 0) console.log('  - Failed to get auth_comp_id:', e);
                }
              }

              // Try generic comp_id
              if (!compId && (residues as any).comp_id) {
                try {
                  compId = (residues as any).comp_id.value(rI);
                } catch (e) {
                  if (rI === 0) console.log('  - Failed to get comp_id:', e);
                }
              }

              if (compId) {
                const compIdStr = String(compId);

                // Only add if it's a standard amino acid
                const oneLetterCode = threeToOne(compIdStr);
                if (oneLetterCode) {
                  fullSequence += oneLetterCode;
                  aminoAcidCounts[oneLetterCode] = (aminoAcidCounts[oneLetterCode] || 0) + 1;
                  extractedInThisUnit++;
                } else {
                  // Log non-standard residues
                  if (rI === 0) {
                    console.log(`Non-standard residue: ${compIdStr} (skipped)`);
                  }
                }
              } else {
                if (rI === 0) {
                  console.log('Could not get compId for first residue - all methods failed');
                }
              }
            }

            if (extractedInThisUnit > 0) {
              console.log(`✓ Extracted ${extractedInThisUnit} amino acids from this unit`);
            } else {
              console.warn(`✗ No amino acids extracted from this unit (${residues._rowCount} residues found)`);
            }
          }
        } catch (err) {
          console.error('Could not extract sequence:', err);
        }
      }

      const metadata = {
        chains: Array.from(chainSet).sort(),
        residueCount: structure.elementCount,
        sequence: fullSequence,
        aminoAcidComposition: aminoAcidCounts,
      };

      setStructureMetadata(metadata);

      console.log('✓ Structure metadata extracted successfully:', {
        chains: metadata.chains,
        chainCount: metadata.chains.length,
        residueCount: metadata.residueCount,
        sequenceLength: metadata.sequence.length,
      });
    } catch (error) {
      console.error('Error extracting structure metadata:', error);
      setStructureMetadata(null);
    }
  };

  // Helper function to convert 3-letter amino acid code to 1-letter
  const threeToOne = (three: string): string | null => {
    const map: Record<string, string> = {
      'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
      'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
      'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
      'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V',
      'SEC': 'U', 'PYL': 'O'
    };
    return map[three.toUpperCase()] || null;
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
    } catch (error) {
      console.error('Failed to apply visualization:', error);
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
      showToast('info', 'Measurement mode enabled. Click atoms to select and view distances in the viewer.');
    } else {
      showToast('info', 'Measurement mode disabled');
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

        // Mol* default chain color palette (from ColorTheme)
        const molstarChainColors = [
          '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
          '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
          '#ccebc5', '#ffed6f'
        ];

        return structureMetadata.chains.slice(0, 10).map((chainId: string, index: number) => ({
          label: `Chain ${chainId}`,
          color: molstarChainColors[index % molstarChainColors.length],
        }));
      case 'secondary-structure':
        return [
          { label: 'α-Helix', color: 'rgb(255, 0, 255)' }, // Magenta
          { label: 'β-Sheet', color: 'rgb(255, 255, 0)' }, // Yellow
          { label: 'Coil/Loop', color: 'rgb(220, 220, 220)' }, // Light gray
        ];
      case 'element-symbol':
        return [
          { label: 'Carbon (C)', color: 'rgb(144, 144, 144)' }, // Gray
          { label: 'Nitrogen (N)', color: 'rgb(48, 80, 248)' }, // Blue
          { label: 'Oxygen (O)', color: 'rgb(255, 13, 13)' }, // Red
          { label: 'Sulfur (S)', color: 'rgb(255, 255, 48)' }, // Yellow
          { label: 'Phosphorus (P)', color: 'rgb(255, 128, 0)' }, // Orange
        ];
      case 'hydrophobicity':
        return [
          { label: 'Hydrophobic', color: 'rgb(255, 255, 255)' }, // White
          { label: 'Neutral', color: 'rgb(144, 238, 144)' }, // Light green
          { label: 'Hydrophilic', color: 'rgb(0, 0, 255)' }, // Blue
        ];
      case 'uncertainty':
        return [
          { label: 'Low (confident)', color: 'rgb(0, 83, 214)' }, // Blue
          { label: 'Medium', color: 'rgb(255, 219, 19)' }, // Yellow
          { label: 'High (uncertain)', color: 'rgb(255, 125, 69)' }, // Orange
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
                className={`btn-icon bg-white dark:bg-slate-800 shadow-lg ${measurementMode ? 'ring-2 ring-primary-500' : ''}`}
                title="Measurement Tool"
              >
                <Ruler className="w-5 h-5" />
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

        {/* Visualization Controls */}
        {currentStructure && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Representation */}
            <div>
              <label className="label">Representation</label>
              <select
                value={selectedRepresentation}
                onChange={(e) => handleRepresentationChange(e.target.value)}
                className="input"
              >
                {representations.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} - {rep.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="label">Color Scheme</label>
              <select
                value={selectedColorScheme}
                onChange={(e) => handleColorSchemeChange(e.target.value)}
                className="input"
              >
                {colorSchemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name} - {scheme.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Options */}
            <div className="mt-4 md:col-span-2">
              <label className="label mb-2">Additional Components</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLigands}
                    onChange={(e) => {
                      setShowLigands(e.target.checked);
                      setComponentsNeedUpdate(true);
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Ligands & Small Molecules</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Bound molecules, substrates, drugs</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showIons}
                    onChange={(e) => {
                      setShowIons(e.target.checked);
                      setComponentsNeedUpdate(true);
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Ions & Metal Centers</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Metal ions (Ca²⁺, Mg²⁺, Zn²⁺, etc.)</span>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWater}
                    onChange={(e) => {
                      setShowWater(e.target.checked);
                      setComponentsNeedUpdate(true);
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Water Molecules</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Crystallographic water</span>
                  </div>
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                Note: Components displayed only if present in structure
              </p>
            </div>
          </div>
        )}

        {/* Color Legend - Full Width Below Grid */}
        {currentStructure && getColorLegend() && (
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
            <div className="space-y-1.5">
              {getColorLegend()!.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Protein Analysis - Full Width Below Grid */}
        {currentStructure && structureMetadata?.sequence && (() => {
          try {
            const analysis = analyzeProtein(structureMetadata.sequence);
            return (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <button
                  onClick={() => setShowProteinAnalysis(!showProteinAnalysis)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Protein Analysis
                  </span>
                  {showProteinAnalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showProteinAnalysis && (
                  <div className="mt-3 space-y-3">
                    {/* Basic Information */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Basic Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div><span className="font-medium">Length:</span> {analysis.length} aa</div>
                        <div><span className="font-medium">MW:</span> {analysis.molecularWeight.toFixed(2)} Da</div>
                        <div><span className="font-medium">pI:</span> {analysis.theoreticalPI.toFixed(2)}</div>
                        <div><span className="font-medium">Aromaticity:</span> {(analysis.aromaticity * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Physicochemical Properties */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Physicochemical Properties</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div><span className="font-medium">GRAVY:</span> {analysis.gravy.toFixed(3)}</div>
                        <div><span className="font-medium">Aliphatic Index:</span> {analysis.aliphaticIndex.toFixed(2)}</div>
                        <div><span className="font-medium">Instability:</span> {analysis.instabilityIndex.toFixed(2)}</div>
                        <div><span className="font-medium">Status:</span> {analysis.instabilityIndex > 40 ? 'Unstable' : 'Stable'}</div>
                      </div>
                    </div>

                    {/* Amino Acid Composition (Top 5) */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Amino Acid Composition (Top 5)</h4>
                      <div className="space-y-1">
                        {Object.entries(analysis.aminoAcidPercent)
                          .filter(([_, percent]) => percent > 0)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([aa, percent]) => (
                            <div key={aa} className="flex justify-between text-xs">
                              <span className="font-mono">{aa}</span>
                              <div className="flex-1 mx-2">
                                <div className="bg-blue-200 dark:bg-blue-800 h-3 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full" style={{ width: `${percent}%` }}></div>
                                </div>
                              </div>
                              <span className="font-medium">{percent.toFixed(1)}%</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Cleaned Sequence */}
                    <div>
                      <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Cleaned Sequence</h4>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded border border-blue-200 dark:border-blue-700 max-h-32 overflow-y-auto">
                        <code className="text-xs font-mono break-all">{analysis.sequence}</code>
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
              <span className="label mb-0">Export Structure</span>
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
            </div>
          </div>
        )}
      </div>

      {/* Quick Guide */}
      <div className="card">
        <h3 className="section-title">Quick Guide & Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Mouse Controls</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>Left drag:</strong> Rotate</li>
              <li>• <strong>Right drag:</strong> Pan</li>
              <li>• <strong>Scroll:</strong> Zoom</li>
              <li>• <strong>Click:</strong> Select atom/residue</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Features</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>Drag & drop:</strong> File upload</li>
              <li>• <strong>Representations:</strong> All 7 styles</li>
              <li>• <strong>Color schemes:</strong> All 8 themes</li>
              <li>• <strong>Export:</strong> PDB & mmCIF</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Popular Examples</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>1CRN:</strong> Crambin (small)</li>
              <li>• <strong>1UBQ:</strong> Ubiquitin</li>
              <li>• <strong>7BV2:</strong> Spike protein</li>
              <li>• <strong>1HHO:</strong> Hemoglobin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
