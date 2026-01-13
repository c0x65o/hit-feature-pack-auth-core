'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { DataTableColumn } from './entityTable';
import { formatDate, formatDateTime } from '@hit/sdk';
import {
  useAuthFeatures,
  useGroups,
  useGroup,
  useGroupMutations,
  useGroupUsers,
  useSegments,
  useUser,
  useUserMutations,
  useUsers,
} from '../hooks/useAuthAdmin';

export type ListQueryArgs = {
  page: number;
  pageSize: number;
  search?: string;
  filters?: any[];
  filterMode?: 'all' | 'any';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type EntityListResult = {
  data: any;
  loading: boolean;
  refetch: () => Promise<any> | void;
  deleteItem?: (id: string) => Promise<any>;
};

export type EntityDetailResult = {
  record: any;
  loading: boolean;
  deleteItem?: (id: string) => Promise<any>;
};

export type EntityUpsertResult = {
  record: any;
  loading: boolean;
  create: (payload: any) => Promise<any>;
  update: (id: string, payload: any) => Promise<any>;
};

export type EntityFormRegistries = {
  optionSources: Record<string, any>;
  referenceRenderers: Record<string, any>;
  myOrgScope?: any;
  loading?: Record<string, boolean>;
};

export type EntityDataSource = {
  useList?: (args: ListQueryArgs) => EntityListResult;
  useDetail?: (args: { id: string }) => EntityDetailResult;
  useUpsert?: (args: { id?: string }) => EntityUpsertResult;
  useFormRegistries?: () => EntityFormRegistries;
  useListCustomRenderers?: () => Record<string, DataTableColumn['render']>;
  renderRowActions?: (args: {
    row: Record<string, unknown>;
    onRequestDelete: (args: { id: string; name: string }) => void;
    ui: { Button: any };
  }) => React.ReactNode;
};

function normalizeEmailId(id: string): string {
  // Next route params may arrive percent-encoded (sometimes double-encoded). Decode up to 2 times.
  let out = String(id || '').trim();
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(out)) break;
    try {
      out = decodeURIComponent(out);
    } catch {
      break;
    }
  }
  return out;
}

function useAvailableRolesOptionSource() {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const authUrl =
          typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_HIT_AUTH_URL
            ? (window as any).NEXT_PUBLIC_HIT_AUTH_URL
            : '/api/proxy/auth';
        const res = await fetch(`${authUrl}/features`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        const json = await res.json().catch(() => ({}));
        const rolesAny = json?.features?.available_roles;
        const roles: string[] = Array.isArray(rolesAny) ? rolesAny.map((r: any) => String(r)).filter(Boolean) : [];
        if (!roles.length) return;
        const next = roles.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));
        if (!cancelled) setOptions(next);
      } catch {
        // fall back to defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run().catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
}

