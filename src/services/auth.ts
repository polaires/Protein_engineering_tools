/**
 * Authentication Service
 * Handles user registration, login, and session management via Tauri commands
 */

import { invoke } from '@tauri-apps/api/tauri';
import { User, RegisterRequest, LoginRequest, AuthResponse } from '@/types';

// ============================================================================
// Authentication API
// ============================================================================

/**
 * Register a new user
 */
export async function registerUser(request: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await invoke<AuthResponse>('register_user', { request });
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Login user
 */
export async function loginUser(request: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await invoke<AuthResponse>('login_user', { request });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<AuthResponse> {
  try {
    const response = await invoke<AuthResponse>('logout_user');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await invoke<User | null>('get_current_user');
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
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
