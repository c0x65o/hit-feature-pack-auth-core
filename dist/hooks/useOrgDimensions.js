'use client';
/**
 * Org Dimensions Hooks
 *
 * React hooks for managing locations, divisions, departments, and user org assignments.
 */
import { useState, useEffect, useCallback } from 'react';
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getApiUrl(path) {
    return `/api/org${path}`;
}
function getAuthHeaders() {
    if (typeof window === 'undefined')
        return {};
    const token = localStorage.getItem('hit_token');
    if (token)
        return { Authorization: `Bearer ${token}` };
    return {};
}
async function fetchJson(url, options) {
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
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/location-types'));
            setData(result.items || []);
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
    return { data, loading, error, refresh };
}
export function useLocationTypeMutations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const create = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/location-types'), {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { create, loading, error };
}
export function useLocations(options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.search)
                params.set('search', options.search);
            if (options.active !== undefined)
                params.set('active', String(options.active));
            if (options.locationTypeId)
                params.set('locationTypeId', options.locationTypeId);
            const url = `${getApiUrl('/locations')}${params.toString() ? `?${params}` : ''}`;
            const result = await fetchJson(url);
            setData(result.items || []);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [options.search, options.active, options.locationTypeId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useLocation(id) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/locations/${id}`));
            setData(result);
        }
        catch (e) {
            setError(e);
        }
        finally {
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
    const [error, setError] = useState(null);
    const create = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/locations'), {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const update = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/locations/${id}`), {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const remove = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await fetchJson(getApiUrl(`/locations/${id}`), { method: 'DELETE' });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { create, update, remove, loading, error };
}
// ─────────────────────────────────────────────────────────────────────────────
// DIVISIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────
export function useDivisions(options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.search)
                params.set('search', options.search);
            if (options.active !== undefined)
                params.set('active', String(options.active));
            const url = `${getApiUrl('/divisions')}${params.toString() ? `?${params}` : ''}`;
            const result = await fetchJson(url);
            setData(result.items || []);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [options.search, options.active]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useDivision(id) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/divisions/${id}`));
            setData(result);
        }
        catch (e) {
            setError(e);
        }
        finally {
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
    const [error, setError] = useState(null);
    const create = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/divisions'), {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const update = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/divisions/${id}`), {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const remove = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await fetchJson(getApiUrl(`/divisions/${id}`), { method: 'DELETE' });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { create, update, remove, loading, error };
}
// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS HOOKS
// ─────────────────────────────────────────────────────────────────────────────
export function useDepartments(options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.search)
                params.set('search', options.search);
            if (options.active !== undefined)
                params.set('active', String(options.active));
            if (options.divisionId)
                params.set('divisionId', options.divisionId);
            const url = `${getApiUrl('/departments')}${params.toString() ? `?${params}` : ''}`;
            const result = await fetchJson(url);
            setData(result.items || []);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [options.search, options.active, options.divisionId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
export function useDepartment(id) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/departments/${id}`));
            setData(result);
        }
        catch (e) {
            setError(e);
        }
        finally {
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
    const [error, setError] = useState(null);
    const create = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/departments'), {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const update = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/departments/${id}`), {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const remove = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await fetchJson(getApiUrl(`/departments/${id}`), { method: 'DELETE' });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { create, update, remove, loading, error };
}
export function useUserOrgAssignments(options = {}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.userKey)
                params.set('userKey', options.userKey);
            if (options.divisionId)
                params.set('divisionId', options.divisionId);
            if (options.departmentId)
                params.set('departmentId', options.departmentId);
            if (options.locationId)
                params.set('locationId', options.locationId);
            const url = `${getApiUrl('/assignments')}${params.toString() ? `?${params}` : ''}`;
            const result = await fetchJson(url);
            setData(result.items || []);
        }
        catch (e) {
            setError(e);
        }
        finally {
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
    const [error, setError] = useState(null);
    const create = useCallback(async (data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/assignments'), {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const update = useCallback(async (id, data) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/assignments/${id}`), {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            return result;
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const remove = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await fetchJson(getApiUrl(`/assignments/${id}`), { method: 'DELETE' });
        }
        catch (e) {
            setError(e);
            throw e;
        }
        finally {
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
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl('/me/scope'));
            setData(result);
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
    return { data, loading, error, refresh };
}
/**
 * Get org scope for a specific user (admin use)
 */
export function useUserOrgScope(userKey) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!userKey) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await fetchJson(getApiUrl(`/users/${encodeURIComponent(userKey)}/scope`));
            setData(result);
        }
        catch (e) {
            setError(e);
        }
        finally {
            setLoading(false);
        }
    }, [userKey]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { data, loading, error, refresh };
}
//# sourceMappingURL=useOrgDimensions.js.map