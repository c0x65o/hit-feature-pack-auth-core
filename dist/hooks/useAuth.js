/**
 * Auth hooks for authentication operations
 */
import { useState, useCallback } from 'react';
// Get the auth module URL
function getAuthUrl() {
    if (typeof window !== 'undefined') {
        // Client-side: check window config or default to proxy
        const win = window;
        return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
    }
    // Server-side: use proxy (env vars handled by Next.js)
    return '/api/proxy/auth';
}
// Check if debug mode is enabled
function isDebugMode() {
    if (typeof window === 'undefined')
        return false;
    // Check window config first
    const win = window;
    if (win.__HIT_CONFIG?.debug)
        return true;
    // Check for NEXT_PUBLIC_DEBUG env var (set at build time)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEBUG === 'true')
        return true;
    // Check URL param for development
    if (window.location.search.includes('debug=true'))
        return true;
    return false;
}
async function fetchAuth(endpoint, options) {
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
        // In debug mode, show detailed error from backend
        if (isDebugMode() && data.debug) {
            const debugInfo = data.debug;
            const detailedError = [
                data.detail || 'Request failed',
                debugInfo.exception_type ? `[${debugInfo.exception_type}]` : '',
                debugInfo.exception_message ? debugInfo.exception_message : '',
            ].filter(Boolean).join(' - ');
            // Log full debug info to console
            console.error('Auth Error Debug:', {
                endpoint,
                status: res.status,
                ...data.debug,
            });
            throw new Error(detailedError);
        }
        throw new Error(data.detail || data.message || data.error || `Request failed: ${res.status}`);
    }
    return data;
}
/**
 * Default auth config - RESTRICTIVE defaults.
 *
 * Since config is static (generated at build time from hit.yaml),
 * we use restrictive defaults for SSR. The actual config from
 * window.__HIT_CONFIG is read synchronously on client mount.
 *
 * Backend is still the source of truth for security - these
 * defaults only affect initial SSR render before hydration.
 */
const DEFAULT_AUTH_CONFIG = {
    allow_signup: false, // Don't show signup unless explicitly enabled
    password_login: true, // Show password form by default
    password_reset: true, // Show forgot password by default
    magic_link_login: false, // Don't show magic link unless explicitly enabled
    email_verification: true,
    two_factor_auth: false,
    oauth_providers: [],
};
/**
 * Get config from window global (set by HitAppProvider).
 * This is synchronous and available immediately on client.
 */
function getWindowConfig() {
    if (typeof window === 'undefined') {
        // SSR: return restrictive defaults
        return DEFAULT_AUTH_CONFIG;
    }
    const win = window;
    if (!win.__HIT_CONFIG?.auth) {
        // No config injected yet - return restrictive defaults
        return DEFAULT_AUTH_CONFIG;
    }
    const auth = win.__HIT_CONFIG.auth;
    return {
        allow_signup: auth.allowSignup ?? false,
        password_login: auth.passwordLogin ?? true,
        password_reset: auth.passwordReset ?? true,
        magic_link_login: auth.magicLinkLogin ?? false,
        email_verification: auth.emailVerification ?? true,
        two_factor_auth: auth.twoFactorAuth ?? false,
        oauth_providers: auth.socialProviders || [],
    };
}
/**
 * Hook to get auth config.
 *
 * Config is STATIC - generated at build time from hit.yaml and injected
 * into window.__HIT_CONFIG by HitAppProvider. No API calls needed.
 *
 * This hook reads config synchronously from the window global,
 * avoiding any loading states or UI flicker.
 */
export function useAuthConfig() {
    // Read config synchronously - no useEffect, no fetch
    // useState initializer runs once and reads from window.__HIT_CONFIG
    const [config] = useState(() => getWindowConfig());
    // No loading state needed - config is static and available immediately
    return { config, loading: false, error: null };
}
/**
 * Helper to set token in both localStorage and cookie
 * Cookie is needed for middleware to check auth state
 */
function setAuthToken(token, rememberMe = false) {
    if (typeof window === 'undefined')
        return;
    // Store in localStorage
    localStorage.setItem('hit_token', token);
    // Set cookie for middleware (with appropriate expiry)
    // Parse token to get expiry
    let maxAge = 3600; // Default 1 hour
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp) {
                // Calculate seconds until expiry
                maxAge = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
            }
        }
    }
    catch {
        // Use default
    }
    // If remember me is checked, extend the cookie life (7 days)
    if (rememberMe) {
        maxAge = Math.max(maxAge, 7 * 24 * 60 * 60);
    }
    // Set cookie (SameSite=Lax for CSRF protection while allowing redirects)
    document.cookie = `hit_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
/**
 * Helper to clear auth tokens
 */
function clearAuthToken() {
    if (typeof window === 'undefined')
        return;
    localStorage.removeItem('hit_token');
    document.cookie = 'hit_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
export function useLogin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const login = useCallback(async (payload) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchAuth('/login', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // Store token in localStorage and cookie for middleware
            if (res.token && typeof window !== 'undefined') {
                setAuthToken(res.token, payload.remember_me);
            }
            return res;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Login failed';
            // Don't set error state for email verification errors - let the component handle redirect
            const isVerificationError = message.toLowerCase().includes('email verification required') ||
                message.toLowerCase().includes('verification required');
            if (!isVerificationError) {
                setError(message);
            }
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { login, loading, error, clearError: () => setError(null) };
}
export function useSignup() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const signup = useCallback(async (payload) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchAuth('/register', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // Store token if returned (auto-login after signup)
            if (res.token && typeof window !== 'undefined') {
                setAuthToken(res.token, false);
            }
            return res;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Signup failed';
            setError(message);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { signup, loading, error, clearError: () => setError(null) };
}
export function useForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const sendResetEmail = useCallback(async (email) => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            await fetchAuth('/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            setSuccess(true);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to send reset email';
            setError(message);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { sendResetEmail, loading, error, success, clearError: () => setError(null) };
}
export function useResetPassword() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const resetPassword = useCallback(async (token, password) => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            await fetchAuth('/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, password }),
            });
            setSuccess(true);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to reset password';
            setError(message);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { resetPassword, loading, error, success, clearError: () => setError(null) };
}
export function useVerifyEmail() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const verifyEmail = useCallback(async (tokenOrCode, email) => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            // If email is provided, assume it's a code-based verification
            // Otherwise, assume it's a token-based verification
            const payload = email
                ? { email, code: tokenOrCode }
                : { token: tokenOrCode };
            await fetchAuth('/verify-email', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            setSuccess(true);
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to verify email';
            setError(message);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const resendVerification = useCallback(async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchAuth('/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
        }
        catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to resend verification';
            setError(message);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { verifyEmail, resendVerification, loading, error, success, clearError: () => setError(null) };
}
export function useOAuth() {
    const initiateOAuth = useCallback((provider) => {
        const authUrl = getAuthUrl();
        const returnUrl = typeof window !== 'undefined' ? window.location.origin : '';
        // Redirect URI should match Google's configured callback URL
        // Frontend has a route handler at /api/oauth/[provider]/callback that proxies to auth module
        window.location.href = `${authUrl}/oauth/${provider}/authorize?redirect_uri=${encodeURIComponent(returnUrl)}/api/oauth/${provider}/callback`;
    }, []);
    return { initiateOAuth };
}
export { clearAuthToken };
//# sourceMappingURL=useAuth.js.map