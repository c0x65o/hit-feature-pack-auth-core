'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormInput({
  label,
  error,
  type = 'text',
  className = '',
  ...props
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="mb-4">
      <label className="block text-[var(--hit-foreground)] text-sm font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={`
            w-full h-12 px-4 ${isPassword ? 'pr-12' : ''}
            bg-[var(--hit-input-bg)] border border-[var(--hit-border)] rounded-lg
            text-[var(--hit-foreground)] placeholder-[var(--hit-input-placeholder)]
            focus:border-[var(--hit-primary)] focus:ring-1 focus:ring-[var(--hit-primary)] focus:outline-none
            transition-colors
            ${error ? 'border-[var(--hit-error)]' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--hit-muted-foreground)] hover:text-[var(--hit-foreground)] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hit-primary)] focus-visible:ring-offset-0 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-[var(--hit-error)]">{error}</p>}
    </div>
  );
}
