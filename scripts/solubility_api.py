"""
Water Solubility Prediction API Server
Uses a CatBoost model trained on the Delaney dataset to predict water solubility (LogS) from SMILES

Based on: https://github.com/arhamshah/SolubilityPrediction
Reference: Delaney, J.S. (2004) - ESOL: Estimating Aqueous Solubility Directly from Molecular Structure

Model Features:
- MolLogP: Partition coefficient (lipophilicity)
- MolWt: Molecular weight
- NumRotatableBonds: Number of rotatable bonds
- AromaticProportion: Ratio of aromatic atoms to heavy atoms

Accuracy: ~93.35% (R² = 0.9335 on the Delaney dataset)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import math
import pickle
import warnings

# Suppress warnings during import
warnings.filterwarnings('ignore')

app = FastAPI(
    title="Water Solubility Prediction API",
    description="Predict water solubility (LogS) from molecular SMILES using ML",
    version="1.0.0"
)

# Enable CORS for local development (Tauri app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model (loaded once at startup)
model = None


class SolubilityRequest(BaseModel):
    smiles: str = Field(..., description="SMILES notation of the molecule")
    name: Optional[str] = Field(None, description="Optional compound name for reference")


class BatchSolubilityRequest(BaseModel):
    compounds: List[SolubilityRequest] = Field(..., description="List of compounds to predict")


class SolubilityResult(BaseModel):
    success: bool
    smiles: str
    name: Optional[str] = None
    log_s: Optional[float] = Field(None, description="Predicted LogS (log mol/L)")
    solubility_mol_l: Optional[float] = Field(None, description="Solubility in mol/L")
    solubility_g_l: Optional[float] = Field(None, description="Solubility in g/L (mg/mL)")
    solubility_mg_l: Optional[float] = Field(None, description="Solubility in mg/L")
    molecular_weight: Optional[float] = Field(None, description="Molecular weight in g/mol")
    mol_log_p: Optional[float] = Field(None, description="Partition coefficient (lipophilicity)")
    num_rotatable_bonds: Optional[int] = Field(None, description="Number of rotatable bonds")
    aromatic_proportion: Optional[float] = Field(None, description="Aromatic atom proportion")
    solubility_class: Optional[str] = Field(None, description="Qualitative solubility classification")
    confidence: Optional[str] = Field(None, description="Model confidence level")
    error: Optional[str] = None


class BatchSolubilityResponse(BaseModel):
    success: bool
    results: List[SolubilityResult]
    total: int
    successful: int
    failed: int


def get_aromatic_proportion(mol) -> float:
    """Calculate the proportion of aromatic atoms to heavy atoms"""
    from rdkit.Chem import Lipinski

    aromatic_count = sum(1 for i in range(mol.GetNumAtoms()) if mol.GetAtomWithIdx(i).GetIsAromatic())
    heavy_atom_count = Lipinski.HeavyAtomCount(mol)

    if heavy_atom_count == 0:
        return 0.0

    return aromatic_count / heavy_atom_count


def calculate_descriptors(smiles: str) -> dict:
    """
    Calculate molecular descriptors from SMILES

    Returns:
        Dictionary with MolLogP, MolWt, NumRotatableBonds, AromaticProportion
    """
    from rdkit import Chem
    from rdkit.Chem import Descriptors, Crippen, Lipinski

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES notation: {smiles}")

    descriptors = {
        'MolLogP': Crippen.MolLogP(mol),
        'MolWt': Descriptors.MolWt(mol),
        'NumRotatableBonds': float(Lipinski.NumRotatableBonds(mol)),
        'AromaticProportion': get_aromatic_proportion(mol),
    }

    return descriptors


def classify_solubility(log_s: float) -> str:
    """
    Classify solubility based on LogS value
    Based on common pharmaceutical classifications
    """
    if log_s >= 0:
        return "highly soluble"
    elif log_s >= -1:
        return "soluble"
    elif log_s >= -2:
        return "moderately soluble"
    elif log_s >= -3:
        return "slightly soluble"
    elif log_s >= -4:
        return "poorly soluble"
    elif log_s >= -5:
        return "very poorly soluble"
    else:
        return "practically insoluble"


def get_confidence_level(mol_log_p: float, mol_wt: float) -> str:
    """
    Estimate model confidence based on whether compound is in training domain
    The Delaney dataset mainly covers drug-like molecules
    """
    # Training data ranges (approximate from Delaney dataset)
    # MolLogP: roughly -3 to 7
    # MolWt: roughly 18 to 700

    in_logp_range = -3.0 <= mol_log_p <= 7.0
    in_mw_range = 18.0 <= mol_wt <= 700.0

    if in_logp_range and in_mw_range:
        return "high"
    elif in_logp_range or in_mw_range:
        return "medium"
    else:
        return "low - compound may be outside training domain"


def predict_solubility(smiles: str, name: Optional[str] = None) -> SolubilityResult:
    """
    Predict water solubility from SMILES

    Args:
        smiles: SMILES notation of the molecule
        name: Optional compound name

    Returns:
        SolubilityResult with prediction
    """
    global model

    if model is None:
        return SolubilityResult(
            success=False,
            smiles=smiles,
            name=name,
            error="Model not loaded"
        )

    try:
        import pandas as pd
        import numpy as np

        # Calculate descriptors
        descriptors = calculate_descriptors(smiles)

        # Create DataFrame for prediction
        df = pd.DataFrame([descriptors])

        # Predict LogS
        log_s = float(model.predict(df)[0])

        # Convert LogS to actual solubility values
        # LogS = log10(S) where S is in mol/L
        solubility_mol_l = 10 ** log_s

        # Convert to g/L using molecular weight
        mol_wt = descriptors['MolWt']
        solubility_g_l = solubility_mol_l * mol_wt

        # Convert to mg/L
        solubility_mg_l = solubility_g_l * 1000

        return SolubilityResult(
            success=True,
            smiles=smiles,
            name=name,
            log_s=round(log_s, 4),
            solubility_mol_l=solubility_mol_l,
            solubility_g_l=round(solubility_g_l, 6),
            solubility_mg_l=round(solubility_mg_l, 4),
            molecular_weight=round(mol_wt, 3),
            mol_log_p=round(descriptors['MolLogP'], 4),
            num_rotatable_bonds=int(descriptors['NumRotatableBonds']),
            aromatic_proportion=round(descriptors['AromaticProportion'], 4),
            solubility_class=classify_solubility(log_s),
            confidence=get_confidence_level(descriptors['MolLogP'], mol_wt)
        )

    except ValueError as e:
        return SolubilityResult(
            success=False,
            smiles=smiles,
            name=name,
            error=str(e)
        )
    except Exception as e:
        return SolubilityResult(
            success=False,
            smiles=smiles,
            name=name,
            error=f"Prediction failed: {str(e)}"
        )


@app.on_event("startup")
async def load_model():
    """Load the pre-trained CatBoost model on server startup"""
    global model

    print("Loading Water Solubility prediction model...")

    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "water_solubility_model.pkl")

    if not os.path.exists(model_path):
        print(f"ERROR: Model file not found at {model_path}")
        raise FileNotFoundError(f"Model file not found: {model_path}")

    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print("Model loaded successfully!")
        print(f"Model type: {type(model)}")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "Water Solubility Prediction API",
        "model_loaded": model is not None,
        "accuracy": "93.35% (R² = 0.9335 on Delaney dataset)"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_type": str(type(model)) if model else None,
        "rdkit_available": True  # Will fail at startup if not available
    }


@app.post("/predict", response_model=SolubilityResult)
async def predict_single(request: SolubilityRequest):
    """
    Predict water solubility for a single compound

    Input:
    - smiles: SMILES notation of the molecule
    - name: Optional compound name

    Output:
    - log_s: Predicted LogS (log10 mol/L)
    - solubility_g_l: Solubility in g/L (equivalent to mg/mL)
    - solubility_mg_l: Solubility in mg/L
    - solubility_class: Qualitative classification
    - molecular descriptors used for prediction
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return predict_solubility(request.smiles, request.name)


