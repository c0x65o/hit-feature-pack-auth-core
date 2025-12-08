'use client';

import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = '' }: AuthCardProps) {
  return (
    <div className={`w-full max-w-md p-8 bg-[var(--hit-surface)] backdrop-blur-sm border border-[var(--hit-border)] rounded-2xl shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--hit-background)] p-4">
      {children}
    </div>
  );
}
