/**
 * Minimalist Apothecary-Style Recipe Label Component
 * Generates printable labels with brutalist/pharmacy aesthetic
 */

import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { Recipe } from '@/types';
import { convertToMilliliters } from '@/utils/calculations';

interface RecipeLabelProps {
  recipe: Recipe;
  onClose: () => void;
  batchNumber?: string;
}

export default function RecipeLabel({ recipe, onClose, batchNumber }: RecipeLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Format date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Calculate total volume in mL
  const volumeInML = convertToMilliliters(recipe.totalVolume, recipe.volumeUnit);

  // Generate batch/formula number
  const formulaNumber = batchNumber || `F${Date.now().toString().slice(-6)}`;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          {/* Header with controls - only visible on screen, not in print */}
          <div className="print:hidden sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recipe Label</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="btn-primary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Label
              </button>
              <button
                onClick={onClose}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Label Content */}
          <div
            ref={labelRef}
            className="p-8 bg-white text-black recipe-label-content"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            {/* Product Name */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '12px',
                letterSpacing: '1px'
              }}
            >
              {recipe.name.toUpperCase()}
            </div>

            {/* Formula Number and Volume */}
            <div style={{ marginBottom: '4px' }}>
              FORMULA {formulaNumber}
            </div>
            <div style={{ marginBottom: '4px' }}>
              {volumeInML} mL{recipe.pH ? ` / pH ${recipe.pH}` : ''}
            </div>

            {/* Description/Purpose */}
            {recipe.description && (
              <div style={{ marginTop: '12px', marginBottom: '4px' }}>
                FUNCTIONALITY: {recipe.description.toUpperCase()}
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                borderTop: '1px solid black',
                marginTop: '16px',
                marginBottom: '16px'
              }}
            />

            {/* Active Ingredients */}
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              ACTIVE INGREDIENTS:
            </div>

            {recipe.components.map((component, index) => {
              const componentName = component.chemical?.commonName || component.chemicalId;
              const mass = component.mass || 0;
              const massText = mass >= 1
                ? `${mass.toFixed(2)}g`
                : mass >= 0.001
                ? `${(mass * 1000).toFixed(1)}mg`
                : `${(mass * 1000000).toFixed(1)}μg`;

              // Create dotted line
              const nameLength = componentName.length;
              const valueLength = massText.length;
              const totalWidth = 45; // Approximate character width for alignment
              const dotsNeeded = Math.max(2, totalWidth - nameLength - valueLength);
              const dots = '.'.repeat(dotsNeeded);

              return (
                <div key={index} style={{ marginBottom: '2px' }}>
                  {componentName}{dots}{massText}
                </div>
              );
            })}

            {/* Preparation Instructions */}
            {recipe.instructions && recipe.instructions.length > 0 && (
              <>
                <div
                  style={{
                    borderTop: '1px solid black',
                    marginTop: '16px',
                    marginBottom: '16px'
                  }}
                />
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  PREPARATION:
                </div>
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {index + 1}. {instruction}
                  </div>
                ))}
              </>
            )}

            {/* Notes */}
            {recipe.notes && (
              <>
                <div
                  style={{
                    borderTop: '1px solid black',
                    marginTop: '16px',
                    marginBottom: '16px'
                  }}
                />
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  NOTES:
                </div>
                <div>{recipe.notes}</div>
              </>
            )}

            {/* Divider */}
            <div
              style={{
                borderTop: '1px solid black',
                marginTop: '16px',
                marginBottom: '16px'
              }}
            />

            {/* Manufacturing Date and Storage */}
            <div style={{ marginBottom: '4px' }}>
              MANUFACTURED: {currentDate}
            </div>
            <div style={{ marginBottom: '4px' }}>
              STORAGE: Store at 4°C unless otherwise noted
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '24px',
                fontSize: '11px',
                color: '#666'
              }}
            >
              FOR RESEARCH USE ONLY
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .recipe-label-content,
          .recipe-label-content * {
            visibility: visible;
          }
          .recipe-label-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
        }
        @page {
          size: auto;
          margin: 15mm;
        }
      `}</style>
    </>
  );
}
