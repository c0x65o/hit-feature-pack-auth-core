'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles, useFormSubmit } from '@hit/ui-kit';
import { useResetPassword } from '../hooks/useAuth';

interface ResetPasswordProps {
  token?: string;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
  passwordMinLength?: number;
}

function ResetPasswordContent({
  token: propToken,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
  passwordMinLength = 8,
}: ResetPasswordProps) {
  const [token, setToken] = useState(propToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const { resetPassword } = useResetPassword();
  const { submitting, error, submit, clearError } = useFormSubmit();
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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < passwordMinLength) {
      errors.password = `Password must be at least ${passwordMinLength} characters`;
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await submit(async () => {
      await resetPassword(token, password);
      return { success: true };
    });

    if (result) {
      setSuccess(true);
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
              Invalid Link
            </h1>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            })}>
              This password reset link is invalid or has expired.
            </p>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.primary.default,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              Request New Link
            </button>
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
              Password Reset!
            </h1>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            })}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={styles({
                width: '100%',
                height: '2.25rem',
                backgroundColor: colors.primary.default,
                color: colors.text.inverse,
                fontSize: ts.body.fontSize,
                fontWeight: ts.label.fontWeight,
                borderRadius: radius.md,
                border: 'none',
                cursor: 'pointer',
              })}
            >
              Sign In
            </button>
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
          Reset Password
        </h1>
        <p style={styles({
          textAlign: 'center',
          fontSize: ts.bodySmall.fontSize,
          color: colors.text.secondary,
          margin: 0,
          marginBottom: spacing.lg,
        })}>
          Enter your new password below.
        </p>

        {/* Error Message */}
        {error && (
          <div style={styles({
            marginBottom: spacing.md,
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: `${colors.error.default}15`,
            border: `1px solid ${colors.error.default}30`,
            borderRadius: radius.md,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          })}>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              fontWeight: ts.label.fontWeight,
              color: colors.error.default,
              margin: 0,
            })}>{error.message}</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FormInput
            label="New Password"
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
            disabled={submitting}
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
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
              marginTop: spacing.xs,
            })}
          >
            {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export function ResetPassword(props: ResetPasswordProps) {
  return (
    <ConditionalThemeProvider>
      <ResetPasswordContent {...props} />
    </ConditionalThemeProvider>
  );
}

export default ResetPassword;
