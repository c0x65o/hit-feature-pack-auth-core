'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';

interface MagicLinkProps {
  token?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

// Get the auth module URL
function getAuthUrl(): string {
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, string>;
    return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
  }
  return '/api/proxy/auth';
}

async function fetchAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authUrl = getAuthUrl();
  const url = `${authUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || data.detail || `Request failed: ${res.status}`);
  }

  return data;
}

export function MagicLink({
  token: propToken,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: MagicLinkProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(propToken || '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // Extract token from URL if not provided as prop
  useEffect(() => {
    if (!propToken && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
        handleVerifyToken(urlToken);
      }
    }
  }, [propToken]);

  const handleVerifyToken = async (tokenToVerify: string) => {
    setVerifying(true);
    setError(null);

    try {
      const response = await fetchAuth<{ token?: string; refresh_token?: string }>('/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: tokenToVerify }),
      });

      if (response.token && typeof window !== 'undefined') {
        localStorage.setItem('hit_token', response.token);
      }

      setVerified(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to verify magic link';
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await fetchAuth('/magic-link/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send magic link';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Verifying token state
  if (verifying || (token && !verified && !error)) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[var(--hit-primary)] mx-auto mb-3 animate-spin" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Verifying Magic Link</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)]">Please wait...</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Verified successfully state
  if (verified) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Login Successful!</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)]">Redirecting...</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Success state (email sent)
  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Check Your Email</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
              We&apos;ve sent a magic link to <strong className="text-[var(--hit-foreground)]">{email}</strong>.
            </p>
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

  // Error state (invalid/expired token)
  if (error && token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <Mail className="w-12 h-12 text-[var(--hit-error)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Invalid Magic Link</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
              {error || 'This magic link is invalid or has expired.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setToken('');
                setError(null);
                navigate('/magic-link');
              }}
              className="text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium"
            >
              Request New Link
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Request magic link form
  return (
    <AuthLayout>
      <AuthCard>
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img src={logoUrl} alt={appName} className="h-8 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-center text-[var(--hit-foreground)] mb-0.5">
          Sign in with Magic Link
        </h1>
        <p className="text-center text-xs text-[var(--hit-muted-foreground)] mb-4">
          Enter your email and we&apos;ll send you a magic link.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md">
            <p className="text-xs font-medium text-red-400 m-0">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={fieldErrors.email}
            autoComplete="email"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mt-1"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export default MagicLink;