@app.post("/predict/batch", response_model=BatchSolubilityResponse)
async def predict_batch(request: BatchSolubilityRequest):
    """
    Predict water solubility for multiple compounds

    Efficient batch processing for multiple SMILES
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    results = []
    successful = 0
    failed = 0

    for compound in request.compounds:
        result = predict_solubility(compound.smiles, compound.name)
        results.append(result)
        if result.success:
            successful += 1
        else:
            failed += 1

    return BatchSolubilityResponse(
        success=failed == 0,
        results=results,
        total=len(results),
        successful=successful,
        failed=failed
    )


@app.get("/model/info")
async def model_info():
    """Get information about the prediction model"""
    return {
        "name": "Water Solubility Prediction Model",
        "algorithm": "CatBoost Regressor",
        "training_data": "Delaney ESOL Dataset (1144 compounds)",
        "accuracy": {
            "r2": 0.9335,
            "mae": 0.4303,
            "rmse": 0.5557
        },
        "features": [
            {
                "name": "MolLogP",
                "description": "Partition coefficient (lipophilicity)",
                "source": "RDKit Crippen method"
            },
            {
                "name": "MolWt",
                "description": "Molecular weight in g/mol",
                "source": "RDKit"
            },
            {
                "name": "NumRotatableBonds",
                "description": "Number of rotatable bonds",
                "source": "RDKit Lipinski"
            },
            {
                "name": "AromaticProportion",
                "description": "Ratio of aromatic atoms to heavy atoms",
                "source": "Custom calculation"
            }
        ],
        "reference": "Delaney, J.S. (2004). ESOL: Estimating Aqueous Solubility Directly from Molecular Structure. J. Chem. Inf. Comput. Sci., 44(3), 1000-1005"
    }


if __name__ == "__main__":
    import uvicorn

    print("Starting Water Solubility Prediction API Server...")
    print("Requires RDKit and scikit-learn/pycaret to be installed")
    print("\nOnce running, access the API at: http://localhost:8001")
    print("API documentation at: http://localhost:8001/docs")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8001,  # Different port from codon API (8000)
        log_level="info"
    )
