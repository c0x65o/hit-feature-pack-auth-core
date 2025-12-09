'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { OAuthButtons } from '../components/OAuthButtons';
import { useSignup, useAuthConfig } from '../hooks/useAuth';

interface SignupProps {
  onSuccess?: () => void;
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
  tagline?: string;
  signupRedirect?: string;
  passwordMinLength?: number;
}

/**
 * Signup page.
 * 
 * Always renders the form - backend enforces whether signup is enabled.
 * If disabled, the API will return an error which is shown to the user.
 * This approach prevents UI flicker and is more secure (backend is source of truth).
 */
export function Signup({
  onSuccess,
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
  tagline = 'Create your account to get started',
  signupRedirect = '/',
  passwordMinLength = 8,
}: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const { signup, loading, error, clearError } = useSignup();
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
    clearError();

    if (!validateForm()) return;

    try {
      await signup({ email, password, name: name || undefined });
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error is handled by the hook
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-[var(--hit-success)] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[var(--hit-foreground)] mb-2">Check Your Email</h1>
            <p className="text-[var(--hit-muted-foreground)] mb-6">
              We&apos;ve sent a verification email to <strong className="text-[var(--hit-foreground)]">{email}</strong>.
              Please click the link in the email to verify your account.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium"
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
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoUrl} alt={appName} className="h-16 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-[var(--hit-foreground)] mb-2">
          Create Account
        </h1>
        <p className="text-center text-[var(--hit-muted-foreground)] mb-8">{tagline}</p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--hit-error-light)] border border-[var(--hit-error)] rounded-lg">
            <p className="text-sm text-[var(--hit-error)]">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Name (optional)"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
          />

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
            className="w-full h-12 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors mt-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* OAuth */}
        {authConfig?.oauth_providers && authConfig.oauth_providers.length > 0 && (
          <OAuthButtons providers={authConfig.oauth_providers} />
        )}

        {/* Login link */}
        <p className="mt-8 text-center text-sm text-[var(--hit-muted-foreground)]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-medium text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)]"
          >
            Sign in
          </button>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default Signup;
