'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles, useFormSubmit } from '@hit/ui-kit';
import { useForgotPassword } from '../hooks/useAuth';

interface ForgotPasswordProps {
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

function ForgotPasswordContent({
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const { sendResetEmail } = useForgotPassword();
  const { submitting, error, submit, clearError } = useFormSubmit();
  const { colors, textStyles: ts, spacing, radius } = useThemeTokens();

  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
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
      await sendResetEmail(email);
      return { success: true };
    });

    if (result) {
      setSuccess(true);
    }
  };

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
              Check Your Email
            </h1>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              marginBottom: spacing.lg,
            })}>
              If an account exists with <strong style={{ color: colors.text.primary }}>{email}</strong>,
              you will receive a password reset link shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={styles({
                fontSize: ts.bodySmall.fontSize,
                color: colors.primary.default,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              Back to Login
            </button>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={styles({
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: ts.bodySmall.fontSize,
            color: colors.text.secondary,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: spacing.lg,
          })}
        >
          <ArrowLeft size={14} />
          Back to Login
        </button>

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
          Forgot Password?
        </h1>
        <p style={styles({
          textAlign: 'center',
          fontSize: ts.bodySmall.fontSize,
          color: colors.text.secondary,
          margin: 0,
          marginBottom: spacing.lg,
        })}>
          No worries, we&apos;ll send you reset instructions.
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
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export function ForgotPassword(props: ForgotPasswordProps) {
  return (
    <ConditionalThemeProvider>
      <ForgotPasswordContent {...props} />
    </ConditionalThemeProvider>
  );
}

export default ForgotPassword;
