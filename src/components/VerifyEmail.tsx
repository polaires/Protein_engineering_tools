/**
 * Email Verification Page
 */

import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Loader } from 'lucide-react';

interface VerifyEmailProps {
  token: string;
  onVerified?: () => void;
}

export default function VerifyEmail({ token, onVerified }: VerifyEmailProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verifyEmail() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Your email has been successfully verified!');
          if (onVerified) {
            onVerified();
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again.');
      }
    }

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [token, onVerified]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="glass-card max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader className="w-16 h-16 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Verifying Your Email
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
              Email Verified!
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {message}
            </p>
            <div className="pt-4">
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                Continue to App
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
                <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-100">
              Verification Failed
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {message}
            </p>
            <div className="pt-4 space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                The verification link may have expired. Links are valid for 24 hours.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary w-full"
              >
                Return to App
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Mail className="w-4 h-4" />
            <span>Need help? <a href="mailto:oneweiway@gmail.com" className="text-primary-600 dark:text-primary-400 hover:underline">Contact support</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
