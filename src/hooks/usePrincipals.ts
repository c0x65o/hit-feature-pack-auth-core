'use client';

/**
 * Unified hook for fetching principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */

import { useState, useEffect, useCallback } from 'react';
import { useUsers, useGroups } from './useAuthAdmin';
import type { Principal, PrincipalType } from '@hit/ui-kit';

export interface UsePrincipalsOptions {
  users?: boolean;
  groups?: boolean;
  roles?: boolean;
  search?: string;
}

export interface UsePrincipalsResult {
  principals: Principal[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// Get the auth module URL from environment or defaults
function getAuthUrl(): string {
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, string>;
    return win.NEXT_PUBLIC_HIT_AUTH_URL || '/api/proxy/auth';
  }
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
    const detail = errorBody.detail || errorBody.message || `Request failed: ${res.status}`;
    throw new Error(detail);
  }

  return res.json();
}

/**
 * Unified hook to fetch principals (users, groups, roles) for ACL assignment.
 * Combines data from auth module endpoints.
 */
export function usePrincipals(options: UsePrincipalsOptions = {}): UsePrincipalsResult {
  const { users: enableUsers = true, groups: enableGroups = true, roles: enableRoles = true, search } = options;
  
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use existing hooks for users and groups
  const { data: usersData, loading: usersLoading, error: usersError, refresh: refreshUsers } = useUsers({ search });
  const { data: groupsData, loading: groupsLoading, error: groupsError, refresh: refreshGroups } = useGroups();

  const fetchRoles = useCallback(async (): Promise<Principal[]> => {
    if (!enableRoles) return [];

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
          filteredRoles = availableRoles.filter((role: string) =>
            role.toLowerCase().includes(searchLower)
          );
        }

        return filteredRoles.map((role: string) => ({
          type: 'role' as PrincipalType,
          id: role,
          displayName: role.charAt(0).toUpperCase() + role.slice(1),
        }));
      } else {
        // Fallback: try to extract roles from users
        const userResponse = await fetch(`${authUrl}/users`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        
        if (userResponse.ok) {
          const authUsers = await userResponse.json();
          if (Array.isArray(authUsers) && authUsers.length > 0) {
            const roleSet = new Set<string>();
            authUsers.forEach((user: { role?: string }) => {
              const role = user.role || 'user';
              roleSet.add(role);
            });
            const roles = Array.from(roleSet).sort();
            
            // Filter by search if provided
            let filteredRoles = roles;
            if (search) {
              const searchLower = search.toLowerCase();
              filteredRoles = roles.filter((role: string) =>
                role.toLowerCase().includes(searchLower)
              );
            }

            return filteredRoles.map((role: string) => ({
              type: 'role' as PrincipalType,
              id: role,
              displayName: role.charAt(0).toUpperCase() + role.slice(1),
            }));
          }
        }
        
        // Final fallback
        return [
          { type: 'role' as PrincipalType, id: 'admin', displayName: 'Admin' },
          { type: 'role' as PrincipalType, id: 'user', displayName: 'User' },
        ];
      }
    } catch (err) {
      console.warn('Failed to load roles:', err);
      // Return fallback roles
      return [
        { type: 'role' as PrincipalType, id: 'admin', displayName: 'Admin' },
        { type: 'role' as PrincipalType, id: 'user', displayName: 'User' },
      ];
    }
  }, [enableRoles, search]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allPrincipals: Principal[] = [];

      // Fetch users
      if (enableUsers) {
        if (usersError) {
          throw usersError;
        }
        if (usersData?.items) {
          usersData.items.forEach((user) => {
            const firstName = (user.profile_fields as { first_name?: string | null; last_name?: string | null } | null)?.first_name || null;
            const lastName = (user.profile_fields as { first_name?: string | null; last_name?: string | null } | null)?.last_name || null;
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
    } catch (err) {
      setError(err as Error);
    } finally {
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