export function useEntityDataSource(entityKey: string): EntityDataSource | null {
  if (entityKey === 'auth.user') {
    const rolesSource = useAvailableRolesOptionSource();
    const mutations = useUserMutations();

    return {
      useList: (args) => {
        const { data, loading, refresh } = useUsers({
          page: args.page,
          pageSize: args.pageSize,
          search: args.search,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
        } as any);

        const items = (data?.items || []).map((u: any) => {
          const email = String(u?.email || '').trim();
          const pf = (u?.profile_fields || {}) as any;
          const name = [pf?.first_name, pf?.last_name].filter(Boolean).join(' ').trim();
          const role = String((u?.role || (Array.isArray(u?.roles) ? u.roles?.[0] : '') || 'user') as any);
          return {
            ...u,
            id: email,
            name: name || email,
            role,
            status: u?.locked ? 'Locked' : 'Active',
          };
        });

        return {
          data: {
            items,
            pagination: { total: data?.total ?? items.length },
          },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.deleteUser(normalizeEmailId(id)),
        };
      },
      useDetail: ({ id }) => {
        const email = normalizeEmailId(id);
        const { user, loading } = useUser(email);
        const role = String((user?.role || (Array.isArray(user?.roles) ? user.roles?.[0] : '') || 'user') as any);
        const pf = (user?.profile_fields || {}) as any;
        const name = [pf?.first_name, pf?.last_name].filter(Boolean).join(' ').trim();
        const record = user
          ? {
              ...user,
              id: email,
              name: name || email,
              role,
              status: user?.locked ? 'Locked' : 'Active',
              first_name: pf?.first_name ?? '',
              last_name: pf?.last_name ?? '',
            }
          : null;
        return {
          record,
          loading,
          deleteItem: async (rid: string) => mutations.deleteUser(normalizeEmailId(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const email = id ? normalizeEmailId(id) : '';
        const { user, loading } = useUser(email);
        const pf = (user?.profile_fields || {}) as any;
        const record = user
          ? {
              ...user,
              id: email,
              email,
              role: String((user?.role || (Array.isArray(user?.roles) ? user.roles?.[0] : '') || 'user') as any),
              first_name: pf?.first_name ?? '',
              last_name: pf?.last_name ?? '',
              password: '',
            }
          : null;

        const create = async (payload: any) => {
          const emailIn = String(payload?.email || '').trim();
          const password = String(payload?.password || '').trim();
          const role = String(payload?.role || 'user').trim() || 'user';
          if (!emailIn) throw new Error('Email is required');
          if (!password) throw new Error('Password is required');
          await mutations.createUser({ email: emailIn, password, roles: [role] });
          await mutations.updateUser(emailIn, {
            profile_fields: {
              first_name: payload?.first_name ? String(payload.first_name) : undefined,
              last_name: payload?.last_name ? String(payload.last_name) : undefined,
            },
          });
          return { id: emailIn };
        };

        const update = async (rid: string, payload: any) => {
          const emailId = normalizeEmailId(rid);
          const role = String(payload?.role || '').trim();
          const firstName = payload?.first_name != null ? String(payload.first_name) : '';
          const lastName = payload?.last_name != null ? String(payload.last_name) : '';
          if (role) {
            await mutations.updateRoles(emailId, role);
          }
          await mutations.updateUser(emailId, {
            profile_fields: {
              ...(firstName ? { first_name: firstName } : {}),
              ...(lastName ? { last_name: lastName } : {}),
            },
          });
          return { id: emailId };
        };

        return { record, loading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'auth.availableRoles': {
            options: [{ value: '', label: 'Select…' }, ...(rolesSource.options || [])],
            loading: rolesSource.loading,
          },
        },
        referenceRenderers: {},
      }),
      useListCustomRenderers: () => ({
        created_at: (value: unknown) => (value ? formatDateTime(String(value)) : '—'),
        last_login: (value: unknown) => (value ? formatDateTime(String(value)) : 'Never'),
        email_verified: (value: unknown) => (value ? 'Verified' : 'Pending'),
        two_factor_enabled: (value: unknown) => (value ? 'Enabled' : 'Disabled'),
        status: (_: unknown, row: Record<string, unknown>) => (row.locked ? 'Locked' : 'Active'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id || (row as any).email || '');
              const name = String((row as any).name || (row as any).email || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  if (entityKey === 'auth.group') {
    const { data: authFeatures } = useAuthFeatures();
    const dynamicGroupsEnabled = authFeatures?.dynamic_groups_enabled === true;
    const { data: groups, loading, error, refresh } = useGroups();
    const mutations = useGroupMutations();
    const segments = useSegments({ enabled: dynamicGroupsEnabled, entityKind: 'user' });

    const groupKinds = useMemo(() => {
      const base = [{ value: 'static', label: 'Static (manual members)' }];
      return dynamicGroupsEnabled
        ? [...base, { value: 'dynamic', label: 'Dynamic (computed by segment)' }]
        : base;
    }, [dynamicGroupsEnabled]);

    const segmentOptions = useMemo(() => {
      const xs = segments.data || [];
      return xs.filter((s) => s.isActive).map((s) => ({ value: s.key, label: s.label }));
    }, [segments.data]);

    return {
      useList: (args) => {
        const search = String(args.search || '').trim().toLowerCase();
        const sortBy = String(args.sortBy || 'updated_at');
        const sortOrder = String(args.sortOrder || 'desc') === 'asc' ? 'asc' : 'desc';

        let items = (groups || []).map((g: any) => {
          const meta = g?.metadata && typeof g.metadata === 'object' ? (g.metadata as any) : {};
          const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          return {
            ...g,
            id: String(g?.id || ''),
            kind,
            segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
          };
        });

        if (search) {
          items = items.filter((g: any) => String(g?.name || '').toLowerCase().includes(search));
        }

        const dir = sortOrder === 'asc' ? 1 : -1;
        items = [...items].sort((a: any, b: any) => {
          if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || '')) * dir;
          if (sortBy === 'user_count') return (Number(a.user_count || 0) - Number(b.user_count || 0)) * dir;
          if (sortBy === 'created_at') return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
          // updated_at default
          return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
        });

        const total = items.length;
        const startIdx = (args.page - 1) * args.pageSize;
        const pageItems = items.slice(startIdx, startIdx + args.pageSize);

        return {
          data: { items: pageItems, pagination: { total } },
          loading,
          refetch: refresh,
          deleteItem: async (id: string) => mutations.deleteGroup(String(id)),
        };
      },
      useDetail: ({ id }) => {
        const { data: group, loading: groupLoading } = useGroup(id);
        const meta = group?.metadata && typeof group.metadata === 'object' ? (group.metadata as any) : {};
        const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
        const record = group
          ? {
              ...group,
              id: String(group.id),
              kind,
              segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
            }
          : null;
        return {
          record,
          loading: groupLoading,
          deleteItem: async (rid: string) => mutations.deleteGroup(String(rid)),
        };
      },
      useUpsert: ({ id }) => {
        const { data: group, loading: groupLoading } = useGroup(id || null);
        const meta = group?.metadata && typeof group.metadata === 'object' ? (group.metadata as any) : {};
        const kind = String(meta?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
        const record = group
          ? {
              ...group,
              id: String(group.id),
              kind,
              segment_key: typeof meta?.segment_key === 'string' ? String(meta.segment_key) : '',
            }
          : null;

        const create = async (payload: any) => {
          const name = String(payload?.name || '').trim();
          if (!name) throw new Error('Group Name is required');
          const description = payload?.description != null && String(payload.description).trim() ? String(payload.description).trim() : null;
          const kind = String(payload?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          const segmentKey = String(payload?.segment_key || '').trim();
          const metadata: Record<string, unknown> | undefined = dynamicGroupsEnabled
            ? { kind, ...(kind === 'dynamic' ? { segment_key: segmentKey } : {}) }
            : undefined;
          if (dynamicGroupsEnabled && kind === 'dynamic' && !segmentKey) throw new Error('Segment is required for dynamic groups');
          const created = await mutations.createGroup({ name, description, ...(metadata ? { metadata } : {}) });
          return { id: String(created?.id || '') };
        };

        const update = async (rid: string, payload: any) => {
          const name = String(payload?.name || '').trim();
          if (!name) throw new Error('Group Name is required');
          const description = payload?.description != null && String(payload.description).trim() ? String(payload.description).trim() : null;
          const kind = String(payload?.kind || 'static').toLowerCase() === 'dynamic' ? 'dynamic' : 'static';
          const segmentKey = String(payload?.segment_key || '').trim();
          const metadata: Record<string, unknown> | undefined = dynamicGroupsEnabled
            ? { kind, ...(kind === 'dynamic' ? { segment_key: segmentKey } : {}) }
            : undefined;
          if (dynamicGroupsEnabled && kind === 'dynamic' && !segmentKey) throw new Error('Segment is required for dynamic groups');
          await mutations.updateGroup(String(rid), { name, description, ...(metadata ? { metadata } : {}) });
          return { id: String(rid) };
        };

        return { record, loading: groupLoading, create, update };
      },
      useFormRegistries: () => ({
        optionSources: {
          'auth.groupKinds': {
            options: [{ value: '', label: 'Select…' }, ...groupKinds],
            loading: false,
          },
          'auth.userSegments': {
            options: [{ value: '', label: 'Select…' }, ...(segmentOptions || [])],
            loading: Boolean(segments.loading),
            placeholder: segments.loading ? 'Loading segments…' : 'Select a segment',
          },
        },
        referenceRenderers: {},
      }),
      useListCustomRenderers: () => ({
        created_at: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        updated_at: (value: unknown) => (value ? formatDate(String(value)) : '—'),
        kind: (value: unknown) => (String(value || '').toLowerCase() === 'dynamic' ? 'Dynamic' : 'Static'),
      }),
      renderRowActions: ({ row, onRequestDelete, ui }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <ui.Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              const id = String((row as any).id);
              const name = String((row as any).name || id);
              onRequestDelete({ id, name });
            }}
          >
            <Trash2 size={16} style={{ color: 'var(--hit-error, #ef4444)' }} />
          </ui.Button>
        </div>
      ),
    };
  }

  return null;
}

