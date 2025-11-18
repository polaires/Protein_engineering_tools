/**
 * Help Panel Component
 * Provides documentation and guidance for using the Codon Optimizer
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const HelpPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="help-panel">
      <button
        className="help-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <HelpCircle size={20} />
        <span>Documentation & Help</span>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isExpanded && (
        <div className="help-panel-content">
          <section className="help-section">
            <h3>What is CAI and Why Does It Matter?</h3>
            <p>
              The <strong>Codon Adaptation Index (CAI)</strong> is a measure of how well your DNA sequence
              matches the codon usage patterns of highly expressed genes in <em>E. coli</em>.
            </p>
            <ul>
              <li><strong>Higher CAI (0.8-1.0):</strong> Better alignment with E. coli preferences, typically results in higher protein expression</li>
              <li><strong>Lower CAI (&lt;0.5):</strong> Poor match with E. coli codon usage, may result in low expression or protein misfolding</li>
              <li><strong>Why it matters:</strong> Using preferred codons can increase translation efficiency, reduce ribosome stalling, and improve protein yield</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>When to Use Restriction Site Removal</h3>
            <p>
              Enable this option when you need to clone your optimized sequence into a plasmid vector:
            </p>
            <ul>
              <li><strong>Standard cloning:</strong> Remove common restriction sites (EcoRI, BamHI, XhoI, etc.) that might interfere with your cloning strategy</li>
              <li><strong>Custom enzyme selection:</strong> Select specific enzymes you're using in your cloning protocol</li>
              <li><strong>Important:</strong> Removing restriction sites may slightly reduce CAI as alternative codons are used</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>When to Use Terminator Removal</h3>
            <p>
              Enable this to eliminate Rho-independent transcription terminators:
            </p>
            <ul>
              <li><strong>Terminators:</strong> Secondary structures (stem-loops followed by poly-U) that can cause premature transcription termination</li>
              <li><strong>Use when:</strong> You want to ensure full-length mRNA transcription</li>
              <li><strong>Note:</strong> Some terminator-like structures may be functionally important; use with caution for regulatory sequences</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>How to Interpret Your Results</h3>
            <div className="help-subsection">
              <h4>CAI Score Interpretation:</h4>
              <ul>
                <li><strong>0.92-1.0 (Excellent):</strong> Highly optimized, expect good expression</li>
                <li><strong>0.80-0.92 (Good):</strong> Well optimized, suitable for most applications</li>
                <li><strong>0.50-0.80 (Moderate):</strong> Average optimization, may benefit from further improvement</li>
                <li><strong>&lt;0.50 (Poor):</strong> Suboptimal, likely to have expression issues</li>
              </ul>
            </div>

            <div className="help-subsection">
              <h4>GC Content:</h4>
              <ul>
                <li><strong>48-54% (Optimal):</strong> Matches E. coli genome average</li>
                <li><strong>40-60% (Acceptable):</strong> Should express well in most cases</li>
                <li><strong>&lt;40% or &gt;60% (Caution):</strong> May affect mRNA stability, translation efficiency, or gene synthesis</li>
              </ul>
            </div>

            <div className="help-subsection">
              <h4>Change Rate:</h4>
              <ul>
                <li><strong>&lt;20%:</strong> Sequence already well-optimized</li>
                <li><strong>20-50%:</strong> Moderate optimization performed</li>
                <li><strong>&gt;50%:</strong> Extensive optimization (verify protein sequence remains correct)</li>
              </ul>
            </div>
          </section>

          <section className="help-section">
            <h3>Best Practices for Sequence Optimization</h3>
            <ol>
              <li>
                <strong>Start with your protein sequence:</strong> If you have flexibility, input the protein
                sequence and let the optimizer generate optimal DNA
              </li>
              <li>
                <strong>Verify protein translation:</strong> Always check that the optimized DNA translates to
                your intended protein sequence
              </li>
              <li>
                <strong>Consider your cloning strategy first:</strong> Select restriction enzymes to remove
                before optimization for best results
              </li>
              <li>
                <strong>Balance CAI with GC content:</strong> Extremely high CAI at the cost of extreme GC
                content may not always be beneficial
              </li>
              <li>
                <strong>Check for unwanted features:</strong> Review the optimized sequence for any unintended
                regulatory elements or secondary structures
              </li>
              <li>
                <strong>Save important results:</strong> Use the session manager to save up to 5 optimization
                results for comparison
              </li>
              <li>
                <strong>Sequence length considerations:</strong>
                <ul>
                  <li>Short sequences (&lt;100bp): May not show significant CAI improvement</li>
                  <li>Medium sequences (100-3000bp): Optimal for this tool</li>
                  <li>Long sequences (&gt;5kb): Expect 2-10 seconds for optimization</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="help-section">
            <h3>Common Issues & Solutions</h3>
            <div className="help-subsection">
              <h4>CAI didn't improve much:</h4>
              <ul>
                <li>Your sequence may already use optimal codons</li>
                <li>Constraint-based optimization (restriction sites, terminators) limits codon choices</li>
                <li>Some amino acids have limited codon options</li>
              </ul>
            </div>

            <div className="help-subsection">
              <h4>GC content changed significantly:</h4>
              <ul>
                <li>This is normal - optimal codons may have different GC content</li>
                <li>If GC becomes extreme (&lt;30% or &gt;70%), consider accepting a slightly lower CAI</li>
              </ul>
            </div>

            <div className="help-subsection">
              <h4>Some restriction sites couldn't be removed:</h4>
              <ul>
                <li>Some sites may be unavoidable while maintaining the protein sequence</li>
                <li>Try removing fewer enzymes or accept slight CAI reduction</li>
              </ul>
            </div>
          </section>

          <section className="help-section">
            <h3>Scientific Background</h3>
            <p>
              This tool implements the CAI algorithm from <strong>Sharp & Li (1987)</strong> using
              <em>E. coli</em> K-12 codon usage tables from <strong>Carbone et al. (2003)</strong>.
            </p>
            <p>
              The algorithm selects codons based on their relative adaptiveness (w_i), which represents
              how frequently each codon is used compared to other synonymous codons in highly expressed genes.
            </p>
            <p className="help-formula">
              CAI = exp(Σ ln(w_i) / L)
            </p>
            <p style={{ fontSize: '13px', color: '#666' }}>
              Where w_i is the relative adaptiveness of codon i, and L is the number of codons (excluding start/stop).
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
