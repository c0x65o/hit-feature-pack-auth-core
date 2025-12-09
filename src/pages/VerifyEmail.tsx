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
      verifyEmail(token).catch(() => {});
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
            <Loader2 className="w-12 h-12 text-[var(--hit-primary)] mx-auto mb-3 animate-spin" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Verifying Email</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)]">Please wait...</p>
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
            <CheckCircle className="w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Email Verified!</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
              You can now sign in to your account.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full h-9 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] text-white text-sm font-semibold rounded-md transition-colors"
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
            <XCircle className="w-12 h-12 text-[var(--hit-error)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Verification Failed</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
              {error || 'This link is invalid or has expired.'}
            </p>
            {email && (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full h-9 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mb-3"
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium"
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
        <div className="flex justify-center mb-3">
          <img src={logoUrl} alt={appName} className="h-8 w-auto" />
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-[var(--hit-primary-light)] rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-[var(--hit-primary)]" />
          </div>
          <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Check Your Email</h1>
          <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
            {email ? (
              <>
                We&apos;ve sent a verification link to{' '}
                <strong className="text-[var(--hit-foreground)]">{email}</strong>.
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
              className="text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : "Didn't receive it? Resend"}
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--hit-border)]">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)]"
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
