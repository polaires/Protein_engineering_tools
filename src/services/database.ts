/**
 * IndexedDB wrapper for local data storage
 * Handles chemicals, recipes, and user preferences
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Chemical, Recipe, UserPreferences } from '@/types';

// ============================================================================
// Database Schema
// ============================================================================

interface MolarityCalcDB extends DBSchema {
  chemicals: {
    key: string;
    value: Chemical;
    indexes: {
      'by-category': string;
      'by-name': string;
    };
  };
  recipes: {
    key: string;
    value: Recipe;
    indexes: {
      'by-category': string;
      'by-custom': number;
    };
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
}

const DB_NAME = 'molarity-calculator-db';
const DB_VERSION = 1;

// ============================================================================
// Database Initialization
// ============================================================================

let dbInstance: IDBPDatabase<MolarityCalcDB> | null = null;

/**
 * Initialize and open the database
 */
export async function initDatabase(): Promise<IDBPDatabase<MolarityCalcDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<MolarityCalcDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create object stores and indexes

      // Chemicals store
      if (!db.objectStoreNames.contains('chemicals')) {
        const chemicalStore = db.createObjectStore('chemicals', {
          keyPath: 'id',
        });
        chemicalStore.createIndex('by-category', 'category');
        chemicalStore.createIndex('by-name', 'commonName');
      }

      // Recipes store
      if (!db.objectStoreNames.contains('recipes')) {
        const recipeStore = db.createObjectStore('recipes', {
          keyPath: 'id',
        });
        recipeStore.createIndex('by-category', 'category');
        recipeStore.createIndex('by-custom', 'isCustom');
      }

      // Preferences store
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', {
          keyPath: 'id',
        });
      }
    },
  });

  return dbInstance;
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBPDatabase<MolarityCalcDB>> {
  if (!dbInstance) {
    return await initDatabase();
  }
  return dbInstance;
}

// ============================================================================
// Chemical Database Operations
// ============================================================================

/**
 * Add or update a chemical
 */
export async function saveChemical(chemical: Chemical): Promise<void> {
  const db = await getDB();
  await db.put('chemicals', chemical);
}

/**
 * Add multiple chemicals at once
 */
export async function saveChemicals(chemicals: Chemical[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chemicals', 'readwrite');

  await Promise.all([
    ...chemicals.map((chemical) => tx.store.put(chemical)),
    tx.done,
  ]);
}

/**
 * Get a chemical by ID
 */
export async function getChemical(id: string): Promise<Chemical | undefined> {
  const db = await getDB();
  return await db.get('chemicals', id);
}

/**
 * Get all chemicals
 */
export async function getAllChemicals(): Promise<Chemical[]> {
  const db = await getDB();
  return await db.getAll('chemicals');
}

/**
 * Get chemicals by category
 */
export async function getChemicalsByCategory(
  category: string
): Promise<Chemical[]> {
  const db = await getDB();
  return await db.getAllFromIndex('chemicals', 'by-category', category);
}

/**
 * Search chemicals by name (case-insensitive partial match)
 */
export async function searchChemicals(query: string): Promise<Chemical[]> {
  const db = await getDB();
  const allChemicals = await db.getAll('chemicals');

  const lowerQuery = query.toLowerCase();

  return allChemicals.filter(
    (chemical) =>
      chemical.commonName.toLowerCase().includes(lowerQuery) ||
      chemical.iupacName?.toLowerCase().includes(lowerQuery) ||
      chemical.formula.toLowerCase().includes(lowerQuery) ||
      chemical.casNumber?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Delete a chemical
 */
export async function deleteChemical(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('chemicals', id);
}

/**
 * Check if chemical database is initialized
 */
export async function isChemicalDatabaseInitialized(): Promise<boolean> {
  const db = await getDB();
  const count = await db.count('chemicals');
  return count > 0;
}

// ============================================================================
// Recipe Database Operations
// ============================================================================

/**
 * Save a recipe
 */
export async function saveRecipe(recipe: Recipe): Promise<void> {
  const db = await getDB();
  recipe.modifiedAt = new Date();
  await db.put('recipes', recipe);
}

/**
 * Add multiple recipes at once
 */
export async function saveRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('recipes', 'readwrite');

  await Promise.all([
    ...recipes.map((recipe) => tx.store.put(recipe)),
    tx.done,
  ]);
}

/**
 * Get a recipe by ID
 */
export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = await getDB();
  return await db.get('recipes', id);
}

/**
 * Get all recipes
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  return await db.getAll('recipes');
}

/**
 * Get recipes by category
 */
export async function getRecipesByCategory(
  category: string
): Promise<Recipe[]> {
  const db = await getDB();
  return await db.getAllFromIndex('recipes', 'by-category', category);
}

/**
 * Get custom recipes
 */
export async function getCustomRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  return await db.getAllFromIndex('recipes', 'by-custom', 1);
}

