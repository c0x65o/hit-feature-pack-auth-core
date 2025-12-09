/**
 * Auth hooks for authentication operations
 */

import { useState, useCallback, useEffect } from 'react';

interface AuthConfig {
  allow_signup: boolean;
  oauth_providers: string[];
  password_login: boolean;
  password_reset?: boolean;
  magic_link_login: boolean;
  email_verification?: boolean;
  two_factor_auth?: boolean;
}

interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface SignupPayload {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  message?: string;
}

// Get the auth module URL
function getAuthUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: check window config or default to proxy
    const win = window as unknown as Record<string, string>;
    return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
  }
  // Server-side: use proxy (env vars handled by Next.js)
  return '/api/proxy/auth';
}

async function fetchAuth<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authUrl = getAuthUrl();
  const url = `${authUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const mapHitConfig = (hitCfg: any): Partial<AuthConfig> => {
      if (!hitCfg?.auth) return {};
      return {
        allow_signup: hitCfg.auth.allowSignup,
        password_login: hitCfg.auth.passwordLogin,
        password_reset: hitCfg.auth.passwordReset,
        magic_link_login: hitCfg.auth.magicLinkLogin,
        email_verification: hitCfg.auth.emailVerification,
        two_factor_auth: hitCfg.auth.twoFactorAuth,
        oauth_providers: hitCfg.auth.socialProviders || [],
      };
    };

    Promise.all([
      fetchAuth<{ data: AuthConfig }>('/config').catch((e) => {
        setError(e);
        return null;
      }),
      fetch('/hit-config.json').then((res) => res.json()).catch(() => null),
    ])
      .then(([apiRes, hitCfg]) => {
        const apiConfig = (apiRes?.data || apiRes) as AuthConfig | null;
        const merged: AuthConfig = {
          allow_signup: apiConfig?.allow_signup ?? mapHitConfig(hitCfg).allow_signup ?? false,
          password_login: apiConfig?.password_login ?? mapHitConfig(hitCfg).password_login ?? true,
          magic_link_login: apiConfig?.magic_link_login ?? mapHitConfig(hitCfg).magic_link_login ?? false,
          email_verification: apiConfig?.email_verification ?? mapHitConfig(hitCfg).email_verification,
          two_factor_auth: apiConfig?.two_factor_auth ?? mapHitConfig(hitCfg).two_factor_auth,
          oauth_providers: apiConfig?.oauth_providers ?? mapHitConfig(hitCfg).oauth_providers ?? [],
        };
        setConfig(merged);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading, error };
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuth<AuthResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Token is usually set as HttpOnly cookie by the server
      // but if returned, we can store it
      if (res.token && typeof window !== 'undefined') {
        localStorage.setItem('hit_token', res.token);
      }

      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error, clearError: () => setError(null) };
}

export function useSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = useCallback(async (payload: SignupPayload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchAuth<AuthResponse>('/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Signup failed';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signup, loading, error, clearError: () => setError(null) };
}

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendResetEmail = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await fetchAuth('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send reset email';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendResetEmail, loading, error, success, clearError: () => setError(null) };
}

export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await fetchAuth('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reset password';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resetPassword, loading, error, success, clearError: () => setError(null) };
}

export function useVerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const verifyEmail = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await fetchAuth('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to verify email';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      await fetchAuth('/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to resend verification';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { verifyEmail, resendVerification, loading, error, success, clearError: () => setError(null) };
}

export function useOAuth() {
  const initiateOAuth = useCallback((provider: string) => {
    const authUrl = getAuthUrl();
    const returnUrl = typeof window !== 'undefined' ? window.location.origin : '';
    window.location.href = `${authUrl}/oauth/${provider}/authorize?redirect_uri=${encodeURIComponent(returnUrl)}/api/auth/callback/${provider}`;
  }, []);

  return { initiateOAuth };
}

export type { AuthConfig, LoginPayload, SignupPayload, AuthResponse };
