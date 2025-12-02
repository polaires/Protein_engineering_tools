/**
 * Water Solubility Prediction API Service
 * Interfaces with local solubility prediction API server using ML model
 *
 * Model: CatBoost trained on Delaney ESOL dataset
 * Accuracy: 93.35% (R² = 0.9335)
 * Input: SMILES notation
 * Output: LogS and converted solubility values
 */

export interface SolubilityPredictionRequest {
  smiles: string;
  name?: string;
}

export interface SolubilityPredictionResult {
  success: boolean;
  smiles: string;
  name?: string;
  log_s?: number; // Predicted LogS (log10 mol/L)
  solubility_mol_l?: number; // Solubility in mol/L
  solubility_g_l?: number; // Solubility in g/L (= mg/mL)
  solubility_mg_l?: number; // Solubility in mg/L
  molecular_weight?: number; // Molecular weight in g/mol
  mol_log_p?: number; // Partition coefficient
  num_rotatable_bonds?: number;
  aromatic_proportion?: number;
  solubility_class?: string; // Qualitative classification
  confidence?: string; // Model confidence level
  error?: string;
}

export interface BatchPredictionRequest {
  compounds: SolubilityPredictionRequest[];
}

export interface BatchPredictionResponse {
  success: boolean;
  results: SolubilityPredictionResult[];
  total: number;
  successful: number;
  failed: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_type?: string;
  rdkit_available?: boolean;
}

export interface ModelInfo {
  name: string;
  algorithm: string;
  training_data: string;
  accuracy: {
    r2: number;
    mae: number;
    rmse: number;
  };
  features: Array<{
    name: string;
    description: string;
    source: string;
  }>;
  reference: string;
}

const API_BASE_URL = 'http://127.0.0.1:8001';

// Cache for API availability status
let apiAvailable: boolean | null = null;
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export class SolubilityPredictionAPI {
  /**
   * Check if the API server is available and model is loaded
   */
  static async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        apiAvailable = false;
        throw new Error('API server not available');
      }

      const health = await response.json();
      apiAvailable = health.model_loaded;
      lastHealthCheck = Date.now();
      return health;
    } catch (error) {
      apiAvailable = false;
      lastHealthCheck = Date.now();
      throw error;
    }
  }

  /**
   * Check if API is available (cached check)
   */
  static async isAvailable(): Promise<boolean> {
    const now = Date.now();

    // Return cached result if recent
    if (apiAvailable !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
      return apiAvailable;
    }

    try {
      await this.checkHealth();
      return apiAvailable === true;
    } catch {
      return false;
    }
  }

  /**
   * Predict water solubility for a single compound
   *
   * @param smiles - SMILES notation of the molecule
   * @param name - Optional compound name for reference
   * @returns Prediction result with solubility values
   */
  static async predictSolubility(
    smiles: string,
    name?: string
  ): Promise<SolubilityPredictionResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smiles, name }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Solubility API Error Response:', errorText);

        if (response.status === 503) {
          apiAvailable = false;
          throw new Error('Solubility prediction model not loaded');
        }

        throw new Error(
          `API request failed (${response.status}): ${response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Solubility API Request Error:', error);

      // Check if it's a network error (API not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        apiAvailable = false;
        return {
          success: false,
          smiles,
          name,
          error:
            'Solubility prediction service not available. Start the local API server.',
        };
      }

      if (error instanceof Error) {
        return {
          success: false,
          smiles,
          name,
          error: error.message,
        };
      }

      return {
        success: false,
        smiles,
        name,
        error: 'Unknown error occurred during prediction',
      };
    }
  }

  /**
   * Predict solubility for multiple compounds in batch
   *
   * @param compounds - Array of compounds with SMILES and optional names
   * @returns Batch prediction results
   */
  static async predictBatch(
    compounds: SolubilityPredictionRequest[]
  ): Promise<BatchPredictionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/predict/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ compounds }),
        signal: AbortSignal.timeout(30000), // 30 second timeout for batch
      });

      if (!response.ok) {
        if (response.status === 503) {
          apiAvailable = false;
          throw new Error('Solubility prediction model not loaded');
        }

        throw new Error(
          `Batch prediction failed (${response.status}): ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Batch Prediction Error:', error);

      // Return error response for all compounds
      return {
        success: false,
        results: compounds.map((c) => ({
          success: false,
          smiles: c.smiles,
          name: c.name,
          error: error instanceof Error ? error.message : 'Batch prediction failed',
        })),
        total: compounds.length,
        successful: 0,
        failed: compounds.length,
      };
    }
  }

  /**
   * Get information about the prediction model
   */
  static async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(`${API_BASE_URL}/model/info`);
    if (!response.ok) {
      throw new Error('Failed to fetch model info');
    }
    return response.json();
  }

  /**
   * Convert LogS to human-readable solubility description
   */
  static logSToDescription(logS: number): string {
    if (logS >= 0) {
      return 'highly soluble (>1 mol/L)';
    } else if (logS >= -1) {
      return 'soluble (0.1-1 mol/L)';
    } else if (logS >= -2) {
      return 'moderately soluble (10-100 mM)';
    } else if (logS >= -3) {
      return 'slightly soluble (1-10 mM)';
    } else if (logS >= -4) {
      return 'poorly soluble (0.1-1 mM)';
    } else if (logS >= -5) {
      return 'very poorly soluble (10-100 uM)';
    } else {
      return 'practically insoluble (<10 uM)';
    }
  }

  /**
   * Get solubility warning level from LogS
   */
  static getSolubilityLevel(logS: number): 'good' | 'warning' | 'critical' {
    if (logS >= -2) {
      return 'good';
    } else if (logS >= -4) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
}

export type { SolubilityPredictionRequest as SolubilityRequest };
