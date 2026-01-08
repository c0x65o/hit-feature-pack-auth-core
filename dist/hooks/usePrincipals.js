'use client';
/**
 * Unified hook for fetching principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */
import { useState, useEffect, useCallback } from 'react';
import { useUsers, useGroups } from './useAuthAdmin';
// Get the auth module URL from environment or defaults
function getAuthUrl() {
    if (typeof window !== 'undefined') {
        const win = window;
        return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
    }
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
/**
 * Creates a fetchPrincipals function for use with AclPicker.
 *
 * @param options.isAdmin Whether the current user is an admin (allows seeing all groups/roles)
 * @param options.extraPrincipals Optional callback to provide additional principals (e.g. from local pack db)
 */
export function createFetchPrincipals(options = {}) {
    const { isAdmin = false, extraPrincipals } = options;
    return async (type, search) => {
        const principals = [];
        const authUrl = getAuthUrl();
        const headers = getAuthHeaders();
        const searchLower = search?.toLowerCase();
        if (type === 'user') {
            try {
                const response = await fetch(`${authUrl}/directory/users`, {
                    credentials: 'include',
                    headers,
                });
                if (response.ok) {
                    const authUsers = await response.json();
                    if (Array.isArray(authUsers)) {
                        authUsers.forEach((user) => {
                            const firstName = user.profile_fields?.first_name || null;
                            const lastName = user.profile_fields?.last_name || null;
                            const displayName = [firstName, lastName].filter(Boolean).join(' ') || user.email;
                            if (!searchLower || displayName.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower)) {
                                principals.push({
                                    type: 'user',
                                    id: user.email,
                                    displayName,
                                    metadata: { email: user.email, profile_fields: user.profile_fields },
                                });
                            }
                        });
                    }
                }
            }
            catch (err) {
                console.warn('Failed to load users:', err);
            }
        }
        else if (type === 'group') {
            if (isAdmin) {
                // Admin: can pick any auth group (including dynamic groups)
                try {
                    const authResponse = await fetch(`${authUrl}/admin/groups`, { headers, credentials: 'include' });
                    if (authResponse.ok) {
                        const authGroups = await authResponse.json();
                        if (Array.isArray(authGroups)) {
                            authGroups.forEach((group) => {
                                const displayName = group.description ? `${group.name} - ${group.description}` : group.name;
                                if (!searchLower || displayName.toLowerCase().includes(searchLower) || group.name.toLowerCase().includes(searchLower)) {
                                    principals.push({
                                        type: 'group',
                                        id: group.id,
                                        displayName,
                                        metadata: { name: group.name, description: group.description },
                                    });
                                }
                            });
                        }
                    }
                }
                catch (err) {
                    console.warn('Failed to load groups (admin):', err);
                }
            }
            else {
                // Non-admin: can pick only groups they are in.
                try {
                    const res = await fetch(`${authUrl}/me/groups`, { headers, credentials: 'include' });
                    if (res.ok) {
                        const myGroups = await res.json();
                        if (Array.isArray(myGroups)) {
                            myGroups.forEach((g) => {
                                const id = String(g.group_id ?? g.groupId ?? '').trim();
                                const name = String(g.group_name ?? g.groupName ?? id).trim();
                                if (!id)
                                    return;
                                if (!searchLower || name.toLowerCase().includes(searchLower) || id.toLowerCase().includes(searchLower)) {
                                    principals.push({
                                        type: 'group',
                                        id,
                                        displayName: name,
                                        metadata: { name, source: 'me/groups' },
                                    });
                                }
                            });
                        }
                    }
                }
                catch (err) {
                    console.warn('Failed to load my groups:', err);
                }
            }
        }
        else if (type === 'role') {
            // Non-admins cannot share to roles.
            if (isAdmin) {
                try {
                    const response = await fetch(`${authUrl}/features`, { headers, credentials: 'include' });
                    if (response.ok) {
                        const data = await response.json();
                        const availableRoles = data.features?.available_roles || ['admin', 'user'];
                        availableRoles.forEach((role) => {
                            const displayName = role.charAt(0).toUpperCase() + role.slice(1);
                            if (!searchLower || displayName.toLowerCase().includes(searchLower) || role.toLowerCase().includes(searchLower)) {
                                principals.push({
                                    type: 'role',
                                    id: role,
                                    displayName,
                                });
                            }
                        });
                    }
                }
                catch (err) {
                    console.warn('Failed to load roles:', err);
                    // Fallback
                    ['admin', 'user'].forEach(role => {
                        const displayName = role.charAt(0).toUpperCase() + role.slice(1);
                        if (!searchLower || displayName.toLowerCase().includes(searchLower) || role.toLowerCase().includes(searchLower)) {
                            principals.push({ type: 'role', id: role, displayName });
                        }
                    });
                }
            }
        }
        // Add extra principals if provided
        if (extraPrincipals) {
            const extra = await extraPrincipals(type, search);
            principals.push(...extra);
        }
        return principals;
    };
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
        throw new Error(detail);
    }
    return res.json();
}
/**
 * Unified hook to fetch principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */
