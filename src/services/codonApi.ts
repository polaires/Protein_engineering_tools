/**
 * CodonTransformer API Service
 * Interfaces with local CodonTransformer API server
 */

interface OptimizationRequest {
  protein: string;
  organism: string | number;
  deterministic?: boolean;
  temperature?: number;
  top_p?: number;
  num_sequences?: number;
  match_protein?: boolean;
}

interface OptimizationResponse {
  success: boolean;
  dna_sequence?: string;
  sequences?: string[];
  organism?: string;
  protein?: string;
  formatted_output?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  model_loaded: boolean;
  tokenizer_loaded: boolean;
  device: string;
  cuda_available: boolean;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export class CodonTransformerAPI {

  static async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('API server not available');
    }
    return response.json();
  }

  static async optimizeCodon(request: OptimizationRequest): Promise<OptimizationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during API request');
    }
  }

  static async listOrganisms(): Promise<{ organisms: string[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/organisms`);
    if (!response.ok) {
      throw new Error('Failed to fetch organisms');
    }
    return response.json();
  }

  static async searchOrganisms(query: string): Promise<{ matches: Record<string, number>; count: number }> {
    const response = await fetch(`${API_BASE_URL}/organisms/search?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search organisms');
    }
    return response.json();
  }
}

export type { OptimizationRequest, OptimizationResponse, HealthResponse };
