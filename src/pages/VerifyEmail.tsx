'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { useVerifyEmail } from '../hooks/useAuth';

interface VerifyEmailProps {
  token?: string;
  email?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

export function VerifyEmail({
  token: propToken,
  email: propEmail,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: VerifyEmailProps) {
  const [token, setToken] = useState(propToken || '');
  const [email, setEmail] = useState(propEmail || '');
  const [autoVerified, setAutoVerified] = useState(false);

  const { verifyEmail, resendVerification, loading, error, success, clearError } = useVerifyEmail();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // Extract token and email from URL if not provided as props
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (!propToken) {
        const urlToken = params.get('token');
        if (urlToken) setToken(urlToken);
      }
      if (!propEmail) {
        const urlEmail = params.get('email');
        if (urlEmail) setEmail(urlEmail);
      }
    }
  }, [propToken, propEmail]);

  // Auto-verify if token is present
  useEffect(() => {
    if (token && !autoVerified && !success && !error) {
      setAutoVerified(true);
      verifyEmail(token).catch(() => {
        // Error handled by hook
      });
    }
  }, [token, autoVerified, success, error, verifyEmail]);

  const handleResend = async () => {
    if (!email) return;
    clearError();
    try {
      await resendVerification(email);
      alert('Verification email resent!');
    } catch {
      // Error handled by hook
    }
  };

  // Loading state during auto-verification
  if (token && loading && !success && !error) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
            <p className="text-gray-400">Please wait while we verify your email...</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-gray-400 mb-6">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Error state (invalid/expired token)
  if (error && token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-gray-400 mb-6">
              {error || 'This verification link is invalid or has expired.'}
            </p>
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg transition-colors mb-4"
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Back to Login
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Waiting for verification (no token, just informational)
  return (
    <AuthLayout>
      <AuthCard>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoUrl} alt={appName} className="h-16 w-auto" />
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-gray-400 mb-6">
            {email ? (
              <>
                We&apos;ve sent a verification link to{' '}
                <strong className="text-white">{email}</strong>.
                Click the link in the email to verify your account.
              </>
            ) : (
              'Please check your email for a verification link.'
            )}
          </p>

          {email && (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : "Didn't receive the email? Resend"}
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-gray-800">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-gray-400 hover:text-gray-300"
            >
              Back to Login
            </button>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

export default VerifyEmail;
