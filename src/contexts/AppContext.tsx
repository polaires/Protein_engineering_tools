/**
 * Application-wide context for state management
 * Manages chemicals, recipes, preferences, and notifications
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Chemical,
  Recipe,
  UserPreferences,
  ToastMessage,
  LoadingState,
} from '@/types';
import * as db from '@/services/database';
import { CURATED_CHEMICALS } from '@/data/chemicals';
import { CURATED_RECIPES } from '@/data/recipes';

// ============================================================================
// Context Types
// ============================================================================

interface AppContextType {
  // Chemicals
  chemicals: Chemical[];
  loadingChemicals: LoadingState;
  searchChemicals: (query: string) => Promise<Chemical[]>;
  getChemicalById: (id: string) => Chemical | undefined;
  addChemical: (chemical: Chemical) => Promise<void>;

  // Recipes
  recipes: Recipe[];
  loadingRecipes: LoadingState;
  searchRecipes: (query: string) => Promise<Recipe[]>;
  getRecipeById: (id: string) => Recipe | undefined;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;

  // Preferences
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  addToRecentChemicals: (chemicalId: string) => Promise<void>;
  toggleFavoriteRecipe: (recipeId: string) => Promise<void>;

  // Toast notifications
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;

  // Database operations
  initializeDatabase: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (file: File) => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loadingChemicals, setLoadingChemicals] = useState<LoadingState>({
    isLoading: true,
    message: 'Loading chemicals...',
  });
  const [loadingRecipes, setLoadingRecipes] = useState<LoadingState>({
    isLoading: true,
    message: 'Loading recipes...',
  });

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize database and load data
   */
  const initializeDatabase = useCallback(async () => {
    try {
      setLoadingChemicals({ isLoading: true, message: 'Initializing database...' });
      setLoadingRecipes({ isLoading: true, message: 'Initializing database...' });

      // Initialize IndexedDB
      await db.initDatabase();

      // Check if database needs seeding
      const isInitialized = await db.isChemicalDatabaseInitialized();

      if (!isInitialized) {
        // Seed with curated data
        await db.saveChemicals(CURATED_CHEMICALS);
        await db.saveRecipes(CURATED_RECIPES);
      }

      // Load all data
      const [loadedChemicals, loadedRecipes, loadedPrefs] = await Promise.all([
        db.getAllChemicals(),
        db.getAllRecipes(),
        db.getPreferences(),
      ]);

      setChemicals(loadedChemicals);
      setRecipes(loadedRecipes);
      setPreferences(loadedPrefs);

      setLoadingChemicals({ isLoading: false });
      setLoadingRecipes({ isLoading: false });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setLoadingChemicals({
        isLoading: false,
        message: 'Failed to load chemicals',
      });
      setLoadingRecipes({
        isLoading: false,
        message: 'Failed to load recipes',
      });
      showToast('error', 'Failed to initialize database');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeDatabase();
  }, [initializeDatabase]);

  // ========================================================================
  // Chemical Operations
  // ========================================================================

  const searchChemicals = useCallback(
    async (query: string): Promise<Chemical[]> => {
      if (!query.trim()) {
        return chemicals;
      }
      return await db.searchChemicals(query);
    },
    [chemicals]
  );

  const getChemicalById = useCallback(
    (id: string): Chemical | undefined => {
      return chemicals.find((c) => c.id === id);
    },
    [chemicals]
  );

  const addChemical = useCallback(
    async (chemical: Chemical): Promise<void> => {
      try {
        await db.saveChemical(chemical);
        setChemicals((prev) => [...prev, chemical]);
        showToast('success', `Added ${chemical.commonName} to database`);
      } catch (error) {
        console.error('Failed to add chemical:', error);
        showToast('error', 'Failed to add chemical');
        throw error;
      }
    },
    []
  );

  // ========================================================================
  // Recipe Operations
  // ========================================================================

  const searchRecipes = useCallback(
    async (query: string): Promise<Recipe[]> => {
      if (!query.trim()) {
        return recipes;
      }
      return await db.searchRecipes(query);
    },
    [recipes]
  );

  const getRecipeById = useCallback(
    (id: string): Recipe | undefined => {
      return recipes.find((r) => r.id === id);
    },
    [recipes]
  );

  const addRecipe = useCallback(
    async (recipe: Recipe): Promise<void> => {
      try {
        await db.saveRecipe(recipe);
        setRecipes((prev) => [...prev, recipe]);
        showToast('success', `Saved recipe: ${recipe.name}`);
      } catch (error) {
        console.error('Failed to add recipe:', error);
        showToast('error', 'Failed to save recipe');
        throw error;
      }
    },
    []
  );

  const updateRecipe = useCallback(
    async (recipe: Recipe): Promise<void> => {
      try {
        await db.saveRecipe(recipe);
        setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)));
        showToast('success', `Updated recipe: ${recipe.name}`);
      } catch (error) {
        console.error('Failed to update recipe:', error);
        showToast('error', 'Failed to update recipe');
        throw error;
      }
    },
    []
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      try {
        const recipe = recipes.find((r) => r.id === id);
        await db.deleteRecipe(id);
        setRecipes((prev) => prev.filter((r) => r.id !== id));
        showToast('success', `Deleted recipe: ${recipe?.name || id}`);
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        showToast('error', 'Failed to delete recipe');
        throw error;
      }
    },
    [recipes]
  );

  // ========================================================================
  // Preferences Operations
  // ========================================================================

  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>): Promise<void> => {
      try {
        await db.savePreferences(prefs);
        const updated = await db.getPreferences();
        setPreferences(updated);
      } catch (error) {
        console.error('Failed to update preferences:', error);
        showToast('error', 'Failed to update preferences');
        throw error;
      }
    },
    []
  );

  const addToRecentChemicals = useCallback(
    async (chemicalId: string): Promise<void> => {
      try {
        await db.addToRecentChemicals(chemicalId);
        const updated = await db.getPreferences();
        setPreferences(updated);
      } catch (error) {
        console.error('Failed to add to recent chemicals:', error);
      }
    },
    []
  );

  const toggleFavoriteRecipe = useCallback(
    async (recipeId: string): Promise<void> => {
      try {
        await db.toggleFavoriteRecipe(recipeId);
        const updated = await db.getPreferences();
        setPreferences(updated);
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        showToast('error', 'Failed to update favorites');
      }
    },
    []
  );

  // ========================================================================
  // Toast Notifications
  // ========================================================================

  const showToast = useCallback(
    (
      type: ToastMessage['type'],
      message: string,
      duration: number = 5000
    ): void => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: ToastMessage = { id, type, message, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ========================================================================
  // Data Import/Export
  // ========================================================================

  const exportData = useCallback(async (): Promise<void> => {
    try {
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `molarity-calc-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', 'Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('error', 'Failed to export data');
    }
  }, []);

  const importData = useCallback(async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importData(data);

      // Reload data
      const [loadedChemicals, loadedRecipes, loadedPrefs] = await Promise.all([
        db.getAllChemicals(),
        db.getAllRecipes(),
        db.getPreferences(),
      ]);

      setChemicals(loadedChemicals);
      setRecipes(loadedRecipes);
      setPreferences(loadedPrefs);

      showToast('success', 'Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      showToast('error', 'Failed to import data');
    }
  }, []);

  // ========================================================================
  // Context Value
  // ========================================================================

  const value: AppContextType = {
    // Chemicals
    chemicals,
    loadingChemicals,
    searchChemicals,
    getChemicalById,
    addChemical,

    // Recipes
    recipes,
    loadingRecipes,
    searchRecipes,
    getRecipeById,
    addRecipe,
    updateRecipe,
    deleteRecipe,

    // Preferences
    preferences,
    updatePreferences,
    addToRecentChemicals,
    toggleFavoriteRecipe,

    // Toasts
    toasts,
    showToast,
    removeToast,

    // Database
    initializeDatabase,
    exportData,
    importData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access app context
 */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
