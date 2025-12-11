'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { ThemeProvider, AuthLayout, AuthCard, useThemeTokens, styles } from '@hit/ui-kit';
import { useVerifyEmail } from '../hooks/useAuth';

interface EmailNotVerifiedProps {
  email?: string;
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

function EmailNotVerifiedContent({
  email: propEmail,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: EmailNotVerifiedProps) {
  const [email, setEmail] = useState(propEmail || '');
  const [verificationSentAt, setVerificationSentAt] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [resendSuccess, setResendSuccess] = useState(false);

  const { resendVerification, loading, error, clearError } = useVerifyEmail();
  const { colors, textStyles: ts, spacing, radius } = useThemeTokens();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  useEffect(() => {
    // Get email from URL params if not provided
    if (typeof window !== 'undefined' && !propEmail) {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      if (urlEmail) setEmail(urlEmail);
    }
  }, [propEmail]);

  useEffect(() => {
    // Fetch verification status
    if (email) {
      fetchVerificationStatus(email);
    }
  }, [email]);

  const fetchVerificationStatus = async (userEmail: string) => {
    setLoadingStatus(true);
    try {
      const authUrl = getAuthUrl();
      const res = await fetch(`${authUrl}/verification-status?email=${encodeURIComponent(userEmail)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setVerificationSentAt(data.verification_sent_at || null);
      }
    } catch (err) {
      // Silently fail - we'll just not show the timestamp
      console.error('Failed to fetch verification status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    clearError();
    setResendSuccess(false);
    try {
      await resendVerification(email);
      setResendSuccess(true);
      // Refresh verification status after resending
      await fetchVerificationStatus(email);
    } catch {
      // Error handled by hook
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        {/* Logo */}
        <div style={styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md })}>
          <img src={logoUrl} alt={appName} style={{ height: '2rem', width: 'auto' }} />
        </div>

        {/* Icon */}
        <div style={styles({ textAlign: 'center', marginBottom: spacing.md })}>
          <div style={styles({
            width: '3rem',
            height: '3rem',
            backgroundColor: `${colors.error.default}15`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing.md,
          })}>
            <AlertCircle size={24} style={{ color: colors.error.default }} />
          </div>

          <h1 style={styles({
            fontSize: ts.heading2.fontSize,
            fontWeight: ts.heading2.fontWeight,
            color: colors.text.primary,
            margin: 0,
            marginBottom: spacing.xs,
          })}>
            Email Not Verified
          </h1>

          <p style={styles({
            fontSize: ts.bodySmall.fontSize,
            color: colors.text.secondary,
            marginBottom: spacing.md,
          })}>
            {email ? (
              <>Your email <strong style={{ color: colors.text.primary }}>{email}</strong> has not been verified yet.</>
            ) : (
              'Your email has not been verified yet.'
            )}
          </p>

          {/* Verification email sent timestamp */}
          {loadingStatus ? (
            <div style={styles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xs,
              marginBottom: spacing.lg,
            })}>
              <Loader2 size={16} style={{ color: colors.text.secondary, animation: 'spin 1s linear infinite' }} />
              <span style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.text.secondary,
              })}>
                Loading...
              </span>
            </div>
          ) : verificationSentAt ? (
            <div style={styles({
              marginBottom: spacing.lg,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.bg.muted,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
            })}>
              <p style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.text.secondary,
                margin: 0,
              })}>
                Verification email sent: <strong style={{ color: colors.text.primary }}>{formatDate(verificationSentAt)}</strong>
              </p>
            </div>
          ) : (
            <div style={styles({
              marginBottom: spacing.lg,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.bg.muted,
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
            })}>
              <p style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.text.secondary,
                margin: 0,
              })}>
                No verification email found. Please request a new one.
              </p>
            </div>
          )}

          {/* Success message */}
          {resendSuccess && (
            <div style={styles({
              marginBottom: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: `${colors.success.default}15`,
              border: `1px solid ${colors.success.default}30`,
              borderRadius: radius.md,
            })}>
              <p style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.success.default,
                margin: 0,
              })}>
                Verification email sent successfully!
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={styles({
              marginBottom: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: `${colors.error.default}15`,
              border: `1px solid ${colors.error.default}30`,
              borderRadius: radius.md,
            })}>
              <p style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.error.default,
                margin: 0,
              })}>
                {error}
              </p>
            </div>
          )}

          {/* Resend button */}
          {email && (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              style={styles({
                width: '100%',
                height: '2.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                backgroundColor: colors.primary.default,
                color: colors.text.inverse,
                fontSize: ts.body.fontSize,
                fontWeight: ts.label.fontWeight,
                borderRadius: radius.md,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginBottom: spacing.md,
              })}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </button>
          )}

          {/* Back to login */}
          <div style={styles({
            marginTop: spacing.lg,
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.border.subtle}`,
          })}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.text.secondary,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              Back to Login
            </button>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

// Get default theme from config (set by HitAppProvider)
function getDefaultTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const win = window as unknown as { __HIT_CONFIG?: { branding?: { defaultTheme?: string } } };
  const theme = win.__HIT_CONFIG?.branding?.defaultTheme;
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  // 'system' - check OS preference
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function EmailNotVerified(props: EmailNotVerifiedProps) {
  return (
    <ThemeProvider defaultTheme={getDefaultTheme()}>
      <EmailNotVerifiedContent {...props} />
    </ThemeProvider>
  );
}

export default EmailNotVerified;
