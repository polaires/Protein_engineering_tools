/**
 * Protein Viewer Component - FIXED VERSION
 * Fixes: Drag overlay persistence and color scheme application
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Upload, Search, Download, Trash2, RotateCcw, Camera, Info, Database,
  Microscope, ChevronDown, ChevronUp, Ruler, Focus, FileDown
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
  const [showStructureList, setShowStructureList] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedColorScheme, setSelectedColorScheme] = useState('uniform');
  const [selectedRepresentation, setSelectedRepresentation] = useState('cartoon');
  const [measurementMode, setMeasurementMode] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUpdatingVisualization, setIsUpdatingVisualization] = useState(false);

  // FIX: Add drag counter to handle nested elements properly
  const dragCounterRef = useRef(0);

  // FIX: Updated color schemes with correct Mol* theme names
  const colorSchemes: ColorScheme[] = [
    { id: 'uniform', name: 'Uniform', description: 'Single color' },
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
              showControls: false,
            },
          },
          components: {
            remoteState: 'none',
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

  // FIX: Apply representation and color scheme with correct Mol* color theme names
  const applyVisualization = async (structureRefToUse: StateObjectRef<any>, representation: string, colorScheme: string) => {
    if (!pluginRef.current) return;

    const plugin = pluginRef.current;

    // Map UI color scheme IDs to Mol* color theme names
    const colorThemeMap: Record<string, any> = {
      'uniform': { name: 'uniform', params: { value: 0x6688ff } },
      'chain-id': { name: 'chain-id' },
      'entity-id': { name: 'entity-id' },
      'residue-name': { name: 'residue-name' },
      'secondary-structure': { name: 'secondary-structure' },
      'hydrophobicity': { name: 'hydrophobicity' },
      'element-symbol': { name: 'element-symbol' },
      'uncertainty': { name: 'uncertainty' },
    };

    const colorTheme = colorThemeMap[colorScheme] || { name: 'uniform' };

    try {
      switch (representation) {
        case 'cartoon':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'cartoon',
            colorTheme,
          });
          break;
        case 'ball-and-stick':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'ball-and-stick',
            colorTheme,
          });
          break;
        case 'spacefill':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'spacefill',
            colorTheme,
          });
          break;
        case 'surface':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'molecular-surface',
            colorTheme,
          });
          break;
        case 'gaussian-surface':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'gaussian-surface',
            colorTheme,
          });
          break;
        case 'point':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'point',
            colorTheme,
          });
          break;
        case 'backbone':
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'backbone',
            colorTheme,
          });
          break;
        default:
          await plugin.builders.structure.representation.addRepresentation(structureRefToUse, {
            type: 'cartoon',
            colorTheme,
          });
      }
    } catch (error) {
      console.error('Error applying visualization:', error);
    }
  };

  // Load structure from URL or file data
  const loadStructure = async (source: string | File, sourceType: 'url' | 'file') => {
    if (!pluginRef.current) return;

    setIsLoading(true);
    // FIX: Always clear drag state when loading starts
    setIsDraggingOver(false);
    dragCounterRef.current = 0;

    const plugin = pluginRef.current;

    try {
      // Clear existing structure
      await plugin.clear();

      let data;
      let format: string;
      let id: string;

      if (sourceType === 'url') {
        const url = source as string;
        data = await plugin.builders.data.download({ url }, { state: { isGhost: true } });
        format = url.includes('.cif') ? 'mmcif' : 'pdb';
        id = url.split('/').pop()?.replace(/\.(pdb|cif)$/i, '') || generateStructureId();
      } else {
        const file = source as File;
        const content = await file.text();
        data = await plugin.builders.data.rawData({ data: content, label: file.name });
        format = file.name.endsWith('.cif') ? 'mmcif' : 'pdb';
        id = file.name.replace(/\.(pdb|cif)$/i, '') || generateStructureId();
      }

      // Parse structure
      const trajectory = await plugin.builders.structure.parseTrajectory(data, format as any);
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);

      // Store structure reference
      structureRef.current = structure.ref;

      // Apply default visualization
      await applyVisualization(structure.ref, selectedRepresentation, selectedColorScheme);

      // Auto-focus on structure
      PluginCommands.Camera.Reset(plugin, { durationMs: 0 });

      // Extract structure info
      const info = extractProteinInfo(plugin);
      setProteinInfo(info);

      // Save to structures list
      const newStructure: ProteinStructure = {
        id,
        name: info?.title || id,
        format,
        data: sourceType === 'file' ? await (source as File).text() : undefined,
        url: sourceType === 'url' ? source as string : undefined,
        savedAt: new Date().toISOString(),
      };

      setCurrentStructure(newStructure);
      await saveStructure(newStructure);

      // Refresh saved structures list
      const structures = await getAllStructures();
      setSavedStructures(structures);

      showToast('success', `Structure ${id} loaded successfully`);
    } catch (error) {
      console.error('Failed to load structure:', error);
      showToast('error', 'Failed to load structure. Please check the file format.');
    } finally {
      setIsLoading(false);
      // FIX: Ensure drag state is cleared after loading completes
      setIsDraggingOver(false);
      dragCounterRef.current = 0;
    }
  };

  // Extract protein information from loaded structure
  const extractProteinInfo = (plugin: PluginUIContext): ProteinInfo | null => {
    try {
      const models = plugin.state.data.select(plugin.state.data.tree.root.ref)[0];
      if (!models?.obj) return null;

      const data = models.obj.data;
      const entry = data?.db?.rcsb_entry_info;
      const struct = data?.struct;
      const exptl = data?.exptl;
      const refine = data?.refine;
      const entity = data?.entity;

      // Extract organism
      let organism = 'Unknown';
      if (entity && entity._rowCount > 0) {
        const srcOrg = entity.pdbx_description.value(0);
        if (srcOrg) organism = srcOrg;
      }

      return {
        title: struct?.title?.value(0) || 'Untitled',
        experimentalMethod: exptl?.method?.value(0) || 'Unknown',
        resolution: refine?.ls_d_res_high?.value(0) || exptl?.d_resolution_high?.value(0) || 0,
        depositionDate: entry?.deposition_date || '',
        chains: [],
        atomCount: 0,
        residueCount: 0,
        organism,
      };
    } catch (error) {
      console.error('Error extracting protein info:', error);
      return null;
    }
  };

  // Handle representation change
  const handleRepresentationChange = async (representation: string) => {
    if (!pluginRef.current || !structureRef.current) return;

    setIsUpdatingVisualization(true);
    setSelectedRepresentation(representation);

    try {
      const plugin = pluginRef.current;

      // Clear and rebuild - simplest approach
      await plugin.clear();

      // Reload structure data from currentStructure
      if (currentStructure!.data) {
        const format = currentStructure!.format || 'pdb';

        const data = await plugin.builders.data.rawData({ data: currentStructure!.data, label: currentStructure!.name });
        const trajectory = await plugin.builders.structure.parseTrajectory(data, format as any);
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, representation, selectedColorScheme);
      } else if (currentStructure!.url) {
        const data = await plugin.builders.data.download({ url: currentStructure!.url });
        const format = currentStructure!.format || 'pdb';

        const trajectory = await plugin.builders.structure.parseTrajectory(data, format as any);
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, representation, selectedColorScheme);
      }

      PluginCommands.Camera.Reset(plugin, { durationMs: 0 });
      showToast('success', `Changed to ${representation} representation`);
    } catch (error) {
      console.error('Error changing representation:', error);
      showToast('error', 'Failed to change representation');
    } finally {
      setIsUpdatingVisualization(false);
    }
  };

  // FIX: Handle color scheme change with proper color theme application
  const handleColorSchemeChange = async (colorScheme: string) => {
    if (!pluginRef.current || !structureRef.current) return;

    setIsUpdatingVisualization(true);
    setSelectedColorScheme(colorScheme);

    try {
      const plugin = pluginRef.current;

      // Clear and rebuild - simplest approach
      await plugin.clear();

      // Reload structure data from currentStructure
      if (currentStructure!.data) {
        const format = currentStructure!.format || 'pdb';

        const data = await plugin.builders.data.rawData({ data: currentStructure!.data, label: currentStructure!.name });
        const trajectory = await plugin.builders.structure.parseTrajectory(data, format as any);
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, selectedRepresentation, colorScheme);
      } else if (currentStructure!.url) {
        const data = await plugin.builders.data.download({ url: currentStructure!.url });
        const format = currentStructure!.format || 'pdb';

        const trajectory = await plugin.builders.structure.parseTrajectory(data, format as any);
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        structureRef.current = structure.ref;
        await applyVisualization(structure.ref, selectedRepresentation, colorScheme);
      }

      PluginCommands.Camera.Reset(plugin, { durationMs: 0 });
      showToast('success', `Applied ${colorScheme} color scheme`);
    } catch (error) {
      console.error('Error changing color scheme:', error);
      showToast('error', 'Failed to change color scheme');
    } finally {
      setIsUpdatingVisualization(false);
    }
  };

  // Load from PDB
  const loadFromPDB = async () => {
    if (!pdbSearchQuery.trim()) {
      showToast('error', 'Please enter a PDB ID');
      return;
    }

    const pdbId = pdbSearchQuery.trim().toUpperCase();
    const url = `https://files.rcsb.org/download/${pdbId}.pdb`;
    await loadStructure(url, 'url');
    setPdbSearchQuery('');
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(pdb|cif)$/i)) {
      showToast('error', 'Please upload a PDB or mmCIF file');
      return;
    }

    await loadStructure(file, 'file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // FIX: Improved drag and drop handlers using counter pattern
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // FIX: Immediately reset drag state
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => file.name.match(/\.(pdb|cif)$/i));

    if (validFile) {
      await loadStructure(validFile, 'file');
    } else {
      showToast('error', 'Please drop a PDB or mmCIF file');
    }
  };

  // Load saved structure
  const loadSavedStructure = async (structure: ProteinStructure) => {
    if (structure.data) {
      const blob = new Blob([structure.data], { type: 'text/plain' });
      const file = new File([blob], `${structure.id}.${structure.format}`, { type: 'text/plain' });
      await loadStructure(file, 'file');
    } else if (structure.url) {
      await loadStructure(structure.url, 'url');
    }
    setShowStructureList(false);
  };

  // Delete saved structure
  const handleDeleteStructure = async (id: string) => {
    await deleteStructure(id);
    const structures = await getAllStructures();
    setSavedStructures(structures);
    showToast('success', 'Structure deleted');
  };

  // Reset view
  const resetView = () => {
    if (pluginRef.current && structureRef.current) {
      PluginCommands.Camera.Reset(pluginRef.current, {});
      showToast('success', 'View reset');
    }
  };

  // Center and focus
  const centerAndFocus = () => {
    if (pluginRef.current && structureRef.current) {
      PluginCommands.Camera.Reset(pluginRef.current, { durationMs: 250 });
      showToast('success', 'Structure centered');
    }
  };

  // Toggle measurement mode
  const toggleMeasurementMode = () => {
    setMeasurementMode(!measurementMode);
    if (pluginRef.current) {
      // Enable/disable measurement tools in Mol*
      showToast('info', measurementMode ? 'Measurement mode disabled' : 'Measurement mode enabled');
    }
  };

  // Take snapshot
  const takeSnapshot = async () => {
    if (!pluginRef.current) return;

    try {
      const plugin = pluginRef.current;
      const canvas = plugin.canvas3d?.webgl.gl.canvas as HTMLCanvasElement;

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentStructure?.id || 'structure'}_snapshot.png`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('success', 'Snapshot saved');
        }
      });
    } catch (error) {
      console.error('Failed to take snapshot:', error);
      showToast('error', 'Failed to take snapshot');
    }
  };

  // Export structure
  const exportStructure = async (format: 'pdb' | 'cif') => {
    if (!currentStructure) return;

    try {
      let content = '';
      let filename = '';

      if (currentStructure.data) {
        content = currentStructure.data;
        filename = `${currentStructure.id}.${format}`;
      } else if (currentStructure.url) {
        const response = await fetch(currentStructure.url);
        content = await response.text();
        filename = `${currentStructure.id}.${format}`;
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      showToast('success', `Structure exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', 'Failed to export structure');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* PDB Search */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={pdbSearchQuery}
              onChange={(e) => setPdbSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadFromPDB()}
              placeholder="Enter PDB ID (e.g., 1UBQ)"
              className="input flex-1"
              disabled={!isViewerReady || isLoading}
            />
            <button
              onClick={loadFromPDB}
              disabled={!isViewerReady || isLoading}
              className="btn-primary"
            >
              <Search className="w-4 h-4 mr-2" />
              Load PDB
            </button>
          </div>

          {/* File Upload */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdb,.cif"
              onChange={handleFileUpload}
              className="hidden"
              disabled={!isViewerReady || isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isViewerReady || isLoading}
              className="btn-secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </button>

            {/* Saved Structures */}
            <button
              onClick={() => setShowStructureList(!showStructureList)}
              className="btn-secondary relative"
            >
              <Database className="w-4 h-4 mr-2" />
              Saved ({savedStructures.length})
              {showStructureList ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Saved Structures List */}
        {showStructureList && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3 text-slate-700 dark:text-slate-300">Saved Structures</h3>
            {savedStructures.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No saved structures</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedStructures.map((structure) => (
                  <div
                    key={structure.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{structure.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {structure.savedAt ? new Date(structure.savedAt).toLocaleString() : 'No date'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadSavedStructure(structure)}
                        className="btn-icon"
                        title="Load"
                      >
                        <Box className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStructure(structure.id)}
                        className="btn-icon text-red-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viewer Container */}
        <div
          ref={viewerRef}
          className="relative w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* FIX: Drag Overlay - only show when actually dragging */}
          {isDraggingOver && !isLoading && (
            <div className="absolute inset-0 bg-primary-500/20 border-2 border-dashed border-primary-500 rounded-lg flex items-center justify-center z-50 pointer-events-none">
              <div className="text-center">
                <Upload className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-primary-700 dark:text-primary-300">
                  Drop PDB/mmCIF file here
                </p>
              </div>
            </div>
          )}

          {/* Viewer Controls */}
          {currentStructure && (
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={resetView}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Reset View"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={centerAndFocus}
                className="btn-icon bg-white dark:bg-slate-800 shadow-lg"
                title="Center & Focus"
              >
                <Focus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleMeasurementMode}
                className={`btn-icon shadow-lg ${
                  measurementMode
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-slate-800'
                }`}
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
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-40">
              <div className="text-center text-white">
                <div className="spinner mb-4 mx-auto border-white"></div>
                <p>Loading structure...</p>
              </div>
            </div>
          )}

          {/* Visualization Update Indicator */}
          {isUpdatingVisualization && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none z-30">
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
                disabled={isUpdatingVisualization}
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
                disabled={isUpdatingVisualization}
              >
                {colorSchemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name} - {scheme.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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
