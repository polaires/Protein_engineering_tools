/**
 * Recipe list component with filtering and search
 */

import { useState, useMemo } from 'react';
import { Beaker, Star, Search, FileText, AlertTriangle, Download } from 'lucide-react';
import { Recipe, RecipeCategory, RecipeListProps } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { calculateMass } from '@/utils/calculations';
import RecipeLabel from './RecipeLabel';

export default function RecipeList({ category, onSelectRecipe }: RecipeListProps) {
  const { recipes, preferences, toggleFavoriteRecipe, getChemicalById, addRecipe, isAuthenticated, promptLogin, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<RecipeCategory | 'all'>(
    category || 'all'
  );
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showLabel, setShowLabel] = useState(false);

  // Recipe scaling state
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [customScale, setCustomScale] = useState<string>('');
  const [showCustomScale, setShowCustomScale] = useState(false);
  const [scalingMode, setScalingMode] = useState<'volume' | 'concentration'>('volume');

  // Filter and search recipes
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }

    // Search by name or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort: favorites first, then by name
    return filtered.sort((a, b) => {
      const aFav = preferences?.favoriteRecipes.includes(a.id) ? 1 : 0;
      const bFav = preferences?.favoriteRecipes.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name);
    });
  }, [recipes, filterCategory, searchQuery, preferences]);

  // Calculate component masses for a recipe with scaling
  const calculateRecipeComponents = (recipe: Recipe, scale: number = 1, mode: 'volume' | 'concentration' = 'volume') => {
    return recipe.components.map((component) => {
      const chemical = getChemicalById(component.chemicalId);
      if (!chemical) return component;

      let molarityInM: number;
      let volumeInML: number;

      if (mode === 'volume') {
        // Volume scaling: scale the volume, keep concentration
        molarityInM = component.concentration / 1000; // Convert mM to M
        volumeInML = recipe.totalVolume * scale;
      } else {
        // Concentration scaling: scale the concentration, keep volume
        molarityInM = (component.concentration * scale) / 1000; // Convert mM to M and scale
        volumeInML = recipe.totalVolume;
      }

      const mass = calculateMass(molarityInM, volumeInML, chemical.molecularWeight);

      return {
        ...component,
        chemical,
        mass,
        concentration: mode === 'concentration' ? component.concentration * scale : component.concentration,
      };
    });
  };

  // Check solubility for scaled recipe
  const checkScaledSolubility = (recipe: Recipe, scale: number, mode: 'volume' | 'concentration'): { warning: string; component: string } | null => {
    const components = calculateRecipeComponents(recipe, scale, mode);
    const volumeInML = mode === 'volume' ? recipe.totalVolume * scale : recipe.totalVolume;

    for (const component of components) {
      if (!component.mass || !component.chemical) continue;

      const concentrationMgML = (component.mass / volumeInML) * 1000;

      // General solubility limits (approximate)
      if (concentrationMgML > 500) {
        return {
          warning: `Very high concentration (${concentrationMgML.toFixed(0)} mg/mL). May exceed solubility limit.`,
          component: component.chemical.commonName
        };
      } else if (concentrationMgML > 200) {
        return {
          warning: `High concentration (${concentrationMgML.toFixed(0)} mg/mL). Check solubility data.`,
          component: component.chemical.commonName
        };
      }
    }

    return null;
  };

  // Handle recipe selection
  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setScaleFactor(1); // Reset scale factor
    setCustomScale('');
    setShowCustomScale(false);
    setScalingMode('volume'); // Reset to volume scaling
    onSelectRecipe(recipe);
  };

  // Handle scale factor change
  const handleScaleChange = (value: number | 'custom') => {
    if (value === 'custom') {
      setShowCustomScale(true);
    } else {
      setShowCustomScale(false);
      setScaleFactor(value);
      setCustomScale('');
    }
  };

  // Handle custom scale input
  const handleCustomScaleChange = (value: string) => {
    setCustomScale(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setScaleFactor(numValue);
    }
  };

  // Save recipe to My Recipes
  const handleSaveToMyRecipes = async (recipe: Recipe) => {
    if (!isAuthenticated) {
      promptLogin('Login to save recipes to your collection');
      return;
    }

    try {
      // Create a copy of the recipe with a new ID
      const newRecipe: Recipe = {
        ...recipe,
        id: `custom-${Date.now()}`,
        name: `${recipe.name} (Copy)`,
        isCustom: true,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      await addRecipe(newRecipe);
      showToast('success', 'Recipe saved to My Recipes!');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      showToast('error', 'Failed to save recipe');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    toggleFavoriteRecipe(recipeId);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="select-field md:w-48"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as RecipeCategory | 'all')}
          >
            <option value="all">All Categories</option>
            <option value={RecipeCategory.BUFFER}>Buffers</option>
            <option value={RecipeCategory.MEDIA}>Media</option>
            <option value={RecipeCategory.STAINING}>Staining</option>
            <option value={RecipeCategory.LYSIS}>Lysis</option>
            <option value={RecipeCategory.CUSTOM}>Custom</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredRecipes.length} of {recipes.length} recipes
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => {
          const isFavorite = preferences?.favoriteRecipes.includes(recipe.id);

          return (
            <div
              key={recipe.id}
              className={`recipe-card ${selectedRecipe?.id === recipe.id ? 'selected' : ''}`}
              onClick={() => handleSelectRecipe(recipe)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <Beaker className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {recipe.name}
                  </h3>
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(e, recipe.id)}
                  className={`flex-shrink-0 ml-2 ${
                    isFavorite
                      ? 'text-yellow-500'
                      : 'text-slate-400 hover:text-yellow-500'
                  }`}
                >
                  <Star
                    className="w-5 h-5"
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />
                </button>
              </div>

              {/* Description */}
              {recipe.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {recipe.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge-primary text-xs">
                  {recipe.category}
                </span>
                {recipe.pH && (
                  <span className="badge text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    pH {recipe.pH}
                  </span>
                )}
                <span className="badge text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {recipe.totalVolume} {recipe.volumeUnit}
                </span>
              </div>

              {/* Component count */}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {recipe.components.length} component
                {recipe.components.length !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRecipes.length === 0 && (
        <div className="card text-center py-12">
          <Beaker className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            No recipes found
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {selectedRecipe.name}
                </h2>
                {selectedRecipe.description && (
                  <p className="text-slate-600 dark:text-slate-400">
                    {selectedRecipe.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {!selectedRecipe.isCustom && (
                  <button
                    onClick={() => handleSaveToMyRecipes(selectedRecipe)}
                    className="btn-secondary flex items-center gap-2"
                    title="Save to My Recipes"
                  >
                    <Download className="w-4 h-4" />
                    Save to My Recipes
                  </button>
                )}
                <button
                  onClick={() => setShowLabel(true)}
                  className="btn-secondary flex items-center gap-2"
                  title="Print Label"
                >
                  <FileText className="w-4 h-4" />
                  Print Label
                </button>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="btn-icon"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Recipe Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Category
                </div>
                <div className="font-semibold">{selectedRecipe.category}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Volume
                </div>
                <div className="font-semibold">
                  {scalingMode === 'volume'
                    ? `${(selectedRecipe.totalVolume * scaleFactor).toFixed(1)} ${selectedRecipe.volumeUnit}`
                    : `${selectedRecipe.totalVolume} ${selectedRecipe.volumeUnit}`}
                  {scaleFactor !== 1 && scalingMode === 'volume' && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                      ({scaleFactor}×)
                    </span>
                  )}
                </div>
              </div>
              {selectedRecipe.pH && (
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    pH
                  </div>
                  <div className="font-semibold">{selectedRecipe.pH}</div>
                </div>
              )}
            </div>

            {/* Recipe Scaling Controls */}
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <h3 className="text-sm font-semibold mb-3 text-primary-900 dark:text-primary-100">
                Recipe Scaling
              </h3>

              {/* Scaling Mode Toggle */}
              <div className="mb-4">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Scaling Mode
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScalingMode('volume')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      scalingMode === 'volume'
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    Scale Volume
                  </button>
                  <button
                    onClick={() => setScalingMode('concentration')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      scalingMode === 'concentration'
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    Scale Concentration
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {scalingMode === 'volume'
                    ? 'Scale the total volume while keeping concentration constant'
                    : 'Scale the concentration while keeping volume constant'}
                </p>
              </div>

              {/* Scale Factor Buttons */}
              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Scale Factor
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0.2, 0.5, 1, 2, 5, 10].map((factor) => (
                    <button
                      key={factor}
                      onClick={() => handleScaleChange(factor)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        scaleFactor === factor && !showCustomScale
                          ? 'bg-primary-600 text-white dark:bg-primary-500'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {factor}×
                    </button>
                  ))}
                  <button
                    onClick={() => handleScaleChange('custom')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showCustomScale
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {showCustomScale && (
                  <input
                    type="number"
                    className="input-field w-32 mt-2"
                    placeholder="Enter scale"
                    step="0.1"
                    min="0.1"
                    value={customScale}
                    onChange={(e) => handleCustomScaleChange(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Solubility Warning */}
            {((scalingMode === 'volume' && scaleFactor > 1) || (scalingMode === 'concentration' && scaleFactor !== 1)) && (() => {
              const solubilityCheck = checkScaledSolubility(selectedRecipe, scaleFactor, scalingMode);
              return solubilityCheck ? (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                        Solubility Warning
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>{solubilityCheck.component}:</strong> {solubilityCheck.warning}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                        {scalingMode === 'concentration'
                          ? 'Consider reducing the concentration or using techniques to improve solubility.'
                          : 'Consider using a larger volume or heating/stirring to improve dissolution.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="divider" />

            {/* Components */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Components</h3>
              <div className="space-y-4">
                {calculateRecipeComponents(selectedRecipe, scaleFactor, scalingMode).map(
                  (component, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {component.chemical?.commonName || component.chemicalId}
                          </div>
                          {component.chemical && (
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {component.chemical.formula} • MW:{' '}
                              {component.chemical.molecularWeight.toFixed(2)}{' '}
                              g/mol
                            </div>
                          )}
                          <div className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                            {component.concentration} {component.concentrationUnit}
                            {scalingMode === 'concentration' && scaleFactor !== 1 && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                                ({scaleFactor}×)
                              </span>
                            )}
                          </div>
                        </div>
                        {component.mass && (
                          <div className="text-right ml-4">
                            <div className="font-mono font-bold text-lg text-primary-700 dark:text-primary-300">
                              {component.mass >= 1
                                ? `${component.mass.toFixed(3)} g`
                                : `${(component.mass * 1000).toFixed(1)} mg`}
                            </div>
                          </div>
                        )}
                      </div>
                      {component.notes && (
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
                          {component.notes}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Instructions */}
            {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Preparation Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                  {selectedRecipe.instructions.map((instruction, idx) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Notes */}
            {selectedRecipe.notes && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="font-semibold mb-1 text-blue-900 dark:text-blue-200">
                  Notes
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {selectedRecipe.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipe Label Modal */}
      {showLabel && selectedRecipe && (
        <RecipeLabel
          recipe={{
            ...selectedRecipe,
            totalVolume: scalingMode === 'volume' ? selectedRecipe.totalVolume * scaleFactor : selectedRecipe.totalVolume,
            components: calculateRecipeComponents(selectedRecipe, scaleFactor, scalingMode)
          }}
          onClose={() => setShowLabel(false)}
        />
      )}
    </div>
  );
}
