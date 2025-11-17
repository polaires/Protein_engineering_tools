"""
CodonTransformer Local API Server
Run this on your computer to provide codon optimization as a service
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Union, List
import torch
from transformers import AutoTokenizer, BigBirdForMaskedLM
from CodonTransformer.CodonPrediction import predict_dna_sequence
from CodonTransformer.CodonJupyter import format_model_output
import uvicorn

app = FastAPI(
    title="CodonTransformer API",
    description="Local API for codon optimization using CodonTransformer",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Tauri app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and tokenizer (loaded once at startup)
model = None
tokenizer = None
device = None

class OptimizationRequest(BaseModel):
    protein: str = Field(..., description="Protein sequence (amino acids)")
    organism: Union[int, str] = Field(..., description="Target organism name or ID")
    deterministic: bool = Field(True, description="Use deterministic prediction")
    temperature: float = Field(0.2, ge=0.0, le=2.0, description="Sampling temperature (for non-deterministic)")
    top_p: float = Field(0.95, ge=0.0, le=1.0, description="Nucleus sampling threshold")
    num_sequences: int = Field(1, ge=1, le=10, description="Number of sequences to generate")
    avoid_restriction_sites: List[str] = Field(default_factory=list, description="Restriction sites to avoid (e.g., ['BsaI', 'BbsI'])")

class OptimizationResponse(BaseModel):
    success: bool
    dna_sequence: Optional[str] = None
    sequences: Optional[List[str]] = None
    organism: Optional[str] = None
    protein: Optional[str] = None
    formatted_output: Optional[str] = None
    error: Optional[str] = None
    restriction_sites_avoided: Optional[List[str]] = None
    warning: Optional[str] = None

@app.on_event("startup")
async def load_model():
    """Load the model and tokenizer on server startup"""
    global model, tokenizer, device

    print("Loading CodonTransformer model...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    try:
        tokenizer = AutoTokenizer.from_pretrained("adibvafa/CodonTransformer")
        model = BigBirdForMaskedLM.from_pretrained("adibvafa/CodonTransformer").to(device)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "CodonTransformer API",
        "device": str(device),
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "tokenizer_loaded": tokenizer is not None,
        "device": str(device),
        "cuda_available": torch.cuda.is_available()
    }

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_codon(request: OptimizationRequest):
    """
    Optimize codon usage for a protein sequence
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Warning for restriction site avoidance
        warning_msg = None
        if request.avoid_restriction_sites:
            warning_msg = (
                "Note: CodonTransformer API does not guarantee restriction site avoidance. "
                "For strict restriction site avoidance, use the browser-based method. "
                "The generated sequence may contain the specified restriction sites."
            )
            print(f"Warning: Restriction site avoidance requested but not fully supported: {request.avoid_restriction_sites}")

        # Predict DNA sequence(s)
        result = predict_dna_sequence(
            protein=request.protein,
            organism=request.organism,
            device=device,
            tokenizer=tokenizer,
            model=model,
            attention_type="original_full",
            deterministic=request.deterministic,
            temperature=request.temperature,
            top_p=request.top_p,
            num_sequences=request.num_sequences
        )

        # Get organism name from result if available
        organism_name = None
        if hasattr(result, 'organism'):
            organism_name = result.organism
        elif isinstance(result, list) and len(result) > 0 and hasattr(result[0], 'organism'):
            organism_name = result[0].organism
        else:
            organism_name = str(request.organism)

        # Handle single or multiple sequences
        if isinstance(result, list):
            # Multiple sequences returned
            dna_sequences = []
            for r in result:
                if hasattr(r, 'predicted_dna'):
                    dna_sequences.append(r.predicted_dna)
                elif hasattr(r, 'dna'):
                    dna_sequences.append(r.dna)
                else:
                    # Fallback: convert to string
                    dna_sequences.append(str(r))

            # Try to format output
            try:
                formatted = "\n\n".join([format_model_output(r) for r in result])
            except Exception as format_error:
                print(f"Warning: Could not format output: {format_error}")
                formatted = None

            return OptimizationResponse(
                success=True,
                sequences=dna_sequences,
                dna_sequence=dna_sequences[0] if dna_sequences else None,
                organism=organism_name,
                protein=request.protein,  # Use the input protein
                formatted_output=formatted,
                warning=warning_msg
            )
        else:
            # Single sequence returned
            dna_seq = None
            if hasattr(result, 'predicted_dna'):
                dna_seq = result.predicted_dna
            elif hasattr(result, 'dna'):
                dna_seq = result.dna
            else:
                # Fallback: convert to string
                dna_seq = str(result)

            # Try to format output
            try:
                formatted = format_model_output(result)
            except Exception as format_error:
                print(f"Warning: Could not format output: {format_error}")
                formatted = None

            return OptimizationResponse(
                success=True,
                dna_sequence=dna_seq,
                organism=organism_name,
                protein=request.protein,  # Use the input protein
                formatted_output=formatted,
                warning=warning_msg
            )

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error during optimization: {error_details}")

        return OptimizationResponse(
            success=False,
            error=f"{str(e)}"
        )

@app.get("/organisms")
async def list_organisms():
    """
    List all supported organisms
    """
    try:
        from CodonTransformer.CodonUtils import ORGANISM2ID
        return {
            "organisms": list(ORGANISM2ID.keys()),
            "count": len(ORGANISM2ID)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/organisms/search")
async def search_organisms(query: str):
    """
    Search for organisms by name
    """
    try:
        from CodonTransformer.CodonUtils import ORGANISM2ID
        query_lower = query.lower()
        matches = {
            name: idx for name, idx in ORGANISM2ID.items()
            if query_lower in name.lower()
        }
        return {
            "query": query,
            "matches": matches,
            "count": len(matches)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting CodonTransformer API Server...")
    print("The first startup will download the model (~1GB)")
    print("Subsequent startups will be much faster")
    print("\nOnce running, access the API at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")

    uvicorn.run(
        app,
        host="127.0.0.1",  # Only accessible locally
        port=8000,
        log_level="info"
    )
