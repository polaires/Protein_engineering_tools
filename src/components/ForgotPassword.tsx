/**
 * Forgot Password Component
 * Modal for requesting password reset email
 */

import { useState } from 'react';
import { Mail, X, Loader, CheckCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onClose: () => void;
}

export default function ForgotPassword({ onClose }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {status !== 'success' ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-primary-100 dark:bg-primary-900/30 p-2">
                  <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Forgot Password?
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="input-field"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              {/* Error message */}
              {status === 'error' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            {/* Back to login */}
            <div className="mt-4 text-center">
              <button
                onClick={onClose}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                Back to Login
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Check Your Email
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  The reset link will expire in 1 hour.
                </p>
                <button
                  onClick={onClose}
                  className="btn-primary w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
