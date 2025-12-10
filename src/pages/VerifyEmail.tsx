'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { ThemeProvider, AuthLayout, AuthCard, useThemeTokens, styles } from '@hit/ui-kit';
import { useVerifyEmail } from '../hooks/useAuth';

interface VerifyEmailProps {
  token?: string;
  email?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

function VerifyEmailContent({
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
  const { colors, textStyles: ts, spacing, radius } = useThemeTokens();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

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

  useEffect(() => {
    // Auto-verify if token is present (token-based verification)
    if (token && !email && !autoVerified && !success && !error) {
      setAutoVerified(true);
      verifyEmail(token).catch(() => {});
    }
  }, [token, email, autoVerified, success, error, verifyEmail]);

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

  // Loading state
  if (token && loading && !success && !error) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <Loader2 size={48} style={{ color: colors.primary.default, margin: '0 auto', marginBottom: spacing.md, animation: 'spin 1s linear infinite' }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Verifying Email
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary })}>Please wait...</p>
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
          <div style={styles({ textAlign: 'center' })}>
            <CheckCircle size={48} style={{ color: colors.success.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Email Verified!
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg })}>
              You can now sign in to your account.
            </p>
            <button type="button" onClick={() => navigate('/login')} style={styles({ width: '100%', height: '2.25rem', backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: 'pointer' })}>
              Sign In
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Error state
  if (error && token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <XCircle size={48} style={{ color: colors.error.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
              Verification Failed
            </h1>
            <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg })}>
              {error}
            </p>
            {email && (
              <button type="button" onClick={handleResend} disabled={loading} style={styles({ width: '100%', height: '2.25rem', backgroundColor: colors.primary.default, color: colors.text.inverse, fontSize: ts.body.fontSize, fontWeight: ts.label.fontWeight, borderRadius: radius.md, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, marginBottom: spacing.md })}>
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}
            <button type="button" onClick={() => navigate('/login')} style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: 'pointer' })}>
              Back to Login
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  // Waiting state (no token)
  return (
    <AuthLayout>
      <AuthCard>
        <div style={styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md })}>
          <img src={logoUrl} alt={appName} style={{ height: '2rem', width: 'auto' }} />
        </div>

        <div style={styles({ textAlign: 'center' })}>
          <div style={styles({ width: '3rem', height: '3rem', backgroundColor: colors.primary.light, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: spacing.md })}>
            <Mail size={24} style={{ color: colors.primary.default }} />
          </div>
          <h1 style={styles({ fontSize: ts.heading2.fontSize, fontWeight: ts.heading2.fontWeight, color: colors.text.primary, margin: 0, marginBottom: spacing.xs })}>
            Check Your Email
          </h1>
          <p style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, marginBottom: spacing.lg })}>
            {email ? (
              <>We&apos;ve sent a verification link to <strong style={{ color: colors.text.primary }}>{email}</strong>.</>
            ) : (
              'Please check your email for a verification link.'
            )}
          </p>

          {email && (
            <button type="button" onClick={handleResend} disabled={loading} style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.primary.default, background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 })}>
              {loading ? 'Sending...' : "Didn't receive it? Resend"}
            </button>
          )}

          <div style={styles({ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.border.subtle}` })}>
            <button type="button" onClick={() => navigate('/login')} style={styles({ fontSize: ts.bodySmall.fontSize, color: colors.text.secondary, background: 'none', border: 'none', cursor: 'pointer' })}>
              Back to Login
            </button>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

export function VerifyEmail(props: VerifyEmailProps) {
  return (
    <ThemeProvider defaultTheme="dark">
      <VerifyEmailContent {...props} />
    </ThemeProvider>
  );
}

export default VerifyEmail;