/**
 * Search recipes by name
 */
export async function searchRecipes(query: string): Promise<Recipe[]> {
  const db = await getDB();
  const allRecipes = await db.getAll('recipes');

  const lowerQuery = query.toLowerCase();

  return allRecipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(lowerQuery) ||
      recipe.description?.toLowerCase().includes(lowerQuery) ||
      recipe.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('recipes', id);
}

// ============================================================================
// User Preferences Operations
// ============================================================================

const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  defaultVolume: 100,
  defaultVolumeUnit: 'mL' as any,
  defaultConcentrationUnit: 'M' as any,
  recentChemicals: [],
  favoriteRecipes: [],
  theme: 'auto',
  scientificNotation: false,
  decimalPlaces: 4,
};

/**
 * Get user preferences
 */
export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDB();
  const prefs = await db.get('preferences', 'default');
  return prefs || DEFAULT_PREFERENCES;
}

/**
 * Save user preferences
 */
export async function savePreferences(
  preferences: Partial<UserPreferences>
): Promise<void> {
  const db = await getDB();
  const current = await getPreferences();
  const updated = { ...current, ...preferences, id: 'default' };
  await db.put('preferences', updated);
}

/**
 * Add a chemical to recent list
 */
export async function addToRecentChemicals(chemicalId: string): Promise<void> {
  const prefs = await getPreferences();
  const recent = prefs.recentChemicals.filter((id) => id !== chemicalId);
  recent.unshift(chemicalId);

  // Keep only last 20
  if (recent.length > 20) {
    recent.pop();
  }

  await savePreferences({ recentChemicals: recent });
}

/**
 * Toggle favorite recipe
 */
export async function toggleFavoriteRecipe(recipeId: string): Promise<void> {
  const prefs = await getPreferences();
  const favorites = [...prefs.favoriteRecipes];

  const index = favorites.indexOf(recipeId);
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(recipeId);
  }

  await savePreferences({ favoriteRecipes: favorites });
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Clear all data (useful for reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();

  const tx = db.transaction(
    ['chemicals', 'recipes', 'preferences'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('chemicals').clear(),
    tx.objectStore('recipes').clear(),
    tx.objectStore('preferences').clear(),
    tx.done,
  ]);
}

/**
 * Export all data
 */
export async function exportAllData(): Promise<{
  chemicals: Chemical[];
  recipes: Recipe[];
  preferences: UserPreferences;
}> {
  const [chemicals, recipes, preferences] = await Promise.all([
    getAllChemicals(),
    getAllRecipes(),
    getPreferences(),
  ]);

  return { chemicals, recipes, preferences };
}

/**
 * Import data (replaces existing data)
 */
export async function importData(data: {
  chemicals?: Chemical[];
  recipes?: Recipe[];
  preferences?: UserPreferences;
}): Promise<void> {
  const db = await getDB();

  if (data.chemicals) {
    await saveChemicals(data.chemicals);
  }

  if (data.recipes) {
    await saveRecipes(data.recipes);
  }

  if (data.preferences) {
    await savePreferences(data.preferences);
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  chemicalCount: number;
  recipeCount: number;
  customRecipeCount: number;
}> {
  const db = await getDB();

  const [chemicalCount, recipeCount, customRecipes] = await Promise.all([
    db.count('chemicals'),
    db.count('recipes'),
    getCustomRecipes(),
  ]);

  return {
    chemicalCount,
    recipeCount,
    customRecipeCount: customRecipes.length,
  };
}
