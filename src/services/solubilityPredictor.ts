/**
 * Browser-based Water Solubility Prediction
 *
 * Uses:
 * - RDKit.js (WASM) for molecular descriptor calculation
 * - ONNX Runtime Web for ML model inference
 *
 * Model: CatBoost trained on Delaney ESOL dataset
 * Accuracy: ~93% (R² = 0.93) - same as server-based version
 *
 * No server required - runs entirely in the browser!
 */

import * as ort from 'onnxruntime-web';

// RDKit types (loaded dynamically)
interface RDKitModule {
  get_mol: (smiles: string) => RDKitMol | null;
  version: () => string;
}

interface RDKitMol {
  is_valid: () => boolean;
  get_descriptors: () => string;
  delete: () => void;
}

// Prediction result interface
export interface SolubilityPrediction {
  success: boolean;
  smiles: string;
  name?: string;
  logS?: number; // Predicted LogS (log10 mol/L)
  solubilityMolL?: number; // Solubility in mol/L
  solubilityGL?: number; // Solubility in g/L (= mg/mL)
  solubilityMgL?: number; // Solubility in mg/L
  molecularWeight?: number;
  molLogP?: number;
  numRotatableBonds?: number;
  aromaticProportion?: number;
  solubilityClass?: string;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

// Molecular descriptors needed for prediction
interface MolecularDescriptors {
  MolLogP: number;
  MolWt: number;
  NumRotatableBonds: number;
  AromaticProportion: number;
}

// Singleton class for managing RDKit and ONNX model
class SolubilityPredictorService {
  private rdkit: RDKitModule | null = null;
  private onnxSession: ort.InferenceSession | null = null;
  private initPromise: Promise<void> | null = null;
  private initError: string | null = null;

