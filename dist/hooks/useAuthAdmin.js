'use client';
/**
 * Auth Admin API hooks
 */
import { useState, useEffect, useCallback } from 'react';
// Get the auth module URL from environment or defaults
function getAuthUrl() {
    if (typeof window !== 'undefined') {
        // Client-side: check window config or default to proxy
        const win = window;
        return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
    }
    // Server-side: use proxy (env vars handled by Next.js)
    return '/api/proxy/auth';
}
function getAuthHeaders() {
    if (typeof window === 'undefined')
        return {};
    const token = localStorage.getItem('hit_token');
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
}
// Custom error class that preserves HTTP status code
class AuthAdminError extends Error {
    constructor(status, detail) {
        super(detail);
        this.name = 'AuthAdminError';
        this.status = status;
        this.detail = detail;
    }
    // Check if this is an auth error (401/403)
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }
}
async function fetchWithAuth(endpoint, options) {
    const authUrl = getAuthUrl();
    const url = `${authUrl}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options?.headers,
        },
    });
    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = errorBody.detail || errorBody.message || `Request failed: ${res.status}`;
        throw new AuthAdminError(res.status, detail);
    }
    return res.json();
}
export function useStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Stats are computed client-side from other endpoints since auth module
            // doesn't have a dedicated stats endpoint yet
            const [usersRes, sessionsRes, auditRes] = await Promise.allSettled([
                fetchWithAuth('/users'),
                fetchWithAuth('/admin/sessions?limit=1'),
                fetchWithAuth('/audit-log?event_type=login_failure&limit=1000'),
            ]);
            // Check for auth errors first - these should be surfaced to the user
            const usersError = usersRes.status === 'rejected' ? usersRes.reason : null;
            const sessionsError = sessionsRes.status === 'rejected' ? sessionsRes.reason : null;
            const auditError = auditRes.status === 'rejected' ? auditRes.reason : null;
            // If any request got a 401/403, surface that error
            if (usersError instanceof AuthAdminError && usersError.isAuthError()) {
                throw usersError;
            }
            if (sessionsError instanceof AuthAdminError && sessionsError.isAuthError()) {
                throw sessionsError;
            }
            if (auditError instanceof AuthAdminError && auditError.isAuthError()) {
                throw auditError;
            }
            // For other errors (network, etc.), log but continue with partial data
            if (usersError) {
                console.warn('Failed to fetch users for stats:', usersError);
            }
            if (sessionsError) {
                console.warn('Failed to fetch sessions for stats:', sessionsError);
            }
            if (auditError) {
                console.warn('Failed to fetch audit log for stats:', auditError);
            }
            const users = usersRes.status === 'fulfilled' ? usersRes.value : [];
            const totalUsers = users.length;
            const activeSessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.total : 0;
            const twoFactorUsers = users.filter(u => u.two_factor_enabled).length;
            // Calculate failed logins in last 24 hours from audit log
            let failedLogins24h = 0;
            if (auditRes.status === 'fulfilled') {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                failedLogins24h = auditRes.value.events.filter((event) => {
                    const eventDate = new Date(event.created_at);
                    return eventDate >= yesterday;
                }).length;
            }
            // Calculate new users in last 7 days
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const newUsers7d = users.filter(u => {
                const createdDate = new Date(u.created_at);
                return createdDate >= sevenDaysAgo;
            }).length;
            setStats({
                total_users: totalUsers,
                active_sessions: activeSessions,
                failed_logins_24h: failedLogins24h,
                new_users_7d: newUsers7d,
                two_factor_adoption: totalUsers > 0 ? Math.round((twoFactorUsers / totalUsers) * 100) : 0,
                pending_invites: 0, // Invites may be disabled
            });
        }
        catch (e) {
            setError(e);
            setStats(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { stats, loading, error, refresh };
}
export function useUsers(options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { page = 1, pageSize = 25, search } = options;
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            // Auth module returns a plain array, not paginated response
            const users = await fetchWithAuth('/users');
            // Filter by search if provided
            let filtered = users;
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = users.filter(u => u.email.toLowerCase().includes(searchLower));
            }
            // Client-side pagination
            const total = filtered.length;
            const startIdx = (page - 1) * pageSize;
            const items = filtered.slice(startIdx, startIdx + pageSize);
            setData({
                items,
                total,
                page,
                page_size: pageSize,
                total_pages: Math.ceil(total / pageSize),
            });
            setError(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useUser(email) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!email)
            return;
        try {
            setLoading(true);
            const data = await fetchWithAuth(`/users/${encodeURIComponent(email)}`);
            setUser(data);
            setError(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [email]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { user, loading, error, refresh };
}
export function useSessions(options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { page = 1, pageSize = 50, search } = options;
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String(offset),
            });
            if (search)
                params.set('user_email', search);
            // Auth module returns {sessions: [], total: N, limit: N, offset: N}
            const result = await fetchWithAuth(`/admin/sessions?${params}`);
            setData({
                items: result.sessions,
                total: result.total,
                page,
                page_size: pageSize,
                total_pages: Math.ceil(result.total / pageSize),
            });
            setError(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useUserSessions(email, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { page = 1, pageSize = 50 } = options;
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String(offset),
            });
            // Use the dedicated user sessions endpoint
            const result = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/sessions?${params}`);
            setData({
                items: result.sessions,
                total: result.total,
                page,
                page_size: pageSize,
                total_pages: Math.ceil(result.total / pageSize),
            });
            setError(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [email, page, pageSize]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useAuditLog(options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { page = 1, pageSize = 50, search } = options;
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String(offset),
            });
            if (search)
                params.set('user_email', search);
            // Auth module returns {events: [], total: N, limit: N, offset: N}
            // Events have 'metadata' field from API, map it to both 'metadata' and 'details' for compatibility
            const result = await fetchWithAuth(`/audit-log?${params}`);
            setData({
                items: result.events.map(event => ({
                    ...event,
                    details: event.metadata || event.details, // Map metadata to details for backward compatibility
                })),
                total: result.total,
                page,
                page_size: pageSize,
                total_pages: Math.ceil(result.total / pageSize),
            });
            setError(null);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useInvites(options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { page = 1, pageSize = 25 } = options;
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({
                limit: String(pageSize),
                offset: String(offset),
            });
            // Auth module may return {invites: [], total: N} or error if invites disabled
            const result = await fetchWithAuth(`/invites?${params}`);
            // Handle both array and object response formats
            const invites = Array.isArray(result) ? result : (result.invites || []);
            const total = Array.isArray(result) ? result.length : (result.total || 0);
            setData({
                items: invites,
                total,
                page,
                page_size: pageSize,
                total_pages: Math.ceil(total / pageSize),
            });
            setError(null);
        }
        catch (e) {
            // If invites are disabled, return empty list instead of error
            const errMsg = e.message || '';
            if (errMsg.includes('disabled') || errMsg.includes('Invite')) {
                setData({
                    items: [],
                    total: 0,
                    page: 1,
                    page_size: pageSize,
                    total_pages: 0,
                });
                setError(null);
            }
            else {
                setError(e);
            }
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
// Mutation hooks
export function useUserMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const createUser = async (data) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth('/users', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const deleteUser = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const resetPassword = async (email, sendEmail = true, password) => {
        setLoading(true);
        setError(null);
        try {
            // Always use admin endpoint for admin actions
            if (sendEmail) {
                // Use admin endpoint to send password reset email
                const response = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/reset-password`, {
                    method: 'POST',
                    body: JSON.stringify({ send_email: true }),
                });
                return response;
            }
            else {
                // Use admin endpoint to set password directly
                if (!password) {
                    throw new Error('Password is required when setting directly');
                }
                const response = await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/reset-password`, {
                    method: 'POST',
                    body: JSON.stringify({ password, send_email: false }),
                });
                return response;
            }
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const resendVerification = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/resend-verification`, {
                method: 'POST',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const verifyEmail = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/verify`, {
                method: 'PUT',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const updateRoles = async (email, role) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const updateUser = async (email, updates) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const uploadProfilePicture = async (email, file) => {
        setLoading(true);
        setError(null);
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('File must be an image');
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size must be less than 5MB');
            }
            // Convert file to base64 data URL
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            // Update user with the data URL
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify({ profile_picture_url: dataUrl }),
            });
            return dataUrl;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const deleteProfilePicture = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify({ profile_picture_url: null }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const lockUser = async (email) => {
        setLoading(true);
        setError(null);
        try {
            // Lock by setting locked flag via user update
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify({ locked: true }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const unlockUser = async (email) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
                method: 'PUT',
                body: JSON.stringify({ locked: false }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    return {
        createUser,
        deleteUser,
        resetPassword,
        resendVerification,
        verifyEmail,
        updateRoles,
        updateUser,
        uploadProfilePicture,
        deleteProfilePicture,
        lockUser,
        unlockUser,
        loading,
        error,
    };
}
export function useSessionMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const revokeSession = async (sessionId) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/sessions/${sessionId}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const revokeAllUserSessions = async (email) => {
        setLoading(true);
        setError(null);
        try {
            // Note: Auth module may not have this specific endpoint
            // May need to fetch all sessions for user and delete individually
            await fetchWithAuth(`/sessions?user_email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    return { revokeSession, revokeAllUserSessions, loading, error };
}
export function useInviteMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const createInvite = async (data) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth('/invites', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const resendInvite = async (inviteId) => {
        setLoading(true);
        setError(null);
        try {
            // Resend by creating a new invite with same email
            // Auth module may not have a dedicated resend endpoint
            await fetchWithAuth(`/invites/${inviteId}/resend`, {
                method: 'POST',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    const revokeInvite = async (inviteId) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/invites/${inviteId}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    };
    return { createInvite, resendInvite, revokeInvite, loading, error };
}
/**
 * Get admin config from window global (set by HitAppProvider).
 * Config is STATIC - generated at build time from hit.yaml.
 * No API calls needed.
 */
function getWindowAdminConfig() {
    const defaults = {
        allow_signup: false,
        allow_invited: false,
        password_reset: true,
        two_factor_auth: false,
        audit_log: true,
        magic_link_login: false,
        email_verification: true,
        oauth_providers: [],
        rate_limiting: true,
        two_factor_required: false,
        recovery_codes_enabled: true,
        remember_device: true,
        device_fingerprinting: false,
        new_device_alerts: true,
        lockout_notify_user: true,
    };
    if (typeof window === 'undefined') {
        return defaults;
    }
    const win = window;
    if (!win.__HIT_CONFIG?.auth) {
        return defaults;
    }
    const auth = win.__HIT_CONFIG.auth;
    return {
        allow_signup: auth.allowSignup ?? defaults.allow_signup,
        allow_invited: auth.allowInvited ?? defaults.allow_invited,
        password_reset: auth.passwordReset ?? defaults.password_reset,
        two_factor_auth: auth.twoFactorAuth ?? defaults.two_factor_auth,
        audit_log: auth.auditLog ?? defaults.audit_log,
        magic_link_login: auth.magicLinkLogin ?? defaults.magic_link_login,
        email_verification: auth.emailVerification ?? defaults.email_verification,
        oauth_providers: auth.socialProviders || defaults.oauth_providers,
        rate_limiting: auth.rateLimiting ?? defaults.rate_limiting,
        two_factor_required: auth.twoFactorRequired ?? defaults.two_factor_required,
        recovery_codes_enabled: auth.recoveryCodesEnabled ?? defaults.recovery_codes_enabled,
        remember_device: auth.rememberDevice ?? defaults.remember_device,
        device_fingerprinting: auth.deviceFingerprinting ?? defaults.device_fingerprinting,
        new_device_alerts: auth.newDeviceAlerts ?? defaults.new_device_alerts,
        lockout_notify_user: auth.lockoutNotifyUser ?? defaults.lockout_notify_user,
        profile_picture: auth.profilePicture,
        additional_profile_fields: auth.additionalProfileFields,
    };
}
/**
 * Hook to get auth admin config.
 *
 * Config is STATIC - generated at build time from hit.yaml and injected
 * into window.__HIT_CONFIG by HitAppProvider. No API calls needed.
 *
 * This hook reads config synchronously from the window global,
 * avoiding any loading states or UI flicker.
 *
 * Uses useEffect to update config when it becomes available (handles SSR/hydration timing).
 */
export function useAuthAdminConfig() {
    // Read config synchronously on first render
    const [config, setConfig] = useState(() => getWindowAdminConfig());
    // Update config after mount in case it wasn't available during SSR/initial render
    // This handles the case where window.__HIT_CONFIG is injected after component mounts
    useEffect(() => {
        const currentConfig = getWindowAdminConfig();
        setConfig(currentConfig);
    }, []); // Empty deps - only run once after mount
    // No loading state needed - config is static and available immediately
    return { config, loading: false, error: null };
}
/**
 * Hook to fetch profile fields metadata
 */
export function useProfileFields() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchFields = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/profile-fields`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                // If feature is disabled (403), return empty array instead of error
                if (response.status === 403) {
                    setData([]);
                    setError(null);
                    return;
                }
                const errData = await response.json().catch(() => ({ detail: 'Failed to fetch profile fields' }));
                throw new AuthAdminError(response.status, errData.detail || 'Failed to fetch profile fields');
            }
            const fields = await response.json();
            setData(fields);
        }
        catch (e) {
            // If feature is disabled (403), return empty array instead of error
            if (e.status === 403) {
                setData([]);
                setError(null);
            }
            else {
                const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to fetch profile fields');
                setError(err);
                setData(null);
            }
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchFields();
    }, [fetchFields]);
    return { data, loading, error, refresh: fetchFields };
}
/**
 * Hook for profile fields mutations
 */
export function useProfileFieldMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const createField = useCallback(async (field) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/profile-fields`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(field),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Failed to create profile field' }));
                throw new AuthAdminError(response.status, errData.detail || 'Failed to create profile field');
            }
            return await response.json();
        }
        catch (e) {
            const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to create profile field');
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const updateField = useCallback(async (fieldKey, field) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/profile-fields/${encodeURIComponent(fieldKey)}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(field),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Failed to update profile field' }));
                throw new AuthAdminError(response.status, errData.detail || 'Failed to update profile field');
            }
            return await response.json();
        }
        catch (e) {
            const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to update profile field');
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const deleteField = useCallback(async (fieldKey) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${getAuthUrl()}/profile-fields/${encodeURIComponent(fieldKey)}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Failed to delete profile field' }));
                throw new AuthAdminError(response.status, errData.detail || 'Failed to delete profile field');
            }
        }
        catch (e) {
            const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to delete profile field');
            setError(err);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { createField, updateField, deleteField, loading, error };
}
/**
 * Hook to fetch role page permissions
 */
export function useRolePagePermissions(role) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchPermissions = useCallback(async () => {
        if (!role) {
            setData([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const result = await fetchWithAuth(`/admin/permissions/roles/${encodeURIComponent(role)}/pages`);
            setData(result.permissions);
        }
        catch (e) {
            setError(e);
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [role]);
    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);
    return { data, loading, error, refresh: fetchPermissions };
}
/**
 * Hook to fetch user page overrides
 */
export function useUserPageOverrides(email) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchOverrides = useCallback(async () => {
        if (!email) {
            setData([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const result = await fetchWithAuth(`/admin/permissions/users/${encodeURIComponent(email)}/pages`);
            setData(result.overrides);
        }
        catch (e) {
            setError(e);
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [email]);
    useEffect(() => {
        fetchOverrides();
    }, [fetchOverrides]);
    return { data, loading, error, refresh: fetchOverrides };
}
/**
 * Hook to fetch users with overrides
 */
export function useUsersWithOverrides() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchWithAuth('/admin/permissions/users-with-overrides');
            setData(result.users);
        }
        catch (e) {
            setError(e);
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    return { data, loading, error, refresh: fetchUsers };
}
/**
 * Hook for page permissions mutations
 */
export function usePagePermissionsMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const setRolePagePermission = useCallback(async (role, pagePath, enabled) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/roles/${encodeURIComponent(role)}/pages`, {
                method: 'POST',
                body: JSON.stringify({
                    role,
                    page_path: pagePath,
                    enabled,
                }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const deleteRolePagePermission = useCallback(async (role, pagePath) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/roles/${encodeURIComponent(role)}/pages/${encodeURIComponent(pagePath)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const setUserPageOverride = useCallback(async (email, pagePath, enabled) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/users/${encodeURIComponent(email)}/pages`, {
                method: 'POST',
                body: JSON.stringify({
                    page_path: pagePath,
                    enabled,
                }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const deleteUserPageOverride = useCallback(async (email, pagePath) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/users/${encodeURIComponent(email)}/pages/${encodeURIComponent(pagePath)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return {
        setRolePagePermission,
        deleteRolePagePermission,
        setUserPageOverride,
        deleteUserPageOverride,
        loading,
        error,
    };
}
export function useGroupPagePermissions(groupId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchPermissions = useCallback(async () => {
        if (!groupId) {
            setData([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const result = await fetchWithAuth(`/admin/permissions/groups/${groupId}/pages`);
            setData(result.permissions);
        }
        catch (e) {
            setError(e);
            setData(null);
        }
        finally {
            setLoading(false);
        }
    }, [groupId]);
    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);
    return { data, loading, error, refresh: fetchPermissions };
}
export function useGroupPagePermissionsMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const setGroupPagePermission = useCallback(async (groupId, pagePath, enabled) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/groups/${groupId}/pages`, {
                method: 'POST',
                body: JSON.stringify({
                    page_path: pagePath,
                    enabled,
                }),
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const deleteGroupPagePermission = useCallback(async (groupId, pagePath) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/permissions/groups/${groupId}/pages/${encodeURIComponent(pagePath)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return {
        setGroupPagePermission,
        deleteGroupPagePermission,
        loading,
        error,
    };
}
export function useGroups() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWithAuth('/admin/groups');
            setGroups(data);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data: groups, loading, error, refresh };
}
export function useGroup(groupId) {
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!groupId) {
            setGroup(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWithAuth(`/admin/groups/${groupId}`);
            setGroup(data);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [groupId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data: group, loading, error, refresh };
}
export function useGroupUsers(groupId) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!groupId) {
            setUsers([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWithAuth(`/admin/groups/${groupId}/users`);
            setUsers(data);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [groupId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data: users, loading, error, refresh };
}
export function useUserGroups(userEmail) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!userEmail) {
            setGroups([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWithAuth(`/admin/users/${encodeURIComponent(userEmail)}/groups`);
            setGroups(data);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [userEmail]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data: groups, loading, error, refresh };
}
export function useGroupMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const createGroup = useCallback(async (group) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWithAuth('/admin/groups', {
                method: 'POST',
                body: JSON.stringify(group),
            });
            return data;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const updateGroup = useCallback(async (groupId, group) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWithAuth(`/admin/groups/${groupId}`, {
                method: 'PUT',
                body: JSON.stringify(group),
            });
            return data;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const deleteGroup = useCallback(async (groupId) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/groups/${groupId}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const addUserToGroup = useCallback(async (groupId, userEmail) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWithAuth(`/admin/groups/${groupId}/users/${encodeURIComponent(userEmail)}`, {
                method: 'POST',
            });
            return data;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const removeUserFromGroup = useCallback(async (groupId, userEmail) => {
        setLoading(true);
        setError(null);
        try {
            await fetchWithAuth(`/admin/groups/${groupId}/users/${encodeURIComponent(userEmail)}`, {
                method: 'DELETE',
            });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return {
        createGroup,
        updateGroup,
        deleteGroup,
        addUserToGroup,
        removeUserFromGroup,
        loading,
        error,
    };
}
// Export types and error class
export { AuthAdminError };
//# sourceMappingURL=useAuthAdmin.js.map