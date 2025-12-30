'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ConditionalThemeProvider, AuthLayout, AuthCard, FormInput, useThemeTokens, styles, useFormSubmit } from '@hit/ui-kit';
import { OAuthButtons } from '../components/OAuthButtons';
import { useLogin, useAuthConfig } from '../hooks/useAuth';

interface LoginProps {
  onSuccess?: () => void;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
  tagline?: string;
  showRememberMe?: boolean;
  loginRedirect?: string;
}

function LoginContent({
  onSuccess,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
  tagline = 'Sign in to continue your journey',
  showRememberMe = true,
  loginRedirect = '/',
}: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { login } = useLogin();
  const { submitting, error, submit, clearError } = useFormSubmit();
  const { config: authConfig } = useAuthConfig();
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
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await submit(async () => {
      await login({ email, password, remember_me: rememberMe });
      return { success: true };
    });

    if (result) {
      // Check if error is email verification required
      if (error) {
        const errorMessage = error.message.toLowerCase();
        const isVerificationError = 
          errorMessage.includes('email verification required') || 
          errorMessage.includes('verification required');
        
        if (isVerificationError) {
          navigate(`/email-not-verified?email=${encodeURIComponent(email)}`);
          return;
        }
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(loginRedirect);
      }
    } else if (error) {
      // Check if error is email verification required
      const errorMessage = error.message.toLowerCase();
      const isVerificationError = 
        errorMessage.includes('email verification required') || 
        errorMessage.includes('verification required');
      
      if (isVerificationError) {
        navigate(`/email-not-verified?email=${encodeURIComponent(email)}`);
      }
    }
  };

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
          Welcome Back
        </h1>
        <p style={styles({
          textAlign: 'center',
          fontSize: ts.bodySmall.fontSize,
          color: colors.text.secondary,
          margin: 0,
          marginBottom: spacing.lg,
        })}>
          {tagline}
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
            })}>
              {error.message}
            </p>
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
        {authConfig?.password_login ? (
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

            <FormInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password}
              autoComplete="current-password"
            />

            {/* Remember me + Forgot password */}
            <div style={styles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            })}>
              {showRememberMe && (
                <label style={styles({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  cursor: 'pointer',
                })}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '0.75rem', height: '0.75rem' }}
                  />
                  <span style={styles({
                    fontSize: ts.bodySmall.fontSize,
                    color: colors.text.primary,
                  })}>
                    Remember me
                  </span>
                </label>
              )}
              {authConfig?.password_reset !== false && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={styles({
                    fontSize: ts.bodySmall.fontSize,
                    fontWeight: ts.label.fontWeight,
                    color: colors.primary.default,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  })}
                >
                  Forgot password?
                </button>
              )}
            </div>

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
              })}
            >
              {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div style={styles({
            marginBottom: spacing.lg,
            padding: spacing.md,
            backgroundColor: colors.bg.muted,
            border: `1px solid ${colors.border.default}`,
            borderRadius: radius.md,
          })}>
            <p style={styles({
              fontSize: ts.bodySmall.fontSize,
              color: colors.text.secondary,
              textAlign: 'center',
              margin: 0,
            })}>
              Password login is disabled. Please use one of the authentication methods below.
            </p>
          </div>
        )}

        {/* OAuth */}
        {authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (
          <OAuthButtons providers={authConfig.oauth_providers} />
        )}

        {/* Sign up link */}
        {authConfig?.allow_signup && (
          <p style={styles({
            marginTop: spacing.lg,
            textAlign: 'center',
            fontSize: ts.bodySmall.fontSize,
            color: colors.text.secondary,
          })}>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              style={styles({
                fontWeight: ts.label.fontWeight,
                color: colors.primary.default,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              Sign up
            </button>
          </p>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

export function Login(props: LoginProps) {
  return (
    <ConditionalThemeProvider>
      <LoginContent {...props} />
    </ConditionalThemeProvider>
  );
}

export default Login;
