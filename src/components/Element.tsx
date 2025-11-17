/**
 * Element Component
 * Displays the PubChem Interactive Periodic Table of Elements
 */

import { Atom } from 'lucide-react';

export default function Element() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Atom className="w-7 h-7" />
          Interactive Periodic Table of Elements
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Explore chemical elements with detailed information from PubChem. Click any element to view its properties, compounds, and related data.
        </p>
      </div>

      {/* PubChem Periodic Table Iframe */}
      <div className="card p-0 overflow-hidden">
        <iframe
          src="https://pubchem.ncbi.nlm.nih.gov/periodic-table/#view=table&embed=true"
          title="PubChem Interactive Periodic Table"
          className="w-full h-[800px] border-0"
          style={{
            minHeight: '800px',
            background: 'white'
          }}
          allow="fullscreen"
        />
      </div>

      {/* Information */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Atom className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          How to Use
        </h3>
        <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
          <li><strong>Click any element</strong> to view detailed information including atomic number, mass, electron configuration, and more</li>
          <li><strong>Explore categories</strong> - Elements are color-coded by type (metals, nonmetals, noble gases, etc.)</li>
          <li><strong>View compounds</strong> - Access PubChem database for compounds containing specific elements</li>
          <li><strong>Interactive data</strong> - Hover over elements to see quick facts and properties</li>
        </ul>
      </div>

      {/* Attribution */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          Periodic Table provided by{' '}
          <a
            href="https://pubchem.ncbi.nlm.nih.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            PubChem
          </a>
          {' '}(National Library of Medicine)
        </p>
      </div>
    </div>
  );
}
