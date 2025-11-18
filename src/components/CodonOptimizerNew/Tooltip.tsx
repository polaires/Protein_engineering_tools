/**
 * Tooltip Component
 * Displays helpful information on hover
 */

import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  return (
    <div className="tooltip-wrapper">
      {children}
      <span className="tooltip-icon">?</span>
      <div className="tooltip-text">{text}</div>
    </div>
  );
};
