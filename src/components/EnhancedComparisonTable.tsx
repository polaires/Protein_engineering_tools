/**
 * Enhanced Comparison Table Component
 * With sorting, filtering, batch selection, and export capabilities
 */

import { useState } from 'react';
import { ArrowUpDown, Download, Filter } from 'lucide-react';
import { OptimizationResponse } from '@/types/codon';

interface EnhancedComparisonTableProps {
  result: OptimizationResponse;
}

type SortField = 'position' | 'cai_improvement' | 'amino_acid';
type SortDirection = 'asc' | 'desc';

export function EnhancedComparisonTable({ result }: EnhancedComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterAA, setFilterAA] = useState<string>('');
  const [minCAIImprovement, setMinCAIImprovement] = useState<number>(0);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());

  // Calculate CAI improvement for each change
  const changesWithImprovement = result.changes.map(change => {
    const originalWi = result.w_i_values_original[change.position] || 0;
    const finalWi = result.w_i_values_final[change.position] || 0;
    const improvement = finalWi - originalWi;

    return {
      ...change,
      originalWi,
      finalWi,
      improvement,
    };
  });

  // Filter
  const filteredChanges = changesWithImprovement.filter(change => {
    if (filterAA && change.amino_acid !== filterAA) return false;
    if (change.improvement < minCAIImprovement) return false;
    return true;
  });

  // Sort
  const sortedChanges = [...filteredChanges].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'position':
        comparison = a.position - b.position;
        break;
      case 'cai_improvement':
        comparison = a.improvement - b.improvement;
        break;
      case 'amino_acid':
        comparison = a.amino_acid.localeCompare(b.amino_acid);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelection = (position: number) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(position)) {
      newSelected.delete(position);
    } else {
      newSelected.add(position);
    }
    setSelectedPositions(newSelected);
  };

  const selectAll = () => {
    setSelectedPositions(new Set(sortedChanges.map(c => c.position)));
  };

  const deselectAll = () => {
    setSelectedPositions(new Set());
  };

  const exportToCSV = () => {
    const headers = ['Position', 'Amino Acid', 'Original Codon', 'Original w_i', 'Optimized Codon', 'Optimized w_i', 'Improvement'];
    const rows = sortedChanges.map(change => [
      change.position + 1,
      change.amino_acid,
      change.original,
      change.originalWi.toFixed(4),
      change.optimized,
      change.finalWi.toFixed(4),
      change.improvement.toFixed(4),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codon_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique amino acids for filter
  const uniqueAAs = Array.from(new Set(changesWithImprovement.map(c => c.amino_acid))).sort();

  // Get color based on improvement magnitude
  const getImprovementColor = (improvement: number) => {
    if (improvement > 0.3) return 'bg-green-100 dark:bg-green-900/30';
    if (improvement > 0.1) return 'bg-green-50 dark:bg-green-900/20';
    if (improvement > 0) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-slate-50 dark:bg-slate-800/50';
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-semibold">Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Amino Acid:</label>
          <select
            value={filterAA}
            onChange={(e) => setFilterAA(e.target.value)}
            className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          >
            <option value="">All</option>
            {uniqueAAs.map(aa => (
              <option key={aa} value={aa}>{aa}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Min CAI Improvement:</label>
          <input
            type="number"
            step="0.01"
            value={minCAIImprovement}
            onChange={(e) => setMinCAIImprovement(parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="btn-secondary text-xs">
            Select All
          </button>
          <button onClick={deselectAll} className="btn-secondary text-xs">
            Deselect All
          </button>
          <button onClick={exportToCSV} className="btn-primary text-xs flex items-center gap-1">
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        Showing {sortedChanges.length} of {result.changes.length} changes
        {selectedPositions.size > 0 && ` (${selectedPositions.size} selected)`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
            <tr>
              <th className="p-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedPositions.size === sortedChanges.length && sortedChanges.length > 0}
                  onChange={() => selectedPositions.size === sortedChanges.length ? deselectAll() : selectAll()}
                  className="w-4 h-4"
                />
              </th>
              <th
                className="p-2 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center gap-1">
                  Position
                  {sortField === 'position' && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
              <th
                className="p-2 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => handleSort('amino_acid')}
              >
                <div className="flex items-center gap-1">
                  AA
                  {sortField === 'amino_acid' && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
              <th className="p-2 text-left">Original Codon</th>
              <th className="p-2 text-left">Original w_i</th>
              <th className="p-2 text-left">Optimized Codon</th>
              <th className="p-2 text-left">Optimized w_i</th>
              <th
                className="p-2 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={() => handleSort('cai_improvement')}
              >
                <div className="flex items-center gap-1">
                  Improvement
                  {sortField === 'cai_improvement' && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedChanges.map((change) => (
              <tr
                key={change.position}
                className={`border-b border-slate-200 dark:border-slate-700 ${getImprovementColor(change.improvement)} ${
                  selectedPositions.has(change.position) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedPositions.has(change.position)}
                    onChange={() => toggleSelection(change.position)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="p-2">{change.position + 1}</td>
                <td className="p-2 font-bold">{change.amino_acid}</td>
                <td className="p-2 font-mono">{change.original}</td>
                <td className="p-2">{change.originalWi.toFixed(3)}</td>
                <td className="p-2 font-mono text-green-700 dark:text-green-300 font-bold">{change.optimized}</td>
                <td className="p-2 text-green-700 dark:text-green-300 font-bold">{change.finalWi.toFixed(3)}</td>
                <td className="p-2">
                  <span className={`font-semibold ${
                    change.improvement > 0.3 ? 'text-green-700 dark:text-green-300' :
                    change.improvement > 0.1 ? 'text-green-600 dark:text-green-400' :
                    change.improvement > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-slate-600 dark:text-slate-400'
                  }`}>
                    +{change.improvement.toFixed(3)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <div className="text-sm font-semibold mb-2">Color Legend (by improvement magnitude):</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 border border-slate-300 dark:border-slate-600 rounded"></div>
            <span>&gt; 0.3 (Excellent)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-50 dark:bg-green-900/20 border border-slate-300 dark:border-slate-600 rounded"></div>
            <span>0.1 - 0.3 (Good)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-50 dark:bg-yellow-900/20 border border-slate-300 dark:border-slate-600 rounded"></div>
            <span>0 - 0.1 (Moderate)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
