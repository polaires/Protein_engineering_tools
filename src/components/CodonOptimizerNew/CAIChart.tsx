/**
 * CAI Chart Component
 * Visualizes w_i values across the sequence using Recharts
 * Shows mean and standard deviation reference lines
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Tooltip } from './Tooltip';

interface CAIChartProps {
  w_i_values: number[];
  codons: string[];
  title: string;
}

export const CAIChart: React.FC<CAIChartProps> = ({ w_i_values, codons, title }) => {
  if (!w_i_values || w_i_values.length === 0) {
    return <div className="cai-chart empty">No data to display</div>;
  }

  // Calculate statistics
  const mean = w_i_values.reduce((sum, val) => sum + val, 0) / w_i_values.length;
  const variance = w_i_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / w_i_values.length;
  const stdDev = Math.sqrt(variance);
  const maxWi = Math.max(...w_i_values);
  const minWi = Math.min(...w_i_values);

  // Prepare data for Recharts
  const chartData = w_i_values.map((wi, index) => ({
    position: index + 1,
    w_i: wi,
    codon: codons[index],
    mean: mean,
    upperStd: mean + stdDev,
    lowerStd: mean - stdDev,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}>
          <p><strong>Position:</strong> {data.position}</p>
          <p><strong>Codon:</strong> {data.codon}</p>
          <p><strong>w_i:</strong> {data.w_i.toFixed(3)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cai-chart">
      <h4>
        <Tooltip text="Relative Adaptiveness (w_i) is a measure for each codon showing how frequently it's used in highly expressed E. coli genes compared to other codons for the same amino acid. Values range from 0 to 1, where 1 indicates the most frequently used codon.">
          {title}
        </Tooltip>
      </h4>

      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Mean:</span>
          <span className="stat-value">{mean.toFixed(3)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Std Dev:</span>
          <span className="stat-value">{stdDev.toFixed(3)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Min:</span>
          <span className="stat-value">{minWi.toFixed(3)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max:</span>
          <span className="stat-value">{maxWi.toFixed(3)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Codons:</span>
          <span className="stat-value">{w_i_values.length}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="position"
            label={{ value: 'Codon Position', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{ value: 'Relative Adaptiveness (w_i)', angle: -90, position: 'insideLeft' }}
            domain={[0, 1]}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend />

          {/* Mean line */}
          <ReferenceLine
            y={mean}
            stroke="#666"
            strokeDasharray="5 5"
            label={{ value: 'Mean', position: 'right' }}
          />

          {/* Standard deviation lines */}
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

          {/* w_i values line */}
          <Line
            type="monotone"
            dataKey="w_i"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name="w_i"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#8884d8' }}></span>
          <span>Relative Adaptiveness (w_i)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#666' }}></span>
          <span>Mean (dashed)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#999' }}></span>
          <span>±1 Standard Deviation</span>
        </div>
      </div>
    </div>
  );
};
