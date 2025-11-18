/**
 * Type definitions for the Molarity Calculator application
 */

// ============================================================================
// Chemical Types
// ============================================================================

export interface Chemical {
  id: string;
  commonName: string;
  iupacName?: string;
  formula: string;
  molecularWeight: number; // g/mol
  casNumber?: string;
  category?: ChemicalCategory;
  tags?: string[];
  description?: string;
  hazards?: string[];
}

export enum ChemicalCategory {
  BUFFER = 'buffer',
  SALT = 'salt',
  ACID = 'acid',
  BASE = 'base',
  ORGANIC = 'organic',
  INDICATOR = 'indicator',
  ENZYME = 'enzyme',
  OTHER = 'other',
}

// ============================================================================
// Calculation Types
// ============================================================================

export enum CalculationMode {
  MASS_FROM_MOLARITY = 'mass_from_molarity',        // Most common: calculate mass needed
  MOLARITY_FROM_MASS = 'molarity_from_mass',        // Calculate concentration from mass
  VOLUME_FROM_MASS = 'volume_from_mass',            // Calculate volume from mass
  DILUTION = 'dilution',                             // Dilution calculations (C1V1 = C2V2)
}

export interface MolarityCalculation {
  mode: CalculationMode;
  molarity?: number;          // M (mol/L)
  volume?: number;            // mL
  mass?: number;              // g
  molecularWeight?: number;   // g/mol

  // For dilution calculations
  initialMolarity?: number;   // M
  initialVolume?: number;     // mL
  finalMolarity?: number;     // M
  finalVolume?: number;       // mL
}

export interface CalculationResult {
  success: boolean;
  value?: number;
  unit?: string;
  formula?: string;
  steps?: string[];
  error?: string;
}

// ============================================================================
// Recipe Types
// ============================================================================

export interface RecipeComponent {
  chemicalId: string;
  chemical?: Chemical;        // Populated from database
  concentration: number;      // M
  concentrationUnit: ConcentrationUnit;
  mass?: number;              // Calculated mass in grams
  notes?: string;
}

export enum ConcentrationUnit {
  MOLAR = 'M',
  MILLIMOLAR = 'mM',
  MICROMOLAR = 'μM',
  NANOMOLAR = 'nM',
  PICOMOLAR = 'pM',
  PERCENT_W_V = '% (w/v)',
  PERCENT_V_V = '% (v/v)',
  MG_ML = 'mg/mL',
  UG_ML = 'μg/mL',
  UG_UL = 'μg/μL',
  G_L = 'g/L',
  NG_ML = 'ng/mL',
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  components: RecipeComponent[];
  totalVolume: number;        // mL
  volumeUnit: VolumeUnit;
  pH?: number;
  instructions?: string[];
  notes?: string;
  isCustom: boolean;          // true for user-created recipes
  createdAt: Date;
  modifiedAt: Date;
  tags?: string[];
}

export enum RecipeCategory {
  BUFFER = 'buffer',
  MEDIA = 'media',
  STAINING = 'staining',
  LYSIS = 'lysis',
  CUSTOM = 'custom',
}

export enum VolumeUnit {
  MILLILITER = 'mL',
  LITER = 'L',
  MICROLITER = 'μL',
}

export enum MassUnit {
  GRAM = 'g',
  MILLIGRAM = 'mg',
  MICROGRAM = 'μg',
}

// ============================================================================
// Database Types
// ============================================================================

// ============================================================================
// Protein Concentration Types (Beer-Lambert Law)
// ============================================================================

export interface ConcentrationMeasurement {
  id: string;
  proteinName: string;
  date: string; // ISO date string
  absorbance280: number; // A280
  extinctionCoefficient: number; // M⁻¹cm⁻¹
  molecularWeight: number; // g/mol (Da)
  pathLength: number; // cm (typically 0.1 for NanoDrop, 1 for cuvette)
  concentration: number; // mg/mL
  concentrationMolar: number; // M (mol/L)
  notes?: string;
  sequence?: string; // Optional protein sequence
  batchNumber?: string; // For tracking different expression batches
}

export interface DatabaseSchema {
  chemicals: Chemical[];
  recipes: Recipe[];
  concentrationMeasurements: ConcentrationMeasurement[];
  userPreferences: UserPreferences;
}

export interface UserPreferences {
  id: string;
  defaultVolume: number;
  defaultVolumeUnit: VolumeUnit;
  defaultConcentrationUnit: ConcentrationUnit;
  recentChemicals: string[];  // Chemical IDs
  favoriteRecipes: string[];  // Recipe IDs
  theme: 'light' | 'dark' | 'auto';
  scientificNotation: boolean;
  decimalPlaces: number;
}

// ============================================================================
// PubChem API Types
// ============================================================================

export interface PubChemCompound {
  cid: number;
  iupacName?: string;
  molecularFormula: string;
  molecularWeight: number;
  canonicalSmiles?: string;
  synonyms?: string[];
}

export interface PubChemSearchResult {
  compounds: PubChemCompound[];
  totalCount: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  details?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // milliseconds
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface CalculatorProps {
  initialMode?: CalculationMode;
  onCalculate?: (result: CalculationResult) => void;
}

export interface ChemicalSearchProps {
  onSelect: (chemical: Chemical) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export interface RecipeBuilderProps {
  recipe?: Recipe;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

export interface RecipeListProps {
  category?: RecipeCategory;
  onSelectRecipe: (recipe: Recipe) => void;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
