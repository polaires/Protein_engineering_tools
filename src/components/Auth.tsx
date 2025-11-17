/**
 * Authentication Component
 * Handles user login and registration
 */

import { useState } from 'react';
import { UserPlus, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import * as authValidation from '@/services/auth';

type AuthMode = 'login' | 'register';

export default function Auth() {
  const { register, login } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username validation
    const usernameError = authValidation.validateUsername(username);
    if (usernameError) {
      newErrors.username = usernameError;
    }

    // Email validation (only for registration)
    if (mode === 'register') {
      const emailError = authValidation.validateEmail(email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    // Password validation
    const passwordError = authValidation.validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Confirm password (only for registration)
    if (mode === 'register' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login({ username, password });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({ username, email, password });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  // Switch mode
  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-primary-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-600 dark:bg-primary-500 mb-4">
            {mode === 'login' ? (
              <LogIn className="w-8 h-8 text-white" />
            ) : (
              <UserPlus className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Protein Engineering Tools
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="input-label flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Username
              </label>
              <input
                type="text"
                className={`input-field ${errors.username ? 'border-red-500 dark:border-red-500' : ''}`}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors({ ...errors, username: '' });
                }}
                disabled={isLoading}
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.username}</p>
              )}
            </div>

            {/* Email (Registration only) */}
            {mode === 'register' && (
              <div>
                <label className="input-label flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  className={`input-field ${errors.email ? 'border-red-500 dark:border-red-500' : ''}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: '' });
                  }}
                  disabled={isLoading}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="input-label flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                className={`input-field ${errors.password ? 'border-red-500 dark:border-red-500' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({ ...errors, password: '' });
                }}
                disabled={isLoading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password (Registration only) */}
            {mode === 'register' && (
              <div>
                <label className="input-label flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  className={`input-field ${errors.confirmPassword ? 'border-red-500 dark:border-red-500' : ''}`}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors({ ...errors, confirmPassword: '' });
                  }}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {mode === 'login' ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  )}
                </span>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={switchMode}
                className="ml-2 text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                disabled={isLoading}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          Your data is stored locally on your device
        </p>
      </div>
    </div>
  );
}
