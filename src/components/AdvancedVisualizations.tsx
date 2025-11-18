/**
 * Advanced Visualization Components
 * Enhanced charts with zoom, pan, brush selection, and export capabilities
 */

import { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { OptimizationResponse } from '@/types/codon';

interface EnhancedCAIChartProps {
  result: OptimizationResponse;
  type: 'original' | 'optimized' | 'final';
}

export function EnhancedCAIChart({ result, type }: EnhancedCAIChartProps) {
  const chartRef = useRef<any>(null);
  const [showBrush, setShowBrush] = useState(false);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);

  const w_i_values = type === 'original' ? result.w_i_values_original :
                     type === 'optimized' ? result.w_i_values_optimized :
                     result.w_i_values_final;

  const codons = type === 'original' ? result.codons_original :
                 type === 'optimized' ? result.codons_optimized :
                 result.codons_final;

  const cai = type === 'original' ? result.original_cai :
              type === 'optimized' ? result.optimized_cai :
              result.final_cai;

  const mean = w_i_values.reduce((sum, val) => sum + val, 0) / w_i_values.length;
  const variance = w_i_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / w_i_values.length;
  const stdDev = Math.sqrt(variance);

  const chartData = w_i_values.map((wi, index) => ({
    position: index + 1,
    w_i: wi,
    codon: codons[index],
    mean: mean,
  }));

  const exportChart = () => {
    // Export as CSV
    const csv = [
      ['Position', 'Codon', 'w_i', 'Mean'].join(','),
      ...chartData.map(d => [d.position, d.codon, d.w_i.toFixed(4), d.mean.toFixed(4)].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cai_chart_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSVG = () => {
    if (chartRef.current) {
      const svg = chartRef.current.container.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cai_chart_${type}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const resetZoom = () => {
    setZoomDomain(null);
  };

  const title = type === 'original' ? 'Original Sequence' :
                type === 'optimized' ? 'Optimized Sequence' :
                'Final Sequence';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {title} (CAI: {cai.toFixed(3)})
        </h4>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBrush(!showBrush)}
            className="btn-icon"
            title={showBrush ? 'Hide brush' : 'Show brush for zooming'}
          >
            {showBrush ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          {zoomDomain && (
            <button
              onClick={resetZoom}
              className="btn-icon"
              title="Reset zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={exportChart}
            className="btn-icon"
            title="Export as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={exportSVG}
            className="btn-icon"
            title="Export as SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Mean</div>
          <div className="text-lg font-bold">{mean.toFixed(3)}</div>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Std Dev</div>
          <div className="text-lg font-bold">{stdDev.toFixed(3)}</div>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Min</div>
          <div className="text-lg font-bold">{Math.min(...w_i_values).toFixed(3)}</div>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Max</div>
          <div className="text-lg font-bold">{Math.max(...w_i_values).toFixed(3)}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400} ref={chartRef}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 60, left: 100, bottom: showBrush ? 70 : 50 }}
          onMouseDown={(e: any) => {
            if (e && e.activeLabel) {
              setZoomDomain([e.activeLabel - 50, e.activeLabel + 50]);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="position"
            label={{ value: 'Codon Position', position: 'insideBottom', offset: -10 }}
            domain={zoomDomain || ['dataMin', 'dataMax']}
          />
          <YAxis
            label={{ value: 'Relative Adaptiveness (w_i)', angle: -90, position: 'insideLeft', offset: 15 }}
            domain={[0, 1]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm"><strong>Position:</strong> {data.position}</p>
                    <p className="text-sm"><strong>Codon:</strong> {data.codon}</p>
                    <p className="text-sm"><strong>w_i:</strong> {data.w_i.toFixed(3)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <ReferenceLine
            y={mean}
            stroke="#666"
            strokeDasharray="5 5"
            label={{ value: 'Mean', position: 'right' }}
          />
          <ReferenceLine
            y={mean + stdDev}
            stroke="#999"
            strokeDasharray="3 3"
            label={{ value: '+1σ', position: 'right' }}
          />
          <ReferenceLine
            y={mean - stdDev}
            stroke="#999"
            strokeDasharray="3 3"
            label={{ value: '-1σ', position: 'right' }}
          />
          <Line
            type="monotone"
            dataKey="w_i"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name="w_i"
          />
          {showBrush && (
            <Brush
              dataKey="position"
              height={30}
              stroke="#8884d8"
              onChange={(e: any) => {
                if (e && e.startIndex !== undefined && e.endIndex !== undefined) {
                  setZoomDomain([e.startIndex, e.endIndex]);
                }
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CodonUsageHeatmapProps {
  result: OptimizationResponse;
}

export function CodonUsageHeatmap({ result }: CodonUsageHeatmapProps) {
  // Calculate codon frequency in the optimized sequence
  const codonCounts: Record<string, number> = {};
  result.codons_final.forEach(codon => {
    codonCounts[codon] = (codonCounts[codon] || 0) + 1;
  });

  // Group by amino acid
  const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY*'.split('');
  const codonTable: Record<string, string[]> = {
    'A': ['GCT', 'GCC', 'GCA', 'GCG'],
    'C': ['TGT', 'TGC'],
    'D': ['GAT', 'GAC'],
    'E': ['GAA', 'GAG'],
    'F': ['TTT', 'TTC'],
    'G': ['GGT', 'GGC', 'GGA', 'GGG'],
    'H': ['CAT', 'CAC'],
    'I': ['ATT', 'ATC', 'ATA'],
    'K': ['AAA', 'AAG'],
    'L': ['TTA', 'TTG', 'CTT', 'CTC', 'CTA', 'CTG'],
    'M': ['ATG'],
    'N': ['AAT', 'AAC'],
    'P': ['CCT', 'CCC', 'CCA', 'CCG'],
    'Q': ['CAA', 'CAG'],
    'R': ['CGT', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
    'S': ['TCT', 'TCC', 'TCA', 'TCG', 'AGT', 'AGC'],
    'T': ['ACT', 'ACC', 'ACA', 'ACG'],
    'V': ['GTT', 'GTC', 'GTA', 'GTG'],
    'W': ['TGG'],
    'Y': ['TAT', 'TAC'],
    '*': ['TAA', 'TAG', 'TGA'],
  };

  const heatmapData: Array<{aa: string; codon: string; count: number; percentage: number}> = [];

  aminoAcids.forEach(aa => {
    const codons = codonTable[aa] || [];
    const totalForAA = codons.reduce((sum, codon) => sum + (codonCounts[codon] || 0), 0);

    codons.forEach(codon => {
      const count = codonCounts[codon] || 0;
      const percentage = totalForAA > 0 ? (count / totalForAA) * 100 : 0;
      heatmapData.push({ aa, codon, count, percentage });
    });
  });

  // Get color based on percentage
  const getColor = (percentage: number) => {
    if (percentage === 0) return '#f0f0f0';
    if (percentage < 20) return '#fef3c7';
    if (percentage < 40) return '#fde68a';
    if (percentage < 60) return '#fcd34d';
    if (percentage < 80) return '#fbbf24';
    return '#f59e0b';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Codon Usage Heatmap (Optimized Sequence)
        </h4>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          This heatmap shows the distribution of synonymous codons for each amino acid in the optimized sequence.
          Darker colors indicate more frequent usage of that particular codon.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-1 gap-4">
          {aminoAcids.map(aa => {
            const aaData = heatmapData.filter(d => d.aa === aa);
            const total = aaData.reduce((sum, d) => sum + d.count, 0);

            if (total === 0) return null;

            return (
              <div key={aa} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 mb-3">
                  <div className="font-bold text-lg w-8">{aa}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Total: {total} codons
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {aaData.map(d => (
                    <div
                      key={d.codon}
                      className="p-3 rounded text-center border border-slate-300 dark:border-slate-600"
                      style={{ backgroundColor: getColor(d.percentage) }}
                    >
                      <div className="font-mono font-bold text-sm">{d.codon}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {d.count} ({d.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded">
        <div className="text-sm font-semibold">Legend:</div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded" style={{ backgroundColor: '#f0f0f0' }}></div>
          <span className="text-xs">0%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded" style={{ backgroundColor: '#fcd34d' }}></div>
          <span className="text-xs">50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
          <span className="text-xs">100%</span>
        </div>
      </div>
    </div>
  );
}

interface GCContentWindowProps {
  result: OptimizationResponse;
  windowSize?: number;
}

export function GCContentWindow({ result, windowSize = 50 }: GCContentWindowProps) {
  const sequence = result.final_sequence;

  // Calculate GC content for sliding windows
  const calculateGCForWindow = (seq: string, start: number, size: number) => {
    const window = seq.substring(start, start + size);
    const gcCount = (window.match(/[GC]/g) || []).length;
    return (gcCount / window.length) * 100;
  };

  const windowData = [];
  for (let i = 0; i <= sequence.length - windowSize; i += 10) {
    windowData.push({
      position: i + windowSize / 2,
      gcContent: calculateGCForWindow(sequence, i, windowSize),
    });
  }

  const optimalGCMin = 40;
  const optimalGCMax = 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          GC Content Sliding Window Analysis
        </h4>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Shows GC content variation across the sequence using a {windowSize}bp sliding window.
          The green band (40-60%) represents the optimal GC range for E. coli.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={windowData} margin={{ top: 20, right: 60, left: 90, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="position"
            label={{ value: 'Position (bp)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            label={{ value: 'GC Content (%)', angle: -90, position: 'insideLeft', offset: 15 }}
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded shadow-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm"><strong>Position:</strong> {data.position.toFixed(0)} bp</p>
                    <p className="text-sm"><strong>GC%:</strong> {data.gcContent.toFixed(1)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <ReferenceLine y={optimalGCMin} stroke="#10b981" strokeDasharray="3 3" label="40%" />
          <ReferenceLine y={optimalGCMax} stroke="#10b981" strokeDasharray="3 3" label="60%" />
          <Line
            type="monotone"
            dataKey="gcContent"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="GC Content"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Window Size</div>
          <div className="text-lg font-bold">{windowSize} bp</div>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Average GC</div>
          <div className="text-lg font-bold">
            {(windowData.reduce((sum, d) => sum + d.gcContent, 0) / windowData.length).toFixed(1)}%
          </div>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded">
          <div className="text-xs text-slate-600 dark:text-slate-400">Data Points</div>
          <div className="text-lg font-bold">{windowData.length}</div>
        </div>
      </div>
    </div>
  );
}
