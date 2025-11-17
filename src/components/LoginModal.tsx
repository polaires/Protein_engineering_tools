/**
 * Login Modal Component
 * Shown when unauthenticated users try to save data
 */

import { useState } from 'react';
import { X, UserPlus, LogIn, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import * as cloudApi from '@/services/cloudApi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  message?: string;
}

type AuthMode = 'login' | 'register';

export default function LoginModal({ isOpen, onClose, onSuccess, message }: LoginModalProps) {
  const { register, login } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const usernameError = cloudApi.validateUsername(username);
    if (usernameError) newErrors.username = usernameError;

    if (mode === 'register') {
      const emailError = cloudApi.validateEmail(email);
      if (emailError) newErrors.email = emailError;
    }

    const passwordError = cloudApi.validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    if (mode === 'register' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await login({ username, password });
      } else {
        result = await register({ username, email, password });
      }

      if (result.success) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setIsLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            {message && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {message}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="input-label flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Username
            </label>
            <input
              type="text"
              className={`input-field ${errors.username ? 'border-red-500' : ''}`}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors({ ...errors, username: '' });
              }}
              disabled={isLoading}
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
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ ...errors, email: '' });
                }}
                disabled={isLoading}
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
              className={`input-field ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: '' });
              }}
              disabled={isLoading}
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
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="btn-primary w-full" disabled={isLoading}>
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

          {/* Switch Mode */}
          <div className="text-center pt-2">
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
        </form>
      </div>
    </div>
  );
}
