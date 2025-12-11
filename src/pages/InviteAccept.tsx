'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles } from '@hit/ui-kit';
import { useAcceptInvite, useAuthConfig } from '../hooks/useAuth';

interface InviteAcceptProps {
  token?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
  welcomeMessage?: string;
  passwordMinLength?: number;
}

function InviteAcceptContent({
  token: propToken,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
  welcomeMessage,
  passwordMinLength = 8,
}: InviteAcceptProps) {
  const [token, setToken] = useState(propToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { acceptInvite, loading, error, success, clearError } = useAcceptInvite();
  const { config: authConfig } = useAuthConfig();
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
      if (urlToken) setToken(urlToken);
    }
  }, [propToken]);

  // Check if password is required
  const passwordRequired = authConfig.password_login === true;
  const hasOAuthProviders = authConfig.oauth_providers && authConfig.oauth_providers.length > 0;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (passwordRequired) {
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < passwordMinLength) {
        errors.password = `Password must be at least ${passwordMinLength} characters`;
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;

    try {
      await acceptInvite(token, passwordRequired ? password : undefined);
      // Redirect after successful acceptance
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch {
      // Error is handled by the hook
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <XCircle size={48} style={{ color: colors.error.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({
              fontSize: ts.heading2.fontSize,
              fontWeight: ts.heading2.fontWeight,
              color: colors.text.primary,
              margin: 0,
              marginBottom: spacing.xs,
            })}>
              Invalid Invite Link
            </h1>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            })}>
              This invitation link is invalid or has expired.
            </p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <div style={styles({ textAlign: 'center' })}>
            <CheckCircle size={48} style={{ color: colors.success.default, margin: '0 auto', marginBottom: spacing.md }} />
            <h1 style={styles({
              fontSize: ts.heading2.fontSize,
              fontWeight: ts.heading2.fontWeight,
              color: colors.text.primary,
              margin: 0,
              marginBottom: spacing.xs,
            })}>
              Welcome to {appName}!
            </h1>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            })}>
              Your account has been created successfully. Redirecting you now...
            </p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        {/* Logo */}
        <div style={styles({ display: 'flex', justifyContent: 'center', marginBottom: spacing.md })}>
          <img src={logoUrl} alt={appName} style={{ height: '2rem', width: 'auto' }} />
        </div>

        {/* Title */}
        <h1 style={styles({
          fontSize: ts.heading2.fontSize,
          fontWeight: ts.heading2.fontWeight,
          textAlign: 'center',
          color: colors.text.primary,
          margin: 0,
          marginBottom: spacing.xs,
        })}>
          Welcome to {appName}!
        </h1>
        <p style={styles({
          textAlign: 'center',
          fontSize: ts.bodySmall.fontSize,
          color: colors.text.secondary,
          margin: 0,
          marginBottom: spacing.lg,
        })}>
          {welcomeMessage || `You've been invited to join ${appName}. Please set up your account to continue.`}
        </p>

        {/* Error Message */}
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
              fontWeight: ts.label.fontWeight,
              color: colors.error.default,
              margin: 0,
            })}>{error}</p>
          </div>
        )}

        {/* Note: OAuth integration with invites requires backend support for invite token handling in OAuth flow */}
        {/* For now, password setup is required when password_login is enabled */}

        {/* Password Form */}
        {passwordRequired && (
          <form onSubmit={handleSubmit}>
            <FormInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password}
              autoComplete="new-password"
            />

            <FormInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Submit Button */}
            <button
              type="submit"
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
                marginTop: spacing.xs,
              })}
            >
              {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Setting up account...' : 'Accept Invitation'}
            </button>
          </form>
        )}

        {/* If no password required and no OAuth, show a simple accept button */}
        {!passwordRequired && !hasOAuthProviders && (
          <button
            type="button"
            onClick={handleSubmit}
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
            })}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Accepting...' : 'Accept Invitation'}
          </button>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

export function InviteAccept(props: InviteAcceptProps) {
  return (
    <ConditionalThemeProvider>
      <InviteAcceptContent {...props} />
    </ConditionalThemeProvider>
  );
}

export default InviteAccept;

