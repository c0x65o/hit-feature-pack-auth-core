'use client';

/**
 * Org Dimensions Hooks
 *
 * React hooks for managing locations, divisions, departments, and user org assignments.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OrgScope } from '../schema/org-dimensions';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface LocationType {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  parentId: string | null;
  locationTypeId: string | null;
  locationTypeName?: string | null;
  managerUserKey: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Division {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parentId: string | null;
  managerUserKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  divisionId: string | null;
  divisionName?: string | null;
  parentId: string | null;
  managerUserKey: string | null;
  costCenterCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrgAssignment {
  id: string;
  userKey: string;
  divisionId: string | null;
  divisionName?: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  locationId: string | null;
  locationName?: string | null;
  isPrimary: boolean;
  role: string | null;
  createdAt: string;
  createdByUserKey: string | null;
}

interface QueryOptions {
  search?: string;
  active?: boolean;
  divisionId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getApiUrl(path: string): string {
  return `/api/org${path}`;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('hit_token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
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
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION TYPES HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useLocationTypes() {
  const [data, setData] = useState<LocationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<{ items: LocationType[] }>(getApiUrl('/location-types'));
      setData(result.items || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useLocationTypeMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Partial<LocationType>): Promise<LocationType> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<LocationType>(getApiUrl('/location-types'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

interface LocationQueryOptions {
  search?: string;
  active?: boolean;
  locationTypeId?: string;
}

export function useLocations(options: LocationQueryOptions = {}) {
  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.active !== undefined) params.set('active', String(options.active));
      if (options.locationTypeId) params.set('locationTypeId', options.locationTypeId);

      const url = `${getApiUrl('/locations')}${params.toString() ? `?${params}` : ''}`;
      const result = await fetchJson<{ items: Location[] }>(url);
      setData(result.items || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [options.search, options.active, options.locationTypeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useLocation(id: string | null) {
  const [data, setData] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Location>(getApiUrl(`/locations/${id}`));
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useLocationMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Partial<Location>): Promise<Location> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Location>(getApiUrl('/locations'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, data: Partial<Location>): Promise<Location> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Location>(getApiUrl(`/locations/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await fetchJson(getApiUrl(`/locations/${id}`), { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVISIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useDivisions(options: QueryOptions = {}) {
  const [data, setData] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.active !== undefined) params.set('active', String(options.active));

      const url = `${getApiUrl('/divisions')}${params.toString() ? `?${params}` : ''}`;
      const result = await fetchJson<{ items: Division[] }>(url);
      setData(result.items || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [options.search, options.active]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDivision(id: string | null) {
  const [data, setData] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Division>(getApiUrl(`/divisions/${id}`));
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDivisionMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Partial<Division>): Promise<Division> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Division>(getApiUrl('/divisions'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, data: Partial<Division>): Promise<Division> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Division>(getApiUrl(`/divisions/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await fetchJson(getApiUrl(`/divisions/${id}`), { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useDepartments(options: QueryOptions = {}) {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.search) params.set('search', options.search);
      if (options.active !== undefined) params.set('active', String(options.active));
      if (options.divisionId) params.set('divisionId', options.divisionId);

      const url = `${getApiUrl('/departments')}${params.toString() ? `?${params}` : ''}`;
      const result = await fetchJson<{ items: Department[] }>(url);
      setData(result.items || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [options.search, options.active, options.divisionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDepartment(id: string | null) {
  const [data, setData] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Department>(getApiUrl(`/departments/${id}`));
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDepartmentMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Partial<Department>): Promise<Department> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Department>(getApiUrl('/departments'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, data: Partial<Department>): Promise<Department> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<Department>(getApiUrl(`/departments/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await fetchJson(getApiUrl(`/departments/${id}`), { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ORG ASSIGNMENTS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

interface UserAssignmentQueryOptions {
  userKey?: string;
  divisionId?: string;
  departmentId?: string;
  locationId?: string;
}

export function useUserOrgAssignments(options: UserAssignmentQueryOptions = {}) {
  const [data, setData] = useState<UserOrgAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.userKey) params.set('userKey', options.userKey);
      if (options.divisionId) params.set('divisionId', options.divisionId);
      if (options.departmentId) params.set('departmentId', options.departmentId);
      if (options.locationId) params.set('locationId', options.locationId);

      const url = `${getApiUrl('/assignments')}${params.toString() ? `?${params}` : ''}`;
      const result = await fetchJson<{ items: UserOrgAssignment[] }>(url);
      setData(result.items || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [options.userKey, options.divisionId, options.departmentId, options.locationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUserOrgAssignmentMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Partial<UserOrgAssignment>): Promise<UserOrgAssignment> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<UserOrgAssignment>(getApiUrl('/assignments'), {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, data: Partial<UserOrgAssignment>): Promise<UserOrgAssignment> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<UserOrgAssignment>(getApiUrl(`/assignments/${id}`), {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await fetchJson(getApiUrl(`/assignments/${id}`), { method: 'DELETE' });
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, update, remove, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT USER ORG SCOPE HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current user's org scope (their divisions, departments, locations)
 *
 * This is the primary hook for checking org-based access patterns.
 */
export function useMyOrgScope() {
  const [data, setData] = useState<OrgScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<OrgScope>(getApiUrl('/me/scope'));
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

/**
 * Get org scope for a specific user (admin use)
 */
export function useUserOrgScope(userKey: string | null) {
  const [data, setData] = useState<OrgScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userKey) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<OrgScope>(
        getApiUrl(`/users/${encodeURIComponent(userKey)}/scope`)
      );
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
