'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
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

export function Login({
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

  const { login, loading, error, clearError } = useLogin();
  const { config: authConfig } = useAuthConfig();

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
    clearError();

    if (!validateForm()) return;

    try {
      await login({ email, password, remember_me: rememberMe });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(loginRedirect);
      }
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoUrl} alt={appName} className="h-16 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-[var(--hit-foreground)] mb-2">
          Welcome Back
        </h1>
        <p className="text-center text-[var(--hit-muted-foreground)] mb-8">{tagline}</p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--hit-error-light)] border border-[var(--hit-error)] rounded-lg">
            <p className="text-sm text-[var(--hit-error)]">{error}</p>
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
            <div className="flex items-center justify-between mb-6">
              {showRememberMe && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--hit-border)] bg-[var(--hit-input-bg)] text-[var(--hit-primary)] focus:ring-[var(--hit-primary)] focus:ring-offset-[var(--hit-background)]"
                  />
                  <span className="text-sm text-[var(--hit-foreground)]">Remember me</span>
                </label>
              )}
              {authConfig?.password_reset !== false && (
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-[var(--hit-muted)] border border-[var(--hit-border)] rounded-lg">
            <p className="text-sm text-[var(--hit-muted-foreground)] text-center">
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
          <p className="mt-8 text-center text-sm text-[var(--hit-muted-foreground)]">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]"
            >
              Sign up
            </button>
          </p>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

export default Login;
