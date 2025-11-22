/**
 * Reset Password Page
 * Full-screen page for setting new password with reset token
 */

import { useState, useEffect } from 'react';
import { Lock, CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordProps {
  token: string;
  onComplete?: () => void;
}

export default function ResetPassword({ token, onComplete }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No reset token provided. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = () => {
    if (!password) {
      setValidationError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setStatus('loading');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Your password has been reset successfully!');
        if (onComplete) {
          setTimeout(() => onComplete(), 3000);
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password. The link may have expired.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setStatus('error');
      setMessage('An error occurred while resetting your password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="glass-card max-w-md w-full p-8">
        {status === 'idle' || status === 'loading' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary-100 dark:bg-primary-900/30 p-4">
                  <Lock className="w-12 h-12 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Reset Your Password
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Enter your new password below
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="input-field pr-10"
                    disabled={status === 'loading'}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="input-field pr-10"
                    disabled={status === 'loading'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Password requirements */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary w-full"
              >
                {status === 'loading' ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
              Password Reset!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {message}
            </p>
            <div className="pt-4">
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary w-full"
              >
                Continue to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-100">
              Reset Failed
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {message}
            </p>
            <div className="pt-4 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Reset links are valid for 1 hour. Please request a new password reset.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary w-full"
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
