'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout, AuthCard } from '../components/AuthCard';
import { FormInput } from '../components/FormInput';
import { useForgotPassword } from '../hooks/useAuth';

interface ForgotPasswordProps {
  onNavigate?: (path: string) => void;
  logoUrl?: string;
  appName?: string;
}

export function ForgotPassword({
  onNavigate,
  logoUrl = '/icon.png',
  appName = 'HIT',
}: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { sendResetEmail, loading, error, success, clearError } = useForgotPassword();

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
    clearError();

    if (!validateForm()) return;

    try {
      await sendResetEmail(email);
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
              If an account exists with <strong className="text-[var(--hit-foreground)]">{email}</strong>,
              you will receive a password reset link shortly.
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
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoUrl} alt={appName} className="h-16 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-[var(--hit-foreground)] mb-2">
          Forgot Password?
        </h1>
        <p className="text-center text-[var(--hit-muted-foreground)] mb-8">
          No worries, we&apos;ll send you reset instructions.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--hit-error-light)] border border-[var(--hit-error)] rounded-lg">
            <p className="text-sm text-[var(--hit-error)]">{error}</p>
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
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors mt-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export default ForgotPassword;