  /**
   * Initialize RDKit.js and load the ONNX model
   */
  async initialize(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Load RDKit.js (WASM)
      console.log('[SolubilityPredictor] Loading RDKit.js...');
      const initRDKitModule = await import('@rdkit/rdkit');

      // Configure RDKit to find the WASM file in the public folder
      this.rdkit = await (initRDKitModule as any).default({
        locateFile: (file: string) => {
          // The WASM file should be served from the root/public folder
          if (file.endsWith('.wasm')) {
            console.log(`[SolubilityPredictor] Locating WASM file: /${file}`);
            return `/${file}`;
          }
          return file;
        }
      });
      console.log(`[SolubilityPredictor] RDKit.js loaded (version ${this.rdkit!.version()})`);

      // Load ONNX model
      console.log('[SolubilityPredictor] Loading ONNX model...');

      // Configure ONNX Runtime for browser
      ort.env.wasm.wasmPaths = '/';

      // Load the model from public folder
      this.onnxSession = await ort.InferenceSession.create(
        '/models/water_solubility_model.onnx',
        {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        }
      );

      console.log('[SolubilityPredictor] ONNX model loaded');
      console.log(
        '[SolubilityPredictor] Model inputs:',
        this.onnxSession.inputNames
      );
      console.log(
        '[SolubilityPredictor] Model outputs:',
        this.onnxSession.outputNames
      );

      this.initError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SolubilityPredictor] Initialization failed:', message);
      this.initError = message;
      throw error;
    }
  }

  /**
   * Check if the predictor is ready
   */
  isReady(): boolean {
    return this.rdkit !== null && this.onnxSession !== null;
  }

  /**
   * Check if initialization failed
   */
  hasError(): boolean {
    return this.initError !== null;
  }

  /**
   * Get initialization error message
   */
  getError(): string | null {
    return this.initError;
  }

  /**
   * Calculate molecular descriptors from SMILES using RDKit.js
   */
  private calculateDescriptors(smiles: string): MolecularDescriptors | null {
    if (!this.rdkit) {
      throw new Error('RDKit not initialized');
    }

    const mol = this.rdkit.get_mol(smiles);
    if (!mol || !mol.is_valid()) {
      if (mol) mol.delete();
      return null;
    }

    try {
      // Get descriptors as JSON string
      const descriptorsJson = mol.get_descriptors();
      const descriptors = JSON.parse(descriptorsJson);

      // Extract the 4 features we need
      // RDKit.js provides these in the descriptor object
      const molLogP = descriptors.CrippenClogP ?? descriptors.MolLogP ?? 0;
      const molWt = descriptors.exactmw ?? descriptors.MolWt ?? 0;
      const numRotatableBonds =
        descriptors.NumRotatableBonds ?? descriptors.nRotBonds ?? 0;

      // Calculate aromatic proportion
      // RDKit.js provides NumAromaticAtoms and NumHeavyAtoms
      const numAromaticAtoms =
        descriptors.NumAromaticAtoms ?? descriptors.nAromaticAtoms ?? 0;
      const numHeavyAtoms =
        descriptors.NumHeavyAtoms ?? descriptors.nHeavyAtoms ?? 1;
      const aromaticProportion =
        numHeavyAtoms > 0 ? numAromaticAtoms / numHeavyAtoms : 0;

      return {
        MolLogP: molLogP,
        MolWt: molWt,
        NumRotatableBonds: numRotatableBonds,
        AromaticProportion: aromaticProportion,
      };
    } finally {
      mol.delete();
    }
  }

  /**
   * Classify solubility based on LogS value
   */
  private classifySolubility(logS: number): string {
    if (logS >= 0) return 'highly soluble';
    if (logS >= -1) return 'soluble';
    if (logS >= -2) return 'moderately soluble';
    if (logS >= -3) return 'slightly soluble';
    if (logS >= -4) return 'poorly soluble';
    if (logS >= -5) return 'very poorly soluble';
    return 'practically insoluble';
  }

  /**
   * Estimate model confidence based on training domain
   */
  private getConfidence(
    molLogP: number,
    molWt: number
  ): 'high' | 'medium' | 'low' {
    // Training data ranges (from Delaney dataset)
    const inLogPRange = molLogP >= -3.0 && molLogP <= 7.0;
    const inMwRange = molWt >= 18.0 && molWt <= 700.0;

    if (inLogPRange && inMwRange) return 'high';
    if (inLogPRange || inMwRange) return 'medium';
    return 'low';
  }

  /**
   * Predict water solubility from SMILES
   */
  async predict(smiles: string, name?: string): Promise<SolubilityPrediction> {
    // Ensure initialized
    if (!this.isReady()) {
      try {
        await this.initialize();
      } catch {
        return {
          success: false,
          smiles,
          name,
          error: this.initError || 'Failed to initialize predictor',
        };
      }
    }

    try {
      // Calculate molecular descriptors
      const descriptors = this.calculateDescriptors(smiles);

      if (!descriptors) {
        return {
          success: false,
          smiles,
          name,
          error: `Invalid SMILES notation: ${smiles}`,
        };
      }

      // Prepare input tensor
      const inputData = new Float32Array([
        descriptors.MolLogP,
        descriptors.MolWt,
        descriptors.NumRotatableBonds,
        descriptors.AromaticProportion,
      ]);

      const inputTensor = new ort.Tensor('float32', inputData, [1, 4]);

      // Run inference
      const inputName = this.onnxSession!.inputNames[0];
      const results = await this.onnxSession!.run({
        [inputName]: inputTensor,
      });

      // Extract prediction
      const outputName = this.onnxSession!.outputNames[0];
      const outputData = results[outputName].data as Float32Array;
      const logS = outputData[0];

      // Convert LogS to actual solubility values
      const solubilityMolL = Math.pow(10, logS);
      const solubilityGL = solubilityMolL * descriptors.MolWt;
      const solubilityMgL = solubilityGL * 1000;

      return {
        success: true,
        smiles,
        name,
        logS: Math.round(logS * 10000) / 10000,
        solubilityMolL,
        solubilityGL: Math.round(solubilityGL * 1000000) / 1000000,
        solubilityMgL: Math.round(solubilityMgL * 10000) / 10000,
        molecularWeight: Math.round(descriptors.MolWt * 1000) / 1000,
        molLogP: Math.round(descriptors.MolLogP * 10000) / 10000,
        numRotatableBonds: Math.round(descriptors.NumRotatableBonds),
        aromaticProportion:
          Math.round(descriptors.AromaticProportion * 10000) / 10000,
        solubilityClass: this.classifySolubility(logS),
        confidence: this.getConfidence(descriptors.MolLogP, descriptors.MolWt),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SolubilityPredictor] Prediction failed:', message);
      return {
        success: false,
        smiles,
        name,
        error: `Prediction failed: ${message}`,
      };
    }
  }

  /**
   * Predict solubility for multiple compounds
   */
  async predictBatch(
    compounds: Array<{ smiles: string; name?: string }>
  ): Promise<SolubilityPrediction[]> {
    const results: SolubilityPrediction[] = [];

    for (const compound of compounds) {
      const result = await this.predict(compound.smiles, compound.name);
      results.push(result);
    }

    return results;
  }
}

// Export singleton instance
export const solubilityPredictor = new SolubilityPredictorService();

// Convenience functions
export async function predictSolubility(
  smiles: string,
  name?: string
): Promise<SolubilityPrediction> {
  return solubilityPredictor.predict(smiles, name);
}

export async function predictSolubilityBatch(
  compounds: Array<{ smiles: string; name?: string }>
): Promise<SolubilityPrediction[]> {
  return solubilityPredictor.predictBatch(compounds);
}

export async function initializeSolubilityPredictor(): Promise<void> {
  return solubilityPredictor.initialize();
}

export function isSolubilityPredictorReady(): boolean {
  return solubilityPredictor.isReady();
}
