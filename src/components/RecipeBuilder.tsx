/**
 * Custom Recipe Builder Component
 * Allows creating multi-component solutions with concentration multipliers
 */

import { useState } from 'react';
import { Plus, Trash2, Save, X, Beaker, FileText } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import ChemicalSearch from './ChemicalSearch';
import RecipeLabel from './RecipeLabel';
import {
  Chemical,
  Recipe,
  RecipeComponent,
  RecipeCategory,
  ConcentrationUnit,
  VolumeUnit,
} from '@/types';
import { calculateMass, convertToMolarity, convertToMilliliters } from '@/utils/calculations';

interface RecipeBuilderComponent extends RecipeComponent {
  tempId: string;
  chemical?: Chemical;
}

export default function RecipeBuilder() {
  const { addRecipe, showToast } = useApp();

  // Recipe metadata
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeCategory, setRecipeCategory] = useState<RecipeCategory>(RecipeCategory.CUSTOM);
  const [totalVolume, setTotalVolume] = useState<number>(1000);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>(VolumeUnit.MILLILITER);
  const [targetpH, setTargetpH] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Concentration multiplier (1×, 2×, 5×, 10×, etc.)
  const [concentrationMultiplier, setConcentrationMultiplier] = useState<number>(1);
  const [isCustomMultiplier, setIsCustomMultiplier] = useState(false);

  // Components list
  const [components, setComponents] = useState<RecipeBuilderComponent[]>([]);

  // Currently adding component
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [newComponent, setNewComponent] = useState<RecipeBuilderComponent | null>(null);

  // Label preview
  const [showLabel, setShowLabel] = useState(false);

  // Calculate mass for a component
  const calculateComponentMass = (component: RecipeBuilderComponent): number => {
    if (!component.chemical) return 0;

    const molarityInM = convertToMolarity(component.concentration * concentrationMultiplier, component.concentrationUnit);
    const volumeInML = convertToMilliliters(totalVolume, volumeUnit);
    const mass = calculateMass(molarityInM, volumeInML, component.chemical.molecularWeight);

    return mass;
  };

  // Check solubility warnings
  const getSolubilityWarning = (component: RecipeBuilderComponent): string | null => {
    if (!component.chemical) return null;

    const mass = calculateComponentMass(component);
    const volumeInML = convertToMilliliters(totalVolume, volumeUnit);
    const concentration = (mass / volumeInML) * 1000; // mg/mL

    // General solubility limits (these are approximate)
    if (concentration > 500) {
      return `Very high concentration (${concentration.toFixed(0)} mg/mL). May exceed solubility limit.`;
    } else if (concentration > 200) {
      return `High concentration (${concentration.toFixed(0)} mg/mL). Check solubility data.`;
    }

    return null;
  };

  // Add component to list
  const handleAddComponent = () => {
    if (!newComponent || !newComponent.chemical) {
      showToast('error', 'Please select a chemical');
      return;
    }

    if (newComponent.concentration <= 0) {
      showToast('error', 'Concentration must be greater than 0');
      return;
    }

    setComponents([...components, { ...newComponent, tempId: Date.now().toString() }]);
    setNewComponent(null);
    setShowAddComponent(false);
    showToast('success', `Added ${newComponent.chemical.commonName} to recipe`);
  };

  // Remove component
  const handleRemoveComponent = (tempId: string) => {
    setComponents(components.filter(c => c.tempId !== tempId));
    showToast('info', 'Component removed');
  };

  // Update component concentration
  const handleUpdateConcentration = (tempId: string, concentration: number, unit: ConcentrationUnit) => {
    setComponents(
      components.map(c =>
        c.tempId === tempId ? { ...c, concentration, concentrationUnit: unit } : c
      )
    );
  };

  // Save recipe
  const handleSaveRecipe = async () => {
    // Validation
    if (!recipeName.trim()) {
      showToast('error', 'Please enter a recipe name');
      return;
    }

    if (components.length === 0) {
      showToast('error', 'Please add at least one component');
      return;
    }

    if (totalVolume <= 0) {
      showToast('error', 'Volume must be greater than 0');
      return;
    }

    // Create recipe object
    const recipe: Recipe = {
      id: `custom-${Date.now()}`,
      name: concentrationMultiplier > 1 ? `${concentrationMultiplier}× ${recipeName}` : recipeName,
      description: recipeDescription || undefined,
      category: recipeCategory,
      components: components.map(c => ({
        chemicalId: c.chemical!.id,
        concentration: c.concentration * concentrationMultiplier,
        concentrationUnit: c.concentrationUnit,
        notes: c.notes,
      })),
      totalVolume,
      volumeUnit,
      pH: targetpH ? parseFloat(targetpH) : undefined,
      notes: notes || undefined,
      isCustom: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
      tags: ['custom', 'user-created'],
      instructions: generateInstructions(),
    };

    try {
      await addRecipe(recipe);
      showToast('success', `Recipe "${recipe.name}" saved successfully!`);
      handleClearAll();
    } catch (error) {
      console.error('Failed to save recipe:', error);
      showToast('error', 'Failed to save recipe');
    }
  };

  // Generate preparation instructions
  const generateInstructions = (): string[] => {
    const instructions: string[] = [];
    const volumeInML = convertToMilliliters(totalVolume, volumeUnit);

    instructions.push(`Prepare ${volumeInML} mL of solution:`);
    instructions.push('');

    components.forEach((component, idx) => {
      const mass = calculateComponentMass(component);
      const massDisplay = mass >= 1 ? `${mass.toFixed(3)} g` : `${(mass * 1000).toFixed(1)} mg`;
      instructions.push(`${idx + 1}. Add ${massDisplay} of ${component.chemical!.commonName}`);
    });

    instructions.push('');
    instructions.push(`Add distilled water to ~${(volumeInML * 0.8).toFixed(0)} mL`);

    if (targetpH) {
      instructions.push(`Adjust pH to ${targetpH} with HCl or NaOH`);
    }

    instructions.push(`Bring final volume to ${volumeInML} mL with distilled water`);
    instructions.push('Mix thoroughly until all components are dissolved');

    if (concentrationMultiplier > 1) {
      instructions.push('');
      instructions.push(`Note: This is a ${concentrationMultiplier}× concentrated stock solution`);
      instructions.push(`Dilute 1:${concentrationMultiplier} for working solution (e.g., ${(volumeInML / concentrationMultiplier).toFixed(0)} mL stock + ${(volumeInML * (concentrationMultiplier - 1) / concentrationMultiplier).toFixed(0)} mL water)`);
    }

    return instructions;
  };

  // Clear all
  const handleClearAll = () => {
    setRecipeName('');
    setRecipeDescription('');
    setRecipeCategory(RecipeCategory.CUSTOM);
    setTotalVolume(1000);
    setVolumeUnit(VolumeUnit.MILLILITER);
    setTargetpH('');
    setNotes('');
    setConcentrationMultiplier(1);
    setComponents([]);
    setNewComponent(null);
    setShowAddComponent(false);
  };

  // Calculate total mass
  const totalMass = components.reduce((sum, component) => sum + calculateComponentMass(component), 0);

  // Build preview recipe for label
  const buildPreviewRecipe = (): Recipe => {
    return {
      id: `preview-${Date.now()}`,
      name: concentrationMultiplier > 1 ? `${concentrationMultiplier}× ${recipeName || 'Untitled Recipe'}` : (recipeName || 'Untitled Recipe'),
      description: recipeDescription || undefined,
      category: recipeCategory,
      components: components.map(c => ({
        chemicalId: c.chemical!.id,
        chemical: c.chemical,
        concentration: c.concentration * concentrationMultiplier,
        concentrationUnit: c.concentrationUnit,
        mass: calculateComponentMass(c),
        notes: c.notes,
      })),
      totalVolume,
      volumeUnit,
      pH: targetpH ? parseFloat(targetpH) : undefined,
      notes: notes || undefined,
      instructions: generateInstructions(),
      isCustom: true,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h2 className="section-title flex items-center gap-2">
          <Beaker className="w-7 h-7" />
          Custom Recipe Builder
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Create multi-component solutions with automatic mass calculations
        </p>
      </div>

      {/* Recipe Metadata */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Recipe Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="input-label">Recipe Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Custom PBS Buffer"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="input-label">Description</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Optional description of the recipe..."
              value={recipeDescription}
              onChange={(e) => setRecipeDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="input-label">Category</label>
            <select
              className="select-field"
              value={recipeCategory}
              onChange={(e) => setRecipeCategory(e.target.value as RecipeCategory)}
            >
              <option value={RecipeCategory.CUSTOM}>Custom</option>
              <option value={RecipeCategory.BUFFER}>Buffer</option>
              <option value={RecipeCategory.MEDIA}>Media</option>
              <option value={RecipeCategory.STAINING}>Staining</option>
              <option value={RecipeCategory.LYSIS}>Lysis</option>
            </select>
          </div>

          <div>
            <label className="input-label">Target pH (optional)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g., 7.4"
              step="0.1"
              min="0"
              max="14"
              value={targetpH}
              onChange={(e) => setTargetpH(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Solution Parameters */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
          Solution Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Total Volume *</label>
            <input
              type="number"
              className="input-field"
              placeholder="1000"
              step="any"
              min="0"
              value={totalVolume}
              onChange={(e) => setTotalVolume(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="input-label">Volume Unit</label>
            <select
              className="select-field"
              value={volumeUnit}
              onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
            >
              <option value={VolumeUnit.MILLILITER}>mL</option>
              <option value={VolumeUnit.LITER}>L</option>
              <option value={VolumeUnit.MICROLITER}>μL</option>
            </select>
          </div>

          <div>
            <label className="input-label">Concentration Multiplier</label>
            <div className="flex gap-2">
              <select
                className="select-field flex-1"
                value={isCustomMultiplier ? 'custom' : concentrationMultiplier}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    setIsCustomMultiplier(true);
                  } else {
                    setIsCustomMultiplier(false);
                    setConcentrationMultiplier(parseFloat(value));
                  }
                }}
              >
                <option value={1}>1× (Working solution)</option>
                <option value={2}>2× concentrated</option>
                <option value={5}>5× concentrated</option>
                <option value={10}>10× concentrated</option>
                <option value={20}>20× concentrated</option>
                <option value={50}>50× concentrated</option>
                <option value={100}>100× concentrated</option>
                <option value="custom">Custom...</option>
              </select>
              {isCustomMultiplier && (
                <input
                  type="number"
                  className="input-field w-24"
                  placeholder="×"
                  step="any"
                  min="0.1"
                  max="1000"
                  value={concentrationMultiplier}
                  onChange={(e) => setConcentrationMultiplier(parseFloat(e.target.value) || 1)}
                />
              )}
            </div>
          </div>
        </div>

        {concentrationMultiplier > 1 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Creating a {concentrationMultiplier}× concentrated stock solution.
            Dilute 1:{concentrationMultiplier} with water for working solution.
          </div>
        )}
      </div>

      {/* Components List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Components ({components.length})
          </h3>
          <button
            onClick={() => setShowAddComponent(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </button>
        </div>

        {/* Components Table */}
        {components.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Chemical
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Concentration
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Effective Conc.
                  </th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mass Needed
                  </th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map((component) => {
                  const mass = calculateComponentMass(component);
                  const massDisplay = mass >= 1
                    ? `${mass.toFixed(3)} g`
                    : `${(mass * 1000).toFixed(1)} mg`;
                  const warning = getSolubilityWarning(component);

                  return (
                    <>
                      <tr key={component.tempId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {component.chemical?.commonName}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {component.chemical?.formula} • MW: {component.chemical?.molecularWeight.toFixed(2)} g/mol
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="input-field py-1 px-2 w-24"
                            value={component.concentration}
                            onChange={(e) =>
                              handleUpdateConcentration(
                                component.tempId,
                                parseFloat(e.target.value) || 0,
                                component.concentrationUnit
                              )
                            }
                            step="any"
                            min="0"
                          />
                          <select
                            className="select-field py-1 px-2 w-20"
                            value={component.concentrationUnit}
                            onChange={(e) =>
                              handleUpdateConcentration(
                                component.tempId,
                                component.concentration,
                                e.target.value as ConcentrationUnit
                              )
                            }
                          >
                            <option value={ConcentrationUnit.MOLAR}>M</option>
                            <option value={ConcentrationUnit.MILLIMOLAR}>mM</option>
                            <option value={ConcentrationUnit.MICROMOLAR}>μM</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-sm text-primary-700 dark:text-primary-300">
                          {(component.concentration * concentrationMultiplier).toFixed(3)} {component.concentrationUnit}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-mono font-bold text-lg text-primary-700 dark:text-primary-300">
                          {massDisplay}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRemoveComponent(component.tempId)}
                          className="btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {warning && (
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td colSpan={5} className="p-3 bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{warning}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                  <td colSpan={3} className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                    Total Mass:
                  </td>
                  <td className="p-3 text-right">
                    <div className="font-mono font-bold text-xl text-primary-700 dark:text-primary-300">
                      {totalMass >= 1
                        ? `${totalMass.toFixed(3)} g`
                        : `${(totalMass * 1000).toFixed(1)} mg`}
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Beaker className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No components added yet</p>
            <p className="text-sm mt-2">Click "Add Component" to start building your recipe</p>
          </div>
        )}
      </div>

      {/* Add Component Modal */}
      {showAddComponent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Add Component
              </h3>
              <button
                onClick={() => {
                  setShowAddComponent(false);
                  setNewComponent(null);
                }}
                className="btn-icon"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Select Chemical *</label>
                <ChemicalSearch
                  onSelect={(chemical) =>
                    setNewComponent({
                      chemicalId: chemical.id,
                      chemical,
                      concentration: 1,
                      concentrationUnit: ConcentrationUnit.MILLIMOLAR,
                      tempId: '',
                    })
                  }
                  placeholder="Search for a chemical..."
                  allowCustom={true}
                />
              </div>

              {newComponent?.chemical && (
                <>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {newComponent.chemical.commonName}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {newComponent.chemical.formula} • MW: {newComponent.chemical.molecularWeight.toFixed(2)} g/mol
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Concentration *</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="1"
                        step="any"
                        min="0"
                        value={newComponent.concentration}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            concentration: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="input-label">Unit</label>
                      <select
                        className="select-field"
                        value={newComponent.concentrationUnit}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            concentrationUnit: e.target.value as ConcentrationUnit,
                          })
                        }
                      >
                        <option value={ConcentrationUnit.MOLAR}>M (Molar)</option>
                        <option value={ConcentrationUnit.MILLIMOLAR}>mM (Millimolar)</option>
                        <option value={ConcentrationUnit.MICROMOLAR}>μM (Micromolar)</option>
                        <option value={ConcentrationUnit.NANOMOLAR}>nM (Nanomolar)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Notes (optional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g., Add after adjusting pH"
                      value={newComponent.notes || ''}
                      onChange={(e) =>
                        setNewComponent({
                          ...newComponent,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddComponent}
                className="btn-primary flex-1"
                disabled={!newComponent?.chemical}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Recipe
              </button>
              <button
                onClick={() => {
                  setShowAddComponent(false);
                  setNewComponent(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      <div className="card">
        <label className="input-label">Additional Notes (optional)</label>
        <textarea
          className="input-field"
          rows={3}
          placeholder="Storage conditions, special handling, etc..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Instructions Preview */}
      {components.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">
            Preparation Instructions Preview
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {generateInstructions().map((instruction, idx) => (
                <li key={idx} className={instruction === '' ? 'list-none h-2' : ''}>
                  {instruction}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card">
        <div className="flex gap-3">
          <button
            onClick={handleSaveRecipe}
            className="btn-primary flex-1"
            disabled={!recipeName.trim() || components.length === 0 || totalVolume <= 0}
          >
            <Save className="w-5 h-5 mr-2" />
            Save Recipe
          </button>
          <button
            onClick={() => setShowLabel(true)}
            className="btn-secondary flex items-center gap-2"
            disabled={components.length === 0}
            title="Preview label for this recipe"
          >
            <FileText className="w-5 h-5" />
            Preview Label
          </button>
          <button onClick={handleClearAll} className="btn-secondary">
            Clear All
          </button>
        </div>
      </div>

      {/* Recipe Label Preview */}
      {showLabel && components.length > 0 && (
        <RecipeLabel
          recipe={buildPreviewRecipe()}
          onClose={() => setShowLabel(false)}
        />
      )}
    </div>
  );
}
