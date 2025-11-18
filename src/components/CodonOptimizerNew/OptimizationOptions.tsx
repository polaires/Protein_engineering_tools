/**
 * Optimization Options Component
 * Settings panel for optimization parameters
 */

import React from 'react';
import { OptimizationRequest } from '../../types/codon';

interface OptimizationOptionsProps {
  options: Partial<OptimizationRequest>;
  onChange: (options: Partial<OptimizationRequest>) => void;
}

const COMMON_ENZYMES = [
  'EcoRI', 'BamHI', 'HindIII', 'PstI', 'SalI', 'XbaI', 'XhoI',
  'NotI', 'SacI', 'KpnI', 'SmaI', 'EcoRV', 'BsaI', 'BsmBI',
];

export const OptimizationOptions: React.FC<OptimizationOptionsProps> = ({
  options,
  onChange,
}) => {
  const handleCheckboxChange = (field: keyof OptimizationRequest) => {
    onChange({ ...options, [field]: !options[field] });
  };

  const handleEnzymeToggle = (enzyme: string) => {
    const currentEnzymes = options.selected_enzymes || [];
    const newEnzymes = currentEnzymes.includes(enzyme)
      ? currentEnzymes.filter((e) => e !== enzyme)
      : [...currentEnzymes, enzyme];

    onChange({ ...options, selected_enzymes: newEnzymes });
  };

  const handleEndLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({ ...options, end_length: value });
  };

  return (
    <div className="optimization-options">
      <h3>Optimization Options</h3>

      <div className="option-section">
        <label className="option-checkbox">
          <input
            type="checkbox"
            checked={options.remove_restriction_sites || false}
            onChange={() => handleCheckboxChange('remove_restriction_sites')}
          />
          <span>Remove Restriction Sites</span>
        </label>

        {options.remove_restriction_sites && (
          <div className="enzyme-selector">
            <p className="enzyme-label">Select enzymes (leave empty for all):</p>
            <div className="enzyme-grid">
              {COMMON_ENZYMES.map((enzyme) => (
                <label key={enzyme} className="enzyme-checkbox">
                  <input
                    type="checkbox"
                    checked={options.selected_enzymes?.includes(enzyme) || false}
                    onChange={() => handleEnzymeToggle(enzyme)}
                  />
                  <span>{enzyme}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="option-section">
        <label className="option-checkbox">
          <input
            type="checkbox"
            checked={options.remove_terminators || false}
            onChange={() => handleCheckboxChange('remove_terminators')}
          />
          <span>Remove Rho-independent Terminators</span>
        </label>
      </div>

      <div className="option-section">
        <label className="option-checkbox">
          <input
            type="checkbox"
            checked={options.optimize_ends || false}
            onChange={() => handleCheckboxChange('optimize_ends')}
          />
          <span>Optimize Terminal Regions for PCR</span>
        </label>

        {options.optimize_ends && (
          <div className="end-length-input">
            <label>
              Terminal region length (bp):
              <input
                type="number"
                min="12"
                max="60"
                value={options.end_length || 24}
                onChange={handleEndLengthChange}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
