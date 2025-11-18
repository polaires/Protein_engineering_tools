/**
 * Enzyme Selector Component
 * Allows selection of restriction enzymes to avoid during optimization
 * Includes quick selection buttons for common enzyme sets
 */

import React, { useState } from 'react';
import { RestrictionEnzyme } from '../../types/codon';
import restrictionEnzymesData from '../../data/restriction_enzymes.json';

interface EnzymeSelectorProps {
  selectedEnzymes: string[];
  onEnzymesChange: (enzymes: string[]) => void;
}

// Common enzyme sets
const ENZYME_SETS = {
  COMMON: ['EcoRI', 'BamHI', 'HindIII', 'PstI', 'SalI', 'XhoI', 'NotI', 'XbaI'],
  GOLDEN_GATE: ['BsaI', 'BsmBI', 'BbsI'],
  CLONING: ['EcoRI', 'BamHI', 'HindIII', 'PstI', 'SalI', 'XhoI', 'NotI', 'XbaI', 'KpnI', 'SacI', 'SpeI', 'NheI'],
  RARE_CUTTERS: ['NotI', 'SfiI', 'PacI', 'AscI', 'FseI', 'PmeI'],
};

export const EnzymeSelector: React.FC<EnzymeSelectorProps> = ({ selectedEnzymes, onEnzymesChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const restrictionEnzymesJSON = restrictionEnzymesData as any;
  const enzymes = restrictionEnzymesJSON.enzymes as Record<string, RestrictionEnzyme>;
  const enzymeNames = Object.keys(enzymes).sort();

  const handleEnzymeToggle = (enzymeName: string) => {
    if (selectedEnzymes.includes(enzymeName)) {
      onEnzymesChange(selectedEnzymes.filter(e => e !== enzymeName));
    } else {
      onEnzymesChange([...selectedEnzymes, enzymeName]);
    }
  };

  const handleSelectSet = (set: string[]) => {
    // Add all enzymes from the set that aren't already selected
    const newSelection = [...new Set([...selectedEnzymes, ...set])];
    onEnzymesChange(newSelection);
  };

  const handleSelectAll = () => {
    onEnzymesChange(enzymeNames);
  };

  const handleSelectNone = () => {
    onEnzymesChange([]);
  };

  const filteredEnzymes = searchTerm
    ? enzymeNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    : enzymeNames;

  const displayedEnzymes = showAll ? filteredEnzymes : filteredEnzymes.slice(0, 20);

  return (
    <div className="enzyme-selector">
      <div className="selector-header">
        <h3>Restriction Enzymes to Avoid</h3>
        <div className="selection-count">
          {selectedEnzymes.length} selected
        </div>
      </div>

      <div className="quick-actions">
        <button
          className="quick-action-btn"
          onClick={() => handleSelectSet(ENZYME_SETS.COMMON)}
          title="Select common cloning enzymes"
        >
          Common
        </button>
        <button
          className="quick-action-btn"
          onClick={() => handleSelectSet(ENZYME_SETS.GOLDEN_GATE)}
          title="Select Golden Gate assembly enzymes"
        >
          Golden Gate
        </button>
        <button
          className="quick-action-btn"
          onClick={() => handleSelectSet(ENZYME_SETS.CLONING)}
          title="Select extended cloning set"
        >
          Cloning Set
        </button>
        <button
          className="quick-action-btn"
          onClick={() => handleSelectSet(ENZYME_SETS.RARE_CUTTERS)}
          title="Select rare-cutting enzymes"
        >
          Rare Cutters
        </button>
        <button
          className="quick-action-btn"
          onClick={handleSelectAll}
          title="Select all enzymes"
        >
          All
        </button>
        <button
          className="quick-action-btn danger"
          onClick={handleSelectNone}
          title="Clear selection"
        >
          None
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search enzymes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="enzyme-list">
        {displayedEnzymes.map((enzymeName) => {
          const enzyme = enzymes[enzymeName];
          const isSelected = selectedEnzymes.includes(enzymeName);

          return (
            <div
              key={enzymeName}
              className={`enzyme-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleEnzymeToggle(enzymeName)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}} // Handled by div onClick
                className="enzyme-checkbox"
              />
              <div className="enzyme-info">
                <span className="enzyme-name">{enzymeName}</span>
                <span className="enzyme-site">{enzyme.recognition_site}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && filteredEnzymes.length > 20 && (
        <button
          className="show-more-btn"
          onClick={() => setShowAll(true)}
        >
          Show all {filteredEnzymes.length} enzymes
        </button>
      )}

      {showAll && (
        <button
          className="show-more-btn"
          onClick={() => setShowAll(false)}
        >
          Show less
        </button>
      )}

      {selectedEnzymes.length > 0 && (
        <div className="selected-enzymes">
          <h4>Selected Enzymes:</h4>
          <div className="selected-tags">
            {selectedEnzymes.map((enzymeName) => (
              <span key={enzymeName} className="enzyme-tag">
                {enzymeName}
                <button
                  className="remove-tag"
                  onClick={() => handleEnzymeToggle(enzymeName)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
