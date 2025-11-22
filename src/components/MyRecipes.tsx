/**
 * My Recipes Component - Display and manage user's saved recipes
 */

import { useState, useMemo } from 'react';
import { Beaker, Star, Search, FileText, Trash2, Lock } from 'lucide-react';
import { Recipe, RecipeCategory } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { calculateMass } from '@/utils/calculations';
import RecipeLabel from './RecipeLabel';

export default function MyRecipes() {
  const {
    recipes,
    preferences,
    toggleFavoriteRecipe,
    getChemicalById,
    deleteRecipe,
    isAuthenticated,
    promptLogin,
    currentUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<RecipeCategory | 'all'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showLabel, setShowLabel] = useState(false);

  // Filter to show only custom (user-created) recipes
  const myRecipes = useMemo(() => {
    let filtered = recipes.filter((r) => r.isCustom);

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

    // Sort: favorites first, then by modified date (newest first)
    return filtered.sort((a, b) => {
      const aFav = preferences?.favoriteRecipes.includes(a.id) ? 1 : 0;
      const bFav = preferences?.favoriteRecipes.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    });
  }, [recipes, filterCategory, searchQuery, preferences]);

  // Calculate component masses for a recipe
  const calculateRecipeComponents = (recipe: Recipe) => {
    return recipe.components.map((component) => {
      const chemical = getChemicalById(component.chemicalId);
      if (!chemical) return component;

      const molarityInM = component.concentration / 1000;
      const mass = calculateMass(molarityInM, recipe.totalVolume, chemical.molecularWeight);

      return {
        ...component,
        chemical,
        mass,
      };
    });
  };

  // Handle recipe selection
  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  // Handle delete recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteRecipe(recipeId);
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    toggleFavoriteRecipe(recipeId);
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="card text-center py-16">
        <Lock className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Login Required
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Please log in to save and manage your custom recipes
        </p>
        <button
          onClick={() => promptLogin('Login to access your saved recipes')}
          className="btn-primary mx-auto"
        >
          Login / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">My Recipes</h2>
            <p className="text-slate-600 dark:text-slate-400">
              {currentUser ? `Recipes saved by ${currentUser.username}` : 'Your custom recipes'}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Search my recipes..."
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
          {myRecipes.length} saved {myRecipes.length === 1 ? 'recipe' : 'recipes'}
        </div>
      </div>

      {/* Recipe Grid */}
      {myRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myRecipes.map((recipe) => {
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
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={(e) => handleToggleFavorite(e, recipe.id)}
                      className={`flex-shrink-0 ${
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

                {/* Component count and actions */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {recipe.components.length} component
                    {recipe.components.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecipe(recipe.id);
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete recipe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Beaker className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            No saved recipes yet
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Create recipes using the Recipe Builder or save recipes from the public collection
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
                <button
                  onClick={() => setShowLabel(true)}
                  className="btn-secondary flex items-center gap-2"
                  title="Print Label"
                >
                  <FileText className="w-4 h-4" />
                  Print Label
                </button>
                <button
                  onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                  className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700"
                  title="Delete Recipe"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
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
                  {selectedRecipe.totalVolume} {selectedRecipe.volumeUnit}
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
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Modified
                </div>
                <div className="font-semibold text-sm">
                  {new Date(selectedRecipe.modifiedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Components */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Components</h3>
              <div className="space-y-4">
                {calculateRecipeComponents(selectedRecipe).map(
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
            components: calculateRecipeComponents(selectedRecipe)
          }}
          onClose={() => setShowLabel(false)}
        />
      )}
    </div>
  );
}
