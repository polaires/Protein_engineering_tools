/**
 * Email Verification Banner
 * Shows reminder for unverified users
 */

import { useState } from 'react';
import { Mail, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function EmailVerificationBanner() {
  const { currentUser, showToast } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Don't show if user is not logged in, email is verified, or banner is dismissed
  if (!currentUser || currentUser.email_verified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    setIsResending(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      const response = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        showToast('success', data.message || 'Verification email sent!');
      } else {
        showToast('error', data.message || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      showToast('error', 'An error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-b-2 border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Please verify your email address
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Check your inbox at <strong>{currentUser.email}</strong> for the verification link
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isResending ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Email
                </>
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
