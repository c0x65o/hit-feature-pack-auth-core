'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { ConditionalThemeProvider, useThemeTokens } from '@hit/ui-kit/theme';
import { styles } from '@hit/ui-kit/components/utils';
import { AuthCard } from '@hit/ui-kit/components/AuthCard';
import { AuthLayout } from '@hit/ui-kit/components/AuthLayout';
import { FormInput } from '@hit/ui-kit/components/FormInput';
import { useFormSubmit } from '@hit/ui-kit/hooks/useFormSubmit';

interface MagicLinkProps {
  token?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

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

function MagicLinkContent({
  token: propToken,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: MagicLinkProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(propToken || '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const { submitting, error, submit, clearError, setError } = useFormSubmit();

  const { colors, textStyles: ts, spacing, radius } = useThemeTokens();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

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

    try {
      const response = await fetchAuth<{ token?: string }>('/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: tokenToVerify }),
      });

      if (response.token && typeof window !== 'undefined') {
        localStorage.setItem('hit_token', response.token);
      }

      setVerified(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify magic link');
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
    if (!validateForm()) return;

    const result = await submit(async () => {
      await fetchAuth('/magic-link/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return { success: true };
    });

    if (result) {
      setSuccess(true);
    }
  };

  // Verifying state
  if (verifying || (token && !verified && !error)) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <Loader2 size={48} style={{ color: colors.primary.default, margin: '0 auto', marginBottom: spacing.md, animation: 'spin 1s linear infinite' }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Verifying Magic Link
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary })}>Please wait...</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Verified state
  if (verified) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <CheckCircle size={48} style={{ color: colors.success.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Login Successful!
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary })}>Redirecting...</p>
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
          <div style={styles({ textAlign: 'center' })}>
            <CheckCircle size={48} style={{ color: colors.success.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Check Your Email
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg })}>
              We&apos;ve sent a magic link to <strong style={{ color: colors.text.primary }}>{email}</strong>.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' })}>
              Back to Login
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Error state (invalid token)
  if (error && token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <Mail size={48} style={{ color: colors.error.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Invalid Magic Link
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg })}>
              {error.message}
            </p>
            <button type="button" onClick={() => { setToken(''); clearError(); navigate('/magic-link'); }} style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' })}>
              Request New Link
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Request form
  return (
    <AuthLayout>
      <AuthCard>
        <button type="button" onClick={() => navigate('/login')} style={styles({ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, background: 'none', border: 'none', cursor: 'pointer', marginBottom: spacing.lg })}>
          <ArrowLeft size={14} />
          Back to Login
        </button>

        <div style={styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md })}>
          <img src={logoUrl} alt={appName} style={{ height: '2rem', width: 'auto' }} />
        </div>

        <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, textAlign: 'center', color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
          Sign in with Magic Link
        </h1>
        <p style={styles({ textAlign: 'center', fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, margin: 0, marginBottom: spacing.lg })}>
          Enter your email and we&apos;ll send you a magic link.
        </p>

        {error && (
          <div style={styles({ marginBottom: spacing.md, padding: `${spacing.sm} ${spacing.md}`, backgroundColor: `${colors.error.default}15`, border: `1px solid ${colors.error.default}30`, borderRadius: radius.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, fontWeight: ts.label.fontWeight, color: colors.error.default, margin: 0 })}>{error.message}</p>
            <button
              onClick={clearError}
              style={styles({
                background: 'none',
                border: 'none',
                color: colors.error.default,
                cursor: 'pointer',
                fontSize: ts.bodySmall.fontSize,
                padding: spacing.xs,
              })}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormInput label="Email address" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="you@example.com" error={fieldErrors.email} autoComplete="email" />

          <button type="submit" disabled={submitting} style={styles({ width: '100%', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, marginTop: spacing.xs })}>
            {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {submitting ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export function MagicLink(props: MagicLinkProps) {
  return (
    <ConditionalThemeProvider>
      <MagicLinkContent {...props} />
    </ConditionalThemeProvider>
  );
}

export default MagicLink;
