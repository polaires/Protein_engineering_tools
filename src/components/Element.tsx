/**
 * Element Component
 * Displays an interactive Periodic Table of Elements
 */

import { useState } from 'react';
import { Atom, X } from 'lucide-react';
import { elements, categoryColors, categoryNames, Element as ElementType } from '@/data/elements';

export default function Element() {
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);

  const periodicTable: (ElementType | null)[][] = [
    // Period 1
    [elements[0], null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, elements[1]],
    // Period 2
    [elements[2], elements[3], null, null, null, null, null, null, null, null, null, null, elements[4], elements[5], elements[6], elements[7], elements[8], elements[9]],
    // Period 3
    [elements[10], elements[11], null, null, null, null, null, null, null, null, null, null, elements[12], elements[13], elements[14], elements[15], elements[16], elements[17]],
    // Period 4
    [elements[18], elements[19], elements[20], elements[21], elements[22], elements[23], elements[24], elements[25], elements[26], elements[27], elements[28], elements[29], elements[30], elements[31], elements[32], elements[33], elements[34], elements[35]],
    // Period 5 - simplified
    [elements[36], elements[37], null, null, null, null, null, null, null, null, elements[38], null, null, null, null, elements[39], elements[40]],
    // Period 6 - simplified
    [elements[41], elements[42], null, null, null, null, null, null, null, null, elements[43], elements[44], null, null, null, null, elements[45]],
    // Period 7 - simplified
    [elements[46], elements[47], null, null, null, null, null, null, null, null, null, null, null, null, null, null, elements[48]],
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Atom className="w-7 h-7" />
          Interactive Periodic Table of Elements
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Click any element to view its properties, electron configuration, and detailed information.
        </p>
      </div>

      {/* Periodic Table Grid */}
      <div className="card overflow-x-auto">
        <div className="min-w-max">
          {periodicTable.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((element, colIndex) => (
                <div key={colIndex} className="w-14 h-16">
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
          ))}
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
        </ul>
      </div>
    </div>
  );
}
