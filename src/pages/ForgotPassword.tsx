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
            <CheckCircle className="w-12 h-12 text-[var(--hit-success)] mx-auto mb-3" />
            <h1 className="text-lg font-bold text-[var(--hit-foreground)] mb-1">Check Your Email</h1>
            <p className="text-xs text-[var(--hit-muted-foreground)] mb-4">
              If an account exists with <strong className="text-[var(--hit-foreground)]">{email}</strong>,
              you will receive a password reset link shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-xs text-[var(--hit-primary)] hover:text-[var(--hit-primary-hover)] font-medium"
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
          className="flex items-center gap-1.5 text-xs text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img src={logoUrl} alt={appName} className="h-8 w-auto" />
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-center text-[var(--hit-foreground)] mb-0.5">
          Forgot Password?
        </h1>
        <p className="text-center text-xs text-[var(--hit-muted-foreground)] mb-4">
          No worries, we&apos;ll send you reset instructions.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] rounded-md">
            <p className="text-xs font-medium text-red-400 m-0">{error}</p>
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
            className="w-full h-9 flex items-center justify-center gap-2 bg-[var(--hit-primary)] hover:bg-[var(--hit-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors mt-1"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

export default ForgotPassword;
