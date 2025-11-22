/**
 * Protein Viewer Component - Full Mol* Integration
 * 3D molecular structure visualization and analysis
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Upload, Search, Download, Trash2,
  RotateCcw, Camera, Info, Database,
  Microscope, ChevronDown, ChevronUp
} from 'lucide-react';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import type { PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import {
  saveStructure,
  getAllStructures,
  deleteStructure,
  generateStructureId,
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
  const [selectedColorScheme, setSelectedColorScheme] = useState('default');
  const [selectedRepresentation, setSelectedRepresentation] = useState('cartoon');

  // Color schemes
  const colorSchemes: ColorScheme[] = [
    { id: 'default', name: 'Default', description: 'Standard coloring' },
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

  // Load structure from PDB ID
  const loadFromPDB = async (pdbId: string) => {
    if (!pluginRef.current) return;

    setIsLoading(true);
    try {
      const plugin = pluginRef.current;

      // Clear existing structure
      await plugin.clear();

      // Load from RCSB PDB
      const data = await plugin.builders.data.download({
        url: `https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`,
        isBinary: false,
        label: pdbId.toUpperCase(),
      }, { state: { isGhost: true } });

      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif');
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);

      // Apply default representation
      await plugin.builders.structure.representation.addRepresentation(structure, {
        type: selectedRepresentation as any,
      });

      // Fetch protein info from RCSB API
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

      // Save structure
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
    } catch (error) {
      console.error('Failed to load PDB:', error);
      showToast('error', `Failed to load ${pdbId}. Please check the PDB ID.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load structure from file
  const loadFromFile = async (file: File) => {
    if (!pluginRef.current) return;

    setIsLoading(true);
    try {
      const plugin = pluginRef.current;

      // Clear existing structure
      await plugin.clear();

      const text = await file.text();
      const fileType = file.name.toLowerCase().endsWith('.cif') ? 'mmcif' : 'pdb';

      // Load from data
      const data = await plugin.builders.data.rawData({
        data: text,
        label: file.name,
      }, { state: { isGhost: true } });

      const trajectory = await plugin.builders.structure.parseTrajectory(data, fileType);
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);

      // Apply default representation
      await plugin.builders.structure.representation.addRepresentation(structure, {
        type: selectedRepresentation as any,
      });

      // Save structure
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
    } catch (error) {
      console.error('Failed to load file:', error);
      showToast('error', 'Failed to load structure file');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle representation change
  const handleRepresentationChange = async (repId: string) => {
    if (!pluginRef.current || !currentStructure) return;

    setSelectedRepresentation(repId);

    try {
      // To change representation, we need to reload the structure
      // For now, just show a message - full implementation would require tracking structure refs
      showToast('info', `Representation changed to ${repId}. Reload structure to apply.`);
    } catch (error) {
      console.error('Failed to change representation:', error);
      showToast('error', 'Failed to change representation');
    }
  };

  // Handle color scheme change
  const handleColorSchemeChange = async (schemeId: string) => {
    setSelectedColorScheme(schemeId);

    // Color scheme changes require more complex API calls
    // For now, just track the selection
    showToast('info', `Color scheme: ${schemeId}`);
  };

  // Reset camera
  const resetCamera = () => {
    if (!pluginRef.current) return;
    PluginCommands.Camera.Reset(pluginRef.current, {});
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

  // Delete saved structure
  const handleDeleteStructure = async (structureId: string) => {
    try {
      await deleteStructure(structureId);
      const structures = await getAllStructures();
      setSavedStructures(structures);

      if (currentStructure?.id === structureId) {
        setCurrentStructure(null);
        setProteinInfo(null);
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
      await loadFromPDB(structure.pdbId);
    } else if (structure.data) {
      // Create a pseudo-file from saved data
      const blob = new Blob([structure.data], { type: 'text/plain' });
      const file = new File([blob], structure.name);
      await loadFromFile(file);
    }
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
                            {structure.source === 'pdb' ? 'PDB' : 'File'} • {new Date(structure.uploadDate).toLocaleDateString()}
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

        {/* Viewer Container */}
        <div className="relative">
          <div
            ref={viewerRef}
            className="w-full h-[600px] bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700"
            style={{ position: 'relative' }}
          />

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

          {/* Empty State */}
          {!isLoading && !currentStructure && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Microscope className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No structure loaded</p>
                <p className="text-sm mt-2">Search for a PDB ID or upload a file to begin</p>
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
          <div className="mt-6 flex gap-2 flex-wrap">
            <button
              onClick={() => showToast('info', 'Export PDB - Coming soon')}
              className="btn-secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDB
            </button>
            <button
              onClick={() => showToast('info', 'Export mmCIF - Coming soon')}
              className="btn-secondary"
            >
              <Download className="w-4 h-4 mr-2" />
              Export mmCIF
            </button>
          </div>
        )}
      </div>

      {/* Quick Guide */}
      <div className="card">
        <h3 className="section-title">Quick Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Mouse Controls</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>Left drag:</strong> Rotate</li>
              <li>• <strong>Right drag:</strong> Pan</li>
              <li>• <strong>Scroll:</strong> Zoom</li>
              <li>• <strong>Click atom:</strong> Select</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Popular PDB Structures</h4>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400">
              <li>• <strong>1CRN:</strong> Crambin (small protein)</li>
              <li>• <strong>1UBQ:</strong> Ubiquitin</li>
              <li>• <strong>7BV2:</strong> SARS-CoV-2 Spike</li>
              <li>• <strong>1HHO:</strong> Hemoglobin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
