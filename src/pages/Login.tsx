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
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          Welcome Back
        </h1>
        <p className="text-center text-gray-400 mb-8">{tagline}</p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
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
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>
            )}
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* OAuth */}
        {authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (
          <OAuthButtons providers={authConfig.oauth_providers} />
        )}

        {/* Sign up link */}
        {authConfig?.allow_signup && (
          <p className="mt-8 text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-medium text-indigo-400 hover:text-indigo-300"
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
