"""
CodonTransformer Local API Server
Run this on your computer to provide codon optimization as a service
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Union, List, Dict
import torch
from transformers import AutoTokenizer, BigBirdForMaskedLM
from CodonTransformer.CodonPrediction import predict_dna_sequence
from CodonTransformer.CodonJupyter import format_model_output
import uvicorn
import random

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

# Restriction site recognition sequences
RESTRICTION_SITES: Dict[str, str] = {
    'BsaI': 'GGTCTC',
    'BbsI': 'GAAGAC',
    'BsmBI': 'CGTCTC',
    'SapI': 'GCTCTTC',
    'BtgZI': 'GCGATG',
    'Esp3I': 'CGTCTC',  # Same as BsmBI
}

# Genetic code
GENETIC_CODE = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
}

# Reverse mapping: amino acid to possible codons
AA_TO_CODONS = {}
for codon, aa in GENETIC_CODE.items():
    if aa not in AA_TO_CODONS:
        AA_TO_CODONS[aa] = []
    AA_TO_CODONS[aa].append(codon)

def reverse_complement(seq: str) -> str:
    """Get reverse complement of DNA sequence"""
    complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
    return ''.join(complement.get(base, base) for base in reversed(seq))

def check_restriction_sites(sequence: str, sites_to_check: List[str]) -> List[str]:
    """Check if sequence contains any restriction sites (forward or reverse complement)"""
    found = []
    for site_name in sites_to_check:
        if site_name not in RESTRICTION_SITES:
            continue
        site_seq = RESTRICTION_SITES[site_name]
        site_rc = reverse_complement(site_seq)
        if site_seq in sequence or site_rc in sequence:
            found.append(site_name)
    return found

def translate_dna(dna_seq: str) -> str:
    """Translate DNA sequence to protein"""
    protein = []
    for i in range(0, len(dna_seq), 3):
        codon = dna_seq[i:i+3]
        if len(codon) == 3:
            aa = GENETIC_CODE.get(codon, 'X')
            protein.append(aa)
    return ''.join(protein)

def avoid_restriction_sites_in_dna(dna_seq: str, sites_to_avoid: List[str], max_attempts: int = 100) -> tuple[str, List[str]]:
    """
    Attempt to remove restriction sites from DNA sequence by changing synonymous codons.
    Returns (modified_sequence, list_of_avoided_sites)
    """
    # First check if there are any sites to avoid
    found_sites = check_restriction_sites(dna_seq, sites_to_avoid)
    if not found_sites:
        return dna_seq, sites_to_avoid  # No sites found, return original

    # Translate to protein to maintain amino acid sequence
    original_protein = translate_dna(dna_seq)

    # Try to modify codons to avoid restriction sites
    modified_seq = dna_seq
    attempts = 0

    while attempts < max_attempts:
        # Check which sites are still present
        remaining_sites = check_restriction_sites(modified_seq, sites_to_avoid)
        if not remaining_sites:
            break  # Success! All sites avoided

        # Find positions where restriction sites occur
        site_positions = []
        for site_name in remaining_sites:
            site_seq = RESTRICTION_SITES[site_name]
            site_rc = reverse_complement(site_seq)

            # Find all occurrences
            for i in range(len(modified_seq) - len(site_seq) + 1):
                if modified_seq[i:i+len(site_seq)] in (site_seq, site_rc):
                    site_positions.append(i)

        if not site_positions:
            break

        # Try to modify codons around restriction sites
        # Pick a random site position to modify
        pos = random.choice(site_positions)

        # Find which codons overlap with this position
        codon_start = (pos // 3) * 3
        codon_end = min(codon_start + 9, len(modified_seq))  # Check 3 codons

        # Try changing one of the codons in this region
        changed = False
        for codon_pos in range(codon_start, codon_end, 3):
            if codon_pos + 3 > len(modified_seq):
                break

            original_codon = modified_seq[codon_pos:codon_pos+3]
            aa = GENETIC_CODE.get(original_codon, 'X')

            if aa == 'X' or aa == '*':
                continue

            # Try alternative codons for this amino acid
            alternative_codons = [c for c in AA_TO_CODONS.get(aa, []) if c != original_codon]
            if not alternative_codons:
                continue

            # Try each alternative
            for alt_codon in alternative_codons:
                test_seq = modified_seq[:codon_pos] + alt_codon + modified_seq[codon_pos+3:]

                # Check if this reduces restriction sites
                test_sites = check_restriction_sites(test_seq, sites_to_avoid)
                if len(test_sites) < len(remaining_sites):
                    modified_seq = test_seq
                    changed = True
                    break

            if changed:
                break

        if not changed:
            # If we couldn't make progress, stop trying
            break

        attempts += 1

    # Verify protein sequence is unchanged
    final_protein = translate_dna(modified_seq)
    if final_protein != original_protein:
        # If protein changed, return original sequence
        print(f"Warning: Protein sequence changed during restriction site avoidance, reverting")
        return dna_seq, []

    # Return modified sequence and list of successfully avoided sites
    still_present = check_restriction_sites(modified_seq, sites_to_avoid)
    avoided = [site for site in sites_to_avoid if site not in still_present]

    return modified_seq, avoided

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

            # Apply restriction site avoidance if requested
            avoided_sites = []
            warning_msg = None
            if request.avoid_restriction_sites:
                print(f"Attempting to avoid restriction sites: {request.avoid_restriction_sites}")
                modified_sequences = []
                for dna_seq in dna_sequences:
                    modified_seq, avoided = avoid_restriction_sites_in_dna(dna_seq, request.avoid_restriction_sites)
                    modified_sequences.append(modified_seq)
                    avoided_sites = avoided  # Use the avoided sites from the first sequence

                dna_sequences = modified_sequences

                # Check if all sites were avoided
                still_present = check_restriction_sites(dna_sequences[0], request.avoid_restriction_sites)
                if still_present:
                    warning_msg = f"Could not avoid all restriction sites. Still present: {', '.join(still_present)}"
                else:
                    print(f"Successfully avoided all {len(avoided_sites)} restriction sites")

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
                restriction_sites_avoided=avoided_sites if avoided_sites else None,
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

            # Apply restriction site avoidance if requested
            avoided_sites = []
            warning_msg = None
            if request.avoid_restriction_sites and dna_seq:
                print(f"Attempting to avoid restriction sites: {request.avoid_restriction_sites}")
                dna_seq, avoided_sites = avoid_restriction_sites_in_dna(dna_seq, request.avoid_restriction_sites)

                # Check if all sites were avoided
                still_present = check_restriction_sites(dna_seq, request.avoid_restriction_sites)
                if still_present:
                    warning_msg = f"Could not avoid all restriction sites. Still present: {', '.join(still_present)}"
                else:
                    print(f"Successfully avoided all {len(avoided_sites)} restriction sites")

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
                restriction_sites_avoided=avoided_sites if avoided_sites else None,
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
