/**
 * Element Component
 * Displays an interactive Periodic Table of Elements
 */

import { useState } from 'react';
import { Atom, X, Beaker, TestTube2 } from 'lucide-react';
import { elements, categoryColors, categoryNames, Element as ElementType } from '@/data/elements';
import MetalSolubility from './MetalSolubility';
import StabilityConstant from './StabilityConstant';

type ViewMode = 'standard' | 'solubility' | 'stability';

export default function Element() {
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('standard');

  // Helper to get element by atomic number
  const getElement = (num: number): ElementType | null => {
    return elements.find(el => el.number === num) || null;
  };

  // Main periodic table (Periods 1-7)
  const periodicTable: (ElementType | null | 'lanthanide-marker' | 'actinide-marker')[][] = [
    // Period 1
    [getElement(1), null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, getElement(2)],
    // Period 2
    [getElement(3), getElement(4), null, null, null, null, null, null, null, null, null, null, getElement(5), getElement(6), getElement(7), getElement(8), getElement(9), getElement(10)],
    // Period 3
    [getElement(11), getElement(12), null, null, null, null, null, null, null, null, null, null, getElement(13), getElement(14), getElement(15), getElement(16), getElement(17), getElement(18)],
    // Period 4
    [getElement(19), getElement(20), getElement(21), getElement(22), getElement(23), getElement(24), getElement(25), getElement(26), getElement(27), getElement(28), getElement(29), getElement(30), getElement(31), getElement(32), getElement(33), getElement(34), getElement(35), getElement(36)],
    // Period 5
    [getElement(37), getElement(38), getElement(39), getElement(40), getElement(41), getElement(42), getElement(43), getElement(44), getElement(45), getElement(46), getElement(47), getElement(48), getElement(49), getElement(50), getElement(51), getElement(52), getElement(53), getElement(54)],
    // Period 6
    [getElement(55), getElement(56), 'lanthanide-marker', getElement(72), getElement(73), getElement(74), getElement(75), getElement(76), getElement(77), getElement(78), getElement(79), getElement(80), getElement(81), getElement(82), getElement(83), getElement(84), getElement(85), getElement(86)],
    // Period 7
    [getElement(87), getElement(88), 'actinide-marker', getElement(104), getElement(105), getElement(106), getElement(107), getElement(108), getElement(109), getElement(110), getElement(111), getElement(112), getElement(113), getElement(114), getElement(115), getElement(116), getElement(117), getElement(118)],
  ];

  // Lanthanides (elements 57-71)
  const lanthanides: (ElementType | null)[] = [];
  for (let i = 57; i <= 71; i++) {
    lanthanides.push(getElement(i));
  }

  // Actinides (elements 89-103)
  const actinides: (ElementType | null)[] = [];
  for (let i = 89; i <= 103; i++) {
    actinides.push(getElement(i));
  }

  // If in solubility mode, render MetalSolubility component
  if (viewMode === 'solubility') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Mode Toggle */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Beaker className="w-7 h-7" />
              Periodic Table - Metal Solubility
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setViewMode('standard')}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                <Atom className="w-4 h-4 inline mr-2" />
                Standard
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-all bg-primary-600 text-white cursor-default"
                disabled
              >
                <Beaker className="w-4 h-4 inline mr-2" />
                Solubility
              </button>
              <button
                onClick={() => setViewMode('stability')}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                <TestTube2 className="w-4 h-4 inline mr-2" />
                Stability
              </button>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Explore metal salt solubility data from the CRC Handbook. Filter by anions, adjust temperature, and view in multiple units.
          </p>
        </div>
        <MetalSolubility hideHeader={true} />
      </div>
    );
  }

  // If in stability mode, render StabilityConstant component
  if (viewMode === 'stability') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Mode Toggle */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <TestTube2 className="w-7 h-7" />
              Periodic Table - Stability Constants
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setViewMode('standard')}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                <Atom className="w-4 h-4 inline mr-2" />
                Standard
              </button>
              <button
                onClick={() => setViewMode('solubility')}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                <Beaker className="w-4 h-4 inline mr-2" />
                Solubility
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-all bg-primary-600 text-white cursor-default"
                disabled
              >
                <TestTube2 className="w-4 h-4 inline mr-2" />
                Stability
              </button>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Explore metal-ligand stability constants from the NIST SRD 46 database. Filter by ligands, temperature, and constant types.
          </p>
        </div>
        <StabilityConstant hideHeader={true} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Mode Toggle */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Atom className="w-7 h-7" />
            Periodic Table - Standard View
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              className="px-4 py-2 rounded-lg font-medium transition-all bg-primary-600 text-white cursor-default"
              disabled
            >
              <Atom className="w-4 h-4 inline mr-2" />
              Standard
            </button>
            <button
              onClick={() => setViewMode('solubility')}
              className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              <Beaker className="w-4 h-4 inline mr-2" />
              Solubility
            </button>
            <button
              onClick={() => setViewMode('stability')}
              className="px-4 py-2 rounded-lg font-medium transition-all bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              <TestTube2 className="w-4 h-4 inline mr-2" />
              Stability
            </button>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Complete table of all 118 elements. Click any element to view its properties, electron configuration, and detailed information.
        </p>
      </div>

      {/* Periodic Table Grid */}
      <div className="card overflow-x-auto">
        <div className="min-w-max">
          {/* Main table */}
          {periodicTable.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 mb-1">
              {row.map((element, colIndex) => (
                <div key={colIndex} className="w-14 h-16">
                  {element && typeof element === 'object' && 'symbol' in element ? (
                    <button
                      onClick={() => setSelectedElement(element)}
                      className={`w-full h-full ${categoryColors[element.category]} text-slate-900 rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300`}
                      title={element.name}
                    >
                      <div className="text-[10px] font-normal">{element.number}</div>
                      <div className="text-lg font-bold">{element.symbol}</div>
                      <div className="text-[9px] font-normal truncate max-w-full px-1">{element.name}</div>
                    </button>
                  ) : element === 'lanthanide-marker' ? (
                    <div className="w-full h-full bg-pink-200 dark:bg-pink-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      57-71
                    </div>
                  ) : element === 'actinide-marker' ? (
                    <div className="w-full h-full bg-rose-200 dark:bg-rose-900 rounded flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300">
                      89-103
                    </div>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Spacer */}
          <div className="h-4"></div>

          {/* Lanthanides */}
          <div className="flex gap-1 mb-1">
            <div className="w-14 h-16"></div>
            <div className="w-14 h-16"></div>
            {lanthanides.map((element, idx) => (
              <div key={idx} className="w-14 h-16">
                {element ? (
                  <button
                    onClick={() => setSelectedElement(element)}
                    className={`w-full h-full ${categoryColors[element.category]} text-slate-900 rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300`}
                    title={element.name}
                  >
                    <div className="text-[10px] font-normal">{element.number}</div>
                    <div className="text-lg font-bold">{element.symbol}</div>
                    <div className="text-[9px] font-normal truncate max-w-full px-1">{element.name}</div>
                  </button>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>

          {/* Actinides */}
          <div className="flex gap-1">
            <div className="w-14 h-16"></div>
            <div className="w-14 h-16"></div>
            {actinides.map((element, idx) => (
              <div key={idx} className="w-14 h-16">
                {element ? (
                  <button
                    onClick={() => setSelectedElement(element)}
                    className={`w-full h-full ${categoryColors[element.category]} text-slate-900 rounded shadow hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center text-xs font-semibold border border-slate-300`}
                    title={element.name}
                  >
                    <div className="text-[10px] font-normal">{element.number}</div>
                    <div className="text-lg font-bold">{element.symbol}</div>
                    <div className="text-[9px] font-normal truncate max-w-full px-1">{element.name}</div>
                  </button>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Element Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(categoryNames).map(([key, name]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${categoryColors[key]} border border-slate-300`} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Element Details Modal */}
      {selectedElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`${categoryColors[selectedElement.category]} p-6 rounded-t-lg relative`}>
              <button
                onClick={() => setSelectedElement(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>
              <div className="flex items-center gap-4">
                <div className="text-7xl font-bold text-slate-900">{selectedElement.symbol}</div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">{selectedElement.name}</div>
                  <div className="text-xl text-slate-700">Atomic Number: {selectedElement.number}</div>
                  <div className="text-lg text-slate-700">{categoryNames[selectedElement.category]}</div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Basic Properties</h4>
                  <div className="text-sm space-y-1">
                    <p className="text-slate-700 dark:text-slate-300"><strong>Atomic Mass:</strong> {selectedElement.atomicMass} u</p>
                    <p className="text-slate-700 dark:text-slate-300"><strong>Period:</strong> {selectedElement.period}</p>
                    {selectedElement.group && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Group:</strong> {selectedElement.group}</p>
                    )}
                    <p className="text-slate-700 dark:text-slate-300"><strong>Block:</strong> {selectedElement.block}-block</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Physical Properties</h4>
                  <div className="text-sm space-y-1">
                    {selectedElement.meltingPoint && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Melting Point:</strong> {selectedElement.meltingPoint} K</p>
                    )}
                    {selectedElement.boilingPoint && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Boiling Point:</strong> {selectedElement.boilingPoint} K</p>
                    )}
                    {selectedElement.density && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Density:</strong> {selectedElement.density} g/cm³</p>
                    )}
                    {selectedElement.electronegativity && (
                      <p className="text-slate-700 dark:text-slate-300"><strong>Electronegativity:</strong> {selectedElement.electronegativity}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Electron Configuration</h4>
                <p className="text-lg font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 p-3 rounded">
                  {selectedElement.electronConfiguration}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <a
                  href={`https://en.wikipedia.org/wiki/${selectedElement.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 text-center"
                >
                  Learn More on Wikipedia
                </a>
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/element/${selectedElement.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 text-center"
                >
                  View on PubChem
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Atom className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          How to Use
        </h3>
        <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
          <li><strong>Click any element</strong> to view detailed information including atomic number, mass, and electron configuration</li>
          <li><strong>Explore categories</strong> - Elements are color-coded by type (metals, nonmetals, noble gases, etc.)</li>
          <li><strong>View properties</strong> - See melting point, boiling point, density, and electronegativity</li>
          <li><strong>External resources</strong> - Access Wikipedia and PubChem for more detailed information</li>
          <li><strong>Lanthanides and Actinides</strong> - Displayed separately below the main table for clarity</li>
        </ul>
      </div>
    </div>
  );
}