export function usePrincipals(options = {}) {
    const { users: enableUsers = true, groups: enableGroups = true, roles: enableRoles = true, search } = options;
    const [principals, setPrincipals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Use existing hooks for users and groups
    const { data: usersData, loading: usersLoading, error: usersError, refresh: refreshUsers } = useUsers({ search });
    const { data: groupsData, loading: groupsLoading, error: groupsError, refresh: refreshGroups } = useGroups();
    const fetchRoles = useCallback(async () => {
        if (!enableRoles)
            return [];
        try {
            const authUrl = getAuthUrl();
            const response = await fetch(`${authUrl}/features`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
            });
            if (response.ok) {
                const data = await response.json();
                const availableRoles = data.features?.available_roles || ['admin', 'user'];
                // Filter by search if provided
                let filteredRoles = availableRoles;
                if (search) {
                    const searchLower = search.toLowerCase();
                    filteredRoles = availableRoles.filter((role) => role.toLowerCase().includes(searchLower));
                }
                return filteredRoles.map((role) => ({
                    type: 'role',
                    id: role,
                    displayName: role.charAt(0).toUpperCase() + role.slice(1),
                }));
            }
            else {
                // Final fallback
                return [
                    { type: 'role', id: 'admin', displayName: 'Admin' },
                    { type: 'role', id: 'user', displayName: 'User' },
                ];
            }
        }
        catch (err) {
            console.warn('Failed to load roles:', err);
            // Return fallback roles
            return [
                { type: 'role', id: 'admin', displayName: 'Admin' },
                { type: 'role', id: 'user', displayName: 'User' },
            ];
        }
    }, [enableRoles, search]);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const allPrincipals = [];
            // Fetch users
            if (enableUsers) {
                if (usersError) {
                    throw usersError;
                }
                if (usersData?.items) {
                    usersData.items.forEach((user) => {
                        const firstName = user.profile_fields?.first_name || null;
                        const lastName = user.profile_fields?.last_name || null;
                        const displayName = [firstName, lastName].filter(Boolean).join(' ') || user.email;
                        allPrincipals.push({
                            type: 'user',
                            id: user.email,
                            displayName,
                            metadata: { email: user.email, profile_fields: user.profile_fields },
                        });
                    });
                }
            }
            // Fetch groups
            if (enableGroups) {
                if (groupsError) {
                    throw groupsError;
                }
                if (groupsData) {
                    groupsData.forEach((group) => {
                        const displayName = group.description
                            ? `${group.name} - ${group.description}`
                            : group.name;
                        allPrincipals.push({
                            type: 'group',
                            id: group.id,
                            displayName,
                            metadata: { name: group.name, description: group.description, user_count: group.user_count },
                        });
                    });
                }
            }
            // Fetch roles
            if (enableRoles) {
                const roles = await fetchRoles();
                allPrincipals.push(...roles);
            }
            setPrincipals(allPrincipals);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [enableUsers, enableGroups, enableRoles, usersData, groupsData, usersError, groupsError, fetchRoles]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    // Combine loading states
    const combinedLoading = loading || (enableUsers && usersLoading) || (enableGroups && groupsLoading);
    return {
        principals,
        loading: combinedLoading,
        error: error || usersError || groupsError,
        refresh,
    };
}
//# sourceMappingURL=usePrincipals.js.map