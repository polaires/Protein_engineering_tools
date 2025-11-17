/**
 * Cloud API Service
 * Handles communication with Railway backend server
 */

import { User, RegisterRequest, LoginRequest, AuthResponse, Recipe, ConcentrationMeasurement } from '@/types';

// API Base URL - change this to your Railway deployment URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Token Management
// ============================================================================

const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// ============================================================================
// Authentication API
// ============================================================================

export async function registerUser(request: RegisterRequest): Promise<AuthResponse & { token?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

export async function loginUser(request: LoginRequest): Promise<AuthResponse & { token?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (data.success && data.token) {
      setToken(data.token);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

export async function logoutUser(): Promise<AuthResponse> {
  clearToken();
  return {
    success: true,
    message: 'Logged out successfully',
  };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      clearToken();
      return null;
    }

    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Get current user error:', error);
    clearToken();
    return null;
  }
}

// ============================================================================
// Recipe API
// ============================================================================

export async function getUserRecipes(): Promise<Recipe[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipes');
    }

    const data = await response.json();
    return data.success ? data.recipes : [];
  } catch (error) {
    console.error('Get recipes error:', error);
    return [];
  }
}

export async function saveRecipe(recipe: Recipe): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(recipe),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Save recipe error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save recipe',
    };
  }
}

export async function deleteRecipe(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Delete recipe error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete recipe',
    };
  }
}

// ============================================================================
// Measurement API
// ============================================================================

export async function getUserMeasurements(): Promise<ConcentrationMeasurement[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/measurements`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch measurements');
    }

    const data = await response.json();
    return data.success ? data.measurements : [];
  } catch (error) {
    console.error('Get measurements error:', error);
    return [];
  }
}

export async function saveMeasurement(measurement: ConcentrationMeasurement): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/measurements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(measurement),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Save measurement error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save measurement',
    };
  }
}

export async function deleteMeasurement(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/measurements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Delete measurement error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete measurement',
    };
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateUsername(username: string): string | null {
  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (username.length > 50) {
    return 'Username must be less than 50 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (password.length > 100) {
    return 'Password must be less than 100 characters';
  }
  return null;
}
