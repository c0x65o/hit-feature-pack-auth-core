'use client';

/**
 * Auth Admin API hooks
 */

import { useState, useEffect, useCallback } from 'react';

interface User {
  email: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  role?: string;  // Single role string
  roles?: string[];  // Legacy support - will be removed
  metadata?: { role?: string; [key: string]: unknown };
  created_at: string;
  updated_at?: string;
  last_login?: string | null;
  oauth_providers?: string[] | null;  // OAuth providers linked to this account
  locked?: boolean;
  profile_picture_url?: string | null;
  profile_fields?: Record<string, unknown> | null;
}

interface Session {
  id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  current?: boolean;
}

interface AuditLogEntry {
  id: string;
  user_email: string;
  event_type: string;
  ip_address: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  // Backend historically used a single `role` string, while some UIs expect `roles: string[]`.
  // Normalize to `roles` in the hook so the UI can render consistently.
  role?: string;
  roles?: string[];
  invited_by?: string;
  inviter_email?: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

interface Stats {
  total_users: number;
  active_sessions: number;
  failed_logins_24h: number;
  new_users_7d: number;
  two_factor_adoption: number;
  pending_invites: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// FEATURE FLAGS (runtime from auth module)
// =============================================================================

export interface AuthFeatures {
  // We only type the bits we need in the UI.
  user_groups_enabled?: boolean;
  dynamic_groups_enabled?: boolean;
  [k: string]: unknown;
}

export function useAuthFeatures() {
  const [features, setFeatures] = useState<AuthFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authUrl = getAuthUrl();
      const res = await fetch(`${authUrl}/features`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new AuthAdminError(res.status, body?.detail || body?.message || `Failed to fetch features: ${res.status}`);
      }
      const json = await res.json().catch(() => ({}));
      const f = (json && typeof json === 'object' && (json as any).features && typeof (json as any).features === 'object')
        ? ((json as any).features as AuthFeatures)
        : ({} as AuthFeatures);
      setFeatures(f);
    } catch (e) {
      setError(e as Error);
      setFeatures(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: features, loading, error, refresh };
}

interface UseQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Get the auth URL (TS-only, always via in-app proxy)
function getAuthUrl(): string {
  return '/api/proxy/auth';
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('hit_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Custom error class that preserves HTTP status code
class AuthAdminError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'AuthAdminError';
    this.status = status;
    this.detail = detail;
  }

  // Check if this is an auth error (401/403)
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function normalizeErrorDetail(errorBody: any, fallback: string): string {
  const detail = errorBody?.detail ?? errorBody?.message ?? fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors often come back as a list of { loc, msg, type }.
    const firstMsg = detail.find((d: any) => typeof d?.msg === 'string')?.msg;
    if (firstMsg) return String(firstMsg);
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
    const detail = normalizeErrorDetail(errorBody, `Request failed: ${res.status}`);
    throw new AuthAdminError(res.status, detail);
  }

  // Many endpoints (DELETE, etc.) correctly return 204 No Content.
  // In that case, avoid calling res.json() (it will throw).
  if (res.status === 204 || res.status === 205 || res.status === 304) {
    return undefined as T;
  }

  // If server returns empty body, treat it as undefined as well.
  const contentLength = res.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  return res.json();
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Stats are computed client-side from other endpoints since auth module
      // doesn't have a dedicated stats endpoint yet
      const [usersRes, sessionsRes, auditRes] = await Promise.allSettled([
        fetchWithAuth<User[]>('/users'),
        fetchWithAuth<{sessions: Session[], total: number}>('/admin/sessions?limit=1'),
        fetchWithAuth<{events: AuditLogEntry[], total: number}>('/audit-log?event_type=login_failure&limit=1000'),
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
        failedLogins24h = auditRes.value.events.filter((event: AuditLogEntry) => {
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
    } catch (e) {
      setError(e as Error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}

export function useUsers(options: UseQueryOptions = {}) {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { page = 1, pageSize = 25, search, sortBy = 'created_at', sortOrder = 'desc' } = options;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // Auth module returns a plain array, not paginated response
      const users = await fetchWithAuth<User[]>('/users');

      // Filter by search if provided
      let filtered = users;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = users.filter(u => u.email.toLowerCase().includes(searchLower));
      }

      // Sort client-side (auth module /users does not support server sorting)
      const dir = sortOrder === 'asc' ? 1 : -1;
      const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'email') {
          return a.email.localeCompare(b.email) * dir;
        }
        if (sortBy === 'last_login') {
          const av = a.last_login ? new Date(a.last_login).getTime() : -Infinity;
          const bv = b.last_login ? new Date(b.last_login).getTime() : -Infinity;
          return (av - bv) * dir;
        }
        // created_at (default)
        const av = a.created_at ? new Date(a.created_at).getTime() : -Infinity;
        const bv = b.created_at ? new Date(b.created_at).getTime() : -Infinity;
        return (av - bv) * dir;
      });

      // Client-side pagination
      const total = sorted.length;
      const startIdx = (page - 1) * pageSize;
      const items = sorted.slice(startIdx, startIdx + pageSize);

      setData({
        items,
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      });
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortOrder]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUser(email: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!email) return;
    try {
      setLoading(true);
      const data = await fetchWithAuth<User>(`/users/${encodeURIComponent(email)}`);
      setUser(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, error, refresh };
}

export function useSessions(options: UseQueryOptions = {}) {
  const [data, setData] = useState<PaginatedResponse<Session> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { page = 1, pageSize = 50, search } = options;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (search) params.set('user_email', search);

      // Auth module returns {sessions: [], total: N, limit: N, offset: N}
      const result = await fetchWithAuth<{sessions: Session[], total: number, limit: number, offset: number}>(`/admin/sessions?${params}`);

      setData({
        items: result.sessions,
        total: result.total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(result.total / pageSize),
      });
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUserSessions(email: string, options: { page?: number; pageSize?: number } = {}) {
  const [data, setData] = useState<PaginatedResponse<Session> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      const result = await fetchWithAuth<{sessions: Session[], total: number, limit: number, offset: number}>(
        `/admin/users/${encodeURIComponent(email)}/sessions?${params}`
      );

      setData({
        items: result.sessions,
        total: result.total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(result.total / pageSize),
      });
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [email, page, pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAuditLog(options: UseQueryOptions = {}) {
  const [data, setData] = useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { page = 1, pageSize = 50, search } = options;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (search) params.set('user_email', search);

      // Auth module returns {events: [], total: N, limit: N, offset: N}
      // Events have 'metadata' field from API, map it to both 'metadata' and 'details' for compatibility
      const result = await fetchWithAuth<{events: Array<AuditLogEntry & {metadata?: Record<string, unknown>}>, total: number, limit: number, offset: number}>(`/audit-log?${params}`);

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
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useInvites(options: UseQueryOptions = {}) {
  const [data, setData] = useState<PaginatedResponse<Invite> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      const result = await fetchWithAuth<{invites?: Invite[], total?: number} | Invite[]>(`/invites?${params}`);

      // Handle both array and object response formats
      const invites = Array.isArray(result) ? result : (result.invites || []);
      const total = Array.isArray(result) ? result.length : (result.total || 0);

      setData({
        items: invites.map((inv) => {
          const roles = Array.isArray(inv.roles)
            ? inv.roles
            : (typeof inv.role === 'string' && inv.role ? [inv.role] : []);
          return { ...inv, roles };
        }),
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize),
      });
      setError(null);
    } catch (e) {
      // If invites are disabled, return empty list instead of error
      const errMsg = (e as Error).message || '';
      if (errMsg.includes('disabled') || errMsg.includes('Invite')) {
        setData({
          items: [],
          total: 0,
          page: 1,
          page_size: pageSize,
          total_pages: 0,
        });
        setError(null);
      } else {
        setError(e as Error);
      }
    } finally {
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
  const [error, setError] = useState<Error | null>(null);

  type ImpersonateResponse = {
    token: string;
    refresh_token?: string;
    impersonated_user?: {
      email?: string;
      email_verified?: boolean;
      roles?: string[];
    };
    admin_email?: string;
  };

  const createUser = async (data: { email: string; password: string; roles?: string[] }) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string, sendEmail: boolean = true, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Always use admin endpoint for admin actions
      if (sendEmail) {
        // Use admin endpoint to send password reset email
        const response = await fetchWithAuth<{ status: string; message: string }>(
          `/admin/users/${encodeURIComponent(email)}/reset-password`,
          {
            method: 'POST',
            body: JSON.stringify({ send_email: true }),
          }
        );
        return response;
      } else {
        // Use admin endpoint to set password directly
        if (!password) {
          throw new Error('Password is required when setting directly');
        }
        const response = await fetchWithAuth<{ status: string; message: string }>(
          `/admin/users/${encodeURIComponent(email)}/reset-password`,
          {
            method: 'POST',
            body: JSON.stringify({ password, send_email: false }),
          }
        );
        return response;
      }
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/resend-verification`, {
        method: 'POST',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/verify`, {
        method: 'PUT',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateRoles = async (email: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (email: string, updates: { role?: string; profile_fields?: Record<string, unknown>; profile_picture_url?: string | null }) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePicture = async (email: string, file: File): Promise<string> => {
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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Update user with the data URL
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ profile_picture_url: dataUrl }),
      });

      return dataUrl;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const uploadProfilePictureBase64 = async (email: string, base64DataUrl: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      // Update user with the base64 data URL
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ profile_picture_url: base64DataUrl }),
      });

      return base64DataUrl;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const deleteProfilePicture = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ profile_picture_url: null }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const lockUser = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      // Lock by setting locked flag via user update
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ locked: true }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const unlockUser = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        body: JSON.stringify({ locked: false }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const startImpersonation = async (userEmail: string): Promise<ImpersonateResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchWithAuth<ImpersonateResponse>('/impersonate/start', {
        method: 'POST',
        body: JSON.stringify({ user_email: userEmail }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
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
    uploadProfilePictureBase64,
    deleteProfilePicture,
    lockUser,
    unlockUser,
    startImpersonation,
    loading,
    error,
  };
}

export function useSessionMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const revokeSession = async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const revokeAllUserSessions = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/users/${encodeURIComponent(email)}/sessions`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { revokeSession, revokeAllUserSessions, loading, error };
}

export function useInviteMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createInvite = async (data: { email: string; role?: string }) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth('/invites', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Resend by creating a new invite with same email
      // Auth module may not have a dedicated resend endpoint
      await fetchWithAuth(`/invites/${inviteId}/resend`, {
        method: 'POST',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/invites/${inviteId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { createInvite, resendInvite, revokeInvite, loading, error };
}

// =============================================================================
// ADMIN CONFIG HOOK
// =============================================================================

interface AuthAdminConfig {
  allow_signup: boolean;
  allow_invited: boolean;
  password_reset: boolean;
  two_factor_auth: boolean;
  audit_log: boolean;
  magic_link_login: boolean;
  email_verification: boolean;
  oauth_providers: string[];
  rate_limiting: boolean;
  two_factor_required: boolean;
  recovery_codes_enabled: boolean;
  remember_device: boolean;
  device_fingerprinting: boolean;
  new_device_alerts: boolean;
  lockout_notify_user: boolean;
  profile_picture?: boolean;
  additional_profile_fields?: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    required?: boolean;
    display_order?: number;
  }>;
}

/**
 * Get admin config from window global (set by HitAppProvider).
 * Config is STATIC - generated at build time from hit.yaml.
 * No API calls needed.
 */
function getWindowAdminConfig(): AuthAdminConfig {
  const defaults: AuthAdminConfig = {
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

  const win = window as unknown as { __HIT_CONFIG?: any };
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
  const [config, setConfig] = useState<AuthAdminConfig>(() => getWindowAdminConfig());

  // Update config after mount in case it wasn't available during SSR/initial render
  // This handles the case where window.__HIT_CONFIG is injected after component mounts
  useEffect(() => {
    const currentConfig = getWindowAdminConfig();
    setConfig(currentConfig);
  }, []); // Empty deps - only run once after mount

  // No loading state needed - config is static and available immediately
  return { config, loading: false, error: null };
}

// =============================================================================
// PROFILE FIELDS HOOKS
// =============================================================================

export interface ProfileFieldMetadata {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'string' | 'int';
  required: boolean;
  default_value: string | null;
  validation_rules: Record<string, unknown> | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileFieldMetadataCreate {
  field_key: string;
  field_label: string;
  field_type: 'string' | 'int';
  required?: boolean;
  default_value?: string | null;
  validation_rules?: Record<string, unknown> | null;
  display_order?: number;
}

export interface ProfileFieldMetadataUpdate {
  field_label?: string;
  field_type?: 'string' | 'int';
  required?: boolean;
  default_value?: string | null;
  validation_rules?: Record<string, unknown> | null;
  display_order?: number;
}

/**
 * Hook to fetch profile fields metadata
 */
export function useProfileFields() {
  const [data, setData] = useState<ProfileFieldMetadata[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
    } catch (e) {
      // If feature is disabled (403), return empty array instead of error
      if ((e as AuthAdminError).status === 403) {
        setData([]);
        setError(null);
      } else {
        const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to fetch profile fields');
        setError(err);
        setData(null);
      }
    } finally {
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
  const [error, setError] = useState<Error | null>(null);

  const createField = useCallback(async (field: ProfileFieldMetadataCreate) => {
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
    } catch (e) {
      const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to create profile field');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateField = useCallback(async (fieldKey: string, field: ProfileFieldMetadataUpdate) => {
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
    } catch (e) {
      const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to update profile field');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteField = useCallback(async (fieldKey: string) => {
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
    } catch (e) {
      const err = e instanceof AuthAdminError ? e : new AuthAdminError(500, 'Failed to delete profile field');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createField, updateField, deleteField, loading, error };
}

// =============================================================================
// PAGE PERMISSIONS HOOKS
// =============================================================================

export interface RolePagePermission {
  id: string;
  role: string;
  page_path: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserPageOverride {
  id: string;
  user_email: string;
  page_path: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserWithOverrides {
  email: string;
  role: string;
  override_count: number;
}

/**
 * Hook to fetch role page permissions
 */
export function useRolePagePermissions(role: string) {
  const [data, setData] = useState<RolePagePermission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!role) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ role: string; permissions: RolePagePermission[] }>(
        `/admin/permissions/roles/${encodeURIComponent(role)}/pages`
      );
      setData(result.permissions);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
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
export function useUserPageOverrides(email: string) {
  const [data, setData] = useState<UserPageOverride[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOverrides = useCallback(async () => {
    if (!email) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ user_email: string; overrides: UserPageOverride[] }>(
        `/admin/permissions/users/${encodeURIComponent(email)}/pages`
      );
      setData(result.overrides);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
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
  const [data, setData] = useState<UserWithOverrides[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ users: UserWithOverrides[] }>(
        '/admin/permissions/users-with-overrides'
      );
      setData(result.users);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
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
  const [error, setError] = useState<Error | null>(null);

  const setRolePagePermission = useCallback(async (role: string, pagePath: string, enabled: boolean) => {
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
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRolePagePermission = useCallback(async (role: string, pagePath: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/roles/${encodeURIComponent(role)}/pages/${encodeURIComponent(pagePath)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const setUserPageOverride = useCallback(async (email: string, pagePath: string, enabled: boolean) => {
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
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUserPageOverride = useCallback(async (email: string, pagePath: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/users/${encodeURIComponent(email)}/pages/${encodeURIComponent(pagePath)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
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

interface GroupPagePermission {
  id: string;
  page_path: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useGroupPagePermissions(groupId: string | null) {
  const [data, setData] = useState<GroupPagePermission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ group_id: string; group_name: string; permissions: GroupPagePermission[] }>(
        `/admin/permissions/groups/${groupId}/pages`
      );
      setData(result.permissions);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
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
  const [error, setError] = useState<Error | null>(null);

  const setGroupPagePermission = useCallback(async (groupId: string, pagePath: string, enabled: boolean) => {
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
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroupPagePermission = useCallback(async (groupId: string, pagePath: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/groups/${groupId}/pages/${encodeURIComponent(pagePath)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
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

// =============================================================================
// ACTION PERMISSIONS HOOKS
// =============================================================================

export interface PermissionActionDefinition {
  key: string;
  pack_name: string | null;
  pack_title: string | null;
  label: string;
  description: string | null;
  default_enabled: boolean;
  scope_modes?: Array<'none' | 'own' | 'ldd' | 'any'> | null;
}

export interface RoleActionPermission {
  id: string;
  action_key: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface GroupActionPermission {
  id: string;
  action_key: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserActionOverride {
  id: string;
  action_key: string;
  enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function usePermissionActions() {
  const [data, setData] = useState<PermissionActionDefinition[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Single source of truth: compiled action catalog generated by `hit run`.
      // Do NOT sync action definitions into auth DB.
      const gen = await import('@/.hit/generated/actions').catch(() => null);
      const actions = Array.isArray((gen as any)?.featurePackActions) ? (gen as any).featurePackActions : [];
      const normalized: PermissionActionDefinition[] = actions
        .map((a: any) => ({
          key: String(a?.key || '').trim(),
          pack_name: typeof a?.packName === 'string' ? a.packName : null,
          pack_title: typeof a?.packTitle === 'string' ? a.packTitle : null,
          label: String(a?.label || a?.key || '').trim(),
          description: typeof a?.description === 'string' ? a.description : null,
          default_enabled: Boolean(a?.defaultEnabled),
          scope_modes: Array.isArray((a as any)?.scopeModes)
            ? ((a as any).scopeModes as any[])
                .map((x) => String(x || '').trim().toLowerCase())
                .filter((x) => ['none', 'own', 'ldd', 'any'].includes(x)) as any
            : null,
        }))
        .filter((a: any) => Boolean(a.key));
      setData(normalized);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useRoleActionPermissions(role: string) {
  const [data, setData] = useState<RoleActionPermission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!role) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ role: string; permissions: RoleActionPermission[] }>(
        `/admin/permissions/roles/${encodeURIComponent(role)}/actions`
      );
      setData(result.permissions);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUserActionOverrides(email: string) {
  const [data, setData] = useState<UserActionOverride[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!email) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ user_email: string; overrides: UserActionOverride[] }>(
        `/admin/permissions/users/${encodeURIComponent(email)}/actions`
      );
      setData(result.overrides);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useGroupActionPermissions(groupId: string | null) {
  const [data, setData] = useState<GroupActionPermission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ group_id: string; group_name: string; permissions: GroupActionPermission[] }>(
        `/admin/permissions/groups/${groupId}/actions`
      );
      setData(result.permissions);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useActionPermissionsMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setRoleActionPermission = useCallback(async (role: string, actionKey: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/roles/${encodeURIComponent(role)}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action_key: actionKey, enabled }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRoleActionPermission = useCallback(async (role: string, actionKey: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/roles/${encodeURIComponent(role)}/actions/${encodeURIComponent(actionKey)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const setUserActionOverride = useCallback(async (email: string, actionKey: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/users/${encodeURIComponent(email)}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action_key: actionKey, enabled }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUserActionOverride = useCallback(async (email: string, actionKey: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/users/${encodeURIComponent(email)}/actions/${encodeURIComponent(actionKey)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const setGroupActionPermission = useCallback(async (groupId: string, actionKey: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/groups/${groupId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action_key: actionKey, enabled }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroupActionPermission = useCallback(async (groupId: string, actionKey: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(
        `/admin/permissions/groups/${groupId}/actions/${encodeURIComponent(actionKey)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    setRoleActionPermission,
    deleteRoleActionPermission,
    setUserActionOverride,
    deleteUserActionOverride,
    setGroupActionPermission,
    deleteGroupActionPermission,
    loading,
    error,
  };
}

// Groups hooks
interface Group {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  user_count: number;
  created_at: string;
  updated_at: string;
}

interface UserGroup {
  id: string;
  user_email: string;
  group_id: string;
  group_name: string;
  created_at: string;
  created_by: string | null;
}

export interface SegmentDef {
  key: string;
  label: string;
  description?: string | null;
  entityKind: string;
  isActive: boolean;
}

export function useSegments(options?: { enabled?: boolean; entityKind?: string }) {
  const enabled = options?.enabled !== false;
  const entityKind = typeof options?.entityKind === 'string' ? options?.entityKind : '';
  const [data, setData] = useState<SegmentDef[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/metrics/segments', window.location.origin);
      if (entityKind.trim()) url.searchParams.set('entityKind', entityKind.trim());
      const res = await fetch(url.toString(), { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // If not allowed (403) or unauthenticated (401), just hide segment UI.
        if (res.status === 401 || res.status === 403) {
          setData([]);
          setError(null);
          return;
        }
        throw new Error(json?.error || `Failed to load segments (${res.status})`);
      }
      const rows = Array.isArray(json?.data) ? json.data : [];
      setData(
        rows
          .map((r: any) => ({
            key: String(r?.key || ''),
            label: String(r?.label || r?.key || ''),
            description: typeof r?.description === 'string' ? r.description : null,
            entityKind: String(r?.entityKind || ''),
            isActive: Boolean(r?.isActive !== false),
          }))
          .filter((r: any) => r.key && r.entityKind)
      );
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, entityKind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithAuth<Group[]>('/admin/groups');
      setGroups(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: groups, loading, error, refresh };
}

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithAuth<Group>(`/admin/groups/${groupId}`);
      setGroup(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: group, loading, error, refresh };
}

export function useGroupUsers(groupId: string | null) {
  const [users, setUsers] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithAuth<UserGroup[]>(`/admin/groups/${groupId}/users`);
      setUsers(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data: users, loading, error, refresh };
}

export function useUserGroups(userEmail: string | null) {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userEmail) {
      setGroups([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithAuth<UserGroup[]>(`/admin/users/${encodeURIComponent(userEmail)}/groups`);
      setGroups(data);
    } catch (e) {
      setError(e as Error);
    } finally {
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
  const [error, setError] = useState<Error | null>(null);

  const createGroup = useCallback(async (group: { name: string; description?: string | null; metadata?: Record<string, unknown> }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<Group>('/admin/groups', {
        method: 'POST',
        body: JSON.stringify(group),
      });
      return data;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGroup = useCallback(async (groupId: string, group: { name?: string; description?: string | null; metadata?: Record<string, unknown> }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<Group>(`/admin/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify(group),
      });
      return data;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/groups/${groupId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addUserToGroup = useCallback(async (groupId: string, userEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth<UserGroup>(`/admin/groups/${groupId}/users/${encodeURIComponent(userEmail)}`, {
        method: 'POST',
      });
      return data;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeUserFromGroup = useCallback(async (groupId: string, userEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/groups/${groupId}/users/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
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

// =============================================================================
// PERMISSION SETS (SECURITY GROUPS)
// =============================================================================

export interface PermissionSet {
  id: string;
  name: string;
  description: string | null;
  template_role?: 'admin' | 'user' | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionSetAssignment {
  id: string;
  principal_type: 'user' | 'group' | 'role';
  principal_id: string;
  created_at: string;
}

export interface PermissionSetPageGrant {
  id: string;
  page_path: string;
  created_at: string;
}

export interface PermissionSetActionGrant {
  id: string;
  action_key: string;
  created_at: string;
}

export interface PermissionSetMetricGrant {
  id: string;
  metric_key: string;
  created_at: string;
}

export interface EffectivePrincipalRef {
  principal_type: 'user' | 'group' | 'role';
  principal_id: string;
  label: string;
}

export interface EffectiveUserGroupRef {
  id: string;
  name: string;
  description: string | null;
  kind: string | null;
  segment_key: string | null;
}

export interface UserEffectivePermissions {
  user_email: string;
  role: string;
  is_admin: boolean;
  features: {
    user_groups_enabled: boolean;
    dynamic_groups_enabled: boolean;
  };
  groups: EffectiveUserGroupRef[];
  permission_sets: Array<{
    id: string;
    name: string;
    description: string | null;
    template_role?: string | null;
    assigned_via: EffectivePrincipalRef[];
  }>;
  templates?: {
    has_admin?: boolean;
    has_user?: boolean;
  };
  has_default_access: boolean;
  explicit_grants: {
    pages: string[];
    actions: string[];
    metrics: string[];
  };
  sources?: {
    actions?: Record<string, string[]>;
    metrics?: Record<string, string[]>;
  };
  effective: {
    pages: string[];
    actions: string[];
    metrics: string[];
  };
  counts: Record<string, number>;
}

export function useUserEffectivePermissions(userEmail: string | null) {
  const [data, setData] = useState<UserEffectivePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userEmail) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<UserEffectivePermissions>(
        `/admin/permissions/users/${encodeURIComponent(userEmail)}/effective`
      );
      setData(result);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function usePermissionSets() {
  const [data, setData] = useState<PermissionSet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<{ permission_sets: PermissionSet[] }>('/admin/permissions/sets');
      setData(result.permission_sets);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export function usePermissionSet(id: string | null) {
  const [data, setData] = useState<{
    permission_set: PermissionSet;
    assignments: PermissionSetAssignment[];
    page_grants: PermissionSetPageGrant[];
    action_grants: PermissionSetActionGrant[];
    metric_grants: PermissionSetMetricGrant[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await fetchWithAuth<any>(`/admin/permissions/sets/${id}`);
      setData(result);
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export function usePermissionSetMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPermissionSet = useCallback(
    async (data: { name: string; description?: string; template_role?: 'admin' | 'user' | null }) => {
    setLoading(true);
    setError(null);
    try {
      return await fetchWithAuth<PermissionSet>('/admin/permissions/sets', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
    },
    []
  );

  const deletePermissionSet = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${id}`, { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePermissionSet = useCallback(
    async (id: string, data: { name?: string; description?: string; template_role?: 'admin' | 'user' | null }) => {
    setLoading(true);
    setError(null);
    try {
      return await fetchWithAuth<PermissionSet>(`/admin/permissions/sets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
    },
    []
  );

  const addAssignment = useCallback(async (psId: string, principalType: string, principalId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ principal_type: principalType, principal_id: principalId }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeAssignment = useCallback(async (psId: string, assignmentId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/assignments/${assignmentId}`, { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addPageGrant = useCallback(async (psId: string, pagePath: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ page_path: pagePath }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const removePageGrant = useCallback(async (psId: string, grantId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/pages/${grantId}`, { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addActionGrant = useCallback(async (psId: string, actionKey: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action_key: actionKey }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeActionGrant = useCallback(async (psId: string, grantId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/actions/${grantId}`, { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const addMetricGrant = useCallback(async (psId: string, metricKey: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/metrics`, {
        method: 'POST',
        body: JSON.stringify({ metric_key: metricKey }),
      });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeMetricGrant = useCallback(async (psId: string, grantId: string) => {
    setLoading(true);
    setError(null);
    try {
      await fetchWithAuth(`/admin/permissions/sets/${psId}/metrics/${grantId}`, { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createPermissionSet,
    updatePermissionSet,
    deletePermissionSet,
    addAssignment,
    removeAssignment,
    addPageGrant,
    removePageGrant,
    addActionGrant,
    removeActionGrant,
    addMetricGrant,
    removeMetricGrant,
    loading,
    error,
  };
}

// =============================================================================
// METRICS CATALOG HOOK (for security group metric picker)
// =============================================================================

export interface MetricCatalogItem {
  key: string;
  label: string;
  unit: string;
  category?: string;
  description?: string;
  owner?: { kind: 'feature_pack' | 'app' | 'user'; id: string };
  default_roles_allow?: string[];
  pointsCount: number;
}

/**
 * Fetch the full metrics catalog for admin purposes (permission configuration).
 * Uses ?admin=true to bypass ACL filtering - only admins can use this.
 */
export function useMetricsCatalog() {
  const [data, setData] = useState<MetricCatalogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use admin=true to get unfiltered catalog for permission configuration
      const res = await fetch('/api/metrics/catalog?admin=true', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      if (!res.ok) {
        // If not allowed (403) or unauthenticated (401), return empty list
        if (res.status === 401 || res.status === 403) {
          setData([]);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new AuthAdminError(res.status, body?.error || body?.message || `Failed to fetch metrics catalog: ${res.status}`);
      }
      const json = await res.json().catch(() => ({}));
      const items = Array.isArray(json?.items) ? json.items : [];
      setData(
        items.map((m: any) => ({
          key: String(m?.key || ''),
          label: String(m?.label || m?.key || ''),
          unit: String(m?.unit || 'count'),
          category: typeof m?.category === 'string' ? m.category : undefined,
          description: typeof m?.description === 'string' ? m.description : undefined,
          owner: m?.owner && typeof m.owner === 'object' ? m.owner : undefined,
          default_roles_allow: Array.isArray(m?.default_roles_allow)
            ? (m.default_roles_allow as any[])
                .map((x) => String(x || '').trim().toLowerCase())
                .filter(Boolean)
            : Array.isArray(m?.defaultRolesAllow)
              ? (m.defaultRolesAllow as any[])
                  .map((x) => String(x || '').trim().toLowerCase())
                  .filter(Boolean)
              : undefined,
          pointsCount: typeof m?.pointsCount === 'number' ? m.pointsCount : 0,
        }))
      );
    } catch (e) {
      setError(e as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// Export types and error class
export { AuthAdminError };
export type {
  User,
  Session,
  AuditLogEntry,
  Invite,
  Stats,
  PaginatedResponse,
  AuthAdminConfig,
  Group,
  UserGroup,
  GroupPagePermission,
};


